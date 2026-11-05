'use client';
import {useState} from 'react';
import Link from 'next/link';
type Profile=Record<string,unknown>;
type Relation={id:number;relationship:string;classification:string;target:{name:string;slug?:string}|null};
type Chronicle={slug:string;title:string;summary:string;event_date:string;role:string};
function value(v:unknown):string{if(typeof v==='string')return v.trim();if(Array.isArray(v))return v.filter((x):x is string=>typeof x==='string'&&!!x.trim()).join(', ');return '';}
function Line({label,content}:{label:string;content:string}){return content?<div className="compact-line"><strong>{label}</strong><span>{content}</span></div>:null;}
export default function IdentikitTabs({profile,aliases,relations,chronicles}:{profile:Profile;aliases:string[];relations:Relation[];chronicles:Chronicle[]}){
 const [tab,setTab]=useState('identita');
 const sections=[{id:'identita',label:'Identità'},{id:'personaggio',label:'Il personaggio'},{id:'relazioni',label:'Legami'},{id:'cronache',label:'Cronache'}];
 const personality=[value(profile.temperament),value(profile.virtues),value(profile.flaws)].filter(Boolean).join(' ');
 const singular=[value(profile.distinctive_features),value(profile.companions)].filter(Boolean).join(' ');
 return <section className="identikit-dossier" aria-label="Scheda del personaggio">
 <div className="identikit-tabs" role="tablist" aria-label="Sezioni">{sections.map(s=><button key={s.id} type="button" role="tab" id={'tab-'+s.id} aria-selected={tab===s.id} aria-controls="identikit-panel" className={tab===s.id?'active':''} onClick={()=>setTab(s.id)}>{s.label}</button>)}</div>
 <div className="identikit-body" role="tabpanel" id="identikit-panel" aria-labelledby={'tab-'+tab}>
 {tab==='identita'&&<><h2>Identità</h2><div className="compact-profile"><Line label="Soprannomi" content={[...aliases,value(profile.titles)].filter(Boolean).join(' · ')}/><Line label="Provenienza" content={value(profile.origin)}/><Line label="Dimora" content={value(profile.residence)}/><Line label="Ruolo" content={value(profile.occupation)}/><Line label="Fazione della Saga" content={value(profile.faction)}/></div></>}
 {tab==='personaggio'&&<><h2>Il personaggio</h2>{personality?<p className="compact-narrative">{personality}</p>:<p className="identikit-empty">Ritratto narrativo in preparazione.</p>}{singular&&<p className="compact-narrative">{singular}</p>}{value(profile.skills)&&<Line label="Talenti" content={value(profile.skills)}/>}</>}
 {tab==='relazioni'&&<><h2>Legami</h2>{relations.length?<div className="relation-list">{relations.map(r=><article key={r.id} className="relation-card"><h3>{r.target?.slug?<Link href={'/personaggi/'+r.target.slug}>{r.target.name}</Link>:r.target?.name}</h3><p>{r.relationship}</p></article>)}</div>:<p className="identikit-empty">Nessun legame pubblico ancora narrato.</p>}</>}
 {tab==='cronache'&&<><h2>Cronache e leggende</h2>{chronicles.length>0&&<div className="chronicle-list">{chronicles.map(e=><article key={e.slug} className="chronicle-card"><time dateTime={e.event_date}>{e.event_date}</time><h3>{e.title}</h3><p>{e.summary}</p></article>)}</div>}{value(profile.rumors)&&<div className="compact-legend"><h3>Si racconta che…</h3><p>{value(profile.rumors)}</p></div>}{chronicles.length===0&&!value(profile.rumors)&&<p className="identikit-empty">Le cronache devono ancora essere trascritte.</p>}</>}
 </div></section>;
}
