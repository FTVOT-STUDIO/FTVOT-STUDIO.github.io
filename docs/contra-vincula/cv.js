// Contra Vincula 소개 페이지: 레이어 시차, 출시 카운트다운, 스크롤 등장
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers = [...document.querySelectorAll('[data-stage] .ly')];

// 레이어가 모두 받아지면 함께 켜서 한 장씩 따로 뜨는 어색함을 막습니다
let loaded = 0;
const ready = () => { layers.forEach((l) => l.classList.add('is-in')); document.body.classList.add('is-ready'); };
layers.forEach((l) => { if (l.complete) loaded++; else l.addEventListener('load', () => { if (++loaded === layers.length) ready(); }, { once: true }); l.addEventListener('error', () => { if (++loaded === layers.length) ready(); }, { once: true }); });
if (loaded === layers.length) ready();
setTimeout(ready, 6000); // 느린 연결에서도 6초 뒤에는 보여 줍니다

// 시차: 마우스(데스크톱)와 스크롤 양쪽을 부드럽게 따라갑니다
if (!reduce) {
  let mx = 0, my = 0, cx = 0, cy = 0, sy = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const depth = layers.map((l) => Number(l.dataset.depth) || 0);
  const isBody = layers.map((l) => l.classList.contains('body'));
  const tick = () => {
    cx += (mx - cx) * .06; cy += (my - cy) * .06; sy = Math.min(scrollY, innerHeight);
    // 숨쉬기: 몸 레이어만 약 4.2초 주기로 아주 살짝 위아래로 늘었다 줄어듭니다 (엉덩이 쪽을 기준점으로)
    const breath = (Math.sin(performance.now() / 4200 * Math.PI * 2) + 1) / 2;
    layers.forEach((l, i) => { const d = depth[i]; const b = isBody[i] ? breath : 0; l.style.transform = `translate3d(${-cx * d * 260}px, ${-cy * d * 160 + sy * d * 1.4 - b * 3}px, 0) scale(${1 + d * .2}, ${1 + d * .2 + b * .008})`; });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 출시 카운트다운: 출시 '달'만 정해져 있어 2029년 12월 1일 기준으로 셉니다
const dday = document.querySelector('[data-dday]');
if (dday) {
  const target = new Date('2029-12-01T00:00:00+09:00');
  const days = Math.ceil((target - Date.now()) / 86400000);
  dday.textContent = days > 0 ? `D-${days.toLocaleString('ko-KR')}` : '출시';
}

// 본문 등장
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .15 });
document.querySelectorAll('main section').forEach((s) => { s.classList.add('reveal'); io.observe(s); });
