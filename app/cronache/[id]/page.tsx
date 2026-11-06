import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Episodio({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)notFound();
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data}=await db.from('episodes').select('title,summary,content,published_at').eq('id',id).eq('is_published',true).single();
 if(!data)notFound();
 const body=typeof data.content==='string'?data.content:typeof data.content?.body==='string'?data.content.body:'';
 return <main className="shell"><Link href="/cronache">← Tutte le Cronache</Link><div className="eyebrow" style={{marginTop:38}}>CAPITOLO PUBBLICATO</div><h1>{data.title}</h1><p>{data.summary}</p><article className="panel" style={{whiteSpace:'pre-wrap',font:'normal 19px/1.85 Georgia,serif'}}>{body||'Testo non disponibile.'}</article><footer>Pubblicato il {data.published_at?new Date(data.published_at).toLocaleDateString('it-IT'):''}</footer></main>;
}