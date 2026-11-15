import {uiZoom} from './uiZoom';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Ref,CSSProperties,PointerEvent as RPointerEvent,KeyboardEvent as RKeyboardEvent} from 'react';
import {Icon,type IconName} from './Icon';
import {useLessonTitle} from './LessonTitle';
import {useHubTab,setHubTab,getHubTab} from './hubTab';
import {useViewOptions,setViewPreset,setViewLabels,setViewEffects,resetViewPreset,viewPresets} from './viewOptions';
import './lesson-shell.css';

/* 학습 화면 공통 3단 레이아웃의 좌우 패널 접기 상태.
   피그마처럼 화면을 옮겨도 유지되도록 모듈 단위로 기억합니다(브라우저 저장소는 쓰지 않음). */
export type ShellSide='left'|'right';
type Sheet='peek'|'half'|'full';
type State={left:boolean;right:boolean;wl:number;wr:number;sheet:Sheet;dragH:number|null};
/* 반응형: 좁은 화면(1199px 이하)에선 패널을 한 번에 하나만 펼쳐 3D 캔버스를 넓게 남겨요.
   휴대폰(600px 이하)에선 펼친 패널이 아래에서 올라오는 시트가 되고, 손잡이로 높이를 바꿔요. */
const mq=(q:string)=>typeof window!=='undefined'&&window.matchMedia?window.matchMedia(q):null;
const phoneMq=mq('(max-width:600px)');
/* 휴대폰 시트에서만 한 번에 하나 — 데스크톱 · 태블릿은 양쪽을 따로 접고 펴요 */
const isNarrow=()=>!!phoneMq?.matches;
/* 패널 너비: 피그마처럼 안쪽 가장자리를 끌어 조절 (4px 단위, 240~480px). 이 브라우저에 기억해요. */
export const PANEL_MIN=240,PANEL_MIN_R=304,PANEL_MAX=480,PANEL_DEFAULT={wl:300,wr:352};
const readWidths=()=>{try{const v=JSON.parse(localStorage.getItem('semilab.panels')||'{}');const ok=(n:unknown,d:number,min:number)=>typeof n==='number'&&n>=min&&n<=PANEL_MAX?n:d;return {wl:ok(v.wl,PANEL_DEFAULT.wl,PANEL_MIN),wr:ok(v.wr,PANEL_DEFAULT.wr,PANEL_MIN_R)}}catch{return {...PANEL_DEFAULT}}};
/* 처음엔 양쪽 다 펼침. 사용자가 접고 편 상태는 이 브라우저에 기억해서 다음에 그대로 */
const readOpen=()=>{try{const v=JSON.parse(localStorage.getItem('semilab.panels')||'{}');return {left:v.left===true,right:v.right===true}}catch{return {left:false,right:false}}};
const saveAll=()=>{if(phoneMq?.matches)return;try{localStorage.setItem('semilab.panels',JSON.stringify({wl:state.wl,wr:state.wr,left:state.left,right:state.right}))}catch{}};
let state:State={...readOpen(),...readWidths(),sheet:'half',dragH:null};
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};
/* 휴대폰에선 아래 시트가 늘 하나는 떠 있어요(접힘 높이까지만 내려감) */
/* 휴대폰 시트는 패널 하나만: 둘 다 열렸거나 둘 다 닫혔으면 학습 가이드를 보여 줘요(저장은 안 함). 넓어지면 저장한 상태로 돌아가요 */
const phoneFix=(s:State):State=>s.left===s.right?{...s,left:false,right:true}:s;
const onPhoneChange=()=>{state=phoneMq?.matches?phoneFix(state):{...state,...readOpen()};emit()};
phoneMq?.addEventListener?.('change',onPhoneChange);if(phoneMq?.matches)state=phoneFix(state);
export const toggleShellPanel=(side:ShellSide)=>{const opening=state[side],other:ShellSide=side==='left'?'right':'left';
 state={...state,[side]:!opening,...(opening&&isNarrow()?{[other]:true}:{}),...(opening&&phoneMq?.matches&&state.sheet==='peek'?{sheet:'half' as Sheet}:{})};emit();saveAll()};
