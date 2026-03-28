import { type ServerWebSocket } from "bun";
import type { Client, Message, Room } from "./types";

const rooms = new Map<string, Room>();

function getOrCreateRoom(code: string): Room {
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      state: { url: null, time: 0, paused: true },
      clients: [],
      hostId: null,
    });
  }
  return rooms.get(code)!;
}

Bun.serve<Client>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code || !/^\d{6}$/.test(code)) {
      return new Response("Invalid room code", { status: 400 });
    }
    const success = server.upgrade(req, {
      data: {
        id: Math.random().toString(36).substring(2, 10),
        code,
      },
    });
    if (success) return undefined;
    return new Response("Expected a WebSocket connection", { status: 400 });
  },
  websocket: {
    open(ws) {
      const room = getOrCreateRoom(ws.data.code);
      room.clients.push(ws);
      if (room.hostId === null) room.hostId = ws.data.id;
      const isHost = room.hostId === ws.data.id;
      console.log(`[${ws.data.code}] [${ws.data.id}] Connected${isHost ? " as host" : ""}`);

      if (room.state.url != null) {
        const msg: Message = {
          type: "sync",
          payload: {
            action: room.state.paused ? "pause" : "play",
            time: room.state.time,
            url: room.state.url,
          },
        };
        ws.send(JSON.stringify(msg));
      }
    },
    message(ws, data) {
      try {
        const room = rooms.get(ws.data.code);
        if (!room) return;

        const message = JSON.parse(data.toString()) as Message;
        const { action, time, url } = message.payload;
        console.log(
          `[${ws.data.code}] [${ws.data.id}]${room.hostId === ws.data.id ? " (host)" : ""} ${action} @ ${time}s`,
        );

        room.state.url = url;
        room.state.time = time;
        if (action === "pause") room.state.paused = true;
        else if (action === "play") room.state.paused = false;

        // only broadcast sync from the current host of the room
        if (action === "sync" && ws.data.id !== room.hostId) return;

        broadcast(room, message, ws);
      } catch (err) {
        console.error("Message error:", err);
      }
    },
    close(ws) {
      const room = rooms.get(ws.data.code);
      if (!room) return;

      const index = room.clients.findIndex((c) => c.data.id === ws.data.id);
      if (index !== -1) room.clients.splice(index, 1);

      if (ws.data.id === room.hostId) {
        room.hostId = room.clients.length > 0 ? room.clients[0]!.data.id : null;
        if (room.hostId) console.log(`[${ws.data.code}] [${room.hostId}] Promoted to host`);
      }

      if (room.clients.length === 0) rooms.delete(ws.data.code);

      console.log(
        `[${ws.data.code}] [${ws.data.id}] Disconnected. Remaining: ${room.clients.length}`,
      );
    },
  },
});

function broadcast(room: Room, message: Message, exclude?: ServerWebSocket<Client>) {
  const payload = JSON.stringify(message);
  for (const client of room.clients) {
    if (client === exclude) continue;
    client.send(payload);
  }
}
