import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// The marketing site — fallback destination when we know the visit came
// from outside (via the "?src=web" marker) but don't have an actual
// referrer URL to send them back to (see below).
const MARKETING_SITE_URL = "https://www.gingerfaith.com";

// Standalone pages (Contact, FAQ, Privacy Policy, Terms, Pricing) render
// their "X" close button as navigate(-1) — which does nothing if there's no
// history entry to go back to, e.g. arriving from an external link (the
// marketing site's own Contact Us link) or opening in a fresh tab.
//
// A visitor who arrived from an external site expects "X" to take them
// back to THAT site, not into the WIMC app — landing on the app's own home
// screen after clicking a Contact link on gingerfaith.com would be
// surprising. document.referrer normally tells us this, but many browsers
// strip it entirely on cross-site navigation (privacy modes, some
// defaults, especially with target="_blank") — so a "?src=web" marker on
// the outbound link is a second, deterministic signal: if present, we know
// the visit was external even when referrer came back empty, and fall
// back to the known marketing site URL instead of guessing.
//
// IMPORTANT: leaving via window.location.href = externalUrl, while running
// as an installed PWA (WIMC added to desktop/taskbar), gets intercepted by
// Chrome as an "out of scope" navigation — it pops the external site into
// a small window still wearing the WIMC app's own shell/title bar instead
// of a normal browser tab, which looks broken (app chrome around someone
// else's site). window.open(url, "_blank") forces a genuinely separate,
// normal top-level tab instead, sidestepping that PWA-scope behavior.
// Since this app window itself was opened via a target="_blank" link
// (functionally equivalent to window.open), window.close() is allowed to
// close it afterward — browsers only block closing windows a script didn't
// open, and if it's blocked anyway it just silently no-ops, which is fine.
//
// Otherwise, fall back to "/" (always valid in-app destination — App.js's
// root route already redirects a logged-in user straight to /home). Also
// wires up Escape to the same handler, since these pages read as
// modal-like overlays.
export default function useCloseStandalonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => {
    const leaveTo = (url) => {
      window.open(url, "_blank", "noopener");
      window.close();
    };
    const referrer = document.referrer;
    if (referrer) {
      try {
        const referrerOrigin = new URL(referrer).origin;
        if (referrerOrigin !== window.location.origin) {
          leaveTo(referrer);
          return;
        }
      } catch {
        // Malformed referrer — fall through below.
      }
    }
    if (new URLSearchParams(location.search).get("src") === "web") {
      leaveTo(MARKETING_SITE_URL);
      return;
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
