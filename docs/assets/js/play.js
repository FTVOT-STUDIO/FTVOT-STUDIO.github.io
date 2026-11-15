// Unity WebGL 플레이어: play.html?g=<slug> → manifest.json에서 빌드 파일 이름을 찾아 createUnityInstance로 실행합니다.
import { loadManifest } from './games.js?v=20261118a';

const $ = (s) => document.querySelector(s);
const showError = (msg) => { $('[data-load]').hidden = true; const e = $('[data-error]'); e.textContent = msg; e.hidden = false; };
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

const loadScript = (src) => new Promise((resolve, reject) => {
const s = document.createElement('script'); s.src = src; s.onload = resolve;
s.onerror = () => reject(new Error('로더 스크립트를 불러오지 못했습니다.')); document.body.append(s);
});

(async () => {
const slug = new URLSearchParams(location.search).get('g') || '';
if (!SLUG_RE.test(slug)) { showError('잘못된 게임 주소입니다.'); return; }
const game = (await loadManifest()).find((g) => g.slug === slug);
if (!game) { showError('이 게임을 찾지 못했습니다. 목록에서 다시 선택해 주세요.'); return; }
document.title = `${game.title} | FTVOT_STUDIO`; $('[data-title]').textContent = game.title;
const w = Number(game.width) || 1280, h = Number(game.height) || 720;
document.documentElement.style.setProperty('--ar', `${w} / ${h}`); document.documentElement.style.setProperty('--arn', String(w / h));
const base = `./games/${slug}/Build/`, b = game.build || {};
if (!b.loader || !b.data || !b.framework || !b.wasm) { showError('빌드 정보가 불완전합니다. 게임을 다시 올려 주세요.'); return; }
/* 조각난 큰 파일이 있으면 서비스 워커가 이어 붙여 주도록 먼저 등록하고, 이 페이지를 맡을 때까지 기다립니다 */
if (game.chunks && Object.keys(game.chunks).length) {
if (!('serviceWorker' in navigator)) { showError('이 브라우저는 큰 게임 파일을 불러올 수 없습니다. 최신 Chrome, Edge, Safari에서 열어 주세요.'); return; }
try {
const reg = await navigator.serviceWorker.register('./game-sw.js', { scope: './' });
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller) await new Promise((r) => { navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }); setTimeout(r, 3000); });
(reg.active || navigator.serviceWorker.controller)?.postMessage('refresh');
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
streamingAssetsUrl: `./games/${slug}/StreamingAssets`,
companyName: 'FTVOT_STUDIO', productName: game.title, productVersion: String(game.updated || '1'),
}, (p) => { fill.style.transform = `scaleX(${p})`; pct.textContent = `${Math.round(p * 100)}%`; });
$('[data-load]').hidden = true; canvas.focus();
$('[data-full]').addEventListener('click', () => instance.SetFullscreen(1));
} catch (e) {
showError(`게임을 시작하지 못했습니다. ${String(e?.message || e).slice(0, 200)}`);
}
})();
