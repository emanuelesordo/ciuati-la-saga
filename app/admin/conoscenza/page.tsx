'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
type RecordRow={id:string|number;subject:string;detail:string;kind:string;source:string;date:string;author?:string};
type Subject={key:string;name:string;kind:string;detail:string};
export default function KnowledgeAdmin(){
 const [analyzing,setAnalyzing]=useState(false);const [allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[subjects,setSubjects]=useState<Subject[]>([]),[rows,setRows]=useState<RecordRow[]>([]),[subject,setSubject]=useState(''),[tab,setTab]=useState('knowledge'),[search,setSearch]=useState('');
 useEffect(()=>{let alive=true;async function load(){if(!supabase)return;const {data:{user}}=await supabase.auth.getUser();if(!alive)return;const ok=user?.app_metadata?.role==='admin';setAllowed(ok);setLoading(false);if(!ok)return;
 const [characters,places,events,facts,inputs,runs,revisions,relations,analyses]=await Promise.all([
 supabase.from('characters').select('id,display_name,biography,profile').limit(100),
 supabase.from('saga_places').select('id,name,description').limit(150),
 supabase.from('saga_events').select('slug,title,summary,created_at').limit(150),
 supabase.from('saga_memory_facts').select('id,subject,statement,classification,source_reference,created_at').order('created_at',{ascending:false}).limit(500),
 supabase.from('narrative_inputs').select('id,kind,content,character_id,target_character_id,author_id,mentions,created_at,status').order('created_at',{ascending:false}).limit(500),
 supabase.from('narrative_runs').select('id,title,summary,continuity_notes,created_at,status,context_snapshot').order('created_at',{ascending:false}).limit(100),
 supabase.from('character_dossier_revisions').select('id,character_id,editor,created_at,previous_dossier,new_dossier').order('created_at',{ascending:false}).limit(200),
 supabase.from('saga_character_relations').select('id,source_character_id,target_character_id,relationship,classification').limit(300),
 supabase.from('saga_subject_analyses').select('id,subject_key,subject_type,profile,evidence,created_at,model_name').order('created_at',{ascending:false}).limit(200)
 ]);
 const errors=[characters,places,events,facts,inputs,runs,revisions,relations,analyses].filter(r=>r.error).map(r=>r.error?.message);if(errors.length)setError(errors.join(' · '));
 const cs=characters.data||[];const ps=places.data||[];const es=events.data||[];
 const names=new Map<string,string>(cs.map(c=>[c.id,c.display_name]));ps.forEach(p=>names.set(p.id,p.name));
 setSubjects([...cs.map(c=>({key:c.id,name:c.display_name,kind:'Personaggio',detail:JSON.stringify({biografia:c.biography,profilo:c.profile},null,2)})),...ps.map(p=>({key:p.id,name:p.name,kind:'Luogo',detail:p.description||''})),...es.map(e=>({key:e.slug,name:e.title,kind:'Evento',detail:e.summary||''}))]);
 const list:RecordRow[]=[];
 (facts.data||[]).forEach(f=>list.push({id:'fact-'+f.id,subject:f.subject,detail:f.statement,kind:f.classification||'memoria',source:f.source_reference||'memoria',date:f.created_at}));
 (inputs.data||[]).forEach(i=>list.push({id:'input-'+i.id,subject:i.target_character_id||i.character_id||'',detail:i.content,kind:'contributo · '+i.kind+' · '+i.status,source:'utente '+i.author_id,date:i.created_at,author:i.author_id}));
 (runs.data||[]).forEach(r=>list.push({id:'run-'+r.id,subject:'',detail:r.title+' — '+r.summary+'\n'+JSON.stringify(r.continuity_notes||[]),kind:'elaborazione AI · '+r.status,source:'bozza '+r.id,date:r.created_at}));
 (revisions.data||[]).forEach(r=>list.push({id:'revision-'+r.id,subject:r.character_id,detail:'Precedente: '+JSON.stringify(r.previous_dossier)+'\nNuovo: '+JSON.stringify(r.new_dossier),kind:'revisione dossier',source:r.editor||'revisione',date:r.created_at}));
 (relations.data||[]).forEach(r=>list.push({id:'relation-'+r.id,subject:r.source_character_id,detail:'Verso '+(names.get(r.target_character_id)||r.target_character_id)+': '+r.relationship,kind:'relazione · '+r.classification,source:'archivio relazioni',date:''}));
 (analyses.data||[]).forEach(a=>list.push({id:'analysis-'+a.id,subject:a.subject_key,detail:JSON.stringify(a.profile,null,2),kind:'elaborazione AI · dossier verificabile',source:'Fonti congelate '+JSON.stringify(Object.fromEntries(Object.entries(a.evidence||{}).map(([k,v])=>[k,Array.isArray(v)?v.length:1])))+' · '+a.model_name,date:a.created_at}));
 if(alive)setRows(list);
 }void load();return()=>{alive=false}},[]);
 async function analyze(){if(!supabase||!subject)return;setAnalyzing(true);setError('');try{const target=subjects.find(s=>s.key===subject);if(!target)throw new Error('Soggetto non trovato');const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Accedi di nuovo');const response=await fetch('/api/admin/analisi',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({key:target.key,type:target.kind})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Analisi non riuscita');window.location.reload();}catch(e){setError(e instanceof Error?e.message:'Errore inatteso')}finally{setAnalyzing(false)}}
 const filtered=useMemo(()=>rows.filter(r=>{const normalized=subject?(r.subject===subject||r.subject===subjects.find(s=>s.key===subject)?.name||r.detail.toLowerCase().includes((subjects.find(s=>s.key===subject)?.name||'\0').toLowerCase())):true;const category=tab==='inputs'?r.kind.startsWith('contributo'):tab==='history'?(r.kind.startsWith('revisione')||r.kind.startsWith('elaborazione')):!r.kind.startsWith('contributo');return normalized&&category&&(r.detail+' '+r.kind+' '+r.source).toLowerCase().includes(search.toLowerCase());}),[rows,subject,tab,search,subjects]);
 return <main className="shell"><Link href="/admin">← Pannello Admin</Link><div className="eyebrow" style={{marginTop:35}}>MEMORIA SEGRETA</div><h1>Archivio della Conoscenza</h1>
 {loading?<p>Verifica accesso…</p>:!allowed?<p>Area riservata all'Admin. <Link href="/accedi">Accedi</Link></p>:<>
 <p>Fonti, testimonianze, memoria canonica, elaborazioni e variazioni storiche. I contributi sono opinioni attribuite, non verità automaticamente confermate.</p><p><Link href="/admin/narratore">Sala del Narratore →</Link></p>
 <section className="panel"><label htmlFor="subject">Soggetto</label><select id="subject" value={subject} onChange={e=>setSubject(e.target.value)} style={{display:'block',width:'100%',padding:12,background:'#171820',color:'white',margin:'12px 0'}}><option value="">Tutti i soggetti</option>{subjects.map(s=><option key={s.kind+s.key} value={s.key}>{s.kind} · {s.name}</option>)}</select>
 {subject&&<button type="button" disabled={analyzing} onClick={analyze} style={{margin:'8px 0 18px'}}>{analyzing?'Elaborazione in corso…':'Elabora dossier AI di questo soggetto'}</button>}
 {subjects.filter(s=>s.key===subject).map(s=><div key={s.key}><h2>{s.name}</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit',lineHeight:1.6}}>{s.detail}</pre></div>)}
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{[['knowledge','Conoscenza AI'],['inputs','Contributi originali'],['history','Evoluzione']].map(([id,label])=><button type="button" key={id} onClick={()=>setTab(id)} style={{background:tab===id?'#e5ae6b':'#333542',color:tab===id?'#16141a':'#f6f2e9'}}>{label}</button>)}</div><input aria-label="Filtra contenuti" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca nelle fonti" style={{width:'100%',marginTop:16}}/></section>
 <section className="panel"><h2>Registro ({filtered.length})</h2>{filtered.length===0&&<p>Nessun elemento per i filtri selezionati.</p>}{filtered.map(r=><article key={r.id} style={{borderBottom:'1px solid #494250',padding:'18px 0'}}><small style={{color:'#e5ae6b'}}>{r.kind} · {r.date?new Date(r.date).toLocaleString('it-IT'):''}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:16}}>{r.detail}</p><small>Fonte: {r.source}</small></article>)}</section>
 {error&&<p role="alert">{error}</p>}<p style={{fontSize:13}}>Il registro mostra fino a 500 contributi/fatti per categoria. Le deduzioni non vengono elevate automaticamente a canone. Le spiegazioni riguardano fonti e risultati, non processi interni del modello.</p>
 </>}</main>;
}