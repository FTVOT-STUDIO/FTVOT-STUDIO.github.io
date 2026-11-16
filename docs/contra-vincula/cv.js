// Contra Vincula 소개 페이지: 레이어 시차, 출시 카운트다운, 스크롤 등장
// 새로고침하면 항상 맨 위에서 시작합니다(브라우저의 스크롤 위치 복원 끔, 주소의 #위치도 지움)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
scrollTo(0, 0);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers = [...document.querySelectorAll('[data-stage] .ly')];

// 초기 로딩: 첫 화면 레이어·파편·로고·인물 그림을 미리 받으며 진행률을 보여 주고, 다 받으면 사슬이 끊기듯 화면이 갈라지며 열립니다
const loader = document.querySelector('[data-loader]'), ldFill = document.querySelector('[data-ld-fill]'), ldPct = document.querySelector('[data-ld-pct]');
const imgs = layers.map((l) => (l.tagName === 'IMG' ? l : l.querySelector('img')));
const extra = ['./assets/shard.png', document.querySelector('.logo')?.src, ...[...document.querySelectorAll('.portrait')].map((i) => i.src)].filter(Boolean);
const total = imgs.length + extra.length; let loaded = 0, shown = 0, opened = false;
const reveal = () => { layers.forEach((l) => l.classList.add('is-in')); document.body.classList.add('is-ready'); };
const open = () => {
  if (opened) return; opened = true; scrollTo(0, 0);
  if (!loader) { reveal(); return; }
  loader.classList.add('is-done'); document.body.classList.remove('is-loading');
  setTimeout(reveal, 350); setTimeout(() => loader.remove(), 1600);
};
const bump = () => { loaded = Math.min(total, loaded + 1); };
imgs.forEach((l) => { if (l.complete) bump(); else { l.addEventListener('load', bump, { once: true }); l.addEventListener('error', bump, { once: true }); } });
extra.forEach((src) => { const i = new Image(); i.onload = i.onerror = bump; i.src = src; });
// 숫자가 튀지 않게 표시값이 실제 진행률을 부드럽게 따라갑니다
const tickLoad = () => {
  const target = loaded / total * 100; shown = Math.min(target, shown + Math.max(.8, (target - shown) * .15));
  if (ldFill) ldFill.style.clipPath = `inset(0 ${100 - shown}% 0 0)`; if (ldPct) ldPct.textContent = Math.floor(shown);
  if (shown >= 100) setTimeout(open, 250); else setTimeout(tickLoad, 16);
};
requestAnimationFrame(tickLoad);
setTimeout(() => { loaded = total; }, 12000); // 아주 느린 연결이면 12초 뒤에는 열어 줍니다

// 시차: 마우스(데스크톱)와 스크롤 양쪽을 부드럽게 따라갑니다
if (!reduce) {
  let mx = 0, my = 0, cx = 0, cy = 0, sy = 0, px = 0, py = 0, lastPX = 0, lastPY = 0, hasMouse = false;
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
    px += (lookX - px) * .05; py += (lookY - py) * .05;
    // 떨림 방지: 0.05px 미만 변화는 건너뛰고, 값은 0.01% 단위로 고정해 매 프레임 미세하게 흔들리지 않게
    const ppx = Math.round(px * 80) / 100, ppy = Math.round(py * 50) / 100;
    if (pupil && (ppx !== lastPX || ppy !== lastPY)) { pupil.style.transform = `translate3d(${ppx}%, ${ppy}%, 0)`; lastPX = ppx; lastPY = ppy; }
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

// 바람 이펙트: 붉은 테두리 파편이 오른쪽에서 왼쪽으로 바람에 휘날립니다
const wind = document.querySelector('[data-wind]');
if (wind && !reduce) {
  const ctx = wind.getContext('2d'), shard = new Image(); shard.src = './assets/shard.png';
  let W = 0, H = 0, dpr = 1, parts = [], last = performance.now(), gust = 0, visible = true;
  const fit = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = wind.clientWidth; H = wind.clientHeight; wind.width = W * dpr; wind.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const COUNT = () => Math.round(Math.min(34, Math.max(14, W / 50)));
  const spawn = (anywhere) => { const z = Math.random(); return { x: anywhere ? Math.random() * W : W + 40 + Math.random() * 200, y: Math.random() * H * 1.1 - H * .05, z, size: 8 + z * 30, vx: -(70 + z * 260), phase: Math.random() * 6.28, spin: (Math.random() - .5) * 3, rot: Math.random() * 6.28, flip: Math.random() * 6.28, flipV: 1.5 + Math.random() * 3 }; };
  const init = () => { fit(); parts = Array.from({ length: COUNT() }, () => spawn(true)).sort((a, b) => a.z - b.z); };
  addEventListener('resize', init);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wind);
  const frame = (t) => {
    const dt = Math.min((t - last) / 1000, .05); last = t;
    if (visible && shard.complete && shard.naturalWidth) {
      gust = Math.sin(t / 2300) * .5 + Math.sin(t / 900) * .2; // 바람 세기가 주기적으로 오르내림
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        const speed = 1 + Math.max(0, gust) * .9;
        p.x += p.vx * speed * dt; p.phase += dt * (1.2 + p.z);
        p.y += (Math.sin(p.phase) * 40 * (1 - p.z * .4) - gust * 30) * dt;
        p.rot += p.spin * speed * dt; p.flip += p.flipV * speed * dt;
        if (p.x < -60 || p.y < -80 || p.y > H + 80) Object.assign(p, spawn(false));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.flip), 1); // 뒤집히며 펄럭이는 느낌
        ctx.globalAlpha = .45 + p.z * .55; ctx.filter = p.z < .35 ? 'blur(1.5px)' : 'none'; // 먼 파편은 흐리게
        ctx.drawImage(shard, -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
      }
    }
    requestAnimationFrame(frame);
  };
  init(); requestAnimationFrame(frame);
}

