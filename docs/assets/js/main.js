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
initPresentation();
initImageViewer();
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


function initPresentation() {
const targets = [...document.querySelectorAll('.project-entry, .stack-list > div, .ho-list > li, .bi-rings > li, .arka-part > h3, .contact-stage, .contact-address, .contact-links > li')];
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
const observer = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-visible');
observer.unobserve(entry.target);
});
}, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
targets.forEach((target, i) => {
target.classList.add('reveal-target');
target.style.setProperty('--reveal-delay', `${i % 3 * 60}ms`);
observer.observe(target);
});
document.documentElement.classList.add('motion-ready');
}
let pending = false;
const progress = () => {
const range = document.documentElement.scrollHeight - innerHeight;
document.documentElement.style.setProperty('--reading-progress', String(range > 0 ? scrollY / range : 0));
pending = false;
};
window.addEventListener('scroll', () => {
if (pending) return;
pending = true;
requestAnimationFrame(progress);
}, { passive: true });
window.addEventListener('resize', progress);
new ResizeObserver(progress).observe(document.body);
progress();
document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('is-page-hidden', document.hidden));
document.querySelectorAll('[data-gallery-step]').forEach((button) => {
button.addEventListener('click', () => {
const gallery = button.closest('.project-content').querySelector('.project-gallery');
const card = gallery.querySelector('figure');
const amount = card ? card.getBoundingClientRect().width + 20 : gallery.clientWidth;
gallery.scrollBy({ left: Number(button.dataset.galleryStep) * amount, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
});
});
const copy = document.querySelector('[data-copy-email]');
copy?.addEventListener('click', async () => {
const address = document.querySelector('.contact-address a');
const status = document.querySelector('[data-copy-status]');
try {
await navigator.clipboard.writeText(address.href.slice(7));
copy.textContent = '복사했습니다';
if (status) status.textContent = '이메일 주소를 복사했습니다.';
} catch {
// 클립보드 접근이 막힌 경우 주소를 선택하여 직접 복사할 수 있게 합니다.
const range = document.createRange();
range.selectNodeContents(address);
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);
if (status) status.textContent = '선택된 주소를 복사해 주세요.';
}
window.setTimeout(() => { copy.textContent = '주소 복사'; }, 2000);
});
}

function initImageViewer() {
const links = [...document.querySelectorAll('.project-gallery figure a')];
if (!links.length || !('HTMLDialogElement' in window)) return;
const dialog = document.createElement('dialog');
dialog.className = 'image-viewer';
dialog.setAttribute('aria-label', '프로젝트 이미지 확대 보기');
dialog.innerHTML = '<div class="viewer-toolbar"><span class="mono" data-viewer-count></span><button type="button" data-viewer-close aria-label="확대 보기 닫기">닫기 <span aria-hidden="true">×</span></button></div><div class="viewer-stage"><button type="button" data-viewer-prev aria-label="이전 이미지">←</button><img alt=""><button type="button" data-viewer-next aria-label="다음 이미지">→</button></div><p class="viewer-caption"></p><p class="viewer-hint mono">← → 이동 · ESC 닫기</p>';
document.body.append(dialog);
const image = dialog.querySelector('img');
const caption = dialog.querySelector('.viewer-caption');
const count = dialog.querySelector('[data-viewer-count]');
let galleryLinks = [], current = 0, trigger = null;
const render = () => {
const link = galleryLinks[current];
image.src = link.href;
image.alt = link.querySelector('img').alt;
caption.textContent = image.alt;
count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(galleryLinks.length).padStart(2, '0')}`;
dialog.querySelector('[data-viewer-prev]').disabled = galleryLinks.length < 2;
dialog.querySelector('[data-viewer-next]').disabled = galleryLinks.length < 2;
if (!reduceMotion.matches) image.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
};
const step = (direction) => { current = (current + direction + galleryLinks.length) % galleryLinks.length; render(); };
links.forEach((link) => link.addEventListener('click', (event) => {
event.preventDefault();
galleryLinks = [...link.closest('.project-gallery').querySelectorAll('figure a')];
current = galleryLinks.indexOf(link);
trigger = link;
render();
dialog.showModal();
document.body.classList.add('viewer-open');
}));
dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-viewer-prev]').addEventListener('click', () => step(-1));
dialog.querySelector('[data-viewer-next]').addEventListener('click', () => step(1));
dialog.addEventListener('keydown', (event) => {
if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
});
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
document.body.classList.remove('viewer-open');
trigger?.focus({ preventScroll: true });
});
}
