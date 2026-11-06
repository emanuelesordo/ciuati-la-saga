import Link from 'next/link';

type Character={id:string;slug:string;display_name:string;description:string;narrative_role:string};
async function load():Promise<Character[]>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return [];
 try{
  const result=await fetch(url+'/rest/v1/secondary_characters?select=id,slug,display_name,description,narrative_role&is_published=eq.true&order=display_name.asc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
  if(!result.ok)throw new Error('Archivio non disponibile');
  return await result.json() as Character[];
 }catch{return []}
}
export default async function ArchivioPersonaggi(){
 const characters=await load();
 return <main className="shell identikit-shell">
  <Link href="/">← Torna alla Saga</Link>
  <div className="eyebrow" style={{marginTop:36}}>PERSONAGGI DEL MONDO</div>
  <h1>Archivio Personaggi</h1>
  <p>Alleati, rivali e figure misteriose. Un archivio indipendente dalla Cerchia dei sei Ciuati, consultabile liberamente.</p>
  <nav className="panel"><Link href="/personaggi">Vai all'Archivio Ciuati →</Link></nav>
  {characters.length?<div className="identikit-grid">{characters.map(c=><Link key={c.id} className="identikit-card" href={'/archivio-personaggi/'+encodeURIComponent(c.slug)}>
   <div className="identikit-card-art"><span aria-hidden="true">{c.display_name.charAt(0)}</span></div>
   <div className="identikit-card-content"><small>PERSONAGGIO DELLA SAGA</small><h2>{c.display_name}</h2><p>{c.description||'Il suo ruolo deve ancora emergere.'}</p><strong>Apri la scheda →</strong></div>
  </Link>)}</div>:<section className="panel"><h2>Nessuna scheda pubblicata</h2><p>Le nuove figure vengono archiviate come bozze, poi rese pubbliche dopo la revisione.</p></section>}
  <section className="panel"><h2>Contribuisci alla Saga</h2><p>Solo i sei Ciuati autenticati possono proporre nuovi personaggi o aggiungere testimonianze. La consultazione resta aperta a tutti.</p><Link href="/accedi">Accedi con il tuo Ciuato →</Link></section>
 </main>;
}
