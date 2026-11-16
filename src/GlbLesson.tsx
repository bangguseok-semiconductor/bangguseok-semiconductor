import {useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode,PointerEvent as RPointerEvent,KeyboardEvent as RKeyboardEvent} from 'react';
import './glb-lesson.css';
import {StudyHub} from './StudyHub';
import {readLessonNote,writeLessonNote} from './lessonNoteStore';
import {LessonTitle} from './LessonTitle';
import {useLessonShell,PanelToggle,ShellChips,CanvasToolbar,toggleShellPanel} from './LessonShell';
import './lesson-workbench.css';
import {Icon} from './Icon';
import {GlbStage,type PlayState,type CircuitState,type CircuitKey} from './GlbStage';
import {glbLessons,modelUrl,type GlbLessonId,type GlbPart} from './glbLessons';
import {LessonNav,LessonCompanies,type NavLesson} from './lessonNav';

/* 블렌더 단계별 모형 학습 화면 (웨이퍼 · 산화 · FFU · RIE · MOSFET · 전기 논리)
   왼쪽: 단계 목록과 설명 · 가운데: 3D와 재생 막대 · 오른쪽: 메모 · AI
   마지막으로 본 단계는 이 브라우저에 기억해요. */
const stepKey=(id:string)=>`semilab.glb.${id}.step`;
const readStep=(id:string)=>{try{const v=JSON.parse(localStorage.getItem(stepKey(id))||'null');return v&&typeof v.i==='number'?v as {t:string;i:number}:null}catch{return null}};

/* 오른쪽 메모 · AI — 학습마다 원래 쓰던 메모 저장 위치를 그대로 써요(lessonNoteStore) */
function GlbNotes({id,name,profile,onQuiz}:{id:string;name:string;profile?:ReactNode;onQuiz:()=>void}){
 const[note,setNote]=useState(()=>readLessonNote(id));
 return <aside id="shell-panel-right" className="lesson-notes shell-right" aria-label="학습 도우미"><div className="lesson-notes-head">{profile??<b>체험 학습자</b>}<div className="shell-actions"><button type="button" className="shell-quiz" onClick={onQuiz}>퀴즈 풀기</button><PanelToggle side="right"/></div></div><StudyHub lesson={id} primary={{label:`${name} 학습 메모`,value:note.text,updated:note.updated,failed:note.failed,onChange:text=>setNote(writeLessonNote(id,text))}}/></aside>;
}

/* 찾은 글자 주변만 짧게 보여줘요 */
const snippet=(text:string,q:string)=>{const i=text.toLowerCase().indexOf(q);if(i<0)return text.length>56?text.slice(0,56)+'…':text;const a=Math.max(0,i-18),b=Math.min(text.length,i+q.length+30);return <>{a>0&&'…'}{text.slice(a,i)}<mark>{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length,b)}{b<text.length&&'…'}</>};

