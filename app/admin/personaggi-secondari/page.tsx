'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';

type Proposal={id:string;content:string;status:string;created_at:string;proposal:{name?:string;origin?:string;traits?:string;role?:string}|null};
export default function PersonaggiSecondariAdmin(){
 const [allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[items,setItems]=useState<Proposal[]>([]),[error,setError]=useState(''),[query,setQuery]=useState(''),[editing,setEditing]=useState<string|null>(null),[addition,setAddition]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function refresh(){
  if(!supabase){setError('Archivio non configurato.');setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||user?.app_metadata?.role!=='admin'){setAllowed(false);setLoading(false);return;}
  setAllowed(true);
  const {data,error:dbError}=await supabase.from('narrative_inputs').select('id,content,status,created_at,proposal').eq('kind','character_proposal').order('created_at',{ascending:false}).limit(500);
  if(dbError)setError('Impossibile leggere le proposte: '+dbError.message);
  else {setItems((data||[]) as Proposal[]);setError('');}
  setLoading(false);
 }
 useEffect(()=>{void refresh()},[]);
 const filtered=useMemo(()=>items.filter(p=>((p.proposal?.name||'')+' '+p.content).toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))),[items,query]);
 async function addNote(p:Proposal){
  if(!supabase||!addition.trim()||busy)return;
  setBusy(true);setError('');setNotice('');
  const note='\n\n[Integrazione Admin · '+new Date().toLocaleString('it-IT')+']\n'+addition.trim();
  if((p.content+note).length>30000){setError('Testo troppo lungo per una sola scheda.');setBusy(false);return;}
  const {data,error:dbError}=await supabase.from('narrative_inputs').update({content:p.content+note}).eq('id',p.id).select('id,content').single();
  if(dbError||!data){setError('Salvataggio fallito: '+(dbError?.message||'nessuna riga aggiornata'));setBusy(false);return;}
  setItems(old=>old.map(item=>item.id===p.id?{...item,content:data.content}:item));
  setEditing(null);setAddition('');setNotice('Integrazione salvata nella scheda di '+(p.proposal?.name||'personaggio')+'.');setBusy(false);
 }
 return <main className="shell"><Link href="/admin">← Pannello Admin</Link><div className="eyebrow" style={{marginTop:35}}>ARCHIVIO SEPARATO</div><h1>Personaggi della Saga</h1>
 {loading?<p>Verifica archivio…</p>:!allowed?<p>Area riservata all'Admin. <Link href="/accedi">Accedi</Link></p>:<>
 <p>Personaggi secondari e proposte: indipendenti dai sei Ciuati e senza account personale. Le integrazioni sono datate e conservano il testo precedente.</p>
 <section className="panel"><label htmlFor="search-secondary">Cerca personaggio</label><input id="search-secondary" style={{width:'100%',marginTop:10}} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Gatto, Volpe, Dottore, Tolkien…"/><p>{filtered.length} proposte trovate</p></section>
 {filtered.length===0&&<section className="panel"><p>Nessun personaggio trovato. Se hai appena inviato i dati, verifica il messaggio di conferma e la presenza nella tabella dei contributi.</p></section>}
 {filtered.map(p=><section className="panel" key={p.id}><div className="eyebrow">{p.status==='pending'?'IN ATTESA':p.status.toUpperCase()}</div><h2>{p.proposal?.name||'Personaggio senza nome'}</h2>
 <small>Inserito: {new Date(p.created_at).toLocaleString('it-IT')} · ID {p.id}</small>
 {p.proposal?.origin&&<p><strong>Origine:</strong> {p.proposal.origin}</p>}
 {p.proposal?.traits&&<p><strong>Carattere:</strong> {p.proposal.traits}</p>}
 {p.proposal?.role&&<p><strong>Ruolo:</strong> {p.proposal.role}</p>}
 <details><summary>Mostra tutti i dati salvati e la cronologia delle integrazioni</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{p.content}</p></details>
 {editing===p.id?<div style={{display:'grid',gap:12,marginTop:18}}><label htmlFor={'note-'+p.id}>Nuove informazioni (senza cancellare le precedenti)</label><textarea id={'note-'+p.id} rows={5} value={addition} onChange={e=>setAddition(e.target.value)} maxLength={6000}/><button type="button" disabled={busy||!addition.trim()} onClick={()=>void addNote(p)}>{busy?'Salvataggio…':'Salva integrazione'}</button><button type="button" disabled={busy} onClick={()=>{setEditing(null);setAddition('')}}>Annulla</button></div>:<button type="button" onClick={()=>{setEditing(p.id);setAddition('');setNotice('')}}>Aggiungi informazioni</button>}
 </section>)}
 <p><Link href="/admin/conoscenza">Consulta anche l'Archivio della Conoscenza →</Link></p>
 </>}
 {notice&&<p className="panel" role="status">{notice}</p>}{error&&<p className="panel" role="alert">{error}</p>}
 </main>;
}
