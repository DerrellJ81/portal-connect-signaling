const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`✅ Signaling server running on port ${PORT}`);
});

const sessions = new Map(); // sessionCode -> { host, guest }

wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const { type, code, payload } = data;

      switch (type) {
        case "create":
          sessions.set(code, { host: socket, guest: null });
          console.log(`📡 Session created: ${code}`);
          break;

        case "join":
          if (!sessions.has(code)) {
            socket.send(JSON.stringify({ type: "error", message: "Session not found." }));
            return;
          }
          const session = sessions.get(code);
          session.guest = socket;
          sessions.set(code, session);
          session.host.send(JSON.stringify({ type: "guest-joined" }));
          console.log(`👤 Guest joined session: ${code}`);
          break;

        case "signal":
          const targetSession = sessions.get(code);
          if (targetSession) {
            const target = socket === targetSession.host ? targetSession.guest : targetSession.host;
            if (target) {
              target.send(JSON.stringify({ type: "signal", payload }));
            }
          }
          break;

        case "input":
          const inputSession = sessions.get(code);
          if (inputSession && inputSession.host) {
            inputSession.host.send(JSON.stringify({ type: "input", payload }));
          }
          break;
      }
    } catch (err) {
      console.error("❌ Error parsing message:", err.message);
    }
  });

  socket.on("close", () => {
    for (const [code, session] of sessions.entries()) {
      if (session.host === socket || session.guest === socket) {
        sessions.delete(code);
        console.log(`❌ Session closed: ${code}`);
        break;
      }
    }
  });
});
