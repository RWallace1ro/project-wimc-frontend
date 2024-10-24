// const CLOUDINARY_API_BASE_URL = "https://api.cloudinary.com/v1_1/:cloud_name";
// const apiKey =

// const CLOUDINARY_API_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;
// const CLOUDINARY_API_UPLOAD_URL = `${CLOUDINARY_API_BASE_URL}/image/upload`;

// console.log("API Key:", apiKey);
// console.log("API Base URL:", CLOUDINARY_API_BASE_URL);

// export const api = {
//   fetchData: () => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/endpoint`, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//     })
//       .then((response) => response.json())
//       .catch((error) => {
//         console.error("Error fetching data:", error);
//       });
//   },

//   signUp: (userData) => {
//     console.log("User data being sent:", userData);
//     return fetch(`${CLOUDINARY_API_BASE_URL}/signup`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(userData),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           console.error("API response status:", response.status);
//           throw new Error(`Error signing up: ${response.statusText}`);
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("Sign Up Error:", error);
//         throw error;
//       });
//   },

//   login: (userData) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/login`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(userData),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(`Error logging in: ${response.statusText}`);
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("Login Error:", error);
//         throw error;
//       });
//   },

//   fetchClosetItems: () => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/closet-items`, {
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//       },
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error fetching closet items: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("Fetch Closet Items Error:", error);
//         throw error;
//       });
//   },

//   addClothingItem: (itemData) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/add-item`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(itemData),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(`Error adding clothing item: ${response.statusText}`);
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("Add Clothing Item Error:", error);
//         throw error;
//       });
//   },

//   deleteClothingItem: (itemId) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/delete-item/${itemId}`, {
//       method: "DELETE",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//       },
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error deleting clothing item: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("Delete Clothing Item Error:", error);
//         throw error;
//       });
//   },

//   updateUser: (userId, updatedData) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/update-user/${userId}`, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(updatedData),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error updating user information: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("API Update User Error:", error);
//         throw error;
//       });
//   },

//   getWishListItems: (userId) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/wishlist/${userId}`, {
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//       },
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error fetching wish list items: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("API Get Wish List Items Error:", error);
//         throw error;
//       });
//   },

//   addWishListItem: (userId, itemData) => {
//     return fetch(`${CLOUDINARY_API_BASE_URL}/wishlist/${userId}/add`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(itemData),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error adding wish list item: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("API Add Wish List Item Error:", error);
//         throw error;
//       });
//   },

//   deleteWishListItem: (userId, itemId) => {
//     return fetch(
//       `${CLOUDINARY_API_BASE_URL}/wishlist/${userId}/delete/${itemId}`,
//       {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//         },
//       }
//     )
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(
//             `Error deleting wish list item: ${response.statusText}`
//           );
//         }
//         return response.json();
//       })
//       .catch((error) => {
//         console.error("API Delete Wish List Item Error:", error);
//         throw error;
//       });
//   },
// };
