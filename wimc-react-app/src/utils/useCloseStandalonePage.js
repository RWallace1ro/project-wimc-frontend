import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Standalone pages (Contact, FAQ, Privacy Policy, Terms, Pricing) render
// their "X" close button as navigate(-1) — which does nothing if there's no
// history entry to go back to, e.g. arriving from an external link (the
// marketing site's own Contact Us link) or opening in a fresh tab.
//
// A visitor who arrived from an external site (document.referrer on a
// different origin) expects "X" to take them back to THAT site, not into
// the WIMC app — landing on the app's own home screen after clicking a
// Contact link on gingerfaith.com would be surprising. So: if the referrer
// is a different origin, send them back there; otherwise fall back to "/"
// (always valid in-app destination — App.js's root route already redirects
// a logged-in user straight to /home). Also wires up Escape to the same
// handler, since these pages read as modal-like overlays.
export default function useCloseStandalonePage() {
  const navigate = useNavigate();
  const close = () => {
    const referrer = document.referrer;
    if (referrer) {
      try {
        const referrerOrigin = new URL(referrer).origin;
        if (referrerOrigin !== window.location.origin) {
          window.location.href = referrer;
          return;
        }
      } catch {
        // Malformed referrer — fall through to the in-app fallback.
      }
    }
    navigate("/");
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return close;
}
