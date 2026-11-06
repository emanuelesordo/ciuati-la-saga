'use client';
import { useMemo, useRef, useState } from 'react';

export type AtlasPlace = { id:string; slug:string; name:string; description:string; image_url?:string|null; real_world_reference?:string|null; reference_status?:string|null };
const landmarks:Record<string,{x:number;y:number;kind:string;parent?:string}>={
 paugania:{x:465,y:285,kind:'Regione'},antonova:{x:495,y:310,kind:'Città',parent:'Paugania'},
 'white-pony':{x:526,y:336,kind:'Santuario',parent:'Antonova'},
 spianata:{x:705,y:510,kind:'Regione'},svilarna:{x:670,y:465,kind:'Altopiano',parent:'Spianata'},
 triventra:{x:756,y:550,kind:'Città',parent:'Spianata'},cratiria:{x:650,y:575,kind:'Città',parent:'Spianata'},
 bonaria:{x:252,y:345,kind:'Regione'},tortellum:{x:245,y:390,kind:'Città',parent:'Bonària'},
 cambrinus:{x:235,y:140,kind:'Regno'},carbonade:{x:282,y:177,kind:'Città',parent:'Cambrinus'}
};
const bounds={minX:0,minY:0,width:1000,height:700};
export default function AtlasMap({places}:{places:AtlasPlace[]}){
 const [zoom,setZoom]=useState(1); const [offset,setOffset]=useState({x:0,y:0});
 const [selected,setSelected]=useState('white-pony'); const [search,setSearch]=useState('');
 const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
 const available=useMemo(()=>places.filter(p=>landmarks[p.slug]),[places]);
 const visible=available.filter(p=>p.name.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')));
 const active=available.find(p=>p.slug===selected);
 const changeZoom=(value:number)=>setZoom(z=>Math.min(3.5,Math.max(1,typeof value==='number'?value:z)));
 const viewWidth=bounds.width/zoom,viewHeight=bounds.height/zoom;
 const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
 const vx=clamp(offset.x,0,bounds.width-viewWidth),vy=clamp(offset.y,0,bounds.height-viewHeight);
 const focus=(slug:string)=>{const point=landmarks[slug];if(!point)return;setSelected(slug);setOffset({x:clamp(point.x-bounds.width/(zoom*2),0,bounds.width-viewWidth),y:clamp(point.y-bounds.height/(zoom*2),0,bounds.height-viewHeight)});};
 const onPointerDown=(e:React.PointerEvent<SVGSVGElement>)=>{if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,ox:vx,oy:vy};e.currentTarget.setPointerCapture(e.pointerId);};
 const onPointerMove=(e:React.PointerEvent<SVGSVGElement>)=>{if(!drag.current)return;const rect=e.currentTarget.getBoundingClientRect();setOffset({x:clamp(drag.current.ox-(e.clientX-drag.current.x)*viewWidth/rect.width,0,bounds.width-viewWidth),y:clamp(drag.current.oy-(e.clientY-drag.current.y)*viewHeight/rect.height,0,bounds.height-viewHeight)});};
 const onPointerUp=()=>{drag.current=null;};
 return <div className="atlas-layout">
  <div className="atlas-map-wrap">
   <div className="atlas-toolbar"><button type="button" onClick={()=>changeZoom(zoom+.35)} aria-label="Ingrandisci">+</button><button type="button" onClick={()=>changeZoom(zoom-.35)} aria-label="Riduci">−</button><button type="button" onClick={()=>{setZoom(1);setOffset({x:0,y:0});}} aria-label="Ripristina mappa">Centra</button><span>{Math.round(zoom*100)}%</span></div>
   <svg className="atlas-svg" role="img" aria-label="Mappa immaginaria dei territori della Saga, trascinabile e ingrandibile" viewBox={`${vx} ${vy} ${viewWidth} ${viewHeight}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <defs><pattern id="atlas-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#e9cda1" strokeOpacity=".12"/></pattern></defs>
    <rect width="1000" height="700" fill="#152c37"/><rect width="1000" height="700" fill="url(#atlas-grid)"/>

    {[
      ['bonaria','M105 260 Q120 205 205 230 Q270 225 327 285 L355 385 Q315 470 217 480 L125 405Z','#657455',195,320],
      ['paugania','M360 175 Q450 105 555 165 L622 250 L594 375 Q510 428 408 382 L353 283Z','#687f62',470,240],
      ['spianata','M575 405 Q655 350 745 400 L846 505 L812 635 L680 653 L573 575Z','#8b7658',755,490],
      ['cambrinus','M115 75 Q235 40 325 88 L366 173 L305 223 L160 205 L105 148Z','#617e81',230,120]
    ].map(([slug,path,fill,x,y])=>{const place=visible.find(p=>p.slug===slug);return <g key={String(slug)} role="button" tabIndex={0} aria-label={'Apri '+(place?.name??slug)} onClick={()=>place&&focus(String(slug))} onKeyDown={e=>{if(place&&(e.key==='Enter'||e.key===' ')){e.preventDefault();focus(String(slug))}}} style={{cursor:'pointer'}}>
      <path d={String(path)} fill={String(fill)} stroke={selected===slug?'#f5c478':'#d4c59d'} strokeWidth={selected===slug?6:3}/>
      <text x={Number(x)} y={Number(y)} textAnchor="middle" fill="#fff1d3" fontFamily="Georgia,serif" fontStyle="italic" fontSize="23" letterSpacing="2" paintOrder="stroke" stroke="#27343a" strokeWidth="4">{place?.name}</text>
    </g>})}
    <path d="M606 427 Q651 396 705 427 L739 474 L701 510 L626 496 L596 456Z" fill="#a1a18b" stroke={selected==='svilarna'?'#f5c478':'#d8d0af'} strokeWidth={selected==='svilarna'?5:2} strokeDasharray="8 5" onClick={()=>focus('svilarna')} style={{cursor:'pointer'}}/>
    <g fill="#e4dfce" stroke="#5a635d" strokeWidth="2" pointerEvents="none"><path d="M619 464l15-28 15 28z"/><path d="M643 478l19-39 19 39z"/><path d="M675 467l17-30 17 30z"/></g>
    {visible.some(p=>p.slug==='svilarna')&&<text x="657" y="491" textAnchor="middle" fontSize="17" fontFamily="Georgia,serif" fill="#fff5df" paintOrder="stroke" stroke="#27343a" strokeWidth="4" onClick={()=>focus('svilarna')} style={{cursor:'pointer'}}>Svilarna</text>}
    <path d="M375 205 Q445 260 405 360 Q390 445 480 515" stroke="#a8d1d5" strokeWidth="9" fill="none" opacity=".55" pointerEvents="none"/>
    <path d="M606 515 Q675 535 722 615" stroke="#a8d1d5" strokeWidth="7" fill="none" opacity=".55" pointerEvents="none"/>
    {visible.filter(p=>!['bonaria','paugania','spianata','cambrinus','svilarna'].includes(p.slug)).map(p=>{const pt=landmarks[p.slug];const active=p.slug===selected;const special=p.slug==='white-pony';return <g key={p.id} role="button" tabIndex={0} aria-label={'Apri '+p.name} onClick={e=>{e.stopPropagation();focus(p.slug)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus(p.slug)}}} style={{cursor:'pointer'}}>
      {special?<rect x={pt.x-8} y={pt.y-8} width="16" height="16" transform={'rotate(45 '+pt.x+' '+pt.y+')'} fill="#f5c478" stroke="#302d31" strokeWidth="2"/>:<circle cx={pt.x} cy={pt.y} r={active?10:7} fill={active?'#f5c478':'#f4e4c8'} stroke="#302d31" strokeWidth="2"/>}
      <text x={pt.x+14} y={pt.y-13} fill="#fff5df" fontFamily="Georgia,serif" fontWeight={active?'bold':'normal'} fontSize="17" paintOrder="stroke" stroke="#1c2d33" strokeWidth="4">{p.name}</text>
    </g>})}
   </svg>
   <div className="atlas-map-foot">Mappa immaginaria · Trascina per esplorare · Seleziona un luogo</div>
  </div>
  <aside className="atlas-side">
   <label htmlFor="atlas-search">Cerca nell'Atlante</label><input id="atlas-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome del luogo…"/>
   <div className="atlas-places">{visible.map(p=><button type="button" className={selected===p.slug?'active':''} key={p.id} onClick={()=>focus(p.slug)}><strong>{p.name}</strong><small>{landmarks[p.slug].kind}</small></button>)}{!visible.length&&<p>Nessun luogo trovato.</p>}</div>
   {active&&<article className="atlas-detail"><div className="eyebrow">SCHEDA DEL LUOGO</div>{active.image_url&&<img src={active.image_url} alt={"Illustrazione fantasy di "+active.name} style={{width:"100%",height:"auto",aspectRatio:"3 / 2",objectFit:"cover",border:"2px solid #ba914e",borderRadius:8,margin:"12px 0"}}/>}<h2>{active.name}</h2><small>{landmarks[active.slug].kind}{landmarks[active.slug].parent?' · '+landmarks[active.slug].parent:''}</small><p>{active.description}</p>{active.reference_status==="confirmed"&&active.real_world_reference&&<small>Trasposizione reale: {active.real_world_reference}</small>}{active.reference_status==="unverified"&&<small>Origine reale non ancora definita nel canone.</small>}</article>}
  </aside>
 </div>;
}
