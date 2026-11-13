// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML로 동작하도록 "추가 기능"으로만 붙습니다.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const supportsVT = typeof document.startViewTransition === 'function';

// 헤더 tuck 판정 임계값. 트랙패드의 1~2px 떨림에 헤더가 깜빡이지 않게 합니다
const NAV_SCROLL_THRESHOLD = 8;
// pill 헤더 높이 + 여백. 앵커 이동 시 제목이 헤더에 가려지지 않게 합니다
const ANCHOR_OFFSET = -88;
// Lenis 메이저 버전 고정. 마이너 업데이트는 받고, 깨지는 변경은 막습니다
const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1/+esm';

/** @type {any} Lenis 인스턴스. CDN 실패 또는 모션 축소 시 null로 남고 기본 스크롤을 씁니다 */
let lenis = null;

/* ---------------- 스무스 스크롤 ---------------- */
async function initSmoothScroll() {
if (reduceMotion.matches) return;
try {
const { default: Lenis } = await import(LENIS_URL);
lenis = new Lenis({
lerp: 0.09,
smoothWheel: true,
syncTouch: false,
autoRaf: true,
});
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
// 히어로에서는 헤더가 보이지 않으므로 Tab 포커스도 받지 않게 합니다. tuck 상태는 포커스 시 다시 펼쳐집니다
nav.inert = state === 'hidden';
};
setState(nav.dataset.state ?? 'hidden');

new IntersectionObserver(([entry]) => {
// 센티널이 화면 위로 사라졌을 때만 "히어로 지남"으로 봅니다
pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
setState(pastHero ? 'shown' : 'hidden');
}).observe(sentinel);

const onScroll = () => {
const y = window.scrollY;
const delta = y - lastY;
if (pastHero && Math.abs(delta) > NAV_SCROLL_THRESHOLD) {
// 헤더 안에 포커스가 있으면 숨기지 않습니다. 키보드 사용자가 길을 잃지 않게
const focusInside = nav.contains(document.activeElement);
setState(delta > 0 && !focusInside ? 'tucked' : 'shown');
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

/* ---------------- θ 다이얼 폴백 ---------------- */
// 스크롤 타임라인을 지원하면 CSS만으로 동작합니다. 미지원(현재 일부 Firefox/Safari)일 때만 JS가 같은 변수를 갱신합니다
function initThetaFallback() {
if (CSS.supports('animation-timeline: scroll()')) return;
let ticking = false;
const update = () => {
const max = document.documentElement.scrollHeight - window.innerHeight;
const progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
const theta = progress * 360;
root.style.setProperty('--theta', theta.toFixed(2));
root.style.setProperty('--theta-int', String(Math.round(theta)));
ticking = false;
};
const request = () => {
if (ticking) return;
ticking = true;
requestAnimationFrame(update);
};
window.addEventListener('scroll', request, { passive: true });
window.addEventListener('resize', request, { passive: true });
update();
}

/* ---------------- 작업 필터 ---------------- */
function initFilter() {
const buttons = [...document.querySelectorAll('.filter-btn')];
const items = [...document.querySelectorAll('.work-item')];
const indicator = document.querySelector('.filter-ind');
const countEl = document.querySelector('[data-count]');
const emptyEl = document.querySelector('.work-empty');
const resetBtn = document.querySelector('[data-filter-reset]');
if (!buttons.length || !indicator) return;

// 항목마다 고유 이름을 줘야 View Transition이 "같은 요소의 이동"으로 인식합니다
items.forEach((item, i) => {
item.style.viewTransitionName = `work-${i + 1}`;
});

const apply = (filter) => {
let visible = 0;
for (const item of items) {
const match = filter === 'all' || item.dataset.category === filter;
item.hidden = !match;
if (match) visible += 1;
// 숨겨지는 항목이 열려 있으면 닫아서, 다시 보일 때 엉뚱하게 펼쳐져 있지 않게 합니다
if (!match) item.querySelector('details')?.removeAttribute('open');
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
if (current === filter) return;
if (supportsVT && !reduceMotion.matches) {
document.startViewTransition(() => apply(filter));
} else {
apply(filter);
}
};

for (const btn of buttons) {
btn.addEventListener('click', () => run(btn.dataset.filter ?? 'all'));
}
resetBtn?.addEventListener('click', () => run('all'));
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

// 클릭 지점에서 화면 끝까지 닿는 원의 반지름
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
// 전환이 중간에 취소돼도 테마는 이미 적용됐습니다
});
transition.finished.finally(() => root.classList.remove('theme-vt'));
});
});

syncLabels();
}

/* ---------------- 기타 ---------------- */
function initYear() {
const el = document.querySelector('[data-year]');
if (el) el.textContent = String(new Date().getFullYear());
}

initTheme();
initAnchors();
initNav();
initThetaFallback();
initFilter();
initYear();
initSmoothScroll();
