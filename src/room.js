import { createInitialState } from "../public/rules.js";

// Durable Object: one instance per online room, obtained via
// env.ROOM.getByName(roomCode). SQLite-backed (new_sqlite_classes in
// wrangler.jsonc). Storage is written immediately after every change -
// no alarms/timers, so a room can never lose a move to an unsaved gap.
export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async getGameState() {
    let gameState = await this.ctx.storage.get("gameState");
    if (!gameState) {
      gameState = createInitialState();
      await this.ctx.storage.put("gameState", gameState);
    }
    return gameState;
  }

  async getSeats() {
    let seats = await this.ctx.storage.get("seats");
    if (!seats) {
      seats = { white: null, black: null };
      await this.ctx.storage.put("seats", seats);
    }
    return seats;
  }

  // Seats are keyed by a random client-held id (see public/online.js),
  // not by connection, so a refreshed page can reclaim its color instead
  // of being treated as a brand-new player.
  async assignSeat(clientId) {
    const seats = await this.getSeats();
    if (seats.white === clientId) return "white";
    if (seats.black === clientId) return "black";
    if (seats.white === null) {
      seats.white = clientId;
      await this.ctx.storage.put("seats", seats);
      return "white";
    }
    if (seats.black === null) {
      seats.black = clientId;
      await this.ctx.storage.put("seats", seats);
      return "black";
    }
    return "spectator";
  }

  async webSocketMessage(ws, messageData) {
    let message;
    try {
      message = JSON.parse(messageData);
    } catch {
      return;
    }

    if (message.type === "join") {
      await this.handleJoin(ws, message.payload);
    }
  }

  async handleJoin(ws, payload) {
    const clientId = String(payload?.clientId ?? "");
    if (!clientId) return;

    const role = await this.assignSeat(clientId);
    ws.serializeAttachment({ clientId, role });

    const gameState = await this.getGameState();
    ws.send(JSON.stringify({ type: "joined", payload: { role, state: gameState } }));
  }
}
