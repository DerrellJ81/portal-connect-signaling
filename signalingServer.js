const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  console.log("✅ New client connected");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.warn("⚠️ Invalid JSON received");
      return;
    }

    const { type, code, payload } = data;

    if (type === "create") {
      sessions[code] = { host: ws, guest: null };
      console.log(`📡 Session created: ${code}`);
    }

    else if (type === "join") {
      if (!sessions[code]) {
        ws.send(JSON.stringify({ type: "error", message: "Session not found." }));
        console.warn(`❌ Attempted join on invalid session: ${code}`);
        return;
      }

      sessions[code].guest = ws;

      try {
        sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        console.log(`🔗 Guest joined session: ${code}`);
      } catch (e) {
        console.warn(`⚠️ Failed to notify host for session ${code}`);
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
      if (session && session.host && session.host.readyState === WebSocket.OPEN) {
        session.host.send(JSON.stringify({ type: "input", payload }));
      }
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const session = sessions[code];
      if (session.host === ws || session.guest === ws) {
        console.log(`❌ Session closed: ${code}`);
        delete sessions[code];
        break;
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
