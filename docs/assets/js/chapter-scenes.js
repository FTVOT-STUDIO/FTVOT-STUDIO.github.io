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
let width = 0, height = 0, frame = 0, last = 0, time = 0;
const resize = () => {
width = innerWidth; height = innerHeight;
// 레티나 배율을 따라 확대하지 않고 실제 버퍼의 긴 변을 1600px 이내로 제한합니다.
const scale = Math.min(1, 1600 / Math.max(width, height));
canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
ctx.setTransform(scale, 0, 0, scale, 0, 0);
request();
};
const draw = (now) => {
frame = 0;
if (document.hidden) { last = 0; return; }
if (!reduce.matches && last && now - last < 1000 / 24) { frame = requestAnimationFrame(draw); return; }
if (last && !reduce.matches) time += Math.min((now - last) / 1000, 0.1);
last = now;
ctx.clearRect(0, 0, width, height);
let selected = null, nearest = Infinity, rect = null;
for (const chapter of visible) {
const bounds = chapter.getBoundingClientRect();
const distance = Math.abs(Math.max(bounds.top, 0) + Math.min(bounds.bottom, height) - height);
if (bounds.bottom > 0 && bounds.top < height && distance < nearest) { selected = chapter; nearest = distance; rect = bounds; }
}
if (!selected) { last = 0; return; }
const color = getComputedStyle(selected).getPropertyValue('--sc').trim();
ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.1;
ctx.save();
ctx.beginPath(); ctx.rect(0, Math.max(0, rect.top), width, Math.min(height, rect.bottom) - Math.max(0, rect.top)); ctx.clip();
const mobile = width < 768;
const size = mobile ? Math.min(width * 0.46, 180) : Math.min(width * 0.26, 340);
const scale = size / 300;
const panelHeight = 480 * scale;
const top = Math.max(50, Math.min(height - panelHeight - 20, (height - panelHeight) / 2));
const scene = scenes[selected.id];
if (scene) {
for (let side = 0; side < 2; side += 1) {
ctx.save();
ctx.translate(side ? width - size + (mobile ? 40 : 20) : (mobile ? -40 : -20), top + (side ? 0 : 50));
ctx.scale(scale, scale);
ctx.globalAlpha = mobile ? 0.22 : 0.43;
scene(ctx, reduce.matches ? 6 : time + side * 3.7, side);
ctx.restore();
}
}
ctx.restore();
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

const scenes = {
kether(c,t) {
for(let i=0;i<9;i++){
const p=cycle(t,12,i/9),x=35+(i*79)%230,y=30+(i*113)%390;
c.save();c.globalAlpha*=Math.sin(p*Math.PI);
if(p<.63){const r=1+Math.sin(p/.63*Math.PI)*7;star(c,x,y,r);circle(c,x,y,r*2.3);dot(c,x,y,1.7);}
else {const r=(p-.63)*140;circle(c,x,y,r);circle(c,x,y,r*.65);dot(c,x,y,Math.max(1,4*(1-p)));}
c.restore();
}
c.save();c.translate(150,250);c.rotate(t*.08);ellipse(c,0,0,95,25);ellipse(c,0,0,79,18);circle(c,0,0,24);c.restore();
},
chokmah(c,t,side) {
const code=side?['// POSSIBILITY ENGINE','using UnityEngine;','class World : MonoBehaviour','{','  void Update()','  {','    Create(possibility);','  }','}']:['// KNOWLEDGE ARCHIVE','const truth = observe();','def explore(universe):','  return universe.expand()','template <class Future>','void Create(World& world);','SELECT * FROM possibility;'];
const progress=cycle(t,18)* (code.reduce((n,l)=>n+l.length,0)+38);let remaining=Math.floor(progress);
c.strokeRect(22,55,256,325);line(c,22,84,278,84);for(let i=0;i<3;i++)circle(c,34+i*10,70,1.5);
c.font='11px monospace';
for(let i=0;i<code.length;i++){const count=Math.max(0,Math.min(code[i].length,remaining));c.fillText(code[i].slice(0,count),34,110+i*28);if(remaining>=0&&remaining<code[i].length)line(c,35+count*6.6,99+i*28,35+count*6.6,113+i*28);remaining-=code[i].length;}
for(let i=0;i<5;i++){const x=40+i*52;line(c,x,385,x,420+(i%2)*18);dot(c,x,400+cycle(t,5,i/5)*35,2);}
},
binah(c,t) {
for(let i=0;i<3;i++){
const p=cycle(t,16,i/3),x=60+i*82,base=405-i*55,grow=Math.min(1,p*3),h=grow*95;
c.save();c.globalAlpha*=p>.64?Math.max(.15,1-(p-.64)*2):1;
c.beginPath();c.moveTo(x,base);c.quadraticCurveTo(x-12,base-h*.5,x,base-h);c.stroke();
if(grow>.2){ellipse(c,x-12,base-h*.55,15*grow,6*grow,-.5);ellipse(c,x+12,base-h*.75,15*grow,6*grow,.5);}
ellipse(c,x,base+5,22,4);c.restore();
if(p>.4){const flight=(p-.4)/.6; c.save();c.globalAlpha*=Math.sin(flight*Math.PI);butterfly(c,x+Math.sin(flight*5+i)*30,base-100-flight*180,t+i,1.15);c.restore();}
}
},
chesed(c,t) {
for(let i=0;i<8;i++){const x=18+i*35,h=65+(i*47)%100;c.strokeRect(x,420-h,27,h);for(let w=0;w<2;w++)for(let j=0;j<4;j++)if((i+j+w)%3)c.strokeRect(x+6+w*10,430-h+j*19,3,5);}
line(c,0,422,300,422);
for(let i=0;i<36;i++){const p=cycle(t,5+i%4,i/36);const x=((i*67+p*210)%360)-30,y=p*430;line(c,x,y,x+4,y+2);}
for(let i=0;i<4;i++){const y=80+i*78+Math.sin(t*.5+i)*14;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(80,y-30,180,y+30,300,y-15);c.stroke();}
},
gevurah(c,t) {
gear(c,95,145,62,t*.3);gear(c,205,202,51,-t*.37);gear(c,92,272,38,-t*.49);
line(c,30,335,110,335);line(c,110,335,145,300);line(c,145,300,260,300);
for(let i=0;i<3;i++){circle(c,40+i*110,370,11);line(c,40+i*110,360,40+i*110,380);}
const shot=cycle(t,7);if(shot>.55&&shot<.78){c.save();c.globalAlpha*=Math.sin((shot-.55)/.23*Math.PI);c.lineWidth=2;line(c,25,330,275,100);star(c,275,100,14);c.restore();}
c.save();c.translate(250,85);c.rotate(t*.25);c.strokeRect(-19,-19,38,38);line(c,-28,0,28,0);line(c,0,-28,0,28);c.restore();
},
tiferet(c,t) {
const pressure=(Math.sin(t*.5)+1)/2;heart(c,150,240,1+Math.sin(t*1.2)*.04);circle(c,150,220,97-pressure*10);
for(let side=0;side<2;side++){
c.save();c.translate(150,235);c.rotate((side?-.65:.65)+Math.sin(t*.35)*.04);
for(let i=-7;i<=7;i++){ellipse(c,i*24,0,15,7);}
c.restore();
}
c.strokeRect(137,236,26,25);c.beginPath();c.arc(150,236,10,Math.PI,0);c.stroke();line(c,150,246,150,253);
for(let i=0;i<3;i++){const x=50+i*95,y=70+(i%2)*30;line(c,x,y-15,x,y+20);line(c,x-12,y-4,x+12,y-4);}
},
netzach(c,t) {
// 전장의 상실은 쓰러진 실루엣과 꺾인 깃발로 표현해 본문을 가리는 잔혹 묘사를 피합니다.
for(let i=0;i<7;i++){
const x=27+i*38,p=cycle(t,15,i*.035),fall=p>.5?Math.min(1,(p-.5)*6):0;
c.save();c.translate(x,365+i%2*22);c.rotate(fall*1.3);circle(c,0,-29,5);line(c,0,-23,0,1);line(c,-12,-12,11,-12);line(c,0,1,-9,16);line(c,0,1,9,16);line(c,13,-32,13,10);c.restore();
}
for(let i=0;i<3;i++){const x=40+i*105;line(c,x,110+i*25,x,330);c.beginPath();c.moveTo(x,115+i*25);c.quadraticCurveTo(x+25,105+i*25+Math.sin(t+i)*8,x+43,126+i*25);c.lineTo(x+40,175+i*25);c.lineTo(x,165+i*25);c.stroke();}
const p=cycle(t,8);if(p<.35){c.save();c.globalAlpha*=Math.sin(p/.35*Math.PI);line(c,20,310,275,110);line(c,32,317,265,129);c.restore();}
line(c,0,415,300,415);for(let i=0;i<5;i++)line(c,30+i*58,435,40+i*58,390);
},
hod(c,t) {
const points=[[65,120],[230,230],[80,355]];
for(let i=0;i<3;i++){
const [x,y]=points[i],p=cycle(t,14,i/3);c.save();c.globalAlpha*=.25+.75*Math.sin(p*Math.PI);insect(c,x,y,.5+i*.3,t+i);circle(c,x,y,27+i*12);c.restore();
const [nx,ny]=points[(i+1)%3];line(c,x,y+30,nx,ny-30);const f=cycle(t,6,i/3);dot(c,x+(nx-x)*f,y+(ny-y)*f,2.4);
for(let j=0;j<3;j++){const egg=cycle(t,14,i/3+j*.08);ellipse(c,x-18+j*18,y+60,3+egg*2,6+egg*2);}
}
},
yesod(c,t) {
c.beginPath();c.moveTo(42,220);c.quadraticCurveTo(150,122,258,220);c.quadraticCurveTo(150,318,42,220);c.stroke();
for(let i=0;i<4;i++)circle(c,150,220,18+i*18);
c.save();c.translate(150,220);c.rotate(t*.13);c.beginPath();for(let i=0;i<100;i++){const a=i*.18,r=3+i*.65;if(!i)c.moveTo(Math.cos(a)*r,Math.sin(a)*r);else c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();c.restore();
for(let i=0;i<5;i++){const x=30+i*60,y=350+Math.abs(i-2)*24;line(c,150,300,x,y);circle(c,x,y,7);const p=cycle(t,8,i/5);dot(c,150+(x-150)*p,300+(y-300)*p,2);}
c.font='10px monospace';c.fillText('OBSERVE / POSSIBLE FUTURES',34,65);
},
malkuth(c,t) {
c.save();c.translate(150,235);
for(let side of [-1,1])for(let i=0;i<7;i++){c.beginPath();c.moveTo(side*25,20+i*5);c.quadraticCurveTo(side*(130-i*10),-40-i*11,side*(98-i*9),-120+i*9);c.stroke();}
for(let i=0;i<4;i++){const p=cycle(t,14,i/4);c.save();c.globalAlpha*=Math.sin(p*Math.PI);ellipse(c,0,-75,30+p*90,12+p*32);c.restore();}
c.beginPath();for(let i=0;i<=100;i++){const a=i/100*TAU,x=100*Math.cos(a)/(1+Math.sin(a)**2),y=100*Math.sin(a)*Math.cos(a)/(1+Math.sin(a)**2);if(!i)c.moveTo(x,y+95);else c.lineTo(x,y+95);}c.stroke();
for(let i=0;i<3;i++){const a=cycle(t,12,i/3)*TAU;dot(c,100*Math.cos(a)/(1+Math.sin(a)**2),95+100*Math.sin(a)*Math.cos(a)/(1+Math.sin(a)**2),3);}
c.restore();
}
};
