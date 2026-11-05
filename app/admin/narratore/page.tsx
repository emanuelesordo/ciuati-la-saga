'use client';
import {useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';

type Draft={id:string;title:string;summary:string;body:string;continuity_notes:string[];created_at:string};
export default function NarratoreAdmin(){
 const [idea,setIdea]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState<Draft|null>(null);
 async function generate(){
  setBusy(true);setError('');setDraft(null);
  try{
   if(!supabase)throw new Error('Supabase non configurato.');
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw new Error('Accedi prima come Admin.');
   const response=await fetch('/api/narratore',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({idea})});
   const result=await response.json() as {error?:string;draft?:Draft};
   if(!response.ok||!result.draft)throw new Error(result.error||'Generazione non riuscita.');
   setDraft(result.draft);
  }catch(e){setError(e instanceof Error?e.message:'Errore sconosciuto');}
  finally{setBusy(false);}
 }
 return <main className="shell"><Link href="/admin">← Pannello Admin</Link><div className="eyebrow" style={{marginTop:40}}>REGISTA AI</div><h1>Motore narrante ibrido</h1>
 <section className="panel"><h2>Crea una bozza</h2><p>Lo spunto è facoltativo. Il motore consulta la memoria persistente e non pubblica automaticamente.</p>
 <label htmlFor="idea">Spunto narrativo</label><textarea id="idea" rows={5} maxLength={2000} style={{width:'100%',display:'block',margin:'12px 0'}} value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Lascia vuoto per una storia autonoma."/>
 <button type="button" disabled={busy} onClick={generate}>{busy?'Generazione in corso…':'Genera episodio'}</button>{error&&<p role="alert">{error}</p>}</section>
 {draft&&<section className="panel"><h2>{draft.title}</h2><p>{draft.summary}</p><p><strong>Bozza salvata:</strong> {draft.id}</p><div style={{whiteSpace:'pre-wrap',lineHeight:1.7}}>{draft.body}</div><h3>Controlli di continuità da revisionare</h3><ul>{draft.continuity_notes.map((n,i)=><li key={i}>{n}</li>)}</ul><p>La pubblicazione resta disabilitata finché non viene implementato il workflow di approvazione.</p></section>}</main>;
}
