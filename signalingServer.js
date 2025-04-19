const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Invalid JSON:", msg);
      return;
    }

    const { type, code, payload } = data;

    switch (type) {
      case "create":
        sessions[code] = { host: ws, guest: null };
        console.log(`🔧 Session created: ${code}`);
        break;

      case "join":
        if (sessions[code] && !sessions[code].guest) {
          sessions[code].guest = ws;
          console.log(`🚪 Guest joined session: ${code}`);
          sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        }
        break;

      case "signal":
        if (sessions[code]) {
          const isHost = sessions[code].host === ws;
          const target = isHost ? sessions[code].guest : sessions[code].host;
          if (target) {
            target.send(JSON.stringify({ type: "signal", payload }));
          }
        }
        break;

      case "input":
        if (sessions[code]?.host) {
          sessions[code].host.send(JSON.stringify({ type: "input", payload }));
        }
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
        break;
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const session = sessions[code];
      if (session.host === ws || session.guest === ws) {
        console.log(`❌ Closing session: ${code}`);
        delete sessions[code];
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
