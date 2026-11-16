// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
// 스크롤은 브라우저 기본 스크롤을 그대로 씁니다 (관성 스크롤 라이브러리는 이질감 때문에 뺐습니다).
import { initIntro, initSky } from './intro.js?v=20261120a';
import { initCosmos } from './cosmos.js?v=20261117q';
import { initSephirot } from './sephirot.js?v=20261120g';
import { initGalleryAdmin } from './gallery-admin.js?v=20261119d';
import { initGames } from './games.js?v=20261118a';
import { initGameAdmin } from './game-admin.js?v=20261118d';
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
const resolve = () => (el.id === 'tree' ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - TOPBAR));
const top = resolve();
if (window.__glideTo) window.__glideTo(top, resolve); else window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
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
enhance(() => initGalleryAdmin()); enhance(() => initGames()); enhance(() => initGameAdmin()); // 사이트에서 그림 올리기·이름 변경·삭제 // 세피라별 배경 연출 (좌우 여백에 선화로 그림)
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
dialog.innerHTML = '<div class="viewer-toolbar"><span class="mono" data-viewer-count></span><button type="button" data-viewer-close aria-label="확대 보기 닫기">닫기 <span aria-hidden="true">×</span></button></div><div class="viewer-stage"><button type="button" data-viewer-prev aria-label="이전 이미지">←</button><img alt=""><button type="button" data-viewer-next aria-label="다음 이미지">→</button></div><p class="viewer-caption"></p>';
document.body.append(dialog);
const image = dialog.querySelector('img');
const caption = dialog.querySelector('.viewer-caption');
const count = dialog.querySelector('[data-viewer-count]');
let galleryLinks = [], current = 0, trigger = null, imageAnimation = null, viewingArt = false;
const render = () => {
const link = galleryLinks[current];
image.src = link.href;
image.alt = link.alt;
caption.textContent = image.alt;
count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(galleryLinks.length).padStart(2, '0')}`;
dialog.querySelector('[data-viewer-prev]').disabled = galleryLinks.length < 2;
dialog.querySelector('[data-viewer-next]').disabled = galleryLinks.length < 2;
imageAnimation?.cancel();
if (!reduceMotion.matches && !slideDir) imageAnimation = image.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
setTimeout(() => preloadAround(), 0);
};
/* 이전/다음: 지금 그림은 옆으로 밀려 나가고 새 그림이 반대쪽에서 미끄러져 들어오는 슬라이더 */
let slideDir = 0;
const SLIDE = { duration: 420, easing: 'cubic-bezier(.22, .8, .2, 1)' };
const step = (direction) => {
if (!galleryLinks.length) return;
current = (current + direction + galleryLinks.length) % galleryLinks.length;
if (reduceMotion.matches) { render(); return; }
const stage = image.parentElement, box = image.getBoundingClientRect(), sb = stage.getBoundingClientRect();
const ghost = image.cloneNode(); ghost.removeAttribute('data-viewer-image'); ghost.className = 'viewer-ghost';
Object.assign(ghost.style, { left: `${box.left - sb.left}px`, top: `${box.top - sb.top}px`, width: `${box.width}px`, height: `${box.height}px` });
stage.append(ghost);
const dist = Math.min(sb.width * .6, 420);
ghost.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-direction * dist}px)`, opacity: 0 }], SLIDE).finished.finally(() => ghost.remove());
/* 새 그림이 다 받아진 뒤에 들어오게: 받는 동안 예전 그림이 비치지 않도록 숨겨 두고, 준비되면 미끄러져 들어옵니다 */
const next = loadImg(galleryLinks[current].href);
image.style.opacity = '0';
slideDir = direction; render(); slideDir = 0;
const token = ++slideToken;
const enter = () => { if (token !== slideToken) return; image.style.opacity = ''; dialog.classList.remove('is-loading');
imageAnimation = image.animate([{ transform: `translateX(${direction * dist * .6}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], SLIDE); };
if (next.complete && next.naturalWidth) enter(); else { dialog.classList.add('is-loading'); next.decode().then(enter, enter); }
};
/* 미리 받기: 보고 있는 그림의 앞뒤 2장씩을 미리 받아 두어 넘길 때 바로 보이게 합니다 */
const imgCache = new Map(); let slideToken = 0;
const loadImg = (href) => { let im = imgCache.get(href); if (!im) { im = new Image(); im.decoding = 'async'; im.src = href; imgCache.set(href, im); if (imgCache.size > 30) imgCache.delete(imgCache.keys().next().value); } return im; };
const preloadAround = () => { const n = galleryLinks.length; [1, -1, 2, -2].forEach((d) => { if (n > 1) loadImg(galleryLinks[(current + d + n) % n].href); }); };
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('.project-gallery figure > a, .artwork-grid .artwork-card > a') : null;
if (!link || dialog.open) return;
if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
event.preventDefault();
/* 갤러리 그림은 지금 페이지뿐 아니라 모든 페이지의 그림을 이전/다음으로 넘겨 볼 수 있게 전체 목록을 씁니다 */
const isArt = !!link.closest('.artwork-grid');
galleryLinks = isArt && window.__artworkItems ? window.__artworkItems() : [...link.closest('.project-gallery, .artwork-grid').querySelectorAll('figure > a')].filter((item) => item.getAttribute('aria-disabled') !== 'true').map((a) => ({ href: a.href, alt: a.querySelector('img')?.alt || '' }));
current = galleryLinks.findIndex((item) => item.href === link.href);
viewingArt = isArt;
if (current < 0) return;
trigger = link;
render();
dialog.showModal();
document.body.classList.add('viewer-open');
});
dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
/* 확대 보기에서 다른 페이지 그림까지 넘겨 봤다면, 닫을 때 갤러리도 그 그림이 있는 페이지로 맞춥니다 */
dialog.addEventListener('close', () => { if (viewingArt) window.__artworkGoto?.(current); });
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
/* 갤러리 페이지: 한 페이지에 9점(3×3). 9점을 넘으면 그리드 아래 이전/다음 버튼과 쪽수로 넘깁니다 */
const PER_PAGE = 9; let page = 0, allFiles = [];
const pager = document.createElement('nav'); pager.className = 'art-pager'; pager.setAttribute('aria-label', '갤러리 페이지'); pager.hidden = true;
pager.innerHTML = '<button type="button" data-art-page="-1" aria-label="이전 페이지">←</button><span class="mono" data-art-pos>1 / 1</span><button type="button" data-art-page="1" aria-label="다음 페이지">→</button>';
grid.after(pager);
pager.addEventListener('click', (e) => { const b = e.target instanceof Element ? e.target.closest('[data-art-page]') : null; if (!b) return;
const dir = Number(b.dataset.artPage), pages = Math.ceil(allFiles.length / PER_PAGE); if (turning || pages < 2) return; turning = true;
/* 페이지 넘김: 지금 그림들이 넘기는 방향으로 살짝 밀리며 흐려지고, 새 그림들이 반대쪽에서 들어옵니다 (높이는 고정해 아래 내용이 튀지 않게) */
const h0 = grid.offsetHeight; grid.style.height = `${h0}px`; grid.dataset.turn = dir > 0 ? 'out-next' : 'out-prev';
setTimeout(() => { page = (page + dir + pages) % pages; render(allFiles, true); grid.dataset.turn = dir > 0 ? 'in-next' : 'in-prev';
/* 높이도 부드럽게: 새 페이지의 실제 높이를 재고, 예전 높이에서 그 높이로 0.5초 동안 늘이거나 줄여 아래 장(네차흐)이 휙 올라오지 않게 */
grid.style.height = 'auto'; const h1 = grid.offsetHeight; grid.style.height = `${h0}px`; void grid.offsetHeight;
/* 순서: 줄어들 때는 그림이 먼저 자리 잡은 뒤(0.4초) 높이가 줄어 아래 장이 따라 올라오고, 늘어날 때는 공간을 먼저 벌린 뒤 그림이 들어옵니다 */
const shrink = h1 < h0, hDelay = shrink ? .4 : 0, inDelay = shrink ? 0 : .35;
grid.style.transition = `height .5s cubic-bezier(.22, .8, .2, 1) ${hDelay}s, opacity .3s ease ${inDelay}s, translate .4s cubic-bezier(.16, 1, .3, 1) ${inDelay}s`; grid.style.height = `${h1}px`;
requestAnimationFrame(() => requestAnimationFrame(() => { grid.dataset.turn = ''; setTimeout(() => { grid.style.height = ''; grid.style.transition = ''; turning = false; }, 950); }));
/* 그리드 윗부분이 화면 위로 지나가 있을 때만 그리드 시작점으로 부드럽게 올려 줍니다 */
const top = grid.getBoundingClientRect().top; if (top < 80) { const y = top + scrollY - 120; if (window.__glideTo) window.__glideTo(y); else scrollTo({ top: y, behavior: 'smooth' }); } }, 220); });
let turning = false;
const artHref = (f) => `https://raw.githubusercontent.com/FTVOT-STUDIO/FTVOT-STUDIO.github.io/main/docs/assets/gallery/${encodeURIComponent(f.name)}?v=${encodeURIComponent(f.sha)}`;
window.__artworkItems = () => allFiles.map((f) => ({ href: artHref(f), alt: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }));
window.__artworkGoto = (idx) => { const target = Math.floor(idx / PER_PAGE); if (target !== page && target >= 0) { page = target; render(allFiles, true); } };
/* 방금 올린 그림: 목록 API가 늦게 갱신돼도 10분 동안은 바로 보이게 합쳐 둡니다 */
const withExtras = (files) => { let extra = []; try { extra = JSON.parse(sessionStorage.getItem('ftvot-gallery-extra') || '[]').filter((x) => x && typeof x.name === 'string' && Date.now() - (x.time || 0) < 600000); } catch { /* 없음 */ }
const names = new Set(files.map((f) => f.name)); return [...files, ...extra.filter((x) => !names.has(x.name)).map(({ name, sha }) => ({ name, sha: String(sha) }))].sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true })); };
const render = (files, keepPage = false) => {
files = withExtras(files.filter(validFile)).filter(validFile);
allFiles = files;
const pages = Math.max(1, Math.ceil(files.length / PER_PAGE)); if (!keepPage) page = Math.min(page, pages - 1);
artObserver.disconnect();
grid.replaceChildren();
if (count) count.textContent = `ART COLLECTION / ${String(files.length).padStart(2, '0')}`;
pager.hidden = pages <= 1; pager.querySelector('[data-art-pos]').textContent = `${page + 1} / ${pages}`;
if (!files.length) {
showState('첫 작품을 전시해 주세요.', '‘그림 올리기’ 버튼으로 작품을 올릴 수 있습니다.');
return;
}
state.hidden = true;
const fragment = document.createDocumentFragment();
const offset = page * PER_PAGE;
files.slice(offset, offset + PER_PAGE).forEach((file, j) => { const i = offset + j;
const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
const url = `https://raw.githubusercontent.com/FTVOT-STUDIO/FTVOT-STUDIO.github.io/main/docs/assets/gallery/${encodeURIComponent(file.name)}?v=${encodeURIComponent(file.sha)}`;
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
const thumb = `https://raw.githubusercontent.com/FTVOT-STUDIO/FTVOT-STUDIO.github.io/main/docs/assets/gallery/thumbs/${encodeURIComponent(file.name.replace(/\.[^.]+$/, ''))}.webp?v=${encodeURIComponent(file.sha)}`;
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
/* 배포 대기 표시: 막 올린 그림은 사이트 배포(보통 1~2분)가 끝나야 열립니다. 예상 진행률(퍼센트+막대)을 보여 주고,
   4초마다 실제로 열리는지 확인해 열리는 즉시 그림으로 바꿉니다 */
pending.innerHTML = '<span class="ap-label">사이트에 반영하는 중</span><span class="ap-pct mono">000%</span><span class="ap-track"><span class="ap-fill"></span></span>';
link.append(pending);
let waiting = false, fails = 0;
image.addEventListener('error', () => {
fails += 1; if (waiting || fails < 2) return; /* 첫 실패는 썸네일→원본 전환 중이라 아직 대기 아님. 원본까지 없으면 배포 대기 */
waiting = true;
figure.classList.add('is-pending');
link.setAttribute('aria-disabled', 'true');
link.tabIndex = -1;
pending.hidden = false;
let since = Date.now(); try { since = Number(sessionStorage.getItem('ftvot-deploy-start')) || since; } catch { /* 저장소 없음 */ }
const pct = pending.querySelector('.ap-pct'), fill = pending.querySelector('.ap-fill');
const est = () => { const f = .95 * (1 - Math.exp(-(Date.now() - since) / 40000)); pct.textContent = `${String(Math.round(f * 100)).padStart(3, '0')}%`; fill.style.transform = `scaleX(${f})`; };
est(); const anim = setInterval(est, 500);
const probe = setInterval(() => { const t = new Image(); t.onload = () => { clearInterval(probe); clearInterval(anim); pct.textContent = '100%'; fill.style.transform = 'scaleX(1)';
setTimeout(() => { image.src = t.src; reflection.src = t.src; figure.classList.remove('is-pending'); link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); pending.hidden = true; }, 300); };
t.src = `${url}&r=${Date.now()}`; }, 4000);
setTimeout(() => clearInterval(probe), 300000);
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
/* 첫 클릭 직후 바로 들리도록: 화면이 준비된 뒤(유휴 시간) GitHub Pages에서 음원을 미리 받아 둡니다. Cloudflare 경로는 한국에서 매우 느림 */
const SRC = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? './assets/space-ambient.mp3' : 'https://ftvot-studio.github.io/assets/space-ambient.mp3';
(window.requestIdleCallback || ((fn) => setTimeout(fn, 1500)))(() => { if (!audio.getAttribute('src')) { audio.preload = 'auto'; audio.src = SRC; audio.load(); } }, { timeout: 2500 });
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
if (!audio.getAttribute('src')) audio.src = SRC;
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
/* 목적지 추적 글라이드: 이동하는 동안 그림이 늦게 뜨거나 위쪽 내용 높이가 바뀌어도 매 프레임 목적지를 다시 재서 정확히 도착합니다.
   새로 누르면 진행 중인 이동을 이어받아 바로 새 목적지로 갑니다. 이동 중에는 나무·클리포트의 스크롤 잠금이 끼어들지 않도록 표시합니다 */
let glideRaf = 0;
const glideTo = (to, resolve) => {
cancelAnimationFrame(glideRaf);
gliding = true; window.__navGliding = true;
const from = scrollY, start = performance.now();
const dest = () => (resolve ? resolve() : to);
const duration = Math.min(1700, Math.max(900, 700 + Math.sqrt(Math.abs(dest() - from)) * 12)); // 먼 거리도 지루하지 않게
const step = (now) => {
const x = Math.min(1, (now - start) / duration), target = dest();
scrollTo(0, Math.round(from + (target - from) * silky(x)));
if (x < 1) { glideRaf = requestAnimationFrame(step); return; }
/* 도착 후 한 번 더 확인: 마지막 순간 레이아웃이 바뀌었으면 짧게 보정 */
const off = dest() - scrollY;
if (Math.abs(off) > 4 && resolve && !step.fixed) { step.fixed = true; const f0 = scrollY, t0 = performance.now(); const fix = (n) => { const k = Math.min(1, (n - t0) / 260); scrollTo(0, Math.round(f0 + (dest() - f0) * silky(k))); if (k < 1) glideRaf = requestAnimationFrame(fix); else done(); }; glideRaf = requestAnimationFrame(fix); return; }
done();
};
const done = () => { gliding = false; holdFor(500); setTimeout(() => { if (!gliding) window.__navGliding = false; }, 520); };
glideRaf = requestAnimationFrame(step);
};
/* top: 숫자, resolve: 매 프레임 목적지를 다시 계산하는 함수(선택) */
window.__glideTo = (top, resolve) => { if (reduce.matches) { scrollTo(0, resolve ? resolve() : top); return; } glideTo(top, resolve); };
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
const reveal = (item, predict) => {
const r = item.getBoundingClientRect();
// predict: 펼침 애니메이션이 끝났을 때의 높이(scrollHeight)로 미리 계산해, 펼쳐지는 것과 동시에 스크롤을 시작합니다
const rect = predict ? { top: r.top, height: item.scrollHeight, bottom: r.top + item.scrollHeight } : r;
const room = innerHeight - TOP_GAP - BOTTOM_GAP;
let delta = 0;
if (rect.height > room || rect.top < TOP_GAP) delta = rect.top - TOP_GAP;
else if (rect.bottom > innerHeight - BOTTOM_GAP) delta = rect.bottom - (innerHeight - BOTTOM_GAP);
if (Math.abs(delta) > 4) glide(delta);
};
document.addEventListener('toggle', (event) => {
const item = event.target;
if (!(item instanceof HTMLDetailsElement) || !item.open) return;
// 펼침과 동시에 최종 높이 기준으로 바로 미끄러지고, 늦게 뜨는 그림으로 높이가 바뀐 경우만 나중에 살짝 보정합니다
requestAnimationFrame(() => { if (item.open) reveal(item, true); });
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
/* 클리포트 아래로 넘어가면 #qliphoth, 열린 껍질 장에 닿으면 그 껍질(#q-thaumiel 등) */
const q = document.getElementById('qliphoth');
if (q && q.getBoundingClientRect().top < mid) { next = '#qliphoth'; for (const el of q.querySelectorAll('.q-card[id]')) if (el.getBoundingClientRect().top < mid) next = `#${el.id}`; }
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
/* 장 제목 와이프 연출은 요청으로 제거했습니다 */
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

// 첫 진입 속도: 인트로가 도는 동안(사용자가 아직 아무것도 안 하는 시간) 효과음과 세피라 그림을 미리 받아 둡니다.
// 브라우저 캐시에 들어가 두면, 나무를 깨우거나 장에 들어갈 때 소리와 그림이 바로 나옵니다
(() => {
const ids = ['kether', 'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth'];
const sounds = ['./assets/tree-on.mp3?v=2', './assets/tree-off.mp3?v=2', './assets/node-lit.mp3', './assets/path-trace.mp3?v=2', './assets/nav-jump.mp3?v=2', './assets/q-enter.mp3?v=3', './assets/q-exit.mp3', './assets/q-jump.mp3', ...ids.map((id) => `./assets/sfx/${id}.mp3`)];
const images = ids.flatMap((id) => [`https://ftvot-studio.github.io/assets/sephirot/${id}-0.webp`, `https://ftvot-studio.github.io/assets/sephirot/${id}-1.webp`]); /* 그림은 GitHub Pages에서: 한국에서 Cloudflare보다 수백 배 빠름 */
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
const saveData = navigator.connection?.saveData;
/* 미리받기 진행률을 window.__preloadFrac(0~1)로 내보내 인트로의 퍼센트·막대가 실제 준비 상황을 따르게 합니다 */
const total = sounds.length + (saveData ? 0 : images.length); let done = 0;
window.__preloadFrac = 0; const tick = () => { done += 1; window.__preloadFrac = done / total; };
idle(() => {
// 데이터 절약 모드에서는 소리만 미리 받고 그림은 필요할 때 받습니다
sounds.forEach((src) => fetch(src, { cache: 'force-cache', credentials: 'same-origin' }).then((r) => r.arrayBuffer()).catch(() => {}).finally(tick));
if (!saveData) images.forEach((src, i) => setTimeout(() => { const img = new Image(); img.decoding = 'async'; img.onload = img.onerror = tick; img.src = src; }, i * 40));
}, { timeout: 300 });
})();

/* 클리포트 하강 연출: 섹션이 가까워질수록 화면을 붉게 덮고, 충분히 들어오면 균열·나무를 깨웁니다 */
(() => {
const sec = document.getElementById('qliphoth'); if (!sec) return;
const veil = document.createElement('div'); veil.className = 'q-veil'; veil.setAttribute('aria-hidden', 'true'); document.body.append(veil);
let raf = 0;
const update = () => { raf = 0; const r = sec.getBoundingClientRect(), h = innerHeight;
/* 섹션 윗변이 화면 아래 → 화면 30% 지점으로 오는 동안 0 → 1 */
const p = Math.min(1, Math.max(0, (h - r.top) / (h * 0.7)));
document.documentElement.style.setProperty('--qd', p.toFixed(3));
};
addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
update();
})();

/* 클리포트 연출 2: 재(灰) 입자 캔버스, 타우미엘에서 경로를 타고 퍼지는 핏빛 신호, 잠긴 껍질의 글리치 */
(() => {
const sec = document.getElementById('qliphoth'); if (!sec) return;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, lite = document.documentElement.classList.contains('lite');
/* 1) 재 입자: 아래에서 위로 천천히 떠오르며 흔들림. 화면에 보일 때만 돌립니다 */
const cv = document.createElement('canvas'); cv.className = 'q-ash'; cv.setAttribute('aria-hidden', 'true'); sec.prepend(cv);
const ctx = cv.getContext('2d'); let W = 0, H = 0, parts = [], run = false, last = 0;
const N = lite ? 40 : 110;
const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); W = sec.clientWidth; H = sec.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
const spawn = (any) => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, r: Math.random() * 1.8 + .4, v: Math.random() * 18 + 8, ph: Math.random() * 6.28, hot: Math.random() < .25 });
const frame = (t) => { if (!run) return; const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; ctx.clearRect(0, 0, W, H);
for (const p of parts) { p.y -= p.v * dt; p.ph += dt; p.x += Math.sin(p.ph) * .3; if (p.y < -10) Object.assign(p, spawn(false));
const a = Math.min(1, p.y / H + .1) * (p.hot ? .8 : .35); ctx.fillStyle = p.hot ? `rgba(255,110,90,${a})` : `rgba(200,190,190,${a * .6})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
requestAnimationFrame(frame); };
if (!reduce) { resize(); parts = Array.from({ length: N }, () => spawn(true)); addEventListener('resize', resize, { passive: true });
new IntersectionObserver(([e]) => { if (e.isIntersecting && !run) { run = true; last = performance.now(); requestAnimationFrame(frame); } else if (!e.isIntersecting) run = false; }).observe(sec); }
/* 2) 핏빛 신호: 타우미엘(1번)과 이어진 경로부터 바깥으로, 경로 위를 붉은 점이 흐릅니다 */
const svg = sec.querySelector('.q-tree'), paths = sec.querySelector('.q-paths');
if (svg && paths && !reduce) {
const NS = 'http://www.w3.org/2000/svg', lines = [...paths.querySelectorAll('line')];
/* 경로 그리기 준비: 각 선의 실제 길이와, 타우미엘에서 아래로 퍼지는 순서대로 지연을 줍니다 */
lines.forEach((l) => { const len = Math.hypot(l.getAttribute('x2') - l.getAttribute('x1'), l.getAttribute('y2') - l.getAttribute('y1')); const top = Math.min(Number(l.getAttribute('y1')), Number(l.getAttribute('y2')));
l.style.setProperty('--plen', len.toFixed(1)); l.style.setProperty('--pdl', `${(top / 636 * 1.4).toFixed(2)}s`); });
lines.forEach((l, i) => { const s = document.createElementNS(NS, 'line'); for (const k of ['x1', 'y1', 'x2', 'y2']) s.setAttribute(k, l.getAttribute(k));
const len = Math.hypot(l.getAttribute('x2') - l.getAttribute('x1'), l.getAttribute('y2') - l.getAttribute('y1'));
s.setAttribute('class', 'q-signal'); s.style.setProperty('--len', len.toFixed(0)); s.style.animationDelay = `${(Number(l.getAttribute('y1')) / 640 * 2.4 + (i % 3) * .2).toFixed(2)}s`; paths.append(s); });
/* 3) 타우미엘 심장 박동 파문 */
const open = sec.querySelector('.q-node.is-open .q-ring');
if (open) for (let k = 0; k < 2; k++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', open.getAttribute('cx')); c.setAttribute('cy', open.getAttribute('cy')); c.setAttribute('r', '40'); c.setAttribute('class', 'q-ripple'); c.style.animationDelay = `${k * 1.6}s`; open.parentNode.insertBefore(c, open); }

}
})();

/* 클리포트 하강·상승: 세피로트 나무와 같은 언어로 — 스크롤 잠금 → 글라이드 → 껍질 순차 점등(내려갈 때) / 역순 소등(올라갈 때).
   글라이드는 지금 스크롤 위치에서 바로 출발하는 감속 곡선이라, 사용자의 스크롤이 끊기지 않고 그대로 이어집니다.
   소리도 나무와 같습니다: 0.5초 뒤 활성음(올라갈 땐 비활성음), 껍질마다 점등음, 경로가 그려질 때 경로음 */
(() => {
const sec = document.getElementById('qliphoth'); if (!sec) return;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, DUR = 1500;
const nodes = [...sec.querySelectorAll('.q-node')];
const easeOut = (t) => 1 - Math.pow(1 - t, 3); /* 출발 속도가 가장 빠르고 끝에서 부드럽게 멈춤 = 손의 스크롤을 이어받는 느낌 */
let busy = false, timers = [], animDone = false, glided = false, touchY = null;
const release = () => { if (busy && animDone && glided) setTimeout(() => { busy = false; /* 풀린 뒤에도 관성이 남아 있으면 멎을 때까지 흡수 */ if (window.__scrollHold) { window.__scrollHold.until = performance.now() + 300; window.__holdCap = performance.now() + 1600; } }, 500); };
const sfx = (id) => { if (!window.__qQuiet) window.__sfx?.(id); }; /* 게임에서 돌아오는 중에는 클리포트 소리를 내지 않음 */
const clear = () => { timers.forEach(clearTimeout); timers = []; };
const light = () => { clear(); sec.classList.add('is-awake');
nodes.forEach((n, i) => timers.push(setTimeout(() => { n.classList.add('is-lit'); sfx('node-lit'); }, 500 + i * 150)));
timers.push(setTimeout(() => { sec.classList.add('is-traced'); sfx('path-trace'); animDone = true; release(); }, 500 + nodes.length * 150)); };
const dim = (animated) => { clear(); sec.classList.remove('is-traced');
if (!animated) { sec.classList.remove('is-awake'); nodes.forEach((n) => n.classList.remove('is-lit')); return; }
sfx('q-exit'); /* 이탈: 장면 전환음 */
[...nodes].reverse().forEach((n, i) => timers.push(setTimeout(() => n.classList.remove('is-lit'), i * 90)));
timers.push(setTimeout(() => { sec.classList.remove('is-awake'); animDone = true; release(); }, nodes.length * 90 + 200)); };
const isDown = () => sec.classList.contains('is-awake');
const glide = (to, onProgress) => { const from = scrollY, t0 = performance.now(); glided = false;
if (reduce || Math.abs(to - from) < 2) { scrollTo(0, to); onProgress?.(1); glided = true; release(); return; }
document.documentElement.style.scrollBehavior = 'auto';
const step = (t) => { const k = Math.min(1, (t - t0) / DUR), e = easeOut(k); scrollTo(0, from + (to - from) * e); onProgress?.(k);
if (k < 1) requestAnimationFrame(step); else { document.documentElement.style.scrollBehavior = ''; glided = true; release(); } };
requestAnimationFrame(step); };
const top = () => { const h = sec.querySelector('.q-head'); return (h || sec).getBoundingClientRect().top + scrollY - 76; }; /* 제목부터 나무 끝까지 한 화면에 들어오도록 제목이 상단바 바로 아래 오게 */
const descend = () => { if (busy) return; busy = true; animDone = false; let lit = false;
sfx('q-enter'); /* 진입음: 내려가기 시작하는 순간 바로 */
glide(top(), (k) => { document.documentElement.style.setProperty('--qd', easeOut(k).toFixed(3)); if (k >= .35 && !lit) { lit = true; light(); } }); };
const ascend = () => { if (busy) return; busy = true; animDone = false; dim(true);
glide(Math.max(0, top() - innerHeight), (k) => document.documentElement.style.setProperty('--qd', (1 - easeOut(k)).toFixed(3))); };
/* 의도 판단: 클리포트가 화면 아래쪽에 보이기 시작했는데 내려가려 하면 하강, 클리포트 맨 위에서 올라가려 하면 상승 */
const intent = (dir, mag = 0) => { if (window.__navGliding) return false; const r = sec.getBoundingClientRect();
if (dir > 0 && !isDown() && r.top > 0 && r.top - Math.abs(mag) < innerHeight) { descend(); return true; } /* 한 번에 크게 굴려 클리포트를 건너뛰려 해도 미리 잡아 하강 연출로 */
if (dir < 0 && isDown() && r.top > -60 && r.top < innerHeight * .5) { ascend(); return true; }
return false; };
addEventListener('wheel', (e) => { if (busy) { e.preventDefault(); return; } if (Math.abs(e.deltaY) > 2 && intent(Math.sign(e.deltaY), e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY)) e.preventDefault(); }, { passive: false });
addEventListener('touchstart', (e) => { touchY = e.touches[0]?.clientY ?? null; }, { passive: true });
addEventListener('touchmove', (e) => { if (busy) { e.preventDefault(); return; } if (touchY == null) return; const dy = touchY - (e.touches[0]?.clientY ?? touchY);
if (Math.abs(dy) > 12 && intent(Math.sign(dy), dy * 3)) { e.preventDefault(); touchY = null; } }, { passive: false });
addEventListener('keydown', (e) => { const keys = { ArrowDown: 1, PageDown: 1, Space: 1, ArrowUp: -1, PageUp: -1 };
if (!(e.code in keys)) return; if (busy) { e.preventDefault(); return; } if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
if (intent(e.shiftKey && e.code === 'Space' ? -1 : keys[e.code])) e.preventDefault(); });
/* 스크롤바·앵커 이동처럼 의도 신호 없이 넘어온 경우: 상태만 맞춰 둡니다 */
addEventListener('scroll', () => { if (busy) return; const r = sec.getBoundingClientRect();
if (r.top > innerHeight * 2.5 && isDown()) { dim(false); document.documentElement.style.setProperty('--qd', '0'); }
else if (r.top < innerHeight * .92 && !isDown()) {
/* 휠·터치 신호 없이 관성만으로 클리포트에 들어온 경우(모바일 플링, 아주 센 트랙패드)에도 하강 연출을 거치게 합니다. 바로가기·깊은 점프만 즉시 점등 */
if (window.__navGliding || r.top < -innerHeight * .5) { light(); animDone = true; } else descend(); }
else if (isDown() && r.top > innerHeight * .5 && r.top < innerHeight * 2.5 && !window.__navGliding) ascend(); /* 센 관성으로 한 번에 멀리 빠져나가도 상승 연출로 */ /* 관성으로 위로 빠져나가는 경우도 상승 연출로 */ }, { passive: true });
})();

/* 클리포트 미니맵: 클리포트가 깨어나면 오른쪽 세피로트 미니맵이 물러나고, 같은 모양의 핏빛 클리포트 미니맵이 그 자리에 들어옵니다.
   열린 껍질(타우미엘·가말리엘)만 누를 수 있고, 잠긴 껍질은 흐린 고리로만 보입니다 */
(() => {
const src = document.querySelector('[data-minimap]'), sec = document.getElementById('qliphoth'); if (!src || !sec) return;
const OPEN = { 1: ['q-thaumiel', '타우미엘'], 3: ['q-sathariel', '사타리엘'], 9: ['q-gamaliel', '가말리엘'] };
const qm = src.cloneNode(true);
qm.removeAttribute('data-minimap'); qm.classList.add('q-minimap'); qm.setAttribute('aria-label', '클리포트의 나무 미니맵');
qm.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
qm.querySelector('title')?.replaceChildren(document.createTextNode('클리포트의 나무 미니맵'));
qm.querySelectorAll('.ain, .veil, .path-badge, .path-signal').forEach((n) => n.remove());
qm.querySelectorAll('a.node').forEach((a) => { const k = Number(a.dataset.seph), open = OPEN[k];
a.classList.remove('node', 'is-current'); a.classList.add('qm-node', open ? 'is-open' : 'is-locked');
if (open) { a.setAttribute('href', `#${open[0]}`); a.setAttribute('aria-label', `${k}. ${open[1]}`); }
else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('aria-label', `${k}. 봉인됨`); a.setAttribute('tabindex', '-1'); } });
src.after(qm);
const sync = () => { const on = sec.classList.contains('is-awake') || sec.getBoundingClientRect().top < innerHeight * .5; /* 깨어나기를 기다리지 않고 클리포트가 화면 절반을 넘는 순간 교대 */ src.classList.toggle('is-yielded', on); qm.classList.toggle('is-shown', on);
/* 지금 보고 있는 열린 껍질을 강조 */
let cur = ''; for (const id of ['q-gamaliel', 'q-sathariel', 'q-thaumiel']) { const r = document.getElementById(id)?.getBoundingClientRect(); if (r && r.top < innerHeight * .55) { cur = id; break; } }
qm.querySelectorAll('.qm-node.is-open').forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${cur}`));
/* 상단 바: 클리포트 안에서는 말쿠트 대신 지금 껍질 이름으로 바꾸고, 나가면 원래대로 되돌립니다 */
const tb = document.querySelector('[data-topbar]'), num = tb?.querySelector('[data-tb-num]'), name = tb?.querySelector('[data-tb-name]'), link = tb?.querySelector('[data-tb-now]');
if (tb && num && name && link) {
if (on) { if (!saved) saved = { num: num.textContent, name: name.textContent, href: link.getAttribute('href'), seph: tb.dataset.seph };
const label = cur === 'q-gamaliel' ? ['9', '클리포트 · 가말리엘'] : cur === 'q-sathariel' ? ['3', '클리포트 · 사타리엘'] : cur === 'q-thaumiel' ? ['1', '클리포트 · 타우미엘'] : ['Q', '클리포트 · 껍질의 나무'];
num.textContent = label[0]; name.textContent = label[1]; link.setAttribute('href', `#${cur || 'qliphoth'}`); tb.classList.add('is-qliphoth'); }
else if (saved) { num.textContent = saved.num; name.textContent = saved.name; link.setAttribute('href', saved.href); tb.classList.remove('is-qliphoth'); saved = null; } } };
let saved = null;
new MutationObserver(sync).observe(sec, { attributes: true, attributeFilter: ['class'] });
let f = 0; addEventListener('scroll', () => { if (!f) f = requestAnimationFrame(() => { f = 0; sync(); }); }, { passive: true });
sync();
})();

/* 클리포트 배경 장식: 세피로트 나무와 같은 문법의 고대 문자 흐름(핏빛) + 나무 뒤 역회전하는 이중 마법진 */
(() => {
const svg = document.querySelector('#qliphoth .q-tree'); if (!svg) return;
const NS = 'http://www.w3.org/2000/svg', mk = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; };
const deco = mk('g', { class: 'q-deco', 'aria-hidden': 'true' });
/* 1) 고대 문자 줄: 히브리·룬·연금술 기호가 아주 희미하게 좌우로 흐릅니다 */
const GLYPHS = Array.from('אבגדהוזחטיכלמנסעפצקרשת ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ ☉☽☿♀♂♃♄⊕△▽ ∴∵⊙⋈ 🜁🜂🜃🜄 ');
[40, 170, 330, 490, 640].forEach((y, r) => { let line = ''; for (let k = 0; k < 90; k++) line += GLYPHS[Math.floor(Math.abs(Math.sin((k + 7) * (r + 5) * 78.233)) * GLYPHS.length)];
const g = mk('g', { class: `q-runes q-r${r % 2}` }); g.style.animationDuration = `${64 + r * 12}s`; const t = mk('text', { x: -900, y }); t.textContent = line + line; g.append(t); deco.append(g); });
/* 2) 마법진: 타우미엘과 말쿠트 자리 사이 중심(나무 중앙)에 원 두 겹 + 원둘레를 도는 문자열 + 별 다각형 */
const CX = 200, CY = 346, R1 = 250, R2 = 205;
const circle = mk('g', { class: 'q-circle' });
const outer = mk('g', { class: 'q-ring-a' }), inner = mk('g', { class: 'q-ring-b' });
outer.append(mk('circle', { cx: CX, cy: CY, r: R1 }), mk('circle', { cx: CX, cy: CY, r: R1 - 14 }));
const pid = 'q-circle-path'; outer.append(mk('path', { id: pid, d: `M ${CX - (R1 - 7)} ${CY} a ${R1 - 7} ${R1 - 7} 0 1 1 ${2 * (R1 - 7)} 0 a ${R1 - 7} ${R1 - 7} 0 1 1 ${-2 * (R1 - 7)} 0`, fill: 'none', stroke: 'none' }));
const tx = mk('text', { class: 'q-circle-text' }), tp = mk('textPath', { href: `#${pid}` });
tp.textContent = 'THAUMIEL · GHAGIEL · SATARIEL · GAMCHICOTH · GOLACHAB · THAGIRION · A’ARAB ZARAQ · SAMAEL · GAMALIEL · NEHEMOTH · '; tx.append(tp); outer.append(tx);
/* 열 꼭짓점 별(10각 성형): 껍질 열 개를 상징 */
let pts = ''; for (let k = 0; k < 10; k++) { const a = (k * 3 * 2 * Math.PI) / 10 - Math.PI / 2; pts += `${(CX + R2 * Math.cos(a)).toFixed(1)},${(CY + R2 * Math.sin(a)).toFixed(1)} `; }
inner.append(mk('circle', { cx: CX, cy: CY, r: R2 }), mk('polygon', { points: pts.trim() }));
for (let k = 0; k < 10; k++) { const a = (k * 2 * Math.PI) / 10 - Math.PI / 2; inner.append(mk('circle', { class: 'q-dot', cx: (CX + R2 * Math.cos(a)).toFixed(1), cy: (CY + R2 * Math.sin(a)).toFixed(1), r: 3 })); }
circle.append(outer, inner); deco.append(circle);
svg.insertBefore(deco, svg.firstChild);
})();

/* 클리파 바로가기 소리: 클리포트 나무나 클리포트 미니맵에서 열린 껍질을 누르면 버튼음이 납니다 */
document.addEventListener('click', (e) => {
const a = e.target instanceof Element ? e.target.closest('a[href^="#q-"]') : null;
if (a && a.closest('.q-tree, .q-minimap')) window.__sfx?.('q-jump');
});

/* 모바일 소리 버튼 자동 숨김: 아래로 스크롤하면 숨기고, 위로 올리거나 1.2초 멈추면 다시 보입니다 */
(() => {
const ac = document.querySelector('.audio-controls'); if (!ac) return;
const mq = matchMedia('(max-width: 767px)'); let lastY = scrollY, idle = 0;
addEventListener('scroll', () => { if (!mq.matches) { ac.classList.remove('is-tucked'); return; }
const y = scrollY, dy = y - lastY; lastY = y;
if (dy > 4) ac.classList.add('is-tucked'); else if (dy < -4) ac.classList.remove('is-tucked');
clearTimeout(idle); idle = setTimeout(() => ac.classList.remove('is-tucked'), 1200); }, { passive: true });
})();

/* 성능: 화면 밖에 있는 영역의 CSS 애니메이션(고대 문자 흐름, 마법진 회전, 궤도, 맥박 등)은 멈춰 두었다가 보일 때 다시 돌립니다.
   SVG 안의 큰 회전·이동은 GPU 합성이 안 돼 매 프레임 다시 그려지므로, 안 보이는 곳까지 돌리면 스크롤이 버벅입니다 */
(() => {
if (!('IntersectionObserver' in window)) return;
const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)), { rootMargin: '200px 0px' });
document.querySelectorAll('#tree, #qliphoth, section.chapter, .sky').forEach((el) => io.observe(el));
document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('is-tab-hidden', document.hidden));
})();

