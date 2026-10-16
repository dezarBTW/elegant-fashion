import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONFIRMATION_REDIRECT,
  PASSWORD_RESET_REDIRECT,
  getAuthLinkError,
} from "../src/lib/authLinks.mjs";

test("email redirects use the production domain and correct routes", () => {
  assert.equal(
    CONFIRMATION_REDIRECT,
    "https://elegantstyle.com.ng/auth/callback",
  );
  assert.equal(
    PASSWORD_RESET_REDIRECT,
    "https://elegantstyle.com.ng/reset-password",
  );
});

test("rejected links are detected in both query and implicit-flow fragments", () => {
  for (const suffix of [
    "?error=access_denied",
    "#error_code=otp_expired",
    "#error_description=Expired",
  ]) {
    assert.ok(getAuthLinkError(`${CONFIRMATION_REDIRECT}${suffix}`));
  }
  assert.equal(
    getAuthLinkError(
      `${CONFIRMATION_REDIRECT}#access_token=example&type=signup`,
    ),
    "",
  );
  assert.equal(getAuthLinkError(PASSWORD_RESET_REDIRECT), "");
});
