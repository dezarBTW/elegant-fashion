import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { SITE_URL, publicPages, pageMetadata, businessStructuredData } from "../src/lib/seo.mjs";

test("public pages have distinct canonical URLs and useful metadata", () => {
  const canonicals = new Set();
  for (const path of Object.keys(publicPages)) {
    const metadata = pageMetadata(path);
    const canonical = new URL(metadata.alternates.canonical, SITE_URL).href;
    assert.ok(!canonicals.has(canonical));
    canonicals.add(canonical);
    assert.ok(metadata.title.length > 0);
    assert.ok(metadata.description.includes("Elegant Style"));
    assert.equal(new URL(metadata.openGraph.url).href, canonical);
    assert.ok(!/admin|registration|sign-in|sign-up|reset-password|auth/.test(path));
  }
});

test("business identity uses the current brand, domain and address", () => {
  const [website, business] = businessStructuredData["@graph"];
  assert.equal(website.name, "Elegant Style");
  assert.equal(website.url, SITE_URL);
  assert.equal(business.address.streetAddress, "Km 4 Isaac Boro Express Way");
  assert.equal(business.address.addressLocality, "Yenagoa");
  assert.equal(website.publisher["@id"], business["@id"]);
});

test("account and registration routes remain noindex", () => {
  for (const route of ["admin", "auth", "sign-in", "sign-up", "forgot-password", "reset-password", "course/registration", "course/accepted-students"]) {
    const layout = readFileSync(new URL(`../src/app/${route}/layout.js`, import.meta.url), "utf8");
    assert.match(layout, /index: false/);
  }
});
