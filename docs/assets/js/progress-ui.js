// 진행률 표시 공용 부품: 모노 숫자(000%) + 얇은 막대 + 지금 하는 일 한 줄. 인트로 로딩과 같은 문법입니다.
// 업로드는 fetch로는 보낸 양을 알 수 없어서, 실제 전송량을 받는 XMLHttpRequest 래퍼(xhrJSON)도 함께 둡니다.

export function createProgress(tone = '') {
const root = document.createElement('div'); root.className = `ui-progress${tone ? ` is-${tone}` : ''}`; root.hidden = true;
root.setAttribute('role', 'progressbar'); root.setAttribute('aria-valuemin', '0'); root.setAttribute('aria-valuemax', '100');
const top = document.createElement('div'); top.className = 'up-top';
const pct = document.createElement('span'); pct.className = 'up-pct mono'; pct.textContent = '000%';
const label = document.createElement('span'); label.className = 'up-label';
top.append(pct, label);
const track = document.createElement('div'); track.className = 'up-track';
const fill = document.createElement('div'); fill.className = 'up-fill'; track.append(fill);
root.append(top, track);
let shown = 0;
return {
el: root,
/* frac 0~1. 뒤로 가지 않게 최댓값만 반영 (여러 파일 진행이 섞여도 막대가 튀지 않도록) */
set(frac, text) { const v = Math.max(shown, Math.min(1, Math.max(0, Number(frac) || 0))); shown = v; root.hidden = false;
const n = Math.round(v * 100); pct.textContent = `${String(n).padStart(3, '0')}%`; fill.style.transform = `scaleX(${v})`; root.setAttribute('aria-valuenow', String(n)); if (text != null) label.textContent = text; },
done(text) { this.set(1, text); root.classList.add('is-done'); },
reset() { shown = 0; root.hidden = true; root.classList.remove('is-done'); fill.style.transform = 'scaleX(0)'; pct.textContent = '000%'; label.textContent = ''; },
};
}

/* GitHub API 요청을 XHR로 보내 업로드 진행률(0~1)을 콜백으로 알려 줍니다. 응답은 JSON으로 돌려줍니다 */
export function xhrJSON(url, { method = 'GET', token, body, timeout = 180000, onProgress } = {}) {
return new Promise((resolve, reject) => {
const x = new XMLHttpRequest();
x.open(method, url); x.timeout = timeout; x.withCredentials = false;
x.setRequestHeader('Accept', 'application/vnd.github+json'); x.setRequestHeader('X-GitHub-Api-Version', '2022-11-28');
if (token) x.setRequestHeader('Authorization', `Bearer ${token}`);
if (body != null) x.setRequestHeader('Content-Type', 'application/json');
if (onProgress) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
x.onload = () => { let data = null; try { data = x.responseText ? JSON.parse(x.responseText) : null; } catch { /* 빈 응답 */ }
if (x.status >= 200 && x.status < 300) { onProgress?.(1); resolve(data); return; }
const msg = x.status === 401 ? '토큰이 올바르지 않거나 만료되었습니다.' : x.status === 403 ? '토큰에 이 저장소의 Contents 쓰기 권한이 없습니다.' : x.status === 409 ? '다른 변경과 충돌했습니다. 다시 시도해 주세요.' : x.status === 422 ? '파일이 너무 크거나 요청 형식이 잘못되었습니다.' : `GitHub 오류 (${x.status})`;
reject(new Error(msg)); };
x.onerror = () => reject(new Error('네트워크 오류로 업로드하지 못했습니다.'));
x.ontimeout = () => reject(new Error('GitHub 응답이 너무 늦습니다. 네트워크를 확인해 주세요.'));
x.send(body ?? null);
});
}
