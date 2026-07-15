import React, { useRef, useState } from "react";
import { scopedTag } from "../../utils/CloudinaryAPI";
import "./ImageUpload.css";

// Default sources — restores the full set the widget had before, including the
// stock-image SEARCH providers (Unsplash, Shutterstock, Getty Images, iStock),
// plus device, camera, web address (url), and cloud drives.
// Note: "image_search" (full-web Google search) is intentionally excluded — it
// requires a Google Custom Search API key. Add it back here + pass googleApiKey
// once that key is configured.
const DEFAULT_SOURCES = [
  "local",
  "camera",
  "url",
  "unsplash",
  "shutterstock",
  "gettyimages",
  "istock",
  "google_drive",
  "dropbox",
];

const ImageUpload = ({ folder, tag, onUploadSuccess, sources }) => {
  // Under a slow connection the widget's iframe can take 30s+ to actually
  // paint, and with no feedback in that window a user re-clicking "Upload
  // Image" was creating a second overlapping widget instance each time.
  // Disable the button from click until the widget confirms it's on screen
  // (its own "display" event) — with a timeout fallback so a widget that
  // never fires "display" (network genuinely dead) doesn't leave the button
  // stuck disabled forever.
  const [opening, setOpening] = useState(false);
  const timeoutRef = useRef(null);

  const handleUpload = () => {
    if (opening) return;
    if (!folder || !tag) {
      console.error("Folder or tag is missing for the upload widget.");
      return;
    }

    setOpening(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpening(false), 15000);

    // A fresh widget every open — NOT reused across calls. An earlier
    // version cached one widget instance for the component's lifetime as a
    // perf optimization, but its `tags` config (built from the current
    // `tag`/`folder` props) got captured once at creation and never
    // updated — every later upload through that stale cached widget kept
    // using whatever category was selected the FIRST time, regardless of
    // what the user actually picked afterward (reproduced: an item picked
    // for "Dresses" landed tagged "uncategorized" instead). The category
    // dropdown can change between opens, so the widget's tag config must
    // be rebuilt every time too.
    const widgetConfig = {
      cloudName: process.env.REACT_APP_CLOUD_NAME,
      uploadPreset: process.env.REACT_APP_UPLOAD_PRESET,
      folder,
      // Scoped the same way every other upload path in the app is (see
      // CloudinaryAPI.js) — this widget bypasses uploadImage() entirely, so
      // it needs its own explicit scoping or every photo added through
      // "web search"/URL/cloud-drive lands under a bare, unscoped tag:
      // invisible to this user's own fetches (which always query the
      // scoped tag) AND visible to every other user querying that same
      // bare tag — the exact cross-account leak this app already fixed
      // everywhere else.
      tags: [scopedTag(tag)],
      // Explicit sources so "Search the web" (image_search) is always offered
      // alongside the URL/web-address option. Callers can still override.
      sources: sources || DEFAULT_SOURCES,
      // Skip the crop/adjust step entirely — on phone screens its format/size
      // controls sit below the fold under the preview image, requiring a
      // pinch/scroll to find the confirm button. We don't need forced
      // cropping for closet photos, so removing the step avoids the
      // confusion rather than trying to restyle Cloudinary's own widget UI.
      cropping: false,
      showSkipCropButton: true,
    };

    const widget = window.cloudinary.createUploadWidget(
      widgetConfig,
      (error, result) => {
        if (error) {
          console.error("Upload Widget Error:", error);
          setOpening(false);
          return;
        }
        if (result.event === "display") {
          clearTimeout(timeoutRef.current);
          setOpening(false);
        }
        if (result.event === "success") {
          console.log("Upload Success:", result.info);
          onUploadSuccess(result.info);
        }
        if (result.event === "close") {
          setOpening(false);
        }
      }
    );

    widget.open();
  };

  return (
    <section className="image-upload" aria-label="Image Upload Section">
      <button
        className="image-upload__button"
        onClick={handleUpload}
        disabled={opening}
        aria-label="Click to upload an image"
      >
        {opening ? "Opening…" : "Upload Image"}
      </button>
    </section>
  );
};

export default ImageUpload;
