/*
 * T0 Phaser SceneRuntime Spike
 * 只负责舞台、热点和表现提示；不会写入人生 Core，也不使用物理、碰撞或自由移动。
 */
const WIDTH = 390;
const HEIGHT = 480;
const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const nodes = [
  { id: 'partner', kind: 'person', label: '伙伴', icon: '●', affordance: '正在等你', anchor: { x: 278, y: 300 }, color: 0xff8e78 },
  { id: 'table', kind: 'place', label: '石桌', icon: '▰', affordance: '可以写一会字', anchor: { x: 125, y: 315 }, color: 0xffd26f },
  { id: 'marbles', kind: 'prop', label: '弹珠', icon: '◆', affordance: '滚到车棚边', anchor: { x: 223, y: 352 }, color: 0x76e1c3 },
  { id: 'home', kind: 'exit', label: '家门', icon: '⌂', affordance: '照护者在喊你', anchor: { x: 62, y: 371 }, color: 0xf4b7d2 },
];

const state = {
  focused: null,
  usedSlots: 0,
  reducedMotion: prefersReduced,
  busy: false,
  eventDone: false,
  done: new Set(),
};

const els = {
  root: document.querySelector('#game-root'),
  caption: document.querySelector('#stage-caption'),
  hint: document.querySelector('#scene-hint'),
  actionTitle: document.querySelector('#action-title'),
  actions: document.querySelector('#actions'),
  objectList: document.querySelector('#object-list'),
  timeSlots: document.querySelector('#time-slots'),
  skip: document.querySelector('#skip-btn'),
  motion: document.querySelector('#motion-btn'),
};

function say(text) { els.caption.textContent = text; }

function renderTime() {
  els.timeSlots.innerHTML = Array.from({ length: 9 }, (_, i) => `<i class="${i < state.usedSlots ? 'used' : ''}"></i>`).join('');
}

function nodeById(id) { return nodes.find((node) => node.id === id); }

function actionDefinitions(id) {
  const common = {
    partner: [
      { id: 'approach', label: '加入玩耍', sub: '2格 · 蹲下来', enabled: !state.done.has('approach') },
      { id: 'ask', label: '问问发生了什么', sub: '1格 · 先听听', enabled: true },
    ],
    table: [{ id: 'write', label: '练一会字', sub: '3格 · 石桌边', enabled: !state.done.has('write') }],
    marbles: [
      { id: 'roll', label: '把弹珠滚过去', sub: '2格 · 会有回应', enabled: !state.done.has('roll') },
      { id: 'inspect', label: '捡起来看看', sub: '1格 · 先观察', enabled: true },
    ],
    home: [{ id: 'bowls', label: '帮忙摆碗', sub: '3格 · 天黑前', enabled: !state.done.has('bowls') }],
  };
  return common[id] ?? [];
}

function selectNode(id, fromCanvas = false) {
  if (state.busy) return;
  state.focused = id;
  const node = nodeById(id);
  els.actionTitle.textContent = node.label;
  els.hint.textContent = `${node.label} · ${node.affordance}`;
  renderActions();
  renderObjectList();
  gameScene?.focusNode(id, fromCanvas);
}

function renderActions() {
  const actions = actionDefinitions(state.focused);
  els.actions.innerHTML = actions.length
    ? actions.map((item) => {
      const contractId = item.id === 'approach' ? 'join-marbles' : item.id === 'roll' ? 'play-marbles' : item.id;
      return `<button type="button" class="action-button" data-action="${item.id}" data-action-id="${contractId}" ${item.enabled ? '' : 'disabled'}><b>${item.label}</b><small>${item.sub}</small></button>`;
    }).join('')
    : '<span class="action-empty">点选舞台里的对象，动作会在这里出现。</span>';
  els.actions.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => runAction(button.dataset.action)));
}

function renderObjectList() {
  els.objectList.innerHTML = nodes.map((node) => `<button type="button" class="object-button" data-node="${node.id}" data-node-id="${node.id}" aria-current="${state.focused === node.id}"><span class="object-icon" aria-hidden="true">${node.icon}</span><span class="object-copy"><b>${node.label}</b><small>${node.affordance}</small></span></button>`).join('');
  els.objectList.querySelectorAll('[data-node]').forEach((button) => button.addEventListener('click', () => selectNode(button.dataset.node)));
}

