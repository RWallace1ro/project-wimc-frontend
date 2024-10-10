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
import About from "../About/About";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import { api } from "../../utils/BackendAPI";
import "./App.css";

function App() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    userName: "Rochelle",
    avatarUrl: "/assets/images/avatar.jpg",
    email: "rochelle@gmail.com",
  });

  const handleImageUpload = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    api
      .uploadImage(formData)
      .then((res) => {
        const updatedUser = { ...userData, avatarUrl: res.secure_url };
        setUserData(updatedUser);
        return api.updateUser(userData.id, updatedUser);
      })
      .catch((error) => console.error("Image upload error:", error));
  };

  const handleLogin = (userCredentials) => {
    api
      .login(userCredentials)
      .then((user) => {
        setUserData(user);
        setIsLoggedIn(true);
        setIsLoginModalOpen(false);
      })
      .catch((error) => {
        console.error("Login error:", error);
      });
  };

  const handleSignUp = (userCredentials) => {
    api
      .signUp(userCredentials)
      .then((user) => {
        setUserData(user);
        setIsLoggedIn(true);
        setIsSignUpModalOpen(false);
      })
      .catch((error) => {
        console.error("Sign Up error:", error);
      });
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

  const handleAboutClick = () => {
    window.location.href = "/about";
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
          onAboutClick={handleAboutClick}
        />
        <div className="app__content">
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/home" element={<Home />} />
            <Route
              path="/closet-data"
              element={<ClosetData onLogout={handleLogout} />}
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
          onImageUpload={handleImageUpload}
        />

        <ModalWithForm
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSubmit={handleLogin}
          isSignUp={false}
        />
      </div>
    </Router>
  );
}

export default App;