const setSheet=(sheet:Sheet,dragH:number|null=null)=>{state={...state,sheet,dragH};emit()};
/* 휴대폰 시트 탭: 학습 가이드(왼쪽 패널) · 메모 · AI(오른쪽 패널) */
export type SheetTab='guide'|'notes'|'ai';
const SHEET_TABS:{id:SheetTab;label:string}[]=[{id:'guide',label:'학습 가이드'},{id:'notes',label:'메모'},{id:'ai',label:'AI'}];
let sheetDir:'next'|'prev'='next';
const sheetTabOf=():SheetTab=>!state.left?'guide':getHubTab();
const goSheetTab=(t:SheetTab)=>{const order=SHEET_TABS.map(x=>x.id);sheetDir=order.indexOf(t)>=order.indexOf(sheetTabOf())?'next':'prev';if(t!=='guide')setHubTab(t);state={...state,left:t!=='guide',right:t==='guide',sheet:state.sheet==='peek'?'half':state.sheet};emit()};
const setSheetDrag=(dragH:number|null)=>{state={...state,dragH};emit()};
const focusLater=(selector:string)=>requestAnimationFrame(()=>document.querySelector<HTMLElement>(selector)?.focus());
let bound=0;
const onKey=(e:KeyboardEvent)=>{if(e.key!=='\\'||!(e.metaKey||e.ctrlKey))return;const t=e.target as HTMLElement|null;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;e.preventDefault();toggleBoth()};
export const setShellPanels=(closed:boolean)=>{state={...state,left:closed,right:closed||isNarrow()};emit();saveAll()};
const clampW=(n:number,min=PANEL_MIN)=>Math.round(Math.min(PANEL_MAX,Math.max(min,n))/4)*4;
export const setPanelWidth=(side:ShellSide,w:number)=>{state={...state,[side==='left'?'wl':'wr']:clampW(w,side==='left'?PANEL_MIN:PANEL_MIN_R)};emit();saveAll()};
const toggleBoth=()=>{const anyOpen=!state.left||!state.right;state={...state,left:anyOpen,right:anyOpen||isNarrow()};emit();saveAll()};

/** 접힘 상태와 루트 요소에 붙일 속성을 돌려줍니다. Ctrl/⌘ + \ 로 양쪽을 함께 접고 펼칩니다. */
export function useLessonShell(){
 const s=useSyncExternalStore(subscribe,()=>state,()=>state);
 useEffect(()=>{if(bound++===0)window.addEventListener('keydown',onKey);return()=>{if(--bound===0)window.removeEventListener('keydown',onKey)}},[]);
 return {collapsed:s,attrs:{'data-shell-left':s.left?'closed':'open','data-shell-right':s.right?'closed':'open','data-sheet':s.sheet,'data-sheet-dir':sheetDir,'data-sheet-dragging':s.dragH!=null||undefined,style:{'--panel-l':s.wl+'px','--panel-r':s.wr+'px',...(s.dragH!=null?{'--sheet-h':s.dragH+'px'}:{})} as CSSProperties}};
}

const SidebarIcon=({side}:{side:ShellSide})=><Icon name={side==='left'?'layout-sidebar':'layout-sidebar-reverse'}/>;

/** 패널 머리에 두는 접기 버튼 */
export function PanelToggle({side}:{side:ShellSide}){
 return <button type="button" data-tip={side==='left'?'왼쪽 패널 접기':'오른쪽 패널 접기'} data-tip-pos={side==='left'?'bottom':'left'} className={'shell-toggle shell-toggle-'+side} aria-label={side==='left'?'왼쪽 패널 접기':'오른쪽 패널 접기'} aria-expanded="true" aria-controls={'shell-panel-'+side} onClick={()=>{toggleShellPanel(side);focusLater('.shell-chip-'+side)}}><SidebarIcon side={side}/></button>;
}