function consume(slots) { state.usedSlots = Math.min(9, state.usedSlots + slots); renderTime(); }

async function runAction(actionId) {
  if (state.busy) return;
  const slots = { approach: 2, ask: 1, write: 3, roll: 2, inspect: 1, bowls: 3 }[actionId] ?? 1;
  if (state.usedSlots + slots > 9) { say('天色已经暗了，今天只能先回家。'); return; }
  state.busy = true;
  els.skip.hidden = false;
  els.actions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  consume(slots);
  const action = actionId === 'approach' ? gameScene.approachPartner() : actionId === 'roll' ? gameScene.rollMarble() : gameScene.simpleAction(actionId);
  await action;
  gameScene?.setReducedMotion(state.reducedMotion);
  state.done.add(actionId);
  if (actionId === 'roll') state.eventDone = true;
  state.busy = false;
  els.skip.hidden = true;
  renderActions();
}

function skipCurrent() {
  gameScene?.skipPresentation();
}

els.skip.addEventListener('click', skipCurrent);
els.motion.addEventListener('click', () => {
  state.reducedMotion = !state.reducedMotion;
  document.body.classList.toggle('reduced-motion', state.reducedMotion);
  document.body.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
  els.motion.setAttribute('aria-pressed', String(state.reducedMotion));
  els.motion.textContent = state.reducedMotion ? '恢复动态' : '减少动态';
  say(state.reducedMotion ? '已减少动态，仍保留动作结果。' : '已恢复完整动作演出。');
  gameScene?.setReducedMotion(state.reducedMotion);
});

class LightScene extends Phaser.Scene {
  constructor() { super('LightScene'); this.actors = {}; this.props = {}; this.sceneTween = null; }

  create() {
    this.cameras.main.setBackgroundColor('#91b4ac');
    this.drawWorld();
    this.createActors();
    this.createHotspots();
    this.setReducedMotion(state.reducedMotion);
    this.input.keyboard?.on('keydown-ESC', () => state.busy && skipCurrent());
    window.__lightScene = this;
    window.dispatchEvent(new CustomEvent('light-scene-ready'));
  }

