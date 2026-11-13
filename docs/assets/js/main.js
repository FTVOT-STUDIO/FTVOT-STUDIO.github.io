// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
// 스크롤은 브라우저 기본 스크롤을 그대로 씁니다 (관성 스크롤 라이브러리는 이질감 때문에 뺐습니다).
import { initIntro, initSky } from './intro.js?v=20261114b';
import { initSephirot } from './sephirot.js';

// 등장 연출용 CSS를 켭니다. JS가 실패하면 이 클래스가 없어서 내용이 전부 보입니다
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOPBAR = 56;

/** 섹션으로 부드럽게 이동 (모션 축소 설정이면 즉시) */
function scrollToEl(el) {
const top = el.id === 'tree' ? 0 : el.getBoundingClientRect().top + window.scrollY - TOPBAR;
window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

/** 일반 앵커(#tree, #tiferet 등)도 같은 방식으로 이동합니다. 나무 노드는 sephirot.js가 처리합니다 */
function initAnchors() {
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
if (!link || link.classList.contains('node')) return;
const id = link.getAttribute('href').slice(1);
const target = id ? document.getElementById(id) : null;
if (!target) return;
event.preventDefault();
scrollToEl(target);
target.focus({ preventScroll: true });
history.replaceState(null, '', id === 'tree' ? location.pathname : `#${id}`);
});
}

function initYear() {
const el = document.querySelector('[data-year]');
if (el) el.textContent = String(new Date().getFullYear());
}

initSky();
initAnchors();
initSephirot({ scrollTo: scrollToEl });
initDetails();
initPortraits();
initYear();
// 인트로가 걷히면 첫 화면의 나무가 자라납니다
initIntro(() => document.documentElement.classList.add('tree-grown'));

function initDetails() {
document.querySelectorAll('.arka-sephira, .project-entry, .arka-faction-group').forEach((details) => {
details.addEventListener('toggle', () => {
if (!details.open) return;
// 내용이 펼쳐진 뒤 제목을 상단 바 아래에 맞춰 새 내용을 놓치지 않게 합니다.
requestAnimationFrame(() => {
if (!details.open) return;
const top = details.getBoundingClientRect().top + scrollY - TOPBAR - 20;
window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
});
});
});
}

function initPortraits() {
const boundsCache = new Map();
const frames = document.querySelectorAll('.orb-art, .portrait-frame');
const measure = (img) => {
if (boundsCache.has(img.currentSrc)) return boundsCache.get(img.currentSrc);
const canvas = document.createElement('canvas');
canvas.width = img.naturalWidth;
canvas.height = img.naturalHeight;
const context = canvas.getContext('2d', { willReadFrequently: true });
if (!context) return null;
try {
context.drawImage(img, 0, 0);
const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
for (let y = 0; y < canvas.height; y += 1) {
for (let x = 0; x < canvas.width; x += 1) {
if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
left = Math.min(left, x); right = Math.max(right, x);
top = Math.min(top, y); bottom = Math.max(bottom, y);
}
}
if (right < left) return null;
const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
boundsCache.set(img.currentSrc, bounds);
return bounds;
} catch { return null; }
};
frames.forEach((frame) => {
const fit = () => {
if (!frame.clientWidth || !frame.clientHeight) return;
frame.querySelectorAll('img').forEach((img) => {
if (!img.complete || !img.naturalWidth) return;
const b = measure(img);
if (!b) return;
// 투명 여백 대신 실제 픽셀의 중심과 크기로 대기·공격 프레임을 맞춥니다.
const scale = Math.min(frame.clientWidth / b.width, frame.clientHeight / b.height) * 0.95;
img.style.width = `${img.naturalWidth * scale}px`;
img.style.height = `${img.naturalHeight * scale}px`;
img.style.left = `${(frame.clientWidth - b.width * scale) / 2 - b.left * scale}px`;
img.style.top = `${(frame.clientHeight - b.height * scale) / 2 - b.top * scale}px`;
});
};
frame.querySelectorAll('img').forEach((img) => img.addEventListener('load', fit));
new ResizeObserver(fit).observe(frame);
fit();
});
}