/** 패널이 접혔을 때 화면 모서리에 떠 있는 펼치기 칩 */
/** 패널 너비 조절 손잡이 (끌기 · 방향키 · 두 번 눌러 기본값) */
function PanelResizer({side,width}:{side:ShellSide;width:number}){
 const drag=useRef<{x:number;w:number}|null>(null),[dragging,setDragging]=useState(false);
 const down=(e:RPointerEvent<HTMLDivElement>)=>{if(e.button!==0)return;drag.current={x:e.clientX,w:width};e.currentTarget.setPointerCapture?.(e.pointerId);setDragging(true);document.body.classList.add('is-resizing')};
 const move=(e:RPointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d)return;const dx=(e.clientX-d.x)/uiZoom();setPanelWidth(side,side==='left'?d.w+dx:d.w-dx)};
 const up=()=>{drag.current=null;setDragging(false);document.body.classList.remove('is-resizing')};
 const key=(e:RKeyboardEvent<HTMLDivElement>)=>{const step=e.shiftKey?32:16;let n=width;if(e.key==='ArrowLeft')n+=side==='left'?-step:step;else if(e.key==='ArrowRight')n+=side==='left'?step:-step;else if(e.key==='Home')n=side==='left'?PANEL_MIN:PANEL_MIN_R;else if(e.key==='End')n=PANEL_MAX;else return;e.preventDefault();setPanelWidth(side,n)};
 return <div className={'panel-resizer panel-resizer-'+side} data-dragging={dragging||undefined} role="separator" aria-orientation="vertical" aria-label={(side==='left'?'왼쪽':'오른쪽')+' 패널 너비'} aria-valuemin={side==='left'?PANEL_MIN:PANEL_MIN_R} aria-valuemax={PANEL_MAX} aria-valuenow={width} tabIndex={0} title="끌어서 너비 조절 · 두 번 누르면 기본 너비" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onDoubleClick={()=>setPanelWidth(side,side==='left'?PANEL_DEFAULT.wl:PANEL_DEFAULT.wr)} onKeyDown={key}/>;
}

/** 휴대폰 시트 손잡이: 끌어서 높이 조절, 누르면 크게 ↔ 반 높이. 방향키로도 조절해요 */
const SHEET_LABEL:Record<Sheet,string>={peek:'접힘',half:'반 높이',full:'전체 높이'};
function SheetHandle({side}:{side:ShellSide}){
 const st=useRef<{y:number;h:number;moved:boolean}|null>(null);
 const snaps=()=>{const ih=window.innerHeight;return {peek:76,half:Math.round(ih*.52),full:ih-64} as Record<Sheet,number>};
 const nearest=(h:number):Sheet=>{const sn=snaps();return (Object.keys(sn) as Sheet[]).reduce((a,b)=>Math.abs(sn[b]-h)<Math.abs(sn[a]-h)?b:a)};
 const down=(e:RPointerEvent<HTMLButtonElement>)=>{if(e.button!==0)return;const p=document.getElementById('shell-panel-'+side);st.current={y:e.clientY,h:p?.getBoundingClientRect().height??snaps().half,moved:false};e.currentTarget.setPointerCapture?.(e.pointerId)};
 const move=(e:RPointerEvent<HTMLButtonElement>)=>{const d=st.current;if(!d)return;const dy=e.clientY-d.y;if(!d.moved&&Math.abs(dy)<5)return;d.moved=true;setSheetDrag(Math.round(Math.min(window.innerHeight-48,Math.max(56,d.h-dy))))};
 const up=()=>{const d=st.current;st.current=null;if(!d)return;if(!d.moved){setSheet(state.sheet==='full'?'half':state.sheet==='half'?'full':'half');return}setSheet(nearest(state.dragH??d.h))};
 const order:Sheet[]=['peek','half','full'];
 const key=(e:RKeyboardEvent<HTMLButtonElement>)=>{const i=order.indexOf(state.sheet);if(e.key==='ArrowUp'&&i<2)setSheet(order[i+1]);else if(e.key==='ArrowDown'&&i>0)setSheet(order[i-1]);else return;e.preventDefault()};
 return <button type="button" className="sheet-handle" aria-label={`패널 높이 · ${SHEET_LABEL[state.sheet]} (누르거나 위아래로 끌기)`} aria-controls={'shell-panel-'+side} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}><i/></button>;
}

