// 첫 화면 깜빡임 방지: 문서가 그려지기 전에 동기로 실행되어 'js' 클래스를 먼저 붙입니다.
// 그래야 인트로가 첫 프레임부터 보이고, 홈 화면이 잠깐 보였다가 인트로로 바뀌는 일이 없습니다.
document.documentElement.classList.add('js');
// 게임에서 돌아올 때: 그리기 전에 표시해 두어 첫 프레임부터 어두운 장막이 덮이고, 그 뒤 클리포트가 서서히 드러납니다
try { if (sessionStorage.getItem('ftvot-return') === 'play') document.documentElement.classList.add('is-returning'); if (sessionStorage.getItem('ftvot-portal')) document.documentElement.classList.add('portal-in'); } catch { /* 저장소 없음 */ }

// 다른 도메인(Contra Vincula 사이트)에서 균열 전환으로 돌아올 때: 주소의 ?from=cv 로 알아보고 사타리엘 장으로 돌아옵니다
try { const q = new URLSearchParams(location.search); if (q.get('from') === 'cv') { const h = document.documentElement; h.classList.add('is-returning', 'portal-in'); h.dataset.returnTo = 'q-sathariel'; history.replaceState(null, '', location.pathname); } } catch { /* 무시 */ }

// 터치 기기 전용 스크롤 동결: iOS·안드로이드는 손을 뗀 뒤의 관성 스크롤을 막을 수 없고 그동안 scrollTo도 무시합니다.
// 연출이 시작될 때 문서의 overflow를 잠깐 막으면 관성이 그 자리에서 끊기고, 연출용 글라이드(scrollTo)는 계속 동작합니다
(() => { const keys = new Set(), coarse = matchMedia('(pointer: coarse)');
  window.__freeze = (key, on) => { if (!coarse.matches) return; on ? keys.add(key) : keys.delete(key); document.documentElement.classList.toggle('scroll-frozen', keys.size > 0); }; })();
