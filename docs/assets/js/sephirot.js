// 세피로트의 나무 내비게이션
// - 스크롤로 도착한 세피라를 "현재"로 표시하고, 지나온 세피라와 그 사이 경로에 불을 켭니다
// - 노드를 누르면 해당 세피라로 이동하면서 효과음과 캐릭터 동작이 재생됩니다
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
function act(portrait) {
if (!portrait) return;
window.clearTimeout(Number(portrait.dataset.actTimer ?? 0));
portrait.classList.remove('is-acting');
void portrait.offsetWidth; // 연타해도 애니메이션이 매번 재생되게 리셋
portrait.classList.add('is-acting');
portrait.dataset.actTimer = String(window.setTimeout(() => portrait.classList.remove('is-acting'), ACT_MS));
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

/**
 * @param {{ scrollTo: (el: HTMLElement) => void }} nav 스크롤 이동 함수 (Lenis 유무를 main.js가 감춥니다)
 */
export function initSephirot(nav) {
const sections = [...document.querySelectorAll('section.seph[data-seph]')];
if (!sections.length) return;
const byNum = new Map(sections.map((s) => [s.dataset.seph, s]));
const nodes = [...document.querySelectorAll('.node[data-seph]')];
const paths = [...document.querySelectorAll('.path[data-a]')];
const badges = [...document.querySelectorAll('.path-badge[data-a]')];
const panel = document.querySelector('[data-blessing-panel]');
const mbar = document.querySelector('[data-mbar]');
const mbarNum = document.querySelector('[data-mbar-num]');
const mbarName = document.querySelector('[data-mbar-name]');
const mbarNow = document.querySelector('[data-mbar-now]');
const dialog = document.querySelector('[data-tree-dialog]');

const visited = new Set();
let current = '';

const lightPaths = () => {
const lit = (el) => visited.has(el.dataset.a) && visited.has(el.dataset.b);
paths.forEach((p) => p.classList.toggle('is-lit', lit(p)));
badges.forEach((b) => b.classList.toggle('is-lit', lit(b)));
};

const setCurrent = (num) => {
if (num === current) return;
current = num;
visited.add(num);
const section = byNum.get(num);
section?.classList.add('is-open');

nodes.forEach((n) => {
const isCur = n.dataset.seph === num;
n.classList.toggle('is-current', isCur);
n.classList.toggle('is-visited', visited.has(n.dataset.seph));
if (isCur) n.setAttribute('aria-current', 'true');
else n.removeAttribute('aria-current');
});
lightPaths();

// 나무 아래 축복 패널: 섹션 안의 문구를 그대로 옮겨 씁니다
const name = section?.querySelector('.b-tag')?.childNodes[1]?.textContent?.trim() ?? '';
const text = section?.querySelector('.b-text')?.textContent ?? '';
const ref = section?.querySelector('.b-ref')?.textContent ?? '';
const title = section?.querySelector('h1, h2')?.textContent ?? '';
if (panel) {
panel.dataset.seph = num;
panel.querySelector('[data-bp-name]').textContent = `${num}. ${name}`;
panel.querySelector('[data-bp-text]').textContent = text;
panel.querySelector('[data-bp-verse]').textContent = ref;
panel.classList.remove('is-swap');
void panel.offsetWidth;
panel.classList.add('is-swap');
}
if (mbar) {
mbar.dataset.seph = num;
if (mbarNum) mbarNum.textContent = num;
if (mbarName) mbarName.textContent = `${name} · ${num === '1' ? '프로필' : title.replace(/\s+/g, ' ').trim()}`;
if (mbarNow) mbarNow.setAttribute('href', `#${section?.id ?? 'kether'}`);
}
};

// 화면 가운데 띠에 들어온 섹션을 "현재"로 봅니다
const observer = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) setCurrent(entry.target.dataset.seph);
});
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach((s) => observer.observe(s));

// 처음부터 화면에 보이는 섹션은 바로 엽니다 (긴 화면에서 빈칸 방지)
const reveal = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) {
entry.target.classList.add('is-open');
reveal.unobserve(entry.target);
}
});
}, { threshold: 0.12 });
sections.forEach((s) => reveal.observe(s));

// 노드 클릭: 효과음 + 캐릭터 동작 + 이동
nodes.forEach((node) => {
node.addEventListener('click', (event) => {
event.preventDefault();
const num = node.dataset.seph;
const section = byNum.get(num);
if (!section) return;
playSfx(section.id);
node.classList.remove('is-pulse');
void node.getBoundingClientRect();
node.classList.add('is-pulse');
if (dialog?.open) dialog.close();
section.classList.add('is-open');
nav.scrollTo(section);
// 이동이 끝날 즈음 캐릭터가 반응하도록 살짝 늦춥니다
window.setTimeout(() => act(section.querySelector('.portrait')), reduceMotion.matches ? 0 : 450);
section.focus({ preventScroll: true });
history.replaceState(null, '', `#${section.id}`);
});
});

// 세피라 캐릭터를 직접 눌러도 효과음과 동작이 나옵니다
document.querySelectorAll('[data-portrait]').forEach((portrait) => {
portrait.addEventListener('click', () => {
playSfx(portrait.dataset.portrait);
act(portrait);
});
});

// 모바일 나무 목차
document.querySelector('[data-tree-open]')?.addEventListener('click', () => dialog?.showModal());
dialog?.addEventListener('click', (event) => {
if (event.target === dialog) dialog.close();
});

initSoundToggle();

// 주소에 #세피라가 있으면 그 세피라부터 엽니다
const fromHash = sections.find((s) => `#${s.id}` === location.hash);
setCurrent((fromHash ?? sections[0]).dataset.seph);
}
