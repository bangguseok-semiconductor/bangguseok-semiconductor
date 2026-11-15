import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Ref,PointerEvent as RPointerEvent} from 'react';
import {Icon,type IconName} from './Icon';
import {isRich,textToHtml,sanitizeNote} from './noteHtml';
import {captureStage,hasStageCapture,onStageCapture} from './stageCapture';

/* iOS 메모처럼 입력하는 즉시 저장되는 메모 시트.
   아래 도구 막대: 굵게 · 밑줄 · 형광펜 | 펜으로 그리기 · 3D 화면 캡처.
   3D 모형을 길게 누른 채 메모로 끌어 놓아도 그 장면이 이미지로 들어가요(GlbStage가 'note-drop-image'를 보내요). */
const stamp=(iso?:string|null)=>{if(!iso)return '';const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)};
const isMac=typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const key=(k:string)=>(isMac?'⌘':'Ctrl+')+k;
type Fmt={b:boolean;u:boolean;m:boolean};
type Pt={x:number;y:number};

/** 이미지 파일을 메모에 넣기 좋게 줄여요(긴 변 720px, JPEG) */
function shrinkImage(file:Blob):Promise<string|null>{
 return new Promise(res=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{const k=Math.min(1,720/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);const g=c.getContext('2d');if(!g){res(null);return}g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85))};img.onerror=()=>{URL.revokeObjectURL(url);res(null)};img.src=url});
}

/** onSelection: 글을 드래그해 고르면 고른 글과 포인터 위치(키보드 선택이면 없음)를 알려 줘요 */
export function NoteSheet({label,value,updated,failed,onChange,inputRef,onSelection,placeholder='메모'}:{label:string;value:string;updated?:string|null;failed?:boolean;onChange:(text:string)=>void;inputRef?:Ref<HTMLElement>;onSelection?:(text:string,point?:{x:number;y:number})=>void;placeholder?:string}){
 const ed=useRef<HTMLDivElement|null>(null),last=useRef<string|null>(null),change=useRef(onChange);change.current=onChange;
 const[fmt,setFmt]=useState<Fmt>({b:false,u:false,m:false}),[empty,setEmpty]=useState(!value),[drawing,setDrawing]=useState(false),[over,setOver]=useState(false),[flash,setFlash]=useState('');
 const canShot=useSyncExternalStore(onStageCapture,hasStageCapture,()=>false);
 const setRef=(el:HTMLDivElement|null)=>{ed.current=el;const r=inputRef;if(!r)return;if(typeof r==='function')r(el);else (r as {current:HTMLElement|null}).current=el};

 /* 밖에서 다른 메모로 바뀌면 내용을 새로 채워요(내가 방금 쓴 내용이면 그대로 둠) */
 useEffect(()=>{const el=ed.current;if(!el||value===last.current)return;el.innerHTML=value?(isRich(value)?sanitizeNote(value):textToHtml(value)):'';last.current=value;setEmpty(!value)},[value]);
 const emit=()=>{const el=ed.current;if(!el)return;const html=sanitizeNote(el.innerHTML);last.current=html;setEmpty(!html);change.current(html)};
 const inEditor=(n:Node|null)=>!!n&&!!ed.current&&ed.current.contains(n);
 const markOf=(n:Node|null)=>{let e:Node|null=n;while(e&&e!==ed.current){if((e as HTMLElement).tagName==='MARK')return e as HTMLElement;e=e.parentNode}return null};
 /* 커서가 있는 곳의 서식 상태(한 프레임에 한 번만 읽고, 바뀐 경우에만 다시 그림) */
 const raf=useRef(0);
 const refresh=()=>{if(raf.current)return;raf.current=requestAnimationFrame(()=>{raf.current=0;const s=getSelection();if(!s||!inEditor(s.anchorNode))return;
  const next={b:document.queryCommandState('bold'),u:document.queryCommandState('underline'),m:!!markOf(s.anchorNode)};
  setFmt(f=>f.b===next.b&&f.u===next.u&&f.m===next.m?f:next)})};
 useEffect(()=>{document.addEventListener('selectionchange',refresh);return()=>{document.removeEventListener('selectionchange',refresh);cancelAnimationFrame(raf.current)}},[]);

 const exec=(cmd:'bold'|'underline')=>{ed.current?.focus();document.execCommand(cmd);emit();refresh()};
 /* 형광펜: 고른 글을 mark로 감싸고, 이미 칠한 곳에서 누르면 지워요 */
 const highlight=()=>{const s=getSelection();if(!s||!s.rangeCount||!inEditor(s.anchorNode)){ed.current?.focus();return}
  const m=markOf(s.anchorNode)||markOf(s.focusNode);
  if(m){m.replaceWith(...m.childNodes)}else{const r=s.getRangeAt(0);if(r.collapsed)return;const mark=document.createElement('mark');mark.appendChild(r.extractContents());r.insertNode(mark);s.removeAllRanges();const nr=document.createRange();nr.selectNodeContents(mark);s.addRange(nr)}
  emit();refresh()};

 const insertImage=(url:string,kind:'shot'|'sketch',point?:Pt)=>{const el=ed.current;if(!el)return;
  let r:Range|null=null;
  if(point){const d=document as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range|null;caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null};r=d.caretRangeFromPoint?.(point.x,point.y)??null;if(!r){const p=d.caretPositionFromPoint?.(point.x,point.y);if(p){r=document.createRange();r.setStart(p.offsetNode,p.offset)}}}
  if(!r||!inEditor(r.startContainer)){const s=getSelection();r=s&&s.rangeCount&&inEditor(s.getRangeAt(0).startContainer)?s.getRangeAt(0):null}
  const box=document.createElement('div'),img=document.createElement('img');img.src=url;img.alt=kind==='sketch'?'손글씨 그림':'3D 화면 캡처';img.dataset.kind=kind;box.appendChild(img);
  const after=document.createElement('div');after.appendChild(document.createElement('br'));
  if(r){r.collapse(false);let blk:Node|null=r.startContainer;while(blk&&blk.parentNode!==el)blk=blk.parentNode;if(blk&&blk!==el)(blk as ChildNode).after(box,after);else{r.insertNode(after);r.insertNode(box)}}else el.append(box,after);
  const s=getSelection();if(s){const nr=document.createRange();nr.setStart(after,0);nr.collapse(true);s.removeAllRanges();s.addRange(nr)}
  emit();img.scrollIntoView?.({block:'nearest',behavior:'smooth'});setFlash(kind==='sketch'?'그림을 넣었어요':'3D 화면을 넣었어요');setTimeout(()=>setFlash(''),1600)};
 const shot=()=>{const url=captureStage();if(url)insertImage(url,'shot')};

 /* 3D에서 끌어온 장면 받기 */
 useEffect(()=>{const el=ed.current;if(!el)return;
  const drop=(e:Event)=>{const d=(e as CustomEvent<{url:string;x:number;y:number}>).detail;setOver(false);insertImage(d.url,'shot',{x:d.x,y:d.y})};
  const hover=(e:Event)=>setOver(!!(e as CustomEvent<boolean>).detail);
  el.addEventListener('note-drop-image',drop);el.addEventListener('note-drop-hover',hover);
  return()=>{el.removeEventListener('note-drop-image',drop);el.removeEventListener('note-drop-hover',hover)}},[]);

 const paste=async(e:React.ClipboardEvent<HTMLDivElement>)=>{e.preventDefault();const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));
  if(file){const url=await shrinkImage(file);if(url)insertImage(url,'shot');return}
  document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))};
 const keydown=(e:React.KeyboardEvent<HTMLDivElement>)=>{if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='h'){e.preventDefault();highlight()}};
 const report=(point?:Pt)=>{if(!onSelection)return;onSelection((getSelection()?.toString()||'').trim(),point)};
 const tools:{id:string;icon:IconName;label:string;on?:boolean;run:()=>void;hide?:boolean}[]=[
  {id:'b',icon:'type-bold',label:`굵게 (${key('B')})`,on:fmt.b,run:()=>exec('bold')},
  {id:'u',icon:'type-underline',label:`밑줄 (${key('U')})`,on:fmt.u,run:()=>exec('underline')},
  {id:'m',icon:'highlighter',label:`형광펜 (${key('⇧H')})`,on:fmt.m,run:highlight},
 ];
 const when=stamp(updated);
 return <div className="note-sheet note-rich" data-drop={over||undefined}>
  {when&&<time className="note-sheet-time" dateTime={updated||undefined}>{when}</time>}
  <div ref={setRef} className="note-rich-editor" role="textbox" aria-multiline="true" aria-label={label} contentEditable suppressContentEditableWarning data-empty={empty||undefined} data-placeholder={placeholder}
   onInput={emit} onPaste={paste} onKeyDown={keydown} onMouseUp={e=>report({x:e.clientX,y:e.clientY})} onKeyUp={e=>{if(e.shiftKey||e.key.startsWith('Arrow')||e.key==='a')report()}} onBlur={()=>onSelection?.('')}/>
  {over&&<p className="note-drop-hint" aria-hidden="true"><Icon name="camera" className="lead"/>여기에 놓으면 3D 화면이 들어가요</p>}
  {flash&&<p className="note-flash" role="status">{flash}</p>}
  {failed&&<p className="note-sheet-error" role="status">저장하지 못했어요. 이미지가 많으면 몇 개 지워 주세요.</p>}
  <div className="note-tools" role="toolbar" aria-label="메모 꾸미기">
   {tools.map(t=><button key={t.id} type="button" className="note-tool" aria-pressed={t.on} aria-label={t.label} data-tip={t.label} data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={t.run}><Icon name={t.icon}/></button>)}
   <span className="note-tools-sep" aria-hidden="true"/>
   <button type="button" className="note-tool" aria-label="펜으로 그리기" data-tip="펜으로 그리기" data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={()=>setDrawing(true)}><Icon name="pen"/></button>
   {canShot&&<button type="button" className="note-tool" aria-label="3D 화면 캡처해서 넣기" data-tip="3D 화면 캡처 · 모형을 길게 눌러 끌어와도 돼요" data-tip-pos="top" onMouseDown={e=>e.preventDefault()} onClick={shot}><Icon name="camera"/></button>}
  </div>
  {drawing&&<DrawPad onCancel={()=>setDrawing(false)} onDone={url=>{setDrawing(false);ed.current?.focus();if(url)insertImage(url,'sketch')}}/>}
 </div>;
}

/* 펜으로 그리기: 메모 위에 뜨는 그림판. 색 3가지 · 지우개 · 한 획 되돌리기 */
const INKS=[{id:'ink',label:'검정',c:'#1f2328'},{id:'orange',label:'주황',c:'#f07f1a'},{id:'blue',label:'파랑',c:'#2f6fe0'}];
type Stroke={c:string;w:number;erase:boolean;pts:{x:number;y:number;p:number}[]};
function DrawPad({onCancel,onDone}:{onCancel:()=>void;onDone:(url:string|null)=>void}){
 const cv=useRef<HTMLCanvasElement>(null),strokes=useRef<Stroke[]>([]),cur=useRef<Stroke|null>(null);
 const[ink,setInk]=useState(INKS[0].c),[erase,setErase]=useState(false),[count,setCount]=useState(0);
 const ctx=()=>{const c=cv.current;return c?c.getContext('2d'):null};
 const fit=()=>{const c=cv.current;if(!c)return;const r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);redraw()};
 const line=(g:CanvasRenderingContext2D,s:Stroke)=>{const d=window.devicePixelRatio||1;g.save();g.globalCompositeOperation=s.erase?'destination-out':'source-over';g.strokeStyle=s.c;g.lineCap='round';g.lineJoin='round';
  const p=s.pts;if(p.length===1){g.fillStyle=s.c;g.beginPath();g.arc(p[0].x*d,p[0].y*d,s.w*d/2,0,Math.PI*2);g.fill();g.restore();return}
  for(let i=1;i<p.length;i++){g.lineWidth=s.w*d*(s.erase?1:.6+.8*p[i].p);g.beginPath();const a=p[i-1],b=p[i],m0=i>1?{x:(p[i-2].x+a.x)/2,y:(p[i-2].y+a.y)/2}:a,m1={x:(a.x+b.x)/2,y:(a.y+b.y)/2};g.moveTo(m0.x*d,m0.y*d);g.quadraticCurveTo(a.x*d,a.y*d,m1.x*d,m1.y*d);g.stroke()}g.restore()};
 const redraw=()=>{const g=ctx(),c=cv.current;if(!g||!c)return;g.clearRect(0,0,c.width,c.height);for(const s of strokes.current)line(g,s)};
 useEffect(()=>{fit();const ro=new ResizeObserver(fit);if(cv.current)ro.observe(cv.current);const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onCancel();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopPropagation();undo()}};window.addEventListener('keydown',esc,true);return()=>{ro.disconnect();window.removeEventListener('keydown',esc,true)}},[]);
 const at=(e:{clientX:number;clientY:number;pressure:number;pointerType:string})=>{const r=cv.current!.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,p:e.pointerType==='pen'?e.pressure||.5:.5}};
 const down=(e:RPointerEvent<HTMLCanvasElement>)=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);cur.current={c:ink,w:erase?22:3,erase,pts:[at(e)]};strokes.current.push(cur.current);redraw()};
 const move=(e:RPointerEvent<HTMLCanvasElement>)=>{const s=cur.current;if(!s)return;const evs=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent];for(const v of evs)s.pts.push(at(v));redraw()};
 const up=()=>{if(cur.current){cur.current=null;setCount(strokes.current.length)}};
 const undo=()=>{strokes.current.pop();setCount(strokes.current.length);redraw()};
 const clear=()=>{strokes.current=[];setCount(0);redraw()};
 /* 그린 부분만 잘라 흰 종이 위에 얹어 이미지로 */
 const done=()=>{const c=cv.current;if(!c||!strokes.current.some(s=>!s.erase)){onDone(null);return}
  const g=c.getContext('2d')!,{width:W,height:H}=c,data=g.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2)if(data[(y*W+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0){onDone(null);return}
  const d=window.devicePixelRatio||1,pad=16*d;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(W,x1+pad);y1=Math.min(H,y1+pad);
  const w=x1-x0,h=y1-y0,k=Math.min(1,720/Math.max(w,h)),o=document.createElement('canvas');o.width=Math.round(w*k);o.height=Math.round(h*k);const og=o.getContext('2d')!;og.fillStyle='#fff';og.fillRect(0,0,o.width,o.height);og.drawImage(c,x0,y0,w,h,0,0,o.width,o.height);onDone(o.toDataURL('image/png'))};
 return <div className="draw-pad" role="dialog" aria-label="펜으로 그리기">
  <div className="draw-bar">
   <div className="draw-inks" role="radiogroup" aria-label="펜 색">{INKS.map(i=><button key={i.id} type="button" role="radio" aria-checked={!erase&&ink===i.c} aria-label={i.label+' 펜'} data-tip={i.label} data-tip-pos="bottom" className="draw-ink" style={{'--ink':i.c} as React.CSSProperties} onClick={()=>{setInk(i.c);setErase(false)}}/>)}</div>
   <button type="button" className="note-tool" aria-pressed={erase} aria-label="지우개" data-tip="지우개" data-tip-pos="bottom" onClick={()=>setErase(v=>!v)}><Icon name="eraser"/></button>
   <button type="button" className="note-tool" aria-label="한 획 되돌리기" data-tip={`되돌리기 (${key('Z')})`} data-tip-pos="bottom" disabled={!count} onClick={undo}><Icon name="arrow-counterclockwise"/></button>
   <button type="button" className="note-tool" aria-label="모두 지우기" data-tip="모두 지우기" data-tip-pos="bottom" disabled={!count} onClick={clear}><Icon name="trash3"/></button>
   <span className="draw-bar-gap"/>
   <button type="button" className="btn btn--tertiary btn--sm" onClick={onCancel}>취소</button>
   <button type="button" className="btn btn--primary btn--sm" disabled={!count} onClick={done}>넣기</button>
  </div>
  <canvas ref={cv} className="draw-canvas" data-erase={erase||undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
 </div>;
}
