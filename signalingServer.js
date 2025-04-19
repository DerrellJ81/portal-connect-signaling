const WebSocket = require("ws");
const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      return;
    }

    const { type, code, payload } = data;

    if (type === "create") {
      sessions[code] = { host: ws, guest: null };
    } else if (type === "join") {
      if (!sessions[code]) {
        sessions[code] = { host: null, guest: ws };
      } else {
        sessions[code].guest = ws;
        if (sessions[code].host) {
          sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
        }
      }
    } else if (type === "signal") {
      const session = sessions[code];
      if (!session) return;
      const target = session.host === ws ? session.guest : session.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: "signal", payload }));
      }
    } else if (type === "input" && sessions[code]) {
      const host = sessions[code].host;
      if (host && host.readyState === WebSocket.OPEN) {
        host.send(JSON.stringify({ type: "input", payload }));
      }
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
