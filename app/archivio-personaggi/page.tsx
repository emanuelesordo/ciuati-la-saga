import Link from 'next/link';
import ArchiveTabs from '../components/ArchiveTabs';
import CharacterWheel from '../components/CharacterWheel';

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
function isAntagonist(role:string):boolean {
 return /antagon|villain|nemic|rivale|avversar|ostil/i.test(role||'');
}
export default async function ArchivioPersonaggi({searchParams}:{searchParams:Promise<{categoria?:string}>}){
 const {categoria}=await searchParams;
 const antagonisti=categoria==='antagonisti';
 const characters=(await load()).filter(c=>isAntagonist(c.narrative_role)===antagonisti);
 return <main className="shell identikit-shell">
  <header className="archive-header"><div className="archive-heading"><h1>{antagonisti?'Antagonisti':'Altri personaggi'}</h1><p>{antagonisti?'Rivali e avversari della Saga':'Alleati e figure misteriose'}</p></div><ArchiveTabs active={antagonisti?'antagonisti':'altri'}/></header>
  {characters.length?<CharacterWheel characters={characters.map(c=>({id:c.id,name:c.display_name,href:'/archivio-personaggi/'+encodeURIComponent(c.slug),label:'PERSONAGGIO DELLA SAGA',description:c.description}))}/>:<section className="panel"><h2>Nessuna scheda in questa categoria</h2><p>Le nuove figure vengono archiviate come bozze, poi rese pubbliche dopo la revisione.</p></section>}
  <section className="panel"><h2>Contribuisci alla Saga</h2><p>Solo i sei Ciuati autenticati possono proporre nuovi personaggi o aggiungere testimonianze. La consultazione resta aperta a tutti.</p><Link href="/accedi">Accedi con il tuo Ciuato →</Link></section>
 </main>;
}
