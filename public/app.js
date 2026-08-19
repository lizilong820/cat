const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.querySelector('.stage-frame');
const roleButtons = [...document.querySelectorAll('.role-button')];
const upgradeList = document.querySelector('#upgradeList');
const feed = document.querySelector('#feed');
const joystick = document.querySelector('#joystick');
const joystickKnob = document.querySelector('#joystickKnob');

const EVENT_POOL = [
  { name: '暴风雪', description: '全场猫移速下降 30%，持续 15 秒。', color: '#8ccaff', duration: 15 },
  { name: '狂怒', description: '全场猫攻击提升 50%，持续 10 秒。', color: '#ff8d64', duration: 10 },
  { name: '资源雨', description: '全场老鼠获得 200 金币。', color: '#ffd36c', duration: 0 },
  { name: '猫薄荷', description: '全场猫回复 300 HP。', color: '#87e08d', duration: 0 },
  { name: '地震', description: '全场大门失去 100 HP。', color: '#ce9bff', duration: 0 }
];

const mouseUpgrades = [
  { id: 'door', name: '房门强化', detail: 'HP +300，护甲提升', cost: 120 },
  { id: 'turret', name: '建造炮台', detail: '范围伤害 30/s', cost: 160 },
  { id: 'trap', name: '捕鼠夹', detail: '减速猫 50% / 3s', cost: 100 },
  { id: 'heal', name: '治疗站', detail: '炮台持续回复', cost: 240 }
];

const catUpgrades = [
  { id: 'weapon', name: '武器强化', detail: '攻击力 +30/s', cost: 180 },
  { id: 'dash', name: '疾风突进', detail: '移动速度 +80% / 5s', cost: 120 },
  { id: 'shield', name: '铁壁护盾', detail: '免疫伤害 / 3s', cost: 200 },
  { id: 'critical', name: '致命一击', detail: '下次攻击伤害 ×3', cost: 260 }
];

const state = {
  role: 'mouse',
  timeLeft: 480,
  eventCooldown: 60,
  event: null,
  eventRemaining: 0,
  gold: 320,
  catsAlive: 2,
  miceAlive: 10,
  playerHp: 1000,
  playerMaxHp: 1000,
  catHp: 1000,
  catMaxHp: 1000,
  selectedHouse: 0,
  houses: [],
  turrets: 0,
  devices: [],
  upgrades: new Set(),
  pointer: { x: 0, y: 0 },
  move: { x: 0, y: 0 },
  lastFrame: performance.now(),
  lastAttack: 0,
  feed: []
};

function resetGame() {
  state.timeLeft = 480;
  state.eventCooldown = 60;
  state.event = null;
  state.eventRemaining = 0;
  state.gold = 320;
  state.catsAlive = 2;
  state.miceAlive = 10;
  state.playerHp = 1000;
  state.catHp = 1000;
  state.selectedHouse = 0;
  state.turrets = 0;
  state.devices = [];
  state.upgrades = new Set();
  state.feed = [];
  state.houses = Array.from({ length: 10 }, (_, index) => ({
    index,
    hp: 500,
    maxHp: 500,
    level: 1,
    destroyed: false,
    underAttack: false
  }));
  addFeed('新对局开始：请选择阵营并守住或击破房门。');
  renderUpgradeList();
  updateUi();
}

function addFeed(message) {
  const time = Math.max(0, state.timeLeft);
  state.feed.unshift({ message, time });
  state.feed = state.feed.slice(0, 4);
  feed.innerHTML = state.feed.map((item) => `<div class="feed-line"><time>${formatTime(item.time)}</time>${item.message}</div>`).join('');
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function setRole(role) {
  if (state.role === role) return;
  state.role = role;
  state.selectedHouse = role === 'mouse' ? 0 : 4;
  roleButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.role === role));
  document.querySelector('#canvasHint').textContent = role === 'mouse'
    ? '拖动左下摇杆移动，靠近中心事件区可触发事件'
    : '靠近房门后点击攻击，利用升级和事件压制鼠阵营';
  addFeed(role === 'mouse' ? '已切换到老鼠阵营：先升级房门或建造炮台。' : '已切换到猫阵营：先观察房门状态，再选择突破路线。');
  updateUi();
}

