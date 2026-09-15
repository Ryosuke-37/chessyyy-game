// Depth-2 minimax with alpha-beta pruning. Runs entirely in the browser
// (Vs Computer needs no server round-trip), importing the same rules.js
// used by every other mode.
import { WHITE, generateLegalMoves, applyMove, getStatus, colorOf } from "./rules.js";

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluate(state) {
  const status = getStatus(state);
  if (status.isCheckmate) {
    // The side to move is the one who got mated.
    return state.turn === WHITE ? -Infinity : Infinity;
  }
  if (status.isStalemate) return 0;

  let score = 0;
  for (const piece of state.board) {
    if (!piece) continue;
    const value = PIECE_VALUES[piece.toLowerCase()];
    score += colorOf(piece) === WHITE ? value : -value;
  }
  return score;
}

function minimax(state, depth, alpha, beta, maximizing) {
  const legalMoves = generateLegalMoves(state);
  if (depth === 0 || legalMoves.length === 0) {
    return evaluate(state);
  }

  if (maximizing) {
    let value = -Infinity;
    for (const move of legalMoves) {
      value = Math.max(value, minimax(applyMove(state, move), depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of legalMoves) {
    value = Math.min(value, minimax(applyMove(state, move), depth - 1, alpha, beta, true));
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

export function findBestMove(state, depth = 2) {
  const maximizing = state.turn === WHITE;
  let bestMove = null;
  let bestValue = maximizing ? -Infinity : Infinity;

  for (const move of generateLegalMoves(state)) {
    const value = minimax(applyMove(state, move), depth - 1, -Infinity, Infinity, !maximizing);
    if (maximizing ? value > bestValue : value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove;
}
