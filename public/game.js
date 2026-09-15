import { createInitialState, generateLegalMoves, applyMove, colorOf, getStatus, WHITE } from "./rules.js";
import { findBestMove } from "./ai.js";
import { buildPieceIcon, pieceLabel, isDarkSquare, addCornerMarkers, PIECE_NAMES, renderCapturedBar } from "./render.js";
import { getActiveMode, setActiveMode } from "./active-mode.js";

const boardEl = document.getElementById("board");
const statusTextEl = document.getElementById("status-text");
const promotionModalEl = document.getElementById("promotion-modal");
const promotionChoicesEl = promotionModalEl.querySelector(".choices");
const capturedBarEls = {
  byWhiteEl: document.getElementById("captured-by-white"),
  byBlackEl: document.getElementById("captured-by-black"),
  leadEl: document.getElementById("material-lead"),
};

let state = createInitialState();
let selected = null;
let status = getStatus(state);
// null = both sides are human (Hot-Seat). WHITE or BLACK = the human's
// color; the other side is played automatically by ai.js (Vs Computer).
let humanColor = null;

function findKingSquare(color) {
  return state.board.indexOf(color === WHITE ? "K" : "k");
}

function updateStatusText() {
  const toMove = state.turn === WHITE ? "White" : "Black";
  if (status.isCheckmate) {
    const winner = state.turn === WHITE ? "Black" : "White";
    statusTextEl.textContent = `Checkmate — ${winner} wins`;
  } else if (status.isStalemate) {
    statusTextEl.textContent = "Stalemate — draw";
  } else if (status.inCheck) {
    statusTextEl.textContent = `Check — ${toMove} to move`;
  } else {
    statusTextEl.textContent = `${toMove} to move`;
  }
  statusTextEl.classList.toggle("check", status.inCheck);
}

function afterStateChange() {
  status = getStatus(state);
  selected = null;
  updateStatusText();
  render();
  maybeTriggerComputerMove();
}

function maybeTriggerComputerMove() {
  if (humanColor === null) return; // Hot-Seat: both sides are human
  if (status.isCheckmate || status.isStalemate) return;
  if (state.turn === humanColor) return; // waiting on the human

  statusTextEl.textContent = "Computer is thinking…";
  boardEl.classList.add("thinking");
  // Yield to the event loop first so the browser actually paints the
  // "thinking" status before the (synchronous) search runs.
  setTimeout(() => {
    const move = findBestMove(state, 2);
    state = applyMove(state, move);
    boardEl.classList.remove("thinking");
    afterStateChange();
  }, 50);
}

function openPromotionPicker(moves) {
  return new Promise((resolve) => {
    promotionChoicesEl.innerHTML = "";
    for (const move of moves) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      const promotedPiece = state.turn === WHITE ? move.promotion.toUpperCase() : move.promotion;
      button.appendChild(buildPieceIcon(promotedPiece));
      button.setAttribute("aria-label", `Promote to ${PIECE_NAMES[move.promotion]}`);
      button.addEventListener("click", () => {
        promotionModalEl.classList.remove("open");
        resolve(move);
      });
      promotionChoicesEl.appendChild(button);
    }
    promotionModalEl.classList.add("open");
  });
}

function render() {
  const legalDestinations = new Map();
  if (selected !== null) {
    for (const move of generateLegalMoves(state)) {
      if (move.from === selected && !legalDestinations.has(move.to)) {
        legalDestinations.set(move.to, move);
      }
    }
  }
  const kingInCheckSquare = status.inCheck ? findKingSquare(state.turn) : null;

  boardEl.innerHTML = "";
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = rank * 8 + file;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${isDarkSquare(square) ? "dark" : "light"}`;
      button.dataset.square = String(square);

      if (square === selected) {
        button.classList.add("selected");
      }

      if (square === kingInCheckSquare) {
        button.classList.add("in-check");
      }

      if (legalDestinations.has(square)) {
        if (state.board[square]) {
          addCornerMarkers(button);
        } else {
          button.classList.add("legal-empty");
        }
      }

      const piece = state.board[square];
      if (piece) {
        button.setAttribute("aria-label", pieceLabel(piece));
        button.appendChild(buildPieceIcon(piece));
      }

      boardEl.appendChild(button);
    }
  }

  renderCapturedBar(capturedBarEls, state.board);
}

function handleSquareClick(square) {
  if (getActiveMode() !== "local") return;
  if (status.isCheckmate || status.isStalemate) return;
  if (humanColor !== null && state.turn !== humanColor) return; // computer's turn

  const piece = state.board[square];
  const isOwnPiece = piece !== null && colorOf(piece) === state.turn;

  if (selected === null) {
    if (isOwnPiece) selected = square;
    render();
    return;
  }

  if (square === selected) {
    selected = null;
    render();
    return;
  }

  const movesToSquare = generateLegalMoves(state).filter(
    (move) => move.from === selected && move.to === square,
  );

  if (movesToSquare.length === 1) {
    state = applyMove(state, movesToSquare[0]);
    afterStateChange();
    return;
  }

  if (movesToSquare.length > 1) {
    // A pawn reaching the last rank offers 4 promotion choices to the
    // same destination square; let the player pick which piece it becomes.
    openPromotionPicker(movesToSquare).then((move) => {
      state = applyMove(state, move);
      afterStateChange();
    });
    return;
  }

  selected = isOwnPiece ? square : null;
  render();
}

boardEl.addEventListener("click", (event) => {
  const button = event.target.closest(".square");
  if (!button) return;
  handleSquareClick(Number(button.dataset.square));
});

export function resetGame() {
  // Hiding the modal (rather than just resolving it) stops its buttons
  // from being clickable, so a stale promotion choice from the previous
  // game can never be applied to the fresh position.
  promotionModalEl.classList.remove("open");
  boardEl.classList.remove("thinking");
  state = createInitialState();
  afterStateChange();
}

export function startGame(newHumanColor) {
  setActiveMode("local");
  humanColor = newHumanColor;
  resetGame();
}
