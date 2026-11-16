import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {uiZoom} from './uiZoom';

/* 클린룸 공부하기 — 블렌더로 만든 체험 공간(07)과 방진복 아바타(08)
   STEP 01 갱의실(3인칭 아바타) → 02 복도 → 03 에어샤워 → 04 클린룸 → 05 팹.
   - 웨이포인트(WP_STEPxx)로 카메라가 걸어가듯 이동, 끌어서 360° 둘러보기
   - 부품 클릭 → userData.label/desc 를 onPart로 알려 줘요
   - 에어샤워 · 공기 흐름 · OHT 같은 애니메이션은 상황에 맞춰 재생 */
export const CLEANROOM_URL='models/cleanroom/07_cleanroom_experience.glb';
export const AVATAR_URL='models/cleanroom/08_gowning_avatar.glb';
export type TourPart={label:string;desc:string;zone?:string;gownOrder?:number;key:string};
export type GownStep={order:number;label:string;t0:number;t1:number};
export type TourLayers={equipment:boolean;airflow:boolean;cleanliness:boolean;ffu:boolean};
export type TourApi={
 playGown:(order:number|'all')=>void;          /* 착용 순서 n 구간만, 또는 처음부터 끝까지 */
 startAirShower:()=>void;                       /* 에어샤워 12.5초 사이클 */
 lookAt:(key:string)=>TourPart|null;                     /* 그 부품 쪽으로 시선 돌리기 */
 setPaused:(p:boolean)=>void;
};
const WAYPOINTS=['WP_STEP01_Gowning','WP_STEP02_Corridor','WP_STEP03_AirShower','WP_STEP04_Cleanroom','WP_STEP05_Fab'];
const LAYERS:(keyof TourLayers)[]=['equipment','airflow','cleanliness','ffu'];

type Props={step:number;layers:TourLayers;selected?:string|null;onPart?:(p:TourPart|null)=>void;onReady?:(steps:GownStep[])=>void;onGown?:(state:{order:number;playing:boolean})=>void;onAir?:(t:number|null)=>void;api?:{current:TourApi|null};motion?:boolean};