// 7일: 고른 날까지 사슬이 차오르고 남은 날을 알려 줍니다
(() => {
  const btns = [...document.querySelectorAll('[data-day]')], fill = document.querySelector('[data-day-fill]'), cap = document.querySelector('[data-day-cap]');
  if (!btns.length) return;
  const TXT = { ko: (n) => `<b>DIES ${['I','II','III','IV','V','VI','VII'][n - 1]}</b> · 안개가 걷히기까지 ${7 - n}일`, en: (n) => `<b>DIES ${['I','II','III','IV','V','VI','VII'][n - 1]}</b> · ${7 - n} day${7 - n === 1 ? '' : 's'} until the mist lifts`, ja: (n) => `<b>DIES ${['I','II','III','IV','V','VI','VII'][n - 1]}</b> · 霧が晴れるまで${7 - n}日` };
  let cur = 1;
  const set = (n) => { cur = n; btns.forEach((b, i) => { b.classList.toggle('is-past', i + 1 < n); b.classList.toggle('is-now', i + 1 === n); b.setAttribute('aria-pressed', String(i + 1 === n)); });
    if (fill) fill.style.transform = `scaleX(${n / 7})`; const f = TXT[document.documentElement.lang] || TXT.ko; if (cap) cap.innerHTML = f(n); };
  btns.forEach((b) => { const n = Number(b.dataset.day); b.addEventListener('mouseenter', () => set(n)); b.addEventListener('focus', () => set(n)); b.addEventListener('click', () => set(n)); });
  new MutationObserver(() => set(cur)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  set(1);
  // 스크롤로 이야기 구간을 지나가는 만큼 하루씩 넘어갑니다
  const story = document.getElementById('story'); let raf = 0;
  const onScroll = () => { raf = 0; const r = story.getBoundingClientRect(); const k = (innerHeight * .7 - r.top) / Math.max(1, r.height - innerHeight * .3); const n = Math.max(1, Math.min(7, Math.ceil(k * 7))); if (n !== cur) set(n); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true });
})();

// 사이트 간 균열 전환: 메인 사이트에서 들어올 때는 마법진이 오므라들며 로딩 화면으로 이어지고, 돌아갈 때는 누른 자리에서 균열이 열립니다
(() => {
  const build = () => { const el = document.createElement('div'); el.className = 'gate'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<div class="gate-bg"></div><img class="gate-sigil" src="./assets/portal-sigil.svg" alt="" decoding="sync">'; document.body.append(el); return el; };
  const q = new URLSearchParams(location.search);
  if (q.get('portal') === '1') {
    history.replaceState(null, '', location.pathname);
    if (!reduce) { const el = build(); const r = Math.hypot(innerWidth, innerHeight) / 2 + 40;
      el.animate([{ clipPath: `circle(${r}px at 50% 50%)` }, { clipPath: 'circle(0px at 50% 50%)' }], { duration: 900, delay: 200, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
      el.querySelector('.gate-sigil').animate([{ transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(.15) rotate(120deg)', opacity: 0 }], { duration: 900, delay: 200, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }); }
  }
  document.querySelectorAll('[data-gate]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reduce) return;
    e.preventDefault(); const x = e.clientX, y = e.clientY, el = build(), r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }], { duration: 650, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    el.querySelector('.gate-sigil').animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(-90deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    if (bgm && !bgm.paused) { const v0 = bgm.volume; const t0 = performance.now(); const f = (t) => { const k = Math.min((t - t0) / 600, 1); bgm.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
    setTimeout(() => { location.href = a.href; }, 700);
  }));
})();
