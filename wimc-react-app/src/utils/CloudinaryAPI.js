const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_WIMC_UPLOAD;
const CLOUDINARY_API_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

export const fetchClosetItems = () => {
  return fetch(`${CLOUDINARY_API_BASE_URL}/closet-items`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Fetch Closet Items Error:", error);
      throw error;
    });
};

export const fetchImage = (searchTerm) => {
  const API_URL = `${CLOUDINARY_API_BASE_URL}/resources/search`;

  return fetch(`${API_URL}?expression=${searchTerm}`, {
    method: "GET",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch images from Cloudinary");
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Cloudinary Fetch Image Error:", error);
      throw error;
    });
};

export const uploadImage = (formData) => {
  formData.append("upload_preset", UPLOAD_PRESET);

  return fetch(`${CLOUDINARY_API_BASE_URL}/image/upload`, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("API Upload Image Error:", error);
      throw error;
    });
};
