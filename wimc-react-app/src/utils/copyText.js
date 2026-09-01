// copyText — plain clipboard copy with a fallback for older/restricted
// WebViews where navigator.clipboard isn't available. Used for the native
// app's "subscribe/manage on the web" hints, where we deliberately show
// plain (non-tappable) text instead of a live external link — a copy
// button lets the user grab the URL without needing to remember or
// hand-type it, without opening/navigating anywhere from inside the app.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
