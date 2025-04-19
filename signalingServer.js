const WebSocket = require("ws");
const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {};

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.warn("❌ Invalid JSON:", msg);
      return;
    }

    const { type, code, payload } = data;

    // Create new session
    if (type === "create") {
      sessions[code] = { host: ws, guest: null };
      console.log(`📡 Session created: ${code}`);
    }

    // Guest joins session
    else if (type === "join") {
      if (!sessions[code]) {
        sessions[code] = { host: null, guest: ws };
        console.log(`⚠️ Guest joined before host. Session ${code} created.`);
      } else {
        sessions[code].guest = ws;
        if (sessions[code].host) {
          sessions[code].host.send(JSON.stringify({ type: "guest-joined" }));
          console.log(`✅ Guest joined session ${code}`);
        }
      }
    }

    // Signal (SDP or ICE)
    else if (type === "signal") {
      const session = sessions[code];
      if (!session) return;
      const target = session.host === ws ? session.guest : session.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: "signal", payload }));
      }
    }

    // Remote input control
    else if (type === "input" && sessions[code]) {
      const host = sessions[code].host;
      if (host && host.readyState === WebSocket.OPEN) {
        host.send(JSON.stringify({ type: "input", payload }));
      }
    }
  });

  ws.on("close", () => {
    for (const code in sessions) {
      const session = sessions[code];
      if (session.host === ws || session.guest === ws) {
        console.log(`❎ Closing session ${code}`);
        delete sessions[code];
        break;
      }
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