  drawWorld() {
    const g = this.add.graphics();
    g.fillStyle(0x8eb7ae, 1).fillRect(0, 0, WIDTH, HEIGHT);
    // 墙与午后光
    g.fillStyle(0xd9c8aa, 1).fillRect(0, 0, WIDTH, 198);
    g.fillStyle(0xcbb58e, 1).fillRect(0, 198, WIDTH, 10);
    g.fillStyle(0x8aad7b, 1).fillRect(0, 208, WIDTH, HEIGHT - 208);
    g.fillStyle(0x6f9667, 1).fillRect(0, 389, WIDTH, 91);
    // 墙砖、树影与晾衣绳
    g.lineStyle(1, 0xbba985, .55);
    for (let x = 10; x < WIDTH; x += 48) g.lineBetween(x, 28, x + 38, 28);
    for (let y = 65; y < 184; y += 38) g.lineBetween(0, y, WIDTH, y);
    g.lineStyle(2, 0x785d52, .7).lineBetween(0, 58, WIDTH, 58);
    g.fillStyle(0xe98774, .7).fillRect(26, 39, 35, 18);
    g.fillStyle(0x6b9a8d, .75).fillRect(67, 37, 28, 21);
    // 盆栽与树
    g.fillStyle(0x5c7655, 1).fillCircle(341, 69, 40).fillCircle(305, 84, 31).fillCircle(369, 93, 32);
    g.fillStyle(0x735744, 1).fillRect(338, 103, 11, 114);
    g.fillStyle(0xb16f4c, 1).fillRoundedRect(23, 222, 28, 25, 4);
    g.fillStyle(0x4e8d6b, 1).fillCircle(37, 216, 20).fillCircle(22, 219, 12).fillCircle(50, 220, 13);
    // 石桌
    g.fillStyle(0x7a8884, 1).fillRoundedRect(70, 289, 109, 21, 7);
    g.fillStyle(0x687772, 1).fillRoundedRect(83, 307, 11, 61, 5).fillRoundedRect(155, 307, 11, 61, 5);
    g.lineStyle(2, 0xb6c1b3, .6).lineBetween(83, 295, 161, 295);
    // 自行车棚、车轮和车链条
    g.fillStyle(0x688a8e, .92).fillRoundedRect(265, 216, 102, 82, 9);
    g.lineStyle(4, 0x364e5c, 1).strokeCircle(285, 299, 27).strokeCircle(354, 299, 27);
    g.lineStyle(3, 0x324552, 1).lineBetween(285, 299, 313, 260).lineBetween(313, 260, 354, 299).lineBetween(313, 260, 342, 258).lineBetween(313, 260, 301, 233);
    // 家门与台阶
    g.fillStyle(0x80604c, 1).fillRect(20, 331, 78, 98);
    g.fillStyle(0x354d54, 1).fillRoundedRect(29, 350, 50, 79, 7);
    g.fillStyle(0xd6a05f, 1).fillCircle(68, 392, 4);
    g.fillStyle(0x8c6e59, 1).fillRect(8, 426, 104, 7);
    g.fillStyle(0xa48465, 1).fillRect(1, 433, 117, 6);
    this.add.text(18, 446, '家属院 · 1984', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ebd9bd', alpha: .8 });
  }

  actor(x, y, palette, label) {
    const c = this.add.container(x, y);
    const body = this.add.graphics();
    body.fillStyle(palette.body, 1).fillRoundedRect(-13, 2, 26, 33, 10);
    body.fillStyle(palette.skin, 1).fillCircle(0, -12, 12);
    body.fillStyle(palette.hair, 1).fillCircle(-5, -19, 7).fillCircle(5, -19, 7);
    body.fillStyle(0x26333b, 1).fillCircle(-4, -12, 1.6).fillCircle(4, -12, 1.6);
    body.fillStyle(palette.shoe, 1).fillRoundedRect(-14, 32, 11, 6, 3).fillRoundedRect(3, 32, 11, 6, 3);
    const tag = this.add.text(0, 47, label, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff9ea', backgroundColor: '#1c2b35', padding: { left: 6, right: 6, top: 3, bottom: 3 } }).setOrigin(.5);
    c.add([body, tag]); c.setSize(54, 70); c.setDepth(8); c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => selectNode(label === '小宇' ? 'partner' : 'home', true));
    c.on('pointerover', () => c.setScale(1.04)); c.on('pointerout', () => c.setScale(1));
    return c;
  }

  createActors() {
    this.actors.player = this.actor(126, 258, { body: 0xf3a75d, skin: 0xf0bd8e, hair: 0x363434, shoe: 0x3a5662 }, '你');
    this.actors.partner = this.actor(278, 269, { body: 0x74a5d4, skin: 0xe4ad82, hair: 0x4c3935, shoe: 0x3a5662 }, '小宇');
    this.props.marble = this.add.ellipse(223, 352, 13, 13, 0x7ce2c7).setStrokeStyle(2, 0xefffe6).setDepth(9).setInteractive({ useHandCursor: true });
    this.props.marble.on('pointerdown', () => selectNode('marbles', true));
    this.props.marble.on('pointerover', () => this.props.marble.setScale(1.3)); this.props.marble.on('pointerout', () => this.props.marble.setScale(1));
    this.props.glint = this.add.star(223, 352, 4, 4, 9, 0xd8fff1, .75).setDepth(10);
  }

  createHotspots() {
    const hotspot = (node, radius = 45) => {
      const zone = this.add.zone(node.anchor.x, node.anchor.y, radius * 2, radius * 2).setInteractive({ useHandCursor: true }).setDepth(2);
      zone.on('pointerdown', () => selectNode(node.id, true));
      zone.on('pointerover', () => { this.focusNode(node.id, true); });
      return zone;
    };
    nodes.forEach((node) => hotspot(node, node.id === 'home' ? 39 : 43));
    // 让热点始终被画布对象覆盖，但不显示大卡片
    this.add.text(278, 318, '等你一起玩', { fontFamily: 'sans-serif', fontSize: '10px', color: '#284650', backgroundColor: '#d6f4e4', padding: { left: 5, right: 5, top: 3, bottom: 3 } }).setOrigin(.5).setDepth(4);
  }

  focusNode(id, animate = true) {
    const node = nodeById(id); if (!node) return;
    const targetX = id === 'home' ? -12 : id === 'partner' ? 18 : id === 'marbles' ? 8 : 0;
    const targetY = id === 'home' ? 12 : id === 'table' ? -10 : 0;
    if (state.reducedMotion || !animate) { this.cameras.main.setScroll(targetX, targetY); return; }
    this.sceneTween?.stop();
    this.sceneTween = this.tweens.add({ targets: this.cameras.main, scrollX: targetX, scrollY: targetY, duration: 420, ease: 'Sine.easeInOut' });
  }

  setReducedMotion(value) { state.reducedMotion = value; this.tweens.timeScale = value ? 100 : 1; }

  async transitionTo(x, y) {
    if (state.reducedMotion) { this.cameras.main.setScroll(x, y); return; }
    await new Promise((resolve) => {
      const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x162932, 0).setScrollFactor(0).setDepth(30);
      this.tweens.add({ targets: veil, alpha: 1, duration: 160, onComplete: () => {
        this.cameras.main.setScroll(x, y);
        this.tweens.add({ targets: veil, alpha: 0, duration: 240, onComplete: () => { veil.destroy(); resolve(); } });
      } });
    });
  }

