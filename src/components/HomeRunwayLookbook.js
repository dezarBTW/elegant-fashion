"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { imagePath } from "@/lib/imagePath.mjs";
import { productHref } from "@/lib/products.mjs";
import styles from "./HomeRunwayLookbook.module.css";

const STORAGE_KEY = "elegant-home-runway";
// This listener survives a client-side transition to a product and observes Back.
if (typeof window !== "undefined" && !window.__elegantRunwayHistoryListener) {
  window.__elegantRunwayHistoryListener = true;
  window.addEventListener("popstate", () => { window.__elegantRunwayBack = true; });
}
const stops = {
  x: [1.13, .72, .48, .32, .21, .12, .06],
  feet: [1.12, .9, .79, .72, .66, .62, .59],
  height: [1.12, .82, .58, .44, .34, .26, .19],
  blur: [0, 0, 1.5, 4, 8, 12, 17],
  opacity: [1, 1, 1, 1, .86, .5, 0],
};
const wrap = (value, length) => ((value % length) + length) % length;
const mix = (values, depth) => {
  const step = Math.max(0, Math.min(6, depth + 1));
  const lower = Math.floor(step);
  return values[lower] + (values[Math.min(6, lower + 1)] - values[lower]) * (step - lower);
};

export default function HomeRunwayLookbook() {
  const [products, setProducts] = useState([]);
  const [active, setActive] = useState(0);
  const stage = useRef(null);
  const cards = useRef([]);
  const motion = useRef({ position: 0, target: 0, last: 0, idle: 0, dragging: false, moved: false });

  useEffect(() => {
    let cancelled = false;
    let restored = null;
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      const navigation = performance.getEntriesByType("navigation")[0];
      const isBack = window.__elegantRunwayBack || navigation?.type === "back_forward";
      if (isBack && stored?.returning && Array.isArray(stored.products)) restored = stored;
      window.__elegantRunwayBack = false;
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (restored) {
      motion.current.position = restored.position || 0;
      motion.current.target = restored.target || 0;
      Promise.resolve().then(() => { if (!cancelled) setProducts(restored.products); });
    } else {
      supabase.rpc("get_home_runway_products").then(({ data, error }) => {
        if (!cancelled && !error && Array.isArray(data)) setProducts(data);
      });
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const element = stage.current;
    const state = motion.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const resetClock = () => { state.last = 0; };
    const paint = (now) => {
      const dt = state.last ? Math.min(now - state.last, 50) : 0;
      state.last = now;
      if (!reduced.matches && products.length > 1 && !state.dragging) {
        state.idle += dt;
        if (state.idle > 5000 && Math.abs(state.target - state.position) < .001) {
          state.target = Math.round(state.target) + 1;
          state.idle = 0;
        }
      }
      state.position = reduced.matches ? state.target : state.position + (state.target - state.position) * (1 - Math.exp(-dt * .0072));
      if (Math.abs(state.target - state.position) < .0004) state.position = state.target;
      const count = products.length;
      if (count) {
        const next = wrap(Math.round(state.position), count);
        if (state.active !== next) { state.active = next; setActive(next); }
        const width = element.clientWidth;
        const height = element.clientHeight;
        cards.current.forEach((card, index) => {
          if (!card) return;
          let depth = wrap(index - state.position, count);
          if (depth > count - 1) depth -= count;
          if (count === 1) depth = 0;
          const h = mix(stops.height, depth) * height;
          const w = h * .54;
          const x = mix(stops.x, depth) * width - w / 2;
          const y = mix(stops.feet, depth) * height - h;
          const base = height * 1.2;
          const scale = h / base;
          card.style.width = `${base * .54}px`;
          card.style.height = `${base}px`;
          card.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
          card.style.filter = `blur(${mix(stops.blur, depth) / scale}px)`;
          card.style.opacity = mix(stops.opacity, depth);
          card.style.zIndex = String(100 - Math.round(depth * 10));
          card.style.pointerEvents = depth < -.5 || depth > 3 ? "none" : "auto";
        });
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    window.addEventListener("pageshow", resetClock);
    document.addEventListener("visibilitychange", resetClock);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", resetClock);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, [products]);

  useEffect(() => {
    const element = stage.current;
    let timer;
    const wheel = event => {
      if (products.length < 2 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const state = motion.current;
      state.target += Math.max(-120, Math.min(120, event.deltaX)) / 420;
      state.idle = 0;
      clearTimeout(timer);
      timer = setTimeout(() => { state.target = Math.round(state.target); }, 150);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => { clearTimeout(timer); element.removeEventListener("wheel", wheel); };
  }, [products]);

  const step = direction => {
    const state = motion.current;
    state.target = Math.round(state.target) + direction;
    state.idle = 0;
  };
  const save = () => {
    const { position, target } = motion.current;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ returning: true, products, position, target })); } catch {}
  };
  return (
    <div className={styles.stage} ref={stage} role="region" aria-label="Ready-to-wear runway" tabIndex={0}
      onKeyDown={event => {
        if (products.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          step(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || products.length < 2) return;
        const state = motion.current;
        state.dragging = true; state.moved = false; state.startX = event.clientX; state.startTarget = state.target;
        state.idle = 0;
      }}
      onPointerMove={event => {
        const state = motion.current;
        if (!state.dragging) return;
        const dx = event.clientX - state.startX;
        if (Math.abs(dx) > 8) {
          state.moved = true;
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
          state.target = state.startTarget + dx / Math.max(150, event.currentTarget.clientWidth * .2);
        }
      }}
      onPointerUp={() => { const state = motion.current; if (state.dragging && state.moved) state.target = Math.round(state.target); state.dragging = false; }}
      onPointerCancel={() => { const state = motion.current; state.target = Math.round(state.target); state.dragging = false; }}>
      <div className={styles.haze} aria-hidden="true" />
      {products.map((product, index) => (
        <Link key={product.id} ref={element => { cards.current[index] = element; }}
          href={productHref(product)} className={styles.look} aria-label={`View ${product.name}`}
          onClick={event => { if (motion.current.moved) { event.preventDefault(); motion.current.moved = false; return; } save(); }}>
          <Image src={imagePath(product.image)} alt={product.name} fill sizes="(max-width: 700px) 60vw, 35vw" draggable={false} />
        </Link>
      ))}
      {products.length > 0 && <div className={styles.number} aria-live="polite">Look {String(active + 1).padStart(2, "0")}</div>}
      {products.length > 1 && <div className={styles.controls}>
        <button type="button" aria-label="Previous look" onClick={() => step(-1)}>←</button>
        <button type="button" aria-label="Next look" onClick={() => step(1)}>→</button>
      </div>}
    </div>
  );
}
