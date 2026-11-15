// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
// 스크롤은 브라우저 기본 스크롤을 그대로 씁니다 (관성 스크롤 라이브러리는 이질감 때문에 뺐습니다).
import { initIntro, initSky } from './intro.js?v=20261117b';
import { initCosmos } from './cosmos.js?v=20261117q';
import { initSephirot } from './sephirot.js?v=20261118c';
import { initGalleryAdmin } from './gallery-admin.js?v=20261117d';
import { initChapterScenes } from './chapter-scenes.js?v=20261117q';
// 저사양·모바일 기기 감지: 코어 4개 이하, 메모리 4GB 이하, 터치 위주 화면이면 'lite' 모드로 무거운 배경 연출을 줄입니다
const LITE = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || matchMedia('(pointer: coarse)').matches;
if (LITE) document.documentElement.classList.add('lite');

// 등장 연출용 CSS를 켭니다. JS가 실패하면 이 클래스가 없어서 내용이 전부 보입니다
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOPBAR = 56;

/** 섹션으로 부드럽게 이동 (모션 축소 설정이면 즉시) */
function scrollToEl(el) {
const top = el.id === 'tree' ? 0 : el.getBoundingClientRect().top + window.scrollY - TOPBAR;
if (window.__glideTo) window.__glideTo(top); else window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
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
// 초기 위치만 정렬하며 사용자가 이동한 뒤 늦게 다시 끌어올리지 않습니다.
}

let enhancementFailed = false;
const enhance = (init) => {
if (enhancementFailed) return;
try { init(); } catch (error) {
// 장식 기능이 실패해도 기본 HTML의 내용과 내비게이션은 남깁니다.
enhancementFailed = true;
document.documentElement.classList.remove('js', 'motion-ready');
document.documentElement.classList.add('tree-grown');
document.body.classList.remove('is-intro', 'viewer-open');
document.querySelector('[data-intro]')?.remove();
document.querySelectorAll('.arka-part, .project-entry').forEach((item) => item.hidden = false);
console.error('화면 연출을 기본 표시로 전환했습니다.', error);
}
};
enhance(initSky);
enhance(() => { if (document.querySelector('link[href*="cosmic.css"]')) initCosmos(); });
enhance(initAmbientAudio);
enhance(() => initSephirot({ scrollTo: scrollToEl }));
enhance(() => initChapterScenes());
enhance(() => initGalleryAdmin()); // 사이트에서 그림 올리기·이름 변경·삭제 // 세피라별 배경 연출 (좌우 여백에 선화로 그림)
enhance(initAnchors);
enhance(initArkaReader);
enhance(initDetails);
enhance(initPortraits);
enhance(initYear);
enhance(initPresentation);
enhance(initImageViewer);
enhance(initProjectFilters);
enhance(initArtworkGallery);
enhance(() => initIntro(() => document.documentElement.classList.add('tree-grown')));

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
// 화면 가까이에 온 장만 먼저 준비해 첫 화면의 요청 경쟁을 줄입니다.
if ('IntersectionObserver' in window) {
const near = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
entry.target.querySelectorAll('.p-idle').forEach((img) => { img.loading = 'eager'; });
near.unobserve(entry.target);
});
}, { rootMargin: '600px 0px' });
document.querySelectorAll('.chapter').forEach((section) => near.observe(section));
}
const frames = document.querySelectorAll('.orb-art, .portrait-frame');
const measure = (img) => {
if (boundsCache.has(img.currentSrc)) return boundsCache.get(img.currentSrc);
const canvas = document.createElement('canvas');
const ratio = Math.min(1, 192 / Math.max(img.naturalWidth, img.naturalHeight));
canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
const context = canvas.getContext('2d', { willReadFrequently: true });
if (!context) return null;
try {
context.drawImage(img, 0, 0, canvas.width, canvas.height);
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
const bounds = { left: left / ratio, top: top / ratio, width: (right - left + 1) / ratio, height: (bottom - top + 1) / ratio, mass: mass / (ratio * ratio), centerX: momentX / mass / ratio, centerY: momentY / mass / ratio };
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
frame.querySelectorAll('img').forEach((img) => {
img.addEventListener('load', fit);
// 일시적인 전송 실패는 한 번만 다시 요청하며 대기 프레임은 숨기지 않습니다.
img.addEventListener('error', () => {
if (img.dataset.retried) return;
img.dataset.retried = 'true';
const source = new URL(img.getAttribute('src'), location.href);
source.searchParams.set('retry', '1');
img.src = source.href;
}, { once: true });
});
new ResizeObserver(fit).observe(frame);
fit();
});
}


