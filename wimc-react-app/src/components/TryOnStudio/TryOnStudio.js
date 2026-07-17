import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  uploadVideo,
  fetchImagesByTag,
  fetchImagesForSection,
  videoStream,
} from "../../utils/CloudinaryAPI";
import { getSubSections } from "../../utils/closetSubsections";
import { setVideoRefImage } from "../../utils/videoMeta";
import AIStyleFeedback from "../AIStyleFeedback/AIStyleFeedback";
import "./TryOnStudio.css";

// Unisex closet: one fixed 8-option list, same for everyone.
const SECTION_OPTIONS = [
  { value: "dresses-skirts", label: "Dresses/Skirts" },
  { value: "dress-shirts-suits", label: "Dress Shirts/Suits" },
  { value: "shoes-sneakers", label: "Shoes/Sneakers" },
  { value: "pants-jeans", label: "Pants/Jeans" },
  { value: "tops", label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats", label: "Jackets/Coats" },
  { value: "blazers", label: "Blazers" },
];

export default function TryOnStudio({
  isOpen,
  onClose,
  initialImageUrl = null,
  initialSection = null,
}) {
  // Reference item
  const [section, setSection] = useState(
    initialSection || SECTION_OPTIONS[0].value,
  );
  const [sectionItems, setSectionItems] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  // Sub-section within the current section card (e.g. Skirts under
  // Dresses/Skirts). null = "All" — every sub-section merged together.
  const [subSection, setSubSection] = useState(null);
  const effectiveSection = section;
  const subSections = getSubSections(effectiveSection);
  useEffect(() => { setSubSection(null); }, [section]);
  const [refImage, setRefImage] = useState(initialImageUrl);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Camera
  const [mode, setMode] = useState("record"); // "record" | "upload"
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [camReady, setCamReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [camError, setCamError] = useState("");

  // Upload / share
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [shareErr, setShareErr] = useState("");
  const [shareMsg, setShareMsg] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // ── Reset when modal closes ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setRecordedBlob(null);
      setPreviewUrl(null);
      setUploadedUrl("");
      setShareErr("");
      setShareMsg("");
      setCamError("");
      setRecording(false);
      setCamReady(false);
    }
  }, [isOpen]);

  // ── Sync initialImageUrl / initialSection from props ────────────────────
  useEffect(() => {
    if (isOpen) {
      setRefImage(initialImageUrl);
      if (initialSection) {
        setSection(initialSection);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialImageUrl, initialSection]);

  // ── Load section images for reference picker ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setSectionLoading(true);
    // A specific sub-section fetches just that tag; "All" merges every
    // sub-section together via fetchImagesForSection.
    const fetch = subSection
      ? fetchImagesByTag(subSection)
      : fetchImagesForSection(effectiveSection);
    fetch
      .then((imgs) => setSectionItems(imgs || []))
      .catch(() => setSectionItems([]))
      .finally(() => setSectionLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, section, subSection]);

  // ── Camera helpers ───────────────────────────────────────────────────────
  const startCamera = useCallback(
    async (facing = facingMode) => {
      stopCamera();
      setCamError("");
      setCamReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCamReady(true);
      } catch (e) {
        setCamError(
          "Camera access denied or unavailable. Please check your browser permissions.",
        );
      }
    },
    [facingMode],
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // Start camera when switching to record mode
  useEffect(() => {
    if (isOpen && mode === "record" && !previewUrl) {
      startCamera(facingMode);
    }
    if (mode === "upload") stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, facingMode, previewUrl]);

  const switchCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  // ── Recording ────────────────────────────────────────────────────────────
  // Safari (desktop + iOS) doesn't support WebM at all — MediaRecorder throws
  // immediately if given an unsupported mimeType. Feature-detect instead of
  // hardcoding, preferring WebM/VP9 where available and falling back to MP4
  // for Safari. Cloudinary accepts either format, so no upload-side change
  // is needed — just record in whatever format the browser actually supports.
  const pickRecorderMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(streamRef.current, { mimeType })
      : new MediaRecorder(streamRef.current); // let the browser pick its own default
    const recordedType = recorder.mimeType || mimeType || "video/webm";
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recordedType });
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      setCamReady(false);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl("");
    setShareErr("");
    setShareMsg("");
  };

  const retake = () => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    setUploadedUrl("");
    setShareErr("");
    setShareMsg("");
    if (mode === "record") startCamera(facingMode);
  };

  // ── Save to Video Bin (Cloudinary) ───────────────────────────────────────
  const saveToVideoBin = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    setShareErr("");
    setShareMsg("");
    try {
      const res = await uploadVideo(recordedBlob, section);
      if (res?.secure_url) {
        setUploadedUrl(res.secure_url);
        // Remember the closet item being tried on so Video Bin can show it
        // as this video's thumbnail instead of an auto-extracted frame.
        // Keyed by the SAME f_auto,q_auto transformed URL Video Bin's own
        // fetchVideosByTag reconstructs — the raw upload secure_url has no
        // transform segment, so saving under that key never matched anything
        // VideoBin later looked up, and the thumbnail silently never showed.
        if (refImage) setVideoRefImage(videoStream(res.secure_url), refImage);
        setShareMsg("✅ Saved to Video Bin!");
      } else {
        setShareErr("Upload failed — please try again.");
      }
    } catch {
      setShareErr("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareLink = async () => {
    const url = uploadedUrl;
    if (!url) {
      setShareErr("Save the video first to get a share link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("🔗 Link copied to clipboard!");
    } catch {
      setShareErr("Could not copy — please copy the link manually.");
    }
  };

  const nativeShare = async () => {
    const url = uploadedUrl;
    if (!url) {
      setShareErr("Save the video first to share.");
      return;
    }
    if (!navigator.share) {
      setShareErr("Native sharing not supported in this browser.");
      return;
    }
    try {
      await navigator.share({
        title: "My Try-On — WIMC",
        text: "Check out my try-on!",
        url,
      });
      setShareMsg("Shared!");
    } catch {}
  };

  // ── Escape / overlay close ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const onOverlay = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="tryon-overlay" onClick={onOverlay}>
      <div
        className="tryon-modal"
        ref={modalRef}
        role="dialog"
        aria-label="Try-On Studio"
      >
        {/* ── Header ── */}
        <header className="tryon-modal__head">
          <h2 className="tryon-modal__title">🎬 Try-On Studio</h2>
          <button
            className="tryon-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="tryon-modal__body">
          {/* ── LEFT: Reference item ── */}
          <aside className="tryon-ref">
            <h3 className="tryon-ref__title">Reference Item</h3>
            <div className="tryon-ref__sections" role="listbox" aria-label="Reference section">
              {SECTION_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={section === o.value}
                  className={`tryon-ref__section-pill${section === o.value ? " is-active" : ""}`}
                  onClick={() => { setSection(o.value); setSubSection(null); setRefImage(null); }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {subSections && (
              <div className="tryon-ref__sections tryon-ref__sections--sub" role="listbox" aria-label="Reference sub-section">
                <button
                  type="button"
                  role="option"
                  aria-selected={!subSection}
                  className={`tryon-ref__section-pill tryon-ref__section-pill--sub${!subSection ? " is-active" : ""}`}
                  onClick={() => { setSubSection(null); setRefImage(null); }}
                >
                  All
                </button>
                {subSections.map((s) => (
                  <button
                    key={s.tag}
                    type="button"
                    role="option"
                    aria-selected={subSection === s.tag}
                    className={`tryon-ref__section-pill tryon-ref__section-pill--sub${subSection === s.tag ? " is-active" : ""}`}
                    onClick={() => { setSubSection(s.tag); setRefImage(null); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {refImage ? (
              <div className="tryon-ref__preview">
                <img
                  src={refImage}
                  alt="Reference"
                  className="tryon-ref__img"
                />
                <button
                  className="tryon-ref__clear"
                  onClick={() => setRefImage(null)}
                >
                  ✕ Clear
                </button>
              </div>
            ) : (
              <div className="tryon-ref__grid">
                {sectionLoading && <p className="tryon-ref__hint">Loading…</p>}
                {!sectionLoading && sectionItems.length === 0 && (
                  <p className="tryon-ref__hint">
                    No items in this section yet.
                  </p>
                )}
                {sectionItems.map((url, i) => (
                  <button
                    key={url + i}
                    className="tryon-ref__thumb-btn"
                    onClick={() => setRefImage(url)}
                    title="Use as reference"
                  >
                    {/* Display-only optimization — refImage/setRefImage keep the
                        raw url untouched so downstream keying (see the
                        f_auto,q_auto note above) isn't affected. */}
                    <img
                      src={url ? url.replace("/upload/", "/upload/f_auto,q_auto,w_200,c_limit/") : url}
                      alt="item"
                      className="tryon-ref__thumb"
                    />
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* ── RIGHT: Camera / upload ── */}
          <div className="tryon-studio">
            {/* Mode toggle */}
            <div className="tryon-toggle">
              <button
                className={`tryon-toggle__btn ${mode === "record" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("record");
                  retake();
                }}
              >
                📹 Record
              </button>
              <button
                className={`tryon-toggle__btn ${mode === "upload" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("upload");
                  stopCamera();
                }}
              >
                📁 Upload
              </button>
            </div>

            {/* Camera / preview area */}
            <div className="tryon-viewport">
              {!previewUrl && mode === "record" && (
                <>
                  <video
                    ref={videoRef}
                    className="tryon-video"
                    autoPlay
                    muted
                    playsInline
                  />
                  {camError && <p className="tryon-error">{camError}</p>}
                  {!camError && !camReady && (
                    <p className="tryon-hint">Starting camera…</p>
                  )}
                </>
              )}

              {!previewUrl && mode === "upload" && (
                <div
                  className="tryon-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p>📁 Tap to select a video from your device</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                  />
                </div>
              )}

              {previewUrl && (
                <video
                  className="tryon-video"
                  src={previewUrl}
                  controls
                  playsInline
                />
              )}
            </div>

            {/* Controls */}
            <div className="tryon-controls">
              {mode === "record" && !previewUrl && (
                <>
                  {!recording ? (
                    <button
                      className="tryon-btn tryon-btn--record"
                      onClick={startRecording}
                      disabled={!camReady}
                    >
                      ⏺ Start Recording
                    </button>
                  ) : (
                    <button
                      className="tryon-btn tryon-btn--stop"
                      onClick={stopRecording}
                    >
                      ⏹ Stop Recording
                    </button>
                  )}
                  <button
                    className="tryon-btn"
                    onClick={switchCamera}
                    disabled={!camReady}
                  >
                    🔄 Switch Camera
                  </button>
                </>
              )}

              {previewUrl && (
                <>
                  <button className="tryon-btn" onClick={retake}>
                    🔁 Retake
                  </button>
                  <button
                    className="tryon-btn tryon-btn--save"
                    onClick={saveToVideoBin}
                    disabled={uploading || !!uploadedUrl}
                  >
                    {uploading
                      ? "Saving…"
                      : uploadedUrl
                        ? "✅ Saved"
                        : "💾 Save to Video Bin"}
                  </button>
                  {uploadedUrl && (
                    <>
                      <button className="tryon-btn" onClick={shareLink}>
                        🔗 Copy Link
                      </button>
                      <button
                        className="tryon-btn tryon-btn--share"
                        onClick={nativeShare}
                      >
                        📤 Share
                      </button>
                      {uploadedUrl && (
                        <button
                          className="tryon-btn tryon-btn--feedback"
                          onClick={() => setIsFeedbackOpen(true)}
                        >
                          ✨ Style Feedback
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Uploaded link display */}
            {uploadedUrl && (
              <div className="tryon-link-row">
                <input
                  className="tryon-link-input"
                  readOnly
                  value={uploadedUrl}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}

            {shareMsg && <p className="tryon-msg">{shareMsg}</p>}
            {shareErr && <p className="tryon-error">{shareErr}</p>}
          </div>
        </div>
      </div>
    </div>
    {/* Rendered OUTSIDE .tryon-overlay's DOM — it has its own overlay, and
        nesting it inside .tryon-overlay meant any click inside it (an
        occasion button, the description input) bubbled up to onOverlay's
        "click outside the modal → close" check (its content isn't inside
        modalRef), instantly closing the whole Try-On Studio. */}
    <AIStyleFeedback
      isOpen={isFeedbackOpen}
      onClose={() => setIsFeedbackOpen(false)}
      previewUrl={previewUrl}
    />
    </>
  );
}
