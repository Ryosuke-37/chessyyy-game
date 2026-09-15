// Chessyyy shared rules engine. No external chess library.
// Board: 64-length array, index = rank*8 + file (rank 0 = White's back rank, file 0 = a-file).
// Pieces: uppercase = White (P N B R Q K), lowercase = Black (p n b r q k), null = empty square.

export const WHITE = "w";
export const BLACK = "b";

const KNIGHT_DELTAS = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];

function rankOf(square) {
  return Math.floor(square / 8);
}

function fileOf(square) {
  return square % 8;
}

function squareOf(rank, file) {
  return rank * 8 + file;
}

function onBoard(rank, file) {
  return rank >= 0 && rank < 8 && file >= 0 && file < 8;
}

export function colorOf(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? WHITE : BLACK;
}

export function createInitialState() {
  const board = new Array(64).fill(null);
  const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let file = 0; file < 8; file++) {
    board[squareOf(0, file)] = backRank[file].toUpperCase();
    board[squareOf(1, file)] = "P";
    board[squareOf(6, file)] = "p";
    board[squareOf(7, file)] = backRank[file];
  }
  return {
    board,
    turn: WHITE,
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
  };
}

function cloneState(state) {
  return {
    board: state.board.slice(),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant,
  };
}

function addStepMoves(state, from, rank, file, deltas, moves) {
  const piece = state.board[from];
  const color = colorOf(piece);
  for (const [dr, df] of deltas) {
    const r = rank + dr;
    const f = file + df;
    if (!onBoard(r, f)) continue;
    const to = squareOf(r, f);
    const target = state.board[to];
    if (target && colorOf(target) === color) continue;
    moves.push({ from, to, piece, captured: target || null, promotion: null, flag: null });
  }
}

function addSlideMoves(state, from, rank, file, dirs, moves) {
  const piece = state.board[from];
  const color = colorOf(piece);
  for (const [dr, df] of dirs) {
    let r = rank + dr;
    let f = file + df;
    while (onBoard(r, f)) {
      const to = squareOf(r, f);
      const target = state.board[to];
      if (!target) {
        moves.push({ from, to, piece, captured: null, promotion: null, flag: null });
      } else {
        if (colorOf(target) !== color) {
          moves.push({ from, to, piece, captured: target, promotion: null, flag: null });
        }
        break;
      }
      r += dr;
      f += df;
    }
  }
}

const PROMOTION_PIECES = ["q", "r", "b", "n"];

function pushPawnAdvance(from, to, piece, captured, flag, promoRank, rank, moves) {
  if (rank === promoRank) {
    for (const promotion of PROMOTION_PIECES) {
      moves.push({ from, to, piece, captured, promotion, flag: "promo" });
    }
  } else {
    moves.push({ from, to, piece, captured, promotion: null, flag });
  }
}

function addPawnMoves(state, from, rank, file, moves) {
  const piece = state.board[from];
  const color = colorOf(piece);
  const dir = color === WHITE ? 1 : -1;
  const startRank = color === WHITE ? 1 : 6;
  const promoRank = color === WHITE ? 7 : 0;
  const oneRank = rank + dir;

  if (onBoard(oneRank, file) && !state.board[squareOf(oneRank, file)]) {
    pushPawnAdvance(from, squareOf(oneRank, file), piece, null, null, promoRank, oneRank, moves);
    if (rank === startRank) {
      const twoRank = rank + 2 * dir;
      if (!state.board[squareOf(twoRank, file)]) {
        moves.push({ from, to: squareOf(twoRank, file), piece, captured: null, promotion: null, flag: "double" });
      }
    }
  }

  for (const df of [-1, 1]) {
    const f = file + df;
    if (!onBoard(oneRank, f)) continue;
    const to = squareOf(oneRank, f);
    const target = state.board[to];
    if (target && colorOf(target) !== color) {
      pushPawnAdvance(from, to, piece, target, null, promoRank, oneRank, moves);
    } else if (!target && state.enPassant === to) {
      const capturedSquare = squareOf(rank, f);
      moves.push({
        from,
        to,
        piece,
        captured: state.board[capturedSquare],
        promotion: null,
        flag: "ep",
        epCapturedSquare: capturedSquare,
      });
    }
  }
}

const CASTLE_ROOK_HOME = { 0: "wq", 7: "wk", 56: "bq", 63: "bk" };

function addCastleMoves(state, from, moves) {
  const piece = state.board[from];
  const color = colorOf(piece);
  const rank = color === WHITE ? 0 : 7;
  if (from !== squareOf(rank, 4)) return;
  const opponent = color === WHITE ? BLACK : WHITE;
  const rookPiece = color === WHITE ? "R" : "r";

  if (state.castling[color === WHITE ? "wk" : "bk"]) {
    const pass1 = squareOf(rank, 5);
    const pass2 = squareOf(rank, 6);
    if (
      !state.board[pass1] &&
      !state.board[pass2] &&
      state.board[squareOf(rank, 7)] === rookPiece &&
      !isSquareAttacked(state, from, opponent) &&
      !isSquareAttacked(state, pass1, opponent) &&
      !isSquareAttacked(state, pass2, opponent)
    ) {
      moves.push({ from, to: pass2, piece, captured: null, promotion: null, flag: "castleK" });
    }
  }

  if (state.castling[color === WHITE ? "wq" : "bq"]) {
    const pass1 = squareOf(rank, 3);
    const pass2 = squareOf(rank, 2);
    const pass3 = squareOf(rank, 1);
    if (
      !state.board[pass1] &&
      !state.board[pass2] &&
      !state.board[pass3] &&
      state.board[squareOf(rank, 0)] === rookPiece &&
      !isSquareAttacked(state, from, opponent) &&
      !isSquareAttacked(state, pass1, opponent) &&
      !isSquareAttacked(state, pass2, opponent)
    ) {
      moves.push({ from, to: pass2, piece, captured: null, promotion: null, flag: "castleQ" });
    }
  }
}

