// 세피로트의 나무 내비게이션
// - 첫 화면의 나무와 오른쪽 미니맵의 노드를 누르면 해당 세피라로 이동하고, 효과음과 캐릭터 동작이 나옵니다
// - 스크롤로 도착한 세피라를 "현재"로 표시하고, 지나온 세피라와 그 사이 경로(히브리 문자)에 불을 켭니다

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SFX_PATH = './assets/sfx';
const SOUND_KEY = 'sfx';
// 공격 프레임을 보여주는 시간. 효과음 앞부분의 타격감과 맞춘 길이입니다
const ACT_MS = 820;
const SFX_VOLUME = 0.15;
// 나무가 자라날 때 세피라 하나당 지연(ms). 케테르부터 말쿠트까지 차례로 켜집니다
const GROW_STEP = 120;

const SFX_IDS = ['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth'];
const audioCache = new Map();
const buffers = new Map();
const loadingSounds = new Map();
let audioContext = null, masterGain = null, activeSource = null, playing = null;
let soundOn = true;

function getAudioContext() {
if (audioContext) return audioContext;
const Context = window.AudioContext || window.webkitAudioContext;
if (!Context) return null;
try {
audioContext = new Context({ latencyHint: 'interactive' });
masterGain = audioContext.createGain();
masterGain.gain.value = SFX_VOLUME;
masterGain.connect(audioContext.destination);
return audioContext;
} catch { return null; }
}

function prepareFallback(sid) {
if (!audioCache.has(sid)) {
const audio = new Audio(`${SFX_PATH}/${sid}.mp3`);
audio.preload = 'auto';
audio.volume = SFX_VOLUME;
audio.load();
audioCache.set(sid, audio);
}
return audioCache.get(sid);
}

function prepareSfx(sid) {
if (!soundOn || !SFX_IDS.includes(sid)) return Promise.resolve();
if (buffers.has(sid)) return Promise.resolve();
if (loadingSounds.has(sid)) return loadingSounds.get(sid);
const context = getAudioContext();
if (!context) { prepareFallback(sid); return Promise.resolve(); }
const controller = new AbortController();
const timeout = window.setTimeout(() => controller.abort(), 10000);
const promise = (async () => {
try {
const response = await fetch(`${SFX_PATH}/${sid}.mp3`, { signal: controller.signal, credentials: 'omit' });
if (!response.ok) throw new Error('Sound unavailable');
const buffer = await context.decodeAudioData(await response.arrayBuffer());
// 파일 앞의 거의 무음인 구간만 건너뛰며 최대 0.35초까지만 보정합니다.
const limit = Math.min(buffer.length - 1, Math.floor(buffer.sampleRate * 0.35));
let first = limit;
for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
const data = buffer.getChannelData(channel);
for (let i = 0; i < first; i += 1) {
if (Math.abs(data[i]) > 0.0005) { first = i; break; }
}
}
const offset = Math.max(0, first / buffer.sampleRate - 0.004);
buffers.set(sid, { buffer, offset });
} catch { prepareFallback(sid); }
finally { window.clearTimeout(timeout); loadingSounds.delete(sid); }
})();
loadingSounds.set(sid, promise);
return promise;
}

function warmSfx(priority = '') {
const queue = [...new Set([priority, ...SFX_IDS])].filter((sid) => SFX_IDS.includes(sid));
// 첫 클릭 전에 미리 복호화하고 동시 요청은 세 개로 제한합니다.
const worker = async () => { while (queue.length && soundOn) await prepareSfx(queue.shift()); };
for (let i = 0; i < 3; i += 1) worker();
}

function stopSfx() {
if (activeSource) {
try { activeSource.stop(); } catch { /* 이미 끝난 소리여도 다음 입력을 처리합니다. */ }
activeSource.disconnect();
activeSource = null;
}
if (playing) { playing.pause(); playing = null; }
}

function playSfx(sid) {
if (!soundOn || !SFX_IDS.includes(sid)) return;
stopSfx();
const context = getAudioContext();
if (context?.state === 'suspended') context.resume().catch(() => {});
const prepared = buffers.get(sid);
if (context && prepared) {
const source = context.createBufferSource();
source.buffer = prepared.buffer;
source.connect(masterGain);
source.onended = () => { source.disconnect(); if (activeSource === source) activeSource = null; };
activeSource = source;
source.start(0, prepared.offset);
return;
}
prepareSfx(sid);
const audio = prepareFallback(sid);
audio.currentTime = 0;
playing = audio;
audio.play().catch(() => {});
}

