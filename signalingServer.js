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
      console.error("Invalid message format:", msg);
      return;
    }

    const { type, code, payload } = data;

    switch (type) {
      case "create":
        sessions[code] = { host: ws, guest: null };
        console.log(`Session created: ${code}`);
        break;

      case "join":
        if (sessions[code] && sessions[code].host) {
          sessions[code].guest = ws;
          console.log(`Guest joined session: ${code}`);
          sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Session not found." }));
        }
        break;

      case "signal":
        if (sessions[code]) {
          const target =
            sessions[code].host === ws
              ? sessions[code].guest
              : sessions[code].host;

          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify({ type: "signal", payload }));
          }
        }
        break;

      case "input":
        if (sessions[code]?.host && sessions[code].host.readyState === WebSocket.OPEN) {
          sessions[code].host.send(JSON.stringify({ type: "input", payload }));
        }
        break;

      default:
        console.warn("Unknown message type:", type);
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const { host, guest } = sessions[code];
      if (host === ws || guest === ws) {
        console.log(`Session closed: ${code}`);
        delete sessions[code];
        break;
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
