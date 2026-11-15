// 세피로트의 나무 내비게이션
// - 첫 화면의 나무와 오른쪽 미니맵의 노드를 누르면 해당 세피라로 이동하고, 효과음과 캐릭터 동작이 나옵니다
// - 스크롤로 도착한 세피라를 "현재"로 표시하고, 지나온 세피라와 그 사이 경로(히브리 문자)에 불을 켭니다

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SFX_PATH = './assets/sfx';
const SOUND_KEY = 'sfx';
// 공격 프레임을 보여주는 시간. 효과음 앞부분의 타격감과 맞춘 길이입니다
const ACT_MS = 820;
const SFX_VOLUME = 0.32;   // 세피라 효과음 기본 볼륨
const SFX_BOOST = { 'ui-click': 2.6 }; // 버튼 클릭음은 짧고 가벼워서 따로 더 키웁니다 (최종 0.83)
const SEPH_SFX = new Set(['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth']);
const volumeOf = (sid) => Math.min(1, SFX_VOLUME * (SFX_BOOST[sid] || 1) * (SEPH_SFX.has(sid) ? 0.55 : 1)); /* 세피라 캐릭터 효과음만 45% 낮춤 */
// 나무가 자라날 때 세피라 하나당 지연(ms). 케테르부터 말쿠트까지 차례로 켜집니다
const GROW_STEP = 120;

const SFX_IDS = ['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth', 'ui-click', 'node-lit', 'tree-on', 'tree-off', 'nav-jump', 'path-trace', 'q-enter', 'q-exit', 'q-jump'];
const audioCache = new Map();
const buffers = new Map();
const loadingSounds = new Map();
// PCM 캐시는 압축 음원보다 커지므로 개수와 바이트를 함께 제한합니다.
const MAX_SOUND_BYTES = 12 * 1024 * 1024;
const MAX_SOUND_COUNT = 3;
let soundBytes = 0, releaseTimer = 0;
function cacheSound(sid, value) {
const bytes = value.buffer.length * value.buffer.numberOfChannels * 4;
if (bytes > MAX_SOUND_BYTES) return;
while (buffers.size && (buffers.size >= MAX_SOUND_COUNT || soundBytes + bytes > MAX_SOUND_BYTES)) {
const oldest = buffers.keys().next().value;
soundBytes -= buffers.get(oldest).bytes;
buffers.delete(oldest);
}
buffers.set(sid, { ...value, bytes });
soundBytes += bytes;
}
let audioContext = null, masterGain = null, activeSource = null, playing = null;
let soundOn = true;

function getAudioContext() {
if (audioContext) return audioContext;
const Context = window.AudioContext || window.webkitAudioContext;
if (!Context) return null;
try {
audioContext = new Context({ latencyHint: 'interactive' });
masterGain = audioContext.createGain();
masterGain.gain.value = 1; // 볼륨은 소리마다 개별 gain으로 적용
masterGain.connect(audioContext.destination);
return audioContext;
} catch { return null; }
}

// 나무가 가로로 바뀔 때의 소리: 파일 없이 Web Audio로 직접 합성합니다.
// 낮은 곳에서 높은 곳으로 쓸려 올라가는 바람 소리(필터를 건 노이즈)와, 그 위에 얇게 깔리는 상승 화음(5도 쌓기)으로 '열림'을 표현합니다
function playMorphSweep(duration = 1.8) {
if (!soundOn) return;
const ctx = getAudioContext(); if (!ctx) return;
if (ctx.state === 'suspended') ctx.resume().catch(() => {});
const now = ctx.currentTime, out = ctx.createGain();
out.gain.value = .55; out.connect(masterGain);
// 1) 바람: 화이트 노이즈 → 대역 필터 주파수를 300Hz에서 3.2kHz까지 올림
const len = Math.floor(ctx.sampleRate * duration), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
const noise = ctx.createBufferSource(); noise.buffer = buf;
const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 1.4;
band.frequency.setValueAtTime(300, now); band.frequency.exponentialRampToValueAtTime(3200, now + duration * .85);
const ng = ctx.createGain(); ng.gain.setValueAtTime(0, now); ng.gain.linearRampToValueAtTime(.22, now + duration * .35); ng.gain.linearRampToValueAtTime(0, now + duration);
noise.connect(band); band.connect(ng); ng.connect(out); noise.start(now); noise.stop(now + duration);
// 2) 화음: A3 → E4 → B4 → F#5 순서로 하나씩 겹쳐 올라가는 사인파 (세피라가 차례로 켜지는 리듬과 맞춤)
[220, 329.63, 493.88, 739.99].forEach((f, k) => {
const o = ctx.createOscillator(), g = ctx.createGain(), at = now + k * duration * .18;
o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * 1.005, at + 1.2);
g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.07, at + .08); g.gain.exponentialRampToValueAtTime(.0001, at + 1.4);
o.connect(g); g.connect(out); o.start(at); o.stop(at + 1.5);
});
setTimeout(() => out.disconnect(), (duration + 1.6) * 1000);
}

// 버튼(링크)으로 세피라 장에 이동할 때의 소리. 스크롤 이동에는 울리지 않습니다
const SEPH_IDS = new Set(['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth']);
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
if (link && SEPH_IDS.has(link.getAttribute('href').slice(1))) playLayer('nav-jump');
});

// 겹쳐 울려도 되는 소리: 다른 효과음을 끊지 않고 위에 얹어 재생합니다 (나무 활성 소리 위로 점등음이 겹치도록)
window.__sfx = (sid) => playLayer(sid);
setTimeout(() => { try { ['q-enter', 'q-exit', 'q-jump'].forEach((id) => prepareSfx(id)); } catch { /* 준비 실패 시 재생 시점에 다시 시도 */ } }, 3000); /* 클리포트 소리 미리 디코딩: 첫 재생 지연 제거 */ /* 클리포트 하강 등 다른 모듈에서 같은 효과음 체계를 쓰도록 공개 */
function playLayer(sid) {
if (!soundOn || !SFX_IDS.includes(sid)) return;
const ctx = getAudioContext(), prepared = buffers.get(sid);
prepareSfx(sid);
if (ctx && prepared && ctx.state === 'running') {
try { const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = prepared.buffer; g.gain.value = volumeOf(sid); src.connect(g); g.connect(masterGain); src.onended = () => { src.disconnect(); g.disconnect(); }; src.start(0, prepared.offset); return; } catch { /* 아래 기본 플레이어로 */ }
}
if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
const audio = new Audio(soundPath(sid)); audio.volume = volumeOf(sid); audio.play().catch(() => {});
}

function soundPath(sid) {
if (sid === 'ui-click') return './assets/ui-click.mp3?v=2';
if (sid === 'node-lit') return './assets/node-lit.mp3'; // 나무에서 세피라가 켜질 때
if (sid === 'q-enter') return './assets/q-enter.mp3?v=3'; if (sid === 'q-exit') return './assets/q-exit.mp3'; if (sid === 'q-jump') return './assets/q-jump.mp3'; /* 클리포트 진입·이탈 */
if (sid === 'tree-on' || sid === 'tree-off' || sid === 'nav-jump' || sid === 'path-trace') return `./assets/${sid}.mp3?v=2`; /* 파일 교체 시 v 값을 올려 캐시를 새로 받습니다 */ // 나무 활성/비활성
return `${SFX_PATH}/${sid}.mp3`;
}

function prepareFallback(sid) {
if (!audioCache.has(sid)) {
const audio = new Audio(soundPath(sid));
audio.preload = 'metadata';
audio.volume = volumeOf(sid);
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
const response = await fetch(soundPath(sid), { signal: controller.signal, credentials: 'omit' });
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
if (!document.hidden && soundOn) cacheSound(sid, { buffer, offset });
} catch { prepareFallback(sid); }
finally { window.clearTimeout(timeout); loadingSounds.delete(sid); }
})();
loadingSounds.set(sid, promise);
return promise;
}

