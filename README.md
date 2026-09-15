# Chessyyy

Chessyyy is a browser chess game with three ways to play:

1. **Hot-Seat** — two people share one screen and one keyboard/mouse, taking turns.
2. **Vs Computer** — you play Black; the browser itself calculates White's replies (no server round-trip needed for this mode).
3. **Online** — two people on two different devices type the same room code and play live, each move appearing on the other's screen within a second or two.

This document is the **README, written by the AI Systems Architect** (that's me, Claude, acting in an architecture-decisions role for this project). It explains *what* we're building and, more importantly, *why* it's built this way — in plain English, for a reader with no coding background. If you want the feature-by-feature build order, see `FEATUREROADMAP_workplan.md`. If you want the exact rules, look, and behavior the finished game must have, see `ProductSpec.md`.

---

## Glossary (each term defined once, here)

- **Browser** — the program you're reading this in (Chrome, Safari, etc.). "Runs in the browser" means the code executes on your own computer/phone, not on a remote server.
- **Server** — a computer elsewhere on the internet that our game code also runs on, used only when players need to be kept in sync (i.e., only for Online mode).
- **Cloudflare Workers** — the hosting service we use to run our server code. Think of it as "rent a tiny slice of a global computer network" rather than renting one physical machine. It's serverless (see below), fast, and has a generous free tier.
- **Serverless** — you don't manage an actual machine (no operating system to patch, no "server is down" pages); you upload code and the hosting provider runs it on demand, anywhere in the world, close to whoever's using it.
- **Static site / static assets** — the fixed files (HTML, CSS, JavaScript, images) that make up the game's look and board logic. These are served as-is to every visitor, the same way a PDF is served — no server computation needed to view them.
- **Durable Object (DO)** — a special Cloudflare Workers feature that gives one small piece of server code its own persistent memory and a fixed identity (like "the record-keeper for room ABC123"). We use one Durable Object per online game room, so each room has its own referee that remembers the board and the two players in it.
- **SQLite-backed Durable Object** — a Durable Object that saves its data into a small embedded database (SQLite) rather than just RAM, so the room survives even if Cloudflare moves it to a different machine.
- **WebSocket** — a technology that keeps a phone line open between a browser and a server, instead of the browser having to repeatedly ask "anything new?" (which is how normal web pages work). We use it so that when your opponent moves, you see it appear almost instantly.
- **Module** — a single, self-contained file of code with one job. `rules.js` is the module whose only job is "know the rules of chess."
- **Minimax** — a simple algorithm for game-playing computer opponents: it looks a few moves ahead, imagines the opponent always making their best possible reply, and picks the move that leads to the best outcome for itself in the worst case.
- **Alpha-beta pruning** — a shortcut for minimax that skips exploring moves it can already prove won't be chosen, so the computer can "think" faster without changing the answer it would have given anyway.
- **Depth** (in game-tree search) — how many moves ahead the computer calculates. "Depth 2" means: my move, then your best reply — two half-moves (one from each side) of lookahead.
- **En passant, castling, promotion** — special chess moves. Defined fully in `ProductSpec.md`.
- **Perft test** ("performance test", standard chess-programming term) — a way to prove a chess rules engine is correct: from the starting position, count *exactly* how many different games are possible after 1, 2, or 3 moves. If your engine's count matches the known-correct numbers (20, then 400, then 8,902), your move rules have no bugs that create illegal or missing moves.
- **Room code** — a short text code (like "TIGER42") that both online players type in, so the server knows to put them in the same game together.
- **Figma** — the design tool used to draw exactly how the game should look (colors, spacing, button states) before any code is written, so the visual result isn't left to guesswork.
- **PR (Pull Request)** — a proposed set of code changes, submitted for review before it's merged into the project's main version. Every feature in this project ships as its own PR.

---

## Why these architecture choices?

**Why Cloudflare Workers instead of a traditional server?**
It's free at our scale, requires no server maintenance, and gives us both static file hosting (for the board and menus) and the WebSocket-capable compute (for Online mode) in one product, under one bill (free).

**Why one Durable Object per room, instead of one big shared server process?**
Isolation and simplicity. Each room's Durable Object is the single source of truth for that one game only — it can't accidentally mix up moves between two unrelated games, and if one room misbehaves, it doesn't affect any other room. It also means the room's state (whose turn, board position, who's connected) lives in exactly one place, so there's never a disagreement between two servers about what happened.

**Why save the SQLite-backed Durable Object state after every single move, instead of using a timer to save periodically?**
If a player's browser refreshes or their internet blips, the game must resume exactly where it left off — no "we lost the last two moves" bugs. Saving after every move (rather than on a timer) means there is never a gap where an unsaved move could be lost, and it avoids running background timers at all, which Cloudflare's free plan is not built for.

**Why write our own chess rules (`rules.js`) instead of using an existing chess library?**
Two reasons. First, it's a hard requirement for this project (a learning/craftsmanship goal — we prove our own code is correct via the perft test above, rather than trusting someone else's black box). Second, using one shared module for hot-seat, vs-computer, *and* the online server means the rules can only be correct or incorrect in one place — we never have "the browser thinks this move is legal but the server disagrees," a common source of hard-to-find bugs in online games.

**Why does the computer opponent run in the browser instead of on the server?**
Vs Computer is a single-player experience with no need to sync two devices, so there's no reason to pay for a network round-trip to a server. Depth-2 minimax with alpha-beta pruning is light enough that your own browser can calculate White's best reply in well under two seconds, keeping this mode instant and free to run at any scale.

**Why native WebSockets instead of a library like Socket.IO?**
Cloudflare Workers' Durable Objects have first-class built-in support for accepting WebSocket connections directly (`ctx.acceptWebSocket()`). Socket.IO, Express, and `ws` are all designed for traditional always-on Node.js servers, which is not the environment Workers provides — and we don't need their extra features (like automatic fallback to older browsers) for a modern two-player game.

---

## Tech stack

- **Frontend:** Plain HTML, CSS, and JavaScript. No frameworks (no React). Chosen for transparency and to keep the "no black boxes" theme consistent — everything is code we wrote and can read.
- **Typeface:** [Inter](https://rsms.me/inter/), a clean geometric sans-serif, loaded per the Figma design spec.
- **Backend:** Cloudflare Workers + one SQLite-backed Durable Object class per game room.
- **Shared rules engine:** `rules.js` — one module, no dependencies, imported by the hot-seat board, the vs-computer AI, and the online server.
- **Hosting/deploy config:** `wrangler.jsonc` (Cloudflare's project configuration file).

## Repository structure (grows as features land — see the workplan)

```
chessyyy-game/
├── README.md                        ← this file
├── ProductSpec.md                   ← exact behavior, rules scope, and visual spec
├── FEATUREROADMAP_workplan.md       ← ordered, checkbox build plan
├── wrangler.jsonc                   ← Cloudflare Workers configuration (added in Phase 0)
├── src/
│   ├── rules.js                     ← the one shared chess rules module
│   ├── worker.js                    ← Worker entry point (routes + Durable Object export)
│   ├── room.js                      ← the Durable Object class (one instance per online room)
│   └── ai.js                        ← minimax/alpha-beta computer opponent
└── public/                          ← static assets (HTML/CSS/JS/images) served to the browser
```

## Running this project locally (once code exists)

```bash
npm install
npx wrangler dev
```

`wrangler dev` runs the whole Worker (static assets + Durable Object) on your own machine at `http://localhost:8787`, identically to how it will run once deployed, so what you test locally is what ships.

## Deploying

```bash
npx wrangler deploy
```

This uploads the static assets and Worker code to Cloudflare's free plan and gives you a live `*.workers.dev` URL.

---

*Architecture and this document by the AI Systems Architect (Claude). See `FEATUREROADMAP_workplan.md` to pick the first task.*
