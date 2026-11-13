// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const supportsVT = typeof document.startViewTransition === 'function';

// 헤더 tuck 판정 임계값. 트랙패드 1~2px 떨림에 헤더가 깜빡이지 않게 합니다
const NAV_SCROLL_THRESHOLD = 8;
// pill 헤더 높이 + 여백. 앵커 이동 시 제목이 헤더에 가려지지 않게 합니다
const ANCHOR_OFFSET = -96;
// Lenis 메이저 버전 고정. 마이너 업데이트는 받고 깨지는 변경은 막습니다
const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1/+esm';

/** @type {any} CDN 실패나 모션 축소 시 null로 남고 기본 스크롤을 씁니다 */
let lenis = null;

/** 모션 허용 + 지원 브라우저일 때만 View Transition으로 감쌉니다 */
function morph(update) {
if (supportsVT && !reduceMotion.matches) return document.startViewTransition(update);
update();
return null;
}

/* ---------------- 스무스 스크롤 ---------------- */
async function initSmoothScroll() {
if (reduceMotion.matches) return;
try {
const { default: Lenis } = await import(LENIS_URL);
lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false, autoRaf: true });
} catch (error) {
// 외부 CDN 장애가 사이트 장애가 되면 안 됩니다. 기본 스크롤로 계속 동작합니다
lenis = null;
}
}

/* ---------------- 앵커 이동 ---------------- */
function initAnchors() {
document.addEventListener('click', (event) => {
const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
if (!link) return;
const id = link.getAttribute('href').slice(1);
const target = id ? document.getElementById(id) : null;
if (!target) return;
event.preventDefault();
if (lenis) {
lenis.scrollTo(target, { offset: ANCHOR_OFFSET });
} else {
target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
}
// 키보드 사용자도 이동한 위치에서 Tab을 이어가도록 포커스를 옮깁니다
target.focus({ preventScroll: true });
history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
});
}

/* ---------------- pill 헤더 ---------------- */
function initNav() {
const nav = document.querySelector('.pill-nav');
const sentinel = document.querySelector('.hero-sentinel');
if (!nav || !sentinel) return;

let pastHero = false;
let lastY = window.scrollY;
let ticking = false;

const setState = (state) => {
if (nav.dataset.state !== state) nav.dataset.state = state;
// 히어로에서는 보이지 않으므로 Tab 포커스도 받지 않습니다. tuck 상태는 포커스 시 다시 펼쳐집니다
nav.inert = state === 'hidden';
};
setState(nav.dataset.state ?? 'hidden');

new IntersectionObserver(([entry]) => {
pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
setState(pastHero ? 'shown' : 'hidden');
}).observe(sentinel);

const onScroll = () => {
const y = window.scrollY;
const delta = y - lastY;
if (pastHero && Math.abs(delta) > NAV_SCROLL_THRESHOLD) {
// 헤더 안에 포커스가 있으면 숨기지 않습니다
setState(delta > 0 && !nav.contains(document.activeElement) ? 'tucked' : 'shown');
lastY = y;
}
if (!pastHero) lastY = y;
ticking = false;
};
window.addEventListener('scroll', () => {
if (ticking) return;
ticking = true;
requestAnimationFrame(onScroll);
}, { passive: true });
nav.addEventListener('focusin', () => {
if (pastHero) setState('shown');
});
}

/* ---------------- 히어로 유닛 선택 ---------------- */
function initStage() {
const img = document.querySelector('[data-stage-img]');
const nameEl = document.querySelector('[data-stage-name]');
const countEl = document.querySelector('.stage-count');
const picks = [...document.querySelectorAll('.pick')];
if (!img || !nameEl || !picks.length) return;
const total = document.querySelectorAll('.unit').length;

picks.forEach((pick) => {
pick.addEventListener('click', async () => {
if (pick.getAttribute('aria-pressed') === 'true') return;
const { src, w, h, name, index } = pick.dataset;
// 새 이미지를 먼저 받아두고 전환합니다. 전환 중에 빈 칸이 보이지 않게
const next = new Image();
next.src = src;
try {
await next.decode();
} catch (error) {
// 디코드 실패해도 src 교체로 진행합니다
}
morph(() => {
img.src = src;
img.width = Number(w);
img.height = Number(h);
img.alt = `${name} 유닛 일러스트`;
nameEl.textContent = name;
if (countEl) countEl.textContent = `UNIT ${String(index).padStart(2, '0')} / ${total}`;
picks.forEach((p) => p.setAttribute('aria-pressed', String(p === pick)));
});
});
});
}

