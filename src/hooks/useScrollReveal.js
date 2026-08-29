"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const elements = Array.from(root.querySelectorAll("[data-reveal]"));
    if (elements.length === 0) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return undefined;
    }

    elements.forEach((el) => {
      const delay = el.getAttribute("data-reveal-delay");
      if (delay) {
        el.style.setProperty("--reveal-delay", `${delay}ms`);
      }
    });

    let lastY = window.scrollY;
    let direction = "down";

    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) {
        direction = y > lastY ? "down" : "up";
        lastY = y;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          el.style.setProperty("--reveal-y", direction === "down" ? "2.75rem" : "-2.75rem");

          if (entry.isIntersecting) {
            const delay = el.getAttribute("data-reveal-delay") || "0";
            el.style.setProperty("--reveal-delay", `${delay}ms`);
            el.classList.add("is-visible");
          } else {
            el.style.setProperty("--reveal-delay", "0ms");
            el.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
    );

    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        elements.forEach((el) => observer.observe(el));
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return rootRef;
}
