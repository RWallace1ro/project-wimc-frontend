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

const ensureCallback = (callback) =>
  typeof callback === "function" ? callback : () => {};

export const uploadImageFromURL = (imageUrl, sectionName, callback) => {
  const formData = new FormData();
  formData.append("file", imageUrl);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const folderPath = `closet-items/${sectionName
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  const publicId = `${sectionName
    .replace(/\s+/g, "-")
    .toLowerCase()}-${Date.now()}`;

  formData.append("folder", folderPath);
  formData.append("public_id", publicId);

  return fetch(CLOUDINARY_URL, {
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

export const uploadImage = (file, sectionName, callback) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const folderPath = `closet-items/${sectionName
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  const publicId = `${sectionName
    .replace(/\s+/g, "-")
    .toLowerCase()}-${Date.now()}`;

  formData.append("folder", folderPath);
  formData.append("public_id", publicId);

  return fetch(CLOUDINARY_URL, {
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

export const fetchImage = (publicId, callback) => {
  const fullPublicId = `closet-items/${publicId}`;
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${fullPublicId}`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Image not found for public ID: ${publicId}`);

          const fallbackData = {
            secure_url:
              "https://res.cloudinary.com/djoh2vfhd/image/upload/v1730849371/photo-1708397016786-8916880649b8_ryvylu.jpg",
            message: "Image not found",
          };
          ensureCallback(callback)(null, fallbackData);
          return fallbackData;
        }
        throw new Error(`Fetch failed: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data && !data.error) {
        ensureCallback(callback)(null, data);
        return data;
      } else {
        const errorMessage = "Unknown error occurred";
        ensureCallback(callback)({ message: errorMessage }, null);
        console.warn(errorMessage);
      }
    })
    .catch((error) => {
      const errorMessage = error.message || "Unknown fetch error";
      console.error(`Error fetching image for ${publicId}:`, errorMessage);
      ensureCallback(callback)({ message: errorMessage }, null);
    });
};

export const fetchImages = (searchTerm, callback) => {
  const formattedTerm = `closet-items/${searchTerm
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${formattedTerm}.json`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch images for ${searchTerm}`);
      }
      return response.json();
    })
    .then((data) => ensureCallback(callback)(null, data.resources))
    .catch((error) => {
      console.error(`Error fetching images for ${searchTerm}:`, error);
      ensureCallback(callback)(error, null);
    });
};

export const fetchClosetItems = (sectionNames, callback) => {
  const sectionsArray = Array.isArray(sectionNames)
    ? sectionNames
    : [sectionNames];
  const validSections = sectionsArray.filter((section) => section !== "all");

  const requests = validSections.map((section) => {
    const formattedSectionName = section.replace(/[\s/]+/g, "-").toLowerCase();
    const publicId = `closet-items/${formattedSectionName}`;
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? `Image not found for ${section}`
              : `Error: ${response.statusText}`
          );
        }
        return response.json();
      })
      .catch((error) => ({ error, section }));
  });

  Promise.all(requests)
    .then((results) => {
      const errors = results.filter((result) => result.error);
      if (errors.length) {
        console.warn("Some sections failed to load: ", errors);
      }
      callback(null, results);
    })
    .catch((error) => callback(error, null));
};

export { AdvancedImage };
