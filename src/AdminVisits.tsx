import {useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './Icon';
import {deleteVisits,fetchVisits,visitLogReady,type Visit} from './visitLog';
import './admin.css';

/* 관리자: 방문 기록(소속 · 닉네임) 보기. 비밀번호는 서버(Supabase 함수)에서 확인해요. */
const fmt=(iso:string)=>{const d=new Date(iso);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const device=(ua:string|null)=>!ua?'':/iPhone|Android.+Mobile/.test(ua)?'휴대폰':/iPad|Android/.test(ua)?'태블릿':'PC';
const csvCell=(s:string)=>/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;

export function AdminVisits({onClose}:{onClose:()=>void}){
 const[pass,setPass]=useState(''),[rows,setRows]=useState<Visit[]|null>(null),[state,setState]=useState<'idle'|'loading'|'denied'|'error'>('idle'),[q,setQ]=useState(''),[sel,setSel]=useState<Set<number>>(new Set()),[confirming,setConfirming]=useState(false),[msg,setMsg]=useState('');
 const passInput=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{passInput.current?.focus();const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k)},[onClose]);
 const load=async()=>{setState('loading');try{const r=await fetchVisits(pass);setRows(r);setSel(s=>new Set([...s].filter(id=>r.some(v=>v.id===id))));setState('idle')}catch(e){setState((e as Error).message==='denied'?'denied':'error')}};
 const shown=useMemo(()=>{const t=q.trim().toLowerCase();return(rows??[]).filter(r=>!t||(r.nickname+' '+(r.organization??'')).toLowerCase().includes(t))},[rows,q]);
 const today=useMemo(()=>{const d=new Date().toDateString();return(rows??[]).filter(r=>new Date(r.created_at).toDateString()===d).length},[rows]);
 const orgs=useMemo(()=>new Set((rows??[]).map(r=>r.organization?.trim()).filter(Boolean)).size,[rows]);
 const allShown=shown.length>0&&shown.every(r=>sel.has(r.id));
 const toggle=(id:number)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
 const toggleAll=()=>setSel(s=>{const n=new Set(s);if(allShown)shown.forEach(r=>n.delete(r.id));else shown.forEach(r=>n.add(r.id));return n});
 const remove=async()=>{const ids=[...sel];setConfirming(false);setState('loading');try{const c=await deleteVisits(pass,ids);setMsg(`${c}개 기록을 지웠어요.`);setSel(new Set());await load()}catch{setState('error');setMsg('지우지 못했어요. 잠시 뒤 다시 시도해 주세요.')}};
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
    <div className="admin-tools"><input type="search" placeholder="닉네임 · 소속 검색" aria-label="방문 기록 검색" value={q} onChange={e=>setQ(e.target.value)}/><button type="button" className="admin-icon" aria-label="새로고침" data-tip="새로고침" data-tip-pos="bottom" onClick={load} disabled={state==='loading'}><Icon name="arrow-clockwise"/></button><button type="button" className="admin-text" onClick={exportCsv} disabled={!shown.length}>CSV 내려받기</button>{sel.size>0&&<button type="button" className="admin-text admin-danger" onClick={()=>{setConfirming(true);setMsg('')}}>선택 삭제 {sel.size}</button>}</div>
    {confirming&&<div className="admin-confirm" role="alertdialog" aria-labelledby="admin-confirm-text"><p id="admin-confirm-text">고른 기록 {sel.size}개를 지울까요? 지우면 되돌릴 수 없고, 그 닉네임은 다른 사람이 다시 쓸 수 있어요.</p><div><button type="button" className="admin-text" onClick={()=>setConfirming(false)}>취소</button><button type="button" className="admin-del" onClick={remove}>삭제</button></div></div>}
    {msg&&!confirming&&<p className="admin-note" role="status">{msg}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-check"><input type="checkbox" aria-label="보이는 기록 모두 고르기" checked={allShown} onChange={toggleAll} disabled={!shown.length}/></th><th>시간</th><th>소속</th><th>닉네임</th><th>기기</th></tr></thead>
     <tbody>{shown.length?shown.map(r=><tr key={r.id} aria-selected={sel.has(r.id)} onClick={e=>{if((e.target as HTMLElement).tagName!=='INPUT')toggle(r.id)}}><td className="admin-check"><input type="checkbox" aria-label={`${r.nickname} 기록 고르기`} checked={sel.has(r.id)} onChange={()=>toggle(r.id)}/></td><td>{fmt(r.created_at)}</td><td>{r.organization||<span className="admin-muted">-</span>}</td><td>{r.nickname}</td><td>{device(r.user_agent)}</td></tr>):<tr><td colSpan={5} className="admin-muted">{rows.length?'검색 결과가 없어요.':'아직 방문 기록이 없어요.'}</td></tr>}</tbody></table></div>
   </>}
  </div>
 </div>;
}
