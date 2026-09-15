import { startGame } from "./game.js";
import { BLACK } from "./rules.js";

const modeSelectEl = document.getElementById("mode-select");
const gameEl = document.getElementById("game");

function enterGame(humanColor) {
  modeSelectEl.hidden = true;
  gameEl.hidden = false;
  startGame(humanColor);
}

document.getElementById("mode-hotseat").addEventListener("click", () => enterGame(null));
document.getElementById("mode-vs-computer").addEventListener("click", () => enterGame(BLACK));

document.getElementById("menu-button").addEventListener("click", () => {
  gameEl.hidden = true;
  modeSelectEl.hidden = false;
});