function upgrade(id) {
  const options = state.role === 'mouse' ? mouseUpgrades : catUpgrades;
  const item = options.find((option) => option.id === id);
  if (!item || state.upgrades.has(id) || state.gold < item.cost) return;
  state.gold -= item.cost;
  state.upgrades.add(id);
  if (state.role === 'mouse') {
    if (id === 'door') {
      const house = state.houses[state.selectedHouse];
      house.level = Math.min(4, house.level + 1);
      house.maxHp += 300;
      house.hp = Math.min(house.maxHp, house.hp + 300);
      addFeed(`房子 ${house.index + 1} 房门升级到 Lv.${house.level}。`);
    }
    if (id === 'turret') { state.turrets += 1; addFeed('炮台已部署，进入范围的猫会持续受到伤害。'); }
    if (id === 'trap') { state.devices.push('trap'); addFeed('捕鼠夹已部署，猫靠近时会被减速。'); }
    if (id === 'heal') { state.devices.push('heal'); addFeed('治疗站已部署，炮台将获得持续回复。'); }
  } else {
    if (id === 'weapon') addFeed('猫的机械爪已强化，房门承伤提高。');
    if (id === 'dash') addFeed('疾风突进已准备，移动速度短时提升。');
    if (id === 'shield') addFeed('铁壁护盾已准备，下一次受击可免疫。');
    if (id === 'critical') addFeed('致命一击已准备，下一次攻击造成三倍伤害。');
  }
  renderUpgradeList();
  updateUi();
}

function attack() {
  const now = performance.now();
  if (now - state.lastAttack < 520 || state.role !== 'cat') return;
  state.lastAttack = now;
  const house = state.houses[state.selectedHouse];
  if (!house || house.destroyed) {
    addFeed('当前房门已被摧毁，请点击地图选择其他目标。');
    return;
  }
  const power = state.upgrades.has('critical') ? 150 : state.upgrades.has('weapon') ? 80 : 50;
  house.hp = Math.max(0, house.hp - power);
  house.underAttack = true;
  state.gold += 12;
  if (state.upgrades.has('critical')) state.upgrades.delete('critical');
  addFeed(`猫攻击房子 ${house.index + 1}，房门 -${power} HP。`);
  if (house.hp === 0) {
    house.destroyed = true;
    state.miceAlive = Math.max(0, state.miceAlive - 1);
    state.gold += 100;
    addFeed(`房子 ${house.index + 1} 被攻破，鼠玩家淘汰。`);
  }
  renderUpgradeList();
  updateUi();
}

function triggerEvent() {
  if (state.eventCooldown > 0 && state.event) return;
  const event = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
  state.event = event;
  state.eventCooldown = 60;
  state.eventRemaining = event.duration;
  if (event.name === '资源雨') state.gold += 200;
  if (event.name === '猫薄荷') state.catHp = Math.min(state.catMaxHp, state.catHp + 300);
  if (event.name === '地震') state.houses.forEach((house) => { house.hp = Math.max(0, house.hp - 100); });
  addFeed(`中心事件：${event.name}。${event.description}`);
  const banner = document.querySelector('#eventBanner');
  banner.textContent = `${event.name} · ${event.description}`;
  banner.classList.remove('is-hidden');
  setTimeout(() => banner.classList.add('is-hidden'), 3200);
  updateUi();
}

function updateUi() {
  document.querySelector('#timerText').textContent = formatTime(state.timeLeft);
  document.querySelector('#goldText').textContent = Math.floor(state.gold);
  document.querySelector('#miceAliveText').textContent = state.miceAlive;
  document.querySelector('#catsAliveText').textContent = state.catsAlive;
  document.querySelector('#eventTimerText').textContent = state.eventCooldown > 0 ? `${Math.ceil(state.eventCooldown)}s` : '可触发';
  document.querySelector('#eventName').textContent = state.event ? state.event.name : '等待随机事件';
  document.querySelector('#eventDescription').textContent = state.event?.description || '任何玩家进入中心区域，都可能改变战局。';
  document.querySelector('#eventName').style.color = state.event?.color || 'var(--orange)';
  const isMouse = state.role === 'mouse';
  document.querySelector('#roleText').textContent = isMouse ? '老鼠 · 守门人' : '猫 · 猎手';
  document.querySelector('#playerHint').textContent = isMouse ? `房子 ${state.selectedHouse + 1} · 建设与防守` : `目标房子 ${state.selectedHouse + 1} · 突破与追击`;
  document.querySelector('#playerAvatar').textContent = isMouse ? '鼠' : '猫';
  document.querySelector('#playerAvatar').className = `player-avatar ${isMouse ? 'mouse-avatar' : 'cat-avatar'}`;
  const hp = isMouse ? state.houses[state.selectedHouse]?.hp ?? 0 : state.catHp;
  const maxHp = isMouse ? state.houses[state.selectedHouse]?.maxHp ?? 500 : state.catMaxHp;
  document.querySelector('#playerHealthBar').style.width = `${Math.max(0, Math.min(100, hp / maxHp * 100))}%`;
  document.querySelector('#playerHealthBar').style.background = isMouse ? 'linear-gradient(90deg, #55d5bf, #9ae49c)' : 'linear-gradient(90deg, #ff776d, #ffbd70)';
  document.querySelector('#playerHealthText').textContent = `${Math.round(hp / maxHp * 100)}%`;
  document.querySelector('#upgradeTitle').textContent = isMouse ? '防守升级' : '猫的强化';
  document.querySelector('#attackButton').style.display = isMouse ? 'none' : 'inline-flex';
}

