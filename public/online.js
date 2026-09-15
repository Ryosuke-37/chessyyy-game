import { WHITE, BLACK, generateLegalMoves, colorOf } from "./rules.js";
import { buildPieceIcon, pieceLabel, isDarkSquare, addCornerMarkers, PIECE_NAMES } from "./render.js";
import { getActiveMode, setActiveMode } from "./active-mode.js";

const boardEl = document.getElementById("board");
const statusTextEl = document.getElementById("status-text");
const promotionModalEl = document.getElementById("promotion-modal");
const promotionChoicesEl = promotionModalEl.querySelector(".choices");

let ws = null;
let myRole = null; // "white" | "black" | "spectator"
let gameState = null;
let status = null;
let selected = null;

function clientIdFor(roomCode) {
  const key = `chessyyy-client-${roomCode}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function send(type, payload) {
  ws.send(JSON.stringify({ type, payload }));
}

export function connect(roomCode) {
  setActiveMode("online");
  gameState = null;
  status = null;
  selected = null;
  myRole = null;
  statusTextEl.textContent = "Connecting…";
  boardEl.innerHTML = "";

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}/ws/${roomCode}`);
  ws.addEventListener("open", () => send("join", { clientId: clientIdFor(roomCode) }));
  ws.addEventListener("message", (event) => handleMessage(JSON.parse(event.data)));
  ws.addEventListener("close", () => {
    if (getActiveMode() === "online") statusTextEl.textContent = "Disconnected";
  });
}

export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function resetGame() {
  if (myRole === "white" || myRole === "black") send("newGame", {});
}

function handleMessage(message) {
  if (message.type === "joined") {
    myRole = message.payload.role;
    gameState = message.payload.state;
    status = message.payload.status;
    selected = null;
    render();
  } else if (message.type === "state") {
    gameState = message.payload.state;
    status = message.payload.status;
    selected = null;
    render();
  } else if (message.type === "error") {
    statusTextEl.textContent = message.payload.message;
    setTimeout(() => {
      if (getActiveMode() === "online") updateStatusText();
    }, 1500);
  }
}

function roleLabel() {
  if (myRole === "white") return "You are White";
  if (myRole === "black") return "You are Black";
  return "You are spectating";
}

function updateStatusText() {
  if (!gameState) return;
  const toMove = gameState.turn === WHITE ? "White" : "Black";
  let text;
  if (status.isCheckmate) {
    const winner = gameState.turn === WHITE ? "Black" : "White";
    text = `Checkmate — ${winner} wins`;
  } else if (status.isStalemate) {
    text = "Stalemate — draw";
  } else if (status.inCheck) {
    text = `Check — ${toMove} to move`;
  } else {
    text = `${toMove} to move`;
  }
  statusTextEl.textContent = `${text} · ${roleLabel()}`;
  statusTextEl.classList.toggle("check", status.inCheck);
}

function findKingSquare(color) {
  return gameState.board.indexOf(color === WHITE ? "K" : "k");
}

function isMyTurn() {
  return (myRole === "white" && gameState.turn === WHITE) || (myRole === "black" && gameState.turn === BLACK);
}

function render() {
  updateStatusText();

  const legalDestinations = new Map();
  if (selected !== null && isMyTurn()) {
    for (const move of generateLegalMoves(gameState)) {
      if (move.from === selected && !legalDestinations.has(move.to)) {
        legalDestinations.set(move.to, move);
      }
    }
  }
  const kingInCheckSquare = status.inCheck ? findKingSquare(gameState.turn) : null;

  boardEl.innerHTML = "";
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = rank * 8 + file;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${isDarkSquare(square) ? "dark" : "light"}`;
      button.dataset.square = String(square);

      if (square === selected) button.classList.add("selected");
      if (square === kingInCheckSquare) button.classList.add("in-check");

      if (legalDestinations.has(square)) {
        if (gameState.board[square]) addCornerMarkers(button);
        else button.classList.add("legal-empty");
      }

      const piece = gameState.board[square];
      if (piece) {
        button.setAttribute("aria-label", pieceLabel(piece));
        button.appendChild(buildPieceIcon(piece));
      }

      boardEl.appendChild(button);
    }
  }
}

function openPromotionPicker(moves) {
  return new Promise((resolve) => {
    promotionChoicesEl.innerHTML = "";
    for (const move of moves) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      const promotedPiece = gameState.turn === WHITE ? move.promotion.toUpperCase() : move.promotion;
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

function handleSquareClick(square) {
  if (getActiveMode() !== "online") return;
  if (!gameState || status.isCheckmate || status.isStalemate) return;
  if (!isMyTurn()) return;

  const piece = gameState.board[square];
  const isOwnPiece = piece !== null && colorOf(piece) === gameState.turn;

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

  const movesToSquare = generateLegalMoves(gameState).filter(
    (move) => move.from === selected && move.to === square,
  );

  if (movesToSquare.length === 1) {
    send("move", { from: movesToSquare[0].from, to: movesToSquare[0].to, promotion: null });
    selected = null;
    render();
    return;
  }

  if (movesToSquare.length > 1) {
    openPromotionPicker(movesToSquare).then((move) => {
      send("move", { from: move.from, to: move.to, promotion: move.promotion });
      selected = null;
      render();
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
