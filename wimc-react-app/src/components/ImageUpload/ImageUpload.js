import React from "react";
import "./ImageUpload.css";

const ImageUpload = ({ folder, tag, onUploadSuccess }) => {
  const handleUpload = () => {
    if (!folder || !tag) {
      console.error("Folder or tag is missing for the upload widget.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: process.env.REACT_APP_CLOUD_NAME,
        uploadPreset: process.env.REACT_APP_UPLOAD_PRESET,
        folder,
        tags: [tag],
      },
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
    <div className="image-upload">
      <button className="image-upload__button" onClick={handleUpload}>
        Upload Image
      </button>
    </div>
  );
};

export default ImageUpload;
