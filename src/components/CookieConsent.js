"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCookieConsent, saveCookieConsent, OPEN_SETTINGS_EVENT } from "@/lib/cookieConsent";
import styles from "./CookieConsent.module.css";

// Cookie consent: a banner on the first visit and a settings panel. The panel can be reopened from
// anywhere with openCookieSettings() (the privacy page has a button for it). Choices are saved by
// src/lib/cookieConsent.js.
export default function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const saved = getCookieConsent();
    setConsent(saved);
    setShowBanner(!saved);
    setAnalytics(saved?.analytics ?? false);
    setReady(true);

    const openFromElsewhere = () => {
      setAnalytics(getCookieConsent()?.analytics ?? false);
      setShowSettings(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openFromElsewhere);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openFromElsewhere);
  }, []);

  useEffect(() => {
    if (!showSettings) return undefined;

    panelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSettings]);

  const choose = (allowAnalytics) => {
    const saved = saveCookieConsent({ analytics: allowAnalytics });
    setConsent(saved);
    setAnalytics(saved.analytics);
    setShowBanner(false);
    setShowSettings(false);
  };

  const openSettings = () => {
    setAnalytics(consent?.analytics ?? false);
    setShowSettings(true);
  };

  if (!ready) return null;

  return (
    <>
      {showBanner && !showSettings && (
        <section
          className={styles.banner}
          role="dialog"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-text"
        >
          <h2 id="cookie-title" className={styles.title}>We value your privacy</h2>
          <p id="cookie-text" className={styles.text}>
            We use essential cookies and similar storage to keep you signed in, remember your cart and keep the site
            secure. With your permission we would also like to use optional analytics to improve the site. You can
            change your mind at any time.{" "}
            <Link href="/privacy" className={styles.link}>Read our privacy policy</Link>
          </p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => choose(true)}>
              Accept all
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => choose(false)}>
              Reject non-essential
            </button>
            <button type="button" className={styles.customise} onClick={openSettings}>
              Customise
            </button>
          </div>
        </section>
      )}

      {showSettings && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowSettings(false)}>
          <section
            ref={panelRef}
            tabIndex={-1}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.panelHead}>
              <h2 id="cookie-settings-title" className={styles.panelTitle}>Cookie settings</h2>
              <button type="button" className={styles.close} onClick={() => setShowSettings(false)} aria-label="Close cookie settings">
                &times;
              </button>
            </div>
            <p className={styles.panelText}>
              Choose which cookies and similar storage we may use. Your choice is saved on this device and you can
              change it whenever you like.
            </p>

            <div className={styles.option}>
              <div>
                <h3 className={styles.optionTitle}>Strictly necessary</h3>
                <p className={styles.optionText}>
                  Keeps you signed in, remembers your cart and protects the site against abuse. The site cannot work
                  without these, so they are always on.
                </p>
              </div>
              <span className={styles.alwaysOn}>Always on</span>
            </div>

            <div className={styles.option}>
              <div>
                <h3 className={styles.optionTitle}>Analytics and performance</h3>
                <p className={styles.optionText}>
                  Helps us understand which pages are used so we can improve the site. If we use analytics, it will only
                  run when you switch this on.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analytics}
                aria-label="Allow analytics and performance cookies"
                className={`${styles.switch} ${analytics ? styles.switchOn : ""}`}
                onClick={() => setAnalytics((current) => !current)}
              >
                <span className={styles.knob} />
              </button>
            </div>

            <div className={styles.panelActions}>
              <button type="button" className={`${styles.btn} ${styles.btnDark}`} onClick={() => choose(analytics)}>
                Save my choices
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnOutlineDark}`} onClick={() => choose(true)}>
                Accept all
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnOutlineDark}`} onClick={() => choose(false)}>
                Reject non-essential
              </button>
            </div>
            <p className={styles.panelFoot}>
              <Link href="/privacy" className={styles.footLink}>Privacy policy</Link>
            </p>
          </section>
        </div>
      )}
    </>
  );
}
