import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import Main from "../Main/Main";
import Home from "../../components/Home/Home";
import ClosetData from "../../Pages/ClosetData";
import About from "../About/About";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import { api } from "../../utils/CloudinaryAPI";
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
  const [selectedTab, setSelectedTab] = useState(null);
  const [apiError, setApiError] = useState("");

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

  const handleImageUpload = (file) => {
    setApiError("");
    api
      .uploadImage(file)
      .then((res) => {
        const updatedUser = { ...userData, avatarUrl: res.secure_url };
        setUserData(updatedUser);
        localStorage.setItem("userData", JSON.stringify(updatedUser));
      })
      .catch((error) => {
        console.error("Image upload error:", error);
        setApiError(null);
      });
  };

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
        userCredentials.avatarUrl || "/assets/images/default-avatar.jpg",
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
    const user = users.find((user) => user.email === data.email);

    if (!user) {
      setLoginError("User does not exist.");
      return;
    }

    if (user.password !== data.password) {
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

  const fetchClosetItems = (tag) => {
    setApiError("");
    api
      .fetchClosetItems(tag)
      .then((data) => {
        setClosetItems(data.resources);
      })
      .catch((error) => {
        console.error("Error fetching closet items:", error);
        setApiError(null);
      });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchClosetItems("all");
    }
  }, [isLoggedIn]);

  const handleSelectTab = (tab) => {
    setSelectedTab(tab);
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
      />
      <div className="app__content">
        {apiError && <p className="error-message">{apiError}</p>}
        <Routes>
          <Route path="/" element={<Main isLoggedIn={isLoggedIn} />} />
          <Route path="/home" element={<Home />} />
          <Route
            path="/closet-data"
            element={
              <ClosetData
                selectedTab={selectedTab}
                onLogout={handleLogout}
                items={closetItems}
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
        onImageUpload={handleImageUpload}
      />
      <ModalWithForm
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSubmit={handleLogin}
        isSignUp={false}
        formData={loginData}
        error={loginError}
      />
    </div>
  );
}

export default App;

// import React, { useState, useEffect } from "react";
// import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
// import Header from "../Header/Header";
// import Footer from "../Footer/Footer";
// import Main from "../Main/Main";
// import Home from "../../components/Home/Home";
// import ClosetData from "../../Pages/ClosetData";
// import About from "../About/About";
// import ModalWithForm from "../ModalWithForm/ModalWithForm";
// import { api } from "../../utils/CloudinaryAPI";
// import "./App.css";

// function App() {
//   const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
//   const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [userData, setUserData] = useState({
//     userName: "Your Closet",
//     avatarUrl: "/assets/images/default-avatar.jpg",
//     email: "",
//   });
//   const [loginData, setLoginData] = useState({ email: "", password: "" });
//   const [users, setUsers] = useState([]);
//   const [closetItems, setClosetItems] = useState([]);
//   const [loginError, setLoginError] = useState("");
//   const [signUpError, setSignUpError] = useState("");
//   const [selectedTab, setSelectedTab] = useState(null);
//   const [apiError, setApiError] = useState(""); // New state for API errors

//   const navigate = useNavigate();

//   useEffect(() => {
//     const storedUserData = JSON.parse(localStorage.getItem("userData"));
//     const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
//     const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

//     setUsers(storedUsers);

//     if (storedUserData && storedIsLoggedIn) {
//       setUserData(storedUserData);
//       setIsLoggedIn(true);
//     }
//   }, []);

//   const handleImageUpload = (file) => {
//     api
//       .uploadImage(file)
//       .then((res) => {
//         const updatedUser = { ...userData, avatarUrl: res.secure_url };
//         setUserData(updatedUser);
//         localStorage.setItem("userData", JSON.stringify(updatedUser));
//       })
//       .catch((error) => {
//         console.error("Image upload error:", error);
//         setApiError("Failed to upload image. Please try again.");
//       });
//   };

//   const handleSignUp = (userCredentials) => {
//     setSignUpError("");
//     const existingUser = users.find(
//       (user) => user.email === userCredentials.email
//     );

//     if (existingUser) {
//       setSignUpError("User already exists with this email.");
//       return;
//     }

