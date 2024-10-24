const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_UPLOAD_PRESET;
const CLOUDINARY_API_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;
const CLOUDINARY_API_UPLOAD_URL = `${CLOUDINARY_API_BASE_URL}/image/upload`;

export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  return fetch(CLOUDINARY_API_UPLOAD_URL, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error uploading image:", error);
      throw error;
    });
};

export const fetchImages = () => {
  return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image/list.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching images:", error);
      throw error;
    });
};

export const fetchImage = (publicId) => {
  return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image/upload/${publicId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching image:", error);
      throw error;
    });
};

export const fetchClosetItems = (tag) => {
  return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image/tags/${tag}.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch closet items: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching closet items:", error);
      throw error;
    });
};

export const api = { uploadImage, fetchImages, fetchImage, fetchClosetItems };

// const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
// const UPLOAD_PRESET = process.env.REACT_APP_UPLOAD_PRESET;
// const CLOUDINARY_API_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;
// const CLOUDINARY_API_UPLOAD_URL = `${CLOUDINARY_API_BASE_URL}/image/upload`;

// const uploadImage = (file) => {
//   const formData = new FormData();
//   formData.append("file", file);
//   formData.append("upload_preset", UPLOAD_PRESET);

//   return fetch(CLOUDINARY_API_UPLOAD_URL, {
//     method: "POST",
//     body: formData,
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Failed to upload image");
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Error uploading image:", error);
//       throw error;
//     });
// };

// const fetchImages = () => {
//   return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image`)
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`Fetch failed: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Error fetching images:", error);
//       throw error;
//     });
// };

// const fetchImage = (publicId) => {
//   return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image/upload/${publicId}`)
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`Image fetch failed: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Error fetching image:", error);
//       throw error;
//     });
// };

// const fetchClosetItems = (tag) => {
//   return fetch(`${CLOUDINARY_API_BASE_URL}/resources/image/tags/${tag}`)
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`Failed to fetch closet items: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.error("Error fetching closet items:", error);
//       throw error;
//     });
// };

// export const api = { uploadImage, fetchImages, fetchImage, fetchClosetItems };
