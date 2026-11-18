import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, sendServiceEmail, wrapBrandEmail } from "./orderEmails.mjs";
import { CORRECTION_FIELD_OPTIONS, REGISTRATION_COMPLETE_MESSAGE, studentName } from "./registration.mjs";
import { SITE_URL } from "./seo.mjs";

export function registrationAdminEmail(student, recipient) {
  const details = [
    ["Application reference", student.id], ["Name", studentName(student)], ["Email", student.email], ["Telephone", student.telephone],
    ["Date of birth", student.date_of_birth], ["Age", student.age], ["Gender", student.gender], ["Nationality", student.nationality],
    ["Marital status", student.marital_status], ["State of origin", student.state_of_origin], ["Address", student.address],
    ["Programme", student.chosen_programme], ["Sponsorship", student.sponsorship], ["Sponsor organization", student.sponsor_organization || "Not applicable"],
    ["Passport photograph", "View securely in the admin dashboard"], ["Application status", student.status || "pending"],
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

export function registrationDeclineEmail(student, recipient = student.email) {
  const fields = (student.correction_fields || []).map((key) => CORRECTION_FIELD_OPTIONS.find(([field]) => field === key)?.[1]).filter(Boolean);
  const url = `${SITE_URL}/course/registration/${encodeURIComponent(student.id)}`;
  const list = fields.length ? fields : ["Passport photograph"];
  const reason = student.decline_reason || "Please review your application details.";
  return {
    to: recipient,
    subject: `Your Elegant Style Academy application was declined — ${student.id}`,
    idempotencyKey: `student-decline/${student.id}/${student.decline_revision}`,
    html: wrapBrandEmail("Your application needs a correction", `
      <p style="font-size:17px;line-height:1.6">Dear ${safe(studentName(student))},</p>
      <p style="font-size:16px;line-height:1.65">Thank you for applying to Elegant Style Fashion Academy. We have reviewed your application and, at this stage, it has been <strong>declined</strong>. You are welcome to correct the details below and send it back for review.</p>
      <div style="margin:24px 0;padding:22px;background:#f7f2e9;border-left:4px solid #c9a962">
        <p style="margin:0 0 8px;color:#8b6c2d;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Reason from our admissions team</p>
        <p style="margin:0;font-size:17px;line-height:1.6;overflow-wrap:anywhere">${safe(reason)}</p>
      </div>
      <p style="font-size:16px;line-height:1.6"><strong>Details open for correction:</strong> ${safe(list.join(", "))}. Your other details will stay as submitted. We have removed your previous passport photograph, so please upload a new one before resubmitting.</p>
      <p style="margin:28px 0"><a href="${safe(url)}" style="display:inline-block;min-height:44px;line-height:44px;padding:0 22px;background:#24211e;color:#f7e8bd;text-decoration:none;font-weight:700">Correct your application</a></p>
      <p style="color:#625b52;font-size:14px;line-height:1.6">Application reference: ${safe(student.id)}. If you need help, reply to this email and our team will assist you.</p>`),
    text: `Dear ${studentName(student)},\n\nThank you for applying to Elegant Style Fashion Academy. Your application was declined at this stage. You may correct the details below and resubmit it for review.\n\nReason: ${reason}\nDetails open for correction: ${list.join(", ")}\nYour other details will stay as submitted. Your previous passport photograph was removed, so please upload a new one.\n\nCorrect your application: ${url}\nApplication reference: ${student.id}\n\nIf you need help, reply to this email.`,
  };
}

export function notifyRegistration(student) {
  return sendServiceEmail(registrationAdminEmail(student, ADMIN_NOTIFY_EMAIL));
}

export function notifyAcceptance(student) {
  return sendServiceEmail(registrationAcceptanceEmail(student));
}

export function notifyDecline(student, recipient) {
  return sendServiceEmail(registrationDeclineEmail(student, recipient));
}
