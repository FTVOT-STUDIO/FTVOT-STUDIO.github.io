// 배경은 한 장의 저해상도 캔버스를 공유해 세피라마다 큰 합성 레이어가 쌓이지 않게 합니다.
export function initChapterScenes() {
const chapters = [...document.querySelectorAll('.chapter')];
if (!chapters.length) return;
const canvas = document.createElement('canvas');
canvas.className = 'chapter-cosmos';
canvas.setAttribute('aria-hidden', 'true');
document.body.append(canvas);
const ctx = canvas.getContext('2d', { alpha: true });
if (!ctx) { canvas.remove(); return; }
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const visible = new Set();
const fades = new Map(); // 장면별 현재 불투명도 (0~1)
const FPS = document.documentElement.classList.contains('lite') ? 12 : 24; // 저사양에서는 절반 프레임
const colors = new Map(); const colorOf = (el) => { if (!colors.has(el)) colors.set(el, getComputedStyle(el).getPropertyValue('--sc').trim()); return colors.get(el); };
let width = 0, height = 0, frame = 0, last = 0, time = 0;
const resize = () => {
width = innerWidth; height = innerHeight;
// 레티나 배율을 따라 확대하지 않고 실제 버퍼의 긴 변을 1600px 이내로 제한합니다.
const scale = Math.min(1, (document.documentElement.classList.contains('lite') ? 900 : 1600) / Math.max(width, height));
canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
ctx.setTransform(scale, 0, 0, scale, 0, 0);
request();
};
const draw = (now) => {
frame = 0;
if (document.hidden) { last = 0; return; }
if (!reduce.matches && last && now - last < 1000 / FPS) { frame = requestAnimationFrame(draw); return; }
const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
if (!reduce.matches) time += dt;
last = now;
ctx.clearRect(0, 0, width, height);
let selected = null, nearest = Infinity;
for (const chapter of visible) {
const bounds = chapter.getBoundingClientRect();
const distance = Math.abs(Math.max(bounds.top, 0) + Math.min(bounds.bottom, height) - height);
if (bounds.bottom > 0 && bounds.top < height && distance < nearest) { selected = chapter; nearest = distance; }
}
// 장면 전환: 화면 경계로 자르지 않고, 이전 장면은 서서히 사라지고 다음 장면은 서서히 떠오르게 섞습니다
const step = reduce.matches ? 1 : Math.min(1, dt * 1.6);
if (selected) fades.set(selected, fades.get(selected) ?? 0);
let active = false;
for (const [chapter, value] of fades) {
const next = value + ((chapter === selected ? 1 : 0) - value) * step;
if (next < 0.01 && chapter !== selected) { fades.delete(chapter); continue; }
fades.set(chapter, next); active = true;
const scene = scenes[chapter.id]; if (!scene) continue;
const color = colorOf(chapter);
ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.1;
const mobile = width < 768;
const size = mobile ? Math.min(width * 0.46, 180) : Math.min(width * 0.26, 340);
const scale = size / 300;
const panelHeight = 480 * scale;
const top = Math.max(50, Math.min(height - panelHeight - 20, (height - panelHeight) / 2));
const ease = next * next * (3 - 2 * next);
for (let side = 0; side < 2; side += 1) {
ctx.save();
// 떠오를 때 살짝 아래에서 올라오고, 사라질 때 살짝 가라앉습니다
ctx.translate(side ? width - size + (mobile ? 40 : 20) : (mobile ? -40 : -20), top + (side ? 0 : 50) + (1 - ease) * 24);
ctx.scale(scale, scale);
ctx.globalAlpha = (mobile ? 0.22 : 0.43) * ease;
scene(ctx, reduce.matches ? 6 : time + side * 3.7, side);
ctx.restore();
}
}
if (!active) { last = 0; return; }
if (!reduce.matches) frame = requestAnimationFrame(draw);
};
function request() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
const observer = new IntersectionObserver((entries) => {
for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); }
request();
});
chapters.forEach((chapter) => observer.observe(chapter));
window.addEventListener('resize', resize);
window.addEventListener('scroll', request, { passive: true });
const reset = () => { cancelAnimationFrame(frame); frame = 0; last = 0; if (!document.hidden) request(); };
document.addEventListener('visibilitychange', reset);
reduce.addEventListener('change', reset);
window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; last = 0; });
window.addEventListener('pageshow', request);
resize();
}

const TAU = Math.PI * 2;
const cycle = (t, duration, offset = 0) => ((t / duration + offset) % 1 + 1) % 1;
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.stroke(); }
function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fill(); }
function ellipse(c, x, y, rx, ry, angle = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU); c.stroke(); }
function star(c, x, y, r) { line(c, x-r, y, x+r, y); line(c, x, y-r, x, y+r); }
function gear(c, x, y, r, rotation) {
c.save(); c.translate(x, y); c.rotate(rotation);
c.beginPath();
for (let i = 0; i < 64; i += 1) { const a=i/64*TAU, rr=r*(i%4<2?1:0.85); if (!i) c.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); else c.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
c.closePath(); c.stroke(); circle(c,0,0,r*.57); circle(c,0,0,r*.2);
for(let i=0;i<4;i++){const a=i/4*TAU;line(c,Math.cos(a)*r*.25,Math.sin(a)*r*.25,Math.cos(a)*r*.5,Math.sin(a)*r*.5);}
c.restore();
}
function butterfly(c,x,y,t,size=1) {
c.save();c.translate(x,y);c.scale(size,size);const wing=5+Math.abs(Math.sin(t*6))*10;
ellipse(c,-wing/2,-5,wing,9,-.5);ellipse(c,wing/2,-5,wing,9,.5);ellipse(c,-wing/2,6,wing*.7,6,.4);ellipse(c,wing/2,6,wing*.7,6,-.4);line(c,0,-12,0,13);c.restore();
}
function heart(c,x,y,size) { c.save();c.translate(x,y);c.scale(size,size);c.beginPath();c.moveTo(0,18);c.bezierCurveTo(-52,-15,-42,-53,-16,-47);c.bezierCurveTo(-5,-45,0,-36,0,-33);c.bezierCurveTo(7,-52,38,-54,43,-30);c.bezierCurveTo(49,-9,20,9,0,18);c.stroke();c.restore(); }
function insect(c,x,y,size,t) { c.save();c.translate(x,y);c.scale(size,size);ellipse(c,0,0,8,16);circle(c,0,-20,5);line(c,0,-13,0,15);for(let i=0;i<3;i++){const y=-8+i*8,d=Math.sin(t*3+i)*3;line(c,-6,y,-19,y-7+d);line(c,6,y,19,y-7-d);}c.restore(); }

// 각 장면은 300x480 좌표계에서 그립니다. 모든 움직임은 t(초)에서만 계산해서 프레임이 끊겨도 같은 장면으로 돌아옵니다.
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a)); // p가 a~b 구간에서 0→1
const rand = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }; // 시드 고정 난수
function person(c, x, y, s, lean = 0) { c.save(); c.translate(x, y); c.scale(s, s); c.rotate(lean); circle(c, 0, -30, 5); line(c, 0, -24, 0, 0); line(c, -9, -16, 9, -16); line(c, 0, 0, -7, 14); line(c, 0, 0, 7, 14); c.restore(); }
function link(c, x, y, a, s = 1) { c.save(); c.translate(x, y); c.rotate(a); ellipse(c, 0, 0, 8 * s, 4 * s); c.restore(); }