function renderUpgradeList() {
  const options = state.role === 'mouse' ? mouseUpgrades : catUpgrades;
  upgradeList.innerHTML = options.map((item) => {
    const owned = state.upgrades.has(item.id);
    const unavailable = owned || state.gold < item.cost;
    return `<div class="upgrade-row"><div class="upgrade-copy"><strong>${item.name}</strong><span>${item.detail} · ${item.cost} 金</span></div><button class="upgrade-button" data-upgrade="${item.id}" ${unavailable ? 'disabled' : ''}>${owned ? '已拥有' : '升级'}</button></div>`;
  }).join('');
  upgradeList.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => upgrade(button.dataset.upgrade)));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawGame() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height * .49;
  const radiusX = Math.min(width, height) * .34;
  const radiusY = height * .32;
  const scale = Math.min(width, height) / 460;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0b2730');
  gradient.addColorStop(1, '#0a1a21');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(100, 222, 210, .08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - height * .1, height); ctx.stroke(); }

  ctx.fillStyle = 'rgba(78, 150, 128, .15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, radiusX * 1.18, radiusY * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124, 211, 184, .22)';
  ctx.setLineDash([5, 8]);
  ctx.beginPath(); ctx.ellipse(cx, cy, radiusX * 1.18, radiusY * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  const centerRadius = Math.max(33, width * .115);
  ctx.fillStyle = state.event ? `${state.event.color}2b` : 'rgba(100, 222, 210, .09)';
  ctx.beginPath(); ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = state.event?.color || 'rgba(100, 222, 210, .48)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#d9f2e7'; ctx.font = `700 ${Math.max(11, 12 * scale)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('事件区', cx, cy + 4 * scale);

  state.houses.forEach((house, index) => {
    const angle = -Math.PI / 2 + (index / state.houses.length) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    const selected = index === state.selectedHouse;
    house._x = x; house._y = y;
    drawHouse(house, x, y, selected, scale);
  });

  const playerAngle = state.role === 'mouse' ? -Math.PI / 2 : Math.PI * .18;
  const playerX = cx + Math.cos(playerAngle) * radiusX * .72 + state.move.x * 13;
  const playerY = cy + Math.sin(playerAngle) * radiusY * .72 + state.move.y * 13;
  drawCharacter(playerX, playerY, state.role, scale, true);
  drawCharacter(cx + radiusX * .34, cy - radiusY * .18, 'cat', scale, false);
  drawCharacter(cx - radiusX * .2, cy + radiusY * .18, 'mouse', scale, false);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(219, 243, 233, .55)';
  ctx.font = `600 ${Math.max(10, 10 * scale)}px system-ui`;
  ctx.fillText('10 栋房屋 · 环形防线', 14, 23);
}

function drawHouse(house, x, y, selected, scale) {
  const size = Math.max(28, 37 * scale);
  ctx.save();
  ctx.translate(x, y);
  if (selected) {
    ctx.fillStyle = state.role === 'mouse' ? 'rgba(100, 222, 210, .2)' : 'rgba(255, 180, 91, .18)';
    ctx.beginPath(); ctx.arc(0, 0, size * .9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = house.destroyed ? '#38474a' : house.underAttack ? '#704335' : '#24484b';
  ctx.strokeStyle = selected ? (state.role === 'mouse' ? '#64ded2' : '#ffb45b') : 'rgba(210, 229, 215, .35)';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.beginPath(); ctx.roundRect(-size * .58, -size * .48, size * 1.16, size * .96, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = house.destroyed ? '#596362' : house.level >= 3 ? '#9c6a3b' : '#7a5a3c';
  ctx.beginPath(); ctx.moveTo(-size * .72, -size * .38); ctx.lineTo(0, -size * .8); ctx.lineTo(size * .72, -size * .38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = house.destroyed ? '#1e2d31' : '#163238';
  ctx.fillRect(-size * .13, size * .05, size * .26, size * .38);
  ctx.fillStyle = house.destroyed ? '#899694' : '#ffe09d';
  ctx.fillRect(-size * .4, -size * .05, size * .2, size * .18); ctx.fillRect(size * .2, -size * .05, size * .2, size * .18);
  ctx.fillStyle = '#d4e9df'; ctx.font = `700 ${Math.max(10, 11 * scale)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(`${house.index + 1}`, 0, size * 1.15);
  const barWidth = size * 1.25;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-barWidth / 2, size * .87, barWidth, 4);
  ctx.fillStyle = house.destroyed ? '#879391' : '#63d3c1'; ctx.fillRect(-barWidth / 2, size * .87, barWidth * (house.hp / house.maxHp), 4);
  ctx.restore();
}

