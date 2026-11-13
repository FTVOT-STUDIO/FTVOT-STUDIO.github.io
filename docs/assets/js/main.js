// FTVOT_STUDIO — main.js
// 빌드 없는 ES 모듈입니다. 모든 기능은 JS가 실패해도 기본 HTML이 동작하도록 "덧붙이는" 방식입니다.
// 스크롤은 브라우저 기본 스크롤을 그대로 씁니다 (관성 스크롤 라이브러리는 이질감 때문에 뺐습니다).
import { initIntro, initSky } from './intro.js';
import { initSephirot } from './sephirot.js';
import { initCharacters } from './characters.js';

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
initCharacters();
initYear();
// 인트로가 걷히면 첫 화면의 나무가 자라납니다
initIntro(() => document.documentElement.classList.add('tree-grown'));
