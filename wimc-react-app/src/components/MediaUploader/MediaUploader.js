import React, { useRef, useState } from "react";
import {
  uploadImage,
  uploadVideo,
  imageThumb,
  videoPoster,
  videoStream,
} from "../../utils/CloudinaryAPI";

export default function MediaUploader({
  onUploaded,
  acceptVideo = true,
  tag,
  folder,
  className = "media-uploader",
}) {
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const sectionTag = tag || folder || "default";

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = acceptVideo && file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

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
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className={className}>
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
          (inputRef.current?.files?.[0]?.type?.startsWith("video/") ? (
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
