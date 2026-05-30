import { syncSetItem, syncRemoveItem } from '../utils/syncStore';
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadReceipt, uploadRawJSON } from "../utils/CloudinaryAPI";
import { shareItemImage, shareAppLink } from "../utils/shareUtils";
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

const RETURN_FILTERS = ["All Purchases", "Returned", "Not Returned"];

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
    syncSetItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export default function Receipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState(load);
  const [filter, setFilter] = useState("All");
  const [returnFilter, setReturnFilter] = useState("All Purchases");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [uploadType, setUploadType] = useState("photo"); // photo|pdf
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [actionToast, setActionToast] = useState(""); // feedback message
  const [downloading, setDownloading] = useState(false);
  const [receiptShareNote, setReceiptShareNote] = useState("");
  const [showSync, setShowSync] = useState(false);
  const [syncUrl, setSyncUrl] = useState("");
  const [restoreUrl, setRestoreUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Add form
  const [form, setForm] = useState({
    store: "",
    amount: "",
    date: "",
    category: "Other",
    notes: "",
    isGift: false,
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
      const res = await uploadReceipt(file);
      if (res?.secure_url) {
        setField("fileUrl", res.secure_url);
        setField("fileType", type === "pdf" ? "pdf" : "image");
        setField("fileName", file.name);
      } else {
        setUploadErr("Upload failed. Please try again.");
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
      isGift: form.isGift,
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
      isGift: false,
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

  // ── Edit receipt ──────────────────────────────────────────────────────────
  const startEdit = (receipt) => {
    setEditForm({
      store: receipt.store || "",
      amount: receipt.amount || "",
      date: receipt.date || "",
      category: receipt.category || "Other",
      notes: receipt.notes || "",
      isGift: receipt.isGift || false,
      fileUrl: receipt.fileUrl || "",
      fileType: receipt.fileType || "",
      fileName: receipt.fileName || "",
    });
    setIsEditing(true);
  };

  const setEditField = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const handleSaveEdit = () => {
    if (!editForm.store.trim() && !editForm.fileUrl) {
      showToast("Please add a store name or upload a receipt file.");
      return;
    }
    const updated = {
      ...viewReceipt,
      store: editForm.store.trim(),
      amount: editForm.amount.trim(),
      date: editForm.date,
      category: editForm.category,
      notes: editForm.notes.trim(),
      isGift: editForm.isGift,
      fileUrl: editForm.fileUrl,
      fileType: editForm.fileType,
      fileName: editForm.fileName,
    };
    setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setViewReceipt(updated);
    setIsEditing(false);
    showToast("✅ Receipt updated!");
  };

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(""), 2800);
  };

  // ── Download receipt file ─────────────────────────────────────────────────
  const handleDownload = async (receipt) => {
    if (!receipt.fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(receipt.fileUrl);
      const blob = await res.blob();
      const ext = receipt.fileType === "pdf" ? "pdf" : blob.type.includes("png") ? "png" : "jpg";
      const fileName = `receipt-${receipt.store || "wimc"}-${fmtDate(receipt.date || receipt.createdAt).replace(/\//g, "-")}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✅ Download started!");
    } catch {
      showToast("❌ Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Share receipt as text (view only — always available) ─────────────────
  const handleShareViewOnly = async (receipt) => {
    const title = `Receipt — ${receipt.store || "WIMC"}`;
    const text = [
      receipt.store    && `Store: ${receipt.store}`,
      receipt.amount   && `Amount: $${receipt.amount}`,
      receipt.date     && `Date: ${fmtDate(receipt.date)}`,
      receipt.category && `Category: ${receipt.category}`,
      receipt.notes    && `Notes: ${receipt.notes}`,
      receipt.returned && `Status: Returned${receipt.returnedDate ? " on " + fmtDate(receipt.returnedDate) : ""}`,
      receiptShareNote && `\n📝 ${receiptShareNote}`,
      receipt.fileUrl  && `\nView receipt: ${receipt.fileUrl}`,
    ].filter(Boolean).join("\n");

    const result = await shareAppLink({ title, text, url: receipt.fileUrl || window.location.href });
    if (result === "shared-url" || result === "shared") {
      showToast("✅ Receipt shared!");
    } else if (result === "clipboard") {
      showToast("📋 Details copied to clipboard!");
    } else if (result !== "aborted") {
      showToast("❌ Sharing not supported on this device.");
    }
  };

  // ── Share receipt file ─────────────────────────────────────────────────────
  const handleShare = async (receipt) => {
    if (!receipt.fileUrl) {
      showToast("No file to share.");
      return;
    }
    const title = `Receipt — ${receipt.store || "WIMC"}`;
    const text = [
      receipt.store && `Store: ${receipt.store}`,
      receipt.amount && `Amount: $${receipt.amount}`,
      receipt.date && `Date: ${fmtDate(receipt.date)}`,
      receipt.notes && `Notes: ${receipt.notes}`,
      receiptShareNote && `📝 ${receiptShareNote}`,
    ].filter(Boolean).join("\n");

    let result;
    if (receipt.fileType === "image") {
      result = await shareItemImage(receipt.fileUrl, { title, text });
    } else {
      result = await shareAppLink({ title, text, url: receipt.fileUrl });
    }
    if (result === "shared-file" || result === "shared-url" || result === "shared") {
      showToast("✅ Receipt shared!");
    } else if (result === "clipboard") {
      showToast("📋 Link copied to clipboard!");
    } else if (result !== "aborted") {
      showToast("❌ Sharing not supported on this device.");
    }
  };

  // ── Email receipt ─────────────────────────────────────────────────────────
  const handleEmail = (receipt) => {
    const subject = encodeURIComponent(`Receipt — ${receipt.store || "Purchase"}`);
    const lines = [
      receipt.store    && `Store: ${receipt.store}`,
      receipt.amount   && `Amount: $${receipt.amount}`,
      receipt.date     && `Date: ${fmtDate(receipt.date)}`,
      receipt.category && `Category: ${receipt.category}`,
      receipt.notes    && `Notes: ${receipt.notes}`,
      receipt.returned && `Status: Returned${receipt.returnedDate ? " on " + fmtDate(receipt.returnedDate) : ""}`,
      receiptShareNote && `\n📝 ${receiptShareNote}`,
      receipt.fileUrl  && `\nView receipt: ${receipt.fileUrl}`,
    ].filter(Boolean).join("\n");
    const body = encodeURIComponent(lines);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleToggleReturn = (id) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nowReturned = !r.returned;
        return {
          ...r,
          returned: nowReturned,
          returnedDate: nowReturned ? new Date().toISOString() : null,
        };
      })
    );
  };

  // ── Backup / Restore (cross-device sync) ─────────────────────────────────
  const handleBackup = async () => {
    if (!receipts.length) {
      setSyncMsg("❌ No receipts to back up.");
      return;
    }
    setSyncing(true);
    setSyncMsg("");
    try {
      const payload = {
        kind: "wimc.receipts",
        version: 1,
        createdAt: new Date().toISOString(),
        receipts,
      };
      const res = await uploadRawJSON(payload, "wimc/receipts");
      if (res?.secure_url) {
        setSyncUrl(res.secure_url);
        setSyncMsg("✅ Backup saved! Copy the link below and open it on your other device.");
      } else {
        setSyncMsg("❌ Backup failed. Please try again.");
      }
    } catch {
      setSyncMsg("❌ Backup failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreUrl.trim()) return;
    setRestoring(true);
    setSyncMsg("");
    try {
      const res = await fetch(restoreUrl.trim());
      const data = await res.json();
      if (data?.kind !== "wimc.receipts" || !Array.isArray(data.receipts)) {
        setSyncMsg("❌ Invalid backup link. Please use a link generated by the Backup button.");
        return;
      }
      // Merge: keep existing receipts not in backup, add all from backup
      setReceipts((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newOnes = data.receipts.filter((r) => !existingIds.has(r.id));
        return [...data.receipts, ...prev.filter((r) =>
          !data.receipts.find((br) => br.id === r.id)
        )];
      });
      setSyncMsg(`✅ Restored ${data.receipts.length} receipt(s) from backup.`);
      setRestoreUrl("");
    } catch {
      setSyncMsg("❌ Could not load backup. Check the link and try again.");
    } finally {
      setRestoring(false);
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = receipts.filter((r) => {
    const matchCat = filter === "All" || r.category === filter;
    const matchReturn =
      returnFilter === "All Purchases" ||
      (returnFilter === "Returned" && r.returned) ||
      (returnFilter === "Not Returned" && !r.returned);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.store || "").toLowerCase().includes(q) ||
      (r.notes || "").toLowerCase().includes(q) ||
      (r.category || "").toLowerCase().includes(q);
    return matchCat && matchReturn && matchSearch;
  });

  return (
    <main className="receipts-page">
      <header className="receipts-page__header">
        <div className="receipts-page__header-left">
          <button
            className="receipts-page__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Back to home"
          >
            ← Back
          </button>
          <div>
            <h1 className="receipts-page__title">🧾 Receipts</h1>
            <p className="receipts-page__sub">
              Store and manage your clothing purchase receipts.
            </p>
          </div>
        </div>
        <div className="receipts-page__header-actions">
          <button
            className="receipts-page__sync-btn"
            onClick={() => { setShowSync((v) => !v); setSyncMsg(""); setSyncUrl(""); }}
            title="Backup & Restore receipts across devices"
          >
            ☁️ Sync
          </button>
          <button
            className="receipts-page__add-btn"
            onClick={() => setIsAddOpen(true)}
          >
            + Add Receipt
          </button>
        </div>
      </header>

      {/* How to add receipts */}
      <div className="receipts-email-tip">
        <span className="receipts-email-tip__icon">🧾</span>
        <span>
          <strong>How to save receipts:</strong> Take a photo or screenshot of
          your receipt, or save it as a PDF, then tap <strong>+ Add Receipt</strong> to upload.
          Receipt files are securely stored and accessible from this page.
        </span>
      </div>

      {/* ── Sync panel ── */}
      {showSync && (
        <div className="receipts-sync-panel">
          <h3 className="receipts-sync-panel__title">☁️ Sync Receipts Across Devices</h3>
          <p className="receipts-sync-panel__note">
            Receipts are saved on this device only. Use <strong>Backup</strong> to upload them to the cloud and get a link, then use <strong>Restore</strong> on your other device to load them.
          </p>
          <div className="receipts-sync-row">
            <button
              className="receipts-sync-btn receipts-sync-btn--primary"
              onClick={handleBackup}
              disabled={syncing}
            >
              {syncing ? "Backing up…" : "☁️ Backup This Device"}
            </button>
            {syncUrl && (
              <div className="receipts-sync-link-row">
                <input
                  className="receipts-sync-input"
                  readOnly
                  value={syncUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="receipts-sync-btn"
                  onClick={() => { navigator.clipboard?.writeText(syncUrl); setSyncMsg("📋 Link copied!"); }}
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
          <div className="receipts-sync-divider">— or restore from a backup link —</div>
          <div className="receipts-sync-row">
            <input
              className="receipts-sync-input receipts-sync-input--grow"
              type="url"
              placeholder="Paste backup link here…"
              value={restoreUrl}
              onChange={(e) => setRestoreUrl(e.target.value)}
            />
            <button
              className="receipts-sync-btn receipts-sync-btn--primary"
              onClick={handleRestore}
              disabled={restoring || !restoreUrl.trim()}
            >
              {restoring ? "Restoring…" : "📥 Restore"}
            </button>
          </div>
          {syncMsg && <p className="receipts-sync-msg">{syncMsg}</p>}
        </div>
      )}

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
        <div className="receipts-toolbar__return-filters">
          {RETURN_FILTERS.map((f) => (
            <button
              key={f}
              className={`receipts-return-filter ${returnFilter === f ? "is-active" : ""}`}
              onClick={() => setReturnFilter(f)}
            >
              {f === "Returned" ? "↩️ Returned" : f === "Not Returned" ? "🛍️ Not Returned" : "📋 All Purchases"}
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
              {/* Returned badge */}
              {r.returned && (
                <div className="receipt-card__returned-badge">↩️ Returned</div>
              )}
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
                {r.isGift && (
                  <span className="receipt-card__gift">🎁 Gift</span>
                )}
              </div>
              {/* Actions */}
              <div className="receipt-card__actions">
                <button
                  className={`receipt-card__return-btn${r.returned ? " is-returned" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReturn(r.id);
                  }}
                  aria-label={r.returned ? "Undo return" : "Mark as returned"}
                  title={r.returned ? "Undo return" : "Mark as returned"}
                >
                  {r.returned ? "↩️" : "↩️"}
                </button>
                <button
                  className="receipt-card__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                  aria-label="Delete receipt"
                >
                  🗑️
                </button>
              </div>
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
                  { val: "photo", label: "📷 Photo / Screenshot" },
                  { val: "pdf", label: "📄 PDF" },
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
                <div className="receipts-field receipts-field--full">
                  <label className="receipts-gift-label">
                    <input
                      type="checkbox"
                      className="receipts-gift-check"
                      checked={form.isGift}
                      onChange={(e) => setField("isGift", e.target.checked)}
                    />
                    🎁 This is a gift receipt
                  </label>
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
            onClick={() => { setViewReceipt(null); setIsEditing(false); }}
          />
          <div
            className="receipts-modal receipts-modal--view"
            role="dialog"
            aria-label="View Receipt"
          >
            {/* Dark header — title + close only */}
            <header className="receipts-modal__head">
              <h2 className="receipts-modal__title">
                {viewReceipt.store || "Receipt"}
              </h2>
              <button
                className="receipts-modal__close"
                onClick={() => { setViewReceipt(null); setIsEditing(false); }}
              >
                ×
              </button>
            </header>

            {/* Light share bar — share buttons left, note right */}
            <div className="receipts-view-share-bar">
              <div className="receipts-view-share-btns">
                <button
                  className="receipts-view-share-btn"
                  onClick={() => handleShareViewOnly(viewReceipt)}
                >
                  Share (View Only)
                </button>
                {viewReceipt.fileUrl && (
                  <>
                    <button
                      className="receipts-view-share-btn"
                      onClick={() => handleDownload(viewReceipt)}
                      disabled={downloading}
                    >
                      {downloading ? "…" : "⬇️ Download"}
                    </button>
                    <button
                      className="receipts-view-share-btn"
                      onClick={() => handleShare(viewReceipt)}
                    >
                      🔗 Share File
                    </button>
                    <button
                      className="receipts-view-share-btn"
                      onClick={() => handleEmail(viewReceipt)}
                    >
                      ✉️ Email
                    </button>
                  </>
                )}
              </div>
              <textarea
                className="receipts-share-note"
                placeholder="Add a note for the recipient, when sharing (optional)…"
                value={receiptShareNote}
                onChange={(e) => setReceiptShareNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Scrollable receipt details */}
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
                  <div><strong>Store:</strong> {viewReceipt.store}</div>
                )}
                {viewReceipt.amount && (
                  <div><strong>Amount:</strong> ${viewReceipt.amount}</div>
                )}
                {viewReceipt.date && (
                  <div><strong>Date:</strong> {fmtDate(viewReceipt.date)}</div>
                )}
                <div><strong>Category:</strong> {viewReceipt.category}</div>
                <div><strong>Added:</strong> {fmtDate(viewReceipt.createdAt)}</div>
                {viewReceipt.notes && (
                  <div><strong>Notes:</strong> {viewReceipt.notes}</div>
                )}
                {viewReceipt.isGift && (
                  <div className="receipts-gift-badge">🎁 Gift Receipt</div>
                )}
              </div>
              {viewReceipt.returned && viewReceipt.returnedDate && (
                <p className="receipts-view-returned-date">
                  ↩️ Returned on {fmtDate(viewReceipt.returnedDate)}
                </p>
              )}
              {actionToast && (
                <div className="receipts-action-toast">{actionToast}</div>
              )}
            </div>

            {/* ── Edit form (shown when isEditing) ── */}
            {isEditing && editForm && (
              <div className="receipts-edit-body">
                <div className="receipts-fields">
                  <div className="receipts-field">
                    <label>Store / Retailer</label>
                    <input
                      className="receipts-input"
                      type="text"
                      placeholder="e.g. Zara, Amazon, Nordstrom"
                      value={editForm.store}
                      onChange={(e) => setEditField("store", e.target.value)}
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
                      value={editForm.amount}
                      onChange={(e) => setEditField("amount", e.target.value)}
                    />
                  </div>
                  <div className="receipts-field">
                    <label>Purchase Date</label>
                    <input
                      className="receipts-input"
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditField("date", e.target.value)}
                    />
                  </div>
                  <div className="receipts-field">
                    <label>Category</label>
                    <select
                      className="receipts-input"
                      value={editForm.category}
                      onChange={(e) => setEditField("category", e.target.value)}
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="receipts-field receipts-field--full">
                    <label>Notes</label>
                    <textarea
                      className="receipts-input receipts-textarea"
                      rows={2}
                      placeholder="e.g. Size 8, blue, on sale…"
                      value={editForm.notes}
                      onChange={(e) => setEditField("notes", e.target.value)}
                    />
                  </div>
                  <div className="receipts-field receipts-field--full">
                    <label className="receipts-gift-label">
                      <input
                        type="checkbox"
                        className="receipts-gift-check"
                        checked={editForm.isGift}
                        onChange={(e) => setEditField("isGift", e.target.checked)}
                      />
                      🎁 This is a gift receipt
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky footer */}
            <div className="receipts-view-footer">
              {isEditing ? (
                <>
                  <button
                    className="receipts-btn"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="receipts-btn receipts-btn--save"
                    onClick={handleSaveEdit}
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="receipts-btn"
                    onClick={() => setViewReceipt(null)}
                  >
                    Close
                  </button>
                  <button
                    className="receipts-btn receipts-btn--edit"
                    onClick={() => startEdit(viewReceipt)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className={`receipts-btn${viewReceipt.returned ? " receipts-btn--undo-return" : " receipts-btn--return"}`}
                    onClick={() => {
                      handleToggleReturn(viewReceipt.id);
                      setViewReceipt((prev) => ({
                        ...prev,
                        returned: !prev.returned,
                        returnedDate: !prev.returned ? new Date().toISOString() : null,
                      }));
                    }}
                  >
                    {viewReceipt.returned ? "↩️ Undo Return" : "↩️ Mark as Returned"}
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
                </>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
