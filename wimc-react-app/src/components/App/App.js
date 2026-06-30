import React, { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { logAppEvent } from "../../utils/analytics";

import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import CookieConsent from "../CookieConsent/CookieConsent";
import CookiePreferences from "../CookiePreferences/CookiePreferences";
import PendingDeletionBanner from "../PendingDeletionBanner/PendingDeletionBanner";
import Main from "../Main/Main";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import { uploadImage, fetchImagesByTag } from "../../utils/CloudinaryAPI";
import { ClosetProvider } from "../../context/ClosetContext";
import { BackgroundProvider } from "../../context/BackgroundContext";
import { SyncProvider } from "../../context/SyncContext";
import { TierProvider, useTier } from "../../context/TierContext";
import "./App.css";

const Home = React.lazy(() => import("../../components/Home/Home"));
const ClosetData = React.lazy(() => import("../../Pages/ClosetData"));
const About = React.lazy(() => import("../About/About"));
const OutfitCardViewer = React.lazy(() => import("../../Pages/OutfitCardViewer"));
const KidsCloset = React.lazy(() => import("../../Pages/KidsCloset"));
const PetCloset = React.lazy(() => import("../../Pages/PetCloset"));
const Receipts = React.lazy(() => import("../../Pages/Receipts"));
const PrivacyPolicy = React.lazy(() => import("../../Pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("../../Pages/TermsOfService"));
const FAQ = React.lazy(() => import("../../Pages/FAQ"));
const Pricing = React.lazy(() => import("../../Pages/Pricing"));
const SharedView = React.lazy(() => import("../../Pages/SharedView"));
const AuthAction = React.lazy(() => import("../../Pages/AuthAction"));
const NotFound = React.lazy(() => import("../../Pages/NotFound"));
const WIMCAssistant = React.lazy(() => import("../WIMCAssistant/WIMCAssistant"));

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";

// Redirects unauthenticated users to "/" and opens the login modal
function ProtectedRoute({ isLoggedIn, onLoginRequired, children }) {
  const triggered = useRef(false);
  useEffect(() => {
    if (!isLoggedIn && !triggered.current) {
      triggered.current = true;
      onLoginRequired();
    }
  }, [isLoggedIn, onLoginRequired]);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
}

// Blocks direct-URL access to a Pro-only page for Free users. Waits for the
// tier to load, then redirects non-Pro users to /pricing (the header already
// shows the upgrade modal; this covers users typing the URL directly).
function ProRoute({ children }) {
  const { isPro, ready } = useTier();
  if (!ready) return null; // brief — tier snapshot resolving
  if (!isPro) return <Navigate to="/pricing" replace />;
  return children;
}

function AppInner() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    userName: "Your Closet",
    avatarUrl: DEFAULT_AVATAR,
    email: "",
  });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [selectedTab, setSelectedTab] = useState("");
  const [closetItems, setClosetItems] = useState([]);
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [openSectionFn, setOpenSectionFn] = useState(null);
  // Email-verification gate
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // Tracks a pending post-login navigation so ProtectedRoute doesn't
  // race against the async onAuthStateChanged callback.
  const pendingNavRef = useRef(null);


  // Listen for Firebase auth state changes
  useEffect(() => {
    // Safety net: if Firebase hasn't responded in 8 seconds, unblock the UI
    // so the user never sees an infinite loading screen on slow/mobile connections.
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        // ── Email-verification gate ──────────────────────────────────────────
        // Block full access until the user has verified their email. Password
        // (email) sign-ups start unverified; Google accounts are already verified.
        if (!firebaseUser.emailVerified) {
          pendingNavRef.current = null;
          flushSync(() => {
            setVerifyEmail(firebaseUser.email || "");
            setNeedsVerification(true);
            setIsLoggedIn(false);
            setIsLoading(false);
          });
          return;
        }

        // Wrap Firestore read in try/catch — if the network is slow or offline
        // this call can hang indefinitely and keep isLoading=true forever.
        let profile = {};
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          profile = userDoc.exists() ? userDoc.data() : {};
        } catch (e) {
          console.warn("Could not fetch user profile from Firestore:", e);
        }

        // flushSync forces React to commit isLoggedIn=true synchronously
        // so ProtectedRoute sees the correct state before navigation renders it
        flushSync(() => {
          setNeedsVerification(false);
          setUserData({
            uid: firebaseUser.uid,
            userName: profile.userName || firebaseUser.displayName || "Your Closet",
            avatarUrl: profile.avatarUrl || firebaseUser.photoURL || DEFAULT_AVATAR,
            email: firebaseUser.email,
            pendingDeletion: profile.pendingDeletion || false,
            deletionDate: profile.deletionDate || null,
          });
          setIsLoggedIn(true);
          setIsLoading(false);
        });

        // Navigate only after state is committed
        if (pendingNavRef.current) {
          navigate(pendingNavRef.current);
          pendingNavRef.current = null;
        }
      } else {
        setIsLoggedIn(false);
        setNeedsVerification(false);
        setUserData({
          userName: "Your Closet",
          avatarUrl: DEFAULT_AVATAR,
          email: "",
        });
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [navigate]);

  const handleImageUpload = async (file, tag = "default") => {
    try {
      setApiError("");
      const response = await uploadImage(file, tag);
      if (response && userData.uid) {
        const updatedUrl = response.secure_url;
        await updateDoc(doc(db, "users", userData.uid), { avatarUrl: updatedUrl });
        setUserData((prev) => ({ ...prev, avatarUrl: updatedUrl }));
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

  useEffect(() => {
    if (isLoggedIn && selectedTab) fetchClosetItemsData(selectedTab);
  }, [isLoggedIn, selectedTab]);

  const handleSignUp = async (userCredentials) => {
    setSignUpError("");
    // Mobile keyboards add trailing spaces and capitalize the first letter —
    // normalize so the account email is always clean and consistent.
    const cleanEmail = (userCredentials.email || "").trim().toLowerCase();
    try {
      // Do NOT auto-navigate to /home — the user must verify their email first.
      pendingNavRef.current = null;
      const { user } = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        userCredentials.password
      );
      await updateProfile(user, { displayName: userCredentials.username });
      const profile = {
        userName: userCredentials.username,
        email: cleanEmail,
        avatarUrl: userCredentials.avatarUrl || DEFAULT_AVATAR,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", user.uid), profile);
      // Send the verification email; the auth listener will show the verify gate.
      try { await sendEmailVerification(user); } catch (e) { console.warn("verify email send failed", e); }
      logAppEvent("sign_up", { method: "email" });
      setIsSignUpModalOpen(false);
    } catch (err) {
      pendingNavRef.current = null;
      if (err.code === "auth/email-already-in-use") {
        setSignUpError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setSignUpError("Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setSignUpError("Please enter a valid email address.");
      } else {
        setSignUpError("Sign up failed. Please try again.");
      }
    }
  };

  const handleLogin = async (data) => {
    setLoginError("");
    try {
      pendingNavRef.current = "/home"; // navigate after auth state confirms
      await signInWithEmailAndPassword(auth, (data.email || "").trim().toLowerCase(), data.password);
      logAppEvent("login", { method: "email" });
      setLoginData({ email: "", password: "" });
      setIsLoginModalOpen(false);
    } catch (err) {
      pendingNavRef.current = null;
      console.error("[Login error]", err.code, err.message);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setLoginError("Incorrect email or password.");
      } else if (err.code === "auth/invalid-email") {
        setLoginError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setLoginError("Too many failed attempts. Please wait a few minutes and try again, or reset your password.");
      } else if (err.code === "auth/network-request-failed") {
        setLoginError("Network error — check your internet connection and try again.");
      } else if (err.code === "auth/user-disabled") {
        setLoginError("This account has been disabled. Please contact support.");
      } else if (err.code === "auth/web-storage-unsupported") {
        setLoginError("Your browser is blocking storage. Please disable private/incognito mode or enable cookies and try again.");
      } else if (err.code === "auth/internal-error") {
        setLoginError("Authentication error. Try a different browser (e.g. Chrome) or disable private browsing mode.");
      } else {
        setLoginError(`Login failed (${err.code || "unknown"}). Try a different browser or check your connection.`);
      }
    }
  };

  // Send a password-reset email. Throws on error so the modal can react.
  const handleForgotPassword = async (email) => {
    await sendPasswordResetEmail(auth, (email || "").trim().toLowerCase());
  };

  // Called after user schedules a 14-day deletion — re-reads the profile so
  // the pending-deletion banner appears without forcing a full sign-out.
  const handleDeletionScheduled = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      const profile = snap.exists() ? snap.data() : {};
      setUserData((prev) => ({
        ...prev,
        pendingDeletion: profile.pendingDeletion || false,
        deletionDate: profile.deletionDate || null,
      }));
    } catch {
      /* non-fatal — banner will appear on next login */
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLoginData({ email: "", password: "" });
    setLoginError("");
    setSignUpError("");
    setSelectedTab("");
    setClosetItems([]);
    setIsLoginModalOpen(false);
    setIsSignUpModalOpen(false);
    setNeedsVerification(false);
    navigate("/");
  };

  // ── Email-verification gate actions ────────────────────────────────────────
  const handleResendVerification = async () => {
    if (!auth.currentUser || verifyBusy) return;
    setVerifyBusy(true);
    setVerifyMsg("");
    try {
      await sendEmailVerification(auth.currentUser);
      setVerifyMsg("✅ Verification email sent! Check your inbox (and spam folder).");
    } catch (e) {
      setVerifyMsg(
        e?.code === "auth/too-many-requests"
          ? "Please wait a minute before requesting another email."
          : "Couldn't send the email right now. Please try again shortly."
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!auth.currentUser || verifyBusy) return;
    setVerifyBusy(true);
    setVerifyMsg("");
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        // Pull profile, then grant access
        let profile = {};
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          profile = userDoc.exists() ? userDoc.data() : {};
        } catch {}
        flushSync(() => {
          setUserData({
            uid: auth.currentUser.uid,
            userName: profile.userName || auth.currentUser.displayName || "Your Closet",
            avatarUrl: profile.avatarUrl || auth.currentUser.photoURL || DEFAULT_AVATAR,
            email: auth.currentUser.email,
          });
          setNeedsVerification(false);
          setIsLoggedIn(true);
        });
        navigate("/home");
      } else {
        setVerifyMsg("Not verified yet. Click the link in your email, then try again.");
      }
    } catch {
      setVerifyMsg("Something went wrong. Please try again.");
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleVerifyCancel = async () => {
    try { await signOut(auth); } catch {}
    setNeedsVerification(false);
    setVerifyMsg("");
    navigate("/");
  };

  const handleSelectTab = useCallback(
    (tab) => {
      setSelectedTab(tab);
      fetchClosetItemsData(tab);
      if (location.pathname !== "/closet-data") {
        navigate("/closet-data");
      }
      if (typeof openSectionFn === "function") {
        openSectionFn(tab);
      }
    },
    [navigate, openSectionFn, location.pathname]
  );

  const handleUserUpdate = async (updatedUser) => {
    const merged = { ...userData, ...updatedUser };
    setUserData(merged);
    if (userData.uid) {
      await updateDoc(doc(db, "users", userData.uid), updatedUser);
    }
  };

  if (isLoading) {
    return (
      <div className="app app--loading">
        <p className="loading-message">Loading...</p>
      </div>
    );
  }

  // ── Email-verification gate screen ─────────────────────────────────────────
  if (needsVerification) {
    return (
      <div className="verify-gate">
        <div className="verify-gate__card">
          <div className="verify-gate__icon">📧</div>
          <h2 className="verify-gate__title">Verify your email</h2>
          <p className="verify-gate__text">
            We sent a verification link to{" "}
            <strong>{verifyEmail || "your email address"}</strong>.
            Please click the link in that email to activate your account, then
            choose <strong>"I've verified"</strong> below.
          </p>
          <p className="verify-gate__spam">
            📁 <strong>Don't see the email?</strong> Please check your{" "}
            <strong>spam / junk folder</strong> — verification emails sometimes
            land there.
          </p>
          {verifyMsg && <p className="verify-gate__msg">{verifyMsg}</p>}
          <div className="verify-gate__actions">
            <button
              className="verify-gate__btn verify-gate__btn--primary"
              onClick={handleCheckVerified}
              disabled={verifyBusy}
            >
              {verifyBusy ? "Checking…" : "I've verified — continue"}
            </button>
            <button
              className="verify-gate__btn"
              onClick={handleResendVerification}
              disabled={verifyBusy}
            >
              Resend verification email
            </button>
            <button
              className="verify-gate__btn verify-gate__btn--ghost"
              onClick={handleVerifyCancel}
              disabled={verifyBusy}
            >
              Cancel / use a different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClosetProvider>
      <BackgroundProvider>
      <TierProvider uid={isLoggedIn ? userData.uid : null}>
      <SyncProvider uid={isLoggedIn ? userData.uid : null}>
        <main className="app">
          {isLoggedIn && userData?.pendingDeletion && (
            <PendingDeletionBanner
              userData={userData}
              onCancelled={() =>
                setUserData((prev) => ({
                  ...prev,
                  pendingDeletion: false,
                  deletionDate: null,
                }))
              }
            />
          )}
          <Header
            userName={isLoggedIn ? userData.userName : "Your Closet"}
            avatarUrl={userData.avatarUrl}
            isLoggedIn={isLoggedIn}
            userData={userData}
            onUserUpdate={handleUserUpdate}
            onSignUpClick={() => setIsSignUpModalOpen(true)}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogoutClick={handleLogout}
            onDeletionScheduled={handleDeletionScheduled}
            handleSelectTab={handleSelectTab}
            selectedTab={selectedTab}
            closetItems={closetItems}
          />
          <section className="app__content">
            {apiError && <p className="error-message">{apiError}</p>}
            <React.Suspense fallback={<p className="loading-message">Loading…</p>}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Main isLoggedIn={isLoggedIn} />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/pricing" element={<Pricing isLoggedIn={isLoggedIn} />} />
              <Route path="/shared" element={<SharedView />} />
              <Route path="/auth-action" element={<AuthAction />} />

              {/* Protected routes — redirect + open login if not authenticated */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/closet-data"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <ClosetData
                      selectedTab={selectedTab}
                      isLoggedIn={isLoggedIn}
                      closetItems={closetItems}
                      userData={userData}
                      onUserUpdate={handleUserUpdate}
                      onRegisterOpenSection={(fn) => setOpenSectionFn(() => fn)}
                      onClearTab={() => setSelectedTab("")}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kids-closet"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <ProRoute><KidsCloset /></ProRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pet-closet"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <ProRoute><PetCloset /></ProRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/receipts"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <ProRoute><Receipts /></ProRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/outfit-card"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn} onLoginRequired={() => setIsLoginModalOpen(true)}>
                    <OutfitCardViewer />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound isLoggedIn={isLoggedIn} />} />
            </Routes>
            </React.Suspense>
          </section>
          <Footer />
          {isLoggedIn && (
            <React.Suspense fallback={null}>
              <WIMCAssistant />
            </React.Suspense>
          )}
          <CookieConsent />
          <CookiePreferences />
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
            onForgotPassword={handleForgotPassword}
          />
        </main>
      </SyncProvider>
      </TierProvider>
      </BackgroundProvider>
    </ClosetProvider>
  );
}

export default function App() {
  return <AppInner />;
}
