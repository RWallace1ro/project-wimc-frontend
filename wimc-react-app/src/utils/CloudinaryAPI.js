import { Cloudinary } from "@cloudinary/url-gen";

const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.REACT_APP_UPLOAD_PRESET;
const CLOUDINARY_API_KEY = process.env.REACT_APP_CLOUDINARY_API_KEY;

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_FETCH_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/`;

export const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME,
  },
});

export const uploadImage = async (file, sectionTag = "default") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", "closet-items");
  formData.append("tags", sectionTag);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${CLOUDINARY_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Image uploaded successfully:", result);
    return result;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

export const fetchImagesByTag = async (tag) => {
  const url = `${CLOUDINARY_FETCH_URL}${tag}.json`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images by tag: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Images fetched for tag '${tag}':`, data.resources);

    const images = data.resources.map((item) => {
      const imageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${item.version}/${item.public_id}.${item.format}`;
      return imageUrl;
    });

    return images;
  } catch (error) {
    console.error("Error fetching images by tag:", error);
    return [];
  }
};
