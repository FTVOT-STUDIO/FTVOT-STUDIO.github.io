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
window.setTimeout(() => { if (!closed && state) state.textContent = 'ARCHIVE CONNECTED'; }, 800);
window.setTimeout(close, 1550);
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
const enabled = () => !reduceMotion.matches && finePointer.matches;
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
}
