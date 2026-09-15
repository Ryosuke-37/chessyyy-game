import * as localGame from "./game.js";
import * as onlineGame from "./online.js";
import { BLACK } from "./rules.js";
import { setActiveMode } from "./active-mode.js";

const modeSelectEl = document.getElementById("mode-select");
const onlineJoinEl = document.getElementById("online-join");
const gameEl = document.getElementById("game");
const roomCodeInputEl = document.getElementById("room-code-input");

let currentMode = null; // "local" | "online"

function showModeSelect() {
  if (currentMode === "online") onlineGame.disconnect();
  currentMode = null;
  setActiveMode(null);
  modeSelectEl.hidden = false;
  onlineJoinEl.hidden = true;
  gameEl.hidden = true;
}

function enterLocalGame(humanColor) {
  currentMode = "local";
  modeSelectEl.hidden = true;
  gameEl.hidden = false;
  localGame.startGame(humanColor);
}

function enterOnlineJoinScreen() {
  modeSelectEl.hidden = true;
  onlineJoinEl.hidden = false;
  roomCodeInputEl.value = "";
  roomCodeInputEl.focus();
}

function joinOnlineRoom() {
  const roomCode = roomCodeInputEl.value.trim().toUpperCase();
  if (!roomCode) return;
  currentMode = "online";
  onlineJoinEl.hidden = true;
  gameEl.hidden = false;
  onlineGame.connect(roomCode);
}

document.getElementById("mode-hotseat").addEventListener("click", () => enterLocalGame(null));
document.getElementById("mode-vs-computer").addEventListener("click", () => enterLocalGame(BLACK));
document.getElementById("mode-online").addEventListener("click", enterOnlineJoinScreen);
document.getElementById("online-back-button").addEventListener("click", showModeSelect);
document.getElementById("join-room-button").addEventListener("click", joinOnlineRoom);
roomCodeInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinOnlineRoom();
});

document.getElementById("menu-button").addEventListener("click", showModeSelect);

document.getElementById("new-game-button").addEventListener("click", () => {
  if (currentMode === "local") localGame.resetGame();
  else if (currentMode === "online") onlineGame.resetGame();
});
