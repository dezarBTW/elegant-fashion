import { OrderRequestError } from "./orderManagement.mjs";
import { GUARDIAN_CONSENT_BUCKET, GUARDIAN_CONSENT_MAX_BYTES, GUARDIAN_CONSENT_TYPES, validGuardianConsentBytes } from "./guardianConsent.mjs";

export async function verifyGuardianConsent(db, userId, path) {
  const match = /^([0-9a-f-]{36})\/guardian-consent\.(pdf|jpg|png)$/.exec(path || "");
  if (!match || match[1] !== userId) throw new OrderRequestError("Upload your own signed guardian consent form.", 400);
  const fileName = path.slice(userId.length + 1);
  const { data: files, error: listError } = await db.storage.from(GUARDIAN_CONSENT_BUCKET).list(userId, { limit: 20, search: fileName });
  const file = files?.find((entry) => entry.name === fileName);
  const type = file?.metadata?.mimetype;
  if (listError || !file || !Object.hasOwn(GUARDIAN_CONSENT_TYPES, type) ||
      GUARDIAN_CONSENT_TYPES[type] !== match[2] || Number(file.metadata?.size) < 1 ||
      Number(file.metadata?.size) > GUARDIAN_CONSENT_MAX_BYTES) {
    throw new OrderRequestError("Your signed guardian consent form could not be verified. Upload it again.", 400);
  }
  const { data: document, error: downloadError } = await db.storage.from(GUARDIAN_CONSENT_BUCKET).download(path);
  if (downloadError || !document || document.size < 1 || document.size > GUARDIAN_CONSENT_MAX_BYTES ||
      !validGuardianConsentBytes(new Uint8Array(await document.arrayBuffer()), type)) {
    throw new OrderRequestError("Your signed guardian consent form could not be verified. Upload it again.", 400);
  }
}
