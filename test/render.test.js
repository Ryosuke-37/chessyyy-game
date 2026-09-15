import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, applyMove, generateLegalMoves } from "../public/rules.js";
import { getCapturedPieces, materialDiff } from "../public/render.js";

test("a fresh board has no captures and even material", () => {
  const board = createInitialState().board;
  const { byWhite, byBlack } = getCapturedPieces(board);
  assert.deepEqual(byWhite, []);
  assert.deepEqual(byBlack, []);
  assert.equal(materialDiff(board), 0);
});

test("a captured pawn shows up grouped under its capturer, with the right material swing", () => {
  let state = createInitialState();
  const play = (from, to) => {
    const move = generateLegalMoves(state).find((m) => m.from === from && m.to === to);
    state = applyMove(state, move);
  };
  play(12, 28); // e2-e4
  play(51, 35); // d7-d5
  play(28, 35); // e4xd5

  const { byWhite, byBlack } = getCapturedPieces(state.board);
  assert.deepEqual(byWhite, ["p"]); // White captured one black pawn
  assert.deepEqual(byBlack, []);
  assert.equal(materialDiff(state.board), 1); // White is up a pawn
});
