// 첫 화면 깜빡임 방지: 문서가 그려지기 전에 동기로 실행되어 'js' 클래스를 먼저 붙입니다.
// 그래야 인트로가 첫 프레임부터 보이고, 홈 화면이 잠깐 보였다가 인트로로 바뀌는 일이 없습니다.
document.documentElement.classList.add('js');
// 게임에서 돌아올 때: 그리기 전에 표시해 두어 첫 프레임부터 어두운 장막이 덮이고, 그 뒤 클리포트가 서서히 드러납니다
try { if (sessionStorage.getItem('ftvot-return') === 'play') document.documentElement.classList.add('is-returning'); if (sessionStorage.getItem('ftvot-portal')) document.documentElement.classList.add('portal-in'); } catch { /* 저장소 없음 */ }
