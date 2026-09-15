import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, perft } from "../src/rules.js";

test("perft depth 1 from the starting position is 20", () => {
  assert.equal(perft(createInitialState(), 1), 20);
});

test("perft depth 2 from the starting position is 400", () => {
  assert.equal(perft(createInitialState(), 2), 400);
});

test("perft depth 3 from the starting position is 8902", () => {
  assert.equal(perft(createInitialState(), 3), 8902);
});
