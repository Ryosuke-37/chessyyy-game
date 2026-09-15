# Chessyyy — Product Specification

This document defines exactly what the finished game must do and look like. Anything not written here is out of scope by default (see "Not in Scope" at the end). Terms are defined once in `README.md`'s glossary — refer there if a word is unfamiliar.

## 1. The three modes

### 1.1 Hot-Seat
- Two people share one device and one board.
- After White moves, the board flips or stays (design decision left to the Figma flow — see §3) and it becomes Black's turn.
- No accounts, no server needed — this mode runs entirely as static files in the browser.
- A "New game" control resets the board to the starting position at any time.

### 1.2 Vs Computer
- The human always plays **Black**. The browser (not a server) plays White.
- After the human moves, the browser calculates White's reply using minimax with alpha-beta pruning at **depth 2** (see README glossary) and **always returns a legal move within 2 seconds**.
- If the computer has no legal move, the game ends (checkmate or stalemate — see §2.2) instead of the computer "moving."
- A "New game" control resets the board and starts a fresh game with the human to move first as Black... meaning White (computer) actually moves first automatically. See implementation note in the workplan.

### 1.3 Online
- Two people on two different devices each type the same **room code** into a text box to join the same game.
- **First person to join plays White. Second person to join plays Black. Anyone joining after that is a spectator (watch-only, no moving pieces).**
- The **server is the referee**: it is the only party that decides whether a submitted move is legal and updates the official board. A browser proposing an illegal move is simply rejected by the server; the browser's own display must not get out of sync with the server's ruling.
- **Refreshing the page rejoins the same game** in the same seat (White stays White, Black stays Black), showing the current board exactly as the server has it — no lost moves, no need to re-share the room code.
- **"New game" resets the board for both players** — either player triggering it restarts that same room back to the starting position, still with the same two seats (White/Black) assigned as before.
- Moves appear on the opponent's screen live (via WebSocket — see README) without the page needing to be refreshed.

## 2. Full chess rules scope

All modes share one rules engine (`rules.js` — see README) that must correctly implement:

### 2.1 Standard piece movement
- Pawn (including two-square first move, diagonal captures only)
- Knight, Bishop, Rook, Queen, King — standard movement and capture patterns
- A move that would leave the moving player's own king in check is illegal and must be unselectable.

### 2.2 Game-ending conditions
- **Check** — the side to move must be visually informed their king is under attack (see §3.4).
- **Checkmate** — the side to move is in check with no legal move that escapes it. Game ends, winner declared.
- **Stalemate** — the side to move is not in check but has no legal move at all. Game ends, declared a draw.

### 2.3 Special moves
- **Castling** (kingside and queenside), including all standard legality conditions: neither king nor the chosen rook has moved yet, no pieces between them, and the king does not pass through, start in, or land on a square under attack.
- **En passant**: a pawn that advances two squares past an enemy pawn on an adjacent file may be captured "as it passes," but only on the very next move.
- **Promotion**: a pawn reaching the far rank must be promoted. The player is asked to **choose which piece** (Queen, Rook, Bishop, or Knight) — this choice must be presented as a UI prompt, never auto-chosen.

### 2.4 Illegal moves must be impossible
The UI must never let a player complete an illegal move — not "allow then reject with an error message," but actually prevent the drag/click/drop from landing. Concretely: when a piece is selected, only its legal destination squares are interactive/highlighted (see §3.3); everything else does not accept that piece.

### 2.5 Correctness proof: perft test
Before any UI or game mode is built, `rules.js` must pass a **move-count (perft) test** from the standard starting position:

| Depth | Expected legal move count |
|---|---|
| 1 | 20 |
| 2 | 400 |
| 3 | 8,902 |

This test is the literal Definition of Done for the rules engine — it either matches these three numbers exactly, or the rules engine is not finished. See `FEATUREROADMAP_workplan.md`, Phase 1.

## 3. Visual design ("Scandinavian" look)

> **Note on Figma:** No specific Figma file/URL has been shared with this session yet. The palette, states, and typography below are transcribed directly from the design brief and should be treated as the source of truth until an actual Figma file is linked — at that point, screens should be checked pixel-by-pixel against it and this section updated with the file link. **Action for you:** if you have a Figma file for Chessyyy, share its URL and I'll pull exact colors/spacing/components from it before Phase 2 (Hot-Seat) begins.