/* ---------------- 프로젝트 필터 ---------------- */
function initFilter() {
const buttons = [...document.querySelectorAll('.filter-btn')];
const items = [...document.querySelectorAll('.proj')];
const years = [...document.querySelectorAll('.proj-year')];
const indicator = document.querySelector('.filter-ind');
const countEl = document.querySelector('[data-count]');
const emptyEl = document.querySelector('.filter-empty');
const resetBtn = document.querySelector('[data-filter-reset]');
if (!buttons.length || !indicator) return;

// 고유 이름이 있어야 View Transition이 "같은 요소의 이동"으로 인식합니다
items.forEach((item, i) => { item.style.viewTransitionName = `proj-${i + 1}`; });
years.forEach((year, i) => { year.style.viewTransitionName = `year-${i + 1}`; });

const apply = (filter) => {
let visible = 0;
for (const item of items) {
const tags = (item.dataset.tags ?? '').split(' ');
const match = filter === 'all' || tags.includes(filter);
item.hidden = !match;
if (match) visible += 1;
}
// 해당 연도에 보이는 항목이 없으면 연도 묶음째 숨깁니다
for (const year of years) {
year.hidden = !year.querySelector('.proj:not([hidden])');
}
for (const btn of buttons) {
const active = btn.dataset.filter === filter;
btn.setAttribute('aria-pressed', String(active));
if (active) btn.append(indicator);
}
if (countEl) countEl.textContent = String(visible);
if (emptyEl) emptyEl.hidden = visible !== 0;
};

const run = (filter) => {
const current = buttons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.filter;
if (current !== filter) morph(() => apply(filter));
};
buttons.forEach((btn) => btn.addEventListener('click', () => run(btn.dataset.filter ?? 'all')));
resetBtn?.addEventListener('click', () => run('all'));
}