//     const newUser = {
//       userName: userCredentials.username,
//       email: userCredentials.email,
//       password: userCredentials.password,
//       avatarUrl:
//         userCredentials.avatarUrl || "/assets/images/default-avatar.jpg",
//     };

//     const updatedUsers = [...users, newUser];
//     setUsers(updatedUsers);
//     setUserData(newUser);
//     setIsLoggedIn(true);
//     setIsSignUpModalOpen(false);

//     localStorage.setItem("users", JSON.stringify(updatedUsers));
//     localStorage.setItem("userData", JSON.stringify(newUser));
//     localStorage.setItem("isLoggedIn", "true");

//     navigate("/home");
//   };

//   const handleLogin = (data) => {
//     setLoginError("");
//     const user = users.find((user) => user.email === data.email);

//     if (!user) {
//       setLoginError("User does not exist.");
//       return;
//     }

//     if (user.password !== data.password) {
//       setLoginError("Incorrect password.");
//       return;
//     }

//     setUserData(user);
//     setIsLoggedIn(true);
//     setLoginData({ email: "", password: "" });
//     setIsLoginModalOpen(false);

//     localStorage.setItem("userData", JSON.stringify(user));
//     localStorage.setItem("isLoggedIn", "true");

//     navigate("/home");
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     setUserData({
//       userName: "Your Closet",
//       avatarUrl: "/assets/images/default-avatar.jpg",
//       email: "",
//     });
//     setLoginData({ email: "", password: "" });
//     setLoginError("");
//     setSignUpError("");
//     localStorage.removeItem("userData");
//     localStorage.removeItem("isLoggedIn");

//     setIsLoginModalOpen(false);
//     setIsSignUpModalOpen(false);
//     navigate("/");
//   };

//   const fetchClosetItems = (tag) => {
//     api
//       .fetchClosetItems(tag)
//       .then((data) => {
//         setClosetItems(data.resources);
//       })
//       .catch((error) => {
//         console.error("Error fetching closet items:", error);
//         setApiError(null);
//       });
//   };

//   useEffect(() => {
//     if (isLoggedIn) {
//       fetchClosetItems("all");
//     }
//   }, [isLoggedIn]);

//   const handleSelectTab = (tab) => {
//     setSelectedTab(tab);
//   };

//   const switchToLoginModal = () => {
//     setIsSignUpModalOpen(false);
//     setIsLoginModalOpen(true);
//   };

//   return (
//     <div className="app">
//       <Header
//         userName={isLoggedIn ? userData.userName : "Your Closet"}
//         avatarUrl={userData.avatarUrl}
//         isLoggedIn={isLoggedIn}
//         onSignUpClick={() => setIsSignUpModalOpen(true)}
//         onLoginClick={() => setIsLoginModalOpen(true)}
//         onLogoutClick={handleLogout}
//         handleSelectTab={handleSelectTab}
//       />
//       <div className="app__content">
//         {apiError && <p className="error-message">{apiError}</p>}
//         <Routes>
//           <Route path="/" element={<Main isLoggedIn={isLoggedIn} />} />
//           <Route path="/home" element={<Home />} />
//           <Route
//             path="/closet-data"
//             element={
//               <ClosetData
//                 selectedTab={selectedTab}
//                 onLogout={handleLogout}
//                 items={closetItems}
//               />
//             }
//           />
//           <Route path="/about" element={<About />} />
//           <Route path="*" element={<Navigate to="/home" />} />
//         </Routes>
//       </div>
//       <Footer />
//       <ModalWithForm
//         isOpen={isSignUpModalOpen}
//         onClose={() => setIsSignUpModalOpen(false)}
//         onSubmit={handleSignUp}
//         isSignUp={true}
//         switchToLogin={switchToLoginModal}
//         error={signUpError}
//         onImageUpload={handleImageUpload}
//       />
//       <ModalWithForm
//         isOpen={isLoginModalOpen}
//         onClose={() => setIsLoginModalOpen(false)}
//         onSubmit={handleLogin}
//         isSignUp={false}
//         formData={loginData}
//         error={loginError}
//       />
//     </div>
//   );
// }
