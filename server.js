import http from 'node:http';
const port = Number(process.env.PORT || 9001);

const rooms = new Map();

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) reject(new Error('payload_too_large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

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
    const room = { id, players: 1, maxPlayers: 12, status: 'matching', createdAt: Date.now(), updatedAt: Date.now(), state: null };
    rooms.set(id, room);
    json(res, 201, room);
    return;
  }

  const stateMatch = req.url.match(/^\/api\/rooms\/([^/]+)\/state$/);
  if (stateMatch && req.method === 'GET') {
    const room = rooms.get(stateMatch[1]);
    if (!room) { json(res, 404, { error: 'room_not_found' }); return; }
    json(res, 200, room);
    return;
  }

  if (stateMatch && req.method === 'POST') {
    const room = rooms.get(stateMatch[1]);
    if (!room) { json(res, 404, { error: 'room_not_found' }); return; }
    try {
      const payload = await readJson(req);
      room.state = {
        phase: typeof payload.phase === 'string' ? payload.phase : room.state?.phase || 'lobby',
        role: payload.role === 'cat' ? 'cat' : 'mouse',
        timeLeft: Number.isFinite(payload.timeLeft) ? Math.max(0, payload.timeLeft) : room.state?.timeLeft || 480,
        miceAlive: Number.isFinite(payload.miceAlive) ? Math.max(0, payload.miceAlive) : room.state?.miceAlive || 10,
        catsAlive: Number.isFinite(payload.catsAlive) ? Math.max(0, payload.catsAlive) : room.state?.catsAlive || 2,
        destroyedGates: Number.isFinite(payload.destroyedGates) ? Math.max(0, payload.destroyedGates) : room.state?.destroyedGates || 0
      };
      room.status = room.state.phase === 'result' ? 'finished' : 'running';
      room.updatedAt = Date.now();
      json(res, 200, room);
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  json(res, 405, { error: 'method_not_allowed' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`猫鼠大战 prototype listening on http://0.0.0.0:${port}`);
});
