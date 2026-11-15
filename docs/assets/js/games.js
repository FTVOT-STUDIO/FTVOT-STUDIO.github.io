// 플레이 가능한 게임 목록: games/manifest.json을 읽어 헤세드 장에 카드로 그립니다.
// 카드를 누르면 play.html?g=<slug> 에서 Unity WebGL 빌드가 실행됩니다.
const MANIFEST = './games/manifest.json';

export async function loadManifest() {
try {
const res = await fetch(`${MANIFEST}?t=${Date.now()}`, { cache: 'no-store' }); /* 업로드 직후 바로 보이도록 캐시 우회 */
if (!res.ok) return [];
const data = await res.json();
return Array.isArray(data) ? data.filter((g) => g && typeof g.slug === 'string' && typeof g.title === 'string') : [];
} catch { return []; }
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export async function initGames() {
const host = document.querySelector('[data-games]'); if (!host) return;
const render = async () => {
const games = await loadManifest();
host.replaceChildren();
host.closest('.games-block')?.toggleAttribute('data-empty', games.length === 0);
if (!games.length) { host.append(el('p', 'games-empty', '아직 올라온 게임이 없습니다.')); return; }
games.forEach((g, i) => {
const a = el('a', 'game-card'); a.href = `./play.html?g=${encodeURIComponent(g.slug)}`;
const cover = el('span', 'game-cover');
if (g.cover) { const img = el('img'); img.src = `./games/${g.slug}/${g.cover}`; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; cover.append(img); }
else cover.append(el('span', 'game-cover-fallback mono', g.title.slice(0, 2).toUpperCase()));
cover.append(el('span', 'game-play mono', 'PLAY ▶'));
const info = el('span', 'game-info');
info.append(el('span', 'game-idx mono', String(i + 1).padStart(2, '0')), el('b', '', g.title));
if (g.desc) info.append(el('span', 'game-desc', g.desc));
a.append(cover, info); host.append(a);
});
};
await render();
document.addEventListener('games:changed', render);
}
