'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';

type Dossier={id:string;slug:string;display_name:string;description:string;is_published:boolean};
type Proposal={id:string;content:string;status:string;created_at:string;proposal:{name?:string;origin?:string;traits?:string;role?:string}|null};
export default function PersonaggiSecondariAdmin(){
 const [dossiers,setDossiers]=useState<Dossier[]>([]),[dossierBusy,setDossierBusy]=useState<string|null>(null);
 const [allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[items,setItems]=useState<Proposal[]>([]),[error,setError]=useState(''),[query,setQuery]=useState(''),[editing,setEditing]=useState<string|null>(null),[addition,setAddition]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function refresh(){
  if(!supabase){setError('Archivio non configurato.');setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||user?.app_metadata?.role!=='admin'){setAllowed(false);setLoading(false);return;}
  setAllowed(true);
  const dossierResult=await supabase.from('secondary_characters').select('id,slug,display_name,description,is_published').order('display_name');
  if(dossierResult.data)setDossiers(dossierResult.data as Dossier[]);
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
 async function saveDossier(item:Dossier,description:string,published:boolean){
  if(!supabase||dossierBusy)return;
  setDossierBusy(item.id);setError('');setNotice('');
  const {data,error:saveError}=await supabase.from('secondary_characters').update({description:description.trim().slice(0,4000),is_published:published}).eq('id',item.id).select('id,slug,display_name,description,is_published').single();
  if(saveError||!data)setError('Salvataggio scheda non riuscito: '+(saveError?.message||'nessuna scheda aggiornata'));
  else {setDossiers(old=>old.map(x=>x.id===item.id?data as Dossier:x));setNotice('Scheda di '+item.display_name+' aggiornata.');}
  setDossierBusy(null);
 }
 return <main className="shell"><Link href="/admin">← Pannello Admin</Link><div className="eyebrow" style={{marginTop:35}}>ARCHIVIO SEPARATO</div><h1>Personaggi della Saga</h1>
 {loading?<p>Verifica archivio…</p>:!allowed?<p>Area riservata all'Admin. <Link href="/accedi">Accedi</Link></p>:<>
 <p>Personaggi secondari e proposte: indipendenti dai sei Ciuati e senza account personale. Le integrazioni sono datate e conservano il testo precedente.</p>
 <section className="panel"><h2>Schede dei personaggi</h2><p>Le nuove proposte creano automaticamente una bozza privata. Revisiona il testo prima di pubblicarlo.</p>{dossiers.map(d=><DossierEditor key={d.id} item={d} busy={dossierBusy===d.id} onSave={saveDossier}/>)}</section>
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

function DossierEditor({item,busy,onSave}:{item:Dossier;busy:boolean;onSave:(item:Dossier,description:string,published:boolean)=>Promise<void>}){
 const [description,setDescription]=useState(item.description),[published,setPublished]=useState(item.is_published);
 useEffect(()=>{setDescription(item.description);setPublished(item.is_published)},[item]);
 return <div style={{padding:'16px 0',borderTop:'1px solid currentColor'}}><h3>{item.display_name}</h3><small>{item.is_published?'Pubblicato':'Bozza privata'} · {item.slug}</small>
 <label style={{display:'block',marginTop:12}}>Descrizione pubblica<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} maxLength={4000} style={{display:'block',width:'100%',marginTop:8}}/></label>
 <label style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/>Pubblica la scheda</label>
 <button type="button" disabled={busy||!description.trim()} onClick={()=>void onSave(item,description,published)}>{busy?'Salvataggio…':'Salva scheda'}</button>
 </div>;
}