  async approachPartner() {
    say('你朝小宇走过去，鞋底擦过一小片沙土。');
    await this.transitionTo(14, 0);
    if (state.reducedMotion) this.actors.player.setPosition(245, 275);
    else await this.tweenPromise(this.actors.player, { x: 244, y: 279 }, 680, 'Sine.easeOut');
    say('小宇往旁边挪了挪，把弹珠推到你面前。');
    await this.pose(this.actors.player, 1.03, 240);
    say('“你来试试？”');
  }

  async rollMarble() {
    say('你用指尖一弹，绿色弹珠沿着砖缝滚出去。');
    await this.transitionTo(8, 0);
    const target = { x: 306, y: 342 };
    if (state.reducedMotion) this.props.marble.setPosition(target.x, target.y);
    else await this.tweenPromise(this.props.marble, target, 820, 'Cubic.easeOut');
    this.props.glint.setPosition(target.x, target.y);
    await this.pose(this.actors.partner, 1.06, 250);
    say('弹珠停在车棚边。小宇先愣了一下，又笑了。');
    if (!state.reducedMotion) this.tweens.add({ targets: this.actors.partner, y: '+=-5', duration: 170, yoyo: true, repeat: 1 });
  }

  async simpleAction(id) {
    const lines = {
      ask: '小宇指了指车棚：“刚才它差点滚进去。”',
      write: '你在石桌边描了两行字，风把纸角轻轻吹起来。',
      inspect: '弹珠在掌心发着亮，远处传来车铃声。',
      bowls: '你把两只碗放到桌边，屋里的声音柔下来。',
    };
    say(lines[id] ?? '你做了一件小事。');
    await this.pose(this.actors.player, id === 'write' ? .98 : 1.02, 420);
  }

  pose(actor, scale, duration) {
    if (state.reducedMotion) { actor.setScale(scale); return Promise.resolve(); }
    return this.tweenPromise(actor, { scaleX: scale, scaleY: scale }, duration, 'Sine.easeInOut').then(() => this.tweenPromise(actor, { scaleX: 1, scaleY: 1 }, duration, 'Sine.easeInOut'));
  }

  tweenPromise(targets, props, duration, ease) {
    if (state.reducedMotion) { Object.entries(props).forEach(([key, value]) => targets[key] = value); return Promise.resolve(); }
    return new Promise((resolve) => this.tweens.add({ targets, ...props, duration, ease, onComplete: resolve }));
  }

  skipPresentation() {
    // 将当前演出加速至收束，而不是直接 kill tween；这样等待中的 Promise 仍会完成，
    // runAction 能正常解锁动作条，且跳过表现不会改变 Core 结果。
    this.tweens.timeScale = 1000;
    say('演出已跳过，结果仍然保留。');
  }
}

let gameScene;
window.addEventListener('light-scene-ready', () => { gameScene = window.__lightScene; });
const game = new Phaser.Game({ type: Phaser.AUTO, width: WIDTH, height: HEIGHT, parent: els.root, transparent: false, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT }, render: { antialias: true, pixelArt: false }, scene: LightScene });
game.events.once('ready', () => { gameScene = game.scene.getScene('LightScene'); });
window.__lightScene = game.scene.getScene('LightScene');

renderTime(); renderActions(); renderObjectList();
document.body.classList.toggle('reduced-motion', state.reducedMotion);
document.body.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
els.motion.setAttribute('aria-pressed', String(state.reducedMotion));
els.motion.textContent = state.reducedMotion ? '恢复动态' : '减少动态';
