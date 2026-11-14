// 장별 장면을 같은 화면에서 서서히 겹쳐 단일 캔버스만 유지합니다.
export function initCosmos() {
const chapters = [...document.querySelectorAll('.chapter')];
const canvas = document.createElement('canvas');
canvas.className = 'cosmos-stage'; canvas.setAttribute('aria-hidden', 'true');
document.body.append(canvas);
const c = canvas.getContext('2d');
if (!c) { canvas.remove(); return; }
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const visible = new Set();
let w=0,h=0,frame=0,last=0,time=0,mx=0,my=0;
const draw = (now) => {
frame=0;
if (document.hidden) { last=0; return; }
if (!reduced.matches && last && now-last<50) { frame=requestAnimationFrame(draw); return; }
if(last&&!reduced.matches)time+=Math.min((now-last)/1000,.12);
last=now; c.clearRect(0,0,w,h);
let count=0;
for (const section of visible) {
const r=section.getBoundingClientRect();
const overlap=Math.max(0,Math.min(h,r.bottom)-Math.max(0,r.top))/h;
if(!overlap)continue;
const scene=worlds[section.id];if(!scene)continue;
const color=getComputedStyle(section).getPropertyValue('--sc').trim();
c.save(); c.strokeStyle=color; c.fillStyle=color; c.lineWidth=.8;
c.globalAlpha=Math.pow(overlap,1.45)*.66;
c.translate(reduced.matches?0:mx*9,reduced.matches?0:my*6);
scene(c,w,h,reduced.matches?12:time);
c.restore(); count++;
}
if(canvas.dataset.active!==String(count))canvas.dataset.active=String(count);
if(count&&!reduced.matches)frame=requestAnimationFrame(draw);else last=0;
};
const request=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);};
const resize=()=>{
w=innerWidth;h=innerHeight;const ratio=Math.min(1,1440/Math.max(w,h));
canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);c.setTransform(ratio,0,0,ratio,0,0);request();
};
const observer=new IntersectionObserver((entries)=>{for(const e of entries){if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target);}request();});
chapters.forEach(s=>observer.observe(s));
window.addEventListener('resize',resize);
window.addEventListener('scroll',request,{passive:true});
window.addEventListener('pointermove',(e)=>{if(e.pointerType==='mouse'){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;}},{passive:true});
const sync=()=>{cancelAnimationFrame(frame);frame=0;last=0;request();};
reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0;});window.addEventListener('pageshow',request);
resize();
}
const TAU=Math.PI*2;
const phase=(t,d,o=0)=>(t/d+o)%1;
function line(c,x,y,a,b){c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();}
function ring(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);c.stroke();}
function dot(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);c.fill();}
function oval(c,x,y,a,b,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(.1,a),Math.max(.1,b),rotation,0,TAU);c.stroke();}
function mist(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.save();c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function cog(c,x,y,r,t){c.save();c.translate(x,y);c.rotate(t);c.beginPath();for(let i=0;i<96;i++){const a=i/96*TAU,s=r*(i%4<2?1:.94);if(i)c.lineTo(Math.cos(a)*s,Math.sin(a)*s);else c.moveTo(s,0);}c.closePath();c.stroke();ring(c,0,0,r*.77);ring(c,0,0,r*.58);for(let i=0;i<8;i++){const a=i/8*TAU;line(c,Math.cos(a)*r*.22,Math.sin(a)*r*.22,Math.cos(a)*r*.57,Math.sin(a)*r*.57);}ring(c,0,0,r*.2);c.restore();}
const worlds={
kether(c,w,h,t){
const x=w*.09,y=h*.47,r=Math.min(w*.18,190);
mist(c,x,y,r*2,'rgba(142,92,192,.12)');
const halo=c.createRadialGradient(x,y,r*.4,x,y,r*.9);halo.addColorStop(0,'transparent');halo.addColorStop(.13,'rgba(204,157,255,.24)');halo.addColorStop(.28,'rgba(128,91,168,.06)');halo.addColorStop(1,'transparent');c.save();c.fillStyle=halo;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
c.save();c.translate(x,y);c.rotate(-.45);for(let i=0;i<5;i++)oval(c,0,0,r*(1+i*.08),r*(.26+i*.025));c.restore();
c.save();c.fillStyle='#08080d';dot(c,x,y,r*.43);c.restore();ring(c,x,y,r*.46);
for(let i=0;i<18;i++){const p=phase(t,18,i/18),sx=(i*137+73)%w,sy=(i*83+31)%h;c.save();c.globalAlpha*=Math.sin(p*Math.PI)**2;const birth=p<.65?Math.sin(p/.65*Math.PI)*3:1;dot(c,sx,sy,Math.max(.4,birth));if(p>.65){c.globalAlpha*=.5;ring(c,sx,sy,(p-.65)*90);}c.restore();}
},
chokmah(c,w,h,t){
const left=['using UnityEngine;','public class World','{','  void Create()','  {','    universe.Expand();','  }','}'];
const right=['// possibilities','const truth = observe();','def create(world):','  return world.grow()','Future<T> explore();','git commit -m "create"'];
c.font=(w<600?'9':'12')+'px monospace';
for(let side=0;side<2;side++){const rows=side?right:left,space=34,x=side?w-Math.min(215,w*.25):16;let chars=Math.floor(phase(t,22,side*.3)*190);for(let i=0;i<rows.length;i++){const n=Math.max(0,Math.min(rows[i].length,chars));c.save();c.globalAlpha*=.5;c.fillText(rows[i].slice(0,n),x,h*.2+i*space);if(chars>=0&&chars<rows[i].length)line(c,x+n*(w<600?5.4:7.2),h*.2+i*space+4,x+n*(w<600?5.4:7.2),h*.2+i*space-9);c.restore();chars-=rows[i].length;}}
for(let i=0;i<5;i++){const y=h*.7+i*25;c.beginPath();c.moveTo(0,y);c.lineTo(w*.1,y);c.lineTo(w*.14,y-24);c.lineTo(w*.23,y-24);c.stroke();dot(c,w*.23,y-24,1.5);}
},
binah(c,w,h,t){
for(let side=0;side<2;side++){const x=side?w-22:22,dir=side?-1:1;
for(let branch=0;branch<3;branch++){const p=phase(t,23,branch*.26),growth=Math.min(1,p*2.8),length=(140+branch*75)*growth,base=h-30-branch*100;c.beginPath();c.moveTo(x,base);c.bezierCurveTo(x+dir*70,base-length*.2,x-dir*25,base-length*.6,x+dir*40,base-length);c.stroke();for(let i=1;i<5;i++){const yy=base-length*i/5,xx=x+dir*(i%2?30:2);c.save();c.globalAlpha*=.6;oval(c,xx+dir*12,yy,18*growth,5*growth,dir*-.65);c.restore();}
if(p>.43){const f=(p-.43)/.57,bx=x+dir*(40+f*110)+Math.sin(f*7)*12,by=base-length-f*170;c.save();c.globalAlpha*=Math.sin(f*Math.PI);const wing=3+Math.abs(Math.sin(t*4+branch))*9;oval(c,bx-wing,by-4,wing,7,-.4);oval(c,bx+wing,by-4,wing,7,.4);line(c,bx,by-9,bx,by+8);c.restore();}}
}
},
// 헤세드의 도시·눈보라는 chapter-scenes.js가 그립니다. 여기서도 그리면 도시가 두 겹으로 겹쳐 보입니다
chesed(){},
gevurah(c,w,h,t){
const r=Math.min(190,w*.21);cog(c,-r*.13,h*.33,r,t*.04);cog(c,w+r*.25,h*.73,r*1.2,-t*.035);
for(let side=0;side<2;side++){const x=side?w-30:30;line(c,x,h*.12,x,h*.8);for(let j=0;j<6;j++)line(c,x-4,h*.12+j*40,x+4,h*.12+j*40);}
const p=phase(t,13);if(p>.52&&p<.75){c.save();c.globalAlpha*=Math.sin((p-.52)/.23*Math.PI)*.6;line(c,0,h*.75,w,h*.22);c.lineWidth=2;line(c,0,h*.75,w*.13,h*.68);c.restore();}
},
tiferet(c,w,h,t){
const x=w*.87,y=h*.4,r=Math.min(w*.15,140);mist(c,x,y,r*1.7,'rgba(193,103,141,.12)');
for(let i=0;i<3;i++)ring(c,x,y,r*(.65+i*.18)+Math.sin(t*.4+i)*3);
line(c,x,y-r*.9,x,y+r*.9);line(c,x-r*.4,y-r*.3,x+r*.4,y-r*.3);
for(let side=0;side<2;side++){c.save();c.translate(side?w*.91:w*.06,h*.48);c.rotate(side?-.52:.52);c.translate(Math.sin(t*.25)*5,0);for(let i=-15;i<=15;i++)oval(c,0,i*25,7,16,i%2?.18:-.18);c.restore();}
c.save();c.globalAlpha*=.45;const hx=w*.1,hy=h*.4;c.beginPath();c.moveTo(hx,hy+35);c.bezierCurveTo(hx-80,hy-15,hx-20,hy-75,hx,hy-32);c.bezierCurveTo(hx+30,hy-75,hx+80,hy-10,hx,hy+35);c.stroke();c.restore();
},
netzach(c,w,h,t){
const x=w*.9,y=h*.25,r=Math.min(w*.1,100);c.save();c.globalAlpha*=.35;dot(c,x,y,r);c.fillStyle='#08080d';dot(c,x-r*.15,y-r*.08,r*.92);c.restore();
for(let i=0;i<8;i++){const px=i*w/7,base=h*.93,blade=45+(i*29)%95;c.save();c.translate(px,base);c.rotate(-.45+(i%3)*.3);line(c,0,0,0,-blade);line(c,-10,-blade*.2,10,-blade*.2);c.restore();}
for(let i=0;i<4;i++){const px=i%2?w-32-i*22:25+i*23,yy=h*.47+i*35;line(c,px,yy,px,h*.88);c.beginPath();c.moveTo(px,yy);c.bezierCurveTo(px+25,yy+Math.sin(t*.65+i)*8,px+42,yy-3,px+55,yy+8);c.lineTo(px+49,yy+55);c.lineTo(px,yy+47);c.stroke();}
const p=phase(t,17);if(p<.18){c.save();c.globalAlpha*=Math.sin(p/.18*Math.PI)*.45;line(c,w*.01,h*.74,w*.23,h*.3);line(c,w*.81,h*.7,w*.99,h*.35);c.restore();}
},
hod(c,w,h,t){
for(let side=0;side<2;side++){const edge=side?w-65:65,dir=side?-1:1;
for(let i=0;i<5;i++){const x=edge+Math.sin(i*2)*35,y=h*.17+i*h*.145,r=7+i*3,p=phase(t,21,i*.18);c.save();c.globalAlpha*=Math.sin(p*Math.PI)**2;oval(c,x,y,r,r*1.5);oval(c,x,y,r*.4,r);for(let j=0;j<3;j++)oval(c,x+dir*(28+j*12),y+23,2,4);c.restore();if(i<4){const nx=edge+Math.sin((i+1)*2)*35,ny=y+h*.145;c.beginPath();c.moveTo(x,y+r);c.quadraticCurveTo(x+dir*60,y+h*.08,nx,ny-r);c.stroke();const f=phase(t,11,i*.2);dot(c,x+(nx-x)*f+dir*Math.sin(f*Math.PI)*30,y+(ny-y)*f,2*(1-f)+.5);}}
}
},
yesod(c,w,h,t){
const x=w*.94,y=h*.48,r=Math.min(w*.25,240);
for(let i=0;i<7;i++){c.save();c.globalAlpha*=.55;ring(c,x,y,r*(.2+i*.13));c.restore();}
c.save();c.translate(x,y);c.rotate(t*.045);c.beginPath();for(let i=0;i<140;i++){const a=i*.19,rad=i*r/140;if(i)c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);else c.moveTo(0,0);}c.stroke();c.restore();
for(let i=0;i<7;i++){const by=h*.14+i*h*.11;line(c,0,h*.5,w*.12,by);line(c,w*.12,by,w*.23,by+(i%2?22:-22));const p=phase(t,17,i*.13);dot(c,w*.23*p,h*.5+(by-h*.5)*p,1.8);}
},
malkuth(c,w,h,t){
for(let side=0;side<2;side++){const x=side?w+25:-25,dir=side?-1:1;
for(let i=0;i<12;i++){c.save();c.globalAlpha*=.45;c.beginPath();c.moveTo(x,h*.65+i*5);c.bezierCurveTo(x+dir*(140-i*8),h*.5,x+dir*(210-i*10),h*.25,x+dir*(150-i*7),h*.13+i*11);c.stroke();c.restore();}
for(let i=0;i<5;i++){const p=phase(t,25,i/5);c.save();c.globalAlpha*=Math.sin(p*Math.PI)*.5;oval(c,x+dir*70,h*.6,25+p*160,15+p*90,-.4*dir);c.restore();}
}
c.save();c.globalAlpha*=.23;c.beginPath();for(let i=0;i<=100;i++){const a=i/100*TAU,x=w*.5+Math.cos(a)/(1+Math.sin(a)**2)*w*.43,y=h*.79+Math.sin(a)*Math.cos(a)/(1+Math.sin(a)**2)*h*.23;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();c.restore();
}
};
