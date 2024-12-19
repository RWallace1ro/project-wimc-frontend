import React, { useEffect, useState } from "react";
import { fetchImage } from "../utils/CloudinaryAPI";

function ProfileImage({ publicId, avatarUrlFromModal }) {
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (avatarUrlFromModal) {
      setAvatarUrl(avatarUrlFromModal);
    } else if (publicId) {
      fetchImage(publicId, (error, data) => {
        if (error) {
          console.error("Error fetching image:", error);
          setAvatarUrl(
            "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg"
          );
        } else {
          setAvatarUrl(data.secure_url);
        }
      });
    }
  }, [publicId, avatarUrlFromModal]);

  return (
    <section className="profile-image" aria-live="polite">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="User Avatar"
          onError={(e) => {
            e.target.src =
              "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";
          }}
          className="profile-avatar"
        />
      ) : (
        <p>Loading...</p>
      )}
    </section>
  );
}

export default ProfileImage;
