import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Standalone pages (Contact, FAQ, Privacy Policy, Terms, Pricing) render
// their "X" close button as navigate(-1) — which does nothing if there's no
// history entry to go back to, e.g. arriving from an external link (the
// marketing site's own Contact Us link) or opening in a fresh tab. Navigate
// to "/" instead: it's always a valid destination, and App.js's own root
// route already redirects a logged-in user straight to /home, so this is
// correct for both logged-in and logged-out visitors. Also wires up Escape
// to the same handler, since these pages read as modal-like overlays.
export default function useCloseStandalonePage() {
  const navigate = useNavigate();
  const close = () => navigate("/");

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