function bindSoundInput(element, sid) {
let mouseStarted = false;
const prime = () => prepareSfx(sid);
element.addEventListener('pointerenter', prime, { once: true });
element.addEventListener('focus', prime, { once: true });
element.addEventListener('pointerdown', (event) => {
// 마우스는 누르는 순간 재생하고 터치는 스크롤 오작동을 피하려고 클릭에서 재생합니다.
if (event.pointerType !== 'mouse' || event.button !== 0) { mouseStarted = false; return; }
mouseStarted = true;
playSfx(sid);
});
element.addEventListener('pointercancel', () => { mouseStarted = false; });
element.addEventListener('click', (event) => {
if (event.detail !== 0 && mouseStarted) { mouseStarted = false; return; }
mouseStarted = false;
playSfx(sid);
});
}

/** 세피라 캐릭터를 공격 프레임으로 잠깐 바꿉니다 */
function act(orb) {
if (!orb) return;
window.clearTimeout(Number(orb.dataset.actTimer ?? 0));
orb.classList.remove('is-acting');
void orb.offsetWidth; // 연타해도 애니메이션이 매번 재생되게 리셋
const attack = orb.querySelector('.p-act');
orb.classList.toggle('is-frame-ready', !!attack?.complete && attack.naturalWidth > 0);
if (attack && !attack.complete) { attack.loading = 'eager'; attack.decode().then(() => { if (orb.classList.contains('is-acting')) orb.classList.add('is-frame-ready'); }).catch(() => {}); }
orb.classList.add('is-acting');
orb.dataset.actTimer = String(window.setTimeout(() => orb.classList.remove('is-acting'), ACT_MS));
}

function pulse(el) {
el.classList.remove('is-pulse');
void el.getBoundingClientRect();
el.classList.add('is-pulse');
}

function initSoundToggle() {
const toggle = document.querySelector('[data-sound-toggle]');
try {
soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
} catch (error) {
soundOn = true;
}
const sync = () => {
if (!toggle) return;
toggle.setAttribute('aria-pressed', String(soundOn));
toggle.textContent = soundOn ? '효과음 끄기' : '효과음 켜기';
};
sync();
toggle?.addEventListener('click', () => {
soundOn = !soundOn;
if (!soundOn) stopSfx();
else warmSfx(location.hash.slice(1));
try {
localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
} catch (error) {
// 저장이 막혀도 현재 페이지에서는 유지됩니다
}
sync();
});
}

/** 첫 화면 나무가 위에서 아래로 자라나도록 노드와 경로에 지연값을 줍니다 */
function prepareGrowth(tree) {
if (!tree) return;
tree.querySelectorAll('.node').forEach((n) => n.style.setProperty('--d', String(Number(n.dataset.seph) * GROW_STEP)));
tree.querySelectorAll('.path').forEach((p) => {
p.setAttribute('pathLength', '1');
const delay = Math.min(Number(p.dataset.a), Number(p.dataset.b)) * GROW_STEP + 60;
p.style.setProperty('--d', String(delay));
// 경로 위를 한 번 통과하는 빛으로 나무가 연결되는 순서를 보여줍니다.
const signal = p.cloneNode(false);
signal.setAttribute('class', 'path-signal');
signal.setAttribute('aria-hidden', 'true');
signal.style.setProperty('--d', String(delay));
signal.style.setProperty('--signal-color', `var(--c${p.dataset.a})`);
p.after(signal);
});
}

/**
 * @param {{ scrollTo: (el: HTMLElement) => void }} nav 섹션 이동 함수
 */
