// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
import { initSephirot } from './sephirot.js';
import { initCharacters } from './characters.js';

// 공개 연출용 CSS를 켭니다. JS가 실패하면 이 클래스가 없어서 내용이 전부 보입니다
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Lenis 메이저 버전 고정. 마이너 업데이트는 받고 깨지는 변경은 막습니다
const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1/+esm';
// 상단 바 높이만큼 덜 내려가서 세피라 제목이 가려지지 않게 합니다
const MOBILE_BAR = 56;

/** @type {any} CDN 실패나 모션 축소 시 null로 남고 기본 스크롤을 씁니다 */
let lenis = null;

const offset = () => -(MOBILE_BAR + 16);

/** 섹션으로 이동 (Lenis가 있으면 부드럽게, 없으면 브라우저 기본) */
function scrollToEl(el) {
if (lenis) {
lenis.scrollTo(el, { offset: offset(), duration: 1.2 });
return;
}
const top = el.getBoundingClientRect().top + window.scrollY + offset();
window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

async function initSmoothScroll() {
if (reduceMotion.matches) return;
try {
const { default: Lenis } = await import(LENIS_URL);
lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false, autoRaf: true });
// 나무 다이얼로그가 열려 있는 동안 뒤 페이지가 스크롤되지 않게 합니다
const dialog = document.querySelector('[data-tree-dialog]');
if (dialog) {
new MutationObserver(() => (dialog.open ? lenis.stop() : lenis.start())).observe(dialog, { attributes: true, attributeFilter: ['open'] });
}
} catch (error) {
// 외부 CDN 장애가 사이트 장애가 되면 안 됩니다. 기본 스크롤로 계속 동작합니다
lenis = null;
}
}

/** 노드가 아닌 일반 앵커(#tiferet 등)도 같은 방식으로 이동합니다 */
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
history.replaceState(null, '', `#${id}`);
});
}

function initYear() {
const el = document.querySelector('[data-year]');
if (el) el.textContent = String(new Date().getFullYear());
}

initAnchors();
initSephirot({ scrollTo: scrollToEl });
initCharacters();
initYear();
initSmoothScroll();
