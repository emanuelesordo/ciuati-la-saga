'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';

type Draft={id:string;title:string;summary:string;body:string;continuity_notes:string[];created_at:string;status:string;review_notes:string|null;published_episode_id:string|null};
export default function NarratoreAdmin(){
 const [idea,setIdea]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[drafts,setDrafts]=useState<Draft[]>([]),[selected,setSelected]=useState<string|null>(null),[authorized,setAuthorized]=useState(false),[loading,setLoading]=useState(true),[instruction,setInstruction]=useState('');
 const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[body,setBody]=useState(''),[notes,setNotes]=useState('');
 const draft=drafts.find(d=>d.id===selected);
 async function refresh(){if(!supabase)return;const {data:{user}}=await supabase.auth.getUser();const ok=user?.app_metadata?.role==='admin';setAuthorized(ok);setLoading(false);if(!ok)return;const {data,error}=await supabase.from('narrative_runs').select('id,title,summary,body,continuity_notes,created_at,status,review_notes,published_episode_id').order('created_at',{ascending:false}).limit(80);if(error)setError(error.message);else setDrafts((data||[]) as Draft[]);}
 useEffect(()=>{void refresh();},[]);
 function choose(d:Draft){setSelected(d.id);setTitle(d.title);setSummary(d.summary);setBody(d.body);setNotes(d.review_notes||'');}
 async function act(operation:'generate'|'save'|'review'|'approve'|'publish'|'reject'){
  if(!supabase)return;setBusy(true);setError('');
  try{
   if(operation==='generate'){const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Accedi come Admin.');const response=await fetch('/api/narratore',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({idea:idea+(instruction?'\nIndicazione editoriale: '+instruction:'')})});const result=await response.json();if(!response.ok||!result.draft)throw new Error(result.error||'Generazione fallita.');await refresh();choose({...result.draft,status:'draft',review_notes:null,published_episode_id:null});return;}
   if(!draft)throw new Error('Seleziona una bozza.');
   if(draft.status==='published')throw new Error('L’episodio pubblicato non si modifica.');
   if(operation==='save'){
    if(!title.trim()||!summary.trim()||body.trim().length<300)throw new Error('Titolo, riassunto e almeno 300 caratteri sono obbligatori.');
    const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sessione scaduta.');
    const revision=await supabase.from('narrative_run_revisions').insert({run_id:draft.id,editor_id:user.id,title:draft.title,summary:draft.summary,body:draft.body,review_notes:draft.review_notes});
    if(revision.error)throw revision.error;
    const result=await supabase.from('narrative_runs').update({title:title.trim(),summary:summary.trim(),body:body.trim(),review_notes:notes,status:'review',reviewed_at:new Date().toISOString()}).eq('id',draft.id).select('id').single();if(result.error)throw result.error;
   }else if(operation==='publish'){
    const {error}=await supabase.rpc('publish_approved_narrative',{p_run_id:draft.id});if(error)throw error;
   }else{
    const status=operation==='review'?'review':operation==='approve'?'approved':'rejected';
    const {error}=await supabase.from('narrative_runs').update({status,review_notes:notes,reviewed_at:new Date().toISOString()}).eq('id',draft.id);if(error)throw error;
   }
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Errore inatteso');}finally{setBusy(false);}
 }
 return <main className="shell"><Link href="/admin">← Pannello Admin</Link><div className="eyebrow" style={{marginTop:35}}>SALA DEL NARRATORE</div><h1>Regia degli episodi</h1>
 {loading?<p>Verifica accesso…</p>:!authorized?<p>Accesso riservato all'Admin. <Link href="/accedi">Accedi</Link></p>:<>
 <p><Link href="/admin/conoscenza">Archivio della Conoscenza →</Link> · <Link href="/cronache">Cronache pubbliche →</Link></p>
 <section className="panel"><h2>Genera nuovo episodio</h2><p>La generazione crea soltanto una bozza, mai una pubblicazione.</p><textarea aria-label="Spunto narrativo" rows={4} maxLength={1600} value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Spunto facoltativo" style={{width:'100%'}}/><input aria-label="Istruzioni editoriali" maxLength={350} value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Indicazione editoriale facoltativa" style={{width:'100%',marginTop:10}}/><p><button disabled={busy} onClick={()=>act('generate')}>Genera bozza</button></p></section>
 <section className="panel"><h2>Archivio delle bozze</h2><div style={{display:'grid',gap:10}}>{drafts.map(d=><button key={d.id} onClick={()=>choose(d)} style={{textAlign:'left',background:d.id===selected?'#57452d':'#282732',color:'#f5e7cb'}}>{d.title} · {d.status} · {new Date(d.created_at).toLocaleDateString('it-IT')}</button>)}{!drafts.length&&<p>Nessuna bozza salvata.</p>}</div></section>
 {draft&&<section className="panel"><h2>Revisione: {draft.title}</h2><p>Stato: <strong>{draft.status}</strong></p><label>Titolo<input value={title} disabled={busy||draft.status==='published'} onChange={e=>setTitle(e.target.value)} style={{width:'100%'}}/></label><label>Sinossi<textarea rows={3} value={summary} disabled={busy||draft.status==='published'} onChange={e=>setSummary(e.target.value)} style={{width:'100%'}}/></label><label>Testo completo<textarea rows={22} value={body} disabled={busy||draft.status==='published'} onChange={e=>setBody(e.target.value)} style={{width:'100%',lineHeight:1.6}}/></label><h3>Controlli di continuità AI</h3><ul>{(draft.continuity_notes||[]).map((n,i)=><li key={i}>{n}</li>)}</ul><label>Note di revisione<textarea rows={3} value={notes} disabled={busy||draft.status==='published'} onChange={e=>setNotes(e.target.value)} style={{width:'100%'}}/></label><div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:20}}>{draft.status!=='published'&&<><button disabled={busy} onClick={()=>act('save')}>Salva revisione</button><button disabled={busy} onClick={()=>act('review')}>In revisione</button><button disabled={busy} onClick={()=>act('reject')}>Scarta</button><button disabled={busy||title!==draft.title||summary!==draft.summary||body!==draft.body} onClick={()=>act('approve')}>Approva</button></>}{draft.status==='approved'&&<button disabled={busy} onClick={()=>act('publish')}>Pubblica nelle Cronache</button>}{draft.published_episode_id&&<Link href={'/cronache/'+draft.published_episode_id}>Leggi episodio →</Link>}</div><p style={{fontSize:13}}>Le modifiche devono essere salvate prima dell'approvazione. Pubblicazione possibile soltanto dopo l'approvazione.</p></section>}
 {error&&<p role="alert" className="panel">{error}</p>}</>}</main>;
}
