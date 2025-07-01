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

    // 🔁 Keep-alive ping every 15s
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n'); // this is a comment, won't trigger any event
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
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
