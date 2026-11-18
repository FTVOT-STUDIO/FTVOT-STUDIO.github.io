// 차원 균열 전환(홈 ↔ 게임): 누른 자리에서 핏빛 마법진이 회전하며 원형으로 화면을 삼키고, 도착한 페이지에서는
// 같은 마법진이 가운데로 오므라들며 새 화면을 열어 줍니다. 양쪽 페이지가 같은 장면을 이어 받아 끊김이 없습니다.
(() => {
const KEY = 'ftvot-portal';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const build = () => {
const el = document.createElement('div'); el.className = 'portal'; el.setAttribute('aria-hidden', 'true');
el.innerHTML = '<div class="portal-bg"></div><div class="portal-sigil"><img class="ps-echo" src="./assets/sigil-outer.svg" alt="" decoding="sync"><img class="ps-o" src="./assets/sigil-outer.svg" alt="" decoding="sync"><img class="ps-m" src="./assets/sigil-mid.svg" alt="" decoding="sync"><img class="ps-c" src="./assets/sigil-core.svg" alt="" decoding="sync"></div>'; /* 고리 세 겹이 서로 다른 방향·속도로 돌고, 뒤에서 큰 고대 문자 고리가 천천히 돕니다 */ /* 첫 프레임 덮개와 같은 그림이라 페이지가 바뀌어도 이어 보입니다 */
document.body.append(el); return el;
};
/* 나가기: (x, y)에서 균열이 열려 화면을 덮은 뒤 이동 */
window.__portalGo = (href, x = innerWidth / 2, y = innerHeight / 2) => {
try { sessionStorage.setItem(KEY, '1'); } catch { /* 저장소 없음 */ }
if (reduce) { location.href = href; return; }
const el = build(), r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }], { duration: 650, easing: 'cubic-bezier(.7, 0, .3, 1)', fill: 'forwards' });
el.querySelector('.portal-sigil').animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-90deg)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });
/* 들어갈 때와 나올 때 같은 효과음: 게임 화면에는 사이트 효과음 체계가 없어서 직접 재생합니다 (효과음 끄기 설정은 따름) */
try { if (localStorage.getItem('sfx') !== 'off') { const a = new Audio('./assets/swoosh.mp3?v=1'); a.volume = .5; /* 사이트 전환 효과음 */ a.play().catch(() => {}); } } catch { /* 재생 불가 */ }
setTimeout(() => { location.href = href; }, 700);
};
/* 도착: 덮인 상태로 시작해 마법진이 가운데로 오므라들며 화면을 엽니다. 홈은 위치를 잡은 뒤 직접 열어 달라고 부릅니다 */
let pending = null;
const open = () => { const el = pending; if (!el) return; pending = null; document.documentElement.classList.remove('portal-in');
const r = Math.hypot(innerWidth, innerHeight) / 2 + 40;
el.animate([{ clipPath: `circle(${r}px at 50% 50%)` }, { clipPath: 'circle(0px at 50% 50%)' }], { duration: 850, easing: 'cubic-bezier(.7, 0, .3, 1)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
el.querySelector('.portal-sigil').animate([{ transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(.15) rotate(120deg)', opacity: 0 }], { duration: 850, easing: 'cubic-bezier(.7, 0, .3, 1)', fill: 'forwards' }); };
window.__portalOpen = open;
const arrive = () => { if (!document.documentElement.classList.contains('portal-in')) return;
try { sessionStorage.removeItem(KEY); } catch { /* 저장소 없음 */ }
if (reduce) { document.documentElement.classList.remove('portal-in'); return; }
pending = build(); pending.classList.add('is-full');
if (!document.documentElement.classList.contains('is-returning')) setTimeout(open, 250); /* 게임 화면: 잠깐 보여 준 뒤 바로 열기 */
setTimeout(open, 2500); /* 안전장치: 무슨 일이 있어도 2.5초 안에는 열림 */ };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrive); else arrive();
})();
