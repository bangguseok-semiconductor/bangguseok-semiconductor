import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {PointerEvent as RPointerEvent,CSSProperties} from 'react';
import {Icon} from './Icon';

/* 형광펜 팔레트 — 굿노트처럼 색을 저장해 두고 끌어서 순서를 바꿔요.
   기본 4색 + 무지개 버튼으로 원하는 색(HEX · 스포이드)을 만들어 추가. 이 브라우저에 기억해요. */
export type Swatch={id:string;hex:string;preset?:boolean};
const isHex=(h:unknown):h is string=>typeof h==='string'&&/^#[0-9a-f]{6}$/i.test(h);
type Store={list:Swatch[];sel:string};
/** 색 팔레트 하나(형광펜 · 펜 각각) — 저장 · 선택 · 순서 바꾸기 · 지우기 */
function makeStore(key:string,presets:Swatch[]){
 const load=():Store=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v&&Array.isArray(v.list)){const list=(v.list as Swatch[]).filter(s=>s&&typeof s.id==='string'&&isHex(s.hex)).map(s=>({id:s.id,hex:s.hex.toLowerCase(),preset:!!s.preset}));if(list.length)return {list,sel:list.some(s=>s.id===v.sel)?v.sel:list[0].id}}}catch{/* 처음 쓰는 경우 */}return {list:presets,sel:presets[0].id}};
 let store:Store=load();const subs=new Set<()=>void>();
 const commit=(s:Store)=>{store=s;subs.forEach(f=>f());try{localStorage.setItem(key,JSON.stringify(s))}catch{/* 저장 못 해도 이번 화면에선 써요 */}};
 return {
  use:()=>useSyncExternalStore(f=>{subs.add(f);return()=>{subs.delete(f)}},()=>store,()=>store),
  get:()=>store,
  hex:()=>store.list.find(s=>s.id===store.sel)?.hex??presets[0].hex,
  select:(id:string)=>commit({...store,sel:id}),
  add:(hex:string)=>{const found=store.list.find(s=>s.hex===hex);if(found){commit({...store,sel:found.id});return}const id='c-'+Date.now().toString(36);commit({list:[...store.list,{id,hex}],sel:id})},
  remove:(id:string)=>{const list=store.list.filter(s=>s.id!==id);if(!list.length)return;commit({list,sel:store.sel===id?list[0].id:store.sel})},
  move:(from:number,to:number)=>{const list=[...store.list];const [x]=list.splice(from,1);list.splice(to,0,x);commit({...store,list})},
 };
}
type PalStore=ReturnType<typeof makeStore>;
const NAMES:Record<string,string>={'p-yellow':'노랑','p-green':'초록','p-blue':'하늘','p-pink':'분홍','k-black':'검정','k-orange':'주황','k-blue':'파랑'};
export const hlStore=makeStore('semilab.hl.palette',[{id:'p-yellow',hex:'#ffe17a',preset:true},{id:'p-green',hex:'#b9f0b0',preset:true},{id:'p-blue',hex:'#b3dcff',preset:true},{id:'p-pink',hex:'#ffc2de',preset:true}]);
export const penStore=makeStore('semilab.pen.palette',[{id:'k-black',hex:'#1f2328',preset:true},{id:'k-orange',hex:'#f07f1a',preset:true},{id:'k-blue',hex:'#2f6fe0',preset:true}]);
export const useHlPalette=hlStore.use;
export const hlSelectedHex=hlStore.hex;
/* 펜 굵기 (가늘게 · 보통 · 굵게) — 이 브라우저에 기억 */
export const PEN_SIZES=[{w:2,label:'가늘게'},{w:4,label:'보통'},{w:8,label:'굵게'}] as const;
let penW=(()=>{try{const n=+(localStorage.getItem('semilab.pen.width')||'');return PEN_SIZES.some(p=>p.w===n)?n:4}catch{return 4}})();const wSubs=new Set<()=>void>();
export const usePenWidth=()=>useSyncExternalStore(f=>{wSubs.add(f);return()=>{wSubs.delete(f)}},()=>penW,()=>penW);
export const setPenWidth=(w:number)=>{penW=w;wSubs.forEach(f=>f());try{localStorage.setItem('semilab.pen.width',String(w))}catch{/* 무시 */}};

