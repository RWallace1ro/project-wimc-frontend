import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import Main from "../Main/Main";
import Home from "../../components/Home/Home";
import ClosetData from "../../Pages/ClosetData";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import SearchForm from "../SearchForm/SearchForm";
import { updateUser } from "../../utils/BackendAPI";
import { uploadImage } from "../../utils/CloudinaryAPI";
import "./App.css";

function App() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    userName: "Rochelle",
    avatarUrl: "/assets/images/avatar.jpg",
    email: "rochelle@example.com",
  });
  const [images, setImages] = useState([]);

  const handleImageUpload = (file) => {
    uploadImage(file)
      .then((res) => {
        const updatedUser = { ...userData, avatarUrl: res.secure_url };
        setUserData(updatedUser);
        updateUser(userData.id, updatedUser);
      })
      .catch((error) => console.error("Image upload error:", error));
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const switchToLoginModal = () => {
    setIsSignUpModalOpen(false);
    setIsLoginModalOpen(true);
  };

  return (
    <Router>
      <div className="app">
        <Header
          userName={userData.userName}
          avatarUrl={userData.avatarUrl}
          isLoggedIn={isLoggedIn}
          onSignUpClick={() => setIsSignUpModalOpen(true)}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
        <div className="app__content">
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/home" element={<Home />} />
            <Route
              path="/closet-data"
              element={<ClosetData onLogout={handleLogout} />}
            />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </div>

        <div className="image-gallery">
          {images.length > 0 &&
            images.map((image) => (
              <img
                key={image.public_id}
                src={image.secure_url}
                alt={image.public_id}
              />
            ))}
        </div>
        <SearchForm onSearchResults={(images) => setImages(images)} />

        <div className="image-gallery">
          {images.length > 0 &&
            images.map((image) => (
              <img
                key={image.public_id}
                src={image.secure_url}
                alt={image.public_id}
              />
            ))}
        </div>
        <Footer />
        <ModalWithForm
          isOpen={isSignUpModalOpen}
          onClose={() => setIsSignUpModalOpen(false)}
          onLogin={handleLogin}
          isSignUp={true}
          switchToLogin={switchToLoginModal}
          onImageUpload={handleImageUpload}
        />
        <ModalWithForm
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
          isSignUp={false}
        />
      </div>
    </Router>
  );
}

export default App;
