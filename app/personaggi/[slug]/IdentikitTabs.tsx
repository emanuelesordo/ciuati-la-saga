import Link from 'next/link';
type Profile=Record<string,unknown>;
type Relation={id:number;relationship:string;classification:string;target:{name:string;slug?:string}|null};
type Chronicle={slug:string;title:string;summary:string;event_date:string;role:string};
function value(v:unknown):string{return typeof v==='string'?v.trim():'';}
export default function IdentikitTabs({profile,relations}:{profile:Profile;aliases:string[];relations:Relation[];chronicles:Chronicle[]}){
 const linked=relations.filter(r=>r.target).slice(0,3);
 return <section className="identikit-dossier" aria-label="Identikit essenziale">
  <div className="identikit-body">
   <h2>In breve</h2>
   <div className="compact-profile">
    {value(profile.occupation)&&<div className="compact-line"><strong>Ruolo</strong><span>{value(profile.occupation)}</span></div>}
    {value(profile.origin)&&<div className="compact-line"><strong>Terre</strong><span>{value(profile.origin)}</span></div>}
    {value(profile.temperament)&&<div className="compact-line"><strong>Indole</strong><span>{value(profile.temperament)}</span></div>}
   </div>
   {linked.length>0&&<><h2 style={{marginTop:28}}>Legami</h2><div className="relation-list">{linked.map(r=><article key={r.id} className="relation-card"><h3>{r.target?.slug?<Link href={'/personaggi/'+r.target.slug}>{r.target.name}</Link>:r.target?.name}</h3><p>{r.relationship}</p></article>)}</div></>}
  </div>
 </section>;
}
