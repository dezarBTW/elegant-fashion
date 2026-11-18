import { z } from "zod";
import { PICKUP_ADDRESS } from "./checkout.mjs";
import { ageFromDateOfBirth } from "./guardianConsent.mjs";

export const SPONSORSHIP_OPTIONS = ["Self sponsored", "Guardian", "Scholarship"];
export const PROGRAMMES = ["3 Months Programme", "6 Months Programme", "1 Year Programme"];
export const CORRECTION_FIELD_OPTIONS = [
  ["surname", "Surname"], ["first_name", "First name"], ["middle_name", "Middle name"],
  ["gender", "Gender"], ["date_of_birth", "Date of birth"], ["age", "Age"],
  ["nationality", "Nationality"], ["marital_status", "Marital status"],
  ["state_of_origin", "State of origin"], ["address", "Address"],
  ["telephone", "Telephone"], ["email", "Email address"],
  ["chosen_programme", "Chosen programme"], ["sponsorship", "Sponsorship"],
  ["sponsor_organization", "Sponsor organization"],
];
export const CORRECTION_FIELD_KEYS = CORRECTION_FIELD_OPTIONS.map(([key]) => key);
export const ACADEMY_ADDRESS = PICKUP_ADDRESS;
export const REGISTRATION_COMPLETE_MESSAGE = `Registration completed visit ${ACADEMY_ADDRESS} from Mon-Fri, 8am-5pm, for PAYMENT DETAILS, ORIENTAION and PHYSICAL VERIFICATION\nThank You for choosing Elegant Style Fashion Academy`;

const requiredText = (max) => z.string().trim().min(1, "This field is required.").max(max);
export const registrationSchema = z.object({
  surname: requiredText(100), first_name: requiredText(100), middle_name: z.string().trim().max(100).default(""),
  gender: requiredText(40), date_of_birth: z.iso.date().refine((value) => new Date(`${value}T00:00:00Z`) <= new Date(), "Date of birth cannot be in the future."),
  age: z.coerce.number().int().min(1).max(100), nationality: requiredText(100), marital_status: requiredText(40),
  state_of_origin: requiredText(100), address: requiredText(500), telephone: requiredText(40).regex(/^\+?[\d\s()-]{7,40}$/, "Enter a valid telephone number."),
  email: z.email().max(254).transform((value) => value.toLowerCase()), chosen_programme: z.enum(PROGRAMMES),
  sponsorship: z.enum(SPONSORSHIP_OPTIONS), sponsor_organization: z.string().trim().max(160).nullish(),
  passport_photo: z.url().max(2000), guardian_consent_path: z.string().max(200).optional().default(""),
  agreed: z.literal(true, { error: "You must agree before submitting." }),
}).strict().superRefine((value, ctx) => {
  const age = ageFromDateOfBirth(value.date_of_birth);
  if (age !== null && age < 13) ctx.addIssue({ code: "custom", path: ["date_of_birth"], message: "Applicants under 13 cannot apply online. Contact the academy." });
  if (age !== null && age < 18 && !value.guardian_consent_path) ctx.addIssue({ code: "custom", path: ["guardian_consent_path"], message: "Upload the signed guardian consent form from the academy." });
  if (value.sponsorship === "Scholarship" && !value.sponsor_organization?.trim()) {
    ctx.addIssue({ code: "custom", path: ["sponsor_organization"], message: "State the organization sponsoring your training." });
  }
}).transform((value) => ({ ...value, sponsor_organization: value.sponsorship === "Scholarship" ? value.sponsor_organization.trim() : null }));

export const studentReviewSchema = z.object({
  id: z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER), z.string().regex(/^[1-9]\d{0,18}$/)])
    .transform(String).refine((value) => BigInt(value) <= 9223372036854775807n, "Invalid application reference."),
  status: z.enum(["pending", "accepted", "declined"]),
}).strict();
export const studentDeclineSchema = z.object({
  id: studentReviewSchema.shape.id,
  status: z.literal("declined"),
  reason: z.string().trim().min(8, "Give a brief reason (at least 8 characters).").max(500),
  correction_fields: z.array(z.enum(CORRECTION_FIELD_KEYS)).max(16).refine((fields) => new Set(fields).size === fields.length, "Select each field once."),
}).strict();
export const studentCorrectionSchema = z.object({
  id: studentReviewSchema.shape.id,
  changes: z.record(z.string(), z.unknown()),
  passport_photo: z.url().max(2000),
  guardian_consent_path: z.string().max(200).optional().default(""),
}).strict();
export const studentName = (student) => [student.surname, student.first_name, student.middle_name].filter(Boolean).join(" ");
