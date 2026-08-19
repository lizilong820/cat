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
const WORLD = { width: 2000, height: 2000, zoom: 1.15 };

// 资源包按 manifest 的 ID 映射到微信小游戏本地路径；同一 ID 的变体使用语义化 key。
const assetPaths = {
  map: 'assets/C/C01.png', house: 'assets/C/C05.png', eventZone: 'assets/C/C06.png',
  mouse: 'assets/B/B01.png', cat: 'assets/B/B05.png',
  mouseWin: 'assets/B/B14__victory_cheering_pose.png', mouseLose: 'assets/B/B14__defeat_sad_pose.png',
  catWin: 'assets/B/B19__victory_celebrating_pose.png', catLose: 'assets/B/B19__defeat_frustrated_pose.png',
  door1: 'assets/D/D01.png', door2: 'assets/D/D02.png', door3: 'assets/D/D03.png', door4: 'assets/D/D04.png',
  doorDamage1: 'assets/D/D05__stage_1_minor_cracks.png', doorDamage2: 'assets/D/D05__stage_2_more_cracks_and_splinters.png',
  doorDamage3: 'assets/D/D05__stage_3_heavy_damage_with_large_crack.png', doorDamage4: 'assets/D/D05__stage_4_near_collapse_broken_planks.png',
  turret: 'assets/D/D07.png', trap: 'assets/D/D10.png', shock: 'assets/D/D11.png', heal: 'assets/D/D12.png',
  coin: 'assets/A/A05.png', event0: 'assets/F/F01.png', event1: 'assets/F/F02.png', event2: 'assets/F/F03.png', event3: 'assets/F/F04.png', event4: 'assets/F/F05.png'
};
const assets = {};
function loadAssets() {
  Object.entries(assetPaths).forEach(([key, path]) => {
    const image = wx.createImage();
    image.onload = () => { assets[key] = image; };
    image.onerror = () => { assets[key] = null; };
    image.src = path;
  });
}
function drawAsset(key, x, y, width, height, alpha = 1) {
  const image = assets[key];
  if (!image) return false;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(image, x, y, width, height); ctx.restore();
  return true;
}

const events = [
  { name: '暴风雪', description: '猫移速下降 30%，持续 15 秒', color: '#8ccaff', duration: 15 },
  { name: '狂怒', description: '猫攻击提升 50%，持续 10 秒', color: '#ff8d64', duration: 10 },
  { name: '资源雨', description: '老鼠获得 200 金币', color: '#ffd36c', duration: 0 },
  { name: '猫薄荷', description: '猫回复 300 HP', color: '#87e08d', duration: 0 },
  { name: '地震', description: '全场房门失去 100 HP', color: '#ce9bff', duration: 0 }
];

// 直接对应开发文档第 5 页，点击升级行即可验证首版经济循环。
const mouseUpgrades = [
  ['房门 Lv.1→2', 'HP 500→800，护甲 +10%', 300, 'door2'],
  ['房门 Lv.2→3', 'HP 800→1200，护甲 +20%', 600, 'door3'],
  ['房门 Lv.3→4', 'HP 1200→1800，护甲 +30%', 1000, 'door4'],
  ['建造炮台', '伤害 30/s，射程 150', 200, 'turret'],
  ['炮台升级', '伤害 +20/s，射程 +30', 400, 'turret2'],
  ['捕鼠夹', '减速 50%，持续 3 秒', 150, 'trap'],
  ['电击网', '范围内猫每秒 -20 HP', 350, 'shock'],
  ['治疗站', '炮台每秒回复 5% HP', 500, 'heal'],
  ['资源室 Lv.1→2', '产出 10→15 金/秒', 250, 'room2'],
  ['资源室 Lv.2→3', '产出 15→22 金/秒', 500, 'room3']
];
const catUpgrades = [
  ['武器 Lv.1→2', '攻击 50→80/s，需击破 1 门', 1, 'weapon2'],
  ['武器 Lv.2→3', '攻击 80→120/s，需击破 2 门', 2, 'weapon3'],
  ['武器 Lv.3→4', '攻击 120→180/s，需击破 4 门', 4, 'weapon4'],
  ['疾风突进', '移速 +80%，持续 5 秒 · 200 积分', 200, 'dash'],
  ['铁壁护盾', '免疫伤害 3 秒 · 300 积分', 300, 'shield'],
  ['致命一击', '下次攻击伤害 ×3 · 400 积分', 400, 'critical'],
  ['吸血', '攻击回复 5% 伤害值 · 500 积分', 500, 'lifesteal'],
  ['恐吓', '进入房子时炮台攻速 -20% · 600 积分', 600, 'fear']
];

const state = {
  role: 'mouse', phase: 'lobby', phaseTime: 10, timeLeft: 480, eventCooldown: 60, activeEvent: null, eventLeft: 0,
  gold: 320, score: 0, miceAlive: 10, catsAlive: 2, catHp: 1000, catMaxHp: 1000,
  selectedHouse: 0, houses: [], turrets: 0, devices: [], upgrades: {}, feed: [], destroyedGates: 0,
  move: { x: 0, y: 0 }, joystick: false, lastTime: Date.now(), lastAttack: 0,
  serverOnline: false, roomId: '', syncElapsed: 0, cardCooldown: 0, buffs: {}, touchFx: { x: -100, y: -100, life: 0 }, pressed: '', result: '',
  player: { x: 1000, y: 1000, targetX: 1000, targetY: 1000, path: [] }, camera: { x: 1000, y: 1000 }
};