function warmSfx(priority = '') {
// 열 개를 일괄 디코딩하지 않고 현재 선택한 소리만 준비합니다.
if (SFX_IDS.includes(priority)) prepareSfx(priority);
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
const fallback = () => {
if (!soundOn) return;
const audio = prepareFallback(sid);
try { audio.currentTime = 0; } catch { /* 메타데이터가 오기 전에도 첫 재생은 허용합니다. */ }
playing = audio;
audio.play().catch(() => { if (playing === audio) playing = null; });
};
const context = getAudioContext();
const prepared = buffers.get(sid);
prepareSfx(sid);
// 중단된 오디오 컨텍스트에서는 무음으로 끝내지 않고 기본 플레이어로 재생합니다.
if (!context || !prepared || context.state !== 'running') {
if (context?.state === 'suspended') context.resume().catch(() => {});
fallback();
return;
}
buffers.delete(sid); buffers.set(sid, prepared);
try {
const source = context.createBufferSource();
source.buffer = prepared.buffer;
const gain = context.createGain(); gain.gain.value = volumeOf(sid);
source.connect(gain); gain.connect(masterGain);
source.onended = () => { source.disconnect(); gain.disconnect(); if (activeSource === source) activeSource = null; };
activeSource = source;
source.start(0, prepared.offset);
} catch { fallback(); }
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

// 공통 버튼 소리는 기존 효과음 설정과 캐시를 공유하며 세피라 전용 소리와 중복하지 않습니다.
function initButtonSound() {
const control = (event) => {
if (!(event.target instanceof Element)) return null;
const target = event.target.closest('button, summary, [role="button"], a[href]');
if (!target || target.closest('.node, [data-orb]') || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return null;
return target;
};
let pointerTarget = null;
document.addEventListener('pointerover', (event) => { if (control(event)) prepareSfx('ui-click'); }, { passive: true });
document.addEventListener('pointerdown', (event) => {
pointerTarget = null;
const target = control(event);
if (!target || target.hasAttribute('data-sound-toggle') || event.pointerType !== 'mouse' || event.button !== 0) return;
pointerTarget = target;
/* 버튼 클릭음은 사용자 요청으로 끔 */
}, { passive: true });
document.addEventListener('pointercancel', () => { pointerTarget = null; });
document.addEventListener('click', (event) => {
const target = control(event);
const alreadyPlayed = target && pointerTarget === target && event.detail !== 0;
pointerTarget = null;
if (target && !alreadyPlayed) { /* 버튼 클릭음은 사용자 요청으로 끔 */ }
});
['tree-on', 'tree-off', 'node-lit', 'nav-jump', 'path-trace'].forEach(prepareSfx); // 나무 소리를 미리 받아 첫 재생 지연을 없앱니다
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
{ const label = soundOn ? '효과음 끄기' : '효과음 켜기'; const sr = toggle.querySelector('[data-sound-label]'); if (sr) sr.textContent = label; else toggle.textContent = label; toggle.title = label; } // 아이콘은 그대로 두고 읽기용 글자만 바꿉니다
};
sync();
toggle?.addEventListener('click', () => {
soundOn = !soundOn;
if (!soundOn) { stopSfx(); buffers.clear(); soundBytes = 0; }
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

// 나무 눕히기: 스크롤하는 동안 나무를 화면에 고정한 채 시계 반대 방향으로 90도 눕힙니다.
// 케테르가 왼쪽, 말쿠트가 오른쪽에 오는 가로 배치가 최종 모양이며, 글자와 문양도 함께 눕습니다.
// 회전량은 스크롤 위치로만 계산해서, 위로 되돌아가면 같은 경로로 다시 일어섭니다.
const ROTATE_RATIO = 0.1;  // 화면 높이의 몇 배를 스크롤하면 다 눕는지 (작을수록 빨리 돕니다)
const PIN_RATIO = 0.44;     // 가로로 다 바뀔 때까지 나무를 화면에 붙잡아 두는 스크롤 길이 (#tree margin-bottom과 같은 값)
const MORPH_SECONDS = 2.2; // 가로로 바뀌는 데 걸리는 시간
let treeAudible = false, wantDown = false, wantUp = false, lockDir = -1, glideAnim = 0, reversing = false, anim = 0, lastTime = 0, scrollLocked = false, glideFrom = 0, tension = 0, snapping = false;

const LOCK_KEYS = new Set(['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar']);

// 애플식 '쫀득한' 이징: cubic-bezier(0.65, 0, 0.15, 1). 출발은 살짝 머뭇이고 가운데서 힘 있게 가속한 뒤, 길고 매끈하게 감속합니다
const bezier = (p1x, p1y, p2x, p2y) => (x) => {
let t = x; // 뉴턴 반복으로 x(t)=x 를 푸는 t를 찾습니다
for (let i = 0; i < 6; i++) { const cx = 3 * p1x * t * (1 - t) ** 2 + 3 * p2x * t * t * (1 - t) + t ** 3 - x; const dx = 3 * p1x * (1 - t) ** 2 + 6 * (p2x - p1x) * t * (1 - t) + 3 * (1 - p2x) * t * t; if (Math.abs(dx) < 1e-6) break; t = Math.min(1, Math.max(0, t - cx / dx)); }
return 3 * p1y * t * (1 - t) ** 2 + 3 * p2y * t * t * (1 - t) + t ** 3;
};
const silky = bezier(0.65, 0, 0.15, 1);
// 스크롤 잠금 공용 상태: 자동 이동 중이거나, 끝난 직후 0.5초 동안은 관성 휠 입력까지 막아 화면 떨림을 없앱니다
window.__scrollHold = window.__scrollHold || { until: 0 };
const holdFor = (ms) => { window.__scrollHold.until = Math.max(window.__scrollHold.until, performance.now() + ms); };
const holding = () => performance.now() < window.__scrollHold.until;
const blockScroll = (event) => { if (event.cancelable) event.preventDefault(); };
const blockKeys = (event) => { if (LOCK_KEYS.has(event.key)) event.preventDefault(); };
window.addEventListener('wheel', (e) => { if (holding() && e.cancelable) e.preventDefault(); }, { passive: false, capture: true });
window.addEventListener('touchmove', (e) => { if (holding() && e.cancelable) e.preventDefault(); }, { passive: false, capture: true });
function setScrollLock(on) {
scrollLocked = on;
const method = on ? 'addEventListener' : 'removeEventListener';
window[method]('wheel', blockScroll, { passive: false });
window[method]('touchmove', blockScroll, { passive: false });
window[method]('keydown', blockKeys);
}     // 다 누운 뒤에도 점등 연출이 끝날 때까지 고정을 유지하는 전체 길이 (#tree의 margin-bottom과 같은 값)
const SWAY_DEG = 16;        // 도는 중간에 앞뒤로 기울어지는 최대 각도. 평면 회전이 밋밋해 보이지 않게
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function initTreeScroll(hero, tree) {
if (!hero || !tree) return;
let pending = 0, previous = 0, traceTimer = 0, laid = false;
let heroTop = 0, heroHeight = 1, treeW = 1, treeH = 1;
const copy = hero.querySelector('.ht-copy, .hero-copy');
// 반대 회전 대상: 각 세피라의 문양·이름·번호, 경로 배지의 히브리 글자, 장막 글자. 기준점은 자기 원의 중심입니다
const upright = [];
tree.querySelectorAll('.node').forEach((node) => {
const ring = node.querySelector('.node-ring'); if (!ring) return;
const cx = ring.getAttribute('cx'), cy = ring.getAttribute('cy');
node.querySelectorAll('text, .node-num-bg').forEach((el) => upright.push([el, cx, cy]));
});
tree.querySelectorAll('.path-badge').forEach((badge) => {
const dot = badge.querySelector('circle'), text = badge.querySelector('text'); if (!dot || !text) return;
upright.push([text, dot.getAttribute('cx'), dot.getAttribute('cy')]);
});
let lastAngle = -1;
// ── 가로 배치로 '변형'하기 ─────────────────────────────────────────────
// 실제로 돌리지 않습니다. 각 세피라의 목표 좌표 = 세로 배치를 가로로 눕힌 좌표이고,
// 케테르→말쿠트 순서로 하나씩 출발해 호를 그리며 그 자리로 옮겨 가고, 도착하는 순간 불이 켜집니다.
// 경로선과 히브리 배지는 양 끝 세피라를 따라 다시 그려집니다. 글자는 돌지 않으므로 항상 정방향입니다.
const CX = 200, CY = 320; // viewBox 중심
const nodeInfo = new Map();
tree.querySelectorAll('.node').forEach((node) => {
const ring = node.querySelector('.node-ring'); if (!ring) return;
const x = Number(ring.getAttribute('cx')), y = Number(ring.getAttribute('cy'));
nodeInfo.set(node.dataset.seph, { node, x, y, tx: CX + (y - CY), ty: CY - (x - CX), cx: x, cy: y, lit: false });
});
const lines = [...tree.querySelectorAll('line.path, line.path-signal')].map((el) => ({ el, a: el.dataset.a, b: el.dataset.b }));
const badges = [...tree.querySelectorAll('.path-badge')].map((el) => {
const c = el.querySelector('circle'), A = nodeInfo.get(el.dataset.a), B = nodeInfo.get(el.dataset.b);
const bx = Number(c.getAttribute('cx')), by = Number(c.getAttribute('cy'));
// 배지가 선분 위 어느 비율에 있는지 기억해 두고, 선이 움직여도 같은 비율 위치에 둡니다
const dx = B.x - A.x, dy = B.y - A.y, len2 = dx * dx + dy * dy || 1;
return { el, A, B, bx, by, t: ((bx - A.x) * dx + (by - A.y) * dy) / len2 };
});
let lastMorph = -1;
// 깨어나기 전 빈 원 안의 수수께끼 문구: 이름은 숨기되 각 세피라의 의미를 짧게 암시합니다 (켜지면 사라지고 이름이 드러남)
const RIDDLES = { 1: ['아무것도 없는', '곳에서'], 2: ['상상을', '작동시키는'], 3: ['만들고', '이해하고'], 4: ['누군가', '머물 세계'], 5: ['끝까지', '내놓는 힘'], 6: ['세계에', '얼굴과 색'], 7: ['승리 뒤에', '남는 이야기'], 8: ['계속', '만들게 하는'], 9: ['다음 세계의', '기초'], 10: ['현실에 닿는', '가능성'] }; // 각 장의 핵심 문장에서 따온 단서
for (const info of nodeInfo.values()) {
const lines = RIDDLES[info.node.dataset.seph]; if (!lines) continue;
const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
txt.setAttribute('class', 'node-riddle'); txt.setAttribute('aria-hidden', 'true');
lines.forEach((line, k) => { const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); span.setAttribute('x', String(info.x)); span.setAttribute('y', String(info.y + (k ? 9 : -3))); span.textContent = line; txt.append(span); });
info.node.append(txt);
}
const ain = tree.querySelector('.ain'), veil = tree.querySelector('.veil'), veilText = veil?.querySelector('text');
// 가로 배치 뒤 배경: 나무 중심을 도는 세 겹 궤도, 눈금, 수평선. svg 맨 뒤에 넣습니다
(() => {
const svg = tree.querySelector('svg'); if (!svg) return;
const NS2 = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS2, 'g'); g.setAttribute('class', 'ht-backdrop'); g.setAttribute('aria-hidden', 'true');
const mk = (tag, a, parent = g) => { const el = document.createElementNS(NS2, tag); for (const k in a) el.setAttribute(k, a[k]); parent.append(el); return el; };
[[300, 'b-orbit b-o1'], [390, 'b-orbit b-o2'], [480, 'b-orbit b-o3']].forEach(([r, c]) => mk('circle', { cx: CX, cy: CY, r, class: c }));
const ticks = mk('g', { class: 'b-ticks' });
for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r1 = 390, r2 = i % 6 ? 396 : 406; mk('line', { x1: CX + Math.cos(a) * r1, y1: CY + Math.sin(a) * r1, x2: CX + Math.cos(a) * r2, y2: CY + Math.sin(a) * r2 }, ticks); }
mk('line', { x1: CX - 620, y1: CY, x2: CX + 620, y2: CY, class: 'b-horizon' });
[300, 390, 480].forEach((r, i) => mk('circle', { cx: CX + r, cy: CY, r: 3, class: `b-sat b-s${i}` }));
svg.insertBefore(g, svg.querySelector('title')?.nextSibling || svg.firstChild);
})();
// 활성화된 가로 나무 주변 문구: 제목, 세 삼각(트라이어드)과 왕국의 이름표, 아래로 내려가라는 안내
(() => {
const svg = tree.querySelector('svg'); if (!svg) return;
const NS3 = 'http://www.w3.org/2000/svg', cap = document.createElementNS(NS3, 'g'); cap.setAttribute('class', 'ht-captions'); cap.setAttribute('aria-hidden', 'true');
const t = (x, y, cls, text) => { const el = document.createElementNS(NS3, 'text'); el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1)); el.setAttribute('class', cls); el.textContent = text; cap.append(el); return el; };
const pts = [...nodeInfo.values()];
const minY = Math.min(...pts.map((p) => p.ty)), maxY = Math.max(...pts.map((p) => p.ty));
t(CX, minY - 128, 'cap-title', 'ETZ HAYIM');
t(CX, minY - 98, 'cap-ko cap-lead', '- 세피로트의 나무 -');
// 고대 문자 흐름: 나무 뒤로 히브리·룬·연금술 기호 줄이 아주 희미하게 좌우로 흘러갑니다 (CSS 애니메이션)
const GLYPHS = Array.from('אבגדהוזחטיכלמנסעפצקרשת ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ ☉☽☿♀♂♃♄⊕△▽ ∴∵⊙⋈ '); /* Array.from: 글자 단위로 나눠야 기호가 깨지지 않습니다 */
const rows = [minY - 40, minY + 70, CY, maxY - 70, maxY + 40];
rows.forEach((y, r) => {
let line = ''; for (let k = 0; k < 90; k++) line += GLYPHS[Math.floor(Math.abs(Math.sin((k + 1) * (r + 3) * 12.9898)) * GLYPHS.length)];
const g = document.createElementNS(NS3, 'g'); g.setAttribute('class', `cap-runes cap-r${r % 2}`); g.style.animationDuration = `${70 + r * 14}s`;
const el = document.createElementNS(NS3, 'text'); el.setAttribute('x', String(CX - 900)); el.setAttribute('y', y.toFixed(1)); el.textContent = line + line; g.append(el); cap.prepend(g);
});
svg.append(cap);
})();
/* 부드러운 안착 곡선(easeInOutBack, 약하게): 기계적으로 멈추지 않고 살짝 지나쳤다 돌아와 자리 잡습니다 */
const settle = (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const c1 = .45, c2 = c1 * 1.525;
return x < .5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; };
const morph = (e, leave = 0) => {
const narrow = innerWidth < 700;
const m = Math.round(e * 1000) / 1000 + Math.round(leave * 1000) * 10; if (m === lastMorph) return; lastMorph = m;
for (const info of nodeInfo.values()) {
const i = Number(info.node.dataset.seph) - 1;
const raw = Math.min(1, Math.max(0, e * 1.45 - i * (.45 / 9))); /* 시차를 조금 줄여 세피라가 더 긴 시간 동안 부드럽게 이동 */
/* 별자리 재배치 연출: ① 세피라가 작은 빛점으로 오므라들고 ② 빛점이 새 자리로 흘러가 ③ 그 자리에서 다시 피어나며 켜집니다.
   회전하지 않고, 나무가 한 번 흩어졌다 가로로 다시 맺히는 느낌. 세피라 순서대로 시차를 둡니다 */
const seg = (a, b) => Math.min(1, Math.max(0, (raw - a) / (b - a)));
const shrinkT = seg(0, .3), moveT = seg(.18, .82), bloomT = seg(.72, 1);
const k = narrow ? 0 : easeInOut(moveT);
const mx = narrow ? 0 : info.tx - info.x, my = narrow ? 0 : info.ty - info.y;
info.cx = info.x + mx * k;
info.cy = info.y + my * k;
/* 크기: 1 → 0.16(빛점) → 1 (피어날 때 살짝 커졌다 자리 잡음). 좁은 화면은 크기 변화 없이 제자리 점등만 */
const sc = narrow ? 1 : (raw <= 0 || raw >= 1) ? 1 : bloomT > 0 ? .16 + .84 * settle(bloomT) : 1 - .84 * (shrinkT * shrinkT);
info.node.classList.toggle('is-mote', !narrow && raw > 0 && raw < 1 && shrinkT >= 1 && bloomT <= 0); /* 이동 중인 빛점 상태 */
// 떠날 때: 세피라마다 다른 속도로 위로 흩어지는 시차(패럴랙스). 케테르가 가장 느리고 말쿠트가 가장 빠릅니다
const ls = leave * leave;
info.cx -= ls * (i - 4.5) * 6;
info.cy -= ls * (40 + i * 22);
const moved = info.cx !== info.x || info.cy !== info.y;
info.node.setAttribute('transform', moved || sc !== 1 ? `translate(${info.cx.toFixed(2)} ${info.cy.toFixed(2)}) scale(${sc.toFixed(3)}) translate(${-info.x} ${-info.y})` : '');
// 도착 = 점등
const lit = raw >= .999; // 부동소수 오차로 말쿠트(마지막)가 1에 못 미쳐 켜지지 않던 문제 방지
if (lit !== info.lit) { info.lit = lit; info.node.classList.toggle('is-lit', lit); if (lit && treeAudible) playLayer('node-lit'); /* 나무 구간에서 실제로 켜질 때만 */ }
}
// 케테르 위의 아인 호(세 겹 반원)는 케테르를 따라가며 바깥쪽(왼쪽)을 향하도록 방향만 바꿉니다
const K = nodeInfo.get('1');
if (ain && K && !narrow) { const kk = easeInOut(Math.min(1, Math.max(0, e))); ain.setAttribute('transform', e ? `translate(${(K.cx - K.x).toFixed(2)} ${(K.cy - K.y).toFixed(2)}) rotate(${(-90 * kk).toFixed(2)} ${K.x} ${K.y})` : ''); }
// 심연의 장막: 위 삼각과 아래를 가르는 가로선이 세로선으로 서서히 바뀝니다
if (veil && !narrow) { const va = 90 * easeInOut(e); veil.setAttribute('transform', e ? `rotate(${(-va).toFixed(2)} ${CX} ${CY})` : ''); if (veilText) veilText.setAttribute('transform', e ? `rotate(${va.toFixed(2)} ${veilText.getAttribute('x')} ${veilText.getAttribute('y')})` : ''); }
// 배경 궤도: 다 바뀐 뒤 나무 뒤를 채우는 고리와 눈금 (진하기만 e로 조절, 회전은 CSS)
tree.style.setProperty('--laid', easeInOut(e).toFixed(3));
if (!narrow) tree.style.setProperty('--relink', (e <= 0 || e >= 1) ? '1' : (Math.max(0, 1 - Math.sin(Math.PI * e) * 1.4)).toFixed(3)); /* 재배치 중 경로 흐림 */
for (const { el, a, b } of lines) { const A = nodeInfo.get(a), B = nodeInfo.get(b); if (!A || !B) continue; el.setAttribute('x1', A.cx.toFixed(1)); el.setAttribute('y1', A.cy.toFixed(1)); el.setAttribute('x2', B.cx.toFixed(1)); el.setAttribute('y2', B.cy.toFixed(1)); }
for (const bd of badges) { const x = bd.A.cx + (bd.B.cx - bd.A.cx) * bd.t, y = bd.A.cy + (bd.B.cy - bd.A.cy) * bd.t; bd.el.setAttribute('transform', `translate(${(x - bd.bx).toFixed(2)} ${(y - bd.by).toFixed(2)})`); }
};
// 회전 연출용 다이얼: 나무 뒤에 눈금 고리와 각도 표시가 떠올라 나무와 반대로 돌며 회전량을 읽어 줍니다
const NS = 'http://www.w3.org/2000/svg';
const dial = document.createElementNS(NS, 'svg');
dial.setAttribute('class', 'ht-dial'); dial.setAttribute('viewBox', '-100 -100 200 200'); dial.setAttribute('aria-hidden', 'true');
const outer = document.createElementNS(NS, 'g'), inner = document.createElementNS(NS, 'g');
const add = (parent, tag, attrs) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.append(el); return el; };
add(outer, 'circle', { r: 96, class: 'dial-line' });
for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, l = i % 10 === 0 ? 7 : i % 5 === 0 ? 4 : 2; add(outer, 'line', { x1: Math.cos(a) * 96, y1: Math.sin(a) * 96, x2: Math.cos(a) * (96 - l), y2: Math.sin(a) * (96 - l), class: 'dial-line' }); }
['א', 'מ', 'ש', 'ת'].forEach((ch, i) => { const a = i / 4 * Math.PI * 2 - Math.PI / 2; const tx = add(outer, 'text', { x: Math.cos(a) * 84, y: Math.sin(a) * 84 + 2.5, class: 'dial-text' }); tx.textContent = ch; });
add(inner, 'circle', { r: 72, class: 'dial-line dial-dash' });
add(inner, 'line', { x1: 0, y1: 0, x2: 0, y2: -72, class: 'dial-line dial-arm' });
const readout = add(dial, 'text', { x: 0, y: 92, class: 'dial-text dial-readout' });
dial.prepend(inner); dial.prepend(outer);
// 회전 다이얼은 더 이상 쓰지 않습니다 (실제 회전이 없으므로)