export function initSephirot(nav) {
const chapters = [...document.querySelectorAll('section.chapter[data-seph]')];
if (!chapters.length) return;
const byNum = new Map(chapters.map((c) => [c.dataset.seph, c]));
const hero = document.querySelector('#tree');
const heroTree = document.querySelector('.ht-tree');
const nodes = [...document.querySelectorAll('.tree-nav .node[data-seph]')];
const topbar = document.querySelector('[data-topbar]');
const minimap = document.querySelector('[data-minimap]');
const sky = document.querySelector('.sky');
const tbNum = document.querySelector('[data-tb-num]');
const tbName = document.querySelector('[data-tb-name]');
const tbNow = document.querySelector('[data-tb-now]');

prepareGrowth(heroTree);
heroTree?.querySelectorAll('.node').forEach((node) => {
const ring = node.querySelector('.node-ring');
if (!ring) return;
const echo = ring.cloneNode(false);
echo.setAttribute('class', 'node-echo');
echo.setAttribute('aria-hidden', 'true');
node.prepend(echo);
// 겹친 두 파동이 천천히 번져 클릭 가능한 좌표임을 보여줍니다.
for (let i = 0; i < 2; i += 1) {
const aura = ring.cloneNode(false);
aura.setAttribute('class', `node-aura${i ? ' node-aura-second' : ''}`);
aura.setAttribute('aria-hidden', 'true');
node.prepend(aura);
}
});

const visited = new Set();
let current = '';

const lightPaths = () => {
const lit = (el) => visited.has(el.dataset.a) && visited.has(el.dataset.b);
document.querySelectorAll('.tree-nav .path, .tree-nav .path-badge').forEach((el) => el.classList.toggle('is-lit', lit(el)));
nodes.forEach((n) => n.classList.toggle('is-visited', visited.has(n.dataset.seph)));
};

const setCurrent = (num) => {
if (num === current) return;
current = num;
visited.add(num);
const chapter = byNum.get(num);
chapter?.classList.add('is-open');
nodes.forEach((n) => {
const isCur = n.dataset.seph === num;
n.classList.toggle('is-current', isCur);
if (isCur) n.setAttribute('aria-current', 'true');
else n.removeAttribute('aria-current');
});
lightPaths();
// 상단 바와 배경 색을 지금 세피라 색으로
const name = chapter?.querySelector('.b-tag')?.childNodes[1]?.textContent?.trim() ?? '';
const meaning = chapter?.querySelector('.b-he')?.textContent?.split('·')[1]?.trim() ?? '';
if (topbar) topbar.dataset.seph = num;
if (tbNum) tbNum.textContent = num;
if (tbName) tbName.textContent = meaning ? `${name} · ${meaning}` : name;
if (tbNow && chapter) tbNow.setAttribute('href', `#${chapter.id}`);
sky?.style.setProperty('--sky-tint', `var(--c${num})`);
};

// 화면 가운데 띠에 들어온 세피라를 "현재"로 봅니다
const currentObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) setCurrent(entry.target.dataset.seph);
});
}, { rootMargin: '-40% 0px -50% 0px' });
chapters.forEach((c) => currentObserver.observe(c));

// 조금이라도 보이기 시작하면 내용을 엽니다
const openObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-open');
openObserver.unobserve(entry.target);
});
}, { rootMargin: '0px 0px -12% 0px' });
chapters.forEach((c) => openObserver.observe(c));

// 첫 화면(나무)을 벗어나면 상단 바와 미니맵을 보여줍니다
if (hero) {
new IntersectionObserver(([entry]) => {
const away = !entry.isIntersecting;
topbar?.classList.toggle('is-shown', away);
minimap?.classList.toggle('is-shown', away);
}, { threshold: 0.15 }).observe(hero);
}

let navigationActTimer = 0;
// 노드 클릭: 효과음 + 파동 + 이동 + 캐릭터 동작
nodes.forEach((node) => {
const sid = byNum.get(node.dataset.seph)?.id;
if (sid) bindSoundInput(node, sid);
node.addEventListener('click', (event) => {
event.preventDefault();
const num = node.dataset.seph;
const chapter = byNum.get(num);
if (!chapter) return;
pulse(node);
chapter.classList.add('is-open');
nav.scrollTo(chapter);
window.clearTimeout(navigationActTimer);
navigationActTimer = window.setTimeout(() => {
if (!document.hidden && location.hash === `#${chapter.id}`) act(chapter.querySelector('.orb'));
}, reduceMotion.matches ? 0 : 650);
chapter.focus({ preventScroll: true });
history.replaceState(null, '', `#${chapter.id}`);
});
});

// 세피라 캐릭터를 직접 눌러도 효과음과 동작이 나옵니다
document.querySelectorAll('[data-orb]').forEach((orb) => {
bindSoundInput(orb, orb.dataset.orb);
const prepareAttack = () => {
const img = orb.querySelector('.p-act');
if (img) img.loading = 'eager';
};
orb.addEventListener('pointerenter', prepareAttack, { once: true });
orb.addEventListener('focus', prepareAttack, { once: true });
orb.addEventListener('pointerdown', prepareAttack, { once: true });
orb.addEventListener('click', () => {
act(orb);
});
});

document.addEventListener('visibilitychange', () => {
if (!document.hidden) return;
stopSfx();
audioContext?.suspend().catch(() => {});
window.clearTimeout(navigationActTimer);
document.querySelectorAll('[data-orb]').forEach((orb) => {
window.clearTimeout(Number(orb.dataset.actTimer ?? 0));
orb.classList.remove('is-acting');
});
});
initSoundToggle();
warmSfx(location.hash.slice(1));
const fromHash = chapters.find((c) => `#${c.id}` === location.hash);
setCurrent((fromHash ?? chapters[0]).dataset.seph);
// 첫 화면에서는 아직 아무 세피라도 지나지 않은 상태로 보여줍니다
if (!fromHash) {
visited.clear();
current = '';
nodes.forEach((n) => n.classList.remove('is-current'));
lightPaths();
}
}

