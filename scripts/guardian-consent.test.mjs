import test from "node:test";
import assert from "node:assert/strict";
import { registrationSchema } from "../src/lib/registration.mjs";
import { ageFromDateOfBirth, guardianConsentError, guardianConsentPath, validGuardianConsentBytes } from "../src/lib/guardianConsent.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const birthYear = new Date().getFullYear() - 17;
const application = {
  surname: "Applicant", first_name: "Ada", middle_name: "", gender: "Female",
  date_of_birth: `${birthYear}-01-01`, age: 17, nationality: "Nigerian",
  marital_status: "Single", state_of_origin: "Bayelsa", address: "Yenagoa",
  telephone: "08000000000", email: "ada@example.com", chosen_programme: "3 Months Programme",
  passport_photo: "https://example.invalid/passport.jpg", sponsorship: "Self sponsored",
  sponsor_organization: "", agreed: true,
};

test("underage applicants need a signed form and under-13 applicants cannot submit", () => {
  assert.equal(ageFromDateOfBirth(application.date_of_birth), 17);
  assert.equal(registrationSchema.safeParse(application).success, false);
  assert.equal(registrationSchema.safeParse({ ...application, guardian_consent_path: guardianConsentPath(userId, "application/pdf") }).success, true);
  assert.equal(registrationSchema.safeParse({ ...application, date_of_birth: `${new Date().getFullYear() - 12}-01-01`, guardian_consent_path: guardianConsentPath(userId, "application/pdf") }).success, false);
});

test("signed-form uploads accept only bounded PDF or image files with matching signatures", () => {
  assert.equal(guardianConsentError({ type: "application/pdf", size: 300 }), "");
  assert.ok(guardianConsentError({ type: "application/msword", size: 300 }));
  assert.ok(guardianConsentError({ type: "application/pdf", size: 6 * 1024 * 1024 }));
  assert.equal(validGuardianConsentBytes(new TextEncoder().encode("%PDF-1.7"), "application/pdf"), true);
  assert.equal(validGuardianConsentBytes(new TextEncoder().encode("<script>"), "application/pdf"), false);
});
