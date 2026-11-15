// 같은 우주 지도에 진입하는 느낌을 유지하며 임의의 문구는 사용하지 않습니다.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

export function initIntro(onDone) {
const intro = document.querySelector('[data-intro]');
const state = document.querySelector('[data-intro-state]');
if (!intro || reduceMotion.matches) {
intro?.remove();
onDone();
return;
}
document.body.classList.add('is-intro');
let closed = false;
const close = () => {
if (closed) return;
closed = true;
intro.classList.add('is-leaving');
document.body.classList.remove('is-intro');
window.removeEventListener('keydown', close);
window.removeEventListener('wheel', close);
window.removeEventListener('touchstart', close);
window.setTimeout(() => intro.remove(), 650);
onDone();
};
// 로딩 로그: 진행 막대 아래에 터미널 로그가 한 줄씩 쌓이고, 마지막 줄에 Hello World! 가 찍힌 뒤 사이트로 들어갑니다
const pct = intro.querySelector('[data-intro-pct]'), log = intro.querySelector('[data-intro-hello]');
const LINES = ['boot ftvot_studio.exe', 'load assets/sephirot ........ ok', 'mount worlds[10] ........... ok', 'link paths[22] ............. ok', 'compile tree_of_life ....... ok'];
const LOAD_MS = 1500, start = performance.now();
let shown = 0;
const addLine = (text, cls = '') => { if (!log) return; const row = document.createElement('span'); row.className = `intro-log-line ${cls}`; row.textContent = `> ${text}`; log.append(row); };
const tick = (now) => {
if (closed) return;
const k = Math.min(1, (now - start) / LOAD_MS), eased = 1 - Math.pow(1 - k, 2.2);
if (pct) pct.textContent = `${Math.round(eased * 100)}%`;
while (shown < Math.ceil(k * LINES.length) && shown < LINES.length) addLine(LINES[shown++]);
if (state) state.textContent = k < 1 ? 'LOADING' : 'READY';
if (k < 1) requestAnimationFrame(tick); else { setTimeout(() => { addLine('Hello World!', 'is-hello'); setTimeout(close, 900); }, 200); }
};
requestAnimationFrame(tick);
intro.addEventListener('click', close);
window.addEventListener('keydown', close, { once: true });
window.addEventListener('wheel', close, { once: true, passive: true });
window.addEventListener('touchstart', close, { once: true, passive: true });
}

export function initSky() {
const stars = document.querySelector('[data-stars]');
if (stars) {
const fragment = document.createDocumentFragment();
const count = window.innerWidth < 600 ? 46 : 90;
for (let i = 0; i < count; i += 1) {
const star = document.createElement('span');
star.className = i % 5 === 0 ? 'star twinkle' : 'star';
star.style.left = `${Math.random() * 100}%`;
star.style.top = `${Math.random() * 100}%`;
star.style.setProperty('--size', `${0.6 + Math.random() * 1.3}px`);
star.style.setProperty('--alpha', String(0.12 + Math.random() * 0.43));
star.style.setProperty('--twinkle', `${2.4 + Math.random() * 3}s`);
fragment.append(star);
}
stars.append(fragment);
}
const sky = document.querySelector('.sky');
const orbits = document.querySelector('.cosmic-orbits');
if (!sky) return;
let currentX = 0, currentY = 0, targetX = 0, targetY = 0, frame = 0;
const enabled = () => !document.hidden && !reduceMotion.matches && finePointer.matches;
const draw = () => {
currentX += (targetX - currentX) * 0.075;
currentY += (targetY - currentY) * 0.075;
sky.style.setProperty('--parallax-x', `${currentX * 12}px`);
sky.style.setProperty('--parallax-y', `${currentY * 9}px`);
orbits?.style.setProperty('--parallax-x', `${currentX * -7}px`);
orbits?.style.setProperty('--parallax-y', `${currentY * -5}px`);
frame = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.002 ? requestAnimationFrame(draw) : 0;
};
const request = () => { if (!frame) frame = requestAnimationFrame(draw); };
window.addEventListener('pointermove', (event) => {
if (!enabled() || event.pointerType !== 'mouse') return;
targetX = event.clientX / innerWidth * 2 - 1;
targetY = event.clientY / innerHeight * 2 - 1;
request();
}, { passive: true });
const reset = () => { targetX = 0; targetY = 0; request(); };
document.documentElement.addEventListener('pointerleave', reset);
window.addEventListener('blur', reset);
const change = () => {
if (enabled()) return;
cancelAnimationFrame(frame);
frame = 0;
currentX = currentY = targetX = targetY = 0;
for (const el of [sky, orbits]) {
el?.style.setProperty('--parallax-x', '0px');
el?.style.setProperty('--parallax-y', '0px');
}
};
reduceMotion.addEventListener('change', change);
finePointer.addEventListener('change', change);
document.addEventListener('visibilitychange', change);
}