// 세피라 원: 회전 중 케테르부터 말쿠트까지 순서대로 한 번씩 부풀었다 돌아오는 파동
const rings = [...tree.querySelectorAll('.node-ring')].map((ring) => [ring, Number(ring.getAttribute('r'))]);
let dialBox = { x: 0, y: 0 };
// 도착 연출: 다 누우면 케테르→말쿠트 순서로 세피라가 하나씩 점등됩니다 (파문 고리 + 원 채움 + 글자 튀어오름)
tree.querySelectorAll('.node').forEach((node, i) => {
node.style.setProperty('--i', String(i));
const ring = node.querySelector('.node-ring'); if (!ring) return;
for (let k = 0; k < 2; k++) { const ripple = document.createElementNS(NS, 'circle'); ripple.setAttribute('class', `node-ripple r${k}`); ripple.setAttribute('cx', ring.getAttribute('cx')); ripple.setAttribute('cy', ring.getAttribute('cy')); ripple.setAttribute('r', ring.getAttribute('r')); node.prepend(ripple); }
});
let arriveTimer = 0;
// 케테르로 빨려 들어가는 연출용: 나무 중심(viewBox 200, 320)에서 케테르 원 중심까지의 벡터 (viewBox 단위)
// 케테르의 보라 빛 막: 화면 아래에서 차오르는 고정 레이어 (빛 번짐이 아니라 옅은 색 그라디언트)
const wash = document.createElement('div');
wash.className = 'k-wash'; wash.setAttribute('aria-hidden', 'true');

