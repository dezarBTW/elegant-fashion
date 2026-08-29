export function sanitizeText(value) {
  if (typeof value !== "string") return value;

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

export function sanitizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

export function validateImageFile(file, maxSizeBytes = 5 * 1024 * 1024) {
  // IMPORTANT: the extensions here MUST stay "jpg" / "png" (not "jpeg").
  // The student-passports storage RLS policies in rls_policies.sql only
  // allow filenames matching ^passport\.(jpg|png)$ — if you add a MIME type
  // or change an extension here without updating that regex too, uploads
  // will start failing with "new row violates row-level security policy".
  const allowedTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
  };

  if (!file || !allowedTypes[file.type]) {
    return { valid: false, message: "Please upload a valid JPG or PNG image." };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, message: "Image size must be less than 5MB." };
  }

  return { valid: true, extension: allowedTypes[file.type] };
}

export function consumeRateLimit(key, limit, windowMs) {
  if (typeof window === "undefined") return { allowed: true, retryAfterMs: 0 };

  const storageKey = `rate-limit:${key}`;
  const now = Date.now();
  let timestamps = [];

  try {
    timestamps = JSON.parse(window.localStorage.getItem(storageKey) || "[]")
      .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < windowMs);
  } catch {
    timestamps = [];
  }

  if (timestamps.length >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - timestamps[0])),
    };
  }

  timestamps.push(now);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch {
    // Continue if browser storage is unavailable.
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function formatRetryMessage(retryAfterMs) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Too many attempts. Please try again in ${seconds} seconds.`;
}