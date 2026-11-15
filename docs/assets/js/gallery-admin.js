import { createProgress, xhrJSON } from './progress-ui.js?v=20261118a';
// 갤러리 관리자: 사이트에서 바로 그림을 올리고, 이름을 바꾸고, 지울 수 있게 합니다.
// GitHub Pages는 서버가 없어서, 저장소 주인의 GitHub 토큰으로 브라우저에서 직접 GitHub API에 커밋합니다.
// 토큰은 이 브라우저에만 저장되고 다른 곳으로 보내지지 않습니다 (요청 대상은 api.github.com 하나뿐).
const REPO = 'FTVOT-STUDIO/FTVOT-STUDIO.github.io';
const BRANCH = 'main';
const DIR = 'docs/assets/gallery';
const API = `https://api.github.com/repos/${REPO}`;
const TOKEN_KEY = 'ftvot-gallery-token';
const MAX_BYTES = 95 * 1024 * 1024; // GitHub 파일 한도(100MB) 바로 아래까지 허용
const SHRINK_OVER = 8 * 1024 * 1024; // 이보다 큰 그림은 화질을 거의 유지한 채 WebP로 자동 압축 (움직이는 GIF 제외)
const MAX_SIDE = 6000;            // 압축할 때 긴 변 최대 픽셀
const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

