import React, { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  uploadImage,
  uploadVideo,
  imageThumb,
  videoPoster,
  videoStream,
} from "../../utils/CloudinaryAPI";
import { hapticTap, hapticSuccess, hapticError } from "../../utils/haptics";
import "./media-uploader.css";

const NATIVE_PLATFORM = Capacitor.isNativePlatform();

export default function MediaUploader({
  onUploaded,
  onStatusChange,
  acceptVideo = true,
  tag,
  folder,
  className = "media-uploader",
}) {
  const [status, setStatusState] = useState("idle"); // idle | uploading | done | error
  const [preview, setPreview] = useState(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const inputRef = useRef(null);

  // Wraps setStatus so the parent always learns about "uploading" the moment
  // it starts — the preview image renders instantly (see below), but the
  // parent's "do we actually have media yet?" check needs this signal too,
  // or a fast click on Submit right after picking a photo can slip through
  // while the real Cloudinary upload is still in flight.
  const setStatus = (s) => {
    setStatusState(s);
    onStatusChange?.(s);
  };

  const sectionTag = tag || folder || "default";

  // Shared upload path for both the plain file input and the native camera
  // capture below — same Cloudinary call, same success/error handling.
  const handleFile = async (file) => {
    const isVideo = acceptVideo && file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    setPreviewIsVideo(isVideo);
    setStatus("uploading");
    setPreview(URL.createObjectURL(file));

    try {
      if (isImage) {
        const res = await uploadImage(file, sectionTag);
        // uploadImage/uploadVideo swallow their own errors and return null on
        // failure rather than throwing — without this check, a failed upload
        // still called onUploaded with an undefined url, looked like success
        // ("Uploaded!"), and only failed silently later when the item was
        // actually submitted (with no visible reason why).
        if (!res?.secure_url) throw new Error("Image upload failed");
        onUploaded?.({
          type: "image",
          url: res.secure_url,
          thumb: imageThumb(res.secure_url),
          __raw: res,
        });
      } else if (isVideo) {
        const res = await uploadVideo(file, sectionTag);
        if (!res?.secure_url) throw new Error("Video upload failed");
        onUploaded?.({
          type: "video",
          url: videoStream(res.secure_url),
          poster: videoPoster(res.secure_url),
          __raw: res,
        });
      } else {
        throw new Error("Unsupported file type");
      }
      setStatus("done");
      hapticSuccess();
    } catch (err) {
      console.error(err);
      setStatus("error");
      hapticError();
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  // Native camera capture — a real native camera UI via Capacitor's plugin
  // (the device's actual camera app/view), not a browser file picker with a
  // "capture" hint. Distinct native capability App Review can recognize.
  const takeNativePhoto = async () => {
    hapticTap();
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 85,
      });
      if (!photo?.webPath) return;
      const resp = await fetch(photo.webPath);
      const blob = await resp.blob();
      const ext = photo.format || "jpeg";
      const file = new File([blob], `wimc-camera.${ext}`, { type: blob.type || `image/${ext}` });
      handleFile(file);
    } catch (err) {
      // User cancelled the native camera sheet — not an error worth surfacing.
      if (err?.message && !/cancel/i.test(err.message)) {
        console.error("Native camera capture failed:", err);
      }
    }
  };

  return (
    <div className={className}>
      {NATIVE_PLATFORM && (
        <button
          type="button"
          className={`${className}__camera-btn`}
          onClick={takeNativePhoto}
        >
          📷 Take Photo
        </button>
      )}

      <label className={`${className}__label`} htmlFor="media-input">
        Upload image {acceptVideo ? "or video" : ""}
      </label>
      <input
        id="media-input"
        ref={inputRef}
        type="file"
        accept={acceptVideo ? "image/*,video/*" : "image/*"}
        className={`${className}__input`}
        onChange={onFile}
      />

      <div className={`${className}__preview`}>
        {preview &&
          (previewIsVideo ? (
            <video
              className={`${className}__video`}
              width="260"
              controls
              src={preview}
            />
          ) : (
            <img
              className={`${className}__image`}
              width="260"
              alt="preview"
              src={preview}
            />
          ))}
      </div>

      <div className={`${className}__status`} aria-live="polite">
        {status === "uploading" && "Uploading…"}
        {status === "done" && "Uploaded!"}
        {status === "error" && "Upload failed."}
      </div>
    </div>
  );
}
