import React, { useState, useEffect, useRef } from "react";
import { uploadImage } from "../utils/CloudinaryAPI";
import "./Receipts.css";

const LS_KEY = "wimc_receipts";
const CATEGORIES = [
  "All",
  "Dresses/Skirts",
  "Shoes/Sneakers",
  "Pants/Jeans",
  "Tops",
  "Bags/Accessories",
  "Jackets/Coats",
  "Other",
];
const EMAIL_ADDRESS = "receipts@wimc-app.com"; // placeholder forward address

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function save(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export default function Receipts() {
  const [receipts, setReceipts] = useState(load);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [uploadType, setUploadType] = useState("photo"); // photo|pdf|email
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  // Add form
  const [form, setForm] = useState({
    store: "",
    amount: "",
    date: "",
    category: "Other",
    notes: "",
    fileUrl: "",
    fileType: "",
    fileName: "",
  });

  const photoRef = useRef(null);
  const pdfRef = useRef(null);

  useEffect(() => {
    save(receipts);
  }, [receipts]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      if (type === "pdf") {
        // Store PDF as raw — use image upload as fallback for preview
        const res = await uploadImage(file, "receipts");
        if (res?.secure_url) {
          setField("fileUrl", res.secure_url);
          setField("fileType", "pdf");
          setField("fileName", file.name);
        }
      } else {
        const res = await uploadImage(file, "receipts");
        if (res?.secure_url) {
          setField("fileUrl", res.secure_url);
          setField("fileType", "image");
          setField("fileName", file.name);
        }
      }
    } catch {
      setUploadErr("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Save receipt ──────────────────────────────────────────────────────────
  const handleSave = (e) => {
    e.preventDefault();
    if (!form.store.trim() && !form.fileUrl) {
      setUploadErr("Please add a store name or upload a receipt file.");
      return;
    }
    const newReceipt = {
      id: uid(),
      createdAt: new Date().toISOString(),
      store: form.store.trim(),
      amount: form.amount.trim(),
      date: form.date,
      category: form.category,
      notes: form.notes.trim(),
      fileUrl: form.fileUrl,
      fileType: form.fileType,
      fileName: form.fileName,
    };
    setReceipts((prev) => [newReceipt, ...prev]);
    setForm({
      store: "",
      amount: "",
      date: "",
      category: "Other",
      notes: "",
      fileUrl: "",
      fileType: "",
      fileName: "",
    });
    setUploadErr("");
    setIsAddOpen(false);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this receipt?")) return;
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = receipts.filter((r) => {
    const matchCat = filter === "All" || r.category === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.store.toLowerCase().includes(q) ||
      r.notes.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <main className="receipts-page">
      <header className="receipts-page__header">
        <div>
          <h1 className="receipts-page__title">🧾 Receipts</h1>
          <p className="receipts-page__sub">
            Store and manage your clothing purchase receipts.
          </p>
        </div>
        <button
          className="receipts-page__add-btn"
          onClick={() => setIsAddOpen(true)}
        >
          + Add Receipt
        </button>
      </header>

      {/* Email forward info */}
      <div className="receipts-email-tip">
        <span className="receipts-email-tip__icon">📧</span>
        <span>
          Forward email receipts to <strong>{EMAIL_ADDRESS}</strong> or
          screenshot and upload below.
        </span>
        <a className="receipts-email-tip__btn" href={`mailto:${EMAIL_ADDRESS}`}>
          Open Mail
        </a>
      </div>

      {/* Filter + search bar */}
      <div className="receipts-toolbar">
        <input
          className="receipts-toolbar__search"
          type="text"
          placeholder="🔍 Search receipts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="receipts-toolbar__cats">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`receipts-cat ${filter === c ? "is-active" : ""}`}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Receipt grid */}
      {visible.length === 0 ? (
        <div className="receipts-empty">
          <p>
            No receipts yet. Click <strong>+ Add Receipt</strong> to get
            started.
          </p>
        </div>
      ) : (
        <div className="receipts-grid">
          {visible.map((r) => (
            <div
              key={r.id}
              className="receipt-card"
              onClick={() => setViewReceipt(r)}
            >
              {/* Thumbnail */}
              <div className="receipt-card__thumb">
                {r.fileUrl && r.fileType === "image" ? (
                  <img
                    src={r.fileUrl}
                    alt={r.store || "receipt"}
                    className="receipt-card__img"
                  />
                ) : r.fileType === "pdf" ? (
                  <div className="receipt-card__pdf-icon">📄</div>
                ) : (
                  <div className="receipt-card__no-img">🧾</div>
                )}
              </div>
              {/* Info */}
              <div className="receipt-card__info">
                <p className="receipt-card__store">
                  {r.store || "Unknown Store"}
                </p>
                {r.amount && (
                  <p className="receipt-card__amount">${r.amount}</p>
                )}
                <p className="receipt-card__date">
                  {fmtDate(r.date || r.createdAt)}
                </p>
                <span className="receipt-card__cat">{r.category}</span>
              </div>
              {/* Delete */}
              <button
                className="receipt-card__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(r.id);
                }}
                aria-label="Delete receipt"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Receipt Modal ── */}
      {isAddOpen && (
        <>
          <div
            className="receipts-overlay"
            onClick={() => setIsAddOpen(false)}
          />
          <div
            className="receipts-modal"
            role="dialog"
            aria-label="Add Receipt"
          >
            <header className="receipts-modal__head">
              <h2 className="receipts-modal__title">Add Receipt</h2>
              <button
                className="receipts-modal__close"
                onClick={() => setIsAddOpen(false)}
              >
                ×
              </button>
            </header>

            <form className="receipts-modal__form" onSubmit={handleSave}>
              {/* Upload type toggle */}
              <div className="receipts-upload-toggle">
                {[
                  { val: "photo", label: "📷 Photo / Camera" },
                  { val: "pdf", label: "📄 PDF" },
                  { val: "email", label: "📧 Email Receipt" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    className={`receipts-upload-btn ${uploadType === val ? "is-active" : ""}`}
                    onClick={() => setUploadType(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Upload area */}
              {uploadType === "photo" && (
                <div
                  className="receipts-upload-area"
                  onClick={() => photoRef.current?.click()}
                >
                  {form.fileUrl ? (
                    <img
                      src={form.fileUrl}
                      alt="receipt"
                      className="receipts-upload-preview"
                    />
                  ) : (
                    <>
                      <p>📷 Tap to take a photo or choose from library</p>
                      <p className="receipts-upload-hint">
                        Supports JPG, PNG, HEIC, WebP
                      </p>
                    </>
                  )}
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e, "image")}
                  />
                </div>
              )}

              {uploadType === "pdf" && (
                <div
                  className="receipts-upload-area"
                  onClick={() => pdfRef.current?.click()}
                >
                  {form.fileName ? (
                    <p>📄 {form.fileName}</p>
                  ) : (
                    <>
                      <p>📄 Tap to select a PDF receipt</p>
                      <p className="receipts-upload-hint">Supports PDF files</p>
                    </>
                  )}
                  <input
                    ref={pdfRef}
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e, "pdf")}
                  />
                </div>
              )}

              {uploadType === "email" && (
                <div className="receipts-email-box">
                  <p>Forward your email receipt to:</p>
                  <strong className="receipts-email-addr">
                    {EMAIL_ADDRESS}
                  </strong>
                  <p className="receipts-upload-hint">
                    Or take a screenshot of the email and upload it using the
                    Photo option above.
                  </p>
                  <a
                    className="receipts-email-open"
                    href={`mailto:${EMAIL_ADDRESS}`}
                  >
                    📧 Open Mail App
                  </a>
                </div>
              )}

              {uploading && <p className="receipts-uploading">Uploading…</p>}
              {uploadErr && <p className="receipts-err">{uploadErr}</p>}

              {/* Metadata fields */}
              <div className="receipts-fields">
                <div className="receipts-field">
                  <label>Store / Retailer</label>
                  <input
                    className="receipts-input"
                    type="text"
                    placeholder="e.g. Zara, Amazon, Nordstrom"
                    value={form.store}
                    onChange={(e) => setField("store", e.target.value)}
                  />
                </div>
                <div className="receipts-field">
                  <label>Amount ($)</label>
                  <input
                    className="receipts-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                  />
                </div>
                <div className="receipts-field">
                  <label>Purchase Date</label>
                  <input
                    className="receipts-input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                  />
                </div>
                <div className="receipts-field">
                  <label>Category</label>
                  <select
                    className="receipts-input"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="receipts-field receipts-field--full">
                  <label>Notes</label>
                  <textarea
                    className="receipts-input receipts-textarea"
                    rows={2}
                    placeholder="e.g. Size 8, blue, on sale…"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                  />
                </div>
              </div>

              <div className="receipts-modal__footer">
                <button
                  type="button"
                  className="receipts-btn"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="receipts-btn receipts-btn--save"
                  disabled={uploading}
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── View Receipt Modal ── */}
      {viewReceipt && (
        <>
          <div
            className="receipts-overlay"
            onClick={() => setViewReceipt(null)}
          />
          <div
            className="receipts-modal receipts-modal--view"
            role="dialog"
            aria-label="View Receipt"
          >
            <header className="receipts-modal__head">
              <h2 className="receipts-modal__title">
                {viewReceipt.store || "Receipt"}
              </h2>
              <button
                className="receipts-modal__close"
                onClick={() => setViewReceipt(null)}
              >
                ×
              </button>
            </header>
            <div className="receipts-modal__view-body">
              {viewReceipt.fileUrl && viewReceipt.fileType === "image" && (
                <img
                  src={viewReceipt.fileUrl}
                  alt="receipt"
                  className="receipts-view-img"
                />
              )}
              {viewReceipt.fileType === "pdf" && (
                <a
                  href={viewReceipt.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="receipts-view-pdf"
                >
                  📄 Open PDF Receipt
                </a>
              )}
              <div className="receipts-view-meta">
                {viewReceipt.store && (
                  <div>
                    <strong>Store:</strong> {viewReceipt.store}
                  </div>
                )}
                {viewReceipt.amount && (
                  <div>
                    <strong>Amount:</strong> ${viewReceipt.amount}
                  </div>
                )}
                {viewReceipt.date && (
                  <div>
                    <strong>Date:</strong> {fmtDate(viewReceipt.date)}
                  </div>
                )}
                <div>
                  <strong>Category:</strong> {viewReceipt.category}
                </div>
                <div>
                  <strong>Added:</strong> {fmtDate(viewReceipt.createdAt)}
                </div>
                {viewReceipt.notes && (
                  <div>
                    <strong>Notes:</strong> {viewReceipt.notes}
                  </div>
                )}
              </div>
              <div className="receipts-view-actions">
                <button
                  className="receipts-btn"
                  onClick={() => setViewReceipt(null)}
                >
                  Close
                </button>
                <button
                  className="receipts-btn receipts-btn--delete"
                  onClick={() => {
                    handleDelete(viewReceipt.id);
                    setViewReceipt(null);
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
