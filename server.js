import http from 'node:http';
const port = Number(process.env.PORT || 9001);

const rooms = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    json(res, 200, { ok: true, service: 'cat-mouse-battleroyale', time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/rooms') {
    json(res, 200, { rooms: [...rooms.values()] });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/rooms') {
    const id = `room-${Math.random().toString(36).slice(2, 8)}`;
    const room = { id, players: 1, maxPlayers: 12, status: 'prototype', createdAt: Date.now() };
    rooms.set(id, room);
    json(res, 201, room);
    return;
  }

  json(res, 405, { error: 'method_not_allowed' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`猫鼠大战 prototype listening on http://0.0.0.0:${port}`);
});