const scenes = {
// 케테르: 성운이 뭉쳐 별이 되고, 부풀어 초신성으로 터진 잔해가 다시 성운이 되는 순환
kether(c, t) {
for (let i = 0; i < 26; i++) { const tw = .3 + .7 * Math.abs(Math.sin(t * (.6 + rand(i) * .8) + i)); c.save(); c.globalAlpha *= tw * .6; dot(c, rand(i + 1) * 300, rand(i + 2) * 480, .8 + rand(i + 3)); c.restore(); }
for (let k = 0; k < 3; k++) {
const p = cycle(t, 16, k / 3), cx = [150, 80, 225][k], cy = [235, 110, 380][k], sc = [1, .55, .6][k];
c.save(); c.translate(cx, cy); c.scale(sc, sc);
// 1) 성운 수축
const neb = seg(p, 0, .25);
if (p < .3) for (let j = 0; j < 22; j++) { const a = rand(j + k * 40) * TAU + t * .2, r = lerp(90, 6, neb) * (.5 + rand(j + 7) * .5); c.save(); c.globalAlpha *= 1 - seg(p, .25, .3); dot(c, Math.cos(a) * r, Math.sin(a) * r * .7, 1.2); c.restore(); }
// 2) 주계열성 → 적색거성
if (p >= .22 && p < .72) { const r = lerp(4, 10, seg(p, .22, .35)) + seg(p, .5, .7) * 30; c.save(); c.globalAlpha *= seg(p, .22, .3); circle(c, 0, 0, r); circle(c, 0, 0, r * 1.6 + Math.sin(t * 3) * 1.5); for (let j = 0; j < 8; j++) { const a = j / 8 * TAU + t * .4; line(c, Math.cos(a) * r * 1.9, Math.sin(a) * r * 1.9, Math.cos(a) * (r * 1.9 + 8 + Math.sin(t * 5 + j) * 4), Math.sin(a) * (r * 1.9 + 8 + Math.sin(t * 5 + j) * 4)); } dot(c, 0, 0, 2); c.restore(); }
// 3) 초신성 충격파와 파편
if (p >= .72) { const b = seg(p, .72, 1); c.save(); c.globalAlpha *= 1 - b; c.lineWidth = 1.6; circle(c, 0, 0, 40 + b * 110); circle(c, 0, 0, 30 + b * 75); for (let j = 0; j < 18; j++) { const a = j / 18 * TAU + rand(j) * .3, r = 30 + b * (90 + rand(j) * 60); dot(c, Math.cos(a) * r, Math.sin(a) * r, 1.6); } c.restore(); c.save(); c.globalAlpha *= 1 - b * .5; dot(c, 0, 0, 2.5); circle(c, 0, 0, 5 + Math.sin(t * 12) * 1.5); c.restore(); }
c.restore();
}
},
// 호크마: 언어가 바뀌며 코드가 한 글자씩 입력되고, 컴파일 로그와 이진수 비가 흐릅니다
chokmah(c, t, side) {
const sets = [
['// World.cs', 'public class World {', '  void Awake() {', '    Seed(possibility);', '    Spawn<Life>(10);', '  }', '}'],
['# wisdom.py', 'def observe(u):', '  for s in u.stars:', '    yield s.truth', '', 'print(*observe(cosmos))'],
['// tree.rs', 'fn main() {', '  let tree = Tree::new(10);', '  for s in tree.iter() {', '    s.bloom();', '  }', '}'],
['// light.js', 'const light = () =>', '  emanate({', '    from: "Kether",', '    to: "Malkuth",', '  });']];
const total = 22, idx = (Math.floor(t / total) + side) % sets.length, code = sets[idx], p = (t % total) / total;
let remaining = Math.floor(seg(p, 0, .75) * code.join('').length);
c.strokeRect(22, 50, 256, 300); line(c, 22, 78, 278, 78); for (let i = 0; i < 3; i++) circle(c, 34 + i * 10, 64, 2);
c.font = '10px monospace'; c.fillText(['C#', 'PYTHON', 'RUST', 'JAVASCRIPT'][idx], 210, 68);
for (let i = 0; i < code.length; i++) {
const n = Math.max(0, Math.min(code[i].length, remaining));
c.save(); c.globalAlpha *= .5; c.fillText(String(i + 1).padStart(2, ' '), 28, 102 + i * 26); c.restore();
c.fillText(code[i].slice(0, n), 48, 102 + i * 26);
if (remaining >= 0 && remaining <= code[i].length && Math.sin(t * 10) > 0) c.fillRect(49 + n * 6, 93 + i * 26, 5, 11);
remaining -= code[i].length;
}
if (p > .78) { c.save(); c.globalAlpha *= seg(p, .78, .84); line(c, 22, 300, 278, 300); c.fillText('> build ' + (p > .9 ? 'succeeded  0 errors' : 'compiling' + '.'.repeat(1 + Math.floor(t * 4) % 3)), 32, 325); c.restore(); }
for (let i = 0; i < 9; i++) { const x = 30 + i * 30; for (let j = 0; j < 4; j++) { const y = 365 + ((t * (30 + rand(i) * 30) + j * 30 + rand(i + 9) * 100) % 115); c.save(); c.globalAlpha *= 1 - (y - 365) / 115; c.fillText(rand(i * 9 + j + Math.floor(t * 2)) > .5 ? '1' : '0', x, y); c.restore(); } }
},
// 비나: 씨앗 → 새싹 → 줄기와 잎 → 고치 → 고치가 열리며 나비가 날아갑니다
binah(c, t) {
line(c, 0, 420, 300, 420); for (let i = 0; i < 14; i++) line(c, i * 22 + 5, 428, i * 22 + 12, 425);
for (let k = 0; k < 3; k++) {
const p = cycle(t, 18, k / 3), x = 60 + k * 90, base = 420;
const g = seg(p, .05, .4), h = g * (100 + k * 15);
c.save(); c.globalAlpha *= p > .9 ? 1 - seg(p, .9, 1) : 1;
ellipse(c, x, base - 2, 6, 3);
if (g > 0) { c.beginPath(); c.moveTo(x, base - 2); c.bezierCurveTo(x - 14, base - h * .35, x + 14, base - h * .7, x, base - h); c.stroke();
for (let l = 0; l < 3; l++) { const ly = base - h * (.3 + l * .22), ls = clamp01(g * 3 - l) * 13; ellipse(c, x + (l % 2 ? 11 : -11), ly, ls, ls * .4, l % 2 ? .5 : -.5); } }
// 고치: 줄기 끝에 매달려 흔들리다가 갈라짐
const co = seg(p, .4, .5), open = seg(p, .62, .7);
if (co > 0 && open < 1) { const sw = Math.sin(t * 2 + k) * .12; c.save(); c.translate(x + 10, base - h * .62); c.rotate(sw); line(c, 0, 0, 0, 8); c.globalAlpha *= co * (1 - open); ellipse(c, -open * 4, 22, 6 * co, 13 * co, -open * .4); ellipse(c, open * 4, 22, 6 * co, 13 * co, open * .4); for (let r = 0; r < 4; r++) line(c, -5, 14 + r * 5, 5, 14 + r * 5); c.restore(); }
c.restore();
if (open > 0) { const f = seg(p, .62, 1), bx = x + 10 + Math.sin(f * 7 + k) * 35 + f * 40, by = base - h * .62 + 22 - f * 330; c.save(); c.globalAlpha *= Math.sin(f * Math.PI) * 1.2; butterfly(c, bx, by, t + k, .6 + seg(p, .62, .7) * .6); for (let d = 1; d < 6; d++) { const ff = Math.max(0, f - d * .025); c.save(); c.globalAlpha *= .3 * (1 - d / 6); dot(c, x + 10 + Math.sin(ff * 7 + k) * 35 + ff * 40, base - h * .62 + 22 - ff * 330, 1.2); c.restore(); } c.restore(); }
}
},
// 헤세드: 고요한 겨울 도시에 눈이 내립니다. 눈송이는 깊이에 따라 크기·속도·진하기가 다르고,
// 각자 다른 주기로 좌우로 살랑이며 떨어집니다. 바람은 아주 느리게 방향을 바꿀 뿐 몰아치지 않습니다
chesed(c, t) {
const wind = Math.sin(t * .12) * 6 + Math.sin(t * .05 + 1) * 4; // 초당 몇 px 수준의 잔잔한 바람
// 먼 도시 실루엣 (한 겹, 옅게)
c.save(); c.globalAlpha *= .35;
c.beginPath(); c.moveTo(0, 430);
const tops = [370, 340, 352, 318, 360, 300, 344, 326, 362, 336, 350, 312, 358, 342];
tops.forEach((y, k) => { const x = k * 23; c.lineTo(x, y); c.lineTo(x + 19, y); c.lineTo(x + 19, 430); c.lineTo(x + 23, 430); });
c.lineTo(300, 430); c.stroke();
c.restore();
// 가까운 건물: 지붕마다 둥글게 쌓인 눈, 드문드문 켜진 창
const near = [[6, 46, 120], [62, 40, 92], [112, 54, 140], [176, 38, 104], [224, 58, 128]];
for (const [x, w, h] of near) {
const top = 440 - h;
c.strokeRect(x, top, w, h);
c.beginPath(); c.moveTo(x - 2, top); c.bezierCurveTo(x + w * .2, top - 6, x + w * .8, top - 6, x + w + 2, top); c.stroke();
for (let wx = 0; wx < Math.floor((w - 8) / 10); wx++) for (let wy = 0; wy < Math.floor((h - 14) / 18); wy++) {
const seed = x * 7 + wx * 13 + wy * 29;
if (rand(seed) > .72) { c.save(); c.globalAlpha *= .55 + .25 * Math.sin(t * .3 + seed); c.fillRect(x + 6 + wx * 10, top + 12 + wy * 18, 4, 7); c.restore(); }
}
}
// 땅에 쌓인 눈
c.beginPath(); c.moveTo(0, 442); for (let x = 0; x <= 300; x += 12) c.lineTo(x, 440 - Math.sin(x * .03) * 2); c.stroke();
// 눈송이 3개 층: [개수, 최소 크기, 크기 폭, 낙하 속도, 진하기]
const layers = [[60, .5, .4, 9, .35], [45, .9, .6, 16, .6], [24, 1.5, .9, 26, .9]];
layers.forEach(([n, r0, rr, sp, alpha], L) => {
for (let i = 0; i < n; i++) {
const id = i + L * 100;
const speed = sp * (.8 + rand(id) * .4);
const y = (rand(id + 1) * 520 + t * speed) % 520 - 20;
const sway = Math.sin(t * (.4 + rand(id + 2) * .5) + rand(id + 3) * 6.28) * (6 + L * 4);
const x = ((rand(id + 4) * 340 + t * wind * (.5 + L * .4) + sway) % 340 + 340) % 340 - 20;
c.save(); c.globalAlpha *= alpha; dot(c, x, y, r0 + rand(id + 5) * rr); c.restore();
}
});
},
// 게부라: 맞물린 톱니, 왕복 피스톤, 컨베이어, 표적을 훑다가 발사하는 레이저 포탑
gevurah(c, t) {
gear(c, 90, 140, 58, t * .4); gear(c, 186, 176, 44, -t * .4 * 58 / 44 + .2); gear(c, 250, 110, 28, t * .4 * 58 / 28); gear(c, 80, 250, 36, -t * .4 * 58 / 36);
const st = Math.sin(t * 2.2) * 22; c.strokeRect(150, 230, 40, 70); c.strokeRect(154, 250 + st * .5, 32, 14); line(c, 170, 264 + st * .5, 186 + Math.cos(t * 2.2) * 30, 176 + 10); circle(c, 186 + Math.cos(t * 2.2) * 30, 186, 3);
line(c, 20, 340, 280, 340); line(c, 20, 356, 280, 356); for (let i = 0; i < 2; i++) circle(c, 20 + i * 260, 348, 8); for (let i = 0; i < 4; i++) { const x = 20 + ((t * 30 + i * 70) % 260); c.strokeRect(x, 322, 18, 18); }
c.save(); c.translate(260, 420); c.strokeRect(-16, -8, 32, 16); const sweep = -2.2 + Math.sin(t * .8) * .5, fire = cycle(t, 4.5); c.rotate(sweep); c.strokeRect(0, -5, 30, 10); circle(c, 0, 0, 9);
if (fire > .6 && fire < .8) { const b = Math.sin(seg(fire, .6, .8) * Math.PI); c.save(); c.globalAlpha *= b; c.lineWidth = 2.5; line(c, 30, 0, 330, 0); c.lineWidth = .8; line(c, 30, -4, 330, -4); line(c, 30, 4, 330, 4); c.restore(); }
c.restore();
if (fire > .6 && fire < .85) { const ex = 260 + Math.cos(sweep) * 280, ey = 420 + Math.sin(sweep) * 280, b = seg(fire, .6, .85); for (let j = 0; j < 10; j++) { const a = j / 10 * TAU; c.save(); c.globalAlpha *= 1 - b; line(c, ex + Math.cos(a) * b * 10, ey + Math.sin(a) * b * 10, ex + Math.cos(a) * (b * 28 + 4), ey + Math.sin(a) * (b * 28 + 4)); c.restore(); } }
c.save(); c.globalAlpha *= .5 + .5 * Math.sin(t * 6); dot(c, 30, 40, 3); dot(c, 45, 40, 3); c.restore();
},
// 티페레트: 서로에게 손을 뻗는 두 사람과 맥박 치는 심장, 그 둘을 감았다 풀었다 하는 사슬
tiferet(c, t) {
const bind = (Math.sin(t * .45) + 1) / 2; // 1이면 억압이 조이고, 0이면 사랑이 사슬을 끊습니다
const reach = 1 - bind;
person(c, 70 + reach * 25, 330, 1.6, .15 * reach); person(c, 230 - reach * 25, 330, 1.6, -.15 * reach);
line(c, 85 + reach * 25, 304, 120 + reach * 22, 290 - reach * 10); line(c, 215 - reach * 25, 304, 180 - reach * 22, 290 - reach * 10);
const beat = 1 + Math.max(0, Math.sin(t * 5)) ** 8 * .12 * (1 + reach); heart(c, 150, 230, .9 * beat); c.save(); c.globalAlpha *= reach; circle(c, 150, 210, 60 + Math.sin(t * 5) * 3); c.restore();
for (let k = 0; k < 2; k++) { const dir = k ? -1 : 1; for (let i = 0; i < 18; i++) { const u = i / 17, a = u * TAU * 1.3 * dir + t * .2 * dir, r = lerp(110, 40 + reach * 70, bind) + Math.sin(u * 9 + t) * 6, x = 150 + Math.cos(a) * r, y = 240 + Math.sin(a) * r * .75; const broken = reach > .75 && (i % 6 === 3); c.save(); if (broken) { c.globalAlpha *= .4; c.translate(0, (reach - .75) * 120); } link(c, x, y, a + Math.PI / 2 + (i % 2) * Math.PI / 2, 1); c.restore(); } }
c.save(); c.globalAlpha *= bind; c.strokeRect(137, 236, 26, 22); c.beginPath(); c.arc(150, 236, 10, Math.PI, 0); c.stroke(); line(c, 150, 244, 150, 251); c.restore();
for (let i = 0; i < 6; i++) { const p = cycle(t, 6, i / 6); c.save(); c.globalAlpha *= Math.sin(p * Math.PI) * reach; heart(c, 150 + Math.sin(i * 2 + p * 6) * 70, 200 - p * 160, .15); c.restore(); }
},
// 네차흐: 포탄 궤적과 폭발, 전진하다 쓰러지는 대열, 늘어나는 묘비 줄. 직접적인 신체 손상 묘사는 하지 않습니다
netzach(c, t) {
c.save(); c.globalAlpha *= .5; for (let i = 0; i < 5; i++) { const y = 60 + i * 30 + Math.sin(t * .3 + i) * 6; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= 300; x += 20) c.lineTo(x, y + Math.sin(x * .04 + t * .5 + i) * 8); c.stroke(); } c.restore();
for (let k = 0; k < 3; k++) { const p = cycle(t, 5, k / 3), sx = 20 + k * 20, ex = 140 + k * 60, ey = 330; const f = seg(p, 0, .5); if (f < 1) { const x = lerp(sx, ex, f), y = lerp(380, ey, f) - Math.sin(f * Math.PI) * 220; dot(c, x, y, 2.5); c.save(); c.globalAlpha *= .4; c.beginPath(); for (let s = 0; s <= 20; s++) { const ff = f * s / 20; const xx = lerp(sx, ex, ff), yy = lerp(380, ey, ff) - Math.sin(ff * Math.PI) * 220; s ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.restore(); } else { const b = seg(p, .5, .85); c.save(); c.globalAlpha *= 1 - b; circle(c, ex, ey, 6 + b * 50); circle(c, ex, ey, b * 30); for (let j = 0; j < 9; j++) { const a = -Math.PI * rand(j + k * 9); line(c, ex + Math.cos(a) * b * 20, ey + Math.sin(a) * b * 20, ex + Math.cos(a) * b * 55, ey + Math.sin(a) * b * 55); } c.restore(); } }
for (let i = 0; i < 9; i++) { const p = cycle(t, 14, i * .02), x = 10 + i * 18 + p * 120, fall = seg(p, .45 + rand(i) * .35, .55 + rand(i) * .35); c.save(); c.globalAlpha *= 1 - seg(p, .9, 1); person(c, x, 385 + (i % 2) * 10, .9, fall * 1.5); line(c, x + 6, 357 + (i % 2) * 10, x + 14 + fall * 6, 345 + fall * 20); c.restore(); }
line(c, 0, 410, 300, 410);
const graves = 3 + Math.floor(cycle(t, 42) * 9); for (let i = 0; i < graves; i++) { const x = 18 + i * 31; line(c, x, 470, x, 440); line(c, x - 8, 450, x + 8, 450); }
c.save(); c.translate(250, 410); line(c, 0, 0, 0, -120); c.beginPath(); c.moveTo(0, -120); c.quadraticCurveTo(25, -125 + Math.sin(t * 2) * 6, 45, -112); c.lineTo(42, -88); c.quadraticCurveTo(22, -95 + Math.sin(t * 2 + 1) * 6, 0, -92); c.stroke(); c.restore();
},
// 호드: 벌레들의 약육강식이 끝없이 되풀이되는 먹이사슬.
// 풀잎 사이를 기어다니는 벌레 → 거미가 벌레를 낚아채고 → 새가 거미를 채가고 → 새는 떨어져 흙이 되고 → 흙에서 풀이 자라 다시 벌레가 모입니다 (14초 주기)
hod(c, t) {
const T = 14, p = (t % T) / T, cyc = Math.floor(t / T);
const ground = 430;
// 땅과 풀: 순환 마지막에 새 풀이 자라납니다
line(c, 0, ground, 300, ground);
const regrow = p > .82 ? (p - .82) / .18 : 1;
for (let i = 0; i < 18; i++) { const x = 8 + i * 16.5, h = (10 + rand(i + cyc) * 16) * (i % 3 === cyc % 3 ? regrow : 1), sw = Math.sin(t * 1.4 + i) * 2.5; c.beginPath(); c.moveTo(x, ground); c.quadraticCurveTo(x + sw, ground - h * .6, x + sw * 1.6, ground - h); c.stroke(); }
// 거미줄: 왼쪽 위 가지에 매달린 줄
line(c, 40, 120, 40, 200); line(c, 20, 120, 120, 120);
const webCx = 78, webCy = 205;
for (let r = 8; r <= 32; r += 8) { c.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU; const x = webCx + Math.cos(a) * r, y = webCy + Math.sin(a) * r; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(c, webCx, webCy, webCx + Math.cos(a) * 34, webCy + Math.sin(a) * 34); }
// 1) 벌레 무리: 땅 위를 기어다니고, 그중 한 마리가 날아올라 거미줄에 걸립니다
for (let i = 0; i < 6; i++) { const x = (rand(i) * 300 + t * (8 + rand(i + 3) * 10) * (i % 2 ? 1 : -1) + 600) % 300, y = ground - 4 - Math.abs(Math.sin(t * 6 + i)) * 1.5; insect(c, x, y, .35, t + i); }
const caught = p < .3 ? p / .3 : 1;
let preyX = lerp(200, webCx + 10, caught), preyY = lerp(ground - 20, webCy + 6, caught) - Math.sin(caught * Math.PI) * 60;
const spiderAt = p < .3 ? 0 : Math.min(1, (p - .3) / .12);
if (p < .42) { c.save(); butterfly(c, preyX, preyY, t * 2, .45); c.restore(); }
// 2) 거미: 거미줄 중앙에서 내려와 벌레를 잡고 다시 올라갑니다
const spiderVisible = p < .62;
let sx = webCx, sy = lerp(webCy - 30, webCy + 4, spiderAt);
if (p > .42 && p < .62) sy = webCy - 2 + Math.sin(t * 3) * 2;
if (spiderVisible) { line(c, sx, 120, sx, sy); circle(c, sx, sy, 5); circle(c, sx, sy - 6, 3); for (let k = 0; k < 4; k++) { const off = (k - 1.5) * 3; line(c, sx - 4, sy + off, sx - 11, sy + off - 4 + Math.sin(t * 8 + k)); line(c, sx + 4, sy + off, sx + 11, sy + off - 4 + Math.sin(t * 8 + k + 1)); } if (p > .42) dot(c, sx, sy + 8, 2.5); }
// 3) 새: 오른쪽에서 날아와 거미를 채가고 위로 날아갑니다
if (p > .45 && p < .78) {
const q = (p - .45) / .33, bx = q < .5 ? lerp(330, sx + 6, q * 2) : lerp(sx + 6, 250, (q - .5) * 2), by = q < .5 ? lerp(70, sy, q * 2) : lerp(sy, 40, (q - .5) * 2);
const flap = Math.sin(t * 9) * 8;
c.beginPath(); c.moveTo(bx - 18, by - flap); c.quadraticCurveTo(bx - 8, by, bx, by); c.quadraticCurveTo(bx + 8, by, bx + 18, by - flap); c.stroke(); circle(c, bx, by + 2, 3);
if (q > .5) { line(c, bx, by + 5, bx, by + 12); circle(c, bx, by + 14, 3); }
}
// 4) 쇠약: 늙은 새가 떨어져 땅에 눕고, 흙으로 흩어지며 새싹을 남깁니다
if (p > .7) {
const q = Math.min(1, (p - .7) / .12), fx = 230, fy = lerp(60, ground - 4, q * q);
c.save(); c.globalAlpha *= 1 - Math.max(0, (p - .86) / .14);
c.beginPath(); c.moveTo(fx - 12, fy - 2); c.lineTo(fx, fy); c.lineTo(fx + 12, fy - 2); c.stroke(); circle(c, fx, fy + 1, 2.5);
if (q >= 1) for (let k = 0; k < 10; k++) { const a = rand(k + cyc) * Math.PI, r = (p - .82) * 120 * rand(k + 2); dot(c, fx + Math.cos(a) * r, ground - 2 - Math.sin(a) * r * .3, 1); }
c.restore();
}
// 순환을 보여주는 작은 고리 표시: 풀 → 벌레 → 거미 → 새 → 흙 (현재 단계가 진하게)
const stages = ['풀', '벌레', '거미', '새', '흙'], cur = p < .3 ? 1 : p < .45 ? 2 : p < .7 ? 3 : p < .86 ? 4 : 0;
c.save(); c.font = '9px sans-serif'; c.textAlign = 'center';
stages.forEach((name, k) => { const a = -Math.PI / 2 + k / 5 * TAU, x = 230 + Math.cos(a) * 34, y = 300 + Math.sin(a) * 34; c.globalAlpha = k === cur ? .9 : .3; circle(c, x, y, k === cur ? 4 : 2.5); c.fillText(name, x, y - 9); });
c.globalAlpha = .3; circle(c, 230, 300, 34); c.restore();
},
// 예소드: 관측하는 눈, 최면 나선과 진자, 가지를 치며 하나만 실현되는 미래 시간선
yesod(c, t) {
const look = Math.sin(t * .5) * 18, blink = cycle(t, 7) > .96 ? .1 : 1;
c.beginPath(); c.moveTo(60, 110); c.quadraticCurveTo(150, 110 - 60 * blink, 240, 110); c.quadraticCurveTo(150, 110 + 60 * blink, 60, 110); c.stroke();
c.save(); c.beginPath(); c.moveTo(60, 110); c.quadraticCurveTo(150, 110 - 60 * blink, 240, 110); c.quadraticCurveTo(150, 110 + 60 * blink, 60, 110); c.clip(); circle(c, 150 + look, 110, 26); circle(c, 150 + look, 110, 14); dot(c, 150 + look, 110, 7); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(c, 150 + look + Math.cos(a) * 15, 110 + Math.sin(a) * 15, 150 + look + Math.cos(a) * 25, 110 + Math.sin(a) * 25); } c.restore();
c.save(); c.translate(150, 250); for (let arm = 0; arm < 2; arm++) { c.beginPath(); for (let i = 0; i < 120; i++) { const a = i * .12 + t * 1.2 + arm * Math.PI, r = i * .55; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(0, 0); } c.stroke(); } c.restore();
const sw = Math.sin(t * 1.6) * .5; c.save(); c.translate(150, 170); line(c, -12, 0, 12, 0); c.rotate(sw); line(c, 0, 0, 0, 80); circle(c, 0, 88, 8); dot(c, 0, 88, 3); c.restore();
const p = cycle(t, 9), chosen = Math.floor(t / 9) % 4;
const branch = (x, y, depth, id) => { if (depth > 2) return; for (let b = 0; b < 2; b++) { const nx = x - 50 / (depth + 1) + b * 100 / (depth + 1), ny = y + 40, nid = id * 2 + b; const live = (chosen >> (2 - depth)) % 2 === b && (depth === 0 || true); c.save(); c.globalAlpha *= seg(p, depth * .2, depth * .2 + .2) * (live ? 1 : .35); line(c, x, y, nx, ny); circle(c, nx, ny, live ? 4 : 2.5); c.restore(); branch(nx, ny, depth + 1, nid); } };
dot(c, 150, 345, 3); branch(150, 345, 0, 1);
c.font = '9px monospace'; c.save(); c.globalAlpha *= .7; c.fillText('OBSERVING ' + String(Math.floor(t * 37) % 10000).padStart(4, '0') + ' FUTURES', 70, 40); c.restore();
},
// 말쿠트: 끝없이 안으로 빨려드는 액자, 무한대 궤도를 도는 빛, 제 꼬리를 무는 고리
malkuth(c, t) {
const z = cycle(t, 6);
for (let i = 0; i < 7; i++) { const k = Math.pow(.62, i - z), w = 260 * k, h = 200 * k; if (w < 4 || w > 600) continue; c.save(); c.globalAlpha *= Math.min(1, w / 60) * Math.min(1, (420 - w) / 160 + .2); c.translate(150, 150); c.rotate((i - z) * .12); c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); }
c.save(); c.translate(150, 345);
const L = (a) => [95 * Math.cos(a) / (1 + Math.sin(a) ** 2), 95 * Math.sin(a) * Math.cos(a) / (1 + Math.sin(a) ** 2)];
c.beginPath(); for (let i = 0; i <= 120; i++) { const [x, y] = L(i / 120 * TAU); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
for (let k = 0; k < 4; k++) for (let d = 0; d < 8; d++) { const [x, y] = L((cycle(t, 7, k / 4) - d * .008) * TAU); c.save(); c.globalAlpha *= 1 - d / 8; dot(c, x, y, 3 - d * .3); c.restore(); }
c.restore();
c.save(); c.translate(150, 345); c.rotate(-t * .3); c.beginPath(); c.arc(0, 0, 118, .25, TAU - .1); c.stroke(); c.beginPath(); c.moveTo(118 * Math.cos(.25), 118 * Math.sin(.25)); c.lineTo(126 * Math.cos(.15), 126 * Math.sin(.15)); c.lineTo(110 * Math.cos(.1), 110 * Math.sin(.1)); c.stroke(); for (let i = 0; i < 24; i++) { const a = .3 + i / 24 * (TAU - .5); line(c, 114 * Math.cos(a), 114 * Math.sin(a), 122 * Math.cos(a), 122 * Math.sin(a)); } c.restore();
c.font = '10px monospace'; c.save(); c.globalAlpha *= .6; c.fillText('LOOP ' + Math.floor(t / 6), 20, 470); c.restore();
}
};
