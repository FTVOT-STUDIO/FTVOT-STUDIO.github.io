// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
// 스크롤은 브라우저 기본 스크롤을 그대로 씁니다 (관성 스크롤 라이브러리는 이질감 때문에 뺐습니다).
import { initIntro, initSky } from './intro.js?v=20261114j';
import { initSephirot } from './sephirot.js?v=20261114k';

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

// 새로고침에서는 브라우저의 이전 스크롤·해시 복원보다 첫 화면을 우선합니다.
const reloading = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if (reloading) {
history.scrollRestoration = 'manual';
history.replaceState(history.state, '', location.pathname + location.search);
const resetTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
resetTop();
window.addEventListener('pageshow', () => requestAnimationFrame(resetTop), { once: true });
}

initSky();
initAnchors();
initSephirot({ scrollTo: scrollToEl });
initArkaReader();
initDetails();
initPortraits();
initYear();
initPresentation();
initImageViewer();
initProjectFilters();
initArtworkGallery();
// 인트로가 걷히면 첫 화면의 나무가 자라납니다
initIntro(() => document.documentElement.classList.add('tree-grown'));

function initDetails() {
const lists = document.querySelectorAll('.arka-sephira, .project-entry, .arka-faction-group');
lists.forEach((details) => {
const summary = details.querySelector('summary');
let animation = null;
let expanding = false;
const finish = (open) => {
details.open = open;
details.style.height = '';
details.style.overflow = '';
animation = null;
};
summary.addEventListener('click', (event) => {
if (event.target.closest('a, button')) return;
event.preventDefault();
const open = animation ? !expanding : !details.open;
const start = details.getBoundingClientRect().height;
if (animation) { animation.onfinish = null; animation.cancel(); }
expanding = open;
if (reduceMotion.matches || !details.animate) { finish(open); return; }
// 닫는 동안에도 본문을 유지해야 높이가 자연스럽게 줄어듭니다.
details.open = true;
details.style.height = '';
const end = open ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
details.style.overflow = 'hidden';
animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: open ? 380 : 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
animation.onfinish = () => finish(open && details.open);
});
reduceMotion.addEventListener('change', () => {
if (!animation || !reduceMotion.matches) return;
animation.onfinish = null;
animation.cancel();
finish(expanding);
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
let mass = 0, momentX = 0, momentY = 0;
for (let y = 0; y < canvas.height; y += 1) {
for (let x = 0; x < canvas.width; x += 1) {
if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
const weight = pixels[(y * canvas.width + x) * 4 + 3] / 255;
mass += weight; momentX += x * weight; momentY += y * weight;
left = Math.min(left, x); right = Math.max(right, x);
top = Math.min(top, y); bottom = Math.max(bottom, y);
}
}
if (right < left) return null;
const bounds = { left, top, width: right - left + 1, height: bottom - top + 1, mass, centerX: momentX / mass, centerY: momentY / mass };
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
// 불투명 면적을 맞춰 넓은 무기와 잔상 때문에 몸체가 작아지는 문제를 줄입니다.
const size = Math.min(frame.clientWidth, frame.clientHeight);
const areaScale = size * 0.72 / Math.sqrt(b.mass);
const extentScale = Math.min(frame.clientWidth * 1.12 / b.width, frame.clientHeight * 1.12 / b.height);
const scale = Math.min(areaScale, extentScale);
const centerX = Math.max(b.left + b.width * 0.35, Math.min(b.centerX, b.left + b.width * 0.65));
img.style.width = `${img.naturalWidth * scale}px`;
img.style.height = `${img.naturalHeight * scale}px`;
img.style.left = `${frame.clientWidth / 2 - centerX * scale}px`;
img.style.top = `${frame.clientHeight / 2 - b.centerY * scale}px`;
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
document.querySelectorAll('.project-content').forEach((content) => {
if (content.querySelectorAll('.project-gallery figure').length < 2) {
const arrows = content.querySelector('.gallery-toolbar > div');
if (arrows) arrows.hidden = true;
}
});
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
if (!('HTMLDialogElement' in window)) return;
const dialog = document.createElement('dialog');
dialog.className = 'image-viewer';
dialog.setAttribute('aria-label', '이미지 확대 보기');
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
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('.project-gallery figure > a, .artwork-grid .artwork-card > a') : null;
if (!link) return;
if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
event.preventDefault();
galleryLinks = [...link.closest('.project-gallery, .artwork-grid').querySelectorAll('figure > a')].filter((item) => item.getAttribute('aria-disabled') !== 'true');
current = galleryLinks.indexOf(link);
trigger = link;
render();
dialog.showModal();
document.body.classList.add('viewer-open');
});
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

function initProjectFilters() {
const controls = document.querySelector('.project-filters');
if (!controls) return;
controls.hidden = false;
const entries = [...document.querySelectorAll('.unified-projects .project-entry')];
const status = document.querySelector('[data-project-filter-status]');
const pager = document.createElement('nav');
pager.className = 'project-pagination';
pager.setAttribute('aria-label', '프로젝트 목록 페이지');
controls.after(pager);
let filter = 'all';
let page = 0;
const pageSize = 5;
const render = () => {
const matches = entries.filter((entry) => filter === 'all' || (filter === 'selected' ? entry.dataset.selected === 'true' : entry.dataset.status === filter));
const total = Math.max(1, Math.ceil(matches.length / pageSize));
page = Math.min(page, total - 1);
entries.forEach((entry) => {
const index = matches.indexOf(entry);
entry.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
entry.classList.remove('is-filter-arriving');
if (!entry.hidden && !reduceMotion.matches) {
entry.style.setProperty('--entry-delay', `${index % pageSize * 45}ms`);
void entry.offsetWidth;
entry.classList.add('is-filter-arriving');
}
if (entry.hidden) entry.open = false;
});
pager.replaceChildren();
pager.hidden = total < 2;
for (let i = 0; i < total; i += 1) {
const button = document.createElement('button');
button.type = 'button';
button.textContent = String(i + 1).padStart(2, '0');
button.setAttribute('aria-label', `프로젝트 ${i + 1}페이지`);
if (i === page) button.setAttribute('aria-current', 'page');
button.addEventListener('click', () => { page = i; render(); });
pager.append(button);
}
if (status) status.textContent = `${matches.length}개 중 ${page * pageSize + 1}–${Math.min(matches.length, (page + 1) * pageSize)}개를 표시합니다.`;
};
controls.querySelectorAll('button').forEach((button) => {
button.addEventListener('click', () => {
filter = button.dataset.projectFilter;
page = 0;
controls.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
render();
});
});
render();
}

function initArtworkGallery() {
const grid = document.querySelector('[data-artwork-grid]');
const state = document.querySelector('[data-artwork-state]');
const count = document.querySelector('[data-artwork-count]');
const refresh = document.querySelector('[data-artwork-refresh]');
if (!grid || !state) return;
const endpoint = 'https://api.github.com/repos/FTVOT-STUDIO/FTVOT-STUDIO.github.io/contents/docs/assets/gallery?ref=main';
const cacheKey = 'ftvot-artwork-gallery-v1';
let loading = false;
const showState = (title, detail) => {
state.hidden = false;
state.querySelector('p').textContent = title;
state.querySelector('span:last-child').textContent = detail;
};
const render = (files) => {
grid.replaceChildren();
if (count) count.textContent = `ART COLLECTION / ${String(files.length).padStart(2, '0')}`;
if (!files.length) {
showState('첫 작품을 전시해 주세요.', '그림 업로드 버튼에서 작품을 올릴 수 있습니다.');
return;
}
state.hidden = true;
const fragment = document.createDocumentFragment();
files.forEach((file, i) => {
const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
const url = `./assets/gallery/${encodeURIComponent(file.name)}?v=${encodeURIComponent(file.sha)}`;
const figure = document.createElement('figure');
figure.className = 'artwork-card';
figure.style.setProperty('--art-delay', `${Math.min(i, 6) * 60}ms`);
const link = document.createElement('a');
link.className = 'artwork-frame';
link.href = url;
link.target = '_blank';
link.rel = 'noopener';
const image = document.createElement('img');
image.src = url;
image.alt = title;
image.loading = 'lazy';
image.decoding = 'async';
// 반사도 실제로 줄어든 그림 폭을 따라가야 세로 그림 옆으로 번지지 않습니다.
const syncArtWidth = () => figure.style.setProperty('--art-width', `${image.getBoundingClientRect().width}px`);
image.addEventListener('load', syncArtWidth);
new ResizeObserver(syncArtWidth).observe(image);
link.append(image);
const pending = document.createElement('span');
pending.className = 'artwork-pending';
pending.hidden = true;
pending.textContent = '배포가 끝나면 그림이 표시됩니다.';
link.append(pending);
image.addEventListener('error', () => {
figure.classList.add('is-pending');
link.setAttribute('aria-disabled', 'true');
link.tabIndex = -1;
pending.hidden = false;
});
const mirror = document.createElement('span');
mirror.className = 'image-mirror';
mirror.setAttribute('aria-hidden', 'true');
const reflection = document.createElement('img');
reflection.src = url;
reflection.alt = '';
reflection.loading = 'lazy';
mirror.append(reflection);
const caption = document.createElement('figcaption');
const number = document.createElement('span');
number.className = 'mono';
number.textContent = String(i + 1).padStart(2, '0');
const name = document.createElement('span');
// 파일명을 HTML로 삽입하지 않아 업로드한 이름이 코드로 해석되지 않습니다.
name.textContent = title;
caption.append(number, name);
figure.append(link, mirror, caption);
fragment.append(figure);
});
grid.append(fragment);
};
const load = async (force = false) => {
if (loading) return;
loading = true;
refresh.disabled = true;
let cached = null;
try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch { /* 캐시를 읽지 못해도 서버에서 불러옵니다. */ }
try {
if (!force && cached && Array.isArray(cached.files) && Date.now() - cached.time < 120000) {
render(cached.files);
return;
}
if (!grid.children.length) showState('그림을 불러오고 있습니다.', '잠시만 기다려 주세요.');
const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
if (!response.ok) throw new Error('Gallery unavailable');
const data = await response.json();
if (!Array.isArray(data)) throw new Error('Invalid gallery listing');
const files = data.filter((item) => item.type === 'file' && !/^[._]/.test(item.name) && /\.(png|jpe?g|webp|gif|avif)$/i.test(item.name)).map(({ name, sha }) => ({ name, sha })).sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
render(files);
try { sessionStorage.setItem(cacheKey, JSON.stringify({ files, time: Date.now() })); } catch { /* 저장이 막혀도 작품은 표시됩니다. */ }
} catch {
if (cached && Array.isArray(cached.files) && cached.files.length) render(cached.files);
showState('그림 목록을 새로 불러오지 못했습니다.', '잠시 후 새로고침해 주세요. 방금 올린 작품은 배포가 끝난 뒤 표시됩니다.');
} finally {
loading = false;
refresh.disabled = false;
}
};
refresh.hidden = false;
refresh.addEventListener('click', () => load(true));
// 갤러리를 열 때만 요청해 불필요한 네트워크 호출을 줄입니다.
if ('IntersectionObserver' in window) {
const observer = new IntersectionObserver((entries) => {
if (!entries.some((entry) => entry.isIntersecting)) return;
observer.disconnect();
load();
}, { rootMargin: '240px' });
observer.observe(grid.closest('section'));
} else load();
}

function initArkaReader() {
const nav = document.querySelector('.arka-nav');
if (!nav) return;
const links = [...nav.querySelectorAll('a')];
const panels = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const select = (id, move = false) => {
const chosen = panels.find((panel) => panel.id === id) || panels[0];
panels.forEach((panel) => {
panel.hidden = panel !== chosen;
panel.classList.toggle('is-reading', panel === chosen);
});
links.forEach((link) => {
if (link.hash === `#${chosen.id}`) link.setAttribute('aria-current', 'location');
else link.removeAttribute('aria-current');
});
if (move) {
window.scrollTo({ top: chosen.getBoundingClientRect().top + scrollY - TOPBAR - nav.offsetHeight - 20, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}
};
links.forEach((link) => {
link.addEventListener('click', (event) => {
event.preventDefault();
event.stopPropagation();
select(link.hash.slice(1), true);
history.replaceState(null, '', link.hash);
});
});
// JS가 실행될 때만 한 챕터씩 보여 본문을 잃지 않고 스크롤 길이를 줄입니다.
nav.classList.add('is-reader-nav');
select(location.hash.slice(1));
window.addEventListener('hashchange', () => {
if (panels.some((panel) => `#${panel.id}` === location.hash)) select(location.hash.slice(1));
});
document.querySelectorAll('.arka-sephira').forEach((details) => details.name = 'arka-sephira');
document.querySelectorAll('.arka-faction-group').forEach((details) => details.name = 'arka-factions');
}
