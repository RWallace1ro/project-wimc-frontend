import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  uploadVideo,
  fetchImagesByTag,
} from "../../utils/CloudinaryAPI";
import AIStyleFeedback from "../AIStyleFeedback/AIStyleFeedback";
import "./TryOnStudio.css";

const SECTION_OPTIONS = [
  { value: "dresses-skirts", label: "Dresses/Skirts" },
  { value: "shoes-sneakers", label: "Shoes/Sneakers" },
  { value: "pants-jeans", label: "Pants/Jeans" },
  { value: "tops", label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats", label: "Jackets/Coats" },
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
      if (initialSection) setSection(initialSection);
    }
  }, [isOpen, initialImageUrl, initialSection]);

  // ── Load section images for reference picker ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setSectionLoading(true);
    fetchImagesByTag(section)
      .then((imgs) => setSectionItems(imgs || []))
      .catch(() => setSectionItems([]))
      .finally(() => setSectionLoading(false));
  }, [isOpen, section]);

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
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
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
            <select
              className="tryon-ref__select"
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setRefImage(null);
              }}
            >
              {SECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

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
                    <img src={url} alt="item" className="tryon-ref__thumb" />
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
      <AIStyleFeedback
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        previewUrl={previewUrl}
      />
      ;
    </div>
  );
}
