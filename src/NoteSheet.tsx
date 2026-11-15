import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Ref,PointerEvent as RPointerEvent,ClipboardEvent as RClipboardEvent,KeyboardEvent as RKeyboardEvent,CSSProperties} from 'react';
import {Icon,type IconName} from './Icon';
import {isRich,textToHtml,sanitizeNote,splitInk,joinInk,HL_COLORS,type HlColor,type InkStroke} from './noteHtml';
import {captureStage,hasStageCapture,onStageCapture} from './stageCapture';
import {uiZoom} from './uiZoom';

/* iOS 메모처럼 입력하는 즉시 저장되는 메모 시트.
   아래 도구 막대: 굵게 · 밑줄 · 형광펜(5색) | 펜 · 3D 화면 캡처.
   - 굵게 · 밑줄 · 형광펜은 켜 두는 도구예요: 켠 상태에서 글을 드래그하면 바로 적용, 아이콘을 다시 누르면 꺼져요.
   - 펜을 켜면 메모 위(글 · 사진 위 어디든)에 바로 그려요. 그림은 메모와 함께 저장돼요.
   - 3D 모형을 길게 누른 채 메모로 끌어 놓아도 그 장면이 이미지로 들어가요(GlbStage가 'note-drop-image'를 보내요). */
const stamp=(iso?:string|null)=>{if(!iso)return '';const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)};
const isMac=typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const key=(k:string)=>(isMac?'⌘':'Ctrl+')+k;
type Pt={x:number;y:number};
type Mode={b:boolean;u:boolean;h:boolean;pen:boolean};
const INKS=[{c:'#1f2328',label:'검정'},{c:'#f07f1a',label:'주황'},{c:'#2f6fe0',label:'파랑'}];
const HL_SWATCH:Record<HlColor,string>={yellow:'#ffe17a',green:'#b9f0b0',blue:'#b3dcff',pink:'#ffc2de',orange:'#ffcf9e'};
const HL_LABEL:Record<HlColor,string>={yellow:'노랑',green:'초록',blue:'하늘',pink:'분홍',orange:'주황'};

/** 이미지 파일을 메모에 넣기 좋게 줄여요(긴 변 720px, JPEG) */
function shrinkImage(file:Blob):Promise<string|null>{
 return new Promise(res=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{const k=Math.min(1,720/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);const g=c.getContext('2d');if(!g){res(null);return}g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85))};img.onerror=()=>{URL.revokeObjectURL(url);res(null)};img.src=url});
}
/* 펜 획을 부드러운 곡선으로 */
const pathOf=(p:number[])=>{if(p.length<4)return p.length===2?`M${p[0]} ${p[1]}l0.01 0`:'';let d=`M${p[0]} ${p[1]}`;for(let i=2;i<p.length-2;i+=2){const mx=(p[i]+p[i+2])/2,my=(p[i+1]+p[i+3])/2;d+=`Q${p[i]} ${p[i+1]} ${mx} ${my}`}d+=`L${p[p.length-2]} ${p[p.length-1]}`;return d};

