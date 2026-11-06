'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../../../lib/supabase';

type Dialogue={speaker:string;text:string};
type Panel={id:string;run_id:string;panel_number:number;scene:string;caption:string;dialogue:Dialogue[];cast_names:string[];mentions:string[];image_path:string|null;status:string;error_message:string|null;source_hash:string};
type Support={id:string;slug:string;display_name:string;description:string;portrait_path:string|null};
type Main={slug:string;display_name:string;avatar_path:string|null};
type Run={id:string;title:string;body:string;status:string};
const norm=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function safeNames(panel:Panel,main:Main[],support:Support[]){
 return (panel.cast_names||[]).filter(name=>{
  const key=norm(name), alias:Record<string,string>={viper:'scema',ceceno:'cece',scema:'scema',fromage:'le-fromage'};
  const known=main.find(c=>norm(c.display_name)===key||norm(c.slug)===(alias[key]||key));
  if(known)return !known.avatar_path;
  const side=support.find(c=>norm(c.display_name)===key||norm(c.slug)===key);
  return !side?.portrait_path||side.description.trim().length<15;
 });
}
export default function ComicStudio({run,autoStart}:{run:Run;autoStart:boolean}){
 const [panels,setPanels]=useState<Panel[]>([]),[support,setSupport]=useState<Support[]>([]),[main,setMain]=useState<Main[]>([]);
 const [images,setImages]=useState<Record<string,string>>({});
 const [portraitImages,setPortraitImages]=useState<Record<string,string>>({});
 const [view,setView]=useState<'comic'|'storyboard'|'mentioned'>('comic');
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);
 const started=useRef(new Set<string>());
 const alive=useRef(true);
 const refresh=useCallback(async()=>{
  if(!supabase)return [] as Panel[];
  const client=supabase;
  const [a,b,c]=await Promise.all([
   client.from('narrative_comic_panels').select('*').eq('run_id',run.id).order('panel_number'),
   client.from('comic_supporting_characters').select('*').order('display_name'),
   client.from('characters').select('slug,display_name,avatar_path').eq('is_published',true)
  ]);
  if(a.error||b.error||c.error)throw new Error(a.error?.message||b.error?.message||c.error?.message||'Archivio fumetti non disponibile');
  const ps=(a.data||[]) as Panel[],s=(b.data||[]) as Support[];
  if(alive.current){setPanels(ps);setSupport(s);setMain((c.data||[]) as Main[]);setLoading(false);}
  const paths=[...ps.filter(p=>p.image_path).map(p=>({id:p.id,path:p.image_path!})),...s.filter(x=>x.portrait_path).map(x=>({id:x.id,path:x.portrait_path!}))];
  const unique=[...new Set(paths.map(p=>p.path))];
  if(unique.length){
   const {data}=await client.storage.from('comic-drafts').createSignedUrls(unique,3600);
   const byPath=new Map((data||[]).filter(x=>x.signedUrl).map(x=>[x.path,x.signedUrl!]));
   if(alive.current){
    setImages(Object.fromEntries(ps.filter(p=>p.image_path).map(p=>[p.id,byPath.get(p.image_path!)||''])));
    setPortraitImages(Object.fromEntries(s.filter(p=>p.portrait_path).map(p=>[p.id,byPath.get(p.portrait_path!)||''])));
   }
  }
  return ps;
 },[run.id]);
 const api=useCallback(async(path:string,values:object)=>{
  if(!supabase)throw new Error('Sessione non disponibile.');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Accedi come Admin.');
  const result=await fetch(path,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(values)});
  const payload=await result.json();
  if(!result.ok){
   const error=new Error(payload.error||'Operazione non riuscita.') as Error&{httpStatus?:number;reason?:string;retryAfterSeconds?:number|null};
   error.httpStatus=result.status;
   error.reason=typeof payload.reason==='string'?payload.reason:undefined;
   error.retryAfterSeconds=typeof payload.retryAfterSeconds==='number'?payload.retryAfterSeconds:null;
   throw error;
  }
  return payload;
 },[]);
 const draw=useCallback(async(items:Panel[],force=false)=>{
  const client=supabase;
  if(!client)return;
  setBusy('Generazione delle vignette…');
  let created=0,blocked=0,errors:string[]=[];
  const {data:chars}=await client.from('characters').select('slug,display_name,avatar_path').eq('is_published',true);
  const {data:secondaries}=await client.from('comic_supporting_characters').select('*');
  for(const p of items){
   if(!force&&p.image_path)continue;
   const missing=safeNames(p,(chars||[]) as Main[],(secondaries||[]) as Support[]);
   if(missing.length){blocked++;continue;}
   setNotice('Gemini sta illustrando la vignetta '+p.panel_number+' di '+items.length+'…');
   try{await api('/api/narratore/comic',{run_id:run.id,panel_number:p.panel_number,force});created++;}
   catch(err){
    const issue=err as Error&{httpStatus?:number;reason?:string;retryAfterSeconds?:number|null};
    errors.push('Vignetta '+p.panel_number+': '+(err instanceof Error?err.message:'errore'));
    if(issue.httpStatus===429||issue.reason==='rate_limit'||issue.reason==='quota_or_billing'){
     await refresh();
     setNotice('Generazione interrotta alla vignetta '+p.panel_number+': quota o limite Gemini Image. Le altre vignette non sono state ritentate. '+errors.join(' | '));
     setBusy('');
     return;
    }
   }
   await refresh();
  }
  setBusy('');
  setNotice('Illustrazioni create: '+created+'. In attesa di foto/schede: '+blocked+'.'+(errors.length?' '+errors.join(' | '):''));
 },[api,refresh,run.id]);
 const storyboard=useCallback(async(force=false,autoDraw=false)=>{
  try{
   setBusy('Gemini prepara lo storyboard…');setNotice('');
   const result=await api('/api/narratore/storyboard',{run_id:run.id,regenerate:force});
   const ps=(result.panels||[]) as Panel[];
   setPanels(ps);setView('comic');
   setBusy('');await refresh();
   if(autoDraw)await draw(ps);
  }catch(e){setBusy('');setNotice(e instanceof Error?e.message:'Errore nello storyboard');}
 },[api,run.id,refresh,draw]);
 useEffect(()=>{
  alive.current=true;setLoading(true);setPanels([]);setImages({});setNotice('');setBusy('');
  let active=true;
  void (async()=>{
   try{const ps=await refresh();if(!active)return;
    if(autoStart&&!started.current.has(run.id)&&ps.length===0){
     started.current.add(run.id);
     await storyboard(false,true);
    }
   }catch(e){if(active){setLoading(false);setNotice(e instanceof Error?e.message:'Errore caricamento');}}
  })();
  return()=>{active=false;alive.current=false;};
 },[run.id,refresh,storyboard,autoStart]);
 const mentioned=[...new Set(panels.flatMap(p=>[...(p.cast_names||[]),...(p.mentions||[]),...(p.dialogue||[]).map(d=>d.speaker)]))];
 const protagonists=new Set(main.flatMap(c=>[norm(c.slug),norm(c.display_name),'viper','ceceno','fromage']));
 const missingProfiles=support.filter(s=>mentioned.some(n=>norm(n)===norm(s.display_name)||norm(n)===norm(s.slug))&&!protagonists.has(norm(s.display_name)));
 async function updateInfo(person:Support,description:string){
  if(!supabase)return;
  setBusy('Salvataggio scheda…');
  try{const {error}=await supabase.from('comic_supporting_characters').update({description:description.trim().slice(0,2000),updated_at:new Date().toISOString()}).eq('id',person.id);
   if(error)throw error;setNotice('Scheda salvata.');await refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Errore salvataggio');}finally{setBusy('');}
 }
 async function upload(person:Support,file:File){
  if(!supabase)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setNotice('Usa JPG, PNG o WebP fino a 5 MB.');return;}
  setBusy('Caricamento volto…');
  try{
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
   const path='support/'+person.slug+'/'+crypto.randomUUID()+'.'+ext;
   const up=await supabase.storage.from('comic-drafts').upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   const {error}=await supabase.from('comic_supporting_characters').update({portrait_path:path,updated_at:new Date().toISOString()}).eq('id',person.id);
   if(error)throw error;setNotice('Foto caricata. Il personaggio potrà essere illustrato quando la scheda sarà completa.');await refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Errore caricamento');}finally{setBusy('');}
 }
 const readyCount=panels.filter(p=>!!p.image_path).length;
 return <section className="panel comic-studio" aria-label="Studio fumetto">
  <div className="comic-studio-head"><div><div className="eyebrow">LABORATORIO COMICS</div><h2>Fumetto: {run.title}</h2></div><span className="comic-counter">{readyCount}/{panels.length} vignette</span></div>
  <p>Illustrazioni Gemini con i volti canonici. I personaggi senza scheda e foto restano esclusi dalle immagini. Nessuna pubblicazione automatica.</p>
  <p style={{fontSize:13,color:'#dcb687'}}>Auronerum: vessilli gialloneri. «La Casta» è il soprannome segreto della dirigenza. Per errori 429 controlla <a href="https://aistudio.google.com/usage?timeRange=last-7-days&tab=rate-limit" target="_blank" rel="noreferrer">quote Gemini in AI Studio</a> e verifica se il modello immagini è abilitato alla fatturazione.</p>
  <div className="comic-actions">
   <button disabled={!!busy||loading} onClick={()=>void storyboard(false,true)}>{panels.length?'Completa il fumetto':'Elabora fumetto Gemini'}</button>
   {panels.length>0&&<button disabled={!!busy} onClick={()=>void draw(panels)}>Genera vignette mancanti</button>}
   {panels.length>0&&<button disabled={!!busy} onClick={()=>{if(window.confirm('Rigenerare lo storyboard? Le illustrazioni correnti non saranno più collegate a questa bozza.'))void storyboard(true,false);}}>Rifai storyboard</button>}
  </div>
  <nav className="comic-tabs" aria-label="Visualizzazione del fumetto">
   <button className={view==='comic'?'active':''} onClick={()=>setView('comic')}>Fumetto</button>
   <button className={view==='storyboard'?'active':''} onClick={()=>setView('storyboard')}>Storyboard</button>
   <button className={view==='mentioned'?'active':''} onClick={()=>setView('mentioned')}>Personaggi da completare ({missingProfiles.length})</button>
  </nav>
  {loading?<p>Caricamento…</p>:!panels.length?<div className="comic-empty">Storyboard non ancora generato. La bozza narrativa resta invariata.</div>:null}
  {view==='comic'&&<div className="comic-pages">{panels.map(p=>{
   const unknown=safeNames(p,main,support);
   return <article key={p.id} className="comic-frame">
    <div className="comic-image">
     {p.image_path&&images[p.id]?<a href={images[p.id]} target="_blank" rel="noreferrer"><img src={images[p.id]} alt={'Illustrazione '+p.panel_number+': '+p.scene}/></a>
      :<div className="comic-image-empty"><strong>VIGNETTA {p.panel_number}</strong><span>{unknown.length?'Volti in attesa: '+unknown.join(', '):'Illustrazione da generare'}</span><small>{p.scene}</small></div>}
    </div>
    {p.caption&&<p className="comic-caption">{p.caption}</p>}
    {(p.dialogue||[]).length>0&&<div className="comic-dialogues">{p.dialogue.map((line,i)=><div className="comic-balloon" key={i}><b>{line.speaker}</b><span>{line.text}</span></div>)}</div>}
    <div className="comic-frame-footer"><span>Vignetta {p.panel_number} · {p.status}</span><button disabled={!!busy||unknown.length>0} onClick={()=>void draw([p],!!p.image_path)}>{p.image_path?'Rigenera':'Illustra'}</button></div>
   </article>;
  })}</div>}
  {view==='storyboard'&&<div className="comic-storyboard">{panels.map(p=><article key={p.id} className="comic-story-card"><h3>Vignetta {p.panel_number}</h3><p>{p.scene}</p><small>In scena: {(p.cast_names||[]).join(', ')||'solo ambientazione'}</small><small>Citati: {(p.mentions||[]).join(', ')||'nessuno'}</small></article>)}</div>}
  {view==='mentioned'&&<div className="comic-support-grid">{missingProfiles.map(person=><SupportingEditor key={person.id} person={person}image={portraitImages[person.id]}busy={!!busy} onSave={updateInfo} onUpload={upload}/>)}{!missingProfiles.length&&<p>Nessun personaggio secondario menzionato da completare.</p>}</div>}
  {busy&&<p role="status" className="comic-status">{busy}</p>}
  {notice&&<p role="status" className="comic-status">{notice}</p>}
 </section>;
}
function SupportingEditor({person,image,busy,onSave,onUpload}:{person:Support;image?:string;busy:boolean;onSave:(p:Support,description:string)=>Promise<void>;onUpload:(p:Support,file:File)=>Promise<void>}){
 const [description,setDescription]=useState(person.description||'');
 useEffect(()=>setDescription(person.description||''),[person.id,person.description]);
 const ready=description.trim().length>=15&&!!person.portrait_path;
 return <article className="comic-support-card">
  <div className="comic-support-portrait">{image?<img src={image} alt={'Volto di '+person.display_name}/>:<span>Foto mancante</span>}</div>
  <h3>{person.display_name}</h3><small>{ready?'Pronto per le vignette':'Da completare prima della generazione'}</small>
  <label>Informazioni essenziali<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} placeholder="Ruolo, aspetto, caratteristiche, legami…"/></label>
  <button disabled={busy||description.trim().length<15} onClick={()=>void onSave(person,description)}>Salva scheda</button>
  <label className="comic-upload">Carica foto JPG, PNG, WebP<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void onUpload(person,file);e.target.value='';}}/></label>
 </article>;
}
