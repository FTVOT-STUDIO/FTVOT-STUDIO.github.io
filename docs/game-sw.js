// 게임 서비스 워커: GitHub는 100MB가 넘는 파일을 못 올리므로 큰 파일을 90MB 조각(.part0, .part1 …)으로 나눠 둡니다.
// 게임이 원래 파일 주소를 요청하면 여기서 조각들을 이어 붙여 하나의 파일처럼 돌려줍니다. 게임 코드는 손대지 않아도 됩니다.
const MANIFEST = './games/manifest.json';
let table = null; // { 절대 URL 경로: { parts, size } }

async function loadTable() {
const res = await fetch(`${MANIFEST}?t=${Date.now()}`, { cache: 'no-store' });
const games = res.ok ? await res.json() : [];
const map = new Map(), base = new URL('./games/', self.registration.scope);
for (const g of Array.isArray(games) ? games : []) for (const [path, info] of Object.entries(g.chunks || {})) map.set(new URL(`${g.slug}/${path}`, base).pathname, info);
return map;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => { if (e.data === 'refresh') table = null; });

self.addEventListener('fetch', (event) => {
const url = new URL(event.request.url);
if (url.origin !== location.origin || event.request.method !== 'GET' || !url.pathname.includes('/games/')) return;
event.respondWith((async () => {
try { table ??= await loadTable(); } catch { table = new Map(); }
const info = table.get(url.pathname);
if (!info) return fetch(event.request);
let i = 0;
/* 조각을 하나씩 순서대로 받아 흘려보냅니다: 280MB여도 메모리에 한꺼번에 올리지 않습니다 */
const stream = new ReadableStream({
async pull(ctrl) {
if (i >= info.parts) { ctrl.close(); return; }
const r = await fetch(`${url.pathname}.part${i}`); if (!r.ok) { ctrl.error(new Error(`part${i} ${r.status}`)); return; }
i += 1; const reader = r.body.getReader();
for (;;) { const { done, value } = await reader.read(); if (done) break; ctrl.enqueue(value); }
},
});
return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(info.size) } });
})());
});
