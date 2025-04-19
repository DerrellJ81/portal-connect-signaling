const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

console.log(`✅ Signaling server running on port ${PORT}`);

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("❌ Invalid message received:", msg);
      return;
    }

    const { type, code, payload } = data;

    if (type === "create") {
      sessions[code] = { host: ws, guest: null };
      console.log(`🎮 Session created: ${code}`);
    }

    else if (type === "join") {
      const session = sessions[code];
      if (session && session.host) {
        session.guest = ws;
        console.log(`🙋 Guest joined session: ${code}`);
        session.host.send(JSON.stringify({ type: "guest-joined" }));
      } else {
        console.warn(`⚠️ Tried to join nonexistent session: ${code}`);
        ws.send(JSON.stringify({ type: "error", message: "Session not found." }));
      }
    }

    else if (type === "signal") {
      const session = sessions[code];
      if (!session) return;

      const target = session.host === ws ? session.guest : session.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: "signal", payload }));
      }
    }

    else if (type === "input") {
      const session = sessions[code];
      if (session?.host && session.host.readyState === WebSocket.OPEN) {
        session.host.send(JSON.stringify({ type: "input", payload }));
      }
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const { host, guest } = sessions[code];
      if (host === ws || guest === ws) {
        console.log(`🔌 Session closed: ${code}`);
        delete sessions[code];
        break;
      }
    }
  });
});
