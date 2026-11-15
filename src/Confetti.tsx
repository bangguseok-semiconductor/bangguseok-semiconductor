import {useEffect,useRef,useState} from 'react';

/* 미션 · 퀴즈 성공 축하: 화면 전체 위에서 색종이가 떨어져요(3.5초, 클릭은 그대로 통과).
   '동작 줄이기' 설정을 켠 사람에겐 보여 주지 않아요. */
const COLORS=['#f2862b','#ffd166','#3a74d9','#2f9e5f','#ff7aa8','#ffffff','#8fb6f5'];
export function Confetti({count=180,duration=3600}:{count?:number;duration?:number}){
 const cv=useRef<HTMLCanvasElement>(null),[done,setDone]=useState(false);
 useEffect(()=>{
  if(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches){setDone(true);return}
  const c=cv.current;if(!c)return;const g=c.getContext('2d');if(!g)return;
  const d=window.devicePixelRatio||1;let W=innerWidth,H=innerHeight;const fit=()=>{W=innerWidth;H=innerHeight;c.width=W*d;c.height=H*d;g.setTransform(d,0,0,d,0,0)};fit();addEventListener('resize',fit);
  /* 위쪽 넓게 + 양옆에서 살짝 터지듯 */
  const P=Array.from({length:count},(_,i)=>{const side=i%5===0?(i%2?1:-1):0;return {
   x:side?(side<0?-10:W+10):Math.random()*W,y:side?H*.35+Math.random()*H*.2:-20-Math.random()*H*.5,
   vx:side?-side*(6+Math.random()*6):(Math.random()-.5)*2.4,vy:side?-(8+Math.random()*6):2+Math.random()*3,
   w:6+Math.random()*6,h:8+Math.random()*10,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,
   tilt:Math.random()*Math.PI,vt:.05+Math.random()*.1,c:COLORS[i%COLORS.length],shape:i%4===0?'circle':'rect'}});
  const t0=performance.now();let raf=0,last=t0;
  const frame=(now:number)=>{const dt=Math.min(32,now-last)/16.67;last=now;const age=now-t0;g.clearRect(0,0,W,H);
   const fade=age>duration-700?Math.max(0,(duration-age)/700):1;g.globalAlpha=fade;
   for(const p of P){p.vy+=.18*dt;p.vx*=.992;p.vy=Math.min(p.vy,6.5);p.x+=p.vx*dt+Math.sin(p.tilt)*.6;p.y+=p.vy*dt;p.r+=p.vr*dt;p.tilt+=p.vt*dt;
    if(p.y>H+30)continue;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;
    if(p.shape==='circle'){g.beginPath();g.arc(0,0,p.w/2.2,0,Math.PI*2);g.fill()}else{g.scale(1,Math.cos(p.tilt));g.fillRect(-p.w/2,-p.h/2,p.w,p.h)}
    g.restore()}
   if(age<duration)raf=requestAnimationFrame(frame);else setDone(true)};
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit)}},[count,duration]);
 if(done)return null;
 return <canvas ref={cv} className="confetti" aria-hidden="true"/>;
}
