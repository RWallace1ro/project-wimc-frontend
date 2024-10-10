const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
// const UPLOAD_PRESET = process.env.REACT_APP_WIMC_UPLOAD;
// const apiKey = "258382581976839";
const CLOUDINARY_API_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

const uploadImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "your_upload_preset");

  return fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error("Error uploading image:", error);
      throw error;
    });
};

const fetchImages = () => {
  return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image`, {
    headers: {
      Authorization: `Basic ${btoa(apiKey + ":YOUR_API_SECRET")}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching images:", error);
    });
};

export const api = { uploadImage, fetchImages };

// export const fetchClosetItems = () => {
//   return fetch(`${CLOUDINARY_API_BASE_URL}/closet-items`)
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`Error: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Fetch Closet Items Error:", error);
//       throw error;
//     });
// };

// export const fetchImage = (searchTerm) => {
//   const API_URL = `${CLOUDINARY_API_BASE_URL}/resources/search`;

//   return fetch(`${API_URL}?expression=${searchTerm}`, {
//     method: "GET",
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Failed to fetch images from Cloudinary");
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Cloudinary Fetch Image Error:", error);
//       throw error;
//     });
// };

// export const uploadImage = (formData) => {
//   formData.append("upload_preset", UPLOAD_PRESET);

//   return fetch(`${CLOUDINARY_API_BASE_URL}/image/upload`, {
//     method: "POST",
//     body: formData,
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`Error: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("API Upload Image Error:", error);
//       throw error;
//     });
// };
