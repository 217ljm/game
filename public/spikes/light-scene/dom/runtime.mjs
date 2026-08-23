const stage = document.querySelector('#gameStage');
const focusCard = document.querySelector('#focusCard');
const focusName = document.querySelector('#focusName');
const focusState = document.querySelector('#focusState');
const focusHint = document.querySelector('#focusHint');
const actions = document.querySelector('#actions');
const speech = document.querySelector('#speech');
const speechText = document.querySelector('#speechText');
const eventChip = document.querySelector('#eventChip');
const eventText = document.querySelector('#eventText');
const timeLabel = document.querySelector('#timeLabel');
const timeDots = document.querySelector('#timeDots');
const motionToggle = document.querySelector('#motionToggle');

const nodes = {
  courtyard: { label: '小勇 · 伙伴', state: '等你加入', hint: '他把最后一颗弹珠握在手心', actions: [['play', '加入弹珠', '消耗 3 格时间'], ['ask', '问问车棚', '消耗 1 格时间']] },
  marbles: { label: '弹珠 · 空地', state: '就在脚边', hint: '玻璃珠在夕阳下闪了一下', actions: [['roll', '滚出弹珠', '消耗 2 格时间'], ['inspect', '捡起来看', '消耗 1 格时间']] },
  table: { label: '石桌 · 一张纸', state: '可以练一会字', hint: '纸边被风吹得轻轻翘起来', actions: [['write', '练一会字', '消耗 2 格时间'], ['leave', '先放一放', '不消耗时间']] },
  bike: { label: '年长孩子 · 车棚', state: '链条卡住了', hint: '他没有抬头，但留了一点位置', actions: [['inspect', '看看链条', '消耗 1 格时间'], ['ask', '礼貌询问', '消耗 1 格时间']] },
  home: { label: '家门 · 妈妈', state: '在喊你回家', hint: '屋里传来碗筷碰撞的声音', actions: [['help', '帮忙摆碗', '消耗 2 格时间'], ['enter', '现在回家', '结束片段']] },
};

let currentNode = 'courtyard';
let usedSlots = 0;
let hasPlayed = false;
let hasEvent = false;
let motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderTime() {
  timeLabel.textContent = `放学后 ${Math.max(0, 45 - usedSlots * 5)} 分钟`;
  timeDots.innerHTML = Array.from({ length: 9 }, (_, index) => `<i class="${index < usedSlots ? 'used' : ''}"></i>`).join('');
}

function setSpeech(text) {
  speech.classList.add('fade');
  window.setTimeout(() => { speechText.textContent = `“${text}”`; speech.classList.remove('fade'); }, motionReduced ? 0 : 180);
}

function setNode(nodeId, announce = true) {
  const node = nodes[nodeId];
  if (!node) return;
  currentNode = nodeId;
  stage.dataset.focus = nodeId;
  stage.dataset.sceneState = nodeId;
  document.querySelectorAll('.stage-node').forEach((item) => item.classList.toggle('active', item.dataset.node === nodeId));
  focusName.textContent = node.label;
  focusState.textContent = node.state;
  focusHint.textContent = node.hint;
  actions.innerHTML = node.actions.map(([id, label, cost], index) => {
    const contractId = id === 'play' ? 'join-marbles' : id === 'roll' ? 'play-marbles' : id;
    return `<button class="action-button ${index === 0 ? 'primary' : ''}" data-action="${id}" data-action-id="${contractId}" type="button"><span class="action-icon">${iconFor(id)}</span><span><b>${label}</b><small>${cost}</small></span></button>`;
  }).join('');
  if (announce) setSpeech(transitionLine(nodeId));
  actions.querySelector('button')?.focus({ preventScroll: true });
}

function iconFor(action) { return ({ play: '●', roll: '◆', write: '✎', inspect: '⌁', ask: '?', help: '＋', enter: '→', leave: '—' })[action] || '·'; }
function transitionLine(nodeId) { return ({ courtyard: '小勇把位置让给了你。', table: '石桌旁的风小了一点。', bike: '车棚里有股旧铁锈的味道。', home: '妈妈又喊了一声。' })[nodeId]; }

