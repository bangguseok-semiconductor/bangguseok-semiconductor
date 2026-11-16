import {useEffect,useRef,useState} from 'react';
import {Icon} from './Icon';

/* 학습 화면 왼쪽 위 '다른 학습으로 이동'
   드롭다운으로 같은 분야의 학습을 골라요. 8대 공정은 1~8공정 전체를 보여주고, 아직 없는 공정은 '준비 중'으로 흐리게 둬요. */
export type NavLesson='wafer'|'oxidation'|'photo'|'rie'|'gown'|'ffu'|'circuit'|'mosfet'|'gowning';
type Item={id:NavLesson|null;name:string;no?:number};
const processes:Item[]=[{no:1,id:'wafer',name:'웨이퍼 제조'},{no:2,id:'oxidation',name:'산화'},{no:3,id:null,name:'포토'},{no:4,id:'rie',name:'식각'},{no:5,id:null,name:'증착 · 이온주입'},{no:6,id:null,name:'금속 배선'},{no:7,id:null,name:'EDS'},{no:8,id:null,name:'패키징'}];
const equipment:Item[]=[{id:'ffu',name:'FFU'},{id:'rie',name:'RIE 식각'}];
const design:Item[]=[{id:'circuit',name:'전기 · 논리'},{id:'mosfet',name:'MOSFET'}];
export type NavArea='8대 공정'|'장비'|'설계';

export function LessonNav({current,area,onSwitch}:{current:NavLesson;area:NavArea;onSwitch?:(id:NavLesson)=>void}){
 const[open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const down=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);root.current?.querySelector<HTMLButtonElement>('.lesson-nav-trigger')?.focus()}};document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key)}},[open]);
 if(!onSwitch)return null;
 const list=area==='8대 공정'?processes:area==='장비'?equipment:design;
 const label=(p:Item)=>p.no?`제${p.no}공정 · ${p.name}`:p.name;
 /* 피그마 파일 이름 옆 ⌄ 처럼: 제목 옆 작은 화살표를 누르면 같은 분야의 학습 목록이 열려요 */
 return <div ref={root} className="lesson-nav">
  <button type="button" className="lesson-nav-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`${area} 다른 학습 보기`} data-tip={`${area} 목록`} data-tip-pos="bottom" onClick={()=>setOpen(v=>!v)}><Icon name="chevron-down"/></button>
  {open&&<ul className="lesson-nav-menu" role="listbox" aria-label={`${area} 학습`}><li className="lesson-nav-head" aria-hidden="true">{area}</li>{list.map(p=><li key={label(p)} role="option" aria-selected={p.id===current} aria-disabled={!p.id||undefined}><button type="button" disabled={!p.id} onClick={()=>{setOpen(false);if(p.id&&p.id!==current)onSwitch(p.id)}}><Icon name="check2" className="lesson-nav-check"/><span>{label(p)}</span>{!p.id&&<small>준비 중</small>}</button></li>)}</ul>}
 </div>;
}

/* 대표 관련 기업 — 접고 펴는 항목 안에 3열 기업 카드
   로고: public/logos/<logo>.svg 또는 .png 파일을 넣으면 카드에 보여요(각 회사의 공식 미디어 키트 로고를 쓰세요).
   파일이 없으면 회사 이니셜 배지를 대신 보여줘요. */
export type Company={name:string;en:string;field:string;country:string;mark:string;logo:string;domain:string};
const C=(name:string,en:string,field:string,country:string,mark:string,logo:string,domain:string):Company=>({name,en,field,country,mark,logo,domain});
export const lessonCompanies:Record<string,Company[]>={
 wafer:[C('SK실트론','SK siltron','실리콘 웨이퍼','한국','SK','sk-siltron','sksiltron.com'),C('신에츠화학','Shin-Etsu','실리콘 웨이퍼','일본','SE','shin-etsu','shinetsu.co.jp'),C('SUMCO','SUMCO','실리콘 웨이퍼','일본','SU','sumco','sumcosi.com'),C('글로벌웨이퍼스','GlobalWafers','실리콘 웨이퍼','대만','GW','globalwafers','gw-semi.com'),C('실트로닉','Siltronic','실리콘 웨이퍼','독일','SI','siltronic','siltronic.com')],
 oxidation:[C('도쿄일렉트론','TEL','산화 · 확산 퍼니스','일본','TEL','tel','tel.com'),C('고쿠사이 일렉트릭','KOKUSAI ELECTRIC','배치형 열처리 장비','일본','KE','kokusai-electric','kokusai-electric.com'),C('ASM 인터내셔널','ASM','퍼니스 · 증착 장비','네덜란드','ASM','asm','asm.com')],
 photo:[C('ASML','ASML','노광 장비','네덜란드','ASML','asml','asml.com'),C('니콘','Nikon','노광 장비','일본','NI','nikon','nikon.com'),C('캐논','Canon','노광 장비','일본','CA','canon','global.canon'),C('도쿄일렉트론','TEL','PR 도포 · 현상 트랙','일본','TEL','tel','tel.com'),C('JSR','JSR','포토레지스트','일본','JSR','jsr','jsr.co.jp'),C('도쿄오카공업','TOK','포토레지스트','일본','TOK','tok','tok.co.jp'),C('동진쎄미켐','Dongjin Semichem','포토레지스트','한국','DJ','dongjin','dongjin.com')],
 ffu:[C('캄필','Camfil','FFU · 공기 필터','스웨덴','CF','camfil','camfil.com'),C('신성이엔지','Shinsung E&G','FFU · 클린룸 설비','한국','SS','shinsung','shinsung.co.kr'),C('AAF 인터내셔널','AAF','공기 필터','미국','AAF','aaf','aafintl.com')],
 rie:[C('램리서치','Lam Research','식각 장비','미국','LAM','lam-research','lamresearch.com'),C('도쿄일렉트론','TEL','식각 장비','일본','TEL','tel','tel.com'),C('어플라이드 머티어리얼즈','Applied Materials','식각 · 증착 장비','미국','AM','applied-materials','appliedmaterials.com'),C('히타치 하이테크','Hitachi High-Tech','식각 장비','일본','HH','hitachi-high-tech','hitachi-hightech.com'),C('옥스퍼드 인스트루먼트','Oxford Instruments','연구용 플라즈마 식각','영국','OI','oxford-instruments','oxinst.com')],
 mosfet:[C('삼성전자','Samsung Electronics','메모리 · 파운드리','한국','SA','samsung','samsung.com'),C('SK하이닉스','SK hynix','메모리','한국','SKH','sk-hynix','skhynix.com'),C('TSMC','TSMC','파운드리','대만','TSMC','tsmc','tsmc.com'),C('인텔','Intel','프로세서 설계 · 제조','미국','IN','intel','intel.com'),C('시놉시스','Synopsys','반도체 설계 SW(EDA)','미국','SY','synopsys','synopsys.com'),C('케이던스','Cadence','반도체 설계 SW(EDA)','미국','CD','cadence','cadence.com')],
 circuit:[C('텍사스 인스트루먼트','Texas Instruments','논리 IC · 아날로그 칩','미국','TI','texas-instruments','ti.com'),C('르네사스','Renesas','마이크로컨트롤러','일본','RE','renesas','renesas.com'),C('인피니언','Infineon','전력 반도체 · MCU','독일','IF','infineon','infineon.com'),C('Arm','Arm','프로세서 설계','영국','ARM','arm','arm.com')],
};
/* 로고 불러오는 순서: ① public/logos/<logo>.svg · .png (직접 넣은 공식 로고)
   ② 회사 공식 사이트가 내놓은 아이콘(사이트 주소로 불러옴) ③ 둘 다 없으면 이니셜 배지 */
