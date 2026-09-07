import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearNestSessionMemory,
  getNestAccessToken,
  hasNestAccessToken,
  nestAccessTokenTtlMs,
  setNestSession,
} from "./nest-session.ts";

function jwtWithExp(expSeconds: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
    "base64url",
  );
  return `${header}.${payload}.x`;
}

describe("nest-session memory store", () => {
  it("holds tokens in memory only", () => {
    clearNestSessionMemory();
    setNestSession({
      accessToken: jwtWithExp(Math.floor(Date.now() / 1000) + 600),
      refreshToken: "refresh",
    });
    assert.equal(hasNestAccessToken(), true);
    assert.ok((nestAccessTokenTtlMs() ?? 0) > 0);
    clearNestSessionMemory();
    assert.equal(getNestAccessToken(), null);
    assert.equal(hasNestAccessToken(), false);
  });
});