/** 휴대폰 아래 시트 맨 위 탭 막대 — 눌러서 바꾸거나, 시트를 좌우로 밀어 넘겨요 */
function SheetTabs(){
 useLessonShell();const hub=useHubTab();const cur:SheetTab=!state.left?'guide':hub;
 /* 좌우로 밀어 넘기기: 터치 이벤트로 받아서, 목록이 세로로 스크롤돼도 끝까지 따라가요 */
 useEffect(()=>{let st:{x:number;y:number}|null=null;
  const down=(e:TouchEvent)=>{if(!phoneMq?.matches||e.touches.length!==1){st=null;return}const t=e.target as HTMLElement;if(!t.closest('#shell-panel-left,#shell-panel-right')||t.closest('.draw-pad,input,textarea,.glb-results'))return;st={x:e.touches[0].clientX,y:e.touches[0].clientY}};
  const up=(e:TouchEvent)=>{const s=st;st=null;const p=e.changedTouches[0];if(!s||!p)return;const dx=p.clientX-s.x,dy=p.clientY-s.y;if(Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.6)return;const sel=getSelection();if(sel&&!sel.isCollapsed)return;const order=SHEET_TABS.map(x=>x.id),i=order.indexOf(sheetTabOf()),n=i+(dx<0?1:-1);if(n>=0&&n<order.length)goSheetTab(order[n])};
  document.addEventListener('touchstart',down,{passive:true,capture:true});document.addEventListener('touchend',up,{passive:true,capture:true});
  return()=>{document.removeEventListener('touchstart',down,{capture:true});document.removeEventListener('touchend',up,{capture:true})}},[]);
 const keys=(e:RKeyboardEvent<HTMLDivElement>)=>{const order=SHEET_TABS.map(x=>x.id),i=order.indexOf(cur);const n=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1;if(n<0||n>=order.length)return;e.preventDefault();goSheetTab(order[n]);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.sheet-tabs [aria-selected=true]')?.focus())};
 return <div className="sheet-tabs" role="tablist" aria-label="학습 패널" onKeyDown={keys}>{SHEET_TABS.map(t=><button key={t.id} type="button" role="tab" aria-selected={cur===t.id} tabIndex={cur===t.id?0:-1} aria-controls={t.id==='guide'?'shell-panel-left':'shell-panel-right'} onClick={()=>goSheetTab(t.id)}>{t.label}</button>)}<i className="sheet-tabs-ink" style={{'--i':SHEET_TABS.findIndex(t=>t.id===cur)} as CSSProperties} aria-hidden="true"/></div>;
}

export function ShellChips({left:fallback,leftId,right,rightIsHub=true}:{left:string;leftId?:string;right:string;rightIsHub?:boolean}){
 const {collapsed}=useLessonShell(),left=useLessonTitle(leftId,fallback);
 return <>{!collapsed.left?<SheetHandle side="left"/>:!collapsed.right?<SheetHandle side="right"/>:null}{rightIsHub&&<SheetTabs/>}{!collapsed.left&&<PanelResizer side="left" width={collapsed.wl}/>}{!collapsed.right&&<PanelResizer side="right" width={collapsed.wr}/>}{collapsed.left&&<button type="button" className="shell-chip shell-chip-left" data-tip="왼쪽 패널 펼치기" data-tip-pos="bottom" aria-label={'왼쪽 패널 펼치기 · '+left} aria-expanded="false" aria-controls="shell-panel-left" onClick={()=>{toggleShellPanel('left');focusLater('#shell-panel-left .shell-toggle')}}><span className="shell-chip-title">{left}</span><SidebarIcon side="left"/></button>}{collapsed.right&&<button type="button" className="shell-chip shell-chip-right" data-tip="오른쪽 패널 펼치기" data-tip-pos="bottom" aria-label={'오른쪽 패널 펼치기 · '+right} aria-expanded="false" aria-controls="shell-panel-right" onClick={()=>{toggleShellPanel('right');focusLater('#shell-panel-right .shell-toggle')}}><SidebarIcon side="right"/><span className="shell-chip-title">{right}</span></button>}</>;
}

/* 캔버스 하단 도구 막대 — 피그마식.
   손 도구(기본): 모형을 마우스로 돌려보는 상태. 조절 도구: 위로 보기·초기화 같은 조절 타일이 펼쳐짐. */
export type ToolTile={id:string;label:string;icon:IconName;onClick:()=>void;pressed?:boolean;disabled?:boolean;buttonRef?:Ref<HTMLButtonElement>};
const isMac=typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
/** 보기 메뉴에 둘 항목. camera: 시점 버튼, labels: 부품 이름표, effects: 효과 스위치 이름(예: '공기 흐름') */
export type ViewCaps={camera?:boolean;labels?:boolean;effects?:string};
function ViewSwitch({on}:{on:boolean}){return <span className="view-switch" data-on={on} aria-hidden="true"><i/></span>}

export function CanvasToolbar({tiles:own,view:caps={}}:{tiles:ToolTile[];view?:ViewCaps}){
 const[open,setOpen]=useState(false),[viewOpen,setViewOpen]=useState(false),root=useRef<HTMLDivElement>(null);
 const {collapsed}=useLessonShell(),focused=collapsed.left&&collapsed.right,opts=useViewOptions();
 /* 순서: 분해하기 · 보기 · 초기화(맨 오른쪽). 초기화는 시점도 기본으로 되돌려요 */
 const resetTile=own.find(t=>t.id==='reset'),rest=own.filter(t=>t.id!=='reset');
 const tiles:ToolTile[]=[...rest,{id:'view',label:'보기',icon:'eye',pressed:viewOpen,onClick:()=>setViewOpen(v=>!v)},...(resetTile?[{...resetTile,onClick:()=>{resetTile.onClick();if(caps.camera)resetViewPreset()}}]:[])];
 useEffect(()=>{if(!open)setViewOpen(false)},[open]);
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;if(viewOpen){setViewOpen(false);root.current?.querySelector<HTMLButtonElement>('[data-tile=view]')?.focus();return}setOpen(false);root.current?.querySelector<HTMLButtonElement>('.dock-adjust')?.focus()};const down=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('keydown',key);document.addEventListener('pointerdown',down);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',down)}},[open,viewOpen]);
 return <div ref={root} className="canvas-toolbar">
  {open&&viewOpen&&<div id="canvas-view" className="view-menu" role="group" aria-label="보기">
   <button type="button" role="switch" aria-checked={focused} className="view-row" onClick={()=>setShellPanels(!focused)}><span className="view-row-label">패널 숨기기</span><kbd>{isMac?'⌘ \\':'Ctrl \\'}</kbd><ViewSwitch on={focused}/></button>
   {caps.camera&&<div className="view-section"><span className="view-section-title" id="view-angle">시점</span><div className="view-segment" role="group" aria-labelledby="view-angle">{viewPresets.map(p=><button key={p.id} type="button" aria-pressed={opts.preset===p.id} onClick={()=>setViewPreset(p.id)}>{p.label}</button>)}</div></div>}
   {(caps.labels||caps.effects)&&<div className="view-section">
    {caps.labels&&<button type="button" role="switch" aria-checked={opts.labels} className="view-row" onClick={()=>setViewLabels(!opts.labels)}><span className="view-row-label">부품 이름표</span><ViewSwitch on={opts.labels}/></button>}
    {caps.effects&&<button type="button" role="switch" aria-checked={opts.effects} className="view-row" onClick={()=>setViewEffects(!opts.effects)}><span className="view-row-label">{caps.effects}</span><ViewSwitch on={opts.effects}/></button>}
   </div>}
  </div>}
  {open&&<div id="canvas-adjust" className="canvas-popover" role="group" aria-label="조절">{tiles.map(t=><button key={t.id} data-tile={t.id} ref={t.buttonRef} type="button" className="tool-tile" aria-pressed={t.pressed} aria-expanded={t.id==='view'?viewOpen:undefined} aria-controls={t.id==='view'?'canvas-view':undefined} disabled={t.disabled} onClick={t.onClick}><Icon name={t.icon} size={20}/><span>{t.label}</span></button>)}</div>}
  <div className="canvas-dock" role="toolbar" aria-label="캔버스 도구">
   <button type="button" className="dock-btn dock-hand" aria-pressed={!open} aria-label="둘러보기" data-tip="둘러보기 · 드래그해서 돌려보기" data-tip-pos="top" onClick={()=>setOpen(false)}><Icon name="hand-index" size={20}/></button>
   <button type="button" className="dock-btn dock-adjust" aria-pressed={open} aria-expanded={open} aria-controls="canvas-adjust" aria-label="조절" data-tip="조절" data-tip-pos="top" onClick={()=>setOpen(o=>!o)}><Icon name="sliders" size={20}/></button>
  </div>
 </div>;
}
