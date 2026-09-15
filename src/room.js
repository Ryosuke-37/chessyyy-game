// Durable Object: one instance per online room, obtained via
// env.ROOM.getByName(roomCode). SQLite-backed (new_sqlite_classes in
// wrangler.jsonc). Seat assignment and move validation land in the next
// two tasks; this is just enough to accept a WebSocket connection.
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
}