export function GlbLesson({id,onExit,onMission,onSwitch,profile,right,extra}:{id:GlbLessonId;onExit:()=>void;onMission:()=>void;onSwitch?:(id:NavLesson)=>void;profile?:ReactNode;right?:ReactNode;extra?:ReactNode}){
 const def=glbLessons[id],shell=useLessonShell();
 const saved=useMemo(()=>readStep(id),[id]);
 const[track,setTrack]=useState(()=>def.tracks.find(t=>t.id===saved?.t)?.id??def.tracks[0].id);
 const stages=def.tracks.find(t=>t.id===track)!.stages;
 const[step,setStep]=useState(()=>Math.min(saved?.i??0,stages.length-1));
 const stage=stages[step];
 const[paused,setPaused]=useState(false),[replay,setReplay]=useState(0),[reset,setReset]=useState(0),[demo,setDemo]=useState(0);
 const[play,setPlay]=useState<PlayState>('loading'),[part,setPartState]=useState<GlbPart|null>(null),[clear,setClear]=useState(0),[seenTip,setSeenTip]=useState(false);
 const setPart=(p:GlbPart|null)=>{setPartState(p);if(p)setSeenTip(true)};
 const[scope,setScope]=useState<'all'|'steps'|'parts'>('all'),[scopeOpen,setScopeOpen]=useState(false);
 const STEPS=def.area==='설계'?'학습 단계':'공정 단계',PARTS=def.area==='설계'?'구성 설명':'기계 설명';
 const[searching,setSearching]=useState(false),[query,setQuery]=useState(''),[pickOpen,setPickOpen]=useState(false),[shot,setShot]=useState<{part:GlbPart;url:string}|null>(null);const q=query.trim().toLowerCase();
 const[tab,setTab]=useState<'steps'|'parts'>('steps'),[present,setPresent]=useState<GlbPart[]>([]),[focus,setFocus]=useState<{part:GlbPart;n:number}|null>(null);
 /* 3D에서 부품을 누르면 왼쪽 패널이 '기계 설명' 탭으로 바뀌고 그 부품 카드가 열려요(패널이 접혀 있으면 펼쳐요) */
 const pickPart=(p:GlbPart|null)=>{setPart(p);if(!p)return;setTab('parts');setSearching(false);if(shell.collapsed.left)toggleShellPanel('left')};
 const[circuit,setCircuit]=useState<CircuitState>({closed:false,high:false,a:false,b:false});
 const[seen,setSeen]=useState<Set<string>>(()=>new Set());
 const heading=useRef<HTMLHeadingElement>(null);

 /* ⌘Z / Ctrl+Z: 바로 전 상태(단계 · 탭 · 고른 부품 · 회로 스위치)로 되돌리기, ⌘⇧Z / Ctrl+Y: 다시 실행
    입력칸에 글을 쓰는 중에는 브라우저 기본 되돌리기를 그대로 써요. */
 type Snap={track:string;step:number;tab:'steps'|'parts';part:string|null;circuit:CircuitState};
 const snapNow=():Snap=>({track,step,tab,part:part?.name??null,circuit});
 const hist=useRef<Snap[]>([]),future=useRef<Snap[]>([]),lastSnap=useRef<Snap|null>(null),applying=useRef<Snap|null>(null),[toast,setToast]=useState<{text:string;n:number}|null>(null);
 useEffect(()=>{const cur=snapNow(),prev=lastSnap.current;lastSnap.current=cur;if(!prev)return;
  const a=applying.current;if(a){if(a.part===cur.part||cur.part===null&&a.part!==null&&(a.track!==prev.track||a.step!==prev.step))return;applying.current=null;return}
  const same=prev.track===cur.track&&prev.step===cur.step&&prev.tab===cur.tab&&prev.part===cur.part&&JSON.stringify(prev.circuit)===JSON.stringify(cur.circuit);if(same)return;
  hist.current.push(prev);if(hist.current.length>60)hist.current.shift();future.current=[]},[track,step,tab,part,circuit]);
 const restore=(to:Snap,label:string)=>{applying.current=to;setTrack(to.track);setStep(to.step);setTab(to.tab);setCircuit(to.circuit);
  requestAnimationFrame(()=>{const pt=to.part?def.parts.find(x=>x.name===to.part):null;if(pt)setFocus(f=>({part:pt,n:(f?.n??0)+1}));else setClear(c=>c+1);setTimeout(()=>{applying.current=null},300)});
  const st=def.tracks.find(t=>t.id===to.track)?.stages[to.step];setToast(t=>({text:`${label} · ${to.part??(st?String(to.step+1).padStart(2,'0')+' '+st.title:'')}`,n:(t?.n??0)+1}))};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;if(!(e.metaKey||e.ctrlKey)||e.altKey)return;const k=e.key.toLowerCase();
  const redo=(k==='z'&&e.shiftKey)||(k==='y'&&e.ctrlKey&&!e.metaKey);const undo=k==='z'&&!e.shiftKey;if(!undo&&!redo)return;e.preventDefault();const cur=snapNow();
  if(undo){const to=hist.current.pop();if(!to){setToast(t=>({text:'더 되돌릴 게 없어요',n:(t?.n??0)+1}));return}future.current.push(cur);restore(to,'되돌림')}
  else{const to=future.current.pop();if(!to){setToast(t=>({text:'다시 실행할 게 없어요',n:(t?.n??0)+1}));return}hist.current.push(cur);restore(to,'다시 실행')}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),1600);return()=>clearTimeout(t)},[toast?.n]);
 useEffect(()=>{try{localStorage.setItem(stepKey(id),JSON.stringify({t:track,i:step}))}catch{}setSeen(s=>new Set(s).add(track+':'+step));setPaused(false);setPart(null)},[id,track,step]);
 const go=(i:number)=>{if(i<0||i>=stages.length)return;setStep(i);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}))};
 const switchTrack=(t:string)=>{if(t===track)return;setTrack(t);setStep(s=>Math.min(s,def.tracks.find(x=>x.id===t)!.stages.length-1))};
 const toggle=(k:CircuitKey)=>setCircuit(c=>({...c,[k]:!c[k]}));
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;if(e.key==='ArrowRight'&&e.altKey){e.preventDefault();go(step+1)}else if(e.key==='ArrowLeft'&&e.altKey){e.preventDefault();go(step-1)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[step,stages.length]);

 const animated=stage.play!=='none'&&!stage.interact;
 const last=step===stages.length-1;
 const src=modelUrl(def,stage.file);
 const total=def.tracks.reduce((n,t)=>n+t.stages.length,0),progress=Math.round(seen.size/total*100);
 const row=(circuit.a?2:0)+(circuit.b?1:0);

 const progressRef=useRef<HTMLSpanElement|null>(null),seekRef=useRef<((p:number)=>void)|null>(null),scrub=useRef<{was:boolean}|null>(null),[scrubbing,setScrubbing]=useState(false);
 /* 재생 막대 끌기: 끄는 동안은 멈추고, 놓으면 원래 재생 중이었을 때만 이어서 재생 */
 const scrubAt=(x:number)=>{const el=progressRef.current;if(!el)return;const r=el.getBoundingClientRect();seekRef.current?.(Math.min(1,Math.max(0,(x-r.left)/r.width)))};
 const scrubDown=(e:RPointerEvent<HTMLSpanElement>)=>{if(e.button!==0||play==='loading')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);scrub.current={was:!paused&&play==='playing'};setScrubbing(true);setPaused(true);scrubAt(e.clientX)};
 const scrubMove=(e:RPointerEvent<HTMLSpanElement>)=>{if(scrub.current)scrubAt(e.clientX)};
 const scrubUp=()=>{const s=scrub.current;scrub.current=null;setScrubbing(false);if(s?.was)setPaused(false)};
 const scrubKey=(e:RKeyboardEvent<HTMLSpanElement>)=>{const d=e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:e.key==='Home'?-1:e.key==='End'?1:0;if(!d)return;e.preventDefault();const cur=parseFloat(progressRef.current?.style.getPropertyValue('--p')||'0')||0;seekRef.current?.(Math.min(1,Math.max(0,cur+d)))};
 return <main className="glb-page lesson-workbench shell-page" {...shell.attrs}>
  <ShellChips leftId={id} left={def.title} right="메모 · AI"/>
  <button type="button" className="phone-back" aria-label="실습 선택으로 나가기" onClick={onExit}><Icon name="chevron-left" size={20}/></button>
  <div className="glb-grid shell-grid">
   <section className="glb-visual shell-center" aria-label="3D 학습 공간">
    <GlbStage src={src} label={`${def.title} · ${stage.title} 3D 모형`} play={stage.play} paused={paused} replay={replay} reset={reset} parts={def.parts}
     interact={stage.interact} circuit={circuit} demo={demo} clear={clear} focus={focus} onParts={setPresent} onShot={(pt,url)=>setShot({part:pt,url})} onToggle={toggle} onState={setPlay} onPick={pickPart} progress={progressRef} seek={seekRef}/>
    <div className="glb-player" role="group" aria-label="단계 재생">
     <button type="button" className="glb-icon" aria-label="이전 단계" data-tip="이전 단계" data-tip-pos="bottom" disabled={step===0} onClick={()=>go(step-1)}><Icon name="chevron-left"/></button>
     <span className="glb-player-title"><b>{String(step+1).padStart(2,'0')}</b><span>{stage.title}</span></span>
     <button type="button" className="glb-icon" aria-label="다음 단계" data-tip="다음 단계" data-tip-pos="bottom" disabled={last} onClick={()=>go(step+1)}><Icon name="chevron-right"/></button>
     {animated&&<><i className="glb-sep" aria-hidden="true"/>
      {play==='done'
       ?<button type="button" className="glb-icon" aria-label="다시 보기" data-tip="다시 보기" data-tip-pos="bottom" onClick={()=>{setPaused(false);setReplay(r=>r+1)}}><Icon name="arrow-repeat"/></button>
       :<button type="button" className="glb-icon" aria-label={paused?'재생':'일시정지'} data-tip={paused?'재생':'일시정지'} data-tip-pos="bottom" disabled={play==='loading'} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'play-fill':'pause-fill'}/></button>}</>}
     {animated&&<span ref={progressRef} className="glb-progress" data-state={play} data-scrub={scrubbing||undefined} role="slider" tabIndex={0} aria-label="재생 위치" aria-valuemin={0} aria-valuemax={100} aria-valuetext="좌우 방향키로 이동" onPointerDown={scrubDown} onPointerMove={scrubMove} onPointerUp={scrubUp} onPointerCancel={scrubUp} onKeyDown={scrubKey}><i className="glb-progress-track"><i className="glb-progress-fill"/></i><b className="glb-progress-thumb" aria-hidden="true"/></span>}
     {stage.interact&&<><i className="glb-sep" aria-hidden="true"/><button type="button" className="glb-icon" aria-label="예시 재생" data-tip="예시 애니메이션 보기" data-tip-pos="bottom" disabled={play==='loading'||play==='playing'} onClick={()=>setDemo(d=>d+1)}><Icon name="play-fill"/></button></>}
    </div>
    {part&&tab==='steps'?<div className="glb-part-pop" role="status" aria-live="polite"><div><b>{part.name}</b><button type="button" className="glb-icon" aria-label="설명 닫기" onClick={()=>setClear(c=>c+1)}><Icon name="x-lg"/></button></div><p>{part.desc}</p></div>
     :null}
    {toast&&<p key={toast.n} className="glb-toast" role="status">{toast.text}</p>}
    <CanvasToolbar tiles={[{id:'reset',label:'초기화',icon:'arrow-counterclockwise',onClick:()=>{setPaused(false);setReset(r=>r+1)}}]} view={{camera:true,labels:true}}/>
   </section>

   <section id="shell-panel-left" className="glb-guide shell-left">
    <div className="workbench-panel-title"><PanelToggle side="left"/><button className="shell-back" data-tip="실습 선택" data-tip-pos="bottom" onClick={onExit}><Icon name="chevron-left"/><span className="sr-only">실습 선택</span></button><LessonTitle id={id} fallback={def.title}/><LessonNav current={id} area={def.area} onSwitch={onSwitch}/></div>
    {searching?<div className="glb-findbar">
     <div className="glb-findrow"><label className="glb-find"><Icon name="search"/><input autoFocus type="search" aria-label="이 학습에서 찾기" placeholder="찾기…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){setSearching(false);setQuery('')}}}/></label>
      <div className="glb-findfilter"><button type="button" className="glb-icon" aria-label="찾을 곳" aria-haspopup="menu" aria-expanded={scopeOpen} aria-pressed={scope!=='all'} data-tip="찾을 곳" data-tip-pos="bottom" onClick={()=>setScopeOpen(v=>!v)}><Icon name="sliders"/></button>
       {scopeOpen&&<ul className="lesson-nav-menu glb-scope-menu" role="menu"><li className="lesson-nav-head" aria-hidden="true">찾을 곳</li>{([['all','전체'],['steps',STEPS],['parts',PARTS]] as const).map(([k,l])=><li key={k} role="none" aria-selected={scope===k}><button type="button" role="menuitemradio" aria-checked={scope===k} onClick={()=>{setScope(k);setScopeOpen(false);if(k!=='all')setTab(k)}}><Icon name="check2" className="lesson-nav-check"/><span>{l}</span></button></li>)}</ul>}</div>
      <button type="button" className="glb-icon" aria-label="찾기 닫기" data-tip="닫기" data-tip-pos="bottom" onClick={()=>{setSearching(false);setQuery('');setScope('all');setScopeOpen(false)}}><Icon name="x-lg"/></button></div>
     {scope!=='all'&&<div className="glb-findchips"><button type="button" className="glb-chip" onClick={()=>setScope('all')} aria-label={`${scope==='steps'?STEPS:PARTS} 조건 지우기`}>{scope==='steps'?STEPS:PARTS}<Icon name="x-lg"/></button></div>}
    </div>
    :<div className="glb-tabbar"><div className="glb-tabs2" role="tablist" aria-label="학습 보기"><button type="button" role="tab" aria-selected={tab==='steps'} onClick={()=>setTab('steps')}>{STEPS}</button><button type="button" role="tab" aria-selected={tab==='parts'} onClick={()=>setTab('parts')}>{PARTS}</button></div>
     <button type="button" className="glb-icon glb-search-btn" aria-label="찾기" data-tip="찾기" data-tip-pos="bottom" onClick={()=>{setSearching(true);setQuery('')}}><Icon name="search"/></button></div>}
    {searching&&q?<div className="glb-results" role="region" aria-label="찾은 결과">
     {scope!=='parts'&&(()=>{const hits=def.tracks.flatMap(t=>t.stages.map((st,i)=>({t,st,i}))).filter(x=>(x.st.title+' '+x.st.body+' '+(x.st.key??'')).toLowerCase().includes(q));return <section><h3>{STEPS}<small>{hits.length}</small></h3>{hits.length?<ul>{hits.map(x=><li key={x.t.id+x.i}><button type="button" onClick={()=>{setTrack(x.t.id);setStep(x.i);setTab('steps');setSearching(false);setQuery('')}}><b>{String(x.i+1).padStart(2,'0')} {x.st.title}{def.tracks.length>1&&<em>{x.t.label}</em>}</b><span>{snippet(x.st.body,q)}</span></button></li>)}</ul>:<p className="glb-note">일치하는 단계가 없어요.</p>}</section>})()}
     {scope!=='steps'&&(()=>{const hits=def.parts.filter(pt=>present.includes(pt)&&(pt.name+' '+(pt.en??'')+' '+pt.desc).toLowerCase().includes(q));return <section><h3>{PARTS}<small>{hits.length}</small></h3>{hits.length?<ul>{hits.map(pt=><li key={pt.name}><button type="button" onClick={()=>{setTab('parts');setFocus(f=>({part:pt,n:(f?.n??0)+1}));setSearching(false);setQuery('')}}><b>{pt.name}</b><span>{snippet(pt.desc,q)}</span></button></li>)}</ul>:<p className="glb-note">지금 장면에서 일치하는 부품이 없어요.</p>}</section>})()}
    </div>:<>
    {tab==='parts'?<div className="glb-parts" role="tabpanel">
     <div className="glb-partpick">
      <button type="button" className="glb-partpick-btn" aria-haspopup="listbox" aria-expanded={pickOpen} onClick={()=>setPickOpen(v=>!v)}><Icon name="chevron-right" className="glb-partpick-chev"/><span>{part?part.name:'부품 선택'}</span></button>
      {pickOpen&&<ul className="glb-partpick-menu" role="listbox" aria-label="부품">{def.parts.filter(pt=>present.includes(pt)&&(!q||(pt.name+' '+(pt.en??'')+' '+pt.desc).toLowerCase().includes(q))).map(pt=>{const here=present.includes(pt);return <li key={pt.name} role="option" aria-selected={part===pt}><button type="button" data-absent={!here||undefined} onClick={()=>{setPickOpen(false);if(here)setFocus(f=>({part:pt,n:(f?.n??0)+1}));else{setShot(null);setPart(pt)}}}>{pt.name}{!here&&<small>다른 단계</small>}</button></li>})}</ul>}
     </div>
     {part?<article className="glb-partcard">
      {shot&&shot.part===part?<figure><img src={shot.url} alt={`${part.name} 3D 모형`}/></figure>:!present.includes(part)&&<p className="glb-note glb-partcard-absent">이 부품은 다른 단계 장면에 있어요. 단계를 옮기면 3D로 볼 수 있어요.</p>}
      <h3>{part.name}{part.en&&<small>{part.en}</small>}</h3>
      {part.specs&&<dl>{part.specs.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      <h4>핵심 설명</h4>
      <p>{part.desc}</p>
     </article>:<p className="glb-partcard-empty"><Icon name="hand-index" className="lead"/>부품을 고르거나 3D 모형을 직접 눌러 보세요.</p>}
    </div>:<>
    {def.tracks.length>1&&<div className="glb-tracks" role="tablist" aria-label="공정 방식">{def.tracks.map(t=><button key={t.id} type="button" role="tab" aria-selected={t.id===track} onClick={()=>switchTrack(t.id)}><b>{t.label}</b><small>{t.sub}</small></button>)}</div>}
    <ol className="guide-items glb-steps" aria-label="학습 단계">{stages.map((s,i)=>q&&!(s.title+' '+s.body).toLowerCase().includes(q)?null:<li key={s.file}><button type="button" className={i===step?'active':''} aria-current={i===step?'step':undefined} onClick={()=>go(i)}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</button></li>)}</ol>

    <article className="glb-stage-copy" aria-live="polite">
     <h2 ref={heading} tabIndex={-1}>{stage.title}</h2>
     <p>{stage.body}</p>
     {stage.key&&<p className="glb-key"><b>핵심</b>{stage.key}</p>}
     {stage.terms&&<dl className="glb-terms">{stage.terms.map(([t,d])=><div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>}

     {stage.interact==='switch'&&<div className="glb-controls"><button type="button" role="switch" aria-checked={circuit.closed} onClick={()=>toggle('closed')}><span>스위치</span><b>{circuit.closed?'닫힘':'열림'}</b></button></div>}
     {stage.interact==='signal'&&<div className="glb-controls"><div className="glb-seg" role="group" aria-label="신호">{[false,true].map(h=><button key={String(h)} type="button" aria-pressed={circuit.high===h} onClick={()=>setCircuit(c=>({...c,high:h}))}>{h?'HIGH':'LOW'}</button>)}</div></div>}
     {stage.interact==='and'&&<div className="glb-controls">
      <div className="glb-inputs">{(['a','b'] as const).map(k=><button key={k} type="button" role="switch" aria-checked={circuit[k]} onClick={()=>toggle(k)}><span>입력 {k.toUpperCase()}</span><b>{circuit[k]?1:0}</b></button>)}</div>
      <table className="glb-truth"><caption className="sr-only">AND 진리표</caption><thead><tr><th>A</th><th>B</th><th>Y</th></tr></thead><tbody>{[0,1,2,3].map(r=><tr key={r} aria-current={r===row||undefined}><td>{r>>1}</td><td>{r&1}</td><td>{r===3?1:0}</td></tr>)}</tbody></table>
      </div>}

    </article>
    </>}
    </>}
    <details className="glb-about"><summary>이 학습에 대해</summary>
     <p>{def.intro}</p>
     <ul>{def.goals.map(g=><li key={g}>{g}</li>)}</ul>
     <p className="glb-note">{def.caution}</p>
     {def.refs.length>0&&<ul className="glb-refs">{def.refs.map(r=><li key={r.title}>{r.url?<a href={r.url} target="_blank" rel="noreferrer">{r.title}<Icon name="box-arrow-up-right" className="trail"/></a>:r.title}</li>)}</ul>}
    </details>
    <LessonCompanies id={id}/>
   </section>
   {right??<GlbNotes id={id} name={def.title.split('·').pop()!.trim()} profile={profile} onQuiz={onMission}/>}
  </div>
 </main>;
}
