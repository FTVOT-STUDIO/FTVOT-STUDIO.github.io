// 네차흐 정원의 캐릭터
// - 캐릭터 45명 전원을 정원에 흩어 놓고, 누르면 깡충 뜁니다
// - 장식이라 aria-hidden 안에 있습니다
import { ROSTER } from './roster.js';

const UNIT_PATH = './assets/units';

const rand = (min, max) => min + Math.random() * (max - min);

function makeImg(character, eager = false) {
const img = document.createElement('img');
img.src = `${UNIT_PATH}/${character.slug}/thumb.webp`;
img.width = character.w;
img.height = character.h;
img.alt = '';
img.decoding = 'async';
if (!eager) img.loading = 'lazy';
img.draggable = false;
return img;
}

/** 애니메이션 클래스를 다시 붙여 재생합니다(연타해도 매번 재생) */
function replay(el, className) {
el.classList.remove(className);
void el.offsetWidth; // 리플로우로 애니메이션 리셋
el.classList.add(className);
}

/* ---------------- 네차흐 정원 ---------------- */
// 45명 전원을 정원에 흩어 놓습니다. 격자에 무작위 흔들림을 줘서 겹치지 않으면서도 자연스럽게 배치합니다
function initGarden() {
const garden = document.querySelector('[data-garden]');
if (!garden) return;
const list = [...ROSTER];
for (let i = list.length - 1; i > 0; i -= 1) {
const j = Math.floor(Math.random() * (i + 1));
[list[i], list[j]] = [list[j], list[i]];
}
const cols = window.innerWidth < 768 ? 5 : 9;
const rows = Math.ceil(list.length / cols);
list.forEach((character, i) => {
const col = i % cols;
const row = Math.floor(i / cols);
const sprout = document.createElement('span');
sprout.className = 'sprout';
// 발밑 좌표(%) 기준 배치. 아래 줄일수록 크게 해서 원근감을 줍니다
const x = ((col + 0.5 + rand(-0.28, 0.28)) / cols) * 100;
const y = ((row + 1) / rows) * 88 + 6 + rand(-2, 2);
const scale = 0.72 + (row / Math.max(1, rows - 1)) * 0.45;
sprout.style.left = `${x.toFixed(2)}%`;
sprout.style.top = `${y.toFixed(2)}%`;
sprout.style.setProperty('--w', `${Math.round((window.innerWidth < 768 ? 58 : 86) * scale)}px`);
sprout.style.zIndex = String(row + 1);
sprout.append(makeImg(character));
sprout.addEventListener('click', () => replay(sprout, 'is-hop'));
garden.append(sprout);
});
const count = document.querySelector('[data-crowd-count]');
if (count) count.textContent = String(list.length);
}

export function initCharacters() {
if (!ROSTER.length) return;
initGarden();
}