/* ── HSV ↔ HEX ── */
const hsvToHex=(h:number,s:number,v:number)=>{const f=(n:number)=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return '#'+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')};
const hexToHsv=(hex:string)=>{const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:mx?d/mx:0,v:mx}};
type EyeDropperCtor=new()=>{open:()=>Promise<{sRGBHex:string}>};
const eyeDropper=():EyeDropperCtor|null=>typeof window!=='undefined'&&'EyeDropper' in window?(window as unknown as {EyeDropper:EyeDropperCtor}).EyeDropper:null;
const toHex=(c:string)=>{if(isHex(c))return c.toLowerCase();const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?'#'+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join(''):null};

/** 툴바 안 팔레트: 색 동그라미(끌어서 순서 바꾸기) + 무지개(새 색 만들기) */
export function HlPalette({onPick,store=hlStore,kind='형광펜'}:{onPick:(hex:string)=>void;store?:PalStore;kind?:string}){
 const {list,sel}=store.use();const[picker,setPicker]=useState(false);
 const row=useRef<HTMLDivElement>(null),drag=useRef<{id:string;x:number;moved:boolean;from:number}|null>(null),[dragId,setDragId]=useState<string|null>(null);
 const down=(e:RPointerEvent<HTMLButtonElement>,id:string,i:number)=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id,x:e.clientX,moved:false,from:i}};
 const move=(e:RPointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(!d)return;if(!d.moved&&Math.abs(e.clientX-d.x)<5)return;d.moved=true;setDragId(d.id);
  const btns=[...(row.current?.querySelectorAll<HTMLElement>('[data-swatch]')??[])];const cur=store.get().list.findIndex(s=>s.id===d.id);
  let to=btns.findIndex(b=>{const r=b.getBoundingClientRect();return e.clientX<r.left+r.width/2});if(to<0)to=btns.length-1;else if(to>cur)to-=1;
  if(to!==cur&&to>=0)store.move(cur,to)};
 const up=(id:string)=>{const d=drag.current;drag.current=null;setDragId(null);if(d&&!d.moved){store.select(id);onPick(store.get().list.find(s=>s.id===id)!.hex)}};
 return <div className="hl-palette">
  <div ref={row} className="note-swatches" role="radiogroup" aria-label={kind+' 색 (끌어서 순서 바꾸기)'}>
   {list.map((s,i)=><button key={s.id} type="button" role="radio" data-swatch aria-checked={sel===s.id} aria-label={(NAMES[s.id]??s.hex)+' '+kind} data-tip={(NAMES[s.id]??s.hex.toUpperCase())+' · 끌어서 순서 바꾸기'} data-tip-pos="top" className="note-swatch" data-dragging={dragId===s.id||undefined} style={{'--sw':s.hex} as CSSProperties}
    onMouseDown={e=>e.preventDefault()} onPointerDown={e=>down(e,s.id,i)} onPointerMove={move} onPointerUp={()=>up(s.id)} onPointerCancel={()=>{drag.current=null;setDragId(null)}}
    onKeyDown={e=>{if(e.key==='ArrowLeft'&&e.altKey&&i>0){e.preventDefault();store.move(i,i-1)}else if(e.key==='ArrowRight'&&e.altKey&&i<list.length-1){e.preventDefault();store.move(i,i+1)}}}><i/></button>)}
  </div>
  <button type="button" className="note-swatch is-rainbow" aria-label={'새 '+kind+' 색 만들기'} aria-expanded={picker} data-tip="색 만들기 · HEX · 스포이드" data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={()=>setPicker(v=>!v)}><i/></button>
  {picker&&<ColorPicker title={kind+' 색 만들기'} initial={store.hex()} canRemove={!list.find(s=>s.id===sel)?.preset&&list.length>1} onRemove={()=>{store.remove(sel);onPick(store.hex())}} onAdd={hex=>{store.add(hex);onPick(hex);setPicker(false)}} onClose={()=>setPicker(false)}/>}
 </div>;
}

