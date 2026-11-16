// Contra Vincula 소개 페이지: 레이어 시차, 출시 카운트다운, 스크롤 등장
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers = [...document.querySelectorAll('[data-stage] .ly')];

// 레이어가 모두 받아지면 함께 켜서 한 장씩 따로 뜨는 어색함을 막습니다
let loaded = 0;
const imgs = layers.map((l) => (l.tagName === 'IMG' ? l : l.querySelector('img')));
const ready = () => { layers.forEach((l) => l.classList.add('is-in')); document.body.classList.add('is-ready'); };
imgs.forEach((l) => { if (l.complete) loaded++; else l.addEventListener('load', () => { if (++loaded === imgs.length) ready(); }, { once: true }); l.addEventListener('error', () => { if (++loaded === imgs.length) ready(); }, { once: true }); });
if (loaded === imgs.length) ready();
setTimeout(ready, 6000); // 느린 연결에서도 6초 뒤에는 보여 줍니다

// 시차: 마우스(데스크톱)와 스크롤 양쪽을 부드럽게 따라갑니다
if (!reduce) {
  let mx = 0, my = 0, cx = 0, cy = 0, sy = 0, px = 0, py = 0, hasMouse = false;
  const pupil = document.querySelector('[data-pupil]');
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; hasMouse = true; mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const depth = layers.map((l) => Number(l.dataset.depth) || 0);
  const isBody = layers.map((l) => l.classList.contains('body'));
  const tick = () => {
    cx += (mx - cx) * .06; cy += (my - cy) * .06; sy = Math.min(scrollY, innerHeight);
    // 숨쉬기: 몸 레이어만 약 4.2초 주기로 아주 살짝 위아래로 늘었다 줄어듭니다 (엉덩이 쪽을 기준점으로)
    const breath = (Math.sin(performance.now() / 4200 * Math.PI * 2) + 1) / 2;
    // 눈동자: 마우스를 따라 눈 안에서만 움직입니다(눈 모양 마스크로 잘라 눈꺼풀 밖으로 나가지 않음). 마우스가 없으면 천천히 두리번거립니다
    const now = performance.now() / 1000;
    const lookX = hasMouse ? mx : Math.sin(now * .35) * .35, lookY = hasMouse ? my : Math.sin(now * .23) * .2;
    px += (lookX - px) * .08; py += (lookY - py) * .08;
    if (pupil) pupil.style.transform = `translate(${px * .8}%, ${py * .5}%)`;
    layers.forEach((l, i) => { const d = depth[i]; const b = isBody[i] ? breath : 0; l.style.transform = `translate3d(${-cx * d * 260}px, ${-cy * d * 160 + sy * d * 1.4 - b * 3}px, 0) scale(${1 + d * .2}, ${1 + d * .2 + b * .008})`; });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 출시 카운트다운: 출시 '달'만 정해져 있어 2029년 12월 1일 0시(한국 시간) 기준으로 1초마다 셉니다
const dday = document.querySelector('[data-dday]');
if (dday) {
  const target = new Date('2029-12-01T00:00:00+09:00').getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const left = Math.max(0, target - Date.now());
    if (!left) { dday.textContent = '출시'; return; }
    const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    dday.textContent = `D-${d.toLocaleString('ko-KR')} ${pad(h)}:${pad(m)}:${pad(s % 60)}`;
    setTimeout(tick, 1000 - (Date.now() % 1000)); // 초가 바뀌는 순간에 맞춰 갱신
  };
  tick();
}

// 본문 등장
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .15 });
document.querySelectorAll('main section').forEach((s) => { s.classList.add('reveal'); io.observe(s); });

// 배경음: 브라우저 정책상 자동 재생이 막혀 있어 첫 클릭·터치·키 입력 때 켭니다. 끈 상태는 기억합니다
const bgmBtn = document.querySelector('[data-bgm]'), bgm = document.querySelector('[data-bgm-audio]'), bgmLabel = document.querySelector('[data-bgm-label]');
if (bgmBtn && bgm) {
  const TARGET = .45; let fade = 0;
  const set = (on) => { bgmBtn.setAttribute('aria-pressed', String(on)); const t = on ? '배경음 끄기' : '배경음 켜기'; bgmBtn.title = t; bgmLabel.textContent = t; };
  const ramp = (to, done) => { cancelAnimationFrame(fade); const from = bgm.volume, t0 = performance.now(); const step = (t) => { const k = Math.min((t - t0) / 900, 1); bgm.volume = from + (to - from) * k; if (k < 1) fade = requestAnimationFrame(step); else done?.(); }; fade = requestAnimationFrame(step); };
  const play = () => { bgm.volume = 0; bgm.play().then(() => { set(true); ramp(TARGET); }).catch(() => set(false)); };
  const stop = () => { set(false); ramp(0, () => bgm.pause()); };
  let off = false; try { off = localStorage.getItem('cv-bgm') === 'off'; } catch {}
  bgmBtn.addEventListener('click', (e) => { e.stopPropagation(); if (bgm.paused) { play(); try { localStorage.removeItem('cv-bgm'); } catch {} } else { stop(); try { localStorage.setItem('cv-bgm', 'off'); } catch {} } });
  const first = () => { ['pointerdown', 'keydown'].forEach((t) => removeEventListener(t, first)); if (!off && bgm.paused) play(); };
  ['pointerdown', 'keydown'].forEach((t) => addEventListener(t, first, { once: true }));
}
