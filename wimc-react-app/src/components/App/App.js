import React, { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import Main from "../Main/Main";
import Home from "../../components/Home/Home";
import ClosetData from "../../Pages/ClosetData";
import About from "../About/About";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import { uploadImage, fetchImagesByTag } from "../../utils/CloudinaryAPI";
import { ClosetProvider } from "../../context/ClosetContext";
import OutfitCardViewer from "../../Pages/OutfitCardViewer";
import KidsCloset from "../../Pages/KidsCloset";
import "./App.css";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function AppInner() {
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
  // ✅ Empty string so no tab appears active on first load / refresh
  const [selectedTab, setSelectedTab] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Callback ref so ClosetData can register its openSection function
  const [openSectionFn, setOpenSectionFn] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleImageUpload = async (file, tag = "default") => {
    try {
      setApiError("");
      const response = await uploadImage(file, tag);
      if (response) {
        const updatedUser = { ...userData, avatarUrl: response.secure_url };
        setUserData(updatedUser);
        localStorage.setItem("userData", JSON.stringify(updatedUser));
      }
    } catch {
      setApiError("Failed to upload image.");
    }
  };

  const fetchClosetItemsData = async (tag) => {
    try {
      setApiError("");
      setIsLoading(true);
      const items = await fetchImagesByTag(tag);
      setClosetItems(items || []);
    } catch {
      setApiError("Failed to load closet items.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Only fetch items when a tab is explicitly clicked
  useEffect(() => {
    if (isLoggedIn && selectedTab) fetchClosetItemsData(selectedTab);
  }, [isLoggedIn, selectedTab]);

  const handleSignUp = async (userCredentials) => {
    setSignUpError("");
    if (users.find((u) => u.email === userCredentials.email)) {
      setSignUpError("User already exists with this email.");
      return;
    }
    const hashedPassword = await hashPassword(userCredentials.password);
    const newUser = {
      userName: userCredentials.username,
      email: userCredentials.email,
      password: hashedPassword,
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

  const handleLogin = async (data) => {
    setLoginError("");
    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
    const user = storedUsers.find((u) => u.email === data.email);
    if (!user) {
      setLoginError("User does not exist.");
      return;
    }
    const hashedInput = await hashPassword(data.password);
    if (user.password !== hashedInput) {
      setLoginError("Incorrect password.");
      return;
    }
    setUserData(user);
    setIsLoggedIn(true);
    setLoginData({ email: "", password: "" });
    setIsLoginModalOpen(false);
    localStorage.setItem("userData", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");
    navigate("/home");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData({
      userName: "Your Closet",
      avatarUrl: "/assets/images/default-avatar.jpg",
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

  // ✅ When a tab is clicked: update state, fetch items, navigate,
  //    then directly call ClosetData's openSection if registered
  const handleSelectTab = useCallback(
    (tab) => {
      setSelectedTab(tab);
      fetchClosetItemsData(tab);
      if (location.pathname !== "/closet-data") {
        // ✅ now uses React Router's location, not window.location
        navigate("/closet-data");
      }
      // ✅ Directly open the section modal — bypasses the stale useEffect problem
      if (typeof openSectionFn === "function") {
        openSectionFn(tab);
      }
    },
    [navigate, openSectionFn],
  );

  const handleUserUpdate = (updatedUser) => {
    const merged = { ...userData, ...updatedUser };
    setUserData(merged);
    localStorage.setItem("userData", JSON.stringify(merged));
  };

  return (
    <ClosetProvider>
      <main className="app">
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
        <section className="app__content">
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
                  closetItems={closetItems}
                  userData={userData}
                  onUserUpdate={handleUserUpdate}
                  onRegisterOpenSection={(fn) => setOpenSectionFn(() => fn)}
                  onClearTab={() => setSelectedTab("")} // ✅ resets active tab highlight
                />
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/kids-closet" element={<KidsCloset />} />
            <Route path="/outfit-card" element={<OutfitCardViewer />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </section>
        <Footer />
        <ModalWithForm
          isOpen={isSignUpModalOpen}
          onClose={() => setIsSignUpModalOpen(false)}
          onSubmit={handleSignUp}
          isSignUp={true}
          switchToLogin={() => {
            setIsSignUpModalOpen(false);
            setIsLoginModalOpen(true);
          }}
          error={signUpError}
          onImageUpload={(file) => handleImageUpload(file, selectedTab)}
        />
        <ModalWithForm
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSubmit={handleLogin}
          isSignUp={false}
          formData={loginData}
          error={loginError}
        />
      </main>
    </ClosetProvider>
  );
}

export default function App() {
  return <AppInner />;
}
