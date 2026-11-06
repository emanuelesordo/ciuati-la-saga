import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export default async function Cronache(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 const {data,error}=db?await db.from('episodes').select('id,title,summary,published_at').eq('is_published',true).order('published_at',{ascending:false}):{data:null,error:null};
 return <main className="shell"><Link href="/">← Torna alla Saga</Link><div className="eyebrow" style={{marginTop:35}}>LE CRONACHE DEI CIUATI</div><h1>La Saga</h1><p>Capitoli approvati dal Cronista e disponibili alla lettura.</p>{error&&<p>Archivio momentaneamente non disponibile.</p>}<section className="panel"><h2>Episodi pubblicati</h2>{!data?.length&&<p>Non ci sono ancora episodi pubblicati.</p>}{(data||[]).map((e,i)=><article key={e.id} className="chronicle-card" style={{marginTop:16}}><small>EPISODIO {String((data||[]).length-i).padStart(2,'0')} · {e.published_at?new Date(e.published_at).toLocaleDateString('it-IT'):''}</small><h3>{e.title}</h3><p>{e.summary}</p><Link href={'/cronache/'+e.id}>Leggi il capitolo →</Link></article>)}</section></main>;
}