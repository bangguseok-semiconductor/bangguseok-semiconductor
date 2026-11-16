import {useEffect,useRef,useState} from 'react';
import {uiZoom} from './uiZoom';
import {CleanroomEnvironment} from './CleanroomEnvironment';
import {CleanroomTour,type TourApi,type TourPart,type GownStep,type TourLayers} from './CleanroomTour';
import './welcome.css';
import {ConceptPanel} from './ConceptPanel';
import {cleanroomConcepts} from './conceptTopics';
import {Icon} from './Icon';
export type Visitor={organization:string;nickname:string};
const reduced=()=>typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 클린룸 공부하기 5단계 — 블렌더 체험 공간(07)의 웨이포인트와 1:1 */
const points=[
 {step:'방진복 착용',label:'갱의실',title:'방진복 입기',text:'사람 몸에서 나오는 머리카락·피부 각질·침방울은 클린룸의 가장 큰 오염원이에요. 위에서부터 아래로, 정해진 순서대로 입어야 앞에서 입은 옷을 다시 더럽히지 않아요. 순서를 누르거나 아바타의 옷을 눌러 보세요.'},
 {step:'에어샤워실로',label:'복도',title:'에어샤워실로 이동',text:'바닥의 화살표를 따라 에어샤워실로 가요. 복도 창으로 클린룸 안을 미리 볼 수 있어요.'},
 {step:'에어샤워',label:'에어샤워',title:'에어샤워로 먼지 털기',text:'양쪽 벽 노즐에서 빠른 바람이 나와 방진복 표면의 먼지를 날려 보내요. 분사가 끝날 때까지 입구문과 출구문은 동시에 열리지 않아요(인터록).'},
 {step:'클린룸',label:'클린룸',title:'클린룸 둘러보기',text:'천장의 FFU가 걸러 낸 공기를 위에서 아래로 곧게 내려보내(수직 층류) 입자를 바닥으로 밀어내요. 아래 버튼으로 보이는 것을 바꿔 보세요.'},
 {step:'반도체 팹',label:'팹',title:'반도체 팹 입장',text:'증착·식각·세정·이온 주입·CMP·계측 장비가 줄지어 있고, 천장의 OHT가 웨이퍼 상자(FOUP)를 날라요. 장비를 눌러 설명을 보세요.'},
];
const LAYER_LABEL:Record<keyof TourLayers,string>={equipment:'장비 보기',airflow:'공기 흐름',cleanliness:'청정도',ffu:'FFU'};
const FAB_TOOLS:[string,string][]=[['Tool_L1','증착 장비 (CVD)'],['Tool_L2','식각 장비 (Etch)'],['Tool_L3','세정 장비 (Wet Clean)'],['Tool_L4','이온 주입 장비'],['Tool_R1','증착 장비 (PVD)'],['Tool_R2','식각 장비 (Dry Etch)'],['Tool_R3','CMP 장비'],['Tool_R4','계측·검사 장비'],['F_OHT_Vehicle','OHT'],['Tool_L1_FOUP1','FOUP']];
const GOWN_ITEMS=['헤어캡','마스크','방진복','후드','장갑','부츠'];
export function Welcome({visitor,onVisitor,onContinue,startAt='welcome',menu}:{visitor:Visitor;onVisitor:(v:Visitor)=>void;onContinue:()=>void;startAt?:'welcome'|'tour';menu?:import('react').ReactNode}){
 const [screen,setScreen]=useState<'welcome'|'choice'|'tour'>(startAt),[playing,setPlaying]=useState(()=>!reduced()),[motion,setMotion]=useState(()=>!reduced()),[reset,setReset]=useState(0),[point,setPoint]=useState(0),[seen,setSeen]=useState<number[]>([]);
 /* 3D 체험 상태 */
 const tourApi=useRef<TourApi|null>(null),[part,setPart]=useState<TourPart|null>(null),[worn,setWorn]=useState(0),[gownPlaying,setGownPlaying]=useState(false),[gownHint,setGownHint]=useState(''),[airT,setAirT]=useState<number|null>(null),[airDone,setAirDone]=useState(false),[layers,setLayers]=useState<TourLayers>({equipment:true,airflow:true,cleanliness:true,ffu:true}),[,setGownSteps]=useState<GownStep[]>([]);
 const [studyNote,setStudyNote]=useState(''),[leavePending,setLeavePending]=useState(false),[nicknameError,setNicknameError]=useState(false);
 const nicknameInput=useRef<HTMLInputElement>(null);
 /* 클린룸 학습 패널: 접고 펴기 + 왼쪽 가장자리로 너비 조절(320~520px, 기억) */
 const[tourOpen,setTourOpen]=useState(true),[tourW,setTourW]=useState(()=>{try{const n=Number(localStorage.getItem('semilab.tour.w'));return n>=320&&n<=520?n:368}catch{return 368}});
 const tourDrag=useRef<{x:number;w:number}|null>(null);
 const fitTour=(w:number)=>Math.round(Math.max(320,Math.min(520,(typeof window!=='undefined'?window.innerWidth/uiZoom():1440)-120,w))/4)*4;
 const[vw,setVw]=useState(()=>typeof window!=='undefined'?window.innerWidth:1440);
 useEffect(()=>{const on=()=>setVw(window.innerWidth);window.addEventListener('resize',on);return()=>window.removeEventListener('resize',on)},[]);
 /* 3D 화면에서 패널을 뺀 영역의 가운데 (UI 줌을 반영한 CSS px). 좁으면 단계 이름은 현재 것만 */
 const sceneMid=()=>{const full=vw/uiZoom();return vw>900?(full-(tourOpen?fitTour(tourW)+12:0))/2:full/2};
 const stepsCompact=vw>900&&sceneMid()*2<900;
 const saveTour=(w:number)=>{setTourW(w);try{localStorage.setItem('semilab.tour.w',String(w))}catch{}};
 const noteInput=useRef<HTMLTextAreaElement>(null),noteSection=useRef<HTMLElement>(null);
 const[noteCopied,setNoteCopied]=useState(false),[keysOpen,setKeysOpen]=useState(false);
 const copyNote=async()=>{try{await navigator.clipboard.writeText(studyNote);setNoteCopied(true);setTimeout(()=>setNoteCopied(false),1600)}catch{noteInput.current?.select()}};
 const growNote=(el:HTMLTextAreaElement|null)=>{if(!el)return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight+2,320)+'px'};
 const showNotes=()=>{noteSection.current?.scrollIntoView({block:'nearest',behavior:'smooth'});noteInput.current?.focus({preventScroll:true})};
 const leaveTrigger=useRef<HTMLElement|null>(null);
 const requestContinue=()=>{if(studyNote.length){leaveTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setLeavePending(true)}else onContinue()};
 const cancelLeave=()=>{setLeavePending(false);leaveTrigger.current?.focus()};
 const leaveWarning=useRef<HTMLElement>(null);
 useEffect(()=>{if(leavePending){leaveWarning.current?.focus({preventScroll:true});leaveWarning.current?.scrollIntoView?.({block:'start'})}},[leavePending]);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true})},[screen]);
 useEffect(()=>{if(typeof window.matchMedia!=='function')return;const media=window.matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>{setMotion(!media.matches);if(media.matches)setPlaying(false)};media.addEventListener?.('change',changed);return()=>media.removeEventListener?.('change',changed)},[]);
 const tour=()=>{setPoint(0);setSeen([0]);setReset(r=>r+1);setWorn(0);setPart(null);setAirDone(false);setScreen('tour')};
 /* 착용 순서: 다음 차례만 입을 수 있어요(이미 입은 건 다시 보기) */
 const wear=(order:number)=>{if(order>worn+1){setGownHint(`먼저 ${GOWN_ITEMS[worn]}을(를) 착용해 주세요. 머리부터 발끝까지 순서대로 입어야 해요.`);return}setGownHint('');tourApi.current?.playGown(order);if(order>worn)setWorn(order)};
 const onTourPart=(p:TourPart|null)=>{setPart(p);if(p?.gownOrder)wear(p.gownOrder)};
 const onAir=(t:number|null)=>{setAirT(t);if(t!=null&&t>=11.4)setAirDone(true)};
 /* 에어샤워에 도착하면 잠깐 뒤 자동으로 시작 */
 useEffect(()=>{if(screen!=='tour'||point!==2||airDone)return;const id=setTimeout(()=>tourApi.current?.startAirShower(),1600);return()=>clearTimeout(id)},[screen,point,airDone]);
 useEffect(()=>{tourApi.current?.setPaused(!playing)},[playing]);
 const select=(i:number)=>{setPoint(i);setPart(null);setGownHint('');setSeen(v=>v.includes(i)?v:[...v,i])};
 const topHeader=<header className="entry-top"><span className="entry-brand"><span className="entry-mvp" title="최소 기능 제품 버전">MVP</span><span className="entry-wordmark">THE FIRST FAB <i>방구석 반도체</i></span></span><div><span className="entry-prototype">시제품 · 계정 인증 없음</span><button onClick={()=>setPlaying(p=>!p)} aria-pressed={!playing}>{playing?'배경 일시정지':'배경 재생'}</button>{menu}</div></header>;
 return <main className={'entry-page entry-'+screen}>
  {screen==='tour'?<CleanroomTour key={reset} step={point} layers={layers} selected={part?.key??null} api={tourApi} motion={motion} onPart={onTourPart} onReady={setGownSteps} onGown={g=>setGownPlaying(g.playing)} onAir={onAir}/>:<CleanroomEnvironment tour={false} playing={playing} motion={motion} reset={reset}/>}
  <div className="entry-vignette"/>
  {screen==='tour'?null:topHeader}
  {leavePending&&<section ref={leaveWarning} tabIndex={-1} className="tour-leave-note" role="status"><strong>학습 메모를 복사해 두셨나요?</strong><p>실습 선택으로 이동하면 이 화면의 메모가 사라져요. 시작 방법 선택으로 돌아가거나 학습 지점을 바꿀 때는 유지됩니다.</p><div><button onClick={cancelLeave}>여기서 계속하기</button><button onClick={onContinue}>메모를 남기지 않고 실습 선택</button></div></section>}
  {screen==='welcome'?<section className="welcome-card"><div className="guide-portrait"><img src="/entry-guide.png" alt="흰 후드와 마스크를 착용한 가상의 연구원 캐릭터"/></div><div className="welcome-copy"><h1 ref={heading} tabIndex={-1}>방구석 반도체</h1><p className="entry-english">The First Fab</p><p className="entry-intro">처음 만나는 반도체의 세계.<br/>둘러보고, 만져보고, 나만의 발견을 시작하세요.</p><form noValidate onSubmit={e=>{e.preventDefault();if(!visitor.nickname.trim()){setNicknameError(true);nicknameInput.current?.focus();return}setScreen('choice')}}><label>소속 <small>선택</small><input autoComplete="off" maxLength={60} placeholder="입력하지 않아도 시작할 수 있어요" value={visitor.organization} onChange={e=>onVisitor({...visitor,organization:e.target.value})}/></label><label>닉네임 <small className="entry-required">필수</small><input ref={nicknameInput} autoComplete="off" maxLength={30} required aria-required="true" aria-invalid={nicknameError} aria-describedby={nicknameError?'nickname-error':undefined} placeholder="어떻게 불러드릴까요?" value={visitor.nickname} onChange={e=>{onVisitor({...visitor,nickname:e.target.value});if(e.target.value.trim())setNicknameError(false)}}/></label>{nicknameError&&<p id="nickname-error" className="entry-field-error" role="alert">닉네임을 입력해야 시작할 수 있어요.</p>}<button className="entry-start" type="submit">시작하기</button></form></div></section>:
  screen==='choice'?<section className="entry-choice-card"><h1 ref={heading} tabIndex={-1}>{visitor.nickname.trim()?`${visitor.nickname.trim()}님, `:''}어디서 시작할까요?</h1><p>클린룸을 가볍게 둘러보거나,<br/>관심 있는 실습으로 바로 이동할 수 있어요.</p><div className="entry-options"><button onClick={tour}><strong>클린룸 학습하기</strong><small>1인칭 공간 탐색 · 세 가지 기초 개념</small><b>둘러보기</b></button><button onClick={requestContinue}><strong>바로 실습 선택</strong><small>웨이퍼 · 산화 · FFU · 식각 · 회로</small><b>실습으로</b></button></div><button className="entry-back" onClick={()=>setScreen('welcome')}>처음 화면으로</button></section>:
  <>{menu}<header className="tour-head"><button type="button" className="tour-back" data-tip="시작 방법 선택" data-tip-pos="bottom" onClick={()=>setScreen('choice')}><Icon name="chevron-left"/><span className="sr-only">시작 방법 선택</span></button><span className="tour-title">클린룸 공부하기</span></header>
   <nav className="tour-steps" aria-label="클린룸 학습 지점" data-compact={stepsCompact||undefined} style={vw>900?{left:sceneMid()}:undefined}>{points.map((p,i)=><button key={p.step} type="button" aria-current={point===i?'step':undefined} data-seen={seen.includes(i)||undefined} onClick={()=>select(i)}><span className="tour-step-num">{seen.includes(i)&&point!==i?<Icon name="check2"/>:i+1}</span><span className="tour-step-label">{p.step}</span></button>)}</nav>
   {!tourOpen&&<button type="button" className="tour-chip" data-menu={menu?true:undefined} aria-expanded="false" aria-controls="tour-panel" data-tip="패널 펼치기" data-tip-pos="bottom" onClick={()=>setTourOpen(true)}><Icon name="layout-sidebar-reverse"/><span>클린룸 학습</span></button>}
   <aside id="tour-panel" className="tour-panel" hidden={!tourOpen} data-menu={menu?true:undefined} aria-label="클린룸 학습" style={{width:fitTour(tourW)}}>
    <div className="tour-resizer" role="separator" aria-orientation="vertical" aria-label="패널 너비" aria-valuemin={320} aria-valuemax={520} aria-valuenow={fitTour(tourW)} tabIndex={0} title="끌어서 너비 조절 · 두 번 누르면 기본 너비"
     onPointerDown={e=>{if(e.button!==0)return;tourDrag.current={x:e.clientX,w:fitTour(tourW)};e.currentTarget.setPointerCapture?.(e.pointerId);e.currentTarget.dataset.dragging='true'}}
     onPointerMove={e=>{const d=tourDrag.current;if(d)setTourW(fitTour(d.w+(d.x-e.clientX)/uiZoom()))}}
     onPointerUp={e=>{if(tourDrag.current){tourDrag.current=null;delete e.currentTarget.dataset.dragging;saveTour(fitTour(tourW))}}}
     onDoubleClick={()=>saveTour(368)}
     onKeyDown={e=>{const st=e.shiftKey?32:16;if(e.key==='ArrowLeft'){e.preventDefault();saveTour(fitTour(tourW+st))}else if(e.key==='ArrowRight'){e.preventDefault();saveTour(fitTour(tourW-st))}}}/>
    <div className="tour-panel-head"><span>클린룸 학습</span><button type="button" className="tour-collapse" aria-label="패널 접기" aria-expanded="true" aria-controls="tour-panel" data-tip="패널 접기" data-tip-pos="left" onClick={()=>setTourOpen(false)}><Icon name="layout-sidebar-reverse"/></button></div>
    <div className="tour-panel-scroll">
    <span className="tour-count">STEP {String(point+1).padStart(2,'0')} · {points[point].label}</span>
    <h1 ref={heading} tabIndex={-1}>{points[point].title}</h1>
    <p className="tour-text">{points[point].text}</p>
    {point===0&&<div className="cr-block"><h2>착용 순서</h2>
     <ol className="cr-gown">{GOWN_ITEMS.map((g,i)=><li key={g}><button type="button" data-state={i<worn?'done':i===worn?'next':'locked'} aria-current={i===worn?'step':undefined} onClick={()=>wear(i+1)}><span className="cr-gown-num">{i<worn?<Icon name="check2"/>:i+1}</span>{g}</button></li>)}</ol>
     {gownHint&&<p className="cr-hint" role="alert">{gownHint}</p>}
     <div className="cr-row"><button type="button" className="tour-secondary" onClick={()=>{tourApi.current?.playGown('all');setWorn(6);setGownHint('')}}><Icon name="play" className="lead"/>처음부터 끝까지 보기</button>{gownPlaying&&<span className="cr-live">착용 중…</span>}{worn>=6&&!gownPlaying&&<span className="cr-ok"><Icon name="check2" className="lead"/>착용 완료</span>}</div></div>}
    {point===2&&<div className="cr-block"><h2>에어샤워</h2>
     <div className="cr-air" data-phase={airT==null?(airDone?'done':'idle'):airT<3.2?'door':airT<11.2?'blow':'done'}>
      <div className="cr-air-bar"><i style={{width:`${airT==null?(airDone?100:0):Math.min(100,Math.max(0,(airT-3.2)/8*100))}%`}}/></div>
      <p>{airT==null?(airDone?'완료 · 출구문이 열렸어요':'곧 시작해요'):airT<3.2?'입구문이 닫히고 있어요':airT<11.2?`먼지 제거 중 · 00:0${Math.max(0,Math.ceil(11.2-airT))}`:'완료 · 출구문이 열렸어요'}</p></div>
     <button type="button" className="tour-secondary" onClick={()=>{setAirDone(false);tourApi.current?.startAirShower()}}><Icon name="arrow-repeat" className="lead"/>다시 하기</button></div>}
    {point===3&&<div className="cr-block"><h2>보이는 것</h2><div className="cr-chips" role="group" aria-label="클린룸 보기">{(Object.keys(LAYER_LABEL) as (keyof TourLayers)[]).map(k=><button key={k} type="button" aria-pressed={layers[k]} onClick={()=>setLayers(l=>({...l,[k]:!l[k]}))}>{LAYER_LABEL[k]}</button>)}</div></div>}
    {point===4&&<div className="cr-block"><h2>팹 장비</h2><ul className="cr-tools">{FAB_TOOLS.map(([k,l])=><li key={k}><button type="button" aria-pressed={part?.key===k} onClick={()=>{if(part?.key===k){setPart(null);return}setPart(tourApi.current?.lookAt(k)??{key:k,label:l,desc:''})}}>{l}</button></li>)}</ul></div>}
    {part&&<article className="cr-part" aria-live="polite"><div className="cr-part-head"><h2>{part.label}</h2><button type="button" className="glb-icon" aria-label="설명 닫기" onClick={()=>setPart(null)}><Icon name="x-lg"/></button></div>{part.desc?<p>{part.desc}</p>:<p className="cr-muted">화면에서 이 장비를 눌러 자세한 설명을 볼 수 있어요.</p>}</article>}
    
    <div className="tour-actions">{point<points.length-1?<button type="button" className="tour-primary" onClick={()=>select(point+1)}>다음 단계</button>:<button type="button" className="tour-primary" onClick={requestContinue}>실습 선택하기</button>}{point<points.length-1&&<button type="button" className="tour-secondary" onClick={requestContinue}>실습 선택하기</button>}</div>
    <div className="tour-inline-study shell-page"><ConceptPanel topics={cleanroomConcepts} currentId={point<=2?'cleanroom-contamination':'cleanroom-airflow'} contextLabel="클린룸 둘러보기 개념"/>
    <section ref={noteSection} className="tour-memo" aria-labelledby="tour-memo-title"><div className="tour-memo-head"><h2 id="tour-memo-title">내 학습 메모</h2><button type="button" className="glb-icon" aria-label={noteCopied?'복사했어요':'메모 복사'} data-tip={noteCopied?'복사했어요':'메모 복사'} data-tip-pos="left" disabled={!studyNote} onClick={copyNote}><Icon name={noteCopied?'check2':'copy'}/></button></div><textarea ref={el=>{(noteInput as {current:HTMLTextAreaElement|null}).current=el;growNote(el)}} id="tour-study-note" aria-labelledby="tour-memo-title" aria-describedby="tour-note-help" value={studyNote} onChange={e=>{setStudyNote(e.target.value);growNote(e.currentTarget)}} maxLength={4000} rows={3} placeholder="둘러보며 알게 된 점을 적어 보세요"/><div className="tour-memo-foot"><p id="tour-note-help"><Icon name="info-circle"/>실습 선택으로 나가면 사라져요.</p><span>{studyNote.length.toLocaleString()}/4,000</span></div></section></div>
   </div></aside>
   <div className="tour-dock" role="toolbar" aria-label="장면 도구" style={vw>900?{left:sceneMid()}:undefined}><button type="button" aria-pressed={!playing} aria-label={playing?'배경 일시정지':'배경 재생'} data-tip={playing?'배경 일시정지':'배경 재생'} data-tip-pos="top" onClick={()=>setPlaying(p=>!p)}><Icon name={playing?'pause':'play'} size={20}/></button><button type="button" aria-label="입장 장면 다시 보기" data-tip="입장 장면 다시 보기" data-tip-pos="top" onClick={()=>{setPoint(0);setSeen([0]);setWorn(0);setPart(null);setAirDone(false);setReset(r=>r+1)}}><Icon name="arrow-counterclockwise" size={20}/></button><button type="button" aria-label="키보드로 걷기" aria-expanded={keysOpen} aria-controls="tour-keys" data-tip={keysOpen?undefined:'키보드로 걷기'} data-tip-pos="top" onClick={()=>setKeysOpen(v=>!v)}><Icon name="keyboard" size={20}/></button>{keysOpen&&<dl id="tour-keys" className="tour-keys"><div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>걷기</dd></div><div><dt><kbd>←</kbd><kbd>→</kbd></dt><dd>돌아보기</dd></div><div><dt><kbd>Shift</kbd></dt><dd>달리기</dd></div><div><dt><kbd>Space</kbd></dt><dd>점프</dd></div></dl>}</div>
  </>}
  {!motion&&<footer className="entry-footer"><span>동작 줄이기 설정 적용 · 카메라 이동 없이 입장</span></footer>}
 </main>;
}
