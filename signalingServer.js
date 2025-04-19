const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({ port: PORT });
const sessions = {};

console.log(`✅ Signaling server listening on ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  console.log("🔌 New WebSocket client connected");

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("❌ Invalid JSON:", err.message);
      return;
    }

    const { type, code, payload } = data;

    if (!code) return console.warn("⚠️ No session code provided");

    switch (type) {
      case "create":
        sessions[code] = { host: ws, guest: null };
        console.log(`📡 Session created: ${code}`);
        break;

      case "join":
        if (!sessions[code]) {
          console.warn(`⚠️ No session found for code ${code}`);
          return;
        }
        sessions[code].guest = ws;
        console.log(`👤 Guest joined session: ${code}`);
        sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        break;

      case "signal":
        const sender = ws;
        const target = sessions[code]?.host === sender
          ? sessions[code].guest
          : sessions[code]?.host;

        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ type: "signal", payload }));
        } else {
          console.warn(`⚠️ Target socket not ready for session ${code}`);
        }
        break;

      case "input":
        const host = sessions[code]?.host;
        if (host && host.readyState === WebSocket.OPEN) {
          host.send(JSON.stringify({ type: "input", payload }));
        }
        break;

      default:
        console.warn(`⚠️ Unknown message type: ${type}`);
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const session = sessions[code];
      if (session.host === ws || session.guest === ws) {
        console.log(`❌ Client disconnected from session: ${code}`);
        delete sessions[code];
        break;
      }
    }
  });

  ws.on("error", (err) => {
    console.error("💥 WebSocket error:", err.message);
  });
});
