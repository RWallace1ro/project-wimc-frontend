import React, { useEffect, useState } from "react";
import "./UpdateBanner.css";

// Listens for the "wimc-sw-update" event dispatched from src/index.js when
// the service worker detects a new deployed version. Gives the user an
// explicit way to pick up the update — critical on iOS, which has no native
// "reload to update" prompt for installed/standalone PWAs at all.
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("wimc-sw-update", handler);
    return () => window.removeEventListener("wimc-sw-update", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">A new version of WIMC is available.</span>
      <button
        type="button"
        className="update-banner__btn"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>
  );
}
