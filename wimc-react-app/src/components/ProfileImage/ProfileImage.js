import React, { useEffect, useState } from "react";
import { fetchImage } from "../utils/CloudinaryAPI";

function ProfileImage({ publicId }) {
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
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
  }, [publicId]);

  return (
    <div>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="User Avatar"
          onError={(e) =>
            (e.target.src =
              "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg")
          }
          className="profile-avatar"
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default ProfileImage;
