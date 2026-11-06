import Link from 'next/link';
import ArchiveTabs from '../components/ArchiveTabs';
import CharacterWheel from '../components/CharacterWheel';
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
 return <main className="shell identikit-shell"><header className="archive-header"><div className="archive-heading"><h1>Personaggi</h1><p>Volti e leggende della Saga</p></div><ArchiveTabs active="ciuati"/></header>
 {characters.length?<CharacterWheel characters={characters.map(c=>({id:c.id,name:c.display_name,href:'/personaggi/'+encodeURIComponent(c.slug),image:c.avatar_path?.startsWith('https://')||c.avatar_path?.startsWith('/characters/')?c.avatar_path:null,label:'CERCHIA DEI CIUATI',description:characterTeasers[c.slug]}))}/>:<section className="panel"><h2>Nessun personaggio disponibile</h2><p>Non risultano schede pubblicate, oppure l'archivio è momentaneamente indisponibile.</p></section>}
 </main>;
}
