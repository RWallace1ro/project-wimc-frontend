/**
 * onImgError — graceful fallback for a broken/missing image <img> tag.
 *
 * When a referenced Cloudinary asset no longer exists (e.g. deleted from the
 * closet after being added to Travel Pack / Outfit Planner / etc.), the
 * browser's default broken-image icon + visible alt text looks broken and
 * confusing. This swaps the src to a small inline placeholder graphic and
 * marks the element so it can be styled distinctly if needed.
 *
 * Usage: <img src={url} onError={onImgError} />
 */
const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#e2e8f0"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8"
            text-anchor="middle" dominant-baseline="middle">Image unavailable</text>
    </svg>`
  );

export function onImgError(e) {
  if (e.target.dataset.fallbackApplied) return; // avoid an error-loop
  e.target.dataset.fallbackApplied = "true";
  e.target.src = PLACEHOLDER_SVG;
}
