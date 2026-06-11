/**
 * useTour — lightweight hook for controlling the WIMC tour modal.
 *
 * Extracted into its own file so Header.js can import the hook without
 * eagerly pulling in the full 3800-line WIMCTourVideo component.
 * The component itself is lazy-loaded only when the tour actually opens.
 */
import { useState, useCallback } from "react";

const LS_SEEN_KEY = "wimc_tour_seen";

export function useWIMCTour() {
  const [isOpen, setIsOpen] = useState(false);

  const openTour  = () => setIsOpen(true);
  const closeTour = () => setIsOpen(false);

  // Auto-show once for new users (called from Header after login)
  const showIfNew = useCallback(() => {
    if (!localStorage.getItem(LS_SEEN_KEY)) setIsOpen(true);
  }, []);

  return { isOpen, openTour, closeTour, showIfNew };
}