function showEvent() {
  if (hasEvent) return;
  hasEvent = true;
  eventText.textContent = '一颗弹珠滚到车棚边';
  eventChip.classList.add('show');
  document.querySelector('.marbles').dataset.object = 'rolling';
  document.querySelector('#friend').dataset.pose = 'search';
  setSpeech('等等！我的弹珠！');
  focusState.textContent = '弹珠滚远了';
  window.setTimeout(() => eventChip.classList.remove('show'), motionReduced ? 600 : 2800);
}

function perform(action) {
  const actionCosts = { play: 3, roll: 2, write: 2, inspect: 1, ask: 1, help: 2, enter: 0, leave: 0 };
  const cost = actionCosts[action] ?? 1;
  if (usedSlots + cost > 9 && action !== 'enter' && action !== 'leave') {
    setSpeech('天快黑了，今天先到这里。');
    return;
  }
  usedSlots += cost;
  renderTime();
  document.querySelector('#player').dataset.pose = action === 'play' ? 'crouch' : action === 'ask' ? 'happy' : 'idle';
  if (action === 'play') {
    hasPlayed = true;
    setSpeech('你蹲下来，对准了那道白线。');
    focusState.textContent = '一起玩了一局';
    window.setTimeout(showEvent, motionReduced ? 200 : 1050);
  } else if (action === 'roll') {
    setSpeech('你用指尖一弹，弹珠沿着砖缝滚远了。');
    focusState.textContent = '小勇追着看过去';
    showEvent();
  } else if (action === 'write') {
    setSpeech('你写下第一个歪歪的“人”。');
    focusState.textContent = '纸上多了一行字';
    document.querySelector('.paper').classList.add('written');
  } else if (action === 'inspect') {
    setSpeech('链条咔哒一声，卡住的地方找到了。');
    focusState.textContent = '看清了链条';
    document.querySelector('#elder').dataset.pose = 'happy';
  } else if (action === 'ask') {
    setSpeech('“别碰，先看这里。”');
    focusState.textContent = '他愿意教你看看';
    document.querySelector('#elder').dataset.pose = 'happy';
  } else if (action === 'help') {
    setSpeech('你把两个碗稳稳地放在桌边。');
    focusState.textContent = '妈妈看见了';
  } else if (action === 'enter') {
    setSpeech('你踩着最后一缕亮光进了门。');
    focusState.textContent = '今天的院子结束了';
  } else if (action === 'leave') {
    setSpeech('纸还在，邀请也还在。');
  }
  focusHint.textContent = `已用 ${usedSlots} 格时间 · 选择另一个对象继续`;
}

document.querySelectorAll('.stage-node').forEach((node) => {
  node.addEventListener('click', () => setNode(node.dataset.node));
  node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setNode(node.dataset.node); } });
});

document.querySelectorAll('.prop, .actor.friend, .actor.elder').forEach((object) => {
  const objectNode = () => object.classList.contains('friend')
    ? 'courtyard'
    : object.classList.contains('marbles')
      ? 'marbles'
      : object.classList.contains('elder') || object.classList.contains('bicycle')
        ? 'bike'
        : 'table';
  object.addEventListener('click', () => setNode(objectNode()));
  object.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setNode(objectNode());
    }
  });
});

actions.addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (button) perform(button.dataset.action); });

document.querySelector('#objectListToggle').addEventListener('click', () => { document.querySelector('#objectList').hidden = false; document.querySelector('#objectList button:not(.close-list)')?.focus(); });
document.querySelector('#objectListClose').addEventListener('click', () => { document.querySelector('#objectList').hidden = true; document.querySelector('#objectListToggle').focus(); });
document.querySelectorAll('[data-list-node]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#objectList').hidden = true; setNode(button.dataset.listNode); }));

motionToggle.addEventListener('click', () => {
  motionReduced = !motionReduced;
  stage.classList.toggle('reduce-motion', motionReduced);
  document.body.dataset.motion = motionReduced ? 'reduced' : 'full';
  motionToggle.setAttribute('aria-pressed', String(motionReduced));
  motionToggle.title = motionReduced ? '已减少动态效果' : '减少动态效果';
  motionToggle.textContent = motionReduced ? '◉' : '◌';
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !document.querySelector('#objectList').hidden) { document.querySelector('#objectList').hidden = true; document.querySelector('#objectListToggle').focus(); }
});

stage.classList.toggle('reduce-motion', motionReduced);
document.body.dataset.motion = motionReduced ? 'reduced' : 'full';
renderTime();
setNode('courtyard', false);
