import {useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './Icon';
import {fetchVisits,visitLogReady,type Visit} from './visitLog';
import './admin.css';

/* 관리자: 방문 기록(소속 · 닉네임) 보기. 비밀번호는 서버(Supabase 함수)에서 확인해요. */
const fmt=(iso:string)=>{const d=new Date(iso);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const device=(ua:string|null)=>!ua?'':/iPhone|Android.+Mobile/.test(ua)?'휴대폰':/iPad|Android/.test(ua)?'태블릿':'PC';
const csvCell=(s:string)=>/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;

export function AdminVisits({onClose}:{onClose:()=>void}){
 const[pass,setPass]=useState(''),[rows,setRows]=useState<Visit[]|null>(null),[state,setState]=useState<'idle'|'loading'|'denied'|'error'>('idle'),[q,setQ]=useState('');
 const passInput=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{passInput.current?.focus();const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k)},[onClose]);
 const load=async()=>{setState('loading');try{setRows(await fetchVisits(pass));setState('idle')}catch(e){setState((e as Error).message==='denied'?'denied':'error')}};
 const shown=useMemo(()=>{const t=q.trim().toLowerCase();return(rows??[]).filter(r=>!t||(r.nickname+' '+(r.organization??'')).toLowerCase().includes(t))},[rows,q]);
 const today=useMemo(()=>{const d=new Date().toDateString();return(rows??[]).filter(r=>new Date(r.created_at).toDateString()===d).length},[rows]);
 const orgs=useMemo(()=>new Set((rows??[]).map(r=>r.organization?.trim()).filter(Boolean)).size,[rows]);
 const exportCsv=()=>{const lines=['시간,소속,닉네임,기기',...shown.map(r=>[fmt(r.created_at),r.organization??'',r.nickname,device(r.user_agent)].map(csvCell).join(','))];const url=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`방문기록-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return <div className="admin-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div ref={dialog} className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title">
   <header className="admin-head"><h2 id="admin-title">방문 기록</h2><button type="button" className="admin-icon" aria-label="닫기" onClick={onClose}><Icon name="x-lg"/></button></header>
   {!visitLogReady()?<p className="admin-empty">아직 방문 기록 저장소(Supabase)가 연결되지 않았어요.</p>:
   rows===null?<form className="admin-login" onSubmit={e=>{e.preventDefault();if(pass)load()}}>
     <label htmlFor="admin-pass">관리자 비밀번호</label>
     <div><input ref={passInput} id="admin-pass" type="password" autoComplete="current-password" value={pass} onChange={e=>{setPass(e.target.value);if(state!=='loading')setState('idle')}} aria-invalid={state==='denied'} aria-describedby={state!=='idle'?'admin-msg':undefined}/><button type="submit" disabled={!pass||state==='loading'}>{state==='loading'?'확인 중…':'보기'}</button></div>
     {state==='denied'&&<p id="admin-msg" className="admin-err" role="alert">비밀번호가 맞지 않아요.</p>}
     {state==='error'&&<p id="admin-msg" className="admin-err" role="alert">기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>}
    </form>:
   <>
    <div className="admin-stats"><div><b>{rows.length.toLocaleString()}</b><span>전체 방문</span></div><div><b>{today.toLocaleString()}</b><span>오늘</span></div><div><b>{orgs.toLocaleString()}</b><span>소속 수</span></div></div>
    <div className="admin-tools"><input type="search" placeholder="닉네임 · 소속 검색" aria-label="방문 기록 검색" value={q} onChange={e=>setQ(e.target.value)}/><button type="button" className="admin-icon" aria-label="새로고침" data-tip="새로고침" data-tip-pos="bottom" onClick={load} disabled={state==='loading'}><Icon name="arrow-clockwise"/></button><button type="button" className="admin-text" onClick={exportCsv} disabled={!shown.length}>CSV 내려받기</button></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>시간</th><th>소속</th><th>닉네임</th><th>기기</th></tr></thead>
     <tbody>{shown.length?shown.map(r=><tr key={r.id}><td>{fmt(r.created_at)}</td><td>{r.organization||<span className="admin-muted">-</span>}</td><td>{r.nickname}</td><td>{device(r.user_agent)}</td></tr>):<tr><td colSpan={4} className="admin-muted">{rows.length?'검색 결과가 없어요.':'아직 방문 기록이 없어요.'}</td></tr>}</tbody></table></div>
   </>}
  </div>
 </div>;
}