export function generatePseudoMoves(state) {
  const moves = [];
  const { board, turn } = state;
  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (!piece || colorOf(piece) !== turn) continue;
    const type = piece.toLowerCase();
    const rank = rankOf(square);
    const file = fileOf(square);
    if (type === "p") {
      addPawnMoves(state, square, rank, file, moves);
    } else if (type === "n") {
      addStepMoves(state, square, rank, file, KNIGHT_DELTAS, moves);
    } else if (type === "k") {
      addStepMoves(state, square, rank, file, KING_DELTAS, moves);
      addCastleMoves(state, square, moves);
    } else if (type === "b") {
      addSlideMoves(state, square, rank, file, BISHOP_DIRS, moves);
    } else if (type === "r") {
      addSlideMoves(state, square, rank, file, ROOK_DIRS, moves);
    } else if (type === "q") {
      addSlideMoves(state, square, rank, file, QUEEN_DIRS, moves);
    }
  }
  return moves;
}

export function applyMove(state, move) {
  const next = cloneState(state);
  const { board } = next;
  const piece = move.piece;
  const color = colorOf(piece);

  next.enPassant = null;

  if (move.flag === "ep") {
    board[move.epCapturedSquare] = null;
  }

  board[move.from] = null;
  board[move.to] = move.promotion ? (color === WHITE ? move.promotion.toUpperCase() : move.promotion) : piece;

  if (move.flag === "castleK") {
    const rank = rankOf(move.from);
    board[squareOf(rank, 7)] = null;
    board[squareOf(rank, 5)] = color === WHITE ? "R" : "r";
  } else if (move.flag === "castleQ") {
    const rank = rankOf(move.from);
    board[squareOf(rank, 0)] = null;
    board[squareOf(rank, 3)] = color === WHITE ? "R" : "r";
  }

  if (move.flag === "double") {
    next.enPassant = (move.from + move.to) / 2;
  }

  if (piece.toLowerCase() === "k") {
    if (color === WHITE) {
      next.castling.wk = false;
      next.castling.wq = false;
    } else {
      next.castling.bk = false;
      next.castling.bq = false;
    }
  }
  if (CASTLE_ROOK_HOME[move.from]) next.castling[CASTLE_ROOK_HOME[move.from]] = false;
  if (CASTLE_ROOK_HOME[move.to]) next.castling[CASTLE_ROOK_HOME[move.to]] = false;

  next.turn = color === WHITE ? BLACK : WHITE;
  return next;
}

export function isSquareAttacked(state, square, byColor) {
  const { board } = state;
  const rank = rankOf(square);
  const file = fileOf(square);

  const pawnFromRank = byColor === WHITE ? rank - 1 : rank + 1;
  const pawnPiece = byColor === WHITE ? "P" : "p";
  for (const df of [-1, 1]) {
    const f = file + df;
    if (onBoard(pawnFromRank, f) && board[squareOf(pawnFromRank, f)] === pawnPiece) {
      return true;
    }
  }

  for (const [dr, df] of KNIGHT_DELTAS) {
    const r = rank + dr;
    const f = file + df;
    if (!onBoard(r, f)) continue;
    const p = board[squareOf(r, f)];
    if (p && p.toLowerCase() === "n" && colorOf(p) === byColor) return true;
  }

  for (const [dr, df] of KING_DELTAS) {
    const r = rank + dr;
    const f = file + df;
    if (!onBoard(r, f)) continue;
    const p = board[squareOf(r, f)];
    if (p && p.toLowerCase() === "k" && colorOf(p) === byColor) return true;
  }

  for (const [dr, df] of BISHOP_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (onBoard(r, f)) {
      const p = board[squareOf(r, f)];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === "b" || p.toLowerCase() === "q")) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  for (const [dr, df] of ROOK_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (onBoard(r, f)) {
      const p = board[squareOf(r, f)];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === "r" || p.toLowerCase() === "q")) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  return false;
}

function findKing(state, color) {
  return state.board.indexOf(color === WHITE ? "K" : "k");
}

export function isKingInCheck(state, color) {
  const kingSquare = findKing(state, color);
  const opponent = color === WHITE ? BLACK : WHITE;
  return isSquareAttacked(state, kingSquare, opponent);
}

export function generateLegalMoves(state) {
  const color = state.turn;
  const legal = [];
  for (const move of generatePseudoMoves(state)) {
    const next = applyMove(state, move);
    if (!isKingInCheck(next, color)) {
      legal.push(move);
    }
  }
  return legal;
}

export function perft(state, depth) {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) {
    nodes += perft(applyMove(state, move), depth - 1);
  }
  return nodes;
}

export function getStatus(state) {
  const legalMoves = generateLegalMoves(state);
  const inCheck = isKingInCheck(state, state.turn);
  return {
    inCheck,
    isCheckmate: inCheck && legalMoves.length === 0,
    isStalemate: !inCheck && legalMoves.length === 0,
    legalMoves,
  };
}