/* ---------------- 유닛 도감 상세 ---------------- */
function initUnitDialog() {
const dialog = document.querySelector('[data-unit-dialog]');
const tiles = [...document.querySelectorAll('.unit')];
if (!dialog || !tiles.length) return;
const img = dialog.querySelector('[data-dlg-img]');
const nameEl = dialog.querySelector('[data-dlg-name]');
const labelEl = dialog.querySelector('[data-dlg-label]');
const framesEl = dialog.querySelector('[data-dlg-frames]');
const prevBtn = dialog.querySelector('[data-dlg-prev]');
const nextBtn = dialog.querySelector('[data-dlg-next]');

let unitIndex = 0;
let frameIndex = 0;
/** @type {Array<[number, number]>} */
let frames = [];

const frameSrc = (slug, i) => `./assets/units/${slug}/${i}.webp`;

const showFrame = (i) => {
const slug = tiles[unitIndex].dataset.unit;
frameIndex = i;
const [w, h] = frames[i];
img.src = frameSrc(slug, i);
img.width = w;
img.height = h;
img.alt = `${tiles[unitIndex].dataset.name} 프레임 ${i + 1}`;
labelEl.textContent = `프레임 ${i + 1} / ${frames.length}`;
framesEl.querySelectorAll('.dlg-frame').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
};

const load = (index) => {
unitIndex = (index + tiles.length) % tiles.length;
const tile = tiles[unitIndex];
const slug = tile.dataset.unit;
try {
frames = JSON.parse(tile.dataset.frames ?? '[]');
} catch (error) {
frames = [];
}
if (!frames.length) return;
nameEl.textContent = tile.dataset.name ?? '';
framesEl.replaceChildren(...frames.map(([w, h], i) => {
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'dlg-frame';
btn.setAttribute('aria-label', `프레임 ${i + 1}`);
btn.setAttribute('aria-pressed', 'false');
const thumb = document.createElement('img');
thumb.src = frameSrc(slug, i);
thumb.width = w;
thumb.height = h;
thumb.alt = '';
thumb.loading = 'lazy';
btn.append(thumb);
btn.addEventListener('click', () => morph(() => showFrame(i)));
return btn;
}));
showFrame(0);
};

tiles.forEach((tile, i) => {
tile.addEventListener('click', () => {
const tileImg = tile.querySelector('img');
// 타일 그림 → 다이얼로그 그림으로 모핑. 같은 이름을 잠깐 공유합니다
if (tileImg) tileImg.style.viewTransitionName = 'unit-focus';
const transition = morph(() => {
if (tileImg) tileImg.style.viewTransitionName = '';
img.style.viewTransitionName = 'unit-focus';
load(i);
dialog.showModal();
lenis?.stop();
});
const cleanup = () => { img.style.viewTransitionName = ''; };
if (transition) transition.finished.finally(cleanup);
else cleanup();
});
});

prevBtn?.addEventListener('click', () => morph(() => load(unitIndex - 1)));
nextBtn?.addEventListener('click', () => morph(() => load(unitIndex + 1)));

// 방향키로 프레임 넘기기
dialog.addEventListener('keydown', (event) => {
if (!frames.length) return;
if (event.key === 'ArrowRight') { event.preventDefault(); morph(() => showFrame((frameIndex + 1) % frames.length)); }
if (event.key === 'ArrowLeft') { event.preventDefault(); morph(() => showFrame((frameIndex - 1 + frames.length) % frames.length)); }
});
// 바깥 어두운 영역 클릭 시 닫기
dialog.addEventListener('click', (event) => {
if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
lenis?.start();
tiles[unitIndex]?.focus({ preventScroll: true });
});
}

/* ---------------- 테마 전환 ---------------- */
function currentTheme() {
const explicit = root.dataset.theme;
if (explicit === 'light' || explicit === 'dark') return explicit;
return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function saveTheme(theme) {
try {
localStorage.setItem('theme', theme);
} catch (error) {
// 저장이 막혀도 현재 페이지에서는 전환이 유지됩니다
}
}

function initTheme() {
const toggles = document.querySelectorAll('[data-theme-toggle]');
const syncLabels = () => {
const next = currentTheme() === 'dark' ? '라이트' : '다크';
toggles.forEach((btn) => {
btn.setAttribute('aria-label', `${next} 테마로 전환`);
if (btn.classList.contains('theme-toggle-text')) btn.textContent = `${next} 테마`;
});
};

toggles.forEach((btn) => {
btn.addEventListener('click', (event) => {
const next = currentTheme() === 'dark' ? 'light' : 'dark';
const commit = () => {
root.dataset.theme = next;
saveTheme(next);
syncLabels();
};
if (!supportsVT || reduceMotion.matches) {
commit();
return;
}
// 클릭 지점에서 화면 끝까지 닿는 원으로 새 테마가 퍼집니다
const x = event.clientX || window.innerWidth / 2;
const y = event.clientY || window.innerHeight / 2;
const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
root.classList.add('theme-vt');
const transition = document.startViewTransition(commit);
transition.ready
.then(() => {
root.animate(
{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
{ duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
);
})
.catch(() => {
// 전환이 취소돼도 테마는 이미 적용됐습니다
});
transition.finished.finally(() => root.classList.remove('theme-vt'));
});
});
syncLabels();
}

function initYear() {
const el = document.querySelector('[data-year]');
if (el) el.textContent = String(new Date().getFullYear());
}

initTheme();
initAnchors();
initNav();
initStage();
initFilter();
initUnitDialog();
initYear();
initSmoothScroll();
