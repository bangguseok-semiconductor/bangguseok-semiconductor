import {useSyncExternalStore} from 'react';
/* 메모장 · AI 탭 상태 — 오른쪽 패널(StudyHub)과 휴대폰 아래 시트의 탭 막대가 같이 써요 */
export type HubTab='notes'|'ai';
let sharedTab:HubTab='notes';const subs=new Set<()=>void>();
export const getHubTab=()=>sharedTab;
export const setHubTab=(t:HubTab)=>{if(sharedTab===t)return;sharedTab=t;subs.forEach(s=>s())};
export const useHubTab=()=>useSyncExternalStore(s=>{subs.add(s);return()=>{subs.delete(s)}},()=>sharedTab,()=>sharedTab);
