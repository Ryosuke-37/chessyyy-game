# Chessyyy — Feature Roadmap & Workplan

How to read this: every line item is a **checkbox task**. Each one lists what it **depends on** (must be done first), which **files** it touches, and its **Definition of Done (DoD)** — the concrete, testable condition that makes it "finished," not "looks about done." Work top to bottom; later phases assume earlier ones are checked off. Tell me a task number (e.g. "1.1" or "2.3") and I'll build just that one, commit it, push it, and open/update a pull request.

Order, as requested: **rules engine first (it's the foundation everything else stands on) → Hot-Seat live on the internet → Vs Computer → Online rooms → the optional extra (captured pieces).**

---

## Phase 0 — Project scaffolding

- [ ] **0.1 Initialize the Cloudflare Workers project**
  - Depends on: nothing (first task)
  - Files: `wrangler.jsonc`, `package.json`, `src/worker.js`, `public/index.html` (placeholder page)
  - DoD: `npx wrangler dev` serves the placeholder page at `http://localhost:8787`; `npx wrangler deploy` publishes it to a live `*.workers.dev` URL. `wrangler.jsonc` has `compatibility_date` set to today and `observability` enabled.

---

## Phase 1 — Chess rules engine (`rules.js`) — must be correct before anything else is built

- [ ] **1.1 Board representation and raw piece movement**
  - Depends on: 0.1
  - Files: `src/rules.js`
  - DoD: given any board position, generates every square each of the 6 piece types could physically move/attack (ignoring check for now).

- [ ] **1.2 Legal-move filtering (own-king-in-check exclusion)**
  - Depends on: 1.1
  - Files: `src/rules.js`
  - DoD: a move that would leave the mover's own king in check is excluded from the legal move list (covers pins and moving into check alike).

- [ ] **1.3 Special moves: castling, en passant, promotion**
  - Depends on: 1.2
  - Files: `src/rules.js`
  - DoD: all legality conditions for castling (§2.3 of ProductSpec) are enforced; en passant is only legal on the immediate next move; promotion requires an explicit piece choice (Q/R/B/N) rather than auto-picking one.

- [ ] **1.4 Check, checkmate, and stalemate detection**
  - Depends on: 1.2
  - Files: `src/rules.js`
  - DoD: correctly reports "in check," "checkmate," or "stalemate" for a given position and side to move.

- [ ] **1.5 Perft correctness test — the gate for everything below**
  - Depends on: 1.1, 1.2, 1.3, 1.4
  - Files: `test/perft.test.js`, `src/rules.js` (fixes as needed)
  - DoD: counting all possible games from the starting position gives **exactly** 20 at depth 1, 400 at depth 2, and 8,902 at depth 3. No phase below may start until this passes exactly.

---

## Phase 2 — Hot-Seat mode, deployed live on the internet (built first, per your priority)

- [ ] **2.1 Board UI matching the visual design spec**
  - Depends on: 1.5
  - Files: `public/index.html`, `public/styles.css`, `public/board.js`
  - DoD: 8×8 board renders with the warm slate gray (`#2C3440`) / birch cream (`#ECE7DE`) squares, Inter typeface, and neutral, uncluttered backdrop from ProductSpec §3. *(If you share a Figma file link before this task starts, it's checked pixel-for-pixel against that instead of the written spec alone.)*

- [ ] **2.2 Move interaction wired to the rules engine**
  - Depends on: 2.1
  - Files: `public/board.js` (imports `src/rules.js`)
  - DoD: selecting a piece glows its square with the amber-gold border; legal empty destinations show a translucent dot; legal capture squares show corner brackets; every other square is inert for that piece. It is impossible to complete an illegal move by any input method.

- [ ] **2.3 Full-game flow: turns, check/checkmate/stalemate display, promotion prompt**
  - Depends on: 2.2
  - Files: `public/board.js`, `public/styles.css`
  - DoD: a complete, legal game of chess can be played start-to-finish in Hot-Seat, including a working promotion piece-choice prompt and a clear end-of-game message for checkmate/stalemate.

- [ ] **2.4 "New game" control**
  - Depends on: 2.3
  - Files: `public/board.js`
  - DoD: resets the board to the starting position instantly, any time.

- [ ] **2.5 Deploy Hot-Seat live**
  - Depends on: 2.4
  - Files: `wrangler.jsonc` (if routing changes needed)
  - DoD: a friend with just the `*.workers.dev` link (no setup) can play a full two-person hot-seat game in a browser.

---

## Phase 3 — Vs Computer

- [ ] **3.1 Minimax + alpha-beta search (depth 2)**
  - Depends on: 1.5
  - Files: `src/ai.js`
  - DoD: given any legal position, returns a legal move for the side to move, searching 2 half-moves deep with alpha-beta pruning, in under 2 seconds.

- [ ] **3.2 Position evaluation (material count + basic heuristics)**
  - Depends on: 3.1
  - Files: `src/ai.js`
  - DoD: the computer reliably captures free/undefended pieces and avoids obviously losing material for nothing — spot-checked manually across a handful of sample positions.

- [ ] **3.3 Vs Computer mode UI (human = Black, computer = White)**
  - Depends on: 3.2, 2.2 (reuses the Hot-Seat board component)
  - Files: `public/index.html` (mode selection), `public/vs-computer.js`
  - DoD: full game playable per ProductSpec §1.2 — human always plays Black, a "Computer is thinking…" status shows while it calculates, and it always replies within 2 seconds or the game correctly ends (checkmate/stalemate) instead.

- [ ] **3.4 Deploy Vs Computer live**
  - Depends on: 3.3
  - DoD: playable at the public URL alongside Hot-Seat, selectable from a mode menu.

---

## Phase 4 — Online rooms

- [ ] **4.1 Durable Object binding + SQLite migration in `wrangler.jsonc`**
  - Depends on: 1.5
  - Files: `wrangler.jsonc`
  - DoD: a `ROOM` Durable Object binding exists, tagged `new_sqlite_classes`; `env.ROOM.getByName(roomCode)` resolves to a per-room instance.

- [ ] **4.2 Room Durable Object: WebSocket accept + seat assignment**
  - Depends on: 4.1
  - Files: `src/room.js`
  - DoD: connecting via WebSocket to a room assigns 1st connection = White, 2nd = Black, further connections = spectators; each socket's role is stored via `ws.serializeAttachment()` so it survives hibernation. Accepted with `ctx.acceptWebSocket()` — no library.

- [ ] **4.3 Server-authoritative move validation & broadcast**
  - Depends on: 4.2 (and reuses `src/rules.js` on the server)
  - Files: `src/room.js`
  - DoD: the Durable Object — not the browser — decides whether a submitted `{type, payload}` move message is legal; legal moves are saved to the Durable Object's SQLite storage **immediately** (no timers, ever) and broadcast to both connected players.

- [ ] **4.4 Refresh-to-rejoin**
  - Depends on: 4.3
  - Files: `src/room.js`, `public/online.js`
  - DoD: reloading the page and re-entering the same room code reconnects you to your original seat (White/Black/spectator) showing the exact current board — no moves lost, no re-dealing of seats.

- [ ] **4.5 Shared "New game" reset**
  - Depends on: 4.3
  - Files: `src/room.js`, `public/online.js`
  - DoD: either player triggering "New game" resets the room's board for both players immediately.

- [ ] **4.6 Room-code join/create screen**
  - Depends on: 4.2
  - Files: `public/online.js`, `public/index.html`
  - DoD: two different devices entering the same room code land in the same live game; a clear on-screen indicator shows which color you're playing (or "spectating").

- [ ] **4.7 Deploy Online mode live**
  - Depends on: 4.4, 4.5, 4.6
  - DoD: two people on two separate devices/networks can play a complete legal game live, end to end, per ProductSpec §1.3.

---

## Phase 5 — Optional extra (built LAST)

- [ ] **5.1 Captured pieces + material count**
  - Depends on: all of Phases 2–4 complete (shared UI component used by every mode)
  - Files: `public/board.js`, `public/styles.css`
  - DoD: captured pieces are displayed grouped by color next to the board in every mode; the numeric material difference (standard values P=1, N=3, B=3, R=5, Q=9) is shown, matching ProductSpec §6.

---

## Status

Nothing beyond this planning phase has been built yet. **Pick a task number and I'll build, test, commit, push, and open a PR for that one task at a time** — starting, necessarily, with 0.1 and then the Phase 1 rules engine, since every later phase depends on it.
