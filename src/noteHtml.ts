/* 메모 본문은 HTML 일부만 써요: 굵게(b) · 밑줄(u) · 형광펜(mark) · 줄바꿈 · 이미지(data:image만).
   예전 메모(그냥 글)는 그대로 읽히고, 목록 미리보기 · 검색은 글자만 뽑아서 써요. */
/* 펜 그림은 메모 HTML 맨 끝 주석에 좌표로 저장해요: <!--ink:[{"c":"#1f2328","w":3,"p":[x,y,x,y…]}]--> */
export type InkStroke={c:string;w:number;p:number[]};
export const HL_COLORS=['yellow','green','blue','pink','orange'] as const;
export type HlColor=typeof HL_COLORS[number];
const INK_RE=/<!--ink:([\s\S]*?)-->\s*$/;
export function splitInk(v:string):{html:string;ink:InkStroke[]}{const m=v.match(INK_RE);let ink:InkStroke[]=[];
 if(m){try{const a=JSON.parse(m[1]);if(Array.isArray(a))ink=a.filter(s=>s&&typeof s.c==='string'&&/^#[0-9a-f]{3,8}$/i.test(s.c)&&Array.isArray(s.p)&&s.p.every((n:unknown)=>typeof n==='number'&&n>=0)).map(s=>({c:s.c,w:Math.min(12,Math.max(1,+s.w||3)),p:s.p}))}catch{/* 깨진 그림 데이터는 버려요 */}}
 return {html:m?v.replace(INK_RE,''):v,ink}}
export const joinInk=(html:string,ink:InkStroke[])=>ink.length?html+'<!--ink:'+JSON.stringify(ink)+'-->':html;
export const isRich=(s:string)=>/<(b|u|mark|br|div|p|img|span|strong|em|i)\b/i.test(s);
const esc=(t:string)=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const textToHtml=(t:string)=>esc(t).replace(/\n/g,'<br>');
export function noteToText(s:string):string{
 if(!s)return '';s=s.replace(/<!--[\s\S]*?-->/g,'');if(!isRich(s))return s;
 const t=s.replace(/<img[^>]*>/gi,' [이미지] ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(div|p)>/gi,'\n').replace(/<[^>]+>/g,'');
 return t.replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\n{3,}/g,'\n\n');
}
const KEEP=new Set(['B','STRONG','U','MARK','BR','DIV','P','IMG','SPAN','I','EM']);
/** 붙여넣기 · 저장 전에 허용한 태그와 속성만 남겨요 */
export function sanitizeNote(html:string):string{
 if(typeof document==='undefined')return html;
 const box=document.createElement('div');box.innerHTML=html;
 const walk=(n:Node)=>{for(const c of [...n.childNodes]){if(c.nodeType===3)continue;if(c.nodeType!==1){c.remove();continue}const el=c as HTMLElement;
  if(!KEEP.has(el.tagName)){walk(el);el.replaceWith(...el.childNodes);continue}
  if(el.tagName==='IMG'){const src=el.getAttribute('src')||'';const kind=el.getAttribute('data-kind');for(const a of [...el.attributes])el.removeAttribute(a.name);if(!/^data:image\/(png|jpeg|webp);base64,/.test(src)){el.remove();continue}el.setAttribute('src',src);el.setAttribute('alt',kind==='sketch'?'손글씨 그림':'3D 화면 캡처');if(kind)el.setAttribute('data-kind',kind);continue}
  /* 형광펜은 span 배경색으로 들어오기도 해서 mark로 바꿔요 */
  if(el.tagName==='MARK'){const c=el.getAttribute('data-c');for(const a of [...el.attributes])el.removeAttribute(a.name);if(c&&(HL_COLORS as readonly string[]).includes(c)&&c!=='yellow')el.setAttribute('data-c',c);walk(el);continue}
  if(el.tagName==='SPAN'&&/background/i.test(el.getAttribute('style')||'')){const m=document.createElement('mark');m.append(...el.childNodes);el.replaceWith(m);walk(m);continue}
  if(el.tagName==='SPAN'&&/font-weight:\s*(bold|[6-9]00)/i.test(el.getAttribute('style')||'')){const m=document.createElement('b');m.append(...el.childNodes);el.replaceWith(m);walk(m);continue}
  for(const a of [...el.attributes])el.removeAttribute(a.name);walk(el)}};
 walk(box);
 const out=box.innerHTML;
 return noteToText(out).trim()||/<img/i.test(out)?out:'';
}
