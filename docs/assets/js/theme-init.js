// 첫 페인트 전에 저장된 테마를 적용합니다. 이게 늦으면 다크 사용자가 흰 화면을 한 번 보게 됩니다.
(function () {
try {
var saved = localStorage.getItem('theme');
if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch (e) {
// 사파리 사생활 보호 모드 등에서 localStorage가 막혀도 시스템 테마로 동작합니다
}
})();
