const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("Invalid JSON:", err);
      return;
    }

    const { type, code, payload } = data;

    switch (type) {
      case "create":
        sessions[code] = { host: ws, guest: null };
        break;

      case "join":
        if (sessions[code] && !sessions[code].guest) {
          sessions[code].guest = ws;
          sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        }
        break;

      case "signal":
        const session = sessions[code];
        if (!session) return;

        const isHost = session.host === ws;
        const target = isHost ? session.guest : session.host;

        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ type: "signal", payload }));
        }
        break;

      case "input":
        if (sessions[code]?.host?.readyState === WebSocket.OPEN) {
          sessions[code].host.send(JSON.stringify({ type: "input", payload }));
        }
        break;

      default:
        console.warn("Unknown message type:", type);
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      if (sessions[code].host === ws || sessions[code].guest === ws) {
        delete sessions[code];
        break;
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