// 파일 이름 정리: 경로 문자·제어 문자를 막고, 확장자는 원래 것을 유지합니다
function safeName(raw, ext) {
const base = String(raw).normalize('NFC').replace(/\.[^.]+$/, '').replace(/[\\/\u0000-\u001f<>:"|?*]+/g, ' ').replace(/^[._\s]+/, '').trim().slice(0, 120);
return base ? `${base}${ext}` : '';
}
const extOf = (name) => (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase();

function getToken() {
try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function setToken(token, remember) {
try {
localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
} catch { /* 저장이 막힌 브라우저에서는 이번 탭에서만 씁니다 */ }
}

async function gh(path, token, options = {}) {
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 60000);
try {
const response = await fetch(`${API}${path}`, {
...options,
signal: controller.signal,
credentials: 'omit',
referrerPolicy: 'no-referrer',
headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
});
if (!response.ok) {
const detail = await response.json().catch(() => ({}));
const reason = response.status === 401 ? '토큰이 올바르지 않거나 만료되었습니다.' : response.status === 403 ? '토큰에 이 저장소의 Contents 쓰기 권한이 없습니다.' : response.status === 409 || response.status === 422 ? '같은 이름의 파일이 있거나, 방금 다른 변경과 겹쳤습니다. 목록을 새로고침해 주세요.' : detail.message || `GitHub 응답 ${response.status}`;
throw new Error(reason);
}
return response.status === 204 ? null : response.json();
} catch (error) {
if (error.name === 'AbortError') throw new Error('GitHub 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요.');
throw error;
} finally { clearTimeout(timer); }
}

const fileToBase64 = (file) => new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
reader.readAsDataURL(file);
});
// 큰 그림 자동 압축: 브라우저에서 WebP(품질 0.92)로 다시 인코딩합니다. 결과가 더 크면 원본을 그대로 씁니다
async function shrink(file) {
if (file.size <= SHRINK_OVER || /\.gif$/i.test(file.name)) return { file, name: file.name };
try {
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
const canvas = document.createElement('canvas');
canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
bitmap.close?.();
const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
if (!blob || blob.size >= file.size) return { file, name: file.name };
return { file: blob, name: file.name.replace(/\.[^.]+$/, '.webp') };
} catch { return { file, name: file.name }; }
}
// 갤러리 목록용 썸네일(긴 변 900px, WebP)을 브라우저에서 만듭니다. 실패하면 썸네일 없이 진행합니다
async function makeThumb(file) {
try {
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
const canvas = document.createElement('canvas');
canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
return await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
} catch { return null; }
}
const thumbPath = (name) => `/contents/${DIR}/thumbs/${encodeURIComponent(name.replace(/\.[^.]+$/, ''))}.webp`;
// 썸네일 파일의 현재 sha (교체·삭제에 필요). 없으면 null
async function thumbSha(name, token) { try { return (await gh(`${thumbPath(name)}?ref=${BRANCH}`, token)).sha; } catch { return null; } }
const pathOf = (name) => `/contents/${DIR}/${encodeURIComponent(name)}`;

function el(tag, attrs = {}, ...children) {
const node = document.createElement(tag);
for (const [k, v] of Object.entries(attrs)) { if (k === 'class') node.className = v; else if (k === 'text') node.textContent = v; else node.setAttribute(k, v); }
node.append(...children);
return node;
}

export function initGalleryAdmin() {
const trigger = document.querySelector('[data-gallery-admin]');
if (!trigger) return;
let files = [];
let busy = false;

const status = el('p', { class: 'ga-status', role: 'status', 'aria-live': 'polite' });
const progress = createProgress('tiferet'); /* 업로드 진행률 */
const tokenInput = el('input', { type: 'password', class: 'ga-input', id: 'ga-token', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
const remember = el('input', { type: 'checkbox', id: 'ga-remember' });
const tokenForm = el('form', { class: 'ga-token' },
el('label', { for: 'ga-token', text: 'GitHub 토큰' }),
el('p', { class: 'ga-help', text: `저장소 ${REPO}에 대한 Contents 읽기·쓰기 권한만 준 Fine-grained 토큰을 넣어 주세요. 토큰은 이 브라우저에만 저장됩니다.` }),
tokenInput,
el('label', { class: 'ga-check', for: 'ga-remember' }, remember, el('span', { text: '이 기기에서 기억하기' })),
el('button', { type: 'submit', class: 'ga-btn ga-primary', text: '연결' }));

const fileInput = el('input', { type: 'file', accept: '.png,.jpg,.jpeg,.webp,.gif,.avif', multiple: '', id: 'ga-file', class: 'ga-file' });
const drop = el('label', { class: 'ga-drop', for: 'ga-file' }, el('strong', { text: '그림을 끌어다 놓거나 눌러서 선택' }), el('span', { text: 'PNG · JPG · WebP · GIF · AVIF. 8MB가 넘는 그림은 자동으로 압축되고, 최대 95MB까지 올릴 수 있습니다. 같은 이름이면 교체됩니다.' }));
const list = el('ul', { class: 'ga-list' });
const logout = el('button', { type: 'button', class: 'ga-btn ga-ghost', text: '토큰 지우기' });
const manager = el('div', { class: 'ga-manager', hidden: '' }, drop, fileInput, el('div', { class: 'ga-list-head' }, el('span', { text: '전시 중인 그림' }), logout), list);

const close = el('button', { type: 'button', class: 'ga-close', 'aria-label': '닫기', text: '×' });
const dialog = el('dialog', { class: 'ga-dialog', 'aria-labelledby': 'ga-title' },
el('div', { class: 'ga-head' }, el('h3', { id: 'ga-title', text: '갤러리 관리' }), close),
tokenForm, manager, progress.el, status);
document.body.append(dialog);

const say = (text, tone = '') => { status.textContent = text; status.dataset.tone = tone; };
const setBusy = (on) => { busy = on; dialog.toggleAttribute('data-busy', on); dialog.querySelectorAll('button, input').forEach((n) => { if (n !== close) n.disabled = on; }); };
const changed = () => document.dispatchEvent(new CustomEvent('gallery:changed'));


const renderList = () => {
list.replaceChildren();
if (!files.length) { list.append(el('li', { class: 'ga-empty', text: '아직 전시된 그림이 없습니다.' })); return; }
for (const file of files) {
const ext = extOf(file.name);
const nameInput = el('input', { class: 'ga-input ga-name', value: file.name.replace(/\.[^.]+$/, ''), 'aria-label': `${file.name} 새 이름` });
const thumb = el('img', { class: 'ga-thumb', src: `./assets/gallery/thumbs/${encodeURIComponent(file.name.replace(/\.[^.]+$/, ''))}.webp?v=${file.sha}`, alt: '', loading: 'lazy' });
thumb.addEventListener('error', () => thumb.classList.add('is-missing'), { once: true });
const renameBtn = el('button', { type: 'button', class: 'ga-btn', text: '이름 변경' });
const deleteBtn = el('button', { type: 'button', class: 'ga-btn ga-danger', text: '삭제' });
renameBtn.addEventListener('click', () => rename(file, safeName(nameInput.value, ext)));
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rename(file, safeName(nameInput.value, ext)); } });
deleteBtn.addEventListener('click', () => remove(file, deleteBtn));
list.append(el('li', { class: 'ga-item' }, thumb, el('div', { class: 'ga-meta' }, nameInput, el('span', { class: 'ga-ext', text: ext })), renameBtn, deleteBtn));
}
};

const refresh = async () => {
const data = await gh(`/contents/${DIR}?ref=${BRANCH}`, getToken());
files = (Array.isArray(data) ? data : []).filter((f) => f.type === 'file' && IMAGE_RE.test(f.name) && !/^[._]/.test(f.name)).map(({ name, sha }) => ({ name, sha })).sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
renderList();
};

const connect = async () => {
setBusy(true); say('GitHub에 연결하고 있습니다…');
try { await refresh(); tokenForm.hidden = true; manager.hidden = false; say('연결되었습니다. 변경 사항은 배포(약 1분) 후 갤러리에 보입니다.', 'ok'); }
catch (error) { tokenForm.hidden = false; manager.hidden = true; say(error.message, 'error'); }
finally { setBusy(false); }
};

/* out: 진행 상황을 그릴 곳 (관리 창 또는 갤러리 툴바 아래 인라인) */
const upload = async (picked, out = { say, progress }) => {
const items = [...picked].filter((f) => IMAGE_RE.test(f.name));
if (!items.length) { out.say('PNG · JPG · WebP · GIF · AVIF 파일만 올릴 수 있습니다.', 'error'); return; }
setBusy(true);
let done = 0; const uploaded = [];
out.progress.reset();
/* 진행률 배분: 파일마다 같은 몫, 그 안에서 압축 10% · 원본 전송 80% · 썸네일 10% */
const share = 1 / items.length; let idx = 0;
try {
for (const file of items) {
const base = idx * share; out.progress.set(base, `준비 중 ${idx + 1}/${items.length} · ${file.name}`);
out.say(`준비 중 (${done + 1}/${items.length}) ${file.name}`);
const packed = await shrink(file);
if (packed.file.size > MAX_BYTES) { out.say(`${file.name}: 압축해도 95MB를 넘어 건너뜁니다.`, 'error'); idx += 1; continue; }
const name = safeName(packed.name, extOf(packed.name));
if (!name) { idx += 1; continue; }
out.say(`올리는 중 (${done + 1}/${items.length}) ${name}${packed.file !== file ? ` · ${(file.size / 1048576).toFixed(1)}MB → ${(packed.file.size / 1048576).toFixed(1)}MB로 압축` : ''}`);
const existing = files.find((f) => f.name === name);
const content = await fileToBase64(packed.file);
out.progress.set(base + share * .1, `올리는 중 ${idx + 1}/${items.length} · ${name}`);
const putRes = await xhrJSON(`${API}${pathOf(name)}`, { method: 'PUT', token: getToken(), body: JSON.stringify({ message: `${existing ? 'Replace' : 'Add'} artwork ${name}`, content, branch: BRANCH, ...(existing ? { sha: existing.sha } : {}) }), onProgress: (f) => out.progress.set(base + share * (.1 + .8 * f)) });
out.progress.set(base + share * .9, `썸네일 만드는 중 · ${name}`);
const thumbBlob = await makeThumb(packed.file);
if (thumbBlob) { try { const sha = await thumbSha(name, getToken()); await gh(thumbPath(name), getToken(), { method: 'PUT', body: JSON.stringify({ message: `Thumbnail ${name}`, content: await fileToBase64(thumbBlob), branch: BRANCH, ...(sha ? { sha } : {}) }) }); } catch { /* 썸네일이 없어도 갤러리는 원본으로 표시됩니다 */ } }
done += 1; idx += 1; uploaded.push({ name, sha: putRes?.content?.sha || String(Date.now()) }); out.progress.set(idx * share);
}
await refresh(); out.progress.done('업로드 완료');
/* 방금 올린 그림을 기억해 두고(목록 API가 1분가량 늦게 갱신될 때 대비) 갤러리 목록만 다시 불러옵니다. 페이지 전체 새로고침은 하지 않습니다 */
try { const prev = JSON.parse(sessionStorage.getItem('ftvot-gallery-extra') || '[]'); sessionStorage.setItem('ftvot-gallery-extra', JSON.stringify([...prev.filter((x) => !uploaded.some((u) => u.name === x.name)), ...uploaded.map((u) => ({ ...u, time: Date.now() }))]));
Object.keys(sessionStorage).filter((k) => k.startsWith('ftvot-artwork-gallery')).forEach((k) => sessionStorage.removeItem(k)); } catch { /* 저장소 없음 */ }
changed();
out.say(`${done}개를 올렸습니다. 갤러리 목록을 새로 고쳤습니다.`, 'ok');
} catch (error) { out.say(error.message, 'error'); }
finally { setBusy(false); fileInput.value = ''; }
};

const rename = async (file, next) => {
if (!next || next === file.name) { say('바꿀 이름을 입력해 주세요.', 'error'); return; }
if (files.some((f) => f.name === next)) { say('같은 이름의 그림이 이미 있습니다.', 'error'); return; }
setBusy(true); say(`${file.name} → ${next} 이름을 바꾸고 있습니다…`);
try {
// GitHub에는 '이름 변경' API가 없어서, 같은 내용으로 새 파일을 만든 뒤 옛 파일을 지웁니다
const blob = await gh(`/git/blobs/${file.sha}`, getToken());
await gh(pathOf(next), getToken(), { method: 'PUT', body: JSON.stringify({ message: `Rename artwork ${file.name} → ${next}`, content: String(blob.content).replace(/\s/g, ''), branch: BRANCH }) });
await gh(pathOf(file.name), getToken(), { method: 'DELETE', body: JSON.stringify({ message: `Rename artwork ${file.name} → ${next} (remove old)`, sha: file.sha, branch: BRANCH }) });
// 썸네일도 새 이름으로 옮깁니다 (없으면 건너뜀)
try { const sha = await thumbSha(file.name, getToken()); if (sha) { const tb = await gh(`/git/blobs/${sha}`, getToken()); await gh(thumbPath(next), getToken(), { method: 'PUT', body: JSON.stringify({ message: `Thumbnail ${next}`, content: String(tb.content).replace(/\s/g, ''), branch: BRANCH }) }); await gh(thumbPath(file.name), getToken(), { method: 'DELETE', body: JSON.stringify({ message: `Remove thumbnail ${file.name}`, sha, branch: BRANCH }) }); } } catch { /* 썸네일 정리는 실패해도 괜찮습니다 */ }
await refresh(); changed();
say('이름을 바꿨습니다.', 'ok');
} catch (error) { say(error.message, 'error'); }
finally { setBusy(false); }
};

const remove = async (file, button) => {
// 되돌릴 수 없는 작업이라 한 번 더 눌러야 지웁니다
if (button.dataset.confirm !== '1') { button.dataset.confirm = '1'; button.textContent = '정말 삭제'; setTimeout(() => { button.dataset.confirm = ''; button.textContent = '삭제'; }, 3000); return; }
setBusy(true); say(`${file.name}을(를) 지우고 있습니다…`);
try {
await gh(pathOf(file.name), getToken(), { method: 'DELETE', body: JSON.stringify({ message: `Delete artwork ${file.name}`, sha: file.sha, branch: BRANCH }) });
try { const sha = await thumbSha(file.name, getToken()); if (sha) await gh(thumbPath(file.name), getToken(), { method: 'DELETE', body: JSON.stringify({ message: `Remove thumbnail ${file.name}`, sha, branch: BRANCH }) }); } catch { /* 썸네일 정리는 실패해도 괜찮습니다 */ }
await refresh(); changed();
say('삭제했습니다. (GitHub 커밋 기록에서는 되살릴 수 있습니다)', 'ok');
} catch (error) { say(error.message, 'error'); }
finally { setBusy(false); }
};

let pending = null; /* 바로 올리기에서 고른 그림: 토큰이 없으면 연결 후 이어서 올립니다 */
tokenForm.addEventListener('submit', async (e) => { e.preventDefault(); const token = tokenInput.value.trim(); if (!token) return; setToken(token, remember.checked); tokenInput.value = ''; await connect();
if (pending && getToken() && !manager.hidden) { const picked = pending; pending = null; dialog.close(); quickUpload(picked); } });
logout.addEventListener('click', () => { setToken('', false); files = []; manager.hidden = true; tokenForm.hidden = false; say('이 브라우저에서 토큰을 지웠습니다.'); });
fileInput.addEventListener('change', () => upload(fileInput.files));
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => { if (!busy && e.dataTransfer?.files?.length) upload(e.dataTransfer.files); });
close.addEventListener('click', () => { if (!busy) dialog.close(); });
dialog.addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
dialog.addEventListener('click', (e) => { if (e.target === dialog && !busy) dialog.close(); });

