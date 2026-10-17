import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  APP_STORE_LINK_NAME,
  APP_STORE_NAME,
  APP_STORE_URL,
} from "./app-store.ts";

test("App Store link is the DayPilot Daily listing", () => {
  assert.equal(
    APP_STORE_URL,
    "https://apps.apple.com/us/app/daypilot-daily/id6798407960",
  );
  assert.equal(APP_STORE_LINK_NAME, "Download on the App Store");
  assert.equal(APP_STORE_NAME, "DayPilot Daily");
});

test("badge files are Apple's official Download on the App Store artwork", () => {
  for (const file of [
    "app-store-badge-black.svg",
    "app-store-badge-white.svg",
  ]) {
    const svg = readFileSync(
      new URL(`../../public/brand/${file}`, import.meta.url),
      "utf8",
    );
    assert.match(svg, /<svg\b/);
    assert.match(svg, /Download_on_the_App_Store_Badge/);
    assert.doesNotMatch(svg, /<script/i);
  }
});
