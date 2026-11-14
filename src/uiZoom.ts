/* 화면 전체 배율(tokens.css의 --z, 넓은 화면에서 0.9).
   getBoundingClientRect · clientX 같은 화면 좌표를 CSS px로 바꿀 때 나눠 줘요. */
export const uiZoom=()=>{if(typeof document==='undefined')return 1;const z=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z'));return z>0?z:1};