export function CleanroomTour(props:Props){
 const host=useRef<HTMLDivElement>(null),p=useRef(props);p.current=props;
 const[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const stepRef=useRef(props.step),applyStep=useRef<(s:number)=>void>(()=>{}),applyLayers=useRef<(l:TourLayers)=>void>(()=>{}),applySel=useRef<(k:string|null|undefined)=>void>(()=>{});
 useEffect(()=>{
  const el=host.current;if(!el)return;let disposed=false,frame=0;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true})}catch{setStatus('error');return}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  el.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9edf2');
  const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff,0xc9d1db,0.6));
  const camera=new THREE.PerspectiveCamera(68,1,0.05,200);
  const size=()=>{const w=el.clientWidth||1,h=el.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};size();
  const ro=new ResizeObserver(size);ro.observe(el);

  /* 시선: yaw(좌우) · pitch(위아래). 이동은 웨이포인트 사이를 부드럽게 */
  const look={yaw:0,pitch:0,tyaw:0,tpitch:0};
  const pos=new THREE.Vector3(0,1.6,-1),from=new THREE.Vector3(),to=new THREE.Vector3();let move:{t0:number;dur:number}|null=null;
  const wp:THREE.Vector3[]=[];const wpYaw:number[]=[];
  const mixers:THREE.AnimationMixer[]=[];let envMix:THREE.AnimationMixer|null=null,avMix:THREE.AnimationMixer|null=null;
  const clips:Record<string,THREE.AnimationAction>={};let gown:THREE.AnimationAction|null=null,gownStop=Infinity,gownOrder=0;const gownSteps:GownStep[]=[];let air:THREE.AnimationAction|null=null;
  const pickables:THREE.Object3D[]=[];const byKey=new Map<string,THREE.Object3D>();const layerNodes:Record<string,THREE.Object3D[]>={};
  let paused=false;

  const loader=new GLTFLoader();
  Promise.all([loader.loadAsync(CLEANROOM_URL),loader.loadAsync(AVATAR_URL).catch(()=>null)]).then(([room,avatar])=>{
   if(disposed)return;
   scene.add(room.scene);room.scene.updateMatrixWorld(true);
   room.scene.traverse(o=>{const u=o.userData||{};
    if(u.role==='nav'||u.role==='trigger'||u.role==='label_anchor')o.visible=u.role==='label_anchor'?o.visible:false;
    if(u.layer&&LAYERS.includes(u.layer))(layerNodes[u.layer]??=[]).push(o);
    if(u.label&&u.desc&&u.role!=='zone'&&u.role!=='waypoint'&&u.role!=='avatar_spawn'&&u.role!=='nav'&&u.role!=='trigger'){pickables.push(o);byKey.set(o.name,o)}
    const m=(o as THREE.Mesh).material as THREE.MeshStandardMaterial|undefined;if(m&&'envMapIntensity' in m)m.envMapIntensity=.9});
   for(const n of WAYPOINTS){const o=room.scene.getObjectByName(n);const v=new THREE.Vector3();if(o)o.getWorldPosition(v);else v.set(0,1.6,-1-wp.length*5);wp.push(v);wpYaw.push(THREE.MathUtils.degToRad(o?.userData?.yaw_deg??0))}
   envMix=new THREE.AnimationMixer(room.scene);mixers.push(envMix);
   for(const c of room.animations){const a=envMix.clipAction(c);if(/loop/.test(c.name)||c.name==='guide_arrows'){a.setLoop(THREE.LoopRepeat,Infinity)}else{a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}clips[c.name]=a}
   clips.oht_loop?.play();clips.guide_arrows?.play();
   air=clips.airshower_cycle??null;
   /* 아바타: AVATAR_Spawn 자리에 그대로 */
   const steps:GownStep[]=[];
   if(avatar){const spawn=room.scene.getObjectByName('AVATAR_Spawn');const a=avatar.scene;if(spawn){spawn.getWorldPosition(a.position);spawn.getWorldQuaternion(a.quaternion)}
    scene.add(a);a.updateMatrixWorld(true);
    a.traverse(o=>{const u=o.userData||{};if(u.label&&u.desc&&u.role!=='label_anchor'){pickables.push(o);if(!byKey.has(o.name))byKey.set(o.name,o)}});
    avMix=new THREE.AnimationMixer(a);mixers.push(avMix);const c=avatar.animations[0];
    if(c){gown=avMix.clipAction(c);gown.setLoop(THREE.LoopOnce,1);gown.clampWhenFinished=true;gown.play();gown.paused=true;gown.time=0;avMix.update(0);
     const ex=(c as unknown as {userData?:{steps?:{order:number;label:string;t_start:number;t_end:number}[]}}).userData?.steps??(avatar.scene.userData?.steps as {order:number;label:string;t_start:number;t_end:number}[]|undefined)??[];
     for(const s of ex){const g={order:s.order,label:s.label,t0:s.t_start,t1:s.t_end};steps.push(g);gownSteps.push(g)}}}
   pos.copy(wp[stepRef.current]??wp[0]);look.yaw=look.tyaw=wpYaw[stepRef.current]??0;
   applyStep.current(stepRef.current);applyLayers.current(p.current.layers);
   setStatus('ready');p.current.onReady?.(steps);
  }).catch(()=>{if(!disposed)setStatus('error')});

  /* 단계 바꾸기: 걸어가듯 이동 + 그 단계의 애니메이션 */
  applyStep.current=(s:number)=>{const prev=stepRef.current;stepRef.current=s;if(!wp.length)return;
   from.copy(pos);to.copy(wp[s]);const d=from.distanceTo(to);move=d>.05?{t0:performance.now(),dur:Math.min(3200,700+d*170)}:null;if(!move)pos.copy(to);
   look.tyaw=wpYaw[s];look.tpitch=s===0?-.08:0;
   if(prev===0&&s>0&&clips.door_gowning){clips.door_gowning.reset().play()}
   if(s===4&&clips.door_photo){clips.door_photo.reset().play()}
   const af=clips.airflow_loop;if(af){if(s>=3&&(p.current.layers.airflow))af.play();else af.stop()}};
  applyLayers.current=(l:TourLayers)=>{for(const k of LAYERS)for(const o of layerNodes[k]??[])o.visible=l[k];const af=clips.airflow_loop;if(af){if(stepRef.current>=3&&l.airflow)af.play();else af.stop()}};
  /* 고른 부품 강조: 원래 색을 기억했다가 주황빛을 더해요 */
  const tinted=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
  applySel.current=(k)=>{for(const [m,mat] of tinted){m.material=mat}tinted.clear();if(!k)return;const o=byKey.get(k);if(!o)return;
   o.traverse(x=>{const m=x as THREE.Mesh;if(!m.isMesh)return;tinted.set(m,m.material);const src=(Array.isArray(m.material)?m.material[0]:m.material) as THREE.MeshStandardMaterial;const c=src.clone();if('emissive' in c){c.emissive=new THREE.Color('#f2862b');c.emissiveIntensity=.35}m.material=c})};

  /* 착용 순서 재생 */
  const playGown=(order:number|'all')=>{if(!gown||!avMix)return;
   if(order==='all'){gown.time=0;gownStop=gown.getClip().duration;gownOrder=7}else{const s=gownSteps.find(x=>x.order===order);if(!s)return;gown.time=s.t0;gownStop=s.t1;gownOrder=order}
   gown.paused=false;gown.enabled=true;p.current.onGown?.({order:gownOrder,playing:true})};
  const startAirShower=()=>{if(!air)return;air.reset();air.play()};
  const partOf=(o:THREE.Object3D):TourPart=>{const u=o.userData;return{key:o.name,label:String(u.label),desc:String(u.desc),zone:u.zone,gownOrder:typeof u.gown_order==='number'?u.gown_order:undefined}};
  const lookAtKey=(k:string):TourPart|null=>{const o=byKey.get(k);if(!o)return null;const t=new THREE.Vector3();new THREE.Box3().setFromObject(o).getCenter(t);const dx=t.x-pos.x,dy=t.y-pos.y,dz=t.z-pos.z;look.tyaw=Math.atan2(-dx,-dz);look.tpitch=THREE.MathUtils.clamp(Math.atan2(dy,Math.hypot(dx,dz)),-1,1);return partOf(o)};
  if(p.current.api)p.current.api.current={playGown,startAirShower,lookAt:lookAtKey,setPaused:v=>{paused=v}};

  /* 끌어서 둘러보기 · 클릭으로 부품 고르기 */
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let drag:{x:number;y:number;yaw:number;pitch:number;moved:boolean}|null=null;
  const hit=(cx:number,cy:number)=>{const r=renderer.domElement.getBoundingClientRect();ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
   const hits=ray.intersectObjects(scene.children,true);for(const h of hits){if(!h.object.visible)continue;let o:THREE.Object3D|null=h.object;while(o){if(pickables.includes(o))return o;o=o.parent}if(h.distance<40)return null}return null};
  const cv=renderer.domElement;cv.style.touchAction='none';cv.style.cursor='grab';
  const down=(e:PointerEvent)=>{if(e.button!==0)return;cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,yaw:look.tyaw,pitch:look.tpitch,moved:false};cv.style.cursor='grabbing'};
  const moveH=(e:PointerEvent)=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;const k=.0042/uiZoom();look.tyaw=drag.yaw+dx*k;look.tpitch=THREE.MathUtils.clamp(drag.pitch+dy*k,-1.1,1.1);return}
   cv.style.cursor=hit(e.clientX,e.clientY)?'pointer':'grab'};
  const up=(e:PointerEvent)=>{const d=drag;drag=null;cv.style.cursor='grab';if(!d||d.moved)return;const o=hit(e.clientX,e.clientY);
   if(!o){p.current.onPart?.(null);return}p.current.onPart?.(partOf(o))};
  const keys=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;if(e.key==='ArrowLeft')look.tyaw+=.18;else if(e.key==='ArrowRight')look.tyaw-=.18;else return};
  cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',moveH);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{drag=null});window.addEventListener('keydown',keys);
  cv.addEventListener('contextmenu',e=>e.preventDefault());

  const clock=new THREE.Clock();let lastAir=-1;
  const tick=()=>{frame=requestAnimationFrame(tick);const dt=Math.min(.05,clock.getDelta());
   if(!paused)for(const m of mixers)m.update(dt);
   if(gown&&!gown.paused&&gown.time>=gownStop-1e-3){gown.time=Math.min(gownStop,gown.getClip().duration-1e-4);gown.paused=true;avMix?.update(0);p.current.onGown?.({order:gownOrder,playing:false})}
   if(air){const t=air.isRunning()?air.time:-1;if(t!==lastAir){lastAir=t;p.current.onAir?.(t>=0?t:null)}}
   if(move){const k=Math.min(1,(performance.now()-move.t0)/move.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;pos.lerpVectors(from,to,e);pos.y=to.y+Math.sin(k*Math.PI*6)*.012*(1-k);if(k>=1)move=null}
   const reduce=p.current.motion===false;const f=reduce?1:1-Math.pow(.0009,dt);look.yaw+=(look.tyaw-look.yaw)*f;look.pitch+=(look.tpitch-look.pitch)*f;
   camera.position.copy(pos);camera.rotation.set(look.pitch,look.yaw,0,'YXZ');
   renderer.render(scene,camera)};
  tick();
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();window.removeEventListener('keydown',keys);if(p.current.api)p.current.api.current=null;renderer.dispose();pmrem.dispose();el.removeChild(renderer.domElement)};
 },[]);
 useEffect(()=>{applyStep.current(props.step)},[props.step]);
 useEffect(()=>{applyLayers.current(props.layers)},[props.layers]);
 useEffect(()=>{applySel.current(props.selected)},[props.selected]);
 return <div ref={host} className="cr-tour-canvas" aria-label="클린룸 3D 공간 — 끌어서 둘러보고, 장비를 누르면 설명이 나와요" role="img">
  {status!=='ready'&&<p className="model-stage-status cr-tour-status" role="status" data-state={status}>{status==='error'?'3D 공간을 불러오지 못했어요':'클린룸을 불러오는 중이에요'}</p>}
 </div>;
}
