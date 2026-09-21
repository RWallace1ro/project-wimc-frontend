import React, { useEffect, useState } from "react";
import { reloadFresh } from "../../utils/versionCheck";
import "./UpdateBanner.css";

// Shows the "new version" bar. Two independent detectors can raise it:
//  • "wimc-sw-update"        — the service worker found a new deploy (browsers
//                             and installed web apps; src/index.js).
//  • "wimc-update-available" — the version watcher noticed a newer deploy
//                             (src/utils/versionCheck.js). This is the one that
//                             works inside the iPhone/Android app wrapper, which
//                             has no service worker — so without it a fix only
//                             appeared after the user force-quit the app.
// Either one is enough; both raising it is harmless.
//
// This is only a page refresh of the same website the app always loads — it
// never downloads or installs anything, and has nothing to do with App Store
// updates of the app itself.
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("wimc-sw-update", handler);
    window.addEventListener("wimc-update-available", handler);
    return () => {
      window.removeEventListener("wimc-sw-update", handler);
      window.removeEventListener("wimc-update-available", handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">A new version of WIMC is available.</span>
      <button
        type="button"
        className="update-banner__btn"
        onClick={() => reloadFresh(window)}
      >
        Refresh
      </button>
    </div>
  );
}
