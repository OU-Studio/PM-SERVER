// events.js
const clients = [];

function initSSE(app) {
  app.get('/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    clients.push(res);

    req.on('close', () => {
      const i = clients.indexOf(res);
      if (i !== -1) clients.splice(i, 1);
    });
  });
}

function broadcastUpdate(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => client.write(payload));
}

module.exports = {
  initSSE,
  broadcastUpdate
};
