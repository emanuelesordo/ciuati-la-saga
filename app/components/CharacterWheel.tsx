'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';

export type CarouselCharacter={id:string;name:string;href:string;image?:string|null;description?:string;label?:string};
export default function CharacterWheel({characters}:{characters:CarouselCharacter[]}){
 const [selected,setSelected]=useState(0);
 const [moving,setMoving]=useState(false);
 const start=useRef<{x:number;t:number}|null>(null);
 const wheelLock=useRef(0);
 const count=characters.length;
 const advance=(steps:number)=>setSelected(i=>(i+steps%count+count)%count);
 const delta=(i:number)=>{const d=(i-selected+count)%count;return d>count/2?d-count:d;};
 const onEnd=(x:number)=>{if(!start.current)return;const distance=x-start.current.x;const elapsed=Math.max(1,Date.now()-start.current.t);start.current=null;setMoving(false);if(Math.abs(distance)<20)return;const velocity=Math.abs(distance)/elapsed;const steps=velocity>1.5?Math.min(count-1,Math.max(2,Math.round(velocity*1.7))):1;advance(distance<0?steps:-steps);};
 if(!count)return null;
 return <section className="character-wheel" aria-label="Seleziona un personaggio">
  <div className="wheel-stage" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;start.current={x:e.clientX,t:Date.now()};setMoving(true);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={e=>onEnd(e.clientX)} onPointerCancel={()=>{start.current=null;setMoving(false)}} onWheel={e=>{const now=Date.now();if(now-wheelLock.current<220)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(Math.abs(d)<8)return;wheelLock.current=now;advance(d>0?1:-1);}} >
   {characters.map((c,i)=>{const d=delta(i);const visible=Math.abs(d)<=2;return <div key={c.id} className={'wheel-item'+(d===0?' wheel-active':'')} aria-hidden={!visible} style={{'--wheel-offset':d,'--wheel-depth':Math.abs(d),zIndex:10-Math.abs(d),opacity:visible?1:0,pointerEvents:visible?'auto':'none'} as React.CSSProperties}>
    <button type="button" className="wheel-card" tabIndex={d===0?0:-1} aria-label={'Seleziona '+c.name} onClick={()=>{if(moving)return;if(d!==0)advance(d)}} >
     <span className="wheel-portrait">{c.image?<img src={c.image} alt="" draggable={false}/>:<span className="wheel-initial">{c.name.charAt(0)}</span>}</span>
     {c.description&&<span className="wheel-description">{c.description}</span>}
     <strong>{c.name}</strong>
    </button>
   </div>})}
  </div>
  <div className="wheel-controls"><button type="button" aria-label="Personaggio precedente" onClick={()=>advance(-1)}>‹</button><span aria-live="polite">{selected+1} / {count}</span><button type="button" aria-label="Personaggio successivo" onClick={()=>advance(1)}>›</button></div>
  <Link className="wheel-open" href={characters[selected].href}>Apri {characters[selected].name} <span aria-hidden="true">→</span></Link>
 </section>;
}
