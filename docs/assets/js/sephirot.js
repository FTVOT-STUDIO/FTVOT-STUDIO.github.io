// 세피로트의 나무 내비게이션
// - 페이지 자체가 나무입니다. 구(球)의 실제 위치를 재서 22개 경로를 그립니다
// - 스크롤로 도착한 세피라를 "현재"로 표시하고, 지나온 세피라와 그 사이 경로에 불을 켭니다
// - 구나 나무 목차의 노드를 누르면 해당 세피라로 이동하면서 효과음과 캐릭터 동작이 재생됩니다
// - 도착한 세피라는 축복 문구부터 차례로 열립니다

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SFX_PATH = './assets/sfx';
const SOUND_KEY = 'sfx';
// 공격 프레임을 보여주는 시간. 효과음 앞부분의 타격감과 맞춘 길이입니다
const ACT_MS = 900;
const SFX_VOLUME = 0.7;

/** @type {Map<string, HTMLAudioElement>} 처음 누를 때 만들어서 재사용합니다 */
const audioCache = new Map();
/** @type {HTMLAudioElement | null} */
let playing = null;
let soundOn = true;

function playSfx(sid) {
if (!soundOn) return;
let audio = audioCache.get(sid);
if (!audio) {
audio = new Audio(`${SFX_PATH}/${sid}.mp3`);
audio.preload = 'auto';
audio.volume = SFX_VOLUME;
audioCache.set(sid, audio);
}
// 이전 효과음이 끝나기 전에 다른 세피라를 누르면 이전 것을 끊고 새로 재생합니다
if (playing && playing !== audio) {
playing.pause();
playing.currentTime = 0;
}
audio.currentTime = 0;
playing = audio;
audio.play().catch(() => {
// 자동재생 정책 등으로 막혀도 화면 동작은 계속합니다
});
}

/** 세피라 캐릭터를 공격 프레임으로 잠깐 바꿉니다 */
function act(sphere) {
if (!sphere) return;
window.clearTimeout(Number(sphere.dataset.actTimer ?? 0));
sphere.classList.remove('is-acting');
void sphere.offsetWidth; // 연타해도 애니메이션이 매번 재생되게 리셋
sphere.classList.add('is-acting');
sphere.dataset.actTimer = String(window.setTimeout(() => sphere.classList.remove('is-acting'), ACT_MS));
}

function initSoundToggle() {
const toggle = document.querySelector('[data-sound-toggle]');
try {
soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
} catch (error) {
soundOn = true;
}
const sync = () => {
if (!toggle) return;
toggle.setAttribute('aria-pressed', String(soundOn));
toggle.textContent = soundOn ? '효과음 끄기' : '효과음 켜기';
};
sync();
toggle?.addEventListener('click', () => {
soundOn = !soundOn;
if (!soundOn && playing) playing.pause();
try {
localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
} catch (error) {
// 저장이 막혀도 현재 페이지에서는 유지됩니다
}
sync();
});
}

// 세피로트의 22개 경로 (번호: [시작 세피라, 끝 세피라])
const PATHS = {
11: [1, 2], 12: [1, 3], 13: [1, 6], 14: [2, 3], 15: [2, 6], 16: [2, 4], 17: [3, 6], 18: [3, 5],
19: [4, 5], 20: [4, 6], 21: [4, 7], 22: [5, 6], 23: [5, 8], 24: [6, 7], 25: [6, 9], 26: [6, 8],
27: [7, 8], 28: [7, 9], 29: [7, 10], 30: [8, 9], 31: [8, 10], 32: [9, 10],
};
const SVG_NS = 'http://www.w3.org/2000/svg';

/** 페이지의 구(球) 위치를 재서 경로 선을 다시 그립니다 */
function drawLines(page, svg, spheres) {
const box = page.getBoundingClientRect();
const center = new Map();
spheres.forEach((sp) => {
const ring = sp.querySelector('.sphere-ring');
const r = (ring ?? sp).getBoundingClientRect();
center.set(sp.dataset.seph, { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 });
});
svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
const frag = document.createDocumentFragment();
const badges = document.createDocumentFragment();
Object.entries(PATHS).forEach(([num, [a, b]]) => {
const p1 = center.get(String(a));
const p2 = center.get(String(b));
if (!p1 || !p2) return;
const line = document.createElementNS(SVG_NS, 'line');
line.setAttribute('x1', p1.x.toFixed(1));
line.setAttribute('y1', p1.y.toFixed(1));
line.setAttribute('x2', p2.x.toFixed(1));
line.setAttribute('y2', p2.y.toFixed(1));
line.dataset.a = String(a);
line.dataset.b = String(b);
frag.append(line);
// 경로 번호 배지: 선의 가운데
const g = document.createElementNS(SVG_NS, 'g');
g.setAttribute('class', 'lb');
g.dataset.a = String(a);
g.dataset.b = String(b);
const cx = (p1.x + p2.x) / 2;
const cy = (p1.y + p2.y) / 2;
const c = document.createElementNS(SVG_NS, 'circle');
c.setAttribute('cx', cx.toFixed(1));
c.setAttribute('cy', cy.toFixed(1));
c.setAttribute('r', '13');
const t = document.createElementNS(SVG_NS, 'text');
t.setAttribute('x', cx.toFixed(1));
t.setAttribute('y', (cy + 4).toFixed(1));
t.textContent = num;
g.append(c, t);
badges.append(g);
});
svg.replaceChildren(frag, badges);
}

/**
 * @param {{ scrollTo: (el: HTMLElement) => void }} nav 스크롤 이동 함수 (Lenis 유무를 main.js가 감춥니다)
 */
export function initSephirot(nav) {
const sections = [...document.querySelectorAll('section.seph[data-seph]')];
if (!sections.length) return;
const byNum = new Map(sections.map((s) => [s.dataset.seph, s]));
const page = document.querySelector('[data-tree-page]');
const svg = document.querySelector('[data-tree-lines]');
const spheres = [...document.querySelectorAll('.sphere[data-seph]')];
const dialogNodes = [...document.querySelectorAll('.tree-dialog .node[data-seph]')];
const mbar = document.querySelector('[data-mbar]');
const mbarNum = document.querySelector('[data-mbar-num]');
const mbarName = document.querySelector('[data-mbar-name]');
const mbarNow = document.querySelector('[data-mbar-now]');
const dialog = document.querySelector('[data-tree-dialog]');

const visited = new Set();
let current = '';

const lightPaths = () => {
const lit = (el) => visited.has(el.dataset.a) && visited.has(el.dataset.b);
document.querySelectorAll('[data-tree-lines] line, [data-tree-lines] .lb, .tree-dialog .path, .tree-dialog .path-badge').forEach((el) => {
el.classList.toggle('is-lit', lit(el));
});
};

// 레이아웃이 바뀔 때마다(이미지 로드, 창 크기, 내용판 열림) 경로를 다시 잽니다
let raf = 0;
const redraw = () => {
cancelAnimationFrame(raf);
raf = requestAnimationFrame(() => {
if (page && svg) drawLines(page, svg, spheres);
lightPaths();
});
};
if (page) new ResizeObserver(redraw).observe(page);
window.addEventListener('load', redraw);
redraw();

const open = (section) => {
if (section.classList.contains('is-open')) return;
section.classList.add('is-open');
};

const setCurrent = (num) => {
if (num === current) return;
current = num;
visited.add(num);
const section = byNum.get(num);
if (section) open(section);
sections.forEach((s) => {
s.classList.toggle('is-current', s.dataset.seph === num);
s.classList.toggle('is-visited', visited.has(s.dataset.seph));
});
dialogNodes.forEach((n) => {
n.classList.toggle('is-current', n.dataset.seph === num);
n.classList.toggle('is-visited', visited.has(n.dataset.seph));
});
spheres.forEach((sp) => {
if (sp.dataset.seph === num) sp.setAttribute('aria-current', 'true');
else sp.removeAttribute('aria-current');
});
lightPaths();
const name = section?.querySelector('.sphere-name')?.textContent ?? '';
const he = section?.querySelector('.b-he')?.textContent ?? '';
const meaning = he.split('·')[1]?.trim() ?? '';
if (mbar) {
mbar.dataset.seph = num;
if (mbarNum) mbarNum.textContent = num;
if (mbarName) mbarName.textContent = meaning ? `${name} · ${meaning}` : name;
if (mbarNow) mbarNow.setAttribute('href', `#${section?.id ?? 'kether'}`);
}
};

// 화면 가운데 띠에 들어온 세피라를 "현재"로 봅니다
const observer = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) setCurrent(entry.target.dataset.seph);
});
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach((s) => observer.observe(s));

// 구가 화면에 들어오면 내용판을 엽니다 (나란히 있는 두 세피라도 각각 열림)
const reveal = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
const section = entry.target.closest('section.seph');
if (section) {
open(section);
visited.add(section.dataset.seph);
section.classList.add('is-visited');
lightPaths();
}
reveal.unobserve(entry.target);
});
}, { threshold: 0.6 });
spheres.forEach((sp) => reveal.observe(sp));

/** 세피라로 가기: 효과음 + 파동 + 이동 + 캐릭터 동작 */
const go = (num, viaSphere) => {
const section = byNum.get(num);
if (!section) return;
const sphere = section.querySelector('.sphere');
playSfx(section.id);
if (sphere) {
sphere.classList.remove('is-pulse');
void sphere.offsetWidth;
sphere.classList.add('is-pulse');
}
if (dialog?.open) dialog.close();
open(section);
setCurrent(num);
if (!viaSphere) nav.scrollTo(section);
window.setTimeout(() => act(sphere), viaSphere || reduceMotion.matches ? 0 : 450);
section.focus({ preventScroll: true });
history.replaceState(null, '', `#${section.id}`);
};

spheres.forEach((sp) => {
sp.addEventListener('click', (event) => {
event.preventDefault();
// 이미 보이는 구를 눌렀으면 제자리에서, 아니면 그 세피라로 이동합니다
const r = sp.getBoundingClientRect();
const visible = r.top >= 0 && r.bottom <= window.innerHeight;
go(sp.dataset.seph, visible);
if (!visible) nav.scrollTo(sp.closest('section'));
});
});
dialogNodes.forEach((node) => {
node.addEventListener('click', (event) => {
event.preventDefault();
go(node.dataset.seph, false);
});
});

document.querySelector('[data-tree-open]')?.addEventListener('click', () => dialog?.showModal());
dialog?.addEventListener('click', (event) => {
if (event.target === dialog) dialog.close();
});

initSoundToggle();

const fromHash = sections.find((s) => `#${s.id}` === location.hash);
setCurrent((fromHash ?? sections[0]).dataset.seph);
}
