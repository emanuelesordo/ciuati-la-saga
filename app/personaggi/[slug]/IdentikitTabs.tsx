'use client';
import {useState} from 'react';
import Link from 'next/link';
type Profile=Record<string,unknown>;
type Relation={id:number;relationship:string;classification:string;target:{name:string;slug?:string}|null};
type Chronicle={slug:string;title:string;summary:string;event_date:string;role:string};
const fields:{title:string;items:[string,string][]}[]=[
 {title:'Anagrafica narrativa',items:[['Nome completo','full_name'],['Età narrativa','age'],['Natura / stirpe','species'],['Terra d’origine','origin'],['Dimora','residence'],['Mestiere / ruolo','occupation'],['Titoli','titles'],['Fazione','faction']]},
 {title:'Carattere e psicologia',items:[['Temperamento','temperament'],['Virtù','virtues'],['Difetti','flaws'],['Ambizioni','ambitions'],['Timori','fears'],['Modo di parlare','speech'],['Abitudini','habits']]},
 {title:'Abilità e simboli',items:[['Talenti','skills'],['Debolezze','weaknesses'],['Equipaggiamento','equipment'],['Segni distintivi','distinctive_features'],['Compagni animali','companions']]},
 {title:'Ideologia nel mondo della Saga',items:[['Orientamento narrativo','ideology'],['Ideali','values'],['Contraddizioni','contradictions']]},
 {title:'Luoghi e folklore',items:[['Luoghi frequentati','places'],['Citazioni','quotes'],['Leggende e dicerie','rumors'],['Curiosità','curiosities']]}
];
function value(v:unknown):string|undefined{if(typeof v==='string'&&v.trim())return v.trim();if(Array.isArray(v)){const parts=v.filter((x):x is string=>typeof x==='string'&&!!x.trim());return parts.length?parts.join(' · '):undefined;}return undefined;}
function Details({items,profile}:{items:[string,string][];profile:Profile}){const entries=items.map(([label,key])=>({label,text:value(profile[key])})).filter(x=>x.text);return entries.length?<dl className="identikit-facts">{entries.map(x=><div key={x.label}><dt>{x.label}</dt><dd>{x.text}</dd></div>)}</dl>:<p className="identikit-empty">Questa parte del dossier non è ancora stata tramandata dalle cronache.</p>;}
export default function IdentikitTabs({profile,aliases,relations,chronicles}:{profile:Profile;aliases:string[];relations:Relation[];chronicles:Chronicle[]}){
 const [tab,setTab]=useState('identita');
 const sections=[{id:'identita',label:'Identità'},{id:'carattere',label:'Carattere'},{id:'relazioni',label:'Relazioni'},{id:'cronache',label:'Cronache'},{id:'folklore',label:'Folklore'}];
 return <section className="identikit-dossier" aria-label="Scheda identikit">
 <div className="identikit-tabs" role="tablist" aria-label="Sezioni identikit">{sections.map(s=><button key={s.id} type="button" role="tab" id={'tab-'+s.id} aria-selected={tab===s.id} aria-controls="identikit-panel" className={tab===s.id?'active':''} onClick={()=>setTab(s.id)}>{s.label}</button>)}</div>
 <div className="identikit-body" role="tabpanel" id="identikit-panel" aria-labelledby={'tab-'+tab}>
 {tab==='identita'&&<><h2>Identità e origini</h2>{aliases.length>0&&<p className="identikit-alias">Conosciuto anche come: {aliases.join(', ')}</p>}<Details items={fields[0].items} profile={profile}/></>}
 {tab==='carattere'&&<><h2>Psicologia, doti e visione del mondo</h2>{fields.slice(1,4).map(f=><div key={f.title} className="identikit-subsection"><h3>{f.title}</h3><Details items={f.items} profile={profile}/></div>)}</>}
 {tab==='relazioni'&&<><h2>Relazioni e reputazione</h2>{relations.length?<div className="relation-list">{relations.map(r=><article key={r.id} className="relation-card"><h3>{r.target?.slug?<Link href={'/personaggi/'+r.target.slug}>{r.target.name}</Link>:r.target?.name}</h3><p>{r.relationship}</p><small>{r.classification==='fiction'?'Leggenda':r.classification==='interpretation'?'Interpretazione narrativa':'Cronaca registrata'}</small></article>)}</div>:<p className="identikit-empty">Non risultano relazioni pubbliche archiviate. Le opinioni private dei personaggi non sono mostrate.</p>}</>}
 {tab==='cronache'&&<><h2>Imprese e avvenimenti</h2>{chronicles.length?<div className="chronicle-list">{chronicles.map(e=><article key={e.slug} className="chronicle-card"><time dateTime={e.event_date}>{e.event_date}</time><h3>{e.title}</h3><p>{e.summary}</p><small>Parte nella vicenda: {e.role}</small></article>)}</div>:<p className="identikit-empty">Nessuna cronaca pubblica associata a questo personaggio.</p>}</>}
 {tab==='folklore'&&<><h2>Curiosità e folklore</h2><Details items={fields[4].items} profile={profile}/></>}
 </div></section>;
}
