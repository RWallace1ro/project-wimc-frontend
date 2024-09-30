const BACKEND_API_BASE_URL = "https://cloudinary.com";

export const signUp = (userData) => {
  return fetch(`${BACKEND_API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error signing up: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Sign Up Error:", error);
      throw error;
    });
};

export const login = (userData) => {
  return fetch(`${BACKEND_API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error logging in: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Login Error:", error);
      throw error;
    });
};

export const fetchClosetItems = () => {
  return fetch(`${BACKEND_API_BASE_URL}/closet-items`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error fetching closet items: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Fetch Closet Items Error:", error);
      throw error;
    });
};

export const addClothingItem = (itemData) => {
  return fetch(`${BACKEND_API_BASE_URL}/add-item`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(itemData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error adding clothing item: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Add Clothing Item Error:", error);
      throw error;
    });
};

export const deleteClothingItem = (itemId) => {
  return fetch(`${BACKEND_API_BASE_URL}/delete-item/${itemId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error deleting clothing item: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Delete Clothing Item Error:", error);
      throw error;
    });
};

export const updateUser = (userId, updatedData) => {
  return fetch(`${BACKEND_API_BASE_URL}/update-user/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error updating user information: ${response.statusText}`
        );
      }
      return response.json();
    })
    .catch((error) => {
      console.error("API Update User Error:", error);
      throw error;
    });
};

export const getWishListItems = (userId) => {
  return fetch(`${BACKEND_API_BASE_URL}/wishlist/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error fetching wish list items: ${response.statusText}`
        );
      }
      return response.json();
    })
    .catch((error) => {
      console.error("API Get Wish List Items Error:", error);
      throw error;
    });
};

export const addWishListItem = (userId, itemData) => {
  return fetch(`${BACKEND_API_BASE_URL}/wishlist/${userId}/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(itemData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error adding wish list item: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("API Add Wish List Item Error:", error);
      throw error;
    });
};

export const deleteWishListItem = (userId, itemId) => {
  return fetch(`${BACKEND_API_BASE_URL}/wishlist/${userId}/delete/${itemId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error deleting wish list item: ${response.statusText}`
        );
      }
      return response.json();
    })
    .catch((error) => {
      console.error("API Delete Wish List Item Error:", error);
      throw error;
    });
};
