const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  console.log("✅ New WebSocket connection");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("❌ Invalid JSON:", msg);
      return;
    }

    const { type, code, payload } = data;

    if (type === "create") {
      sessions[code] = { host: ws, guest: null };
      console.log(`📡 Session created: ${code}`);
    }

    else if (type === "join") {
      const session = sessions[code];
      if (!session || !session.host) {
        ws.send(JSON.stringify({ type: "error", message: "Session not found." }));
        console.warn(`⚠️ Join attempt failed for session: ${code}`);
        return;
      }

      session.guest = ws;
      session.host.send(JSON.stringify({ type: "guest-joined" }));
      console.log(`👥 Guest joined session: ${code}`);
    }

    else if (type === "signal") {
      const session = sessions[code];
      if (!session) return;

      const target = (session.host === ws) ? session.guest : session.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: "signal", payload }));
      }
    }

    else if (type === "input") {
      const session = sessions[code];
      if (!session || !session.host) return;
      if (session.host.readyState === WebSocket.OPEN) {
        session.host.send(JSON.stringify({ type: "input", payload }));
      }
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const s = sessions[code];
      if (s.host === ws || s.guest === ws) {
        delete sessions[code];
        console.log(`🗑️ Session ${code} closed`);
        break;
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
