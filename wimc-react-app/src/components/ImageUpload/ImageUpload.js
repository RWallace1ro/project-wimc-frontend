import React from "react";
import "./ImageUpload.css";

// Default sources include direct web image search (image_search), Unsplash,
// the web address/URL option, plus device, camera, and cloud drives.
const DEFAULT_SOURCES = [
  "local",
  "camera",
  "url",
  "image_search",
  "unsplash",
  "google_drive",
  "dropbox",
];

const ImageUpload = ({ folder, tag, onUploadSuccess, sources }) => {
  const handleUpload = () => {
    if (!folder || !tag) {
      console.error("Folder or tag is missing for the upload widget.");
      return;
    }

    const widgetConfig = {
      cloudName: process.env.REACT_APP_CLOUD_NAME,
      uploadPreset: process.env.REACT_APP_UPLOAD_PRESET,
      folder,
      tags: [tag],
      // Explicit sources so "Search the web" (image_search) is always offered
      // alongside the URL/web-address option. Callers can still override.
      sources: sources || DEFAULT_SOURCES,
    };

    const widget = window.cloudinary.createUploadWidget(
      widgetConfig,
      (error, result) => {
        if (error) {
          console.error("Upload Widget Error:", error);
          return;
        }

        if (result.event === "success") {
          console.log("Upload Success:", result.info);
          onUploadSuccess(result.info);
        }
      }
    );

    widget.open();
  };

  return (
    <section className="image-upload" aria-label="Image Upload Section">
      <button
        className="image-upload__button"
        onClick={handleUpload}
        aria-label="Click to upload an image"
      >
        Upload Image
      </button>
    </section>
  );
};

export default ImageUpload;
