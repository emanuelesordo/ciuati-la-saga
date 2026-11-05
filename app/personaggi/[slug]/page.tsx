import Link from 'next/link';
import { notFound } from 'next/navigation';
import IdentikitTabs from './IdentikitTabs';
type Profile=Record<string,unknown>;
type Character={id:string;slug:string;display_name:string;biography:string;avatar_path:string|null;profile:Profile|null};
type Alias={alias:string;is_primary:boolean};
type Relation={id:number;relationship:string;classification:string;target_character_id:string|null;target_secondary_id:string|null};
type Related={id:string;slug:string;display_name:string};
type EventLink={event_slug:string;role:string};
type Event={slug:string;title:string;summary:string;event_date:string};
const allowed=/^[a-z0-9-]+$/;
async function api<T>(path:string):Promise<T>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Configurazione archivio mancante');
 const response=await fetch(url+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
 if(!response.ok)throw new Error('Errore caricamento archivio');
 return await response.json() as T;
}
export default async function Identikit({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!allowed.test(slug))notFound();
 let characters:Character[];
 try{characters=await api<Character[]>('characters?select=id,slug,display_name,biography,avatar_path,profile&slug=eq.'+slug+'&is_published=eq.true&limit=1');}catch{ return <main className="shell"><Link href="/personaggi">← Archivio personaggi</Link><section className="panel"><h2>Archivio non disponibile</h2><p>Impossibile recuperare l'identikit. Riprova più tardi.</p></section></main>;}
 if(!characters.length)notFound();
 const character=characters[0];
 const [aliases,relations,eventLinks,related,secondary]=await Promise.all([
  api<Alias[]>('character_aliases?select=alias,is_primary&character_id=eq.'+character.id).catch(()=>[]),
  api<Relation[]>('saga_character_relations?select=id,relationship,classification,target_character_id,target_secondary_id&source_character_id=eq.'+character.id+'&is_published=eq.true').catch(()=>[]),
  api<EventLink[]>('saga_event_characters?select=event_slug,role&character_id=eq.'+character.id).catch(()=>[]),
  api<Related[]>('characters?select=id,slug,display_name&is_published=eq.true').catch(()=>[]),
  api<{id:string;display_name:string}[]>('secondary_characters?select=id,display_name&is_published=eq.true').catch(()=>[])
 ]);
 const names=new Map<string,{name:string;slug?:string}>();
 related.forEach(r=>names.set(r.id,{name:r.display_name,slug:r.slug}));
 secondary.forEach(r=>names.set(r.id,{name:r.display_name}));
 const events=eventLinks.length?await api<Event[]>('saga_events?select=slug,title,summary,event_date&is_published=eq.true&slug=in.('+eventLinks.map(e=>encodeURIComponent('"'+e.event_slug+'"')).join(',')+')&order=event_date.desc').catch(()=>[]):[];
 const chronicles=events.map(e=>({...e,role:eventLinks.find(l=>l.event_slug===e.slug)?.role||'partecipante'}));
 const links=relations.map(r=>({...r,target:names.get(r.target_character_id||r.target_secondary_id||'')||null})).filter(r=>r.target);
 return <main className="shell identikit-shell"><Link href="/personaggi">← Tutti i personaggi</Link>
 <div className="eyebrow" style={{marginTop:40}}>ARCHIVIO UFFICIALE · DOSSIER DELLA SAGA</div>
 <div className="identikit-hero"><div className="identikit-portrait">{(character.avatar_path?.startsWith('https://')||character.avatar_path?.startsWith('/characters/'))?<img src={character.avatar_path} alt={'Ritratto ufficiale di '+character.display_name}/>:<div className="portrait-pending"><span aria-hidden="true">{character.display_name.charAt(0)}</span><small>Ritratto in preparazione</small></div>}</div>
 <div className="identikit-heading"><span className="identikit-kicker">LA CERCHIA DEI CIUATI</span><h1>{character.display_name}</h1><p>{(typeof (character.profile as Record<string,unknown>|null)?.dossier==='object'&&typeof ((character.profile as Record<string,unknown>).dossier as Record<string,unknown>)?.identity==='string')?(((character.profile as Record<string,unknown>).dossier as Record<string,unknown>).identity as string):character.biography||'Le cronache non hanno ancora consegnato la sua storia agli archivi.'}</p></div></div>
 <IdentikitTabs profile={character.profile||{}} aliases={aliases.map(a=>a.alias)} relations={links} chronicles={chronicles}/>
 </main>;
}
