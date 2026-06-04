import React, { useState, useEffect, useRef } from "react";
import MediaUploader from "../MediaUploader/MediaUploader";
import ImageUpload from "../ImageUpload/ImageUpload";
import { uploadImage } from "../../utils/CloudinaryAPI";
import "./AddClothingModal.css";

// function AddClothingModal({ isOpen, onClose, onClothingAdded }) {
// Default (female) section options — used when no `sections` prop is provided
const DEFAULT_SECTIONS = [
  { value: "dresses-skirts",   label: "Dresses/Skirts" },
  { value: "shoes-sneakers",   label: "Shoes/Sneakers" },
  { value: "pants-jeans",      label: "Pants/Jeans" },
  { value: "tops",             label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats",    label: "Jackets/Coats" },
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

  const handleSubmit = (e) => {
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

    // Validate media: accept either an uploaded image/video (preferred) or legacy imageUrl
    const hasMedia = media?.url || formData.imageUrl;
    if (!hasMedia) {
      setError("Please upload an image or video before submitting.");
      return;
    }

    // Build the item your app will use going forward (backward-compatible)
    const newItem = {
      name: formData.name,
      designer: formData.designer,
      size: formData.size,
      category: formData.category,

      // Preferred new fields:
      mediaType: media?.type || (formData.imageUrl ? "image" : "image"),
      mediaUrl: media?.url || formData.imageUrl || "",
      mediaThumb: media?.thumb || "",
      mediaPoster: media?.poster || "",

      // Legacy field (kept just in case other parts of the app still read it)
      imageUrl: formData.imageUrl || "",
    };

    onClothingAdded(newItem);

    // reset
    setFormData({
      name: "",
      designer: "",
      size: "",
      category: "",
      imageUrl: "",
    });
    setMedia(null);
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

  // Mobile-proof web add: paste an image link; Cloudinary fetches it server-side.
  const handleAddFromUrl = async () => {
    const u = webUrl.trim();
    if (!u) { setError("Paste an image link first."); return; }
    if (!/^https?:\/\//i.test(u)) {
      setError("Enter a valid image URL (it should start with http).");
      return;
    }
    setError("");
    setWebBusy(true);
    try {
      const res = await uploadImage(u, tag);
      if (res?.secure_url) {
        handleMediaUploaded({ type: "image", url: res.secure_url, thumb: res.secure_url });
        setWebUrl("");
      } else {
        setError("Couldn't fetch that image. The site may block it — try a screenshot via 'From device'.");
      }
    } catch {
      setError("Couldn't fetch that image. The site may block it — try a screenshot via 'From device'.");
    } finally {
      setWebBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <section className="modal-overlay" onClick={handleOverlayClick}>
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
          {/* Upload source toggle */}
          <div className="modal__segmented">
            <button
              type="button"
              className={`segmented__btn ${
                source === "device" ? "is-active" : ""
              }`}
              onClick={() => setSource("device")}
            >
              From device (image/video)
            </button>
            <button
              type="button"
              className={`segmented__btn ${
                source === "web" ? "is-active" : ""
              }`}
              onClick={() => setSource("web")}
            >
              Web search (image)
            </button>
          </div>
          <label htmlFor="name">Item Name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Item Name"
            value={formData.name}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="designer">Designer</label>
          <input
            id="designer"
            type="text"
            name="designer"
            placeholder="Designer"
            value={formData.designer}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="size">Size</label>
          <input
            id="size"
            type="text"
            name="size"
            placeholder="Size"
            value={formData.size}
            onChange={handleChange}
            className="modal__input"
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

          {source === "device" ? (
            <MediaUploader tag={tag} onUploaded={handleMediaUploaded} />
          ) : (
            <div className="modal__web">
              <ImageUpload
                folder="closet-items"
                tag={tag}
                onUploadSuccess={handleImageUploadSuccess}
              />
              <div className="modal__web-divider">— or paste an image link —</div>
              <div className="modal__web-url">
                <input
                  type="url"
                  className="modal__input"
                  placeholder="Paste an image link (works on phone)"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="modal__web-url-btn"
                  onClick={handleAddFromUrl}
                  disabled={webBusy}
                >
                  {webBusy ? "Adding…" : "Add link"}
                </button>
              </div>
              <p className="modal__web-hint">
                📱 On a phone? From Unsplash, long-press the image → "Copy image
                address", then paste it here.
              </p>
            </div>
          )}

          {/* Preview of the selected/added web image */}
          {source === "web" && (media?.url || formData.imageUrl) && (
            <img
              className="modal__web-preview"
              src={media?.thumb || media?.url || formData.imageUrl}
              alt="Selected item"
            />
          )}
          {error && <p className="modal__error">{error}</p>}

          <button type="submit" className="modal__submit">
            Add Item
          </button>
        </form>
      </div>
    </section>
  );
}

export default AddClothingModal;