function drawCharacter(x, y, role, scale, player) {
  const radius = Math.max(9, 13 * scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, radius * .72, radius * 1.2, radius * .48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = role === 'cat' ? '#e68545' : '#9bc9bc';
  ctx.strokeStyle = player ? '#f4f8df' : 'rgba(255,255,255,.45)'; ctx.lineWidth = player ? 2 : 1;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = role === 'cat' ? '#ffb271' : '#d8f4df';
  ctx.beginPath(); ctx.arc(-radius * .52, -radius * .7, radius * .42, 0, Math.PI * 2); ctx.arc(radius * .52, -radius * .7, radius * .42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10252a'; ctx.beginPath(); ctx.arc(-radius * .3, -radius * .08, radius * .11, 0, Math.PI * 2); ctx.arc(radius * .3, -radius * .08, radius * .11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function tick(delta) {
  if (state.timeLeft > 0) {
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    state.eventCooldown = Math.max(0, state.eventCooldown - delta);
    if (state.eventRemaining > 0) state.eventRemaining = Math.max(0, state.eventRemaining - delta);
    if (state.role === 'mouse') {
      state.gold += delta * (state.upgrades.has('heal') ? 13 : 10);
      const target = state.houses[state.selectedHouse];
      if (target && !target.destroyed && state.turrets > 0 && target.underAttack) {
        state.catHp = Math.max(0, state.catHp - delta * state.turrets * 8);
        if (state.catHp === 0) { state.catsAlive = Math.max(0, state.catsAlive - 1); addFeed('炮台集中火力，猫被击败。'); }
      }
    } else {
      state.gold += delta * (state.upgrades.has('weapon') ? 6 : 3);
    }
    if (state.timeLeft <= 0) addFeed(state.miceAlive > 0 ? '时间到：仍有老鼠存活，老鼠阵营获胜。' : '时间到：所有房门均已失守，猫阵营获胜。');
    if (state.catsAlive === 0) addFeed('全部猫已被击败，老鼠阵营获胜。');
  }
}

function loop(now) {
  const delta = Math.min(.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  tick(delta);
  drawGame();
  updateUi();
  requestAnimationFrame(loop);
}

function setMoveFromPointer(event) {
  const rect = joystick.getBoundingClientRect();
  const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const max = rect.width * .31;
  const dx = event.clientX - center.x;
  const dy = event.clientY - center.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const factor = Math.min(1, max / length);
  state.move.x = dx / length * factor;
  state.move.y = dy / length * factor;
  joystickKnob.style.transform = `translate(${state.move.x * max}px, ${state.move.y * max}px)`;
}

function clearMove() {
  state.move.x = 0; state.move.y = 0; joystickKnob.style.transform = 'translate(0, 0)';
}

roleButtons.forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
document.querySelector('#attackButton').addEventListener('click', attack);
document.querySelector('#eventButton').addEventListener('click', triggerEvent);
document.querySelector('#resetButton').addEventListener('click', resetGame);
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * canvas.clientWidth;
  const y = (event.clientY - rect.top) / rect.height * canvas.clientHeight;
  const target = state.houses.find((house) => Math.hypot(house._x - x, house._y - y) < 44);
  if (target) { state.selectedHouse = target.index; addFeed(`已选择房子 ${target.index + 1}。`); updateUi(); }
});
joystick.addEventListener('pointerdown', (event) => { joystick.setPointerCapture(event.pointerId); setMoveFromPointer(event); });
joystick.addEventListener('pointermove', (event) => { if (joystick.hasPointerCapture(event.pointerId)) setMoveFromPointer(event); });
joystick.addEventListener('pointerup', clearMove);
joystick.addEventListener('pointercancel', clearMove);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => {
  const keyMap = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  if (keyMap[event.key]) { event.preventDefault(); state.move = { x: keyMap[event.key][0], y: keyMap[event.key][1] }; }
  if (event.key === ' ') { event.preventDefault(); attack(); }
});
window.addEventListener('keyup', (event) => { if (['ArrowUp','w','ArrowDown','s','ArrowLeft','a','ArrowRight','d'].includes(event.key)) clearMove(); });

resetGame();
resizeCanvas();
requestAnimationFrame(loop);

fetch('/api/health').then((response) => response.json()).then((data) => {
  document.querySelector('#serverStatus').textContent = data.ok ? '在线' : '异常';
}).catch(() => { document.querySelector('#serverStatus').textContent = '离线'; });
