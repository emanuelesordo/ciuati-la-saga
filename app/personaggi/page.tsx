import Link from 'next/link';
import {characterTeasers} from './teasers';
type Character = {id:string;slug:string;display_name:string;avatar_path:string|null};
async function getCharacters():Promise<Character[]> {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return [];
 try{
  const response=await fetch(url+'/rest/v1/characters?select=id,slug,display_name,avatar_path&is_published=eq.true&order=display_name.asc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
  if(!response.ok)throw new Error('Archivio non disponibile');
  return await response.json() as Character[];
 }catch{return [];}
}
export default async function Personaggi(){
 const characters=await getCharacters();
 return <main className="shell identikit-shell"><Link href="/">← Torna alla saga</Link><div className="eyebrow" style={{marginTop:40}}>ARCHIVIO DEI CIUATI</div><h1>Personaggi</h1><p>Volti e leggende dei protagonisti: altre tracce emergeranno lungo la Saga.</p>
 {characters.length?<div className="identikit-grid">{characters.map(c=><Link className="identikit-card" key={c.id} href={'/personaggi/'+encodeURIComponent(c.slug)}>
  <div className="identikit-card-art">{(c.avatar_path?.startsWith('https://')||c.avatar_path?.startsWith('/characters/'))?<img src={c.avatar_path} alt={'Ritratto di '+c.display_name}/>:<span aria-hidden="true">{c.display_name.slice(0,1)}</span>}</div>
  <div className="identikit-card-content"><small>DOSSIER · CERCHIA DEI CIUATI</small><h2>{c.display_name}</h2><p>{characterTeasers[c.slug]||'Il suo passato deve ancora emergere dalle cronache.'}</p><strong>Consulta identikit →</strong></div>
 </Link>)}</div>:<section className="panel"><h2>Nessun personaggio disponibile</h2><p>Non risultano schede pubblicate, oppure l'archivio è momentaneamente indisponibile.</p></section>}
 </main>;
}
