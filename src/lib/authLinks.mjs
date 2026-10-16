// Email links always return to the public site, including emails sent from previews.
export const CONFIRMATION_REDIRECT =
  "https://elegantstyle.com.ng/auth/callback";
export const PASSWORD_RESET_REDIRECT =
  "https://elegantstyle.com.ng/reset-password";

export function getAuthLinkError(href) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  for (const params of [url.searchParams, hash]) {
    if (
      params.has("error") ||
      params.has("error_code") ||
      params.has("error_description")
    ) {
      return "This email link is invalid or has expired. Please request a new one.";
    }
  }
  return "";
}
