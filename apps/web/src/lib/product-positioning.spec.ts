import assert from "node:assert/strict";
import { test } from "node:test";
import {
  productDescription,
  productPositioning,
} from "./product-positioning.ts";

test("positioning is a plan for today from calendar and tasks", () => {
  assert.match(productPositioning, /realistic plan for today/i);
  assert.match(productPositioning, /calendar/i);
  assert.match(productPositioning, /tasks/i);
  assert.doesNotMatch(productPositioning, /energy levels|testimonial|10,000/i);
  assert.match(productDescription, /calendar/i);
  assert.match(productDescription, /tasks/i);
});
