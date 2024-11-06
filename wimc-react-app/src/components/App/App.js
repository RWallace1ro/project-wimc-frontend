import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import Main from "../Main/Main";
import Home from "../../components/Home/Home";
import ClosetData from "../../Pages/ClosetData";
import About from "../About/About";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import {
  AdvancedImage,
  cld,
  uploadImageFromURL,
  fetchClosetItems,
  uploadImage,
  fetchImage,
  fetchImages,
} from "../../utils/CloudinaryAPI";
import "./App.css";

function App() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    userName: "Your Closet",
    avatarUrl: "/assets/images/default-avatar.jpg",
    email: "",
  });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [users, setUsers] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [loginError, setLoginError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [selectedTab, setSelectedTab] = useState("Dresses/Skirts");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedImages, setFetchedImages] = useState([]);
  const [singleImage, setSingleImage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUserData = JSON.parse(localStorage.getItem("userData"));
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

    setUsers(storedUsers);

    if (storedUserData && storedIsLoggedIn) {
      setUserData(storedUserData);
      setIsLoggedIn(true);
    }
  }, []);

  const handleImageUpload = (file, sectionName) => {
    setApiError("");
    uploadImage(file, sectionName, (err, res) => {
      if (err) {
        console.error("Image upload error:", err);
        setApiError(null);
        return;
      }
      const updatedUser = { ...userData, avatarUrl: res.secure_url };
      setUserData(updatedUser);
      localStorage.setItem("userData", JSON.stringify(updatedUser));
    });
  };

  const handleURLImageUpload = (url, sectionName) => {
    setApiError("");
    uploadImageFromURL(url, sectionName, (err) => {
      if (err) {
        console.error("Image upload from URL error:", err);
      }
    });
  };

  const fetchClosetItemsData = (sectionNames) => {
    setApiError("");
    setIsLoading(true);

    fetchClosetItems(sectionNames, (err, data) => {
      if (err) {
        console.error("Error fetching closet items:", err);
        setApiError("Failed to load closet items.");
        setIsLoading(false);
        return;
      }
      setClosetItems(data);
      setIsLoading(false);
    });
  };

  const handleFetchImages = (searchTerm) => {
    fetchImages(searchTerm, (err, images) => {
      if (err) {
        console.error("Error fetching images:", err);
        setApiError(null);
        return;
      }
      setFetchedImages(images);
    });
  };

  const handleFetchSingleImage = (publicId) => {
    fetchImage(publicId, (err, image) => {
      if (err) {
        console.error("Error fetching image:", err);
        setApiError("Failed to load image.");
        return;
      }
      setSingleImage(image);
    });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchClosetItemsData([
        "dresses-skirts",
        "shoes-sneakers",
        "pants-jeans",
        "tops",
        "bags-accessories",
        "jackets-coats",
      ]);
    }
  }, [isLoggedIn]);

  const handleSignUp = (userCredentials) => {
    setSignUpError("");
    const existingUser = users.find(
      (user) => user.email === userCredentials.email
    );

    if (existingUser) {
      setSignUpError("User already exists with this email.");
      return;
    }

    const newUser = {
      userName: userCredentials.username,
      email: userCredentials.email,
      password: userCredentials.password,
      avatarUrl:
        userCredentials.avatarUrl ||
        "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg",
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setUserData(newUser);
    setIsLoggedIn(true);
    setIsSignUpModalOpen(false);

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    localStorage.setItem("userData", JSON.stringify(newUser));
    localStorage.setItem("isLoggedIn", "true");

    navigate("/home");
  };

  const handleLogin = (data) => {
    setLoginError("");
    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
    setUsers(storedUsers);

    const user = storedUsers.find((user) => user.email === data.email);

    if (!user) {
      setLoginError("User does not exist.");
      console.log("User not found:", data.email);
      return;
    }

    if (user.password !== data.password) {
      setLoginError("Incorrect password.");
      console.log("Incorrect password for user:", data.email);
      return;
    }

    setUserData(user);
    setIsLoggedIn(true);
    setLoginData({ email: "", password: "" });
    setIsLoginModalOpen(false);

    localStorage.setItem("userData", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");

    console.log("Login successful for user:", user.email);
    navigate("/home");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData({
      userName: "Your Closet",
      avatarUrl:
        "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg",
      email: "",
    });
    setLoginData({ email: "", password: "" });
    setLoginError("");
    setSignUpError("");
    localStorage.removeItem("userData");
    localStorage.removeItem("isLoggedIn");

    setIsLoginModalOpen(false);
    setIsSignUpModalOpen(false);
    navigate("/");
  };

  const handleSelectTab = (tab) => {
    setSelectedTab(tab);
    handleFetchImages(tab);
    handleFetchSingleImage(tab);
  };

  const switchToLoginModal = () => {
    setIsSignUpModalOpen(false);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="app">
      <Header
        userName={isLoggedIn ? userData.userName : "Your Closet"}
        avatarUrl={userData.avatarUrl}
        isLoggedIn={isLoggedIn}
        onSignUpClick={() => setIsSignUpModalOpen(true)}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogoutClick={handleLogout}
        handleSelectTab={handleSelectTab}
        selectedTab={selectedTab}
      />
      <div className="app__content">
        {apiError && <p className="error-message">{apiError}</p>}
        {isLoading && <p className="loading-message">Loading...</p>}
        <Routes>
          <Route path="/" element={<Main isLoggedIn={isLoggedIn} />} />
          <Route path="/home" element={<Home />} />
          <Route
            path="/closet-data"
            element={
              <ClosetData
                selectedTab={selectedTab}
                isLoggedIn={isLoggedIn}
                setApiError={setApiError}
                setIsLoading={setIsLoading}
              />
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
      <Footer />
      <ModalWithForm
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
        onSubmit={handleSignUp}
        isSignUp={true}
        switchToLogin={switchToLoginModal}
        error={signUpError}
        onImageUpload={(file) => handleImageUpload(file, selectedTab)}
        onImageURLUpload={(url) => handleURLImageUpload(url, selectedTab)}
      />
      <ModalWithForm
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSubmit={handleLogin}
        isSignUp={false}
        formData={loginData}
        error={loginError}
      />

      {closetItems.length > 0 && (
        <div className="closet-items-gallery">
          {closetItems
            .filter((item) => item.public_id)
            .map((item, index) => (
              <AdvancedImage
                key={item.public_id || index}
                cldImg={cld.image(item.public_id)}
                alt={item.public_id ? `Closet item ${index + 1}` : ""}
                className="gallery-image"
              />
            ))}
        </div>
      )}

      {fetchedImages.length > 0 && (
        <div className="fetched-images-gallery">
          {fetchedImages.map((image, index) => (
            <AdvancedImage
              key={image.public_id || index}
              cldImg={cld.image(image.public_id)}
              alt={image.public_id ? `Fetched ${index + 1}` : "Fetched image"}
              className="gallery-image"
            />
          ))}
        </div>
      )}

      {singleImage && (
        <div className="single-image">
          <AdvancedImage
            cldImg={cld.image(singleImage.public_id)}
            alt={singleImage.public_id || "single image"}
            className="gallery-image"
          />
        </div>
      )}
    </div>
  );
}

export default App;
