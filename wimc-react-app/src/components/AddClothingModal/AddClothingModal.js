import React, { useState, useEffect, useRef } from "react";
import MediaUploader from "../MediaUploader/MediaUploader";
import ImageUpload from "../ImageUpload/ImageUpload";
import { uploadImage } from "../../utils/CloudinaryAPI";
import "./AddClothingModal.css";

// function AddClothingModal({ isOpen, onClose, onClothingAdded }) {
// Default (female) section options — used when no `sections` prop is provided
const DEFAULT_SECTIONS = [
  { value: "dresses-skirts",     label: "Dresses/Skirts" },
  { value: "dress-shirts-suits", label: "Dress Shirts/Suits" },
  { value: "shoes-sneakers",     label: "Shoes/Sneakers" },
  { value: "pants-jeans",        label: "Pants/Jeans" },
  { value: "tops",               label: "Tops" },
  { value: "bags-accessories",   label: "Bags/Accessories" },
  { value: "jackets-coats",      label: "Jackets/Coats" },
  { value: "blazers",            label: "Blazers" },
];

function AddClothingModal({
  isOpen,
  onClose,
  onClothingAdded,
  initialCategory,
  // tagPrefix — e.g. "kid-abc123". When set, the final upload tag is
  //   `${tagPrefix}-${formData.category}` so each child's section stays isolated.
  // uploadTag  — legacy fixed override (kept for backward-compat; tagPrefix wins).
  tagPrefix,
  uploadTag,
  // sections — gender-aware [{ value, label }] so the category dropdown matches
  //   the closet's actual section cards (male vs female, kids vs main).
  sections,
}) {
  const categoryOptions = (sections && sections.length) ? sections : DEFAULT_SECTIONS;
  const [formData, setFormData] = useState({
    name: "",
    designer: "",
    size: "",
    category: "",
    imageUrl: "", // keep for backward-compat with anything expecting it
  });

  const [source, setSource] = useState("device"); // "device" | "web"
  const [webUrl, setWebUrl] = useState("");
  const [webBusy, setWebBusy] = useState(false);

  // NEW: media state (image or video)
  const [media, setMedia] = useState(null); // { type, url, thumb?, poster?, __raw? }
  const [error, setError] = useState("");

  const modalRef = useRef(null);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUploadSuccess = (result) => {
    // your ImageUpload returns Cloudinary result with secure_url
    setFormData((prev) => ({ ...prev, imageUrl: result.secure_url }));
    // clear media so we don't accidentally treat this as video
    setMedia(null);
    setError("");
  };

  // NEW: called by MediaUploader
  const handleMediaUploaded = (payload) => {
    // payload: { type: "image"|"video", url, thumb?, poster?, __raw? }
    setMedia(payload);
    // Preserve legacy imageUrl for any existing code that might still read it:
    if (payload.type === "image") {
      setFormData((prev) => ({
        ...prev,
        imageUrl: payload.thumb || payload.url,
      }));
    } else {
      // if video, we don't set imageUrl; card/grid should use mediaType/mediaUrl
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
    }
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.designer ||
      !formData.size ||
      !formData.category
    ) {
      setError("Please fill in all fields.");
      return;
    }

    // Resolve the media. For the "Paste URL" option, convert the link into a
    // stored Cloudinary image right now (server-side fetch) so the user just
    // pastes + clicks Add Item.
    let resolvedMedia = media;
    let resolvedImageUrl = formData.imageUrl;

    if (source === "url" && !resolvedMedia?.url && !resolvedImageUrl) {
      const u = webUrl.trim();
      if (!u) { setError("Paste an image link first."); return; }
      if (!/^https?:\/\//i.test(u)) {
        setError("Enter a valid image URL (it should start with http).");
        return;
      }
      setWebBusy(true);
      setError("");
      try {
        const res = await uploadImage(u, tag);
        if (res?.secure_url) {
          resolvedMedia = { type: "image", url: res.secure_url, thumb: res.secure_url };
          resolvedImageUrl = res.secure_url;
        } else {
          setError("Couldn't fetch that image. The site may block it — try a screenshot via 'From device'.");
          return;
        }
      } catch {
        setError("Couldn't fetch that image. The site may block it — try a screenshot via 'From device'.");
        return;
      } finally {
        setWebBusy(false);
      }
    }

    const hasMedia = resolvedMedia?.url || resolvedImageUrl;
    if (!hasMedia) {
      setError("Please add an image or video before submitting.");
      return;
    }

    // Build the item your app will use going forward (backward-compatible)
    const newItem = {
      name: formData.name,
      designer: formData.designer,
      size: formData.size,
      category: formData.category,
      mediaType: resolvedMedia?.type || "image",
      mediaUrl: resolvedMedia?.url || resolvedImageUrl || "",
      mediaThumb: resolvedMedia?.thumb || "",
      mediaPoster: resolvedMedia?.poster || "",
      imageUrl: resolvedImageUrl || "",
    };

    onClothingAdded(newItem);

    // reset
    setFormData({ name: "", designer: "", size: "", category: "", imageUrl: "" });
    setMedia(null);
    setWebUrl("");
    setError("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        designer: "",
        size: "",
        category: "",
        imageUrl: "",
      });
      setMedia(null);
      setError("");
      setWebUrl("");
      setWebBusy(false);
      setSource("device");
    }

    if (isOpen && initialCategory) {
      setFormData((p) => ({ ...p, category: initialCategory }));
    }

    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  // Build the Cloudinary tag used for this upload.
  // Priority: tagPrefix → uploadTag (legacy) → plain category
  //
  // • tagPrefix="kid-abc123" + category="tops"  → "kid-abc123-tops"
  //   This means changing the category dropdown re-routes the upload to the
  //   correct kids-closet section automatically.
  // • uploadTag (legacy fixed string) — still honoured for back-compat.
  // • Fallback: plain category value (main closet).
  const category = formData.category?.trim().toLowerCase() || "";
  const tag = tagPrefix && category
    ? `${tagPrefix}-${category}`
    : uploadTag
    || category
    || "uncategorized";

  if (!isOpen) return null;

  return (
    <section className="modal-overlay add-clothing-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 className="modal__title">Add New Clothing Item</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close Modal"
          >
            ✕
          </button>
        </header>

        <form className="modal__form" onSubmit={handleSubmit}>
          {/* Optional alternative sources — device uploader is always visible below */}
          <div className="modal__segmented">
            {/* Hidden on phone screens (see .segmented__btn--websearch's media
                query) — it opens Cloudinary's own third-party Upload Widget,
                whose internal close/confirm buttons we don't control the
                layout of and land under the notch/status bar on real
                devices. Paste URL already covers "get an image from the
                web" with our own fully-controlled UI. */}
            <button
              type="button"
              className={`segmented__btn segmented__btn--websearch ${source === "web" ? "is-active" : ""}`}
              onClick={() => setSource(source === "web" ? "device" : "web")}
            >
              Web search (image)
            </button>
            <button
              type="button"
              className={`segmented__btn ${source === "url" ? "is-active" : ""}`}
              onClick={() => setSource(source === "url" ? "device" : "url")}
            >
              Paste URL
            </button>
          </div>
          <label htmlFor="name">Item Name</label>
          <input
            id="name"
            type="text"
            /* Not "name" — browsers key their own "previously typed values"
               suggestion list off the name/id attribute, and several
               (confirmed on real device testing) still show that history
               even with autocomplete="off" set. A field name/id that was
               never used before (and never will be reused elsewhere) means
               there's nothing in the browser's memory to match against,
               regardless of autocomplete-off support. onChange sets the
               formData.name key explicitly since it's no longer derived
               from e.target.name. */
            name="wimc-item-name-nofill"
            placeholder="Item Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="modal__input"
            autoComplete="off"
            required
          />

          <label htmlFor="designer">Designer</label>
          <input
            id="designer"
            type="text"
            name="wimc-item-designer-nofill"
            placeholder="Designer"
            value={formData.designer}
            onChange={(e) => setFormData((prev) => ({ ...prev, designer: e.target.value }))}
            className="modal__input"
            autoComplete="off"
            required
          />

          <label htmlFor="size">Size</label>
          <input
            id="size"
            type="text"
            name="wimc-item-size-nofill"
            placeholder="Size"
            value={formData.size}
            onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
            className="modal__input"
            autoComplete="off"
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="modal__select"
            required
          >
            <option value="">Select Category</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* From Device — always visible */}
          <>
            <p className="modal__source-label">📁 From Device</p>
            <MediaUploader tag={tag} onUploaded={handleMediaUploaded} />
            <p className="modal__device-note">
              📱 <strong>On a phone?</strong> Tap <em>Choose File</em> /
              <em> My Files</em> and you'll get <strong>Take Photo or Video</strong>{" "}
              (camera), <strong>Photo Library</strong>, and{" "}
              <strong>Choose Files</strong> — so you can snap a new photo or
              pick an existing one.
            </p>
          </>

          {source === "web" && (
            <ImageUpload
              folder="closet-items"
              tag={tag}
              onUploadSuccess={handleImageUploadSuccess}
            />
          )}

          {source === "url" && (
            <div className="modal__web">
              <input
                type="url"
                className="modal__input"
                placeholder="Paste an image link (e.g. https://…/photo.jpg)"
                value={webUrl}
                onChange={(e) => { setWebUrl(e.target.value); setError(""); }}
                autoComplete="off"
              />
              <div className="modal__web-note">
                <p>
                  <strong>How to get the image link:</strong> right-click the
                  image (on phone, long-press) → <strong>"Copy image address"</strong>,
                  then paste it here. Use the <em>image</em> link, not the page
                  address.
                </p>
                <p>
                  ✅ <strong>Your image is saved permanently.</strong> WIMC stores
                  its own copy, so it stays on your closet card even if the
                  retailer later removes the photo or takes the page down.
                </p>
                <p>
                  Then fill in the details and tap <strong>Add Item</strong> —
                  the image is fetched and saved automatically.
                </p>
              </div>
            </div>
          )}

          {/* Preview of the selected/added image (web search or pasted URL) */}
          {(source === "web" || source === "url") && (media?.url || formData.imageUrl) && (
            <img
              className="modal__web-preview"
              src={media?.thumb || media?.url || formData.imageUrl}
              alt="Selected item"
            />
          )}
          {error && <p className="modal__error">{error}</p>}

          <button type="submit" className="modal__submit" disabled={webBusy}>
            {webBusy ? "Adding…" : "Add Item"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AddClothingModal;