/** 색 고르기: 채도·밝기 사각형 + 색상 막대 + HEX 입력 + 스포이드(화면 어디서든) */
function ColorPicker({title,initial,canRemove,onAdd,onRemove,onClose}:{title:string;initial:string;canRemove:boolean;onAdd:(hex:string)=>void;onRemove:()=>void;onClose:()=>void}){
 const[hsv,setHsv]=useState(()=>hexToHsv(initial)),hex=hsvToHex(hsv.h,hsv.s,hsv.v),[text,setText]=useState(initial.toUpperCase()),[err,setErr]=useState('');
 const root=useRef<HTMLDivElement>(null),sv=useRef<HTMLDivElement>(null),hue=useRef<HTMLDivElement>(null);
 useEffect(()=>{setText(hex.toUpperCase())},[hex]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose()}};const out=(e:PointerEvent)=>{const t=e.target as Element;if(!root.current?.contains(t)&&!t.closest?.('.is-rainbow'))onClose()};window.addEventListener('keydown',esc,true);document.addEventListener('pointerdown',out);return()=>{window.removeEventListener('keydown',esc,true);document.removeEventListener('pointerdown',out)}},[onClose]);
 const track=(el:HTMLElement|null,e:RPointerEvent<HTMLElement>,fn:(x:number,y:number)=>void)=>{if(!el)return;e.preventDefault();el.setPointerCapture(e.pointerId);const go=(cx:number,cy:number)=>{const r=el.getBoundingClientRect();fn(Math.min(1,Math.max(0,(cx-r.left)/r.width)),Math.min(1,Math.max(0,(cy-r.top)/r.height)))};go(e.clientX,e.clientY);
  const mv=(ev:PointerEvent)=>go(ev.clientX,ev.clientY),up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)};el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)};
 const ED=eyeDropper();
 const pick=async()=>{if(!ED)return;setErr('');try{const r=await new ED().open();const h=toHex(r.sRGBHex);if(h)setHsv(hexToHsv(h))}catch(e){if((e as Error)?.name!=='AbortError')setErr('이 화면에선 스포이드를 쓸 수 없어요')}};
 const commitText=(v:string)=>{const t=v.trim().replace(/^#?/,'#');if(/^#[0-9a-f]{3}$/i.test(t)){const x='#'+t.slice(1).split('').map(c=>c+c).join('');setHsv(hexToHsv(x.toLowerCase()));return}if(isHex(t))setHsv(hexToHsv(t.toLowerCase()));else setText(hex.toUpperCase())};
 return <div ref={root} className="hl-picker" role="dialog" aria-label={title}>
  <div ref={sv} className="hl-sv" style={{'--hue':`hsl(${hsv.h} 100% 50%)`} as CSSProperties} role="slider" aria-label="채도와 밝기" aria-valuetext={hex.toUpperCase()} tabIndex={0}
   onPointerDown={e=>track(sv.current,e,(x,y)=>setHsv(c=>({...c,s:x,v:1-y})))}
   onKeyDown={e=>{const d=e.shiftKey?.1:.02;if(e.key==='ArrowLeft')setHsv(c=>({...c,s:Math.max(0,c.s-d)}));else if(e.key==='ArrowRight')setHsv(c=>({...c,s:Math.min(1,c.s+d)}));else if(e.key==='ArrowUp')setHsv(c=>({...c,v:Math.min(1,c.v+d)}));else if(e.key==='ArrowDown')setHsv(c=>({...c,v:Math.max(0,c.v-d)}));else return;e.preventDefault()}}>
   <b style={{left:hsv.s*100+'%',top:(1-hsv.v)*100+'%',background:hex}}/>
  </div>
  <div ref={hue} className="hl-hue" role="slider" aria-label="색상" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv.h)} tabIndex={0}
   onPointerDown={e=>track(hue.current,e,x=>setHsv(c=>({...c,h:Math.min(359.9,x*360)})))}
   onKeyDown={e=>{const d=e.shiftKey?20:4;if(e.key==='ArrowLeft'||e.key==='ArrowDown')setHsv(c=>({...c,h:(c.h-d+360)%360}));else if(e.key==='ArrowRight'||e.key==='ArrowUp')setHsv(c=>({...c,h:(c.h+d)%360}));else return;e.preventDefault()}}>
   <b style={{left:hsv.h/360*100+'%',background:`hsl(${hsv.h} 100% 50%)`}}/>
  </div>
  <div className="hl-row">
   <span className="hl-preview" style={{background:hex}} aria-hidden="true"/>
   <label className="hl-hex"><span>HEX</span><input value={text} maxLength={7} spellCheck={false} aria-label="HEX 색 코드" onChange={e=>setText(e.target.value)} onBlur={e=>commitText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitText((e.target as HTMLInputElement).value)}}}/></label>
   {ED&&<button type="button" className="note-tool" aria-label="스포이드 · 화면 어디서든 색 따기" data-tip="스포이드 · 화면 어디서든" data-tip-pos="top" onClick={pick}><Icon name="pipette"/></button>}
  </div>
  {err&&<p className="hl-err" role="status">{err}</p>}
  <div className="hl-actions">
   {canRemove&&<button type="button" className="btn btn--tertiary btn--sm" onClick={onRemove}>지금 색 지우기</button>}
   <span className="hl-gap"/>
   <button type="button" className="btn btn--primary btn--sm" onClick={()=>onAdd(hex)}><Icon name="plus-lg" className="lead"/>팔레트에 저장</button>
  </div>
 </div>;
}
