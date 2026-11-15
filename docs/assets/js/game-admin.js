// 게임 관리자: Unity WebGL 빌드 폴더를 고르면 사이트에 바로 게임으로 올립니다.
// 여러 파일을 커밋 하나로 묶기 위해 Git Data API(blob → tree → commit → ref)를 씁니다.
// 토큰은 갤러리 관리자와 같은 키를 공유해 한 번만 입력하면 됩니다. 요청 대상은 api.github.com 하나뿐입니다.
const REPO = 'FTVOT-STUDIO/FTVOT-STUDIO.github.io';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}`;
const TOKEN_KEY = 'ftvot-gallery-token';
const ROOT = 'docs/games';
const MAX_FILE = 24 * 1024 * 1024; // Cloudflare Workers 정적 에셋 한도(25MiB) 아래로 유지
const CHUNK = 24 * 1024 * 1024;    // 이보다 큰 파일은 24MB 조각으로 나눠 올리고, game-sw.js가 이어 붙입니다
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const COVER_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = (t, remember) => { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); if (t) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch { /* 저장 불가 브라우저 */ } };

async function gh(path, token, options = {}) {
const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 180000); /* 큰 wasm 업로드를 고려해 3분 */
try {
const res = await fetch(`${API}${path}`, { ...options, signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
if (!res.ok) {
const msg = res.status === 401 ? '토큰이 올바르지 않거나 만료되었습니다.' : res.status === 403 ? '토큰에 이 저장소의 Contents 쓰기 권한이 없습니다.' : res.status === 422 ? '파일이 너무 크거나 요청 형식이 잘못되었습니다.' : res.status === 409 ? '다른 변경과 충돌했습니다. 다시 시도해 주세요.' : `GitHub 오류 (${res.status})`;
throw new Error(msg);
}
return res.status === 204 ? null : res.json();
} catch (e) { if (e.name === 'AbortError') throw new Error('GitHub 응답이 너무 늦습니다. 네트워크를 확인해 주세요.'); throw e; }
finally { clearTimeout(timer); }
}

const toBase64 = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(new Error('파일을 읽지 못했습니다.')); r.readAsDataURL(file); });
const utf8Base64 = (text) => { const bytes = new TextEncoder().encode(text); let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };
const mb = (n) => `${(n / 1048576).toFixed(1)}MB`;

// 빌드 폴더 분석: Build/ 안의 loader·data·framework·wasm을 찾고, GitHub Pages에서 못 쓰는 압축을 걸러냅니다
export function analyzeBuild(files) {
const list = [...files];
const rel = (f) => (f.webkitRelativePath || f.name).replace(/\\/g, '/');
const strip = (p) => { const parts = p.split('/'); const i = parts.indexOf('Build'); const j = parts.indexOf('StreamingAssets'); const k = i >= 0 ? i : j; return k >= 0 ? parts.slice(k).join('/') : (/\.(js|data|wasm|unityweb|symbols\.json)$/i.test(p) ? `Build/${parts.at(-1)}` : null); };
const entries = list.map((f) => ({ file: f, path: strip(rel(f)) })).filter((e) => e.path);
const build = entries.filter((e) => e.path.startsWith('Build/')).map((e) => e.path.slice(6));
const pick = (re) => build.find((n) => re.test(n));
const res = { entries, loader: pick(/\.loader\.js$/i), data: pick(/\.data(\.unityweb)?$/i), framework: pick(/\.framework\.js(\.unityweb)?$/i), wasm: pick(/\.wasm(\.unityweb)?$/i), symbols: pick(/\.symbols\.json(\.unityweb)?$/i), errors: [] };
if (build.some((n) => /\.(br|gz)$/i.test(n))) res.errors.push('Brotli/Gzip 압축 빌드는 GitHub Pages에서 실행되지 않습니다. Unity Player Settings → Publishing Settings에서 Compression Format을 Disabled로 하거나, Decompression Fallback을 켠 뒤 다시 빌드해 주세요.');
for (const k of ['loader', 'data', 'framework', 'wasm']) if (!res[k] && !res.errors.length) res.errors.push(`Build 폴더에서 ${k} 파일을 찾지 못했습니다. WebGL 빌드 결과 폴더 전체를 골라 주세요.`);
/* 큰 파일 자동 분할: 원래 경로는 manifest.chunks에 기록하고 실제로는 .part0, .part1 … 로 올립니다 */
res.chunks = {};
res.entries = entries.flatMap((e) => { if (e.file.size <= MAX_FILE) return [e];
const parts = Math.ceil(e.file.size / CHUNK); res.chunks[e.path] = { parts, size: e.file.size };
return Array.from({ length: parts }, (_, k) => ({ file: e.file.slice(k * CHUNK, Math.min(e.file.size, (k + 1) * CHUNK)), path: `${e.path}.part${k}` })); });
return res;
}

async function commitFiles(token, files, message, onStep) {
const ref = await gh(`/git/ref/heads/${BRANCH}`, token);
const head = await gh(`/git/commits/${ref.object.sha}`, token);
const tree = [];
let i = 0;
for (const f of files) {
i += 1; onStep?.(`올리는 중 ${i}/${files.length} · ${f.path.split('/').at(-1)}`);
if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
const blob = await gh('/git/blobs', token, { method: 'POST', body: JSON.stringify({ content: f.base64 ?? await toBase64(f.file), encoding: 'base64' }) });
tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
}
onStep?.('커밋 만드는 중');
const newTree = await gh('/git/trees', token, { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
const commit = await gh('/git/commits', token, { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
await gh(`/git/refs/heads/${BRANCH}`, token, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
}

async function readManifest(token) {
try { const f = await gh(`/contents/${ROOT}/manifest.json?ref=${BRANCH}`, token); const text = new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\n/g, '')), (c) => c.charCodeAt(0))); const d = JSON.parse(text); return Array.isArray(d) ? d : []; }
catch { return []; }
}
async function listPaths(token, slug) {
const ref = await gh(`/git/ref/heads/${BRANCH}`, token);
const t = await gh(`/git/trees/${ref.object.sha}?recursive=1`, token);
return t.tree.filter((n) => n.type === 'blob' && n.path.startsWith(`${ROOT}/${slug}/`)).map((n) => n.path);
}

const h = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); } n.append(...kids); return n; };

export function initGameAdmin() {
const trigger = document.querySelector('[data-game-admin]'); if (!trigger) return;
const dlg = h('dialog', { class: 'ga-dialog gm-dialog', 'aria-labelledby': 'gm-title' });
dlg.innerHTML = `<div class="ga-head"><h3 id="gm-title">게임 관리</h3><button type="button" class="gm-x" data-close aria-label="닫기">✕</button></div>
<div class="gm-body">
<section class="gm-token" data-token-box><p class="gm-hint">저장소 쓰기 권한(Contents: Read and write)이 있는 GitHub 토큰이 필요합니다. 그림 관리와 같은 토큰을 씁니다.</p>
<label class="gm-field"><span>GitHub 토큰</span><input type="password" data-token autocomplete="off" spellcheck="false"></label>
<label class="gm-check"><input type="checkbox" data-remember checked> 이 브라우저에 기억</label></section>
<form class="gm-form" data-form novalidate>
<h4>새 게임 올리기 / 같은 주소로 올리면 업데이트</h4>
<label class="gm-field"><span>게임 이름</span><input name="title" required maxlength="60" placeholder="Where Whale"></label>
<label class="gm-field"><span>주소 (영문 소문자·숫자·-)</span><input name="slug" required maxlength="48" pattern="[a-z0-9][a-z0-9-]*" placeholder="where-whale"></label>
<label class="gm-field"><span>한 줄 설명</span><input name="desc" maxlength="80" placeholder="클리커 · 4인 협업"></label>
<div class="gm-row"><label class="gm-field"><span>가로</span><input name="width" type="number" min="200" max="4096" value="1280"></label><label class="gm-field"><span>세로</span><input name="height" type="number" min="200" max="4096" value="720"></label></div>
<label class="gm-field"><span>WebGL 빌드 폴더 (index.html, Build/ 가 있는 폴더)</span><input name="folder" type="file" webkitdirectory multiple required></label>
<label class="gm-field"><span>표지 이미지 (선택)</span><input name="cover" type="file" accept="image/*"></label>
<p class="gm-scan" data-scan aria-live="polite"></p>
<button type="submit" class="gm-go">올리기</button>
</form>
<section class="gm-list"><h4>올라간 게임</h4><ul data-list></ul></section>
<p class="gm-status" data-status role="status" aria-live="polite"></p>
</div>`;
document.body.append(dlg);
const $ = (s) => dlg.querySelector(s), status = (t) => { $('[data-status]').textContent = t; };
const tokenIn = $('[data-token]'); tokenIn.value = getToken();
const token = () => { const t = tokenIn.value.trim(); if (!t) throw new Error('GitHub 토큰을 먼저 입력해 주세요.'); setToken(t, $('[data-remember]').checked); return t; };
let analysis = null;
const form = $('[data-form]');
form.folder.addEventListener('change', () => { analysis = analyzeBuild(form.folder.files);
$('[data-scan]').textContent = analysis.errors[0] || `확인됨 · ${analysis.entries.length}개 파일 · ${mb(analysis.entries.reduce((a, e) => a + e.file.size, 0))} · loader ${analysis.loader}`;
$('[data-scan]').toggleAttribute('data-bad', analysis.errors.length > 0); });
form.title.addEventListener('input', () => { if (!form.slug.dataset.touched) form.slug.value = form.title.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48); });
form.slug.addEventListener('input', () => { form.slug.dataset.touched = '1'; });

const busy = (on) => { dlg.toggleAttribute('data-busy', on); dlg.querySelectorAll('button, input').forEach((n) => { if (!n.matches('[data-close]')) n.disabled = on; }); };
const renderList = async () => {
const ul = $('[data-list]'); ul.replaceChildren();
let games = []; try { games = await (await fetch(`./games/manifest.json?t=${Date.now()}`, { cache: 'no-store' })).json(); } catch { /* 비어 있음 */ }
if (!Array.isArray(games) || !games.length) { ul.append(h('li', { class: 'gm-empty', text: '아직 없습니다.' })); return; }
games.forEach((g) => { const del = h('button', { type: 'button', class: 'gm-del', text: '삭제' });
del.addEventListener('click', async () => {
if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = '한 번 더 눌러 삭제'; setTimeout(() => { del.dataset.armed = ''; del.textContent = '삭제'; }, 3000); return; }
try { busy(true); const t = token(); status('삭제할 파일 찾는 중');
const paths = await listPaths(t, g.slug), manifest = (await readManifest(t)).filter((x) => x.slug !== g.slug);
await commitFiles(t, [...paths.map((p) => ({ path: p, delete: true })), { path: `${ROOT}/manifest.json`, base64: utf8Base64(`${JSON.stringify(manifest, null, 2)}\n`) }], `게임 삭제: ${g.title}`, status);
status(`삭제했습니다. 1~2분 뒤 사이트에 반영됩니다.`); setTimeout(() => document.dispatchEvent(new Event('games:changed')), 90000);
} catch (e) { status(e.message); } finally { busy(false); renderList(); } });
ul.append(h('li', {}, h('a', { href: `./play.html?g=${encodeURIComponent(g.slug)}`, text: g.title }), h('span', { class: 'mono', text: g.slug }), del)); });
};

form.addEventListener('submit', async (ev) => {
ev.preventDefault();
try {
const t = token(), title = form.title.value.trim(), slug = form.slug.value.trim();
if (!title) throw new Error('게임 이름을 입력해 주세요.');
if (!SLUG_RE.test(slug)) throw new Error('주소는 영문 소문자, 숫자, -만 쓸 수 있습니다.');
if (!analysis) analysis = analyzeBuild(form.folder.files);
if (analysis.errors.length) throw new Error(analysis.errors[0]);
busy(true);
const files = analysis.entries.map((e) => ({ path: `${ROOT}/${slug}/${e.path}`, file: e.file }));
let cover = '';
const cf = form.cover.files[0];
if (cf) { if (!COVER_RE.test(cf.name) || cf.size > 10 * 1048576) throw new Error('표지는 10MB 이하 이미지만 쓸 수 있습니다.'); cover = `cover${cf.name.match(COVER_RE)[0].toLowerCase()}`; files.push({ path: `${ROOT}/${slug}/${cover}`, file: cf }); }
status('기존 목록 확인 중');
const manifest = await readManifest(t), prev = manifest.find((g) => g.slug === slug);
/* 업데이트면 예전 빌드 파일 중 이번에 없는 것은 지워 저장소가 불지 않게 합니다 */
const keep = new Set(files.map((f) => f.path));
const stale = prev ? (await listPaths(t, slug)).filter((p) => !keep.has(p) && !(prev.cover && !cover && p.endsWith(`/${prev.cover}`))) : [];
const entry = { slug, title, desc: form.desc.value.trim(), width: Number(form.width.value) || 1280, height: Number(form.height.value) || 720, cover: cover || prev?.cover || '', updated: new Date().toISOString().slice(0, 10),
chunks: analysis.chunks || {}, build: { loader: analysis.loader, data: analysis.data, framework: analysis.framework, wasm: analysis.wasm, ...(analysis.symbols ? { symbols: analysis.symbols } : {}) } };
const next = prev ? manifest.map((g) => (g.slug === slug ? entry : g)) : [entry, ...manifest];
files.push({ path: `${ROOT}/manifest.json`, base64: utf8Base64(`${JSON.stringify(next, null, 2)}\n`) });
await commitFiles(t, [...files, ...stale.map((p) => ({ path: p, delete: true }))], `${prev ? '게임 업데이트' : '게임 추가'}: ${title}`, status);
status(`${prev ? '업데이트' : '업로드'} 완료. GitHub Pages 배포까지 1~2분 걸립니다.`);
form.reset(); delete form.slug.dataset.touched; analysis = null; $('[data-scan]').textContent = '';
setTimeout(() => document.dispatchEvent(new Event('games:changed')), 90000);
} catch (e) { status(e.message); } finally { busy(false); renderList(); }
});
$('[data-close]').addEventListener('click', () => dlg.close());
trigger.addEventListener('click', () => { renderList(); dlg.showModal(); });
}
