import { Cloudinary } from "@cloudinary/url-gen";
import { AdvancedImage } from "@cloudinary/react";


const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.REACT_APP_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME,
  },
});


const ensureCallback = (callback) => (typeof callback === "function" ? callback : () => {});

export const uploadImage = (file, callback) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => ensureCallback(callback)(null, data))
    .catch((error) => {
      console.error("Error uploading image:", error);
      ensureCallback(callback)(error, null);
    });
};


export const fetchImages = (tag, callback) => {
  const formattedTag = tag.replace(/\s/g, "-");

  fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${formattedTag}.json`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          
          return [{ secure_url: "/path/to/placeholder-image.jpg" }];
        }
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => ensureCallback(callback)(null, data.resources || []))
    .catch((error) => {
      console.error("Error fetching images:", error);
      ensureCallback(callback)(error, null);
    });
};


export const fetchImage = (publicId, callback) => {
  fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          
          return { secure_url: "/path/to/placeholder-image.jpg" };
        }
        throw new Error(`Image fetch failed: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => ensureCallback(callback)(null, data))
    .catch((error) => {
      console.error("Error fetching image:", error);
      ensureCallback(callback)(error, null);
    });
};

export const fetchClosetItems = (tag, callback) => {
  const formattedTag = tag.replace(/\s/g, "-");

  fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/tags/${formattedTag}.json`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          
          return [];
        }
        throw new Error(`Failed to fetch closet items: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => ensureCallback(callback)(null, data.resources || []))
    .catch((error) => {
      console.error("Error fetching closet items:", error);
      ensureCallback(callback)(error, null);
    });
};

export { AdvancedImage };

