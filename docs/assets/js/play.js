// Unity WebGL 플레이어: play.html?g=<slug> → manifest.json에서 빌드 파일 이름을 찾아 createUnityInstance로 실행합니다.
import { loadManifest } from './games.js?v=20261118a';

const $ = (s) => document.querySelector(s);
/* 로딩 로그: 진행률 구간마다 한 줄씩, 인트로의 터미널 로그와 같은 말투 */
const log = (text) => { const ol = $('[data-log]'); if (!ol) return; const li = document.createElement('li'); li.textContent = text; ol.append(li); while (ol.children.length > 4) ol.firstElementChild.remove(); };
const STEPS = [[0, 'open qlipha/gamaliel'], [.15, 'fetch fiction.data'], [.5, 'decode distorted world'], [.85, 'compile possibilities'], [.95, 'wake']];
/* 배경 우주: 별 + 위로 떠오르는 붉은 재. 움직임 줄이기 설정이면 정지된 별만 */
(() => { const cv = document.querySelector('[data-sky]'); if (!cv) return; const ctx = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W = 0, H = 0, stars = [], ash = [];
const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
stars = Array.from({ length: Math.round(W * H / 5000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + .2, a: Math.random() * .6 + .2, p: Math.random() * 6.28 }));
ash = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .4, v: Math.random() * 14 + 6, p: Math.random() * 6.28 })); };
let last = 0; const draw = (t) => { const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; ctx.clearRect(0, 0, W, H);
for (const s of stars) { s.p += dt * .8; ctx.fillStyle = `rgba(255,240,240,${s.a * (.7 + .3 * Math.sin(s.p))})`; ctx.fillRect(s.x, s.y, s.r, s.r); }
for (const a of ash) { a.y -= a.v * dt; a.p += dt; a.x += Math.sin(a.p) * .25; if (a.y < -6) { a.y = H + 6; a.x = Math.random() * W; } ctx.fillStyle = `rgba(255,110,90,${.5 * Math.min(1, a.y / H + .15)})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill(); }
if (!reduce && !document.hidden) requestAnimationFrame(draw); };
size(); addEventListener('resize', size, { passive: true }); requestAnimationFrame(draw);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(draw); }); })();
const showError = (msg) => { $('[data-load]').hidden = true; /* 오류 시 로딩층을 걷고 안내만 남깁니다 */ const e = $('[data-error]'); e.textContent = msg; e.hidden = false; };
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
/* 게임 빌드는 Cloudflare(한국에서 매우 느림) 대신 GitHub Pages에서 직접 받습니다. 로컬 테스트·github.io에서는 같은 출처 */
const BUILD_ORIGIN = /^(localhost|127\.0\.0\.1|ftvot-studio\.github\.io)$/.test(location.hostname) ? '' : 'https://ftvot-studio.github.io';

const loadScript = (src) => new Promise((resolve, reject) => {
const s = document.createElement('script'); s.src = src; s.onload = resolve;
s.onerror = () => reject(new Error('로더 스크립트를 불러오지 못했습니다.')); document.body.append(s);
});

(async () => {
const slug = new URLSearchParams(location.search).get('g') || '';
if (!SLUG_RE.test(slug)) { showError('잘못된 게임 주소입니다.'); return; }
const game = (await loadManifest()).find((g) => g.slug === slug);
if (!game) { showError('이 게임을 찾지 못했습니다. 목록에서 다시 선택해 주세요.'); return; }
document.title = `${game.title} | FTVOT STUDIO`; $('[data-title]').textContent = game.title;
const w = Number(game.width) || 1280, h = Number(game.height) || 720;
document.documentElement.style.setProperty('--ar', `${w} / ${h}`); document.documentElement.style.setProperty('--arn', String(w / h));
const base = `${BUILD_ORIGIN || '.'}/games/${slug}/Build/`, b = game.build || {};
if (!b.loader || !b.data || !b.framework || !b.wasm) { showError('빌드 정보가 불완전합니다. 게임을 다시 올려 주세요.'); return; }
/* 조각난 큰 파일이 있으면 서비스 워커가 이어 붙여 주도록 먼저 등록하고, 이 페이지를 맡을 때까지 기다립니다 */
if (game.chunks && Object.keys(game.chunks).length) {
if (!('serviceWorker' in navigator)) { showError('이 브라우저는 큰 게임 파일을 불러올 수 없습니다. 최신 Chrome, Edge, Safari에서 열어 주세요.'); return; }
try {
const reg = await navigator.serviceWorker.register('./game-sw.js', { scope: './' });
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller) await new Promise((r) => { navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }); setTimeout(r, 3000); });
(reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'refresh', origin: BUILD_ORIGIN || location.origin });
if (!navigator.serviceWorker.controller) { location.reload(); return; }
} catch { showError('게임 파일 연결기를 준비하지 못했습니다. 새로고침해 주세요.'); return; }
}
try { await loadScript(base + b.loader); } catch (e) { showError(e.message); return; }
if (typeof window.createUnityInstance !== 'function') { showError('Unity 로더 형식이 아닙니다. WebGL 빌드의 Build 폴더를 올렸는지 확인해 주세요.'); return; }
const canvas = $('#unity-canvas'), fill = $('[data-fill]'), pct = $('[data-pct]');
try {
const instance = await window.createUnityInstance(canvas, {
dataUrl: base + b.data, frameworkUrl: base + b.framework, codeUrl: base + b.wasm,
...(b.symbols ? { symbolsUrl: base + b.symbols } : {}),
streamingAssetsUrl: `${BUILD_ORIGIN || '.'}/games/${slug}/StreamingAssets`,
companyName: 'FTVOT_STUDIO', productName: game.title, productVersion: String(game.updated || '1'),
}, (p) => { fill.style.transform = `scaleX(${p})`; pct.textContent = `${Math.round(p * 100)}%`; while (STEPS.length && p >= STEPS[0][0]) log(STEPS.shift()[1]); });
$('[data-load]').hidden = true; canvas.focus();
$('[data-full]').addEventListener('click', () => instance.SetFullscreen(1));
log('ready');
} catch (e) {
showError(`게임을 시작하지 못했습니다. ${String(e?.message || e).slice(0, 200)}`);
}
})();

/* 돌아가기 전환: 화면이 어둡게 가라앉은 뒤 홈으로 이동하고, 홈에서는 같은 어둠에서 클리포트가 떠오르며 이어집니다 */
document.querySelector('.pl-back')?.addEventListener('click', (e) => {
if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
e.preventDefault();
try { sessionStorage.setItem('ftvot-return', 'play'); } catch { /* 저장소 없음 */ }
const href = e.currentTarget.href;
if (window.__portalGo) window.__portalGo(href, e.clientX, e.clientY); else location.href = href;
});
