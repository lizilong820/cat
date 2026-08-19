const API_BASE = 'http://152.136.139.226:9001';
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const system = wx.getSystemInfoSync();
const WIDTH = system.windowWidth;
const HEIGHT = system.windowHeight;
const DPR = system.pixelRatio || 1;

canvas.width = WIDTH * DPR;
canvas.height = HEIGHT * DPR;
ctx.scale(DPR, DPR);

const colors = {
  bg: '#071117', panel: '#102a34', panel2: '#0d2029', line: 'rgba(172,211,217,.18)',
  text: '#edf6f2', muted: '#8fa9ad', cyan: '#64ded2', orange: '#ffb45b', red: '#ff736b',
  blue: '#76a6ff', green: '#8fe2a1'
};

const events = [
  { name: '暴风雪', description: '猫移速下降 30%，持续 15 秒', color: '#8ccaff', duration: 15 },
  { name: '狂怒', description: '猫攻击提升 50%，持续 10 秒', color: '#ff8d64', duration: 10 },
  { name: '资源雨', description: '老鼠获得 200 金币', color: '#ffd36c', duration: 0 },
  { name: '猫薄荷', description: '猫回复 300 HP', color: '#87e08d', duration: 0 },
  { name: '地震', description: '全场房门失去 100 HP', color: '#ce9bff', duration: 0 }
];

const mouseUpgrades = [
  ['房门强化', 'HP +300，护甲提升', 120, 'door'],
  ['建造炮台', '范围伤害 30/s', 160, 'turret'],
  ['捕鼠夹', '减速猫 50% / 3s', 100, 'trap'],
  ['治疗站', '炮台持续回复', 240, 'heal']
];
const catUpgrades = [
  ['武器强化', '攻击力 +30/s', 180, 'weapon'],
  ['疾风突进', '移速 +80% / 5s', 120, 'dash'],
  ['铁壁护盾', '免疫伤害 / 3s', 200, 'shield'],
  ['致命一击', '下次攻击伤害 ×3', 260, 'critical']
];

const state = {
  role: 'mouse', timeLeft: 480, eventCooldown: 60, activeEvent: null, eventLeft: 0,
  gold: 320, miceAlive: 10, catsAlive: 2, catHp: 1000, catMaxHp: 1000,
  selectedHouse: 0, houses: [], turrets: 0, devices: [], upgrades: {}, feed: [],
  move: { x: 0, y: 0 }, joystick: false, lastTime: Date.now(), lastAttack: 0,
  serverOnline: false
};

function resetGame() {
  state.timeLeft = 480; state.eventCooldown = 60; state.activeEvent = null; state.eventLeft = 0;
  state.gold = 320; state.miceAlive = 10; state.catsAlive = 2; state.catHp = 1000;
  state.selectedHouse = 0; state.turrets = 0; state.devices = []; state.upgrades = {};
  state.feed = []; state.houses = Array.from({ length: 10 }, (_, index) => ({
    index, hp: 500, maxHp: 500, level: 1, destroyed: false, underAttack: false, x: 0, y: 0
  }));
  addFeed('新对局开始：选择阵营，守住或击破房门。');
}

function addFeed(message) {
  state.feed.unshift(`${formatTime(state.timeLeft)}  ${message}`);
  state.feed = state.feed.slice(0, 3);
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function roundedRect(x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function text(value, x, y, size, color = colors.text, align = 'left', weight = '400') {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y);
}

function line(x1, y1, x2, y2, color = colors.line, width = 1) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0c2730'); gradient.addColorStop(1, colors.bg);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = 'rgba(100,222,210,.07)'; ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 27) { line(x, 0, x - HEIGHT * .12, HEIGHT, 'rgba(100,222,210,.07)'); }
}

function drawHeader() {
  text('猫', 18, 31, 20, colors.cyan, 'left', '800');
  text('CAT MOUSE · PROTOTYPE', 48, 19, 9, colors.cyan, 'left', '600');
  text('猫鼠大战', 48, 39, 20, colors.text, 'left', '800');
  ctx.fillStyle = colors.cyan; ctx.beginPath(); ctx.arc(WIDTH - 103, 25, 4, 0, Math.PI * 2); ctx.fill();
  text(state.serverOnline ? '后端在线' : '后端检测中', WIDTH - 92, 29, 10, colors.muted);
  text(formatTime(state.timeLeft), WIDTH - 18, 52, 17, colors.text, 'right', '700');
}

