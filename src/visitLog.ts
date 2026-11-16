/* 방문 기록(소속 · 닉네임)을 Supabase에 남기고, 관리자 화면에서 읽어 와요.
   - URL과 anon 키는 공개돼도 되는 값이에요(브라우저용). 읽기는 막혀 있고, 관리자 비밀번호를 아는 사람만
     admin_visits 함수로 기록을 볼 수 있어요. 표·함수 만드는 SQL: docs/supabase-visits.sql
   - 아래 두 값이 비어 있으면 아무것도 보내지 않아요. */
export const SUPABASE_URL='https://zbqspwikxwxtiptjreet.supabase.co';
export const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicXNwd2lreHd4dGlwdGpyZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDg3NTcsImV4cCI6MjExMDM4NDc1N30.NeE5kXmJYna7bs0eaziNKP7O-Z11PPsL4f4IYPRi-Qw';
export const visitLogReady=()=>!!(SUPABASE_URL&&SUPABASE_ANON_KEY);
export type Visit={id:number;created_at:string;organization:string|null;nickname:string;user_agent:string|null};
const headers=()=>({apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'});

export function logVisit(v:{organization:string;nickname:string}){
 if(!visitLogReady())return;
 const body={organization:v.organization.trim().slice(0,60)||null,nickname:v.nickname.trim().slice(0,30),user_agent:navigator.userAgent.slice(0,300)};
 if(!body.nickname)return;
 fetch(`${SUPABASE_URL}/rest/v1/visits`,{method:'POST',headers:{...headers(),Prefer:'return=minimal'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
}

export async function fetchVisits(pass:string):Promise<Visit[]>{
 if(!visitLogReady())throw new Error('not-configured');
 const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_visits`,{method:'POST',headers:headers(),body:JSON.stringify({pass})});
 if(!r.ok)throw new Error(r.status===400||r.status===401||r.status===403?'denied':'network');
 return r.json();
}
