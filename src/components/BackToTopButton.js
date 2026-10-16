"use client";

import { useEffect, useState } from "react";

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frame = null;
    let visible = false;
    const updateVisibility = () => {
      frame = null;
      const nextVisible = window.scrollY > 400;
      if (visible !== nextVisible) {
        visible = nextVisible;
        setIsVisible(nextVisible);
      }
    };
    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateVisibility);
    };
    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      className="backToTop"
      onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
      aria-label="Back to top"
    >
      <span aria-hidden="true">↑</span> Top
    </button>
  );
}
