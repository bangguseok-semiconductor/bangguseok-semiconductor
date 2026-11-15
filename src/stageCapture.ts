/* 지금 3D 화면을 이미지로 찍는 함수를 한 곳에 등록해 둬요.
   3D 학습 화면(GlbStage)이 열려 있을 때만 등록되고, 메모장의 '3D 캡처' 버튼이 이걸 불러요. */
type Capture=()=>string|null;
let fn:Capture|null=null;const subs=new Set<()=>void>();
export const setStageCapture=(f:Capture|null)=>{fn=f;subs.forEach(s=>s())};
export const captureStage=():string|null=>{try{return fn?.()??null}catch{return null}};
export const hasStageCapture=()=>!!fn;
export const onStageCapture=(s:()=>void)=>{subs.add(s);return()=>{subs.delete(s)}};
