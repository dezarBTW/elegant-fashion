import { z } from "zod";
import { PICKUP_ADDRESS } from "./checkout.mjs";

export const SPONSORSHIP_OPTIONS = ["Self sponsored", "Guardian", "Scholarship"];
export const PROGRAMMES = ["3 Months Programme", "6 Months Programme", "1 Year Programme"];
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
  passport_photo: z.url().max(2000), agreed: z.literal(true, { error: "You must agree before submitting." }),
}).strict().superRefine((value, ctx) => {
  if (value.sponsorship === "Scholarship" && !value.sponsor_organization?.trim()) {
    ctx.addIssue({ code: "custom", path: ["sponsor_organization"], message: "State the organization sponsoring your training." });
  }
}).transform((value) => ({ ...value, sponsor_organization: value.sponsorship === "Scholarship" ? value.sponsor_organization.trim() : null }));

export const studentReviewSchema = z.object({
  id: z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER), z.string().regex(/^[1-9]\d{0,18}$/)])
    .transform(String).refine((value) => BigInt(value) <= 9223372036854775807n, "Invalid application reference."),
  status: z.enum(["pending", "accepted", "declined"]),
}).strict();
export const studentName = (student) => [student.surname, student.first_name, student.middle_name].filter(Boolean).join(" ");
