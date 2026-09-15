import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../public/rules.js";
import { findBestMove } from "../public/ai.js";

function emptyState(turn) {
  return {
    board: new Array(64).fill(null),
    turn,
    castling: { wk: false, wq: false, bk: false, bq: false },
    enPassant: null,
  };
}

function square(file, rank) {
  return rank * 8 + file;
}

test("captures a free, undefended piece", () => {
  const state = emptyState("w");
  state.board[square(4, 7)] = "K"; // e8, out of the rook's path
  state.board[square(0, 0)] = "R"; // a1
  state.board[square(4, 4)] = "k"; // e5
  state.board[square(7, 0)] = "q"; // h1, undefended

  const move = findBestMove(state, 2);
  assert.equal(move.from, square(0, 0));
  assert.equal(move.to, square(7, 0));
  assert.equal(move.captured, "q");
});

test("avoids a losing trade (queen for a king-defended pawn)", () => {
  const state = emptyState("w");
  state.board[square(0, 0)] = "K"; // a1
  state.board[square(3, 0)] = "Q"; // d1
  state.board[square(4, 4)] = "k"; // e5, defends d4
  state.board[square(3, 3)] = "p"; // d4, defended by the black king

  const move = findBestMove(state, 2);
  assert.notEqual(move.from, square(3, 0)); // must not move the queen at all
});

test("returns a move from the starting position within 2 seconds", () => {
  const start = Date.now();
  const move = findBestMove(createInitialState(), 2);
  const elapsed = Date.now() - start;
  assert.ok(move, "expected a move to be returned");
  assert.ok(elapsed < 2000, `expected under 2000ms, took ${elapsed}ms`);
});
