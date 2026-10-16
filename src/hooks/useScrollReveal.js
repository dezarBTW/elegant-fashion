"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const elements = Array.from(root.querySelectorAll("[data-reveal]"));
    if (elements.length === 0) return undefined;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || !("IntersectionObserver" in window)) return undefined;

    elements.forEach((el) => {
      const delay = Number(el.getAttribute("data-reveal-delay")) || 0;
      el.style.setProperty("--reveal-delay", `${Math.min(160, Math.max(0, delay))}ms`);
    });

    // Reveal once: scrolling back never hides content or restarts its animation.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
      // Keep server-rendered content visible until the observer is working.
      root.setAttribute("data-reveal-ready", "");
    }, { threshold: 0, rootMargin: "0px 0px 32px 0px" });

    const showAll = () => {
      if (!motionPreference.matches) return;
      observer.disconnect();
      elements.forEach((el) => el.classList.add("is-visible"));
      root.removeAttribute("data-reveal-ready");
    };

    elements.forEach((el) => observer.observe(el));
    motionPreference.addEventListener("change", showAll);

    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", showAll);
      root.removeAttribute("data-reveal-ready");
    };
  }, []);

  return rootRef;
}
