// 세피로트의 나무 내비게이션
// - 첫 화면의 나무와 오른쪽 미니맵의 노드를 누르면 해당 세피라로 이동하고, 효과음과 캐릭터 동작이 나옵니다
// - 스크롤로 도착한 세피라를 "현재"로 표시하고, 지나온 세피라와 그 사이 경로(히브리 문자)에 불을 켭니다

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SFX_PATH = './assets/sfx';
const SOUND_KEY = 'sfx';
// 공격 프레임을 보여주는 시간. 효과음 앞부분의 타격감과 맞춘 길이입니다
const ACT_MS = 900;
const SFX_VOLUME = 0.7;
// 나무가 자라날 때 세피라 하나당 지연(ms). 케테르부터 말쿠트까지 차례로 켜집니다
const GROW_STEP = 90;

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
function act(orb) {
if (!orb) return;
window.clearTimeout(Number(orb.dataset.actTimer ?? 0));
orb.classList.remove('is-acting');
void orb.offsetWidth; // 연타해도 애니메이션이 매번 재생되게 리셋
orb.classList.add('is-acting');
orb.dataset.actTimer = String(window.setTimeout(() => orb.classList.remove('is-acting'), ACT_MS));
}

function pulse(el) {
el.classList.remove('is-pulse');
void el.getBoundingClientRect();
el.classList.add('is-pulse');
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

/** 첫 화면 나무가 위에서 아래로 자라나도록 노드와 경로에 지연값을 줍니다 */
function prepareGrowth(tree) {
if (!tree) return;
tree.querySelectorAll('.node').forEach((n) => n.style.setProperty('--d', String(Number(n.dataset.seph) * GROW_STEP)));
tree.querySelectorAll('.path').forEach((p) => {
p.setAttribute('pathLength', '1');
p.style.setProperty('--d', String(Math.min(Number(p.dataset.a), Number(p.dataset.b)) * GROW_STEP + 60));
});
}

/**
 * @param {{ scrollTo: (el: HTMLElement) => void }} nav 섹션 이동 함수
 */
export function initSephirot(nav) {
const chapters = [...document.querySelectorAll('section.chapter[data-seph]')];
if (!chapters.length) return;
const byNum = new Map(chapters.map((c) => [c.dataset.seph, c]));
const hero = document.querySelector('#tree');
const heroTree = document.querySelector('.ht-tree');
const nodes = [...document.querySelectorAll('.tree-nav .node[data-seph]')];
const topbar = document.querySelector('[data-topbar]');
const minimap = document.querySelector('[data-minimap]');
const sky = document.querySelector('.sky');
const tbNum = document.querySelector('[data-tb-num]');
const tbName = document.querySelector('[data-tb-name]');
const tbNow = document.querySelector('[data-tb-now]');

prepareGrowth(heroTree);

const visited = new Set();
let current = '';

const lightPaths = () => {
const lit = (el) => visited.has(el.dataset.a) && visited.has(el.dataset.b);
document.querySelectorAll('.tree-nav .path, .tree-nav .path-badge').forEach((el) => el.classList.toggle('is-lit', lit(el)));
nodes.forEach((n) => n.classList.toggle('is-visited', visited.has(n.dataset.seph)));
};

const setCurrent = (num) => {
if (num === current) return;
current = num;
visited.add(num);
const chapter = byNum.get(num);
chapter?.classList.add('is-open');
nodes.forEach((n) => {
const isCur = n.dataset.seph === num;
n.classList.toggle('is-current', isCur);
if (isCur) n.setAttribute('aria-current', 'true');
else n.removeAttribute('aria-current');
});
lightPaths();
// 상단 바와 배경 색을 지금 세피라 색으로
const name = chapter?.querySelector('.b-tag')?.childNodes[1]?.textContent?.trim() ?? '';
const meaning = chapter?.querySelector('.b-he')?.textContent?.split('·')[1]?.trim() ?? '';
if (topbar) topbar.dataset.seph = num;
if (tbNum) tbNum.textContent = num;
if (tbName) tbName.textContent = meaning ? `${name} · ${meaning}` : name;
if (tbNow && chapter) tbNow.setAttribute('href', `#${chapter.id}`);
sky?.style.setProperty('--sky-tint', `var(--c${num})`);
};

// 화면 가운데 띠에 들어온 세피라를 "현재"로 봅니다
const currentObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) setCurrent(entry.target.dataset.seph);
});
}, { rootMargin: '-40% 0px -50% 0px' });
chapters.forEach((c) => currentObserver.observe(c));

// 조금이라도 보이기 시작하면 내용을 엽니다
const openObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-open');
openObserver.unobserve(entry.target);
});
}, { rootMargin: '0px 0px -12% 0px' });
chapters.forEach((c) => openObserver.observe(c));

// 첫 화면(나무)을 벗어나면 상단 바와 미니맵을 보여줍니다
if (hero) {
new IntersectionObserver(([entry]) => {
const away = !entry.isIntersecting;
topbar?.classList.toggle('is-shown', away);
minimap?.classList.toggle('is-shown', away);
}, { threshold: 0.15 }).observe(hero);
}

// 노드 클릭: 효과음 + 파동 + 이동 + 캐릭터 동작
nodes.forEach((node) => {
node.addEventListener('click', (event) => {
event.preventDefault();
const num = node.dataset.seph;
const chapter = byNum.get(num);
if (!chapter) return;
playSfx(chapter.id);
pulse(node);
chapter.classList.add('is-open');
nav.scrollTo(chapter);
window.setTimeout(() => act(chapter.querySelector('.orb')), reduceMotion.matches ? 0 : 650);
chapter.focus({ preventScroll: true });
history.replaceState(null, '', `#${chapter.id}`);
});
});

// 세피라 캐릭터를 직접 눌러도 효과음과 동작이 나옵니다
document.querySelectorAll('[data-orb]').forEach((orb) => {
orb.addEventListener('click', () => {
playSfx(orb.dataset.orb);
act(orb);
});
});

initSoundToggle();
const fromHash = chapters.find((c) => `#${c.id}` === location.hash);
setCurrent((fromHash ?? chapters[0]).dataset.seph);
// 첫 화면에서는 아직 아무 세피라도 지나지 않은 상태로 보여줍니다
if (!fromHash) {
visited.clear();
current = '';
nodes.forEach((n) => n.classList.remove('is-current'));
lightPaths();
}
}