function CompanyLogo({c}:{c:Company}){
 const srcs=[`logos/${c.logo}.svg`,`logos/${c.logo}.png`,`https://www.google.com/s2/favicons?domain=${c.domain}&sz=128`];
 const[i,setI]=useState(0),next=()=>setI(n=>n+1);
 return <span className="company-logo" aria-hidden="true">{i<srcs.length?<img key={i} src={srcs[i]} alt="" loading="lazy" referrerPolicy="no-referrer" onError={next} onLoad={e=>{if(e.currentTarget.naturalWidth<24)next()}}/>:<span className="company-mark" data-len={c.mark.length}>{c.mark}</span>}</span>;
}
export function LessonCompanies({id}:{id:string}){
 const list=lessonCompanies[id];if(!list?.length)return null;
 return <details className="glb-about lesson-companies"><summary>대표 관련 기업</summary>
  <ul className="company-grid">{list.map(c=><li key={c.name+c.field} className="company-card" title={`${c.name} (${c.en}) · ${c.field} · ${c.country}`}><CompanyLogo c={c}/><b>{c.name}</b><small>{c.field}</small><span className="company-country">{c.country}</span></li>)}</ul>
 </details>;
}

/* 이전 · 다음 학습으로 넘어가기 (문서 아래 페이지 넘김처럼) — 같은 분야 안에서, 준비된 학습만 */
const titles:Record<NavLesson,string>={wafer:'제1공정 · 웨이퍼 제조',oxidation:'제2공정 · 산화',photo:'제3공정 · 포토',rie:'식각 장비 · RIE',gown:'클린룸 복장 탐색',ffu:'FFU 장비 탐색',circuit:'전기 · 논리 기초',mosfet:'MOSFET 설계 기초',gowning:'클린룸 착의 체험'};
export function LessonPager({current,area,onSwitch}:{current:NavLesson;area:NavArea;onSwitch?:(id:NavLesson)=>void}){
 if(!onSwitch)return null;
 const list=(area==='8대 공정'?processes:area==='장비'?equipment:design).filter(p=>p.id) as {id:NavLesson;name:string;no?:number}[];
 const i=list.findIndex(p=>p.id===current);if(i<0)return null;
 const prev=list[i-1],next=list[i+1],unit=area==='8대 공정'?'공정':area==='장비'?'장비':'학습';
 const label=(p:{id:NavLesson;no?:number})=>area==='8대 공정'&&p.no?`제${p.no}공정 · ${p.id==='rie'?'식각':titles[p.id].split('·').pop()!.trim()}`:titles[p.id];
 if(!prev&&!next)return null;
 return <nav className="lesson-pager" aria-label={`이전 · 다음 ${unit}`}>
  {prev?<button type="button" className="is-prev" onClick={()=>onSwitch(prev.id)}><small><Icon name="chevron-left"/>이전 {unit}</small><b>{label(prev)}</b></button>:<span/>}
  {next?<button type="button" className="is-next" onClick={()=>onSwitch(next.id)}><small>다음 {unit}<Icon name="chevron-right"/></small><b>{label(next)}</b></button>:<span/>}
 </nav>;
}

/* 3D 모형이 없는 학습(포토)의 '기계 설명' — 지금 화면에 보이는 항목만 골라 같은 모양의 카드로 보여줘요 */
export type SimplePart={name:string;en?:string;desc:string;specs?:[string,string][]};
export function SimpleParts({parts}:{parts:SimplePart[]}){
 const[sel,setSel]=useState<SimplePart|null>(null),[open,setOpen]=useState(false);
 const cur=sel&&parts.includes(sel)?sel:null;
 return <div className="glb-parts" role="tabpanel">
  <div className="glb-partpick">
   <button type="button" className="glb-partpick-btn" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Icon name="chevron-right" className="glb-partpick-chev"/><span>{cur?cur.name:'부품 선택'}</span></button>
   {open&&<ul className="glb-partpick-menu" role="listbox" aria-label="부품">{parts.map(pt=><li key={pt.name} role="option" aria-selected={cur===pt}><button type="button" onClick={()=>{setSel(pt);setOpen(false)}}>{pt.name}</button></li>)}</ul>}
  </div>
  {cur?<article className="glb-partcard"><h3>{cur.name}{cur.en&&<small>{cur.en}</small>}</h3>
   {cur.specs&&<dl>{cur.specs.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
   <h4>핵심 설명</h4><p>{cur.desc}</p></article>
   :null}
 </div>;
}
