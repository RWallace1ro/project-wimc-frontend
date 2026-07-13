import React, { useCallback, useEffect, useState } from "react";
import "./ScrollHintArrows.css";

// Drop-in "there's more to scroll" hint for any horizontally-scrolling row.
// Usage: give the scrollable element a ref, then render this as a sibling
// inside a position:relative wrapper — `<ScrollHintArrows scrollRef={ref} />`.
// Shows a small ‹/› chip at either edge whenever content is scrolled past
// on that side; clicking one nudges the scroll further that direction.
export default function ScrollHintArrows({ scrollRef, offset = 90 }) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(check);
      ro.observe(el);
    }
    // Content inside the scroller can change size/count after mount (e.g.
    // async data) — re-check shortly after mount too.
    const t = setTimeout(check, 300);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      if (ro) ro.disconnect();
      clearTimeout(t);
    };
  }, [scrollRef, check]);

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * offset, behavior: "smooth" });
  };

  if (!canLeft && !canRight) return null;

  return (
    <>
      {canLeft && (
        <button
          type="button"
          className="scroll-hint scroll-hint--left"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          tabIndex={-1}
        >
          ‹
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="scroll-hint scroll-hint--right"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          tabIndex={-1}
        >
          ›
        </button>
      )}
    </>
  );
}
