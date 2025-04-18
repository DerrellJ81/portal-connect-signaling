const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 3001 });

const sessions = {};

server.on('connection', (socket) => {
  socket.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'create') {
      sessions[data.code] = socket;
    }

    if (data.type === 'join') {
      if (sessions[data.code]) {
        sessions[data.code].send(JSON.stringify({ type: 'guest-joined' }));
        sessions[data.code].paired = socket;
        socket.paired = sessions[data.code];
      }
    }

    if (data.type === 'signal' || data.type === 'input') {
      if (socket.paired) {
        socket.paired.send(JSON.stringify(data));
      }
    }
  });

  socket.on('close', () => {
    if (socket.paired) socket.paired.close();
  });
});