### 3.1 Palette
- **Dark squares:** warm slate gray — `#2C3440`
- **Light squares:** soft birch cream — `#ECE7DE`
- **Background:** an uncluttered, neutral backdrop (not pure white/black — a quiet neutral tone that doesn't compete with the board) surrounding the board with generous empty space ("distraction-free").
- **Selection highlight:** amber-gold border glow around a selected piece's square.

### 3.2 Typography
- **Typeface:** Inter — a clean, geometric sans-serif — for all UI text (labels, buttons, room codes, captured-piece counts).

### 3.3 Move indicators (only shown for the currently selected piece)
- **Empty legal destination square:** a small, subtle, translucent dot centered on the square.
- **Legal destination square containing a capturable opponent piece:** high-contrast corner brackets framing that square (not a dot — capture squares are visually distinct from empty ones).

### 3.4 Check / game-end states
- A king in check must be visually distinguished (exact treatment — e.g. a red-tinted square glow — to be confirmed against Figma; use a clearly alarming but palette-consistent treatment in the meantime, e.g. a warm red-orange square tint).
- Checkmate/stalemate must show an unambiguous end-of-game message naming the result and offering "New game."

### 3.5 Mode-specific UI
- **Hot-Seat:** a single board, a turn indicator (whose move it is), "New game."
- **Vs Computer:** a single board (human plays Black), a status line ("Computer is thinking…" while it calculates), "New game."
- **Online:** a room-code entry screen (join or create), then the board with a clear indicator of which color you are, a connection-status indicator, and "New game" (with a confirmation, since it affects the other player too).

## 4. Technical constraints (non-negotiable — see README for the "why")

- **Hosting:** Cloudflare Workers, **Free plan only**. No paid features.
- **Static hosting:** the site's HTML/CSS/JS ships via Workers' `assets` configuration in `wrangler.jsonc`, with `not_found_handling` set to `"single-page-application"`.
- **WebSocket routing:** the online-mode WebSocket path must set `run_worker_first` so it reaches our Worker code instead of being served as a static asset.
- **Compatibility date:** `compatibility_date` in `wrangler.jsonc` is set to the date the config is written (kept current — "today").
- **Observability:** enabled in `wrangler.jsonc`, so we can see logs/metrics on the Cloudflare dashboard.
- **Rules engine:** exactly one module, `src/rules.js`, with zero external dependencies (no `chess.js`, no third-party engine), imported by hot-seat, vs-computer, and the online server alike. Its correctness is proven by the perft test in §2.5.
- **Server transport:** no Socket.IO, no Express, no `ws` package. Cloudflare Workers' native WebSocket support only:
  - One **SQLite-backed Durable Object** per room, obtained via `env.ROOM.getByName(roomCode)`.
  - The Durable Object class is registered with the `"new_sqlite_classes"` migration tag in `wrangler.jsonc`.
  - Connections are accepted with `ctx.acceptWebSocket()` (the Hibernation-API-compatible native method), not a library.
  - All messages are JSON objects shaped `{ "type": "...", "payload": { ... } }`.
  - Player identity (which connected socket is White vs. Black vs. a spectator) is stored via `ws.serializeAttachment()`, so it survives Durable Object hibernation.
  - **No timers of any kind.** The authoritative board position is written to the Durable Object's SQLite storage immediately after every accepted move — never on an interval, never "eventually."

## 5. Definition of Done (project-wide)

The project is complete when:
- [ ] `rules.js` passes the perft test in §2.5 exactly (20 / 400 / 8,902).
- [ ] All six piece types move and capture correctly in every mode.
- [ ] Check, checkmate, and stalemate are correctly detected and displayed in every mode.
- [ ] Castling, en passant, and promotion (with a piece-choice prompt) all work correctly in every mode.
- [ ] It is literally impossible to make an illegal move in the UI, in any mode.
- [ ] Vs Computer always replies with a legal move in under 2 seconds, at search depth 2.
- [ ] Online mode: seat assignment (1st = White, 2nd = Black, rest = spectators), server-authoritative move validation, refresh-to-rejoin, and shared "New game" all work as specified.
- [ ] The board and UI match the palette, typography, and move-indicator spec in §3 (updated against a real Figma file if/when one is linked).
- [ ] (Optional, built last) Captured pieces and running material count are displayed per §6.

## 6. Optional extra (built LAST, after everything above)

**Captured pieces + material count:** as pieces are captured, show them (grouped by color) alongside the board, along with the numeric material difference (using standard values: pawn=1, knight=3, bishop=3, rook=5, queen=9), e.g. "+3" next to the side currently ahead in material.

## 7. Not in scope

Explicitly excluded from this project: user accounts/logins, chess clocks/timers, ratings/rankings, draw by threefold repetition, draw by the fifty-move rule, opening books/databases, move export (PGN or similar), and React (or any UI framework) — plain HTML, CSS, and JavaScript only.
