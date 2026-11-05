import Link from 'next/link';
type Profile=Record<string,unknown>;
type Relation={id:number;relationship:string;classification:string;target:{name:string;slug?:string}|null};
type Chronicle={slug:string;title:string;summary:string;event_date:string;role:string};
function text(v:unknown):string{return typeof v==='string'?v.trim():'';}
export default function IdentikitTabs({profile,relations,chronicles}:{profile:Profile;aliases:string[];relations:Relation[];chronicles:Chronicle[]}){
 const dossier=(profile.dossier&&typeof profile.dossier==='object'&&!Array.isArray(profile.dossier)?profile.dossier:{}) as Record<string,unknown>;
 const facts:[string,string][]=[
  ['Origine',text(dossier.origin)||text(profile.origin)],
  ['Ideali',text(dossier.ideals)],
  ['Punto di forza',text(dossier.strength)],
  ['Punto debole',text(dossier.weakness)],
  ['Mossa segreta',text(dossier.secret_move)]
 ].filter(([,v])=>Boolean(v));
 return <section className="identikit-dossier" aria-label="Identikit narrativo">
  <div className="identikit-body">
   <div className="eyebrow">IDENTITÀ</div>
   <p className="compact-narrative">{text(dossier.identity)||'Il suo ruolo nella Saga si rivelerà nelle prossime cronache.'}</p>
   <div className="compact-profile">{facts.map(([label,description])=><div className="compact-line" key={label}><strong>{label}</strong><span>{description}</span></div>)}</div>
   <h2 style={{marginTop:34}}>Relazioni</h2>
   {relations.length?<div className="relation-list">{relations.map(r=><article key={r.id} className="relation-card"><h3>{r.target?.slug?<Link href={'/personaggi/'+r.target.slug}>{r.target.name}</Link>:r.target?.name}</h3><p>{r.relationship}</p></article>)}</div>:<p className="identikit-empty">I legami saranno svelati nelle cronache.</p>}
   <h2 style={{marginTop:34}}>Eventi della Saga</h2>
   {chronicles.length?<div className="chronicle-list">{chronicles.slice(0,6).map(c=><article key={c.slug} className="chronicle-card"><time dateTime={c.event_date}>{c.event_date}</time><h3>{c.title}</h3><p>{c.summary}</p><small>Ruolo: {c.role}</small></article>)}</div>:<p className="identikit-empty">Nessun evento pubblicato per questo personaggio.</p>}
  </div>
 </section>;
}
