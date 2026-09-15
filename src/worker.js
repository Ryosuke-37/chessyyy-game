import { Room } from "./room.js";

export { Room };

const ROOM_PATH = /^\/ws\/([A-Za-z0-9]{1,16})$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(ROOM_PATH);
    if (match) {
      const roomCode = match[1].toUpperCase();
      const stub = env.ROOM.getByName(roomCode);
      return stub.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  },
};
