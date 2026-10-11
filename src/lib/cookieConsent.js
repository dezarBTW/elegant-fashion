// Cookie consent helpers. The choice is stored in the browser (localStorage) and mirrored in a
// small first-party cookie, so the site can tell which optional features the visitor allowed.
//
// To gate an optional script (analytics, a pixel, a chat widget):
//   import { getCookieConsent, CONSENT_EVENT } from "@/lib/cookieConsent";
//   if (getCookieConsent()?.analytics) { /* load it */ }
//   window.addEventListener(CONSENT_EVENT, (e) => { if (e.detail.analytics) { /* load it */ } });

export const CONSENT_KEY = "elegant-cookie-consent-v1";
export const CONSENT_EVENT = "cookie-consent-changed";
export const OPEN_SETTINGS_EVENT = "open-cookie-settings";

// Ask again after about six months.
const CONSENT_MAX_AGE_DAYS = 180;

export function getCookieConsent() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== "boolean" || !parsed.savedAt) return null;

    const ageDays = (Date.now() - new Date(parsed.savedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (!Number.isFinite(ageDays) || ageDays > CONSENT_MAX_AGE_DAYS) return null;

    return { necessary: true, analytics: parsed.analytics, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function saveCookieConsent({ analytics }) {
  const value = { necessary: true, analytics: Boolean(analytics), savedAt: new Date().toISOString() };

  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode, strict settings). The cookie below still records the choice.
  }

  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `cookie_consent=${value.analytics ? "all" : "necessary"}; Max-Age=${
      60 * 60 * 24 * CONSENT_MAX_AGE_DAYS
    }; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Ignore: the choice still applies for this visit.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
