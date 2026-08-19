import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicRoot = join(root, 'public');
const port = Number(process.env.PORT || 9001);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const rooms = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

async function serveStatic(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safePath = normalize(requested).replace(/^([.][.][\\/])+/, '');
  const filePath = join(publicRoot, safePath);

  if (!filePath.startsWith(publicRoot)) {
    json(res, 403, { error: 'forbidden' });
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': requested === '/index.html' ? 'no-store' : 'public, max-age=3600'
    });
    res.end(content);
  } catch {
    json(res, 404, { error: 'not_found' });
  }
}

const server = http.createServer(async (req, res) => {
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

  if (req.method === 'GET') {
    await serveStatic(req, res);
    return;
  }

  json(res, 405, { error: 'method_not_allowed' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`猫鼠大战 prototype listening on http://0.0.0.0:${port}`);
});