const ketherRing = tree.querySelector('[data-seph="1"] .node-ring') || tree.querySelector('.node-ring');
const kv = ketherRing ? [Number(ketherRing.getAttribute('cx')) - 200, Number(ketherRing.getAttribute('cy')) - 320] : [0, 0];
const arrive = () => {
if (reduceMotion.matches) return;
clearTimeout(arriveTimer);
hero.classList.remove('is-arrived'); void tree.offsetWidth; hero.classList.add('is-arrived');
arriveTimer = setTimeout(() => hero.classList.remove('is-arrived'), 2600);
};
const setUpright = (angle) => {
const a = Math.round(angle * 10) / 10; if (a === lastAngle) return; lastAngle = a;
for (const [el, cx, cy] of upright) { if (a) el.setAttribute('transform', `rotate(${a} ${cx} ${cy})`); else el.removeAttribute('transform'); }
};
const trace = () => {
if (reduceMotion.matches) return;
clearTimeout(traceTimer);
hero.classList.remove('is-tracing');
void tree.offsetWidth;
hero.classList.add('is-tracing');
traceTimer = setTimeout(() => hero.classList.remove('is-tracing'), 2400);
};
const update = () => {
pending = 0;
const pin = heroHeight * PIN_RATIO;
const raw0 = Math.max(0, scrollY - heroTop);
treeAudible = raw0 <= pin + 2; // 나무 구간 안에서만 점등·경로 소리를 냅니다
// 방향 결정: 위로 스크롤 의사(wantUp)가 있으면 세로로, 조금이라도 내려와 있으면 가로로
const target = wantUp ? 0 : (wantDown || raw0 > 8) ? 1 : 0;
const now = performance.now();
const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0; lastTime = now;
anim += Math.sign(target - anim) * Math.min(Math.abs(target - anim), dt / MORPH_SECONDS);
const progress = anim;
if (target === 0 && anim > 0 && !reversing) { /* 아래 장에서 한 번에 맨 위로 올라온 경우도 포함 */ reversing = true; setTimeout(() => playLayer('tree-off'), 500); /* 0.5초 뒤 재생 */ }
if (anim <= 0) { reversing = false; wantUp = false; }
if (target === 1) reversing = false; /* 가로로 다시 가면 비활성 소리를 다시 낼 수 있게 초기화 */
if (anim >= 1) wantDown = false;
const inHero = raw0 <= pin + 2;

if (!inHero && target === 1) anim = 1; // 링크로 멀리 점프한 경우: 잠그지 않고 즉시 완료
// 변형 중에는 양방향 모두 입력을 잠그고, 연출 진행에 맞춰 페이지를 목적지(가로=고정 끝 / 세로=맨 위)로 미끄러뜨립니다
const shouldLock = inHero && anim !== target && !reduceMotion.matches;
if (shouldLock && (!scrollLocked || lockDir !== target)) { glideFrom = scrollY; glideAnim = anim; lockDir = target; if (target === 1 && anim < .05) { setTimeout(() => playLayer('tree-on'), 500); /* 0.5초 뒤 재생 */ prepareSfx('node-lit'); } }
if (shouldLock !== scrollLocked) { if (!shouldLock) holdFor(500); setScrollLock(shouldLock); }
if (scrollLocked) {
const to = target ? heroTop + pin : heroTop;
const span = Math.abs(target - glideAnim) || 1, k = Math.min(1, Math.abs(anim - glideAnim) / span);
scrollTo(0, Math.round(glideFrom + (to - glideFrom) * easeInOut(k)));
}
// 잠금 직후 대기(0.5초)가 끝나면 다시 계산해 힌트가 다시 나타나게 합니다 (예전에는 첫 번째에만 보이던 문제)
if (holding()) { clearTimeout(hintTimer); hintTimer = setTimeout(schedule, Math.max(30, window.__scrollHold.until - performance.now() + 30)); }
{ const show = !scrollLocked && !holding() && raw0 <= pin + 2 && (anim === 0 || anim === 1);
hint.classList.toggle('is-shown', show);
const label = anim >= 1 ? '아래로 스크롤하여 케테르로' : '아래로 스크롤하여 나무 깨우기';
if (hintText.textContent !== label) hintText.textContent = label; }
// 스크롤을 옮긴 '뒤'의 위치로 나무 위치를 계산해야 한 프레임 어긋남(떨림)이 없습니다
const distance = Math.max(0, scrollY - heroTop);
const e = easeInOut(progress);
if (anim !== target) schedule(); else lastTime = 0;
// 다 누웠을 때 / 다시 섰을 때 경로에 빛을 한 번 흘립니다
if (progress >= 1 && !laid) { laid = true; hero.classList.add('is-laid'); trace(); if (treeAudible) playLayer('path-trace'); } // 경로를 따라 빛이 흐를 때 마법진 울림
if (progress < 0.02 && laid) { laid = false; hero.classList.remove('is-laid'); trace(); }
previous = progress;
if (reduceMotion.matches) { tree.style.transform = ''; morph(1); return; }
// 누운 나무가 화면 너비(누운 뒤의 가로 = 원래 세로)와 높이 안에 들어오도록 크기를 맞춥니다
const fit = innerWidth < 700 ? Math.min(1, (innerHeight * 0.86) / treeH) : Math.min((innerWidth - 64) / treeH, (innerHeight * 0.78) / treeW, 1.25);
const scale = 1 + (fit - 1) * e;
// 고정: 스크롤한 만큼 아래로 밀어 화면 같은 자리에 머물게 합니다
const hold = Math.min(distance, pin);
// 원근 흔들림: 회전 중간에 가장 크게, 시작과 끝에서는 0

// 나무는 눕지만 이름·문양·히브리 글자는 각자 제자리에서 반대로 돌아 항상 똑바로 읽히게 합니다
const leave = Math.min(1, Math.max(0, (distance - pin) / (innerHeight * .6)));
morph(e, leave); // 회전 대신 각 세피라가 차례로 제자리를 찾아 이동하며 가로 배치가 됩니다
// 모바일 세로 나무: 켜지는 동안 소개 글 아래에 있던 나무를 화면 한가운데로 끌어올려 말쿠트까지 한 화면에 보이게 합니다
const centerShift = innerWidth < 700 ? (innerHeight / 2 - dialBox.y) * e : 0; /* 고정 상태 기준의 고정값이라 고정이 풀리면 페이지와 함께 올라갑니다 */
const lift = `translate3d(0, ${(hold + centerShift - tension * 48).toFixed(1)}px, 0)`; // tension: 당겨질 때 살짝 끌려 올라가는 저항감
const spin = `scale(${scale.toFixed(3)})`;
// 다 바뀌면 고정을 풀고 페이지와 함께 자연스럽게 올라가며, 바로 아래 케테르 장이 이어집니다.
// 떠나는 동안만 살짝 옅어져 다음 장으로 시선이 넘어가게 합니다

tree.style.transform = `${lift} ${spin}`;
tree.style.opacity = (1 - leave * .75).toFixed(3);
// 다이얼: 회전 중간에 가장 진하고, 시작과 끝에서는 사라집니다. 바깥 고리는 반대로, 안쪽 바늘은 빠르게 돕니다
const presence = Math.sin(Math.PI * e);
const diameter = Math.max(treeW, treeH) * scale * .86;








// 왼쪽 소개 글은 나무가 눕는 동안 함께 고정되며 천천히 사라집니다
if (copy) {
copy.style.transform = `translate3d(0, ${hold.toFixed(1)}px, 0)`;
copy.style.opacity = String(Math.max(0, 1 - progress * 1.6).toFixed(3));
}
};
const schedule = () => { if (!pending) pending = requestAnimationFrame(update); };
// ── 텐션 스크롤 ───────────────────────────────────────────────
// 가로 나무가 활성인 상태에서 아래로 스크롤하면 바로 내려가지 않고 고무줄처럼 버팁니다(tension 0→1).
// 끝까지 당기면 스크롤을 잠근 채 케테르 장으로 탄력 있게 내려가고, 중간에 놓으면 제자리로 튕겨 돌아옵니다
let tensionTimer = 0, tensionFrame = 0, hintTimer = 0;
// 스크롤 힌트: 비활성(세로) 상태에서는 '나무 깨우기', 활성(가로) 상태에서는 '케테르로'를 화면 아래에 띄웁니다
const hint = document.createElement('div');
hint.className = 'tree-hint'; hint.setAttribute('aria-hidden', 'true');
const hintText = document.createElement('span'); hint.append(hintText, Object.assign(document.createElement('i'), { className: 'tree-hint-line' }));
document.body.append(hint);
const TENSION_PX = 520;      // 이만큼 당겨야 넘어갑니다
const SNAP_MS = 950;         // 케테르까지 내려가는 시간
// 시작·끝만 살짝 부드럽고 가운데는 거의 일정한 속도 (튕김 없음)
const autoEase = (x) => (x < .15 ? (x * x) / .3 : x > .85 ? 1 - ((1 - x) * (1 - x)) / .3 : (x - .075) / .85);
const inTensionZone = () => false && laid && !snapping && !scrollLocked && !reduceMotion.matches && scrollY - heroTop < heroHeight * PIN_RATIO * .95;
const release = () => {
cancelAnimationFrame(tensionFrame);
const step = () => { tension *= .8; if (tension < .005) tension = 0; schedule(); if (tension) tensionFrame = requestAnimationFrame(step); };
tensionFrame = requestAnimationFrame(step);
};
const snapToKether = () => {
const kether = document.getElementById('kether'); if (!kether) return;
snapping = true; setScrollLock(true); cancelAnimationFrame(tensionFrame); clearTimeout(tensionTimer);
const from = scrollY, to = kether.getBoundingClientRect().top + scrollY, start = performance.now(), t0 = tension;
// 마우스 휠 클릭 자동 스크롤처럼 일정한 속도로 미끄러지게: 거리 1px당 약 1.4ms, 0.9~2.2초 범위
const duration = Math.min(1600, Math.max(1050, Math.abs(to - from) * .9));
const step = (now) => {
const x = Math.min(1, (now - start) / duration);
scrollTo(0, Math.round(from + (to - from) * silky(x)));
tension = t0 * (1 - Math.min(1, x * 3)); // 출발하면서 당겨졌던 긴장이 풀립니다
schedule();
if (x < 1) requestAnimationFrame(step); else { snapping = false; tension = 0; holdFor(500); setScrollLock(false); }
};
requestAnimationFrame(step);
};
// 활성 상태에서 아래로 스크롤하면 당김 없이 바로 자동 스크롤을 시작합니다 (입력 크기와 무관)
const pull = () => { if (!snapping) snapToKether(); };
// 가로 나무 구간에서 위로 스크롤하면 바로 세로로 돌아가는 연출을 시작합니다 (네이티브 스크롤과 섞이며 떨리는 것 방지)
const upIntent = (event) => { if (!laid || scrollLocked || holding() || reduceMotion.matches) return; if (scrollY - heroTop > heroHeight * PIN_RATIO + 2) return; if (event.cancelable) event.preventDefault(); wantUp = true; schedule(); };
window.addEventListener('wheel', (event) => { if (event.deltaY < 0) upIntent(event); }, { passive: false });
// 맨 위 세로 나무에서 첫 아래 스크롤은 네이티브로 흘려보내지 않고 바로 연출로 넘깁니다 (첫 프레임 튐 방지)
const downIntent = (event) => { if (laid || anim > 0 || scrollLocked || holding() || reduceMotion.matches) return; if (scrollY - heroTop > 8) return; if (event.cancelable) event.preventDefault(); wantDown = true; schedule(); };
window.addEventListener('wheel', (event) => { if (event.deltaY > 0) downIntent(event); }, { passive: false });
window.addEventListener('keydown', (event) => { if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(event.key)) downIntent(event); });
let upTouchY = 0;
window.addEventListener('touchstart', (event) => { upTouchY = event.touches[0]?.clientY ?? 0; }, { passive: true });
window.addEventListener('touchmove', (event) => { const y = event.touches[0]?.clientY ?? 0; if (y - upTouchY > 4) upIntent(event); else if (upTouchY - y > 4) downIntent(event); upTouchY = y; }, { passive: false });
window.addEventListener('keydown', (event) => { if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) upIntent(event); });
window.addEventListener('wheel', (event) => { if (event.deltaY > 0 && inTensionZone()) { event.preventDefault(); pull(); } }, { passive: false });
let touchY = 0;
window.addEventListener('touchstart', (event) => { touchY = event.touches[0]?.clientY ?? 0; }, { passive: true });
window.addEventListener('touchmove', (event) => { const y = event.touches[0]?.clientY ?? 0, d = touchY - y; touchY = y; if (d > 0 && inTensionZone()) { event.preventDefault(); pull(); } }, { passive: false });
window.addEventListener('keydown', (event) => { if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(event.key) && inTensionZone()) { event.preventDefault(); pull(); } });
const measure = () => {
heroTop = hero.getBoundingClientRect().top + scrollY;
heroHeight = hero.offsetHeight;
const svg = tree.querySelector('svg');
treeW = svg?.clientWidth || tree.clientWidth;
treeH = svg?.clientHeight || tree.clientHeight;
// 다이얼 중심 = 나무 중심 (히어로 기준 좌표, 고정 이동량은 update에서 더합니다)
dialBox = { x: tree.offsetLeft + tree.offsetWidth / 2, y: tree.offsetTop + tree.offsetHeight / 2 };
schedule();
};
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', measure);
reduceMotion.addEventListener('change', schedule);
const ready = new MutationObserver(() => {
if (!document.documentElement.classList.contains('tree-grown')) return;
ready.disconnect();
trace();
});
ready.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
measure();
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
initTreeScroll(hero, heroTree);
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

