'use client';
import {useState} from 'react';
import Link from 'next/link';
type Profile=Record<string,unknown>;
type Companion={id:string;slug:string;name:string;relationship:string|null};
type Villain={id:string;name:string;relationship:string|null};
type Chronicle={slug:string;title:string;summary:string;event_date:string;role:string};
function value(v:unknown):string{return typeof v==='string'?v.trim():'';}
export default function IdentikitTabs({profile,companions,villains,chronicles}:{profile:Profile;companions:Companion[];villains:Villain[];chronicles:Chronicle[]}){
 const [relationTab,setRelationTab]=useState<'cerchia'|'villains'>('cerchia');
 const dossier=(profile.dossier&&typeof profile.dossier==='object'&&!Array.isArray(profile.dossier)?profile.dossier:{}) as Record<string,unknown>;
 const facts: [string,string][]=[
 ['Origine',value(dossier.origin)||value(profile.origin)],
 ['Ideali',value(dossier.ideals)],
 ['Punto di forza',value(dossier.strength)],
 ['Punto debole',value(dossier.weakness)],
 ['Mossa segreta',value(dossier.secret_move)]
 ].filter(([,v])=>Boolean(v)) as [string,string][];
 return <section className="identikit-dossier" aria-label="Identikit narrativo"><div className="identikit-body">
 <div className="eyebrow">IL PERSONAGGIO</div>
 <div className="compact-profile">{facts.map(([label,description])=><div key={label} className="compact-line"><strong>{label}</strong><span>{description}</span></div>)}</div>
 <h2 style={{marginTop:34}}>Relazioni</h2>
 <div role="tablist" aria-label="Tipologia di relazioni" style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
 <button type="button" role="tab" id="tab-cerchia" aria-selected={relationTab==='cerchia'} aria-controls="panel-cerchia" onClick={()=>setRelationTab('cerchia')} style={{opacity:relationTab==='cerchia'?1:.65,fontWeight:relationTab==='cerchia'?700:400}}>La cerchia ({companions.length})</button>
 <button type="button" role="tab" id="tab-villains" aria-selected={relationTab==='villains'} aria-controls="panel-villains" onClick={()=>setRelationTab('villains')} style={{opacity:relationTab==='villains'?1:.65,fontWeight:relationTab==='villains'?700:400}}>Villains ({villains.length})</button>
 </div>
 <div role="tabpanel" id="panel-cerchia" aria-labelledby="tab-cerchia" hidden={relationTab!=='cerchia'}>
 <div className="relation-list">{companions.map(c=><article className="relation-card" key={c.id}><h3><Link href={'/personaggi/'+encodeURIComponent(c.slug)}>{c.name}</Link></h3><p>{c.relationship||'Rapporto ancora da raccontare.'}</p></article>)}</div>
 </div>
 <div role="tabpanel" id="panel-villains" aria-labelledby="tab-villains" hidden={relationTab!=='villains'}>
 {villains.length?<div className="relation-list">{villains.map(v=><article className="relation-card" key={v.id}><h3>{v.name}</h3><p>{v.relationship||'Rivalità ancora da definire nelle cronache.'}</p></article>)}</div>:<p className="identikit-empty">Nessun villain è stato ancora confermato nelle cronache pubblicate.</p>}
 </div>
 <h2 style={{marginTop:34}}>Eventi</h2>
 {chronicles.length?<div className="chronicle-list">{chronicles.slice(0,6).map(c=><article className="chronicle-card" key={c.slug}><time dateTime={c.event_date}>{c.event_date}</time><h3>{c.title}</h3><p>{c.summary}</p><small>{c.role}</small></article>)}</div>:<p className="identikit-empty">Non ci sono ancora eventi pubblicati.</p>}
 </div></section>;
}
