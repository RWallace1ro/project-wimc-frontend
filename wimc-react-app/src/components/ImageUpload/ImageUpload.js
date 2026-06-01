import React from "react";
import "./ImageUpload.css";

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
    };
    // Allow callers to restrict upload sources (e.g. remove 'url' to prevent
    // 403 errors from retailers that block direct hotlinking)
    if (sources) widgetConfig.sources = sources;

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
