import assert from "node:assert/strict";
import { test } from "node:test";
import { watchCopyrightYear } from "../src/lib/copyrightYear.mjs";

function setup(t, now) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now });
  const browser = new EventTarget();
  const page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = browser;
  globalThis.document = page;
  const years = [];
  const stop = watchCopyrightYear((year) => years.push(year));
  t.after(() => {
    stop();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });
  return { browser, page, years, stop };
}

test("copyright changes at January 1 midnight in local time", (t) => {
  const { years } = setup(t, new Date(2026, 11, 31, 23, 59, 59, 500));
  assert.deepEqual(years, [2026]);
  t.mock.timers.tick(499);
  assert.deepEqual(years, [2026]);
  t.mock.timers.tick(1);
  assert.deepEqual(years, [2026, 2027]);
});

test("a distant New Year does not overflow the timer or poll continuously", (t) => {
  const { years } = setup(t, new Date(2026, 0, 1));
  t.mock.timers.tick(1000);
  assert.deepEqual(years, [2026]);
  t.mock.timers.tick(24 * 60 * 60 * 1000 - 1000);
  assert.deepEqual(years, [2026, 2026]);
});

test("returning to a sleeping tab catches up and cleanup removes updates", (t) => {
  const { browser, page, years, stop } = setup(t, new Date(2026, 11, 31, 23));
  t.mock.timers.setTime(new Date(2027, 0, 1, 10).getTime());
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(years.at(-1), 2027);
  t.mock.timers.setTime(new Date(2028, 0, 1, 10).getTime());
  browser.dispatchEvent(new Event("focus"));
  assert.equal(years.at(-1), 2028);
  stop();
  const count = years.length;
  browser.dispatchEvent(new Event("focus"));
  page.dispatchEvent(new Event("visibilitychange"));
  t.mock.timers.tick(24 * 60 * 60 * 1000);
  assert.equal(years.length, count);
});