/** onSelection: 글을 드래그해 고르면 고른 글과 포인터 위치(키보드 선택이면 없음)를 알려 줘요 */
export function NoteSheet({label,value,updated,failed,onChange,inputRef,onSelection,placeholder='메모',find=false,onCloseFind}:{label:string;value:string;updated?:string|null;failed?:boolean;onChange:(text:string)=>void;inputRef?:Ref<HTMLElement>;onSelection?:(text:string,point?:{x:number;y:number})=>void;placeholder?:string;find?:boolean;onCloseFind?:()=>void}){
 const ed=useRef<HTMLDivElement|null>(null),paper=useRef<HTMLDivElement>(null),last=useRef<string|null>(null),change=useRef(onChange);change.current=onChange;
 const[mode,setMode]=useState<Mode>({b:false,u:false,h:false,pen:false}),[hl,setHl]=useState<HlColor>('yellow'),[ink,setInkC]=useState(INKS[0].c),[eraser,setEraser]=useState(false);
 const[strokes,setStrokes]=useState<InkStroke[]>([]),[live,setLive]=useState<InkStroke|null>(null),[paperH,setPaperH]=useState(0);
 const[empty,setEmpty]=useState(!value),[over,setOver]=useState(false),[flash,setFlash]=useState('');
 const strokesRef=useRef<InkStroke[]>([]);strokesRef.current=strokes;
 const modeRef=useRef(mode);modeRef.current=mode;const hlRef=useRef(hl);hlRef.current=hl;
 const canShot=useSyncExternalStore(onStageCapture,hasStageCapture,()=>false);
 const setRef=(el:HTMLDivElement|null)=>{ed.current=el;const r=inputRef;if(!r)return;if(typeof r==='function')r(el);else (r as {current:HTMLElement|null}).current=el};

 /* 밖에서 다른 메모로 바뀌면 내용을 새로 채워요(내가 방금 쓴 내용이면 그대로 둠) */
 useEffect(()=>{const el=ed.current;if(!el||value===last.current)return;const {html,ink}=splitInk(value||'');el.innerHTML=html?(isRich(html)?sanitizeNote(html):textToHtml(html)):'';setStrokes(ink);last.current=value;setEmpty(!html&&!ink.length)},[value]);
 const emit=(nextInk:InkStroke[]=strokesRef.current)=>{const el=ed.current;if(!el)return;const html=sanitizeNote(el.innerHTML);const v=joinInk(html,nextInk);last.current=v;setEmpty(!html);change.current(v)};
 /* 그림이 덮을 높이 = 메모 내용 높이 */
 useEffect(()=>{const el=ed.current;if(!el)return;const ro=new ResizeObserver(()=>setPaperH(el.offsetHeight));ro.observe(el);return()=>ro.disconnect()},[]);

 const inEditor=(n:Node|null)=>!!n&&!!ed.current&&ed.current.contains(n);
 const markOf=(n:Node|null)=>{let e:Node|null=n;while(e&&e!==ed.current){if((e as HTMLElement).tagName==='MARK')return e as HTMLElement;e=e.parentNode}return null};
 const selInEditor=()=>{const s=getSelection();return s&&s.rangeCount&&!s.isCollapsed&&inEditor(s.anchorNode)&&inEditor(s.focusNode)?s:null};
 /* 고른 글에 켜 둔 서식을 적용 (이미 같은 서식이면 그대로) */
 const applyHl=(s:Selection)=>{const r=s.getRangeAt(0),c=hlRef.current;const m=markOf(s.anchorNode);
  if(m&&m===markOf(s.focusNode)&&(m.dataset.c||'yellow')===c){m.replaceWith(...m.childNodes);return}
  const mark=document.createElement('mark');if(c!=='yellow')mark.dataset.c=c;mark.appendChild(r.extractContents());mark.querySelectorAll('mark').forEach(x=>x.replaceWith(...x.childNodes));r.insertNode(mark);s.removeAllRanges();const nr=document.createRange();nr.setStartAfter(mark);nr.collapse(true);s.addRange(nr)};
 const applyModes=(m:Partial<Mode>=modeRef.current)=>{const s=selInEditor();if(!s)return false;
  if(m.b&&!document.queryCommandState('bold'))document.execCommand('bold');
  if(m.u&&!document.queryCommandState('underline'))document.execCommand('underline');
  if(m.h)applyHl(s);
  emit();return true};
 const toggle=(k:'b'|'u'|'h')=>{const on=!mode[k];const next={...mode,[k]:on,...(k==='h'&&on?{pen:false}:{})};setMode(next);if(on)applyModes({[k]:true});if(!on&&k!=='h'&&selInEditor()==null)ed.current?.focus()};
 const pickHl=(c:HlColor)=>{setHl(c);hlRef.current=c;if(!mode.h)setMode(m=>({...m,h:true,pen:false}));applyModes({h:true})};
 /* 드래그로 글을 다 고른 순간(마우스 · 터치 · Shift+방향키) 켜 둔 서식 적용 */
 const afterSelect=()=>{const m=modeRef.current;if(m.b||m.u||m.h)applyModes()};

 const insertImage=(url:string,kind:'shot'|'sketch',point?:Pt)=>{const el=ed.current;if(!el)return;
  let r:Range|null=null;
  if(point){const d=document as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range|null;caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null};r=d.caretRangeFromPoint?.(point.x,point.y)??null;if(!r){const p=d.caretPositionFromPoint?.(point.x,point.y);if(p){r=document.createRange();r.setStart(p.offsetNode,p.offset)}}}
  if(!r||!inEditor(r.startContainer)){const s=getSelection();r=s&&s.rangeCount&&inEditor(s.getRangeAt(0).startContainer)?s.getRangeAt(0):null}
  const box=document.createElement('div'),img=document.createElement('img');img.src=url;img.alt='3D 화면 캡처';img.dataset.kind=kind;box.appendChild(img);
  const after=document.createElement('div');after.appendChild(document.createElement('br'));
  if(r){r.collapse(false);let blk:Node|null=r.startContainer;while(blk&&blk.parentNode!==el)blk=blk.parentNode;if(blk&&blk!==el)(blk as ChildNode).after(box,after);else{r.insertNode(after);r.insertNode(box)}}else el.append(box,after);
  const s=getSelection();if(s){const nr=document.createRange();nr.setStart(after,0);nr.collapse(true);s.removeAllRanges();s.addRange(nr)}
  emit();img.scrollIntoView?.({block:'nearest',behavior:'smooth'});setFlash('3D 화면을 넣었어요');setTimeout(()=>setFlash(''),1600)};
 const shot=()=>{const url=captureStage();if(url)insertImage(url,'shot')};

 /* 3D에서 끌어온 장면 받기 */
 useEffect(()=>{const el=ed.current;if(!el)return;
  const drop=(e:Event)=>{const d=(e as CustomEvent<{url:string;x:number;y:number}>).detail;setOver(false);insertImage(d.url,'shot',{x:d.x,y:d.y})};
  const hover=(e:Event)=>setOver(!!(e as CustomEvent<boolean>).detail);
  el.addEventListener('note-drop-image',drop);el.addEventListener('note-drop-hover',hover);
  return()=>{el.removeEventListener('note-drop-image',drop);el.removeEventListener('note-drop-hover',hover)}},[]);

 /* ── 펜: 메모 위 그림층 ── */
 const drawing=useRef<InkStroke|null>(null);
 const at=(e:{clientX:number;clientY:number})=>{const p=paper.current!,r=p.getBoundingClientRect(),z=uiZoom();return [Math.max(0,Math.round((e.clientX-r.left)/z+p.scrollLeft)),Math.max(0,Math.round((e.clientY-r.top)/z+p.scrollTop))]};
 const eraseAt=(x:number,y:number)=>{const hit=strokesRef.current.filter(s=>{for(let i=0;i<s.p.length;i+=2)if(Math.hypot(s.p[i]-x,s.p[i+1]-y)<10)return true;return false});if(!hit.length)return;const next=strokesRef.current.filter(s=>!hit.includes(s));setStrokes(next);strokesRef.current=next;emit(next)};
 const penDown=(e:RPointerEvent<SVGSVGElement>)=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const [x,y]=at(e);if(eraser){drawing.current={c:'erase',w:0,p:[]};eraseAt(x,y);return}drawing.current={c:ink,w:3,p:[x,y]};setLive({...drawing.current})};
 const penMove=(e:RPointerEvent<SVGSVGElement>)=>{const d=drawing.current;if(!d)return;const evs=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent];for(const v of evs){const [x,y]=at(v);if(eraser){eraseAt(x,y);continue}const n=d.p.length;if(Math.hypot(d.p[n-2]-x,d.p[n-1]-y)>=1.5)d.p.push(x,y)}if(!eraser)setLive({...d,p:[...d.p]})};
 const penUp=()=>{const d=drawing.current;drawing.current=null;setLive(null);if(!d||d.c==='erase')return;const next=[...strokesRef.current,d];setStrokes(next);strokesRef.current=next;emit(next)};
 const undoInk=()=>{const next=strokesRef.current.slice(0,-1);setStrokes(next);strokesRef.current=next;emit(next)};
 useEffect(()=>{if(!mode.pen)return;const k=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopPropagation();undoInk()}else if(e.key==='Escape')setMode(m=>({...m,pen:false}))};window.addEventListener('keydown',k,true);return()=>window.removeEventListener('keydown',k,true)},[mode.pen]);

 const paste=async(e:RClipboardEvent<HTMLDivElement>)=>{e.preventDefault();const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));
  if(file){const url=await shrinkImage(file);if(url)insertImage(url,'shot');return}
  document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))};
 const keydown=(e:RKeyboardEvent<HTMLDivElement>)=>{if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='h'){e.preventDefault();toggle('h')}};
 const report=(point?:Pt)=>{if(!onSelection)return;onSelection((getSelection()?.toString()||'').trim(),point)};
 const tools:{id:'b'|'u'|'h';icon:IconName;label:string}[]=[
  {id:'b',icon:'type-bold',label:`굵게 (${key('B')})`},
  {id:'u',icon:'type-underline',label:`밑줄 (${key('U')})`},
  {id:'h',icon:'highlighter',label:`형광펜 (${key('⇧H')})`},
 ];
 const tip=(k:'b'|'u'|'h',l:string)=>mode[k]?l.replace(/ \(.*/,'')+' 끄기':l+' · 켜 두고 글을 드래그';
 const when=stamp(updated);
 return <div className="note-sheet note-rich" data-drop={over||undefined} data-pen={mode.pen||undefined} data-mode={(mode.b||mode.u||mode.h)||undefined}>
  {find&&<NoteFind editor={ed} version={last.current} onClose={()=>{onCloseFind?.();ed.current?.focus()}}/>}
  <div ref={paper} className="note-paper">
   {when&&<time className="note-sheet-time" dateTime={updated||undefined}>{when}</time>}
   <div ref={setRef} className="note-rich-editor" role="textbox" aria-multiline="true" aria-label={label} contentEditable={!mode.pen} suppressContentEditableWarning data-empty={(empty&&!strokes.length)||undefined} data-placeholder={placeholder}
    onInput={()=>emit()} onPaste={paste} onKeyDown={keydown} onMouseUp={e=>{afterSelect();report({x:e.clientX,y:e.clientY})}} onTouchEnd={()=>setTimeout(afterSelect,0)} onKeyUp={e=>{if(e.shiftKey&&e.key.startsWith('Arrow'))afterSelect();if(e.shiftKey||e.key.startsWith('Arrow')||e.key==='a')report()}} onBlur={()=>onSelection?.('')}/>
   <svg className="note-ink" aria-hidden={!mode.pen} role={mode.pen?'img':undefined} aria-label={mode.pen?'펜으로 그리는 곳':undefined} style={{height:Math.max(paperH,paper.current?.clientHeight??0)+'px'} as CSSProperties} data-eraser={eraser||undefined}
    onPointerDown={mode.pen?penDown:undefined} onPointerMove={mode.pen?penMove:undefined} onPointerUp={mode.pen?penUp:undefined} onPointerCancel={mode.pen?penUp:undefined}>
    {strokes.map((s,i)=><path key={i} d={pathOf(s.p)} stroke={s.c} strokeWidth={s.w}/>)}
    {live&&<path d={pathOf(live.p)} stroke={live.c} strokeWidth={live.w}/>}
   </svg>
  </div>
  {over&&<p className="note-drop-hint" aria-hidden="true"><Icon name="camera" className="lead"/>여기에 놓으면 3D 화면이 들어가요</p>}
  {flash&&<p className="note-flash" role="status">{flash}</p>}
  {failed&&<p className="note-sheet-error" role="status">저장하지 못했어요. 이미지가 많으면 몇 개 지워 주세요.</p>}
  <div className="note-tools" role="toolbar" aria-label="메모 꾸미기">
   {tools.map(t=><button key={t.id} type="button" className="note-tool" aria-pressed={mode[t.id]} aria-label={t.label} data-tip={tip(t.id,t.label)} data-tip-pos="top" data-hl={t.id==='h'?hl:undefined} onMouseDown={e=>e.preventDefault()} onClick={()=>toggle(t.id)}><Icon name={t.icon}/>{t.id==='h'&&<i className="note-hl-bar" style={{'--sw':HL_SWATCH[hl]} as CSSProperties}/>}</button>)}
   {mode.h&&<div className="note-swatches" role="radiogroup" aria-label="형광펜 색">{HL_COLORS.map(c=><button key={c} type="button" role="radio" aria-checked={hl===c} aria-label={HL_LABEL[c]+' 형광펜'} data-tip={HL_LABEL[c]} data-tip-pos="top" className="note-swatch" data-c={c} style={{'--sw':HL_SWATCH[c]} as CSSProperties} onMouseDown={e=>e.preventDefault()} onClick={()=>pickHl(c)}><i/></button>)}</div>}
   <span className="note-tools-sep" aria-hidden="true"/>
   <button type="button" className="note-tool" aria-pressed={mode.pen} aria-label="펜" data-tip={mode.pen?'펜 끄기 (Esc)':'펜 · 메모 위 어디든 그리기'} data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={()=>{setMode(m=>({...m,pen:!m.pen,h:m.pen?m.h:false}));setEraser(false)}}><Icon name="pen"/></button>
   {mode.pen&&<div className="note-swatches" role="radiogroup" aria-label="펜 색">{INKS.map(i=><button key={i.c} type="button" role="radio" aria-checked={!eraser&&ink===i.c} aria-label={i.label+' 펜'} data-tip={i.label} data-tip-pos="top" className="note-swatch is-ink" style={{'--sw':i.c} as CSSProperties} onClick={()=>{setInkC(i.c);setEraser(false)}}><i/></button>)}
    <button type="button" className="note-tool" aria-pressed={eraser} aria-label="지우개" data-tip="지우개 · 획을 문질러 지우기" data-tip-pos="top" onClick={()=>setEraser(v=>!v)}><Icon name="eraser"/></button>
    <button type="button" className="note-tool" aria-label="한 획 되돌리기" data-tip={`되돌리기 (${key('Z')})`} data-tip-pos="top" disabled={!strokes.length} onClick={undoInk}><Icon name="arrow-counterclockwise"/></button></div>}
   {canShot&&!mode.pen&&<button type="button" className="note-tool" aria-label="3D 화면 캡처해서 넣기" data-tip="3D 화면 캡처 · 모형을 길게 눌러 끌어와도 돼요" data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={shot}><Icon name="camera"/></button>}
  </div>
 </div>;
}

