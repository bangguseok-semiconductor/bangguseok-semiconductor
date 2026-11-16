/* 방문 기록(소속 · 닉네임)을 Supabase에 남기고, 관리자 화면에서 읽어 와요.
   - URL과 anon 키는 공개돼도 되는 값이에요(브라우저용). 읽기는 막혀 있고, 관리자 비밀번호를 아는 사람만
     admin_visits 함수로 기록을 볼 수 있어요. 표·함수 만드는 SQL: docs/supabase-visits.sql
   - 아래 두 값이 비어 있으면 아무것도 보내지 않아요. */
export const SUPABASE_URL='https://zbqspwikxwxtiptjreet.supabase.co';
export const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicXNwd2lreHd4dGlwdGpyZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDg3NTcsImV4cCI6MjExMDM4NDc1N30.NeE5kXmJYna7bs0eaziNKP7O-Z11PPsL4f4IYPRi-Qw';
export const visitLogReady=()=>!!(SUPABASE_URL&&SUPABASE_ANON_KEY);
export type Visit={id:number;created_at:string;organization:string|null;nickname:string;user_agent:string|null};
const headers=()=>({apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'});

/* 브라우저마다 한 번 만드는 임의 ID — 같은 브라우저는 자기 닉네임으로 다시 들어올 수 있어요 */
function clientId(){
 const make=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
 try{let id=localStorage.getItem('semilab.client');if(!id||!/^[0-9a-f-]{36}$/i.test(id)){id=make();localStorage.setItem('semilab.client',id)}return id}catch{return make()}
}

/* 시작하기: 닉네임이 다른 사람 것이면 'taken'. 연결이 안 되면 막지 않고 'offline'으로 넘어가요. */
export async function claimVisit(v:{organization:string;nickname:string}):Promise<'ok'|'taken'|'offline'>{
 if(!visitLogReady())return 'ok';
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),5000);
 try{
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_visit`,{method:'POST',headers:headers(),signal:ctl.signal,body:JSON.stringify({p_org:v.organization.trim().slice(0,60),p_nick:v.nickname.trim().slice(0,30),p_ua:navigator.userAgent.slice(0,300),p_client:clientId()})});
  if(!r.ok)return 'offline';
  const res=await r.json();return res==='taken'?'taken':'ok';
 }catch{return 'offline'}finally{clearTimeout(t)}
}

export async function deleteVisits(pass:string,ids:number[]):Promise<number>{
 const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_delete_visits`,{method:'POST',headers:headers(),body:JSON.stringify({pass,ids})});
 if(!r.ok)throw new Error(r.status===400||r.status===401||r.status===403?'denied':'network');
 return r.json();
}

export async function fetchVisits(pass:string):Promise<Visit[]>{
 if(!visitLogReady())throw new Error('not-configured');
 const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_visits`,{method:'POST',headers:headers(),body:JSON.stringify({pass})});
 if(!r.ok)throw new Error(r.status===400||r.status===401||r.status===403?'denied':'network');
 return r.json();
}