function drawRoleTabs() {
  const y = 61; const w = (WIDTH - 48) / 2;
  roundedRect(16, y, WIDTH - 32, 38, 9, colors.panel2, colors.line);
  roundedRect(state.role === 'mouse' ? 19 : 21 + w, y + 3, w - 5, 32, 7, state.role === 'mouse' ? colors.cyan : '#3a291b');
  roundedRect(state.role === 'cat' ? 19 + w : 21 + w, y + 3, w - 5, 32, 7, state.role === 'cat' ? colors.orange : 'transparent');
  text('老鼠阵营', 16 + w / 2, y + 25, 13, state.role === 'mouse' ? colors.bg : colors.muted, 'center', '700');
  text('猫阵营', 16 + w + w / 2, y + 25, 13, state.role === 'cat' ? colors.bg : colors.muted, 'center', '700');
}

function drawMap() {
  const top = 108; const bottom = Math.min(HEIGHT - 265, 610); const mapHeight = bottom - top;
  roundedRect(14, top, WIDTH - 28, mapHeight, 16, '#0a1d24', 'rgba(138,211,211,.24)');
  const cx = WIDTH / 2; const cy = top + mapHeight * .51; const rx = WIDTH * .36; const ry = mapHeight * .34;
  ctx.fillStyle = 'rgba(78,150,128,.14)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.12, ry * 1.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([5, 8]); ctx.strokeStyle = 'rgba(124,211,184,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.12, ry * 1.1, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  const centerRadius = Math.max(30, WIDTH * .11);
  ctx.fillStyle = state.activeEvent ? `${state.activeEvent.color}32` : 'rgba(100,222,210,.09)'; ctx.beginPath(); ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = state.activeEvent ? state.activeEvent.color : 'rgba(100,222,210,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2); ctx.stroke();
  text('事件区', cx, cy + 4, 12, colors.text, 'center', '700');
  state.houses.forEach((house, index) => {
    const angle = -Math.PI / 2 + index / 10 * Math.PI * 2;
    house.x = cx + Math.cos(angle) * rx; house.y = cy + Math.sin(angle) * ry;
    drawHouse(house, house.x, house.y, index === state.selectedHouse);
  });
  const px = cx + (state.role === 'mouse' ? -rx * .18 : rx * .34) + state.move.x * 12;
  const py = cy + (state.role === 'mouse' ? ry * .18 : -ry * .18) + state.move.y * 12;
  drawCharacter(px, py, state.role, true); drawCharacter(cx + rx * .34, cy - ry * .18, 'cat', false);
  drawCharacter(cx - rx * .2, cy + ry * .18, 'mouse', false);
  text('10 栋房屋 · 环形防线', 26, top + 24, 10, 'rgba(219,243,233,.58)', 'left', '600');
}

function drawHouse(house, x, y, selected) {
  const size = Math.max(24, WIDTH * .075);
  if (selected) { ctx.fillStyle = state.role === 'mouse' ? 'rgba(100,222,210,.2)' : 'rgba(255,180,91,.2)'; ctx.beginPath(); ctx.arc(x, y, size * 1.03, 0, Math.PI * 2); ctx.fill(); }
  const body = house.destroyed ? '#39484a' : house.underAttack ? '#704335' : '#24484b';
  roundedRect(x - size * .57, y - size * .45, size * 1.14, size * .9, 6, body, selected ? (state.role === 'mouse' ? colors.cyan : colors.orange) : 'rgba(210,229,215,.35)');
  ctx.fillStyle = house.destroyed ? '#596362' : house.level >= 3 ? '#9c6a3b' : '#7a5a3c'; ctx.beginPath(); ctx.moveTo(x - size * .72, y - size * .35); ctx.lineTo(x, y - size * .78); ctx.lineTo(x + size * .72, y - size * .35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#163238'; ctx.fillRect(x - size * .12, y + size * .04, size * .24, size * .35);
  ctx.fillStyle = house.destroyed ? '#899694' : '#ffe09d'; ctx.fillRect(x - size * .4, y - size * .05, size * .2, size * .16); ctx.fillRect(x + size * .2, y - size * .05, size * .2, size * .16);
  text(String(house.index + 1), x, y + size * 1.08, 11, colors.text, 'center', '700');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - size * .62, y + size * .78, size * 1.24, 4); ctx.fillStyle = house.destroyed ? '#879391' : colors.cyan; ctx.fillRect(x - size * .62, y + size * .78, size * 1.24 * house.hp / house.maxHp, 4);
}

function drawCharacter(x, y, role, player) {
  const radius = Math.max(8, WIDTH * .028); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + radius * .8, radius * 1.2, radius * .46, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = role === 'cat' ? '#e68545' : '#9bc9bc'; ctx.strokeStyle = player ? '#f4f8df' : 'rgba(255,255,255,.45)'; ctx.lineWidth = player ? 2 : 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = role === 'cat' ? '#ffb271' : '#d8f4df'; ctx.beginPath(); ctx.arc(x - radius * .52, y - radius * .7, radius * .42, 0, Math.PI * 2); ctx.arc(x + radius * .52, y - radius * .7, radius * .42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10252a'; ctx.beginPath(); ctx.arc(x - radius * .3, y - radius * .08, radius * .11, 0, Math.PI * 2); ctx.arc(x + radius * .3, y - radius * .08, radius * .11, 0, Math.PI * 2); ctx.fill();
}

function drawPanel() {
  const top = Math.min(HEIGHT - 250, 630);
  roundedRect(14, top, WIDTH - 28, 46, 11, colors.panel, colors.line);
  const cells = [['资源', Math.floor(state.gold)], ['存活鼠', state.miceAlive], ['存活猫', state.catsAlive]];
  cells.forEach((item, index) => { const x = 14 + (WIDTH - 28) / 3 * index; if (index) line(x, top + 9, x, top + 37); text(item[0], x + (WIDTH - 28) / 6, top + 18, 10, colors.muted, 'center'); text(String(item[1]), x + (WIDTH - 28) / 6, top + 36, 16, colors.text, 'center', '700'); });
  const cardTop = top + 56; roundedRect(14, cardTop, WIDTH - 28, 70, 11, colors.panel, colors.line);
  ctx.fillStyle = state.role === 'mouse' ? '#145047' : '#6e3822'; ctx.beginPath(); ctx.arc(38, cardTop + 33, 20, 0, Math.PI * 2); ctx.fill(); text(state.role === 'mouse' ? '鼠' : '猫', 38, cardTop + 40, 18, colors.text, 'center', '800');
  text(state.role === 'mouse' ? '老鼠 · 守门人' : '猫 · 猎手', 68, cardTop + 28, 14, colors.text, 'left', '700'); text(`目标房子 ${state.selectedHouse + 1}`, 68, cardTop + 47, 10, colors.muted);
  const hp = state.role === 'mouse' ? state.houses[state.selectedHouse].hp : state.catHp; const max = state.role === 'mouse' ? state.houses[state.selectedHouse].maxHp : state.catMaxHp; text('HP', 68, cardTop + 63, 9, colors.muted); roundedRect(88, cardTop + 57, WIDTH - 130, 7, 4, '#07141a'); roundedRect(88, cardTop + 57, (WIDTH - 130) * hp / max, 7, 4, state.role === 'mouse' ? colors.green : colors.red); text(`${Math.round(hp / max * 100)}%`, WIDTH - 27, cardTop + 65, 9, colors.muted, 'right');
  drawEventCard(cardTop + 80); drawUpgrades(cardTop + 151); drawControls();
}

function drawEventCard(top) {
  roundedRect(14, top, WIDTH - 28, 56, 11, colors.panel, colors.line); text('中心事件区', 27, top + 19, 11, colors.text, 'left', '700'); text(state.eventCooldown > 0 ? `${Math.ceil(state.eventCooldown)}s` : '可触发', WIDTH - 27, top + 19, 10, colors.muted, 'right'); text(state.activeEvent ? state.activeEvent.name : '等待随机事件', 27, top + 40, 14, state.activeEvent?.color || colors.orange, 'left', '700'); text(state.activeEvent ? state.activeEvent.description : '点击事件按钮触发随机事件', WIDTH - 27, top + 40, 9, colors.muted, 'right');
}

function drawUpgrades(top) {
  text(state.role === 'mouse' ? '防守升级' : '猫的强化', 17, top + 16, 12, colors.text, 'left', '700');
  const list = state.role === 'mouse' ? mouseUpgrades : catUpgrades;
  list.forEach((item, index) => { const y = top + 24 + index * 34; roundedRect(14, y, WIDTH - 28, 29, 7, 'rgba(8,22,29,.58)', colors.line); text(item[0], 23, y + 12, 11, colors.text, 'left', '700'); text(`${item[1]} · ${item[2]}金`, 23, y + 23, 8, colors.muted); const owned = !!state.upgrades[item[3]]; roundedRect(WIDTH - 70, y + 5, 48, 19, 5, owned ? '#24373b' : '#153b3d', owned ? colors.line : 'rgba(100,222,210,.35)'); text(owned ? '已拥有' : '升级', WIDTH - 46, y + 18, 9, owned ? colors.muted : colors.cyan, 'center', '700'); });
  const feedTop = top + 24 + list.length * 34 + 8; roundedRect(14, feedTop, WIDTH - 28, 45, 8, colors.panel2, colors.line); state.feed.forEach((item, index) => text(item, 22, feedTop + 14 + index * 13, 8, colors.muted));
}

function drawControls() {
  const y = HEIGHT - 73; const radius = 34; ctx.fillStyle = 'rgba(20,52,62,.7)'; ctx.strokeStyle = 'rgba(119,177,185,.38)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(55, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = colors.cyan; ctx.beginPath(); ctx.arc(55 + state.move.x * 15, y + state.move.y * 15, 13, 0, Math.PI * 2); ctx.fill();
  if (state.role === 'cat') { roundedRect(WIDTH - 158, y - 23, 68, 46, 10, '#3a291b', 'rgba(255,180,91,.5)'); text('爪', WIDTH - 124, y + 6, 15, colors.orange, 'center', '800'); text('攻击', WIDTH - 102, y + 5, 11, '#ffe0ae', 'center', '700'); }
  roundedRect(WIDTH - 80, y - 23, 66, 46, 10, '#153b3d', 'rgba(100,222,210,.35)'); text('✦', WIDTH - 47, y + 5, 15, colors.cyan, 'center', '800'); text('事件', WIDTH - 25, y + 5, 10, colors.cyan, 'center', '700');
}

function render() { drawBackground(); drawHeader(); drawRoleTabs(); drawMap(); drawPanel(); }

function setRole(role) { if (state.role === role) return; state.role = role; state.selectedHouse = role === 'mouse' ? 0 : 4; addFeed(role === 'mouse' ? '已切换到老鼠阵营。' : '已切换到猫阵营。'); }

function upgrade(index) {
  const item = (state.role === 'mouse' ? mouseUpgrades : catUpgrades)[index]; if (!item || state.upgrades[item[3]] || state.gold < item[2]) return;
  state.gold -= item[2]; state.upgrades[item[3]] = true;
  if (item[3] === 'door') { const house = state.houses[state.selectedHouse]; house.level = Math.min(4, house.level + 1); house.maxHp += 300; house.hp = Math.min(house.maxHp, house.hp + 300); }
  if (item[3] === 'turret') state.turrets += 1; if (item[3] === 'trap' || item[3] === 'heal') state.devices.push(item[3]); addFeed(`${item[0]}已完成。`);
}

function attack() {
  if (state.role !== 'cat' || Date.now() - state.lastAttack < 520) return; state.lastAttack = Date.now(); const house = state.houses[state.selectedHouse]; if (!house || house.destroyed) return;
  const damage = state.upgrades.critical ? 150 : state.upgrades.weapon ? 80 : 50; house.hp = Math.max(0, house.hp - damage); house.underAttack = true; state.gold += 12; delete state.upgrades.critical; addFeed(`攻击房子 ${house.index + 1}，房门 -${damage} HP。`);
  if (house.hp === 0) { house.destroyed = true; state.miceAlive = Math.max(0, state.miceAlive - 1); state.gold += 100; addFeed(`房子 ${house.index + 1} 被攻破。`); }
}

function triggerEvent() {
  if (state.eventCooldown > 0) return; const event = events[Math.floor(Math.random() * events.length)]; state.activeEvent = event; state.eventCooldown = 60; state.eventLeft = event.duration;
  if (event.name === '资源雨') state.gold += 200; if (event.name === '猫薄荷') state.catHp = Math.min(state.catMaxHp, state.catHp + 300); if (event.name === '地震') state.houses.forEach((house) => { house.hp = Math.max(0, house.hp - 100); }); addFeed(`中心事件：${event.name}。`);
}

function update(delta) {
  if (state.timeLeft <= 0) return; state.timeLeft = Math.max(0, state.timeLeft - delta); state.eventCooldown = Math.max(0, state.eventCooldown - delta); state.eventLeft = Math.max(0, state.eventLeft - delta);
  state.gold += delta * (state.role === 'mouse' ? (state.upgrades.heal ? 13 : 10) : 3);
  if (state.role === 'mouse' && state.turrets > 0) { const house = state.houses[state.selectedHouse]; if (house.underAttack) state.catHp = Math.max(0, state.catHp - delta * state.turrets * 8); }
}

function hit(x, y, left, top, right, bottom) { return x >= left && x <= right && y >= top && y <= bottom; }

function touchStart(touch) {
  const x = touch.clientX || touch.x; const y = touch.clientY || touch.y;
  if (hit(x, y, 14, 58, WIDTH / 2, 104)) { setRole('mouse'); return; }
  if (hit(x, y, WIDTH / 2, 58, WIDTH - 14, 104)) { setRole('cat'); return; }
  if (y > HEIGHT - 120 && x < 115) { state.joystick = true; updateJoystick(x, y); return; }
  if (y > HEIGHT - 120 && x > WIDTH - 95) { triggerEvent(); return; }
  if (state.role === 'cat' && y > HEIGHT - 120 && x > WIDTH - 175 && x < WIDTH - 85) { attack(); return; }
  const house = state.houses.find((item) => Math.hypot(item.x - x, item.y - y) < WIDTH * .1); if (house) { state.selectedHouse = house.index; addFeed(`已选择房子 ${house.index + 1}。`); return; }
  const list = state.role === 'mouse' ? mouseUpgrades : catUpgrades; const top = Math.min(HEIGHT - 250, 630) + 56 + 70 + 80 + 151 + 24;
  list.forEach((item, index) => { const rowTop = top + index * 34; if (y >= rowTop && y <= rowTop + 29) upgrade(index); });
}

function updateJoystick(x, y) { const baseX = 55; const baseY = HEIGHT - 73; const dx = x - baseX; const dy = y - baseY; const length = Math.max(1, Math.hypot(dx, dy)); const amount = Math.min(1, 27 / length); state.move.x = dx / length * amount; state.move.y = dy / length * amount; }
function touchMove(touch) { if (state.joystick) updateJoystick(touch.clientX || touch.x, touch.clientY || touch.y); }
function touchEnd() { state.joystick = false; state.move.x = 0; state.move.y = 0; }

wx.onTouchStart((event) => { if (event.touches?.[0]) touchStart(event.touches[0]); });
wx.onTouchMove((event) => { if (event.touches?.[0]) touchMove(event.touches[0]); });
wx.onTouchEnd(touchEnd);

function checkServer() { wx.request({ url: `${API_BASE}/api/health`, timeout: 10000, success: (response) => { state.serverOnline = !!response.data?.ok; }, fail: () => { state.serverOnline = false; } }); }

function frame() { const now = Date.now(); const delta = Math.min(.05, (now - state.lastTime) / 1000); state.lastTime = now; update(delta); render(); requestAnimationFrame(frame); }

resetGame(); checkServer(); frame();
