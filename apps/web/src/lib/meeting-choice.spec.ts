import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  choiceHasPrivateValue,
  normalizeCallbackNumber,
  normalizeHttpUrl,
  readyPublicChoices,
} from "./meeting-choice.ts";

const draft = {
  link: true,
  linkUrl: "https://meet.example/room",
  phone: true,
  phoneNumber: "+1 202 555 0143",
  slack: true,
  slackUrl: "not a url",
  discord: false,
  discordUrl: "https://discord.gg/secret",
};

describe("public meeting choices", () => {
  it("lists only configured methods and hides the host number and links", () => {
    const choices = readyPublicChoices(draft);
    assert.deepEqual(
      choices.map((choice) => choice.id),
      ["link", "phone"],
    );
    const serialized = JSON.stringify(choices);
    assert.equal(serialized.includes("202"), false);
    assert.equal(serialized.includes("meet.example"), false);
    assert.equal(serialized.includes("discord.gg"), false);
    for (const choice of choices) {
      assert.equal(choiceHasPrivateValue(choice), false);
    }
    assert.match(choices[1].detail, /not shown on this page/);
  });

  it("rejects a short callback number and a non-http link", () => {
    assert.equal(normalizeCallbackNumber("123"), null);
    assert.equal(normalizeCallbackNumber("+44 20 7946 0958"), "+44 20 7946 0958");
    assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
    assert.equal(
      normalizeHttpUrl("https://example.com/join"),
      "https://example.com/join",
    );
  });
});
