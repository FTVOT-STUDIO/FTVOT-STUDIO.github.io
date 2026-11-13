// 첫 접속 인트로 + 배경 별빛 + 흐르는 축복 문구
// 인트로 연출은 STUDIO NAS 게이트웨이(studio-nas)의 첫 화면 효과를 이 사이트에 맞게 옮긴 것입니다.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// 한 번 본 사람은 같은 탭 세션 동안 인트로를 건너뜁니다 (새로고침마다 기다리지 않게)
const SEEN_KEY = 'intro-seen';
const INTRO_STATE_MS = 950;   // "LINK ESTABLISHED"로 바뀌는 시점
const INTRO_CLOSE_MS = 1850;  // 자동으로 걷히는 시점
const INTRO_REMOVE_MS = 650;  // 페이드아웃 후 DOM 제거까지

// 세피라 축복 (배경에 흐르고, 인트로에 무작위로 하나 나옵니다)
const BLESSINGS = [
'케테르 · 왕관이 무한한 공허를 가득 채우길',
'호크마 · 지혜가 분열된 진실을 하나로 꿰뚫길',
'비나 · 이해가 모든 만물과 하나가 되길',
'헤세드 · 자비가 모두의 안식처가 되길',
'게부라 · 힘이 약자를 해치는 악을 끊어내길',
'티페레트 · 아름다움이 갈라진 세상을 이어주길',
'네차흐 · 승리가 끝없는 시련의 끝에 피어오르길',
'호드 · 영광이 살아남은 자의 포효가 되길',
'예소드 · 기초가 모든 가능성을 증명하길',
'말쿠트 · 왕국이 세계의 마지막 도달점이 되길',
];

const rand = (min, max) => min + Math.random() * (max - min);

/** @param {() => void} onDone 인트로가 걷힌 뒤 실행 */
export function initIntro(onDone) {
const intro = document.querySelector('[data-intro]');
const state = document.querySelector('[data-intro-state]');
const phrase = document.querySelector('[data-intro-phrase]');
let seen = false;
try {
seen = sessionStorage.getItem(SEEN_KEY) === '1';
} catch (error) {
seen = false;
}
if (!intro || seen || reduceMotion.matches) {
intro?.remove();
onDone();
return;
}
if (phrase) phrase.textContent = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)].split(' · ')[1];
document.body.classList.add('is-intro');

let closed = false;
const close = () => {
if (closed) return;
closed = true;
if (state) state.textContent = 'GATE OPEN';
intro.classList.add('is-leaving');
document.body.classList.remove('is-intro');
try {
sessionStorage.setItem(SEEN_KEY, '1');
} catch (error) {
// 저장이 막혀도 다음 방문에 인트로가 다시 나올 뿐입니다
}
window.setTimeout(() => intro.remove(), INTRO_REMOVE_MS);
onDone();
};
window.setTimeout(() => {
if (!closed && state) state.textContent = 'LINK ESTABLISHED';
}, INTRO_STATE_MS);
window.setTimeout(close, INTRO_CLOSE_MS);
// 누르거나 아무 키, 스크롤로 바로 건너뛸 수 있습니다
intro.addEventListener('click', close);
window.addEventListener('keydown', close, { once: true });
window.addEventListener('wheel', close, { once: true, passive: true });
window.addEventListener('touchstart', close, { once: true, passive: true });
}

/** 배경 별빛과 흐르는 축복 문구 */
export function initSky() {
const stars = document.querySelector('[data-stars]');
const drift = document.querySelector('[data-drift]');
if (stars) {
const count = window.innerWidth < 600 ? 46 : 90;
const frag = document.createDocumentFragment();
for (let i = 0; i < count; i += 1) {
const star = document.createElement('span');
star.className = Math.random() < 0.2 ? 'star twinkle' : 'star';
star.style.left = `${rand(0, 100).toFixed(2)}%`;
star.style.top = `${rand(0, 100).toFixed(2)}%`;
star.style.setProperty('--size', `${rand(0.6, 1.9).toFixed(2)}px`);
star.style.setProperty('--alpha', rand(0.12, 0.55).toFixed(2));
star.style.setProperty('--twinkle', `${rand(2.4, 5.5).toFixed(1)}s`);
frag.append(star);
}
stars.append(frag);
}
if (!drift || reduceMotion.matches) return;

// 화면을 여러 줄(레인)로 나눠 겹치지 않게 한 줄씩 흘려보냅니다
const lanes = window.innerWidth < 600 ? 5 : 8;
const busy = new Set();
let order = [];
const next = () => {
if (!order.length) order = [...BLESSINGS].sort(() => Math.random() - 0.5);
return order.pop();
};
const spawn = () => {
if (document.hidden) return;
const free = [...Array(lanes).keys()].filter((l) => !busy.has(l));
if (!free.length) return;
const lane = free[Math.floor(Math.random() * free.length)];
busy.add(lane);
const line = document.createElement('span');
line.className = 'drift-line';
line.textContent = next();
const dur = rand(38, 60);
line.style.top = `${((lane + 0.5) / lanes) * 100}%`;
line.style.setProperty('--dur', `${dur.toFixed(1)}s`);
line.style.setProperty('--alpha', rand(0.05, 0.11).toFixed(3));
line.style.setProperty('--size', `${window.innerWidth < 600 ? 11 : Math.round(rand(12, 15))}px`);
drift.append(line);
line.addEventListener('animationend', () => {
line.remove();
busy.delete(lane);
});
};
spawn();
window.setInterval(spawn, 5200);
}
