// Small helpers shared by the admin dashboard pages.

export const BESPOKE_STATUSES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Builds a wa.me link. Nigerian numbers written as 0803... become 234803...
export function toWhatsAppUrl(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export function getProgrammePrice(programme) {
  if (programme === "3 Months Programme") return "₦150,000";
  if (programme === "6 Months Programme") return "₦250,000";
  return "";
}

// Older rows may not have a status yet, so fall back to the accepted flag.
export function getStudentStatus(student) {
  if (student?.status) return student.status;
  return student?.accepted ? "accepted" : "pending";
}