function initPresentation() {
let pending = false;
const progress = () => {
const range = document.documentElement.scrollHeight - innerHeight;
document.documentElement.style.setProperty('--reading-progress', String(range > 0 ? scrollY / range : 0));
pending = false;
};
const scheduleProgress = () => {
if (pending) return;
pending = true;
requestAnimationFrame(progress);
};
window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress);
new ResizeObserver(scheduleProgress).observe(document.body);
progress();
const syncVisibility = () => document.documentElement.classList.toggle('is-page-hidden', document.hidden);
document.addEventListener('visibilitychange', syncVisibility);
syncVisibility();
// 이미 지난 구간에서는 보이지 않는 궤도와 장식의 연산을 멈춥니다.
const motionObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
}, { rootMargin: '200px 0px' });
document.querySelectorAll('.chapter, .hero-tree').forEach((section) => motionObserver.observe(section));
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
const gap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 0;
const amount = card ? card.getBoundingClientRect().width + gap : gallery.clientWidth;
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
let galleryLinks = [], current = 0, trigger = null, imageAnimation = null;
const render = () => {
const link = galleryLinks[current];
image.src = link.href;
image.alt = link.querySelector('img').alt;
caption.textContent = image.alt;
count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(galleryLinks.length).padStart(2, '0')}`;
dialog.querySelector('[data-viewer-prev]').disabled = galleryLinks.length < 2;
dialog.querySelector('[data-viewer-next]').disabled = galleryLinks.length < 2;
imageAnimation?.cancel();
if (!reduceMotion.matches) imageAnimation = image.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
};
const step = (direction) => { if (!galleryLinks.length) return; current = (current + direction + galleryLinks.length) % galleryLinks.length; render(); };
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('.project-gallery figure > a, .artwork-grid .artwork-card > a') : null;
if (!link || dialog.open) return;
if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
event.preventDefault();
galleryLinks = [...link.closest('.project-gallery, .artwork-grid').querySelectorAll('figure > a')].filter((item) => item.getAttribute('aria-disabled') !== 'true');
current = galleryLinks.indexOf(link);
if (current < 0) return;
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
imageAnimation?.cancel();
image.removeAttribute('src');
galleryLinks = [];
trigger = null;
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
if (!entry.hidden) entry.style.setProperty('--entry-delay', `${index % pageSize * 45}ms`);
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
if (status) status.textContent = `${matches.length}개 중 ${matches.length ? page * pageSize + 1 : 0}–${Math.min(matches.length, (page + 1) * pageSize)}개를 표시합니다.`;
if (!reduceMotion.matches) {
void controls.offsetWidth;
entries.filter((entry) => !entry.hidden).forEach((entry) => entry.classList.add('is-filter-arriving'));
}
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
const cacheKey = 'ftvot-artwork-gallery-v3'; // 파일명 정규화 후 예전 목록 캐시를 버립니다
const validFile = (file) => file && typeof file.name === 'string' && file.name.length <= 255 && !/^[._]/.test(file.name) && !/[\\/\u0000-\u001f]/.test(file.name) && /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name) && typeof file.sha === 'string' && /^[a-f0-9]{40,64}$/i.test(file.sha);
const artObserver = new ResizeObserver((entries) => {
entries.forEach(({ target }) => {
const width = `${target.getBoundingClientRect().width}px`;
const figure = target.closest('.artwork-card');
if (figure && figure.style.getPropertyValue('--art-width') !== width) figure.style.setProperty('--art-width', width);
});
});
let loading = false;
const showState = (title, detail) => {
state.hidden = false;
state.querySelector('p').textContent = title;
state.querySelector('span:last-child').textContent = detail;
};
const render = (files) => {
files = files.filter(validFile);
artObserver.disconnect();
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
link.rel = 'noopener noreferrer';
const image = document.createElement('img');
// 목록에는 가벼운 썸네일(thumbs/이름.webp)을 쓰고, 없으면 원본으로 대신합니다. 누르면 원본이 열립니다
const thumb = `./assets/gallery/thumbs/${encodeURIComponent(file.name.replace(/\.[^.]+$/, ''))}.webp?v=${encodeURIComponent(file.sha)}`;
image.src = thumb;
image.addEventListener('error', () => { if (image.src.includes('/thumbs/')) image.src = url; }, { once: true });
image.alt = title;
image.loading = 'lazy';
image.decoding = 'async';
// 반사도 실제로 줄어든 그림 폭을 따라가야 세로 그림 옆으로 번지지 않습니다.
artObserver.observe(image);
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
reflection.src = thumb;
reflection.addEventListener('error', () => { reflection.src = url; }, { once: true });
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
const controller = new AbortController();
const timeout = window.setTimeout(() => controller.abort(), 12000);
try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch { /* 캐시를 읽지 못해도 서버에서 불러옵니다. */ }
try {
if (!force && cached && Array.isArray(cached.files) && Number.isFinite(cached.time) && Date.now() >= cached.time && Date.now() - cached.time < 120000) {
render(cached.files);
return;
}
if (!grid.children.length) showState('그림을 불러오고 있습니다.', '잠시만 기다려 주세요.');
const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
if (!response.ok) throw new Error('Gallery unavailable');
const data = await response.json();
if (!Array.isArray(data)) throw new Error('Invalid gallery listing');
const files = data.filter((item) => item && item.type === 'file' && validFile(item)).map(({ name, sha }) => ({ name, sha })).sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
render(files);
try { sessionStorage.setItem(cacheKey, JSON.stringify({ files, time: Date.now() })); } catch { /* 저장이 막혀도 작품은 표시됩니다. */ }
} catch {
if (cached && Array.isArray(cached.files) && cached.files.length) render(cached.files);
showState('그림 목록을 새로 불러오지 못했습니다.', '잠시 후 새로고침해 주세요. 방금 올린 작품은 배포가 끝난 뒤 표시됩니다.');
} finally {
window.clearTimeout(timeout);
loading = false;
refresh.disabled = false;
}
};
refresh.hidden = false;
refresh.addEventListener('click', () => load(true));
document.addEventListener('gallery:changed', () => load(true)); // 관리 창에서 바꾸면 목록을 바로 다시 불러옵니다
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


function initAmbientAudio() {
const button = document.querySelector('[data-music-toggle]');
if (!button) return;
// 긴 곡을 PCM으로 전부 풀지 않고 브라우저의 미디어 스트림으로 재생합니다.
const audio = new Audio();
audio.preload = 'none';
audio.loop = true;
// 배경음은 볼륨 변화 없이 작은 소리로 계속 반복합니다.
audio.volume = 0.3; // 배경음 (예전 0.08은 거의 안 들려서 올림)
let enabled = true;
try { enabled = localStorage.getItem('ambient-music') !== 'off'; } catch {}
const sync = () => {
const playing = !audio.paused && !audio.ended;
button.setAttribute('aria-pressed', String(playing));
button.classList.toggle('is-playing', playing);
button.querySelector('[data-music-label]').textContent = playing ? '배경음 끄기' : '배경음 켜기';
button.title = playing ? '배경음 끄기' : '배경음 켜기'; // 아이콘 버튼이라 마우스를 올리면 설명이 보이게
};
const stop = () => {
audio.pause();
sync();
};
const start = () => {
if (!enabled || document.hidden || !audio.paused) return;
// 첫 화면이 먼저 준비되도록 실제 재생 직전까지 음원 요청을 미룹니다.
if (!audio.getAttribute('src')) audio.src = './assets/space-ambient.mp3';
audio.play().then(() => {
if (!enabled || document.hidden) { stop(); return; }
sync();
}).catch(sync);
};
const unlock = (event) => {
if (event.target instanceof Element && event.target.closest('[data-music-toggle]')) return;
start();
};
document.addEventListener('pointerdown', unlock, { passive: true });
document.addEventListener('keydown', unlock);
button.addEventListener('click', () => {
// 자동 재생 대기 상태에서는 첫 클릭을 재생 요청으로 해석합니다.
enabled = audio.paused;
try { localStorage.setItem('ambient-music', enabled ? 'on' : 'off'); } catch {}
if (enabled) start(); else stop();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
window.addEventListener('pagehide', stop);
audio.addEventListener('play', sync);
audio.addEventListener('pause', sync);
audio.addEventListener('error', () => { stop(); button.hidden = true; });
sync();
const afterLoad = () => {
const idle = window.requestIdleCallback || ((run) => setTimeout(run, 0));
idle(() => {
document.querySelectorAll('[data-font-styles]').forEach((link) => { link.media = 'all'; });
start();
});
};
if (document.readyState === 'complete') afterLoad();
else window.addEventListener('load', afterLoad, { once: true });
}


// 클릭 위치 파동 (이전 버전 복원): 마우스로 누른 자리에 원이 퍼지며 사라집니다. 최대 3개만 유지합니다
(() => {
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('pointerdown', (event) => {
if (!fine.matches || reduce.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
const ripples = document.querySelectorAll('.pointer-ripple');
if (ripples.length >= 3) ripples[0].remove();
const ripple = document.createElement('span');
ripple.className = 'pointer-ripple';
ripple.setAttribute('aria-hidden', 'true');
ripple.style.left = `${event.clientX}px`;
ripple.style.top = `${event.clientY}px`;
document.body.append(ripple);
const animation = ripple.animate([{ opacity: 0.55, transform: 'translate(-50%, -50%) scale(0.12)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1)' }], { duration: 700, easing: 'ease-out' });
animation.onfinish = () => ripple.remove();
}, { passive: true });
})();

// 세피라 바로가기 이동: 링크를 누르면 입력을 잠그고 애플식 쫀득한 곡선으로 목표 위치까지 미끄러집니다 (스크롤로는 실행되지 않음)
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let gliding = false;
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

const block = (event) => { if ((gliding || holding()) && event.cancelable) event.preventDefault(); };
window.addEventListener('wheel', block, { passive: false, capture: true });
window.addEventListener('touchmove', block, { passive: false, capture: true });
window.addEventListener('keydown', (event) => { if ((gliding || holding()) && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar', 'Home', 'End'].includes(event.key)) event.preventDefault(); }, { capture: true });
const glideTo = (to) => {
gliding = true;
const from = scrollY, start = performance.now();
const duration = Math.min(1700, Math.max(900, 700 + Math.sqrt(Math.abs(to - from)) * 12)); // 먼 거리도 지루하지 않게
const step = (now) => {
const x = Math.min(1, (now - start) / duration);
scrollTo(0, Math.round(from + (to - from) * silky(x)));
if (x < 1) requestAnimationFrame(step); else { gliding = false; holdFor(500); }
};
requestAnimationFrame(step);
};
window.__glideTo = (top) => { if (reduce.matches) { scrollTo(0, top); return; } if (!gliding) glideTo(top); };
})();

// 펼침 목록(details)을 열면, 펼침 애니메이션이 끝난 뒤 부드럽게 미끄러지며 내용을 화면에 맞춰 줍니다.
// 내용이 화면보다 길면 제목을 상단바 아래에, 짧으면 끝까지 보이는 만큼만 내립니다
(() => {
const TOP_GAP = 76, BOTTOM_GAP = 28;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let anim = 0;
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const glide = (delta) => {
cancelAnimationFrame(anim);
if (reduce.matches) { scrollBy(0, delta); return; }
const from = scrollY, start = performance.now(), dur = Math.min(900, 420 + Math.abs(delta) * .5);
const step = (now) => { const k = Math.min(1, (now - start) / dur); scrollTo(0, Math.round(from + delta * ease(k))); if (k < 1) anim = requestAnimationFrame(step); };
anim = requestAnimationFrame(step);
};
const reveal = (item) => {
const rect = item.getBoundingClientRect();
const room = innerHeight - TOP_GAP - BOTTOM_GAP;
let delta = 0;
if (rect.height > room || rect.top < TOP_GAP) delta = rect.top - TOP_GAP;
else if (rect.bottom > innerHeight - BOTTOM_GAP) delta = rect.bottom - (innerHeight - BOTTOM_GAP);
if (Math.abs(delta) > 4) glide(delta);
};
document.addEventListener('toggle', (event) => {
const item = event.target;
if (!(item instanceof HTMLDetailsElement) || !item.open) return;
// 펼쳐지는 동작이 끝난 뒤(약 0.45초) 한 번만 맞춥니다. 늦게 뜨는 그림으로 높이가 바뀌면 한 번 더 살짝 맞춥니다
setTimeout(() => { if (item.open) reveal(item); }, 450);
setTimeout(() => { if (item.open) reveal(item); }, 1500);
}, true);
})();


// 주소창 해시를 현재 위치에 맞춥니다: 첫 화면(나무, 활성·비활성 모두)에서는 #main, 그 아래에서는 보고 있는 세피라 장(#kether 등)
(() => {
const hero = document.getElementById('tree');
const chapters = [...document.querySelectorAll('section.chapter[id]')];
if (!hero || !chapters.length) return;
let frame = 0, current = location.hash;
const sync = () => {
frame = 0;
const mid = innerHeight * 0.5;
let next = '#main';
if (chapters[0].getBoundingClientRect().top < mid) { for (const ch of chapters) { if (ch.getBoundingClientRect().top < mid) next = `#${ch.id}`; else break; } }
if (next !== current) { current = next; history.replaceState(history.state, '', `${location.pathname}${location.search}${next}`); }
};
addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(sync); }, { passive: true });
sync();
})();

