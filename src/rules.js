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

function addPawnMoves(state, from, rank, file, moves) {
  const piece = state.board[from];
  const color = colorOf(piece);
  const dir = color === WHITE ? 1 : -1;
  const startRank = color === WHITE ? 1 : 6;
  const oneRank = rank + dir;

  if (onBoard(oneRank, file) && !state.board[squareOf(oneRank, file)]) {
    moves.push({ from, to: squareOf(oneRank, file), piece, captured: null, promotion: null, flag: null });
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
      moves.push({ from, to, piece, captured: target, promotion: null, flag: null });
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
  board[move.from] = null;
  board[move.to] = piece;

  if (move.flag === "double") {
    next.enPassant = (move.from + move.to) / 2;
  }

  next.turn = color === WHITE ? BLACK : WHITE;
  return next;
}
