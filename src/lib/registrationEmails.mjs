import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, sendServiceEmail, wrapBrandEmail } from "./orderEmails.mjs";
import { REGISTRATION_COMPLETE_MESSAGE, studentName } from "./registration.mjs";

export function registrationAdminEmail(student, recipient) {
  const details = [
    ["Application reference", student.id], ["Name", studentName(student)], ["Email", student.email], ["Telephone", student.telephone],
    ["Date of birth", student.date_of_birth], ["Age", student.age], ["Gender", student.gender], ["Nationality", student.nationality],
    ["Marital status", student.marital_status], ["State of origin", student.state_of_origin], ["Address", student.address],
    ["Programme", student.chosen_programme], ["Sponsorship", student.sponsorship], ["Sponsor organization", student.sponsor_organization || "Not applicable"],
    ["Passport photograph", student.passport_photo], ["Application status", student.status || "pending"],
    ["Submitted", student.created_at || "Recorded on application"], ["Declaration accepted", student.declaration_accepted_at || "Confirmed during submission"],
  ];
  return {
    to: recipient, subject: `Elegant Style student registration — ${student.id}`, idempotencyKey: `student-registration/${student.id}/admin`,
    html: wrapBrandEmail("New student registration", `<dl>${details.map(([label, value]) => `<dt style="font-weight:700">${safe(label)}</dt><dd style="margin:0 0 12px">${safe(value)}</dd>`).join("")}</dl><p>Review the application in the Elegant Style admin dashboard.</p><p style="white-space:pre-line">${safe(REGISTRATION_COMPLETE_MESSAGE)}</p>`),
    text: `${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${REGISTRATION_COMPLETE_MESSAGE}`,
  };
}

export function registrationAcceptanceEmail(student) {
  return {
    to: student.email, subject: "Your Elegant Style Fashion Academy application has been accepted", idempotencyKey: `student-acceptance/${student.id}`,
    html: wrapBrandEmail("Your application is accepted", `<p>Hello ${safe(studentName(student))},</p><p>You have been accepted for ${safe(student.chosen_programme)} at Elegant Style Fashion Academy.</p><p>Application reference: ${safe(student.id)}</p><p>Sponsorship: ${safe(student.sponsorship || "Not recorded")}</p>${student.sponsor_organization ? `<p>Sponsor organization: ${safe(student.sponsor_organization)}</p>` : ""}<p style="white-space:pre-line">${safe(REGISTRATION_COMPLETE_MESSAGE)}</p>`),
    text: `Hello ${studentName(student)},\nYou have been accepted for ${student.chosen_programme} at Elegant Style Fashion Academy.\nApplication reference: ${student.id}\n\n${REGISTRATION_COMPLETE_MESSAGE}`,
  };
}

export function notifyRegistration(student) {
  return sendServiceEmail(registrationAdminEmail(student, ADMIN_NOTIFY_EMAIL));
}

export function notifyAcceptance(student) {
  return sendServiceEmail(registrationAcceptanceEmail(student));
}