/* 게임에서 돌아왔을 때: 어두운 장막 아래에서 가말리엘 장 위치를 잡고 클리포트를 깨운 뒤, 장막을 걷으며 내용이 떠오르게 합니다 */
(() => {
const html = document.documentElement; if (!html.classList.contains('is-returning')) return;
window.__qQuiet = true; setTimeout(() => { window.__qQuiet = false; }, 4000); /* 돌아올 때 점등음·경로음이 울리지 않게 */
try { sessionStorage.removeItem('ftvot-return'); } catch { /* 저장소 없음 */ }
const target = document.getElementById(html.dataset.returnTo || 'q-gamaliel'), sec = document.getElementById('qliphoth');
const place = () => { if (target) { html.style.scrollBehavior = 'auto'; scrollTo(0, target.getBoundingClientRect().top + scrollY - 110); html.style.scrollBehavior = ''; } };
place(); requestAnimationFrame(place);
setTimeout(() => { place(); sec?.classList.add('is-awake', 'is-traced'); sec?.querySelectorAll('.q-node').forEach((n) => n.classList.add('is-lit'));
html.classList.add('is-returned'); window.__portalOpen?.(); setTimeout(() => html.classList.remove('is-returning', 'is-returned'), 1300); }, 250);
})();

/* 게임 카드를 누르면 그 자리에서 차원 균열이 열리며 플레이 화면으로 넘어갑니다 */
document.addEventListener('click', (e) => {
const a = e.target instanceof Element ? e.target.closest('a.game-card, a.cv-gate') : null;
if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !window.__portalGo) return;
e.preventDefault(); window.__portalGo(a.href, e.clientX, e.clientY);
});

/* 모바일: 첫 화면(나무 구간)에서는 소리 버튼을 숨겨 나무·힌트와 겹치지 않게 합니다 */
(() => {
const hero = document.getElementById('tree'); if (!hero) return;
const sync = () => document.documentElement.classList.toggle('in-hero', hero.getBoundingClientRect().bottom > innerHeight * .2);
addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
})();
