import React, { useState } from "react";
import { cancelDeletion } from "../../utils/accountDeletion";
import "./PendingDeletionBanner.css";

/**
 * PendingDeletionBanner — shown when userData.pendingDeletion is true.
 *
 * Displays the scheduled deletion date and lets the user cancel immediately.
 * Phase B (scheduled Cloud Function) will complete the erasure when the date
 * arrives; this component only handles the client-side cancellation.
 */
function PendingDeletionBanner({ userData, onCancelled }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  if (!userData?.pendingDeletion) return null;

  // Format the deletion date nicely
  const deletionDate = userData.deletionDate
    ? new Date(userData.deletionDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "in 14 days";

  const handleCancel = async () => {
    setError("");
    setCancelling(true);
    try {
      await cancelDeletion(userData.uid);
      onCancelled?.();
    } catch {
      setError("Could not cancel — please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="pdb" role="alert">
      <div className="pdb__inner">
        <span className="pdb__icon">🗑️</span>
        <div className="pdb__text">
          <strong>Your account is scheduled for deletion on {deletionDate}.</strong>
          <span> Changed your mind? You can cancel any time before then.</span>
          {error && <span className="pdb__error"> {error}</span>}
        </div>
        <button
          type="button"
          className="pdb__cancel"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? "Cancelling…" : "Cancel Deletion"}
        </button>
      </div>
    </div>
  );
}

export default PendingDeletionBanner;
