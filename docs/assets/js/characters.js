// 사이트를 돌아다니는 캐릭터
// - 네차흐 정원(전원), 화면 아래를 걷는 캐릭터
// - 전부 장식이라 aria-hidden 안에 있고, 끄기 버튼으로 걷는 캐릭터를 숨길 수 있습니다
import { ROSTER } from './roster.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const UNIT_PATH = './assets/units';
const STORAGE_KEY = 'roam';

// 걷기 속도(px/초)와 멈춰 서 있는 시간(ms). 너무 빠르면 내용 읽기를 방해합니다
const SPEED_MIN = 26;
const SPEED_MAX = 52;
const IDLE_MIN_MS = 1400;
const IDLE_MAX_MS = 4200;
// 목적지를 화면 밖으로 잡을 확률. 나갔다 들어오면서 다른 캐릭터로 바뀝니다
const EXIT_CHANCE = 0.28;
const BUBBLE_MS = 1600;

const rand = (min, max) => min + Math.random() * (max - min);

/* ---------------- 캐릭터 순환 큐 ---------------- */
// 45명을 섞어 두고 차례로 꺼냅니다. 한 바퀴 돌면 다시 섞어서 모두 골고루 나오게 합니다
const queue = [];
const onStage = new Set();

function refill() {
const shuffled = [...ROSTER];
for (let i = shuffled.length - 1; i > 0; i -= 1) {
const j = Math.floor(Math.random() * (i + 1));
[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
queue.push(...shuffled);
}

/** 지금 화면에 없는 다음 캐릭터를 꺼냅니다 */
function nextCharacter() {
for (let tries = 0; tries < ROSTER.length * 2; tries += 1) {
if (!queue.length) refill();
const next = queue.shift();
if (next && !onStage.has(next.slug)) return next;
}
return ROSTER[Math.floor(Math.random() * ROSTER.length)];
}

function makeImg(character, eager = false) {
const img = document.createElement('img');
img.src = `${UNIT_PATH}/${character.slug}/thumb.webp`;
img.width = character.w;
img.height = character.h;
img.alt = '';
img.decoding = 'async';
if (!eager) img.loading = 'lazy';
img.draggable = false;
return img;
}

/** 애니메이션 클래스를 다시 붙여 재생합니다(연타해도 매번 재생) */
function replay(el, className) {
el.classList.remove(className);
void el.offsetWidth; // 리플로우로 애니메이션 리셋
el.classList.add(className);
}

/* ---------------- 네차흐 정원 ---------------- */
// 45명 전원을 정원에 흩어 놓습니다. 격자에 무작위 흔들림을 줘서 겹치지 않으면서도 자연스럽게 배치합니다
function initGarden() {
const garden = document.querySelector('[data-garden]');
if (!garden) return;
const list = [...ROSTER];
for (let i = list.length - 1; i > 0; i -= 1) {
const j = Math.floor(Math.random() * (i + 1));
[list[i], list[j]] = [list[j], list[i]];
}
const cols = window.innerWidth < 768 ? 5 : 9;
const rows = Math.ceil(list.length / cols);
list.forEach((character, i) => {
const col = i % cols;
const row = Math.floor(i / cols);
const sprout = document.createElement('span');
sprout.className = 'sprout';
// 발밑 좌표(%) 기준 배치. 아래 줄일수록 크게 해서 원근감을 줍니다
const x = ((col + 0.5 + rand(-0.28, 0.28)) / cols) * 100;
const y = ((row + 1) / rows) * 88 + 6 + rand(-2, 2);
const scale = 0.72 + (row / Math.max(1, rows - 1)) * 0.45;
sprout.style.left = `${x.toFixed(2)}%`;
sprout.style.top = `${y.toFixed(2)}%`;
sprout.style.setProperty('--w', `${Math.round((window.innerWidth < 768 ? 58 : 86) * scale)}px`);
sprout.style.zIndex = String(row + 1);
sprout.append(makeImg(character));
sprout.addEventListener('click', () => replay(sprout, 'is-hop'));
garden.append(sprout);
});
const count = document.querySelector('[data-crowd-count]');
if (count) count.textContent = String(list.length);
}

/* ---------------- 걷는 캐릭터 ---------------- */
class Walker {
constructor(layer) {
this.el = document.createElement('span');
this.el.className = 'roamer';
this.body = document.createElement('span');
this.body.className = 'roamer-body';
this.bubble = document.createElement('span');
this.bubble.className = 'bubble';
this.el.append(this.body, this.bubble);
layer.append(this.el);

this.x = 0;
this.dir = 1;
this.speed = rand(SPEED_MIN, SPEED_MAX);
this.target = 0;
this.idleUntil = 0;
this.bubbleTimer = 0;
this.character = null;

this.body.addEventListener('click', () => this.poke());
}

get width() {
return this.el.offsetWidth || 84;
}

dress() {
if (this.character) onStage.delete(this.character.slug);
this.character = nextCharacter();
onStage.add(this.character.slug);
this.body.replaceChildren(makeImg(this.character, true));
this.bubble.textContent = this.character.name;
}

place(x) {
this.x = x;
this.el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
}

face(dir) {
this.dir = dir;
this.el.style.setProperty('--face', String(dir));
}

/** 다음 행동: 화면 안 어딘가로 걷거나, 가끔 화면 밖으로 퇴장 */
chooseTarget(viewW) {
const w = this.width;
if (Math.random() < EXIT_CHANCE) {
this.target = this.dir > 0 ? viewW + w : -w * 2;
} else {
this.target = rand(0, Math.max(0, viewW - w));
}
this.face(this.target >= this.x ? 1 : -1);
this.speed = rand(SPEED_MIN, SPEED_MAX);
this.el.classList.add('is-walking');
}

idle(now) {
this.idleUntil = now + rand(IDLE_MIN_MS, IDLE_MAX_MS);
this.el.classList.remove('is-walking');
// 서 있을 때 가끔 반대쪽을 봅니다
if (Math.random() < 0.4) this.face(-this.dir);
}

/** 화면 밖으로 나가면 다른 캐릭터로 갈아입고 반대편에서 들어옵니다 */
reenter(viewW) {
this.dress();
const fromLeft = Math.random() < 0.5;
this.place(fromLeft ? -this.width : viewW);
this.target = rand(viewW * 0.1, Math.max(viewW * 0.1, viewW * 0.9 - this.width));
this.face(fromLeft ? 1 : -1);
this.el.classList.add('is-walking');
}

update(dt, now, viewW) {
if (now < this.idleUntil) return;
if (!this.el.classList.contains('is-walking')) {
this.chooseTarget(viewW);
return;
}
const step = this.speed * dt * this.dir;
const next = this.x + step;
const arrived = this.dir > 0 ? next >= this.target : next <= this.target;
this.place(arrived ? this.target : next);
if (!arrived) return;
const w = this.width;
if (this.x <= -w || this.x >= viewW) this.reenter(viewW);
else this.idle(now);
}

poke() {
replay(this.body, 'is-hop');
if (!this.character?.name) return;
this.bubble.classList.add('is-on');
window.clearTimeout(this.bubbleTimer);
this.bubbleTimer = window.setTimeout(() => this.bubble.classList.remove('is-on'), BUBBLE_MS);
}
}

function initRoam() {
const layer = document.querySelector('[data-roam]');
// 데스크톱은 나무 패널을 뺀 내용 영역만큼만 걷습니다
const layerWidth = () => layer?.clientWidth || document.documentElement.clientWidth;
const toggle = document.querySelector('[data-roam-toggle]');
if (!layer || !ROSTER.length) return;

const count = window.innerWidth < 768 ? 2 : 4;
const walkers = [];
let rafId = 0;
let last = 0;

const loop = (now) => {
const dt = Math.min((now - last) / 1000, 0.05); // 탭 복귀 시 순간이동 방지
last = now;
const viewW = layerWidth();
walkers.forEach((w) => w.update(dt, now, viewW));
rafId = requestAnimationFrame(loop);
};

const start = () => {
if (!walkers.length) {
const viewW = layerWidth();
for (let i = 0; i < count; i += 1) {
const walker = new Walker(layer);
walker.dress();
// 화면을 구간으로 나눠 처음부터 한곳에 몰리지 않게 배치합니다
walker.place(((i + 0.5) / count) * viewW - 42);
walker.face(Math.random() < 0.5 ? 1 : -1);
walker.idle(performance.now());
walkers.push(walker);
}
}
// 모션 축소 설정이면 걷지 않고 제자리에 서 있기만 합니다
if (reduceMotion.matches || rafId) return;
last = performance.now();
rafId = requestAnimationFrame(loop);
};

const stop = () => {
cancelAnimationFrame(rafId);
rafId = 0;
};

const setEnabled = (on, save) => {
layer.hidden = !on;
if (on) start();
else stop();
if (toggle) {
toggle.setAttribute('aria-pressed', String(on));
toggle.textContent = on ? '캐릭터 끄기' : '캐릭터 켜기';
}
if (save) {
try {
localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
} catch (error) {
// 저장이 막혀도 현재 페이지에서는 설정이 유지됩니다
}
}
};

let saved = 'on';
try {
saved = localStorage.getItem(STORAGE_KEY) ?? 'on';
} catch (error) {
saved = 'on';
}
setEnabled(saved !== 'off', false);
toggle?.addEventListener('click', () => setEnabled(layer.hidden, true));

// 창 크기가 줄면 화면 밖에 갇힌 캐릭터를 안으로 들입니다
window.addEventListener('resize', () => {
const viewW = layerWidth();
walkers.forEach((w) => {
if (w.x > viewW) w.place(Math.max(0, viewW - w.width));
});
}, { passive: true });
}

export function initCharacters() {
if (!ROSTER.length) return;
initGarden();
initRoam();
}