// ── 연출 보강 ─────────────────────────────────────────────
// 1) 장 제목이 처음 보일 때 아래에서 위로 '걷히듯' 드러납니다
// 2) 기록 숫자(출시·완성작 등)가 보일 때 0부터 올라갑니다
// 3) 연대기 항목이 하나씩 차례로 나타납니다
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) return;
const once = (els, onShow, margin = '0px 0px -12% 0px') => {
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); onShow(e.target); } }), { rootMargin: margin });
els.forEach((el) => io.observe(el));
};
const statements = [...document.querySelectorAll('.chapter-statement')];
statements.forEach((el) => el.classList.add('fx-wipe'));
once(statements, (el) => el.classList.add('is-shown'));
const numbers = [...document.querySelectorAll('.bi-stats dd')];
once(numbers, (el) => {
const target = parseInt(el.textContent, 10); if (!Number.isFinite(target)) return;
const start = performance.now(), dur = 900 + target * 60;
const step = (now) => { const k = Math.min(1, (now - start) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3))); el.textContent = String(v); if (k < 1) requestAnimationFrame(step); };
el.textContent = '0'; requestAnimationFrame(step);
});
const rings = [...document.querySelectorAll('.bi-rings li')];
rings.forEach((el, i) => { el.classList.add('fx-rise'); el.style.transitionDelay = `${i * 90}ms`; });
once(rings, (el) => el.classList.add('is-shown'));
})();
