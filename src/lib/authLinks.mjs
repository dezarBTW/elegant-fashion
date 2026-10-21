// Email links always return to the public site, including emails sent from previews.
export const CONFIRMATION_REDIRECT =
  "https://elegantstyle.com.ng/auth/callback";
export const PASSWORD_RESET_REDIRECT =
  "https://elegantstyle.com.ng/reset-password";
export const CHECKOUT_SIGN_IN = "/sign-in?next=%2Fcheckout";

// Only the checkout destination is accepted; arbitrary redirect URLs are ignored.
export function authReturnPath(search) {
  return new URLSearchParams(search).get("next") === "/checkout" ? "/checkout" : "/";
}

export function withAuthReturn(path, destination) {
  return destination === "/checkout" ? `${path}?next=%2Fcheckout` : path;
}

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
