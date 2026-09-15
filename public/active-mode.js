// game.js (Hot-Seat/Vs Computer) and online.js both attach a click
// listener to the same #board element, since only one of them is ever
// showing at a time. This tells each one whether it's the one currently
// in charge, so only one of them actually reacts to a click.
let activeMode = null;

export function getActiveMode() {
  return activeMode;
}

export function setActiveMode(mode) {
  activeMode = mode;
}