/* 그림 바로 올리기: 버튼을 누르면 곧바로 파일 선택창(탐색기·Finder)을 열고, 고르면 진행률 창을 띄워 바로 올립니다 */
const quick = document.querySelector('[data-gallery-upload]');
/* 바로 올리기의 진행 상황은 관리 창 없이 갤러리 툴바 바로 아래에 표시합니다 */
const inlineProgress = createProgress('tiferet'); inlineProgress.el.classList.add('is-inline');
const inlineStatus = el('p', { class: 'ga-status ga-inline-status', role: 'status', 'aria-live': 'polite' });
const inlineSay = (text, tone = '') => { inlineStatus.textContent = text; inlineStatus.dataset.tone = tone; };
document.querySelector('.artwork-toolbar')?.after(inlineProgress.el, inlineStatus);
const quickUpload = async (picked) => {
if (busy) return; inlineProgress.reset(); inlineSay('GitHub에 연결하고 있습니다…');
try { await refresh(); } catch (error) { inlineSay(error.message, 'error'); return; }
await upload(picked, { say: inlineSay, progress: inlineProgress });
setTimeout(() => { if (!busy) { inlineProgress.reset(); } }, 6000);
};
if (quick) {
const quickInput = el('input', { type: 'file', accept: '.png,.jpg,.jpeg,.webp,.gif,.avif', multiple: '', class: 'ga-file', 'aria-hidden': 'true', tabindex: '-1' });
document.body.append(quickInput);
quick.addEventListener('click', () => { if (!busy) quickInput.click(); });
quickInput.addEventListener('change', async () => {
const picked = [...quickInput.files]; quickInput.value = ''; if (!picked.length) return;
if (getToken()) { quickUpload(picked); return; }
/* 토큰이 없을 때만 토큰 입력 창을 띄웁니다. 연결되면 창을 닫고 갤러리 아래에서 이어서 올립니다 */
pending = picked; dialog.showModal(); tokenForm.hidden = false; manager.hidden = true; tokenInput.focus(); say(`그림 ${picked.length}개를 골랐습니다. GitHub 토큰을 연결하면 바로 올립니다.`);
});
}
trigger.addEventListener('click', (event) => {
event.preventDefault();
dialog.showModal();
say('');
if (getToken()) connect(); else { tokenForm.hidden = false; manager.hidden = true; tokenInput.focus(); }
});
}
