import {useEffect,useRef,useState} from 'react';

/* 미션 · 퀴즈 성공 축하: 화면 전체 위에서 색종이가 떨어져요(6.5초, 클릭은 그대로 통과).
   '동작 줄이기' 설정을 켠 사람에겐 보여 주지 않아요. */
const COLORS=['#f2862b','#ffd166','#3a74d9','#2f9e5f','#ff7aa8','#ffffff','#8fb6f5'];
export function Confetti({count=170,duration=6500}:{count?:number;duration?:number}){
 const cv=useRef<HTMLCanvasElement>(null),[done,setDone]=useState(false);
 useEffect(()=>{
  if(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches){setDone(true);return}
  const c=cv.current;if(!c)return;const g=c.getContext('2d');if(!g)return;
  const d=window.devicePixelRatio||1;let W=innerWidth,H=innerHeight;const fit=()=>{W=innerWidth;H=innerHeight;c.width=W*d;c.height=H*d;g.setTransform(d,0,0,d,0,0)};fit();addEventListener('resize',fit);
  /* 화면 위쪽에서 '팡' 퍼진 뒤, 종이처럼 천천히 흔들리며 떨어져요 */
  const P=Array.from({length:count},(_,i)=>({
   x:W*(.15+Math.random()*.7),y:-12-Math.random()*30,
   vx:(Math.random()-.5)*9,vy:Math.random()*2.5,
   w:6+Math.random()*6,h:8+Math.random()*10,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.12,
   tilt:Math.random()*Math.PI,vt:.03+Math.random()*.05,sway:.6+Math.random()*1.2,c:COLORS[i%COLORS.length],shape:i%4===0?'circle':'rect'}));
  const t0=performance.now();let raf=0,last=t0;
  const frame=(now:number)=>{const dt=Math.min(32,now-last)/16.67;last=now;const age=now-t0;g.clearRect(0,0,W,H);
   const fade=age>duration-1200?Math.max(0,(duration-age)/1200):1;g.globalAlpha=fade;
   for(const p of P){p.vy+=.045*dt;p.vx*=Math.pow(.975,dt);p.vy=Math.min(p.vy,2.2);p.x+=p.vx*dt+Math.sin(p.tilt)*p.sway;p.y+=p.vy*dt;p.r+=p.vr*dt;p.tilt+=p.vt*dt;
    if(p.y>H+30)continue;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;
    if(p.shape==='circle'){g.beginPath();g.arc(0,0,p.w/2.2,0,Math.PI*2);g.fill()}else{g.scale(1,Math.cos(p.tilt));g.fillRect(-p.w/2,-p.h/2,p.w,p.h)}
    g.restore()}
   if(age<duration)raf=requestAnimationFrame(frame);else setDone(true)};
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit)}},[count,duration]);
 if(done)return null;
 return <canvas ref={cv} className="confetti" aria-hidden="true"/>;
}
