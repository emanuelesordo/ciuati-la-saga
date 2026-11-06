import Link from 'next/link';
import {notFound} from 'next/navigation';
import NarrativeInput from '../../components/NarrativeInput';
import ProfileSections from '../../components/ProfileSections';
type Character={id:string;slug:string;display_name:string;description:string;narrative_role:string};
export default async function Scheda({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^[a-z0-9-]+$/.test(slug))notFound();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 let character:Character|undefined;
 if(url&&key){
  try{
   const response=await fetch(url+'/rest/v1/secondary_characters?select=id,slug,display_name,description,narrative_role&slug=eq.'+encodeURIComponent(slug)+'&is_published=eq.true&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
   if(response.ok)character=((await response.json()) as Character[])[0];
  }catch{}
 }
 if(!character)notFound();
 return <main className="shell identikit-shell"><Link href="/archivio-personaggi">← Archivio Personaggi</Link>
  <div className="eyebrow" style={{marginTop:36}}>DOSSIER · PERSONAGGI DELLA SAGA</div>
  <h1>{character.display_name}</h1>
  <ProfileSections sheet={<section className="panel"><h2>Identikit</h2><p style={{whiteSpace:'pre-wrap'}}>{character.description||'La sua storia deve ancora essere raccontata.'}</p><small>Le informazioni pubbliche si arricchiscono con il procedere degli episodi approvati.</small></section>} contributions={<NarrativeInput targetName={character.display_name} targetSecondaryId={character.id}/>}/>
 </main>;
}
