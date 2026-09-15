// Board-rendering helpers shared by every mode's UI (game.js for
// Hot-Seat/Vs Computer, online.js for Online), so the piece icons and
// square geometry exist in exactly one place.
const SVG_NS = "http://www.w3.org/2000/svg";

// Minimalist original geometric icons (not a copy of any existing chess
// font or piece set), drawn on a 24x24 grid. Color comes entirely from
// CSS (.piece.white / .piece.black), not from the shapes themselves, so
// rendering never depends on the browser's own font/emoji fallback.
const PIECE_SHAPES = {
  p: [
    { tag: "circle", attrs: { cx: 12, cy: 7, r: 3.2 } },
    { tag: "path", attrs: { d: "M8.5 12 L15.5 12 L17 19 L7 19 Z" } },
    { tag: "rect", attrs: { x: 5.5, y: 19, width: 13, height: 2, rx: 1 } },
  ],
  r: [
    { tag: "rect", attrs: { x: 6, y: 9, width: 12, height: 9 } },
    { tag: "rect", attrs: { x: 6, y: 4.5, width: 3, height: 4 } },
    { tag: "rect", attrs: { x: 10.5, y: 4.5, width: 3, height: 4 } },
    { tag: "rect", attrs: { x: 15, y: 4.5, width: 3, height: 4 } },
    { tag: "rect", attrs: { x: 5, y: 18, width: 14, height: 2.5, rx: 1 } },
  ],
  n: [
    {
      tag: "path",
      attrs: {
        d: "M7 19 L7 14 C7 10 9 8 12 8 C11 6.5 12.5 5 14.5 5.3 C13.8 6.2 13.8 7 14.6 7.6 C16.8 8.2 18 10 17 12 L18.5 13 L16.3 13.3 L15 15.3 L17 19 Z",
      },
    },
    { tag: "rect", attrs: { x: 6, y: 19, width: 12, height: 2, rx: 1 } },
  ],
  b: [
    { tag: "circle", attrs: { cx: 12, cy: 5, r: 1.5 } },
    {
      tag: "path",
      attrs: { d: "M12 7 C8.5 9.5 8.5 14.5 10.5 18 L13.5 18 C15.5 14.5 15.5 9.5 12 7 Z" },
    },
    { tag: "rect", attrs: { x: 9, y: 18, width: 6, height: 2, rx: 1 } },
  ],
  q: [
    { tag: "circle", attrs: { cx: 6, cy: 9, r: 1.3 } },
    { tag: "circle", attrs: { cx: 12, cy: 7, r: 1.3 } },
    { tag: "circle", attrs: { cx: 18, cy: 9, r: 1.3 } },
    { tag: "path", attrs: { d: "M6 18 L18 18 L16.5 10 L14 12.5 L12 8 L10 12.5 L7.5 10 Z" } },
    { tag: "rect", attrs: { x: 7, y: 18, width: 10, height: 2, rx: 1 } },
  ],
  k: [
    { tag: "rect", attrs: { x: 11, y: 4, width: 2, height: 5 } },
    { tag: "rect", attrs: { x: 9, y: 6, width: 6, height: 2 } },
    { tag: "path", attrs: { d: "M7 18 L17 18 L16 11 L8 11 Z" } },
    { tag: "rect", attrs: { x: 7, y: 18, width: 10, height: 2, rx: 1 } },
  ],
};

export function buildPieceIcon(piece) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `piece ${piece === piece.toUpperCase() ? "white" : "black"}`);
  svg.setAttribute("aria-hidden", "true");
  for (const shape of PIECE_SHAPES[piece.toLowerCase()]) {
    const el = document.createElementNS(SVG_NS, shape.tag);
    for (const [name, value] of Object.entries(shape.attrs)) {
      el.setAttribute(name, String(value));
    }
    svg.appendChild(el);
  }
  return svg;
}

export const PIECE_NAMES = { p: "pawn", r: "rook", n: "knight", b: "bishop", q: "queen", k: "king" };

export function pieceLabel(piece) {
  const color = piece === piece.toUpperCase() ? "White" : "Black";
  return `${color} ${PIECE_NAMES[piece.toLowerCase()]}`;
}

export function isDarkSquare(square) {
  const rank = Math.floor(square / 8);
  const file = square % 8;
  return (rank + file) % 2 === 0;
}

export function addCornerMarkers(button) {
  for (const corner of ["tl", "tr", "bl", "br"]) {
    const marker = document.createElement("span");
    marker.className = `corner corner-${corner}`;
    button.appendChild(marker);
  }
}
