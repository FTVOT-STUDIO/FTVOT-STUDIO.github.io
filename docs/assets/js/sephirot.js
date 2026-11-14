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
const volumeOf = (sid) => Math.min(1, SFX_VOLUME * (SFX_BOOST[sid] || 1));
// 나무가 자라날 때 세피라 하나당 지연(ms). 케테르부터 말쿠트까지 차례로 켜집니다
const GROW_STEP = 120;

const SFX_IDS = ['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth', 'ui-click'];
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

function soundPath(sid) { return sid === 'ui-click' ? './assets/ui-click.mp3' : `${SFX_PATH}/${sid}.mp3`; }

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
playSfx('ui-click');
}, { passive: true });
document.addEventListener('pointercancel', () => { pointerTarget = null; });
document.addEventListener('click', (event) => {
const target = control(event);
const alreadyPlayed = target && pointerTarget === target && event.detail !== 0;
pointerTarget = null;
if (target && !alreadyPlayed) playSfx('ui-click');
});
prepareSfx('ui-click');
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
const PIN_RATIO = 0;       // 고정 없음: 나무는 일반 스크롤로 올라갑니다
const MORPH_SECONDS = 0.9; // 가로로 바뀌는 데 걸리는 시간
let anim = 0, lastTime = 0;     // 다 누운 뒤에도 점등 연출이 끝날 때까지 고정을 유지하는 전체 길이 (#tree의 margin-bottom과 같은 값)
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
const ain = tree.querySelector('.ain'), veil = tree.querySelector('.veil');
const morph = (e) => {
const m = Math.round(e * 1000) / 1000; if (m === lastMorph) return; lastMorph = m;
for (const info of nodeInfo.values()) {
const i = Number(info.node.dataset.seph) - 1;
const raw = Math.min(1, Math.max(0, e * 1.6 - i * .0667));
const k = easeInOut(raw);
// 직선이 아니라 바깥쪽으로 부풀었다 들어오는 호
const mx = info.tx - info.x, my = info.ty - info.y, len = Math.hypot(mx, my) || 1;
const bulge = Math.sin(Math.PI * k) * Math.min(60, len * .25);
info.cx = info.x + mx * k + (-my / len) * bulge;
info.cy = info.y + my * k + (mx / len) * bulge;
info.node.setAttribute('transform', k ? `translate(${(info.cx - info.x).toFixed(2)} ${(info.cy - info.y).toFixed(2)})` : '');
// 도착 = 점등
const lit = raw >= 1;
if (lit !== info.lit) { info.lit = lit; info.node.classList.toggle('is-lit', lit); }
}
// 케테르 위의 아인 호(세 겹 반원)는 케테르를 따라가며 바깥쪽(왼쪽)을 향하도록 방향만 바꿉니다
const K = nodeInfo.get('1');
if (ain && K) { const kk = easeInOut(Math.min(1, Math.max(0, e * 1.6))); ain.setAttribute('transform', e ? `translate(${(K.cx - K.x).toFixed(2)} ${(K.cy - K.y).toFixed(2)}) rotate(${(-90 * kk).toFixed(2)} ${K.x} ${K.y})` : ''); }
// 심연의 장막: 위 삼각과 아래를 가르는 가로선이 세로선으로 서서히 바뀝니다
if (veil) veil.setAttribute('transform', e ? `rotate(${(-90 * easeInOut(e)).toFixed(2)} ${CX} ${CY})` : '');
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
const distance = Math.max(0, scrollY - heroTop);
// 스크롤 양에 묶지 않고 시간으로 재생합니다: 조금이라도 내리면 0.9초 동안 가로로 바뀌고, 맨 위로 돌아오면 다시 섭니다.
// 휠을 세게 당겨도 연출이 한 프레임에 뛰지 않습니다
const target = distance > 8 ? 1 : 0;
const now = performance.now();
const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0; lastTime = now;
anim += Math.sign(target - anim) * Math.min(Math.abs(target - anim), dt / MORPH_SECONDS);
const progress = anim;
const e = easeInOut(progress);
if (anim !== target) schedule(); else lastTime = 0;
// 다 누웠을 때 / 다시 섰을 때 경로에 빛을 한 번 흘립니다
if (progress >= 1 && !laid) { laid = true; trace(); }
if (progress < 0.02 && laid) { laid = false; trace(); }
previous = progress;
if (reduceMotion.matches) { tree.style.transform = ''; morph(1); return; }
// 누운 나무가 화면 너비(누운 뒤의 가로 = 원래 세로)와 높이 안에 들어오도록 크기를 맞춥니다
const fit = Math.min((innerWidth - 64) / treeH, (innerHeight * 0.78) / treeW, 1.25);
const scale = 1 + (fit - 1) * e;
// 고정: 스크롤한 만큼 아래로 밀어 화면 같은 자리에 머물게 합니다
const hold = Math.min(distance, pin);
// 원근 흔들림: 회전 중간에 가장 크게, 시작과 끝에서는 0

// 나무는 눕지만 이름·문양·히브리 글자는 각자 제자리에서 반대로 돌아 항상 똑바로 읽히게 합니다
morph(e); // 회전 대신 각 세피라가 차례로 제자리를 찾아 이동하며 가로 배치가 됩니다
const lift = `translate3d(0, ${hold.toFixed(1)}px, 0)`;
const spin = `scale(${scale.toFixed(3)})`;
// 다 바뀌면 고정을 풀고 페이지와 함께 자연스럽게 올라가며, 바로 아래 케테르 장이 이어집니다.
// 떠나는 동안만 살짝 옅어져 다음 장으로 시선이 넘어가게 합니다
const leave = Math.min(1, Math.max(0, distance / (innerHeight * .8)));
tree.style.transform = `${lift} ${spin}`;
tree.style.opacity = (1 - leave * .6).toFixed(3);
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
minimap?.classList.toggle('is-shown', away);
}, { threshold: 0.15 }).observe(hero);
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