function resetGame() {
  state.phase = 'lobby'; state.phaseTime = 10; state.timeLeft = 480; state.eventCooldown = 60; state.activeEvent = null; state.eventLeft = 0;
  state.gold = 320; state.score = 0; state.miceAlive = 10; state.catsAlive = 2; state.catHp = 1000; state.destroyedGates = 0;
  state.selectedHouse = 0; state.turrets = 0; state.devices = []; state.upgrades = {}; state.destroyedGates = 0;
  state.feed = []; state.syncElapsed = 0; state.cardCooldown = 0; state.buffs = {}; state.touchFx.life = 0; state.pressed = '';
  state.player = { x: 1000, y: 1000, targetX: 1000, targetY: 1000, path: [] }; state.camera = { x: 1000, y: 1000 };
  state.aiMice = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, difficulty: index < 3 ? '简单' : index < 7 ? '普通' : '困难', state: '空闲', gold: 0, reaction: index < 3 ? 3 : index < 7 ? 1.5 : .5, timer: 0 }));
  state.aiCats = [{ id: 1, hp: 1000, x: 1050, y: 1000, target: 0 }];
  state.resourcePoints = Array.from({ length: 12 }, (_, index) => ({ x: 180 + ((index * 317) % 1640), y: 180 + ((index * 541) % 1640), active: true }));
  state.houses = Array.from({ length: 10 }, (_, index) => { const angle = -Math.PI / 2 + index / 10 * Math.PI * 2; return {
    index, hp: 500, maxHp: 500, armor: 0, level: 1, destroyed: false, underAttack: false,
    x: 1000 + Math.cos(angle) * 650, y: 1000 + Math.sin(angle) * 520, turrets: 0, devices: []
  }; });
  addFeed('新对局开始：选择阵营，守住或击破房门。');
}

function beginRoleSelect() { state.phase = 'role'; state.phaseTime = 10; addFeed('选角开始：请选择猫或老鼠。'); }
function confirmRole() { state.phase = state.role === 'mouse' ? 'house' : 'deploy'; state.phaseTime = state.role === 'mouse' ? 10 : 30; state.selectedHouse = state.role === 'mouse' ? -1 : 0; addFeed(state.role === 'mouse' ? '请选择一栋房子。' : '猫位锁定，进入 30 秒部署期。'); }
function confirmHouse() { if (state.selectedHouse < 0) return; state.phase = 'deploy'; state.phaseTime = 30; state.gold = 300; addFeed(`房子 ${state.selectedHouse + 1} 已分配，进入部署期。`); }
function beginBattle() { state.phase = 'deploy'; state.phaseTime = 30; state.gold = state.role === 'mouse' ? 300 : 0; addFeed('部署期开始：老鼠部署防御，猫观察地图。'); }
function startMatch() {
  state.role = Math.random() < 0.5 ? 'mouse' : 'cat';
  state.selectedHouse = state.role === 'mouse' ? Math.floor(Math.random() * 10) : 0;
  state.phase = 'match'; state.phaseTime = 1.4;
  state.player.x = state.role === 'mouse' ? state.houses[state.selectedHouse].x : 1000;
  state.player.y = state.role === 'mouse' ? state.houses[state.selectedHouse].y + 100 : 1000;
  state.player.targetX = state.player.x; state.player.targetY = state.player.y;
  state.player.path = [];
  state.camera.x = state.player.x; state.camera.y = state.player.y;
  addFeed(`匹配完成：随机分配为${state.role === 'mouse' ? '老鼠' : '猫'}。`);
  wx.request({ url: `${API_BASE}/api/rooms`, method: 'POST', timeout: 10000, success: (response) => { state.roomId = response.data?.id || ''; addFeed(`房间 ${state.roomId || 'prototype'} 已创建。`); syncRoom(); }, fail: () => addFeed('远端匹配暂不可用，继续本地原型对局。') });
}

function syncRoom() {
  if (!state.roomId) return;
  wx.request({ url: `${API_BASE}/api/rooms/${state.roomId}/state`, method: 'POST', data: {
    phase: state.phase, role: state.role, timeLeft: state.timeLeft, miceAlive: state.miceAlive,
    catsAlive: state.catsAlive, destroyedGates: state.destroyedGates
  }, timeout: 10000, fail: () => { /* 网络波动不影响本地表现层 */ } });
}