/* 메모 안에서 찾기: 글을 바꾸지 않고 브라우저 강조(CSS Highlight)로 칠해요. Enter 다음 · Shift+Enter 이전 · Esc 닫기 */
type HL={set:(k:string,v:unknown)=>void;delete:(k:string)=>void};
const highlights=():HL|null=>(typeof CSS!=='undefined'&&'highlights' in CSS)?(CSS as unknown as {highlights:HL}).highlights:null;
function NoteFind({editor,version,onClose}:{editor:{current:HTMLDivElement|null};version:string|null;onClose:()=>void}){
 const[q,setQ]=useState(''),[i,setI]=useState(0),[n,setN]=useState(0),box=useRef<HTMLInputElement>(null),ranges=useRef<Range[]>([]);
 useEffect(()=>{box.current?.focus()},[]);
 useEffect(()=>{const el=editor.current,hl=highlights();const list:Range[]=[];const term=q.trim().toLowerCase();
  if(el&&term){const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let t:Node|null;while((t=w.nextNode())){const s=(t.textContent||'').toLowerCase();let at=s.indexOf(term);while(at>=0){const r=document.createRange();r.setStart(t,at);r.setEnd(t,at+term.length);list.push(r);at=s.indexOf(term,at+term.length)}}}
  ranges.current=list;setN(list.length);setI(k=>list.length?Math.min(k,list.length-1):0);
  if(hl){const H=(window as unknown as {Highlight:new(...r:Range[])=>unknown}).Highlight;hl.set('note-find',new H(...list))}
 },[q,version,editor]);
 useEffect(()=>{const hl=highlights(),r=ranges.current[i];if(hl){const H=(window as unknown as {Highlight:new(...r:Range[])=>unknown}).Highlight;hl.set('note-find-cur',r?new H(r):new H())}
  if(r){const el=editor.current?.closest<HTMLElement>('.note-paper')??editor.current,rect=r.getBoundingClientRect(),box=el?.getBoundingClientRect();if(el&&box&&(rect.top<box.top||rect.bottom>box.bottom))el.scrollTop+=rect.top-box.top-box.height/3}},[i,n,q,editor]);
 useEffect(()=>()=>{const hl=highlights();hl?.delete('note-find');hl?.delete('note-find-cur')},[]);
 const step=(d:number)=>{if(n)setI(k=>(k+d+n)%n)};
 return <div className="note-find" role="search">
  <Icon name="search" className="note-find-icon"/>
  <input ref={box} type="search" aria-label="메모에서 찾을 말" placeholder="메모에서 찾기" value={q} onChange={e=>{setQ(e.target.value);setI(0)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();step(e.shiftKey?-1:1)}else if(e.key==='Escape'){e.preventDefault();onClose()}}}/>
  <span className="note-find-count" aria-live="polite">{q.trim()?(n?`${i+1}/${n}`:'없음'):''}</span>
  <button type="button" className="note-tool" aria-label="이전 결과" data-tip="이전 (Shift+Enter)" data-tip-pos="bottom" disabled={!n} onClick={()=>step(-1)}><Icon name="chevron-left"/></button>
  <button type="button" className="note-tool" aria-label="다음 결과" data-tip="다음 (Enter)" data-tip-pos="bottom" disabled={!n} onClick={()=>step(1)}><Icon name="chevron-right"/></button>
  <button type="button" className="note-tool" aria-label="찾기 닫기" data-tip="닫기 (Esc)" data-tip-pos="bottom" onClick={onClose}><Icon name="x-lg"/></button>
 </div>;
}

