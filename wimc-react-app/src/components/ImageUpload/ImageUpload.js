import React from "react";
import "./ImageUpload.css";

// Default sources. Unsplash provides free web image search (no API key).
// Note: "image_search" (full-web Google search) is intentionally NOT included
// because it requires a Google Custom Search API key (googleApiKey). It can be
// added later once that key is configured.
const DEFAULT_SOURCES = [
  "local",
  "camera",
  "url",
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
