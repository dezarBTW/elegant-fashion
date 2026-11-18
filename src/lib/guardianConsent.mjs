export const GUARDIAN_CONSENT_BUCKET = "guardian-consents";
export const GUARDIAN_CONSENT_MAX_BYTES = 5 * 1024 * 1024;
export const GUARDIAN_CONSENT_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function ageFromDateOfBirth(value, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) return null;
  const age = today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 0 ? age : null;
}

export function guardianConsentError(file) {
  if (!file || !Object.hasOwn(GUARDIAN_CONSENT_TYPES, file.type)) return "Choose a PDF, JPG, or PNG copy of the signed form.";
  if (!file.size || file.size > GUARDIAN_CONSENT_MAX_BYTES) return "Choose a signed form smaller than 5 MB.";
  return "";
}

export function guardianConsentPath(userId, type) {
  return `${userId}/guardian-consent.${GUARDIAN_CONSENT_TYPES[type]}`;
}

export function validGuardianConsentBytes(bytes, type) {
  if (type === "application/pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  return false;
}