// 교차 이벤트 순서 대신 화면의 같은 위치를 기준으로 현재 장을 결정합니다.
let trackingFrame = 0;
const trackCurrent = () => {
trackingFrame = 0;
const line = innerHeight * 0.4;
const chapter = chapters.find((item) => { const rect = item.getBoundingClientRect(); return rect.top <= line && rect.bottom > line; });
if (chapter) setCurrent(chapter.dataset.seph);
};
const scheduleTracking = () => { if (!trackingFrame) trackingFrame = requestAnimationFrame(trackCurrent); };
window.addEventListener('scroll', scheduleTracking, { passive: true });
window.addEventListener('resize', scheduleTracking);
new ResizeObserver(scheduleTracking).observe(document.body);
scheduleTracking();

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

}, { threshold: 0.15 }).observe(hero);
// 우측 미니맵은 케테르 장이 화면 절반 위로 올라왔을 때부터 서서히 나타납니다 (나무 화면에서는 숨김)
const kether = document.getElementById('kether');
if (minimap && kether) {
let mmFrame = 0;
const syncMinimap = () => { mmFrame = 0; minimap.classList.toggle('is-shown', kether.getBoundingClientRect().top < innerHeight * 0.5); };
addEventListener('scroll', () => { if (!mmFrame) mmFrame = requestAnimationFrame(syncMinimap); }, { passive: true });
addEventListener('resize', syncMinimap);
syncMinimap();
}
}

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
window.clearTimeout(releaseTimer);
if (!document.hidden) { warmSfx(location.hash.slice(1)); return; }
stopSfx();
// 장시간 다른 탭에 머물면 재생용 캐시를 비웁니다.
releaseTimer = window.setTimeout(() => {
buffers.clear(); soundBytes = 0;
audioCache.forEach((audio) => { audio.pause(); audio.removeAttribute('src'); audio.load(); });
audioCache.clear();
}, 30000);
audioContext?.suspend().catch(() => {});
document.querySelectorAll('[data-orb]').forEach((orb) => {
window.clearTimeout(Number(orb.dataset.actTimer ?? 0));
orb.classList.remove('is-acting');
});
});
initSoundToggle();
initButtonSound();
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