function navigateTo(targetX, targetY) {
  const start = state.player;
  const viaHorizontal = Math.abs(start.y - 1000) + Math.abs(targetY - 1000);
  const viaVertical = Math.abs(start.x - 1000) + Math.abs(targetX - 1000);
  state.player.path = viaHorizontal <= viaVertical
    ? [{ x: start.x, y: 1000 }, { x: targetX, y: 1000 }, { x: targetX, y: targetY }]
    : [{ x: 1000, y: start.y }, { x: 1000, y: targetY }, { x: targetX, y: targetY }];
  state.player.path = state.player.path.filter((point, index, list) => index === list.length - 1 || Math.hypot(point.x - start.x, point.y - start.y) > 8);
  const next = state.player.path[0] || { x: targetX, y: targetY };
  state.player.targetX = next.x; state.player.targetY = next.y;
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
  const scale = Math.min((WIDTH - 28) / 760, mapHeight / 760) * 1.15;
  const toScreen = (wx, wy) => ({ x: WIDTH / 2 + (wx - state.camera.x) * scale, y: top + mapHeight / 2 + (wy - state.camera.y) * scale });
  ctx.save(); ctx.beginPath(); ctx.rect(14, top, WIDTH - 28, mapHeight); ctx.clip();
  ctx.fillStyle = '#183a36'; ctx.fillRect(14, top, WIDTH - 28, mapHeight);
  const mapLeft = WIDTH / 2 - state.camera.x * scale; const mapTop = top + mapHeight / 2 - state.camera.y * scale;
  const hasMapArt = drawAsset('map', mapLeft, mapTop, WORLD.width * scale, WORLD.height * scale);
  if (!hasMapArt) {
    ctx.strokeStyle = '#9b7953'; ctx.lineWidth = 72 * scale; ctx.lineCap = 'round';
    [[1000,0,1000,2000],[0,1000,2000,1000],[350,350,1650,1650],[1650,350,350,1650]].forEach((road) => { const a = toScreen(road[0], road[1]); const b = toScreen(road[2], road[3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(238,204,135,.35)'; ctx.lineWidth = 2; ctx.setLineDash([10, 12]); [[1000,0,1000,2000],[0,1000,2000,1000]].forEach((road) => { const a = toScreen(road[0], road[1]); const b = toScreen(road[2], road[3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.setLineDash([]);
    for (let i = 0; i < 32; i += 1) { const p = toScreen(100 + ((i * 317) % 1800), 100 + ((i * 541) % 1800)); ctx.fillStyle = '#2c6651'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(5, 18 * scale), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#437a59'; ctx.beginPath(); ctx.arc(p.x - 5 * scale, p.y - 7 * scale, Math.max(3, 12 * scale), 0, Math.PI * 2); ctx.fill(); }
  }
  if (state.resourcePoints) state.resourcePoints.forEach((point) => { if (!point.active) return; const p = toScreen(point.x, point.y); ctx.fillStyle = colors.orange; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, 7 * scale), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe09d'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
  const center = toScreen(1000, 1000); const centerRadius = Math.max(30, 90 * scale); ctx.fillStyle = 'rgba(100,222,210,.13)'; ctx.beginPath(); ctx.arc(center.x, center.y, centerRadius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = colors.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(center.x, center.y, centerRadius, 0, Math.PI * 2); ctx.stroke();
  if (state.activeEvent) drawAsset(`event${events.indexOf(state.activeEvent)}`, center.x - centerRadius * .65, center.y - centerRadius * .65, centerRadius * 1.3, centerRadius * 1.3, .9);
  text('中心事件区', center.x, center.y + 4, 11, colors.text, 'center', '700');
  state.houses.forEach((house) => { const p = toScreen(house.x, house.y); house.screenX = p.x; house.screenY = p.y; drawHouse(house, p.x, p.y, house.index === state.selectedHouse, scale); });
  if (state.aiMice) state.aiMice.forEach((ai, index) => { const house = state.houses[(index + 1) % state.houses.length]; const p = toScreen(house.x + 42, house.y + 34); drawCharacter(p.x, p.y, 'mouse', false, scale * .75); });
  if (state.aiCats) state.aiCats.forEach((cat) => { const p = toScreen(cat.x, cat.y); drawCharacter(p.x, p.y, 'cat', false, scale * .85); });
  const player = toScreen(state.player.x, state.player.y); drawCharacter(player.x, player.y, state.role, true, scale); ctx.restore();
  if (state.touchFx.life > 0) { ctx.strokeStyle = `rgba(100,222,210,${state.touchFx.life})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.touchFx.x, state.touchFx.y, (1 - state.touchFx.life) * 26 + 8, 0, Math.PI * 2); ctx.stroke(); }
  drawMinimap();
  text(`小镇地图 2000×2000 · 9 AI 老鼠 · ${Math.round(state.camera.x)},${Math.round(state.camera.y)}`, 26, top + 24, 10, 'rgba(219,243,233,.58)', 'left', '600');
}

function drawMinimap() {
  const x = WIDTH - 100; const y = 118; const size = 76;
  roundedRect(x, y, size, size, 8, 'rgba(5,17,22,.86)', 'rgba(172,211,217,.35)');
  ctx.strokeStyle = 'rgba(155,121,83,.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 8, y + size / 2); ctx.lineTo(x + size - 8, y + size / 2); ctx.moveTo(x + size / 2, y + 8); ctx.lineTo(x + size / 2, y + size - 8); ctx.stroke();
  state.houses.forEach((house) => { ctx.fillStyle = house.destroyed ? '#5d6868' : house.index === state.selectedHouse ? colors.orange : colors.cyan; ctx.fillRect(x + house.x / WORLD.width * size - 2, y + house.y / WORLD.height * size - 2, 4, 4); });
  ctx.fillStyle = colors.text; ctx.beginPath(); ctx.arc(x + state.player.x / WORLD.width * size, y + state.player.y / WORLD.height * size, 3, 0, Math.PI * 2); ctx.fill();
}

function drawHouse(house, x, y, selected, scale = 1) {
  const size = Math.max(18, WIDTH * .075 * scale);
  if (selected) { ctx.fillStyle = state.role === 'mouse' ? 'rgba(100,222,210,.2)' : 'rgba(255,180,91,.2)'; ctx.beginPath(); ctx.arc(x, y, size * 1.03, 0, Math.PI * 2); ctx.fill(); }
  const artSize = size * 2.35;
  const hasHouseArt = !house.destroyed && drawAsset('house', x - artSize * .5, y - artSize * .72, artSize, artSize, .96);
  if (!hasHouseArt) {
    const body = house.destroyed ? '#39484a' : house.underAttack ? '#704335' : '#24484b';
    roundedRect(x - size * .57, y - size * .45, size * 1.14, size * .9, 6, body, selected ? (state.role === 'mouse' ? colors.cyan : colors.orange) : 'rgba(210,229,215,.35)');
    ctx.fillStyle = house.destroyed ? '#596362' : house.level >= 3 ? '#9c6a3b' : '#7a5a3c'; ctx.beginPath(); ctx.moveTo(x - size * .72, y - size * .35); ctx.lineTo(x, y - size * .78); ctx.lineTo(x + size * .72, y - size * .35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#163238'; ctx.fillRect(x - size * .12, y + size * .04, size * .24, size * .35);
    ctx.fillStyle = house.destroyed ? '#899694' : '#ffe09d'; ctx.fillRect(x - size * .4, y - size * .05, size * .2, size * .16); ctx.fillRect(x + size * .2, y - size * .05, size * .2, size * .16);
  }
  // 房屋内部四个功能区的缩略表达：大门、前院炮台槽、内庭设备槽、资源室。
  ctx.fillStyle = house.destroyed ? '#687474' : '#a8d6cc'; ctx.fillRect(x - size * .12, y + size * .04, size * .24, size * .35);
  ctx.fillStyle = '#6fd7c9'; ctx.beginPath(); ctx.arc(x - size * .42, y + size * .45, Math.max(2, size * .07), 0, Math.PI * 2); ctx.arc(x + size * .42, y + size * .45, Math.max(2, size * .07), 0, Math.PI * 2); ctx.fill();
  const doorKey = house.destroyed ? 'doorDamage4' : house.hp / house.maxHp < .25 ? 'doorDamage4' : house.hp / house.maxHp < .5 ? 'doorDamage3' : house.hp / house.maxHp < .75 ? 'doorDamage2' : house.hp / house.maxHp < .95 ? 'doorDamage1' : `door${Math.min(4, house.level)}`;
  drawAsset(doorKey, x - size * .48, y + size * .03, size * .96, size * .8, .92);
  if (house.turrets > 0) drawAsset('turret', x - size * .6, y + size * .1, size * .42, size * .42, .95);
  if (house.devices?.length) { const deviceKey = house.devices.includes('shock') ? 'shock' : house.devices.includes('trap') ? 'trap' : 'heal'; drawAsset(deviceKey, x + size * .28, y + size * .12, size * .38, size * .38, .95); }
  ctx.fillStyle = colors.orange; ctx.beginPath(); ctx.arc(x + size * .42, y - size * .28, Math.max(2, size * .06), 0, Math.PI * 2); ctx.fill();
  text(String(house.index + 1), x, y + size * 1.08, 11, colors.text, 'center', '700');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - size * .62, y + size * .78, size * 1.24, 4); ctx.fillStyle = house.destroyed ? '#879391' : colors.cyan; ctx.fillRect(x - size * .62, y + size * .78, size * 1.24 * house.hp / house.maxHp, 4);
}

function drawCharacter(x, y, role, player, scale = 1) {
  const radius = Math.max(8, WIDTH * .028 * scale); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + radius * .8, radius * 1.2, radius * .46, 0, 0, Math.PI * 2); ctx.fill();
  const artKey = role === 'cat' ? 'cat' : 'mouse'; const artSize = radius * 3.15;
  if (drawAsset(artKey, x - artSize / 2, y - artSize * .82, artSize, artSize, player ? 1 : .88)) { if (player) { ctx.strokeStyle = role === 'cat' ? colors.orange : colors.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius * 1.08, 0, Math.PI * 2); ctx.stroke(); } return; }
  ctx.fillStyle = role === 'cat' ? '#e68545' : '#9bc9bc'; ctx.strokeStyle = player ? '#f4f8df' : 'rgba(255,255,255,.45)'; ctx.lineWidth = player ? 2 : 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = role === 'cat' ? '#ffb271' : '#d8f4df'; ctx.beginPath(); ctx.arc(x - radius * .52, y - radius * .7, radius * .42, 0, Math.PI * 2); ctx.arc(x + radius * .52, y - radius * .7, radius * .42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10252a'; ctx.beginPath(); ctx.arc(x - radius * .3, y - radius * .08, radius * .11, 0, Math.PI * 2); ctx.arc(x + radius * .3, y - radius * .08, radius * .11, 0, Math.PI * 2); ctx.fill();
}

function drawPanel() {
  const top = Math.min(HEIGHT - 255, 620);
  roundedRect(14, top, WIDTH - 28, 42, 10, colors.panel, colors.line);
  const cells = [['资源', Math.floor(state.gold)], ['存活鼠', state.miceAlive], ['存活猫', state.catsAlive]];
  cells.forEach((item, index) => { const x = 14 + (WIDTH - 28) / 3 * index; if (index) line(x, top + 7, x, top + 35); if (index === 0) drawAsset('coin', x + (WIDTH - 28) / 6 - 28, top + 9, 18, 18, .95); text(item[0], x + (WIDTH - 28) / 6, top + 15, 9, colors.muted, 'center'); text(String(item[1]), x + (WIDTH - 28) / 6, top + 33, 15, colors.text, 'center', '700'); });
  const cardTop = top + 49; roundedRect(14, cardTop, WIDTH - 28, 45, 9, colors.panel, colors.line);
  const currentHouse = state.houses[state.selectedHouse] || state.houses[0]; const hp = state.role === 'mouse' ? currentHouse.hp : state.catHp; const max = state.role === 'mouse' ? currentHouse.maxHp : state.catMaxHp;
  text(state.role === 'mouse' ? `老鼠 · 守卫房子 ${state.selectedHouse + 1}` : `猫 · 目标房子 ${state.selectedHouse + 1}`, 24, cardTop + 18, 11, state.role === 'mouse' ? colors.cyan : colors.orange, 'left', '700');
  roundedRect(24, cardTop + 27, WIDTH - 110, 7, 4, '#07141a'); roundedRect(24, cardTop + 27, (WIDTH - 110) * hp / max, 7, 4, state.role === 'mouse' ? colors.green : colors.red); text(`${Math.round(hp / max * 100)}%`, WIDTH - 24, cardTop + 35, 9, colors.muted, 'right');
  const quick = quickUpgradeIndices(); const y = cardTop + 52; const gap = 6; const w = (WIDTH - 28 - gap * 2) / 3;
  quick.forEach((index, slot) => { const item = (state.role === 'mouse' ? mouseUpgrades : catUpgrades)[index]; const owned = !!state.upgrades[item[3]]; roundedRect(14 + slot * (w + gap), y, w, 42, 7, owned ? '#263a3d' : colors.panel2, owned ? colors.line : 'rgba(100,222,210,.28)'); text(item[0].replace('事件卡 · ', ''), 14 + slot * (w + gap) + w / 2, y + 17, 9, owned ? colors.muted : colors.text, 'center', '700'); text(owned ? '已拥有' : (state.role === 'mouse' ? `${item[2]}金` : (index < 3 ? `需${item[2]}门` : `${item[2]}分`)), 14 + slot * (w + gap) + w / 2, y + 32, 8, owned ? colors.muted : colors.cyan, 'center'); });
  drawEventSummary(cardTop + 101); drawControls();
}

function drawEventSummary(top) {
  roundedRect(14, top, WIDTH - 28, 34, 8, colors.panel2, colors.line);
  text(state.activeEvent ? `事件：${state.activeEvent.name}` : '中心事件：每 60 秒刷新', 23, top + 14, 9, state.activeEvent?.color || colors.orange, 'left', '700');
  text(state.activeEvent ? state.activeEvent.description : `距刷新 ${Math.ceil(state.eventCooldown)}s`, WIDTH - 23, top + 14, 8, colors.muted, 'right');
  const aiSummary = state.aiMice ? `AI：${state.aiMice.filter((ai) => ai.state === '防守').length} 防守 / ${state.aiMice.filter((ai) => ai.state === '采集').length} 采集` : '';
  text(state.role === 'mouse' ? `部署：${state.turrets} 炮台 · ${(state.devices || []).join(' / ') || '无设备'}` : `武器：${state.upgrades.weapon4 ? 'Lv.4' : state.upgrades.weapon3 ? 'Lv.3' : state.upgrades.weapon2 ? 'Lv.2' : 'Lv.1'} · 击破 ${state.destroyedGates} 门`, 23, top + 27, 8, colors.muted);
  text(aiSummary, WIDTH - 23, top + 27, 8, colors.muted, 'right');
}

function quickUpgradeIndices() {
  if (state.role === 'mouse') { const level = state.houses[state.selectedHouse]?.level || 1; return [Math.min(2, level - 1), 3, 5]; }
  const weapon = state.upgrades.weapon3 ? 2 : state.upgrades.weapon2 ? 1 : 0; return [weapon, 3, 4];
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
  const y = HEIGHT - 73; text('点击小镇任意位置自动寻路', 18, y + 5, 10, colors.muted);
  if (state.role === 'cat') { roundedRect(WIDTH - 158, y - 23, 68, 46, 10, state.pressed === 'attack' ? '#704525' : '#3a291b', 'rgba(255,180,91,.5)'); text('攻击', WIDTH - 124, y + 5, 11, '#ffe0ae', 'center', '700'); }
  roundedRect(WIDTH - 80, y - 23, 66, 46, 10, state.pressed === 'event' ? '#21645f' : '#153b3d', 'rgba(100,222,210,.35)'); text(state.role === 'cat' ? '技能' : '事件', WIDTH - 47, y + 5, 10, colors.cyan, 'center', '700');
}

function drawLobby() {
  drawHeader(); text('非对称攻防 · 10 鼠 vs 2 猫', WIDTH / 2, 122, 18, colors.text, 'center', '800');
  text('随机分配阵营 · 8 分钟攻防 · 小镇大地图', WIDTH / 2, 151, 11, colors.muted, 'center');
  roundedRect(22, 190, WIDTH - 44, 176, 16, colors.panel, colors.line);
  text('老鼠', 43, 226, 16, colors.cyan, 'left', '800'); text('守住房门，升级炮台和设备', 43, 250, 11, colors.muted);
  text('猫', 43, 292, 16, colors.orange, 'left', '800'); text('击破 10 个大门，逐步强化武器', 43, 316, 11, colors.muted);
  text('角色在 2000×2000 小镇中移动，屏幕为跟随镜头', 43, 348, 10, colors.text);
  roundedRect(24, HEIGHT - 132, WIDTH - 48, 54, 10, state.pressed === 'match' ? '#83efe3' : colors.cyan, colors.line);
  text('开始匹配', WIDTH / 2, HEIGHT - 98, 15, colors.bg, 'center', '800');
}

function drawResult() {
  drawHeader(); roundedRect(20, 132, WIDTH - 40, 205, 16, colors.panel, colors.line);
  const mouseWin = state.result.startsWith('老鼠'); const resultArt = mouseWin ? (state.role === 'mouse' ? 'mouseWin' : 'catLose') : (state.role === 'mouse' ? 'mouseLose' : 'catWin');
  drawAsset(resultArt, WIDTH / 2 - 47, 142, 94, 94, .98);
  text(mouseWin ? '老鼠方获胜' : '猫方获胜', WIDTH / 2, 246, 26, mouseWin ? colors.cyan : colors.orange, 'center', '800');
  text(state.result, WIDTH / 2, 278, 11, colors.text, 'center'); text(`存活老鼠 ${state.miceAlive} · 存活猫 ${state.catsAlive}`, WIDTH / 2, 306, 12, colors.muted, 'center'); text(`击破大门 ${state.destroyedGates} · 积分 ${Math.floor(state.score)}`, WIDTH / 2, 328, 12, colors.muted, 'center');
  roundedRect(24, HEIGHT - 120, WIDTH - 48, 50, 10, colors.cyan, colors.line); text('重新匹配', WIDTH / 2, HEIGHT - 88, 14, colors.bg, 'center', '800');
}

function drawMatchResult() {
  drawHeader(); text('匹配完成', WIDTH / 2, HEIGHT * .34, 20, colors.text, 'center', '800');
  text(state.role === 'mouse' ? '你被分配为：老鼠' : '你被分配为：猫', WIDTH / 2, HEIGHT * .43, 25, state.role === 'mouse' ? colors.cyan : colors.orange, 'center', '800');
  text(state.role === 'mouse' ? `负责守卫房子 ${state.selectedHouse + 1}` : '目标：击破全部 10 个房门', WIDTH / 2, HEIGHT * .49, 12, colors.muted, 'center');
}

function render() {
  drawBackground();
  if (state.phase === 'lobby') { drawLobby(); return; }
  if (state.phase === 'match') { drawMatchResult(); return; }
  if (state.phase === 'result') { drawResult(); return; }
  drawHeader(); text(state.phase === 'deploy' ? `部署期 ${Math.ceil(state.phaseTime)}s` : `${formatTime(state.timeLeft)} · ${battleStage()}`, WIDTH - 18, 52, 10, colors.orange, 'right', '700'); drawMap(); drawPanel();
}

function battleStage() { const elapsed = 480 - state.timeLeft; if (state.phase === 'deploy') return '部署期'; if (elapsed < 90) return '试探期'; if (elapsed < 240) return '拉锯期'; if (elapsed < 360) return '决战期'; return '收尾期'; }

function setRole(role) { if (state.role === role) return; state.role = role; state.selectedHouse = role === 'mouse' ? 0 : 4; addFeed(role === 'mouse' ? '已切换到老鼠阵营。' : '已切换到猫阵营。'); }

function upgrade(index) {
  const item = (state.role === 'mouse' ? mouseUpgrades : catUpgrades)[index]; if (!item || state.upgrades[item[3]]) return;
  if (state.role === 'mouse') { if (state.gold < item[2]) return; state.gold -= item[2]; }
  else if (item[3].startsWith('weapon')) { if (state.destroyedGates < item[2]) return; }
  else { if (state.gold < item[2]) return; state.gold -= item[2]; }
  state.upgrades[item[3]] = true;
  const house = state.houses[state.selectedHouse];
  if (item[3] === 'door2') { house.level = 2; house.armor = 10; house.maxHp = 800; house.hp = Math.max(house.hp, 800); }
  if (item[3] === 'door3' && house.level >= 2) { house.level = 3; house.armor = 20; house.maxHp = 1200; house.hp = Math.max(house.hp, 1200); }
  if (item[3] === 'door4' && house.level >= 3) { house.level = 4; house.armor = 30; house.maxHp = 1800; house.hp = Math.max(house.hp, 1800); }
  if (item[3] === 'turret') { state.turrets += 1; house.turrets = (house.turrets || 0) + 1; }
  if (item[3] === 'turret2') { house.turrets = Math.max(1, house.turrets || 0); }
  if (['trap', 'shock', 'heal'].includes(item[3])) { state.devices.push(item[3]); house.devices = house.devices || []; house.devices.push(item[3]); }
  addFeed(`${item[0]}已完成。`);
}

function attack() {
  if (state.role !== 'cat' || Date.now() - state.lastAttack < 520) return; state.lastAttack = Date.now(); const house = state.houses[state.selectedHouse]; if (!house || house.destroyed) return;
  house.underAttack = true;
  if (Math.hypot(state.player.x - house.x, state.player.y - house.y) > 150) navigateTo(house.x, house.y);
  addFeed(`猫锁定房子 ${house.index + 1}，进入攻击范围后自动攻击。`);
}

function triggerEvent() {
  if (state.role === 'cat' && state.phase === 'battle' && state.cardCooldown <= 0) {
    const card = ['dash', 'shield', 'critical'].find((id) => state.upgrades[id]);
    if (card) { state.buffs[card] = card === 'critical' ? 1 : 5; state.cardCooldown = 8; addFeed(`猫事件卡：${card === 'dash' ? '疾风突进' : card === 'shield' ? '铁壁护盾' : '致命一击'}。`); return; }
  }
  if (state.eventCooldown > 0) return; const event = events[Math.floor(Math.random() * events.length)]; state.activeEvent = event; state.eventCooldown = 60; state.eventLeft = event.duration;
  if (event.name === '资源雨') state.gold += 200; if (event.name === '猫薄荷') state.catHp = Math.min(state.catMaxHp, state.catHp + 300); if (event.name === '地震') state.houses.forEach((house) => { house.hp = Math.max(0, house.hp - 100); }); addFeed(`中心事件：${event.name}。`);
}

function updateAiMice(delta) {
  state.aiMice.forEach((ai) => {
    ai.timer -= delta;
    if (ai.timer > 0) return;
    ai.timer = ai.reaction;
    if (ai.state === '空闲') ai.state = ai.gold >= 200 ? '升级' : '采集';
    else if (ai.state === '采集') { ai.gold += (ai.difficulty === '困难' ? 12 : ai.difficulty === '简单' ? 7 : 10) * ai.reaction; if (ai.gold >= 200) ai.state = '升级'; }
    else if (ai.state === '升级') { ai.gold -= 200; const house = state.houses[ai.id % state.houses.length]; house.turrets = Math.max(1, house.turrets); ai.state = '防守'; }
    else if (ai.state === '防守') { const threatened = state.houses.some((house) => house.underAttack); if (threatened) ai.state = '撤退'; }
    else if (ai.state === '撤退') { const house = state.houses[ai.id % state.houses.length]; if (house.hp < house.maxHp) house.hp = Math.min(house.maxHp, house.hp + 15 * ai.reaction); if (house.hp > house.maxHp * .3) ai.state = '空闲'; }
  });
}

function updateAiCats(delta) {
  if (!state.aiCats) return;
  state.aiCats.forEach((cat) => {
    const target = state.houses.find((house) => !house.destroyed && house.underAttack) || state.houses.find((house) => !house.destroyed);
    if (!target) return;
    cat.target = target.index;
    const dx = target.x - cat.x; const dy = target.y - cat.y; const distance = Math.hypot(dx, dy); const step = Math.min(distance, 115 * delta);
    if (distance > 130) { cat.x += dx / distance * step; cat.y += dy / distance * step; }
  });
}

function applyCombat(delta) {
  const house = state.houses[state.selectedHouse];
  if (!house || house.destroyed) return;
  // 文档公式：实际伤害 = 攻击力 * (1 - min(护甲/(护甲+100), .5))。
  const armorRate = Math.min(house.armor / (house.armor + 100), .5);
  if (state.role === 'mouse' && state.turrets > 0 && house.underAttack) {
    const turretDps = state.upgrades.turret2 ? 50 : 30;
    state.catHp = Math.max(0, state.catHp - turretDps * state.turrets * delta);
  }
  if (state.role === 'cat' && !state.buffs.shield && house.devices?.includes('shock') && Math.hypot(state.player.x - house.x, state.player.y - house.y) < 180) state.catHp = Math.max(0, state.catHp - 20 * delta);
  if (state.role === 'cat' && state.player.path.length === 0 && Math.hypot(state.player.x - house.x, state.player.y - house.y) < 150) {
    let attackDps = state.upgrades.weapon4 ? 180 : state.upgrades.weapon3 ? 120 : state.upgrades.weapon2 ? 80 : 50;
    if (state.buffs.critical) { attackDps *= 3; delete state.buffs.critical; }
    house.hp = Math.max(0, house.hp - attackDps * (1 - armorRate) * delta);
    house.underAttack = true;
    if (state.upgrades.lifesteal) state.catHp = Math.min(state.catMaxHp, state.catHp + attackDps * .05 * delta);
    if (house.hp <= 0 && !house.destroyed) { house.destroyed = true; state.destroyedGates += 1; state.miceAlive = Math.max(0, state.miceAlive - 1); state.gold += 300 + 100 * state.destroyedGates; state.score += 15; addFeed(`房子 ${house.index + 1} 被攻破，老鼠淘汰。`); }
  }
}

function update(delta) {
  state.touchFx.life = Math.max(0, state.touchFx.life - delta * 1.8); state.cardCooldown = Math.max(0, state.cardCooldown - delta);
  Object.keys(state.buffs).forEach((key) => { if (key !== 'critical') state.buffs[key] = Math.max(0, state.buffs[key] - delta); });
  state.syncElapsed += delta;
  if (state.syncElapsed >= 5) { state.syncElapsed = 0; syncRoom(); }
  if (state.phase === 'match') { state.phaseTime -= delta; if (state.phaseTime <= 0) beginBattle(); return; }
  if (state.phase === 'deploy') { state.phaseTime = Math.max(0, state.phaseTime - delta); updateMovement(delta); if (state.phaseTime === 0) { state.phase = 'battle'; addFeed('部署完成：攻防对抗开始。'); } return; }
  if (state.phase !== 'battle' || state.timeLeft <= 0) return;
  state.timeLeft = Math.max(0, state.timeLeft - delta); state.eventCooldown = Math.max(0, state.eventCooldown - delta); state.eventLeft = Math.max(0, state.eventLeft - delta);
  state.gold += delta * (state.role === 'mouse' ? (state.upgrades.room3 ? 22 : state.upgrades.room2 ? 15 : 10) : 3);
  updateMovement(delta); updateAiMice(delta); updateAiCats(delta); applyCombat(delta);
  if (state.resourcePoints) state.resourcePoints.forEach((point) => { if (point.active && Math.hypot(point.x - state.player.x, point.y - state.player.y) < 42) { point.active = false; state.gold += 50; addFeed('拾取地图资源点：+50 金。'); } });
  if (state.eventCooldown <= 0 && Math.hypot(state.player.x - 1000, state.player.y - 1000) < 140) triggerEvent();
  if (state.catsAlive <= 0 || state.catHp <= 0) finish('老鼠方获胜：全部猫 HP 归零。');
  else if (state.destroyedGates >= 10) finish('猫方获胜：全部 10 个大门被攻破。');
  else if (state.timeLeft <= 0) finish(state.miceAlive > 0 ? '老鼠方获胜：8 分钟时仍有老鼠存活。' : '猫方获胜：8 分钟时没有老鼠存活。');
}

function finish(result) { if (state.phase === 'result') return; state.phase = 'result'; state.result = result; addFeed(result); }

function updateMovement(delta) {
  const dx = state.player.targetX - state.player.x; const dy = state.player.targetY - state.player.y; const distance = Math.hypot(dx, dy);
  const selected = state.houses[state.selectedHouse]; const trapped = state.role === 'cat' && selected?.devices?.includes('trap') && Math.hypot(state.player.x - selected.x, state.player.y - selected.y) < 180;
  if (distance > 3) { const speed = state.role === 'cat' ? (trapped ? 70 : state.buffs.dash > 0 ? 252 : 140) : 100; const step = Math.min(distance, speed * delta); state.player.x += dx / distance * step; state.player.y += dy / distance * step; }
  else if (state.player.path.length) { state.player.path.shift(); const next = state.player.path[0]; if (next) { state.player.targetX = next.x; state.player.targetY = next.y; } }
  state.camera.x += (state.player.x - state.camera.x) * Math.min(1, delta * 7); state.camera.y += (state.player.y - state.camera.y) * Math.min(1, delta * 7);
}

function hit(x, y, left, top, right, bottom) { return x >= left && x <= right && y >= top && y <= bottom; }

function touchStart(touch) {
  const x = touch.clientX || touch.x; const y = touch.clientY || touch.y;
  state.touchFx = { x, y, life: 1 };
  if (state.phase === 'lobby') { if (y > HEIGHT - 170) { state.pressed = 'match'; startMatch(); } return; }
  if (state.phase === 'result') { if (y > HEIGHT - 150) resetGame(); return; }
  if (state.phase !== 'battle' && state.phase !== 'deploy') return;
  if (y > HEIGHT - 120 && x > WIDTH - 95) { state.pressed = 'event'; triggerEvent(); return; }
  if (state.role === 'cat' && y > HEIGHT - 120 && x > WIDTH - 175 && x < WIDTH - 85) { state.pressed = 'attack'; attack(); return; }
  const mapTop = 108; const mapBottom = Math.min(HEIGHT - 265, 610);
  if (y >= mapTop && y <= mapBottom) {
    const mapHeight = mapBottom - mapTop; const scale = Math.min((WIDTH - 28) / 760, mapHeight / 760) * 1.15;
    const targetX = Math.max(0, Math.min(WORLD.width, state.camera.x + (x - WIDTH / 2) / scale));
    const targetY = Math.max(0, Math.min(WORLD.height, state.camera.y + (y - (mapTop + mapHeight / 2)) / scale));
    navigateTo(targetX, targetY);
    const house = state.houses.find((item) => Math.hypot(item.x - targetX, item.y - targetY) < 120); if (house) state.selectedHouse = house.index;
    addFeed(`自动寻路至 ${Math.round(targetX)}, ${Math.round(targetY)}。`); return;
  }
  const quick = quickUpgradeIndices(); const panelTop = Math.min(HEIGHT - 255, 620); const rowTop = panelTop + 49 + 52; const gap = 6; const w = (WIDTH - 28 - gap * 2) / 3;
  quick.forEach((index, slot) => { if (hit(x, y, 14 + slot * (w + gap), rowTop, 14 + slot * (w + gap) + w, rowTop + 42)) upgrade(index); });
}

function updateJoystick(x, y) { const baseX = 55; const baseY = HEIGHT - 73; const dx = x - baseX; const dy = y - baseY; const length = Math.max(1, Math.hypot(dx, dy)); const amount = Math.min(1, 27 / length); state.move.x = dx / length * amount; state.move.y = dy / length * amount; }
function touchMove() {}
function touchEnd() { state.pressed = ''; }

wx.onTouchStart((event) => { if (event.touches?.[0]) touchStart(event.touches[0]); });
wx.onTouchMove((event) => { if (event.touches?.[0]) touchMove(event.touches[0]); });
wx.onTouchEnd(touchEnd);

function checkServer() { wx.request({ url: `${API_BASE}/api/health`, timeout: 10000, success: (response) => { state.serverOnline = !!response.data?.ok; }, fail: () => { state.serverOnline = false; } }); }

function frame() { const now = Date.now(); const delta = Math.min(.05, (now - state.lastTime) / 1000); state.lastTime = now; update(delta); render(); requestAnimationFrame(frame); }

loadAssets(); resetGame(); checkServer(); frame();
