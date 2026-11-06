'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../../../lib/supabase';
import {unzipComic} from '../../../lib/comic-zip-client';

type Dialogue={speaker:string;text:string};
type Panel={id:string;run_id:string;panel_number:number;scene:string;caption:string;dialogue:Dialogue[];cast_names:string[];mentions:string[];image_path:string|null;status:string;error_message:string|null;source_hash:string};
type Support={id:string;slug:string;display_name:string;description:string;portrait_path:string|null};
type Main={slug:string;display_name:string;avatar_path:string|null};
type PlaceReference={slug:string;name:string;image_url:string|null;real_world_reference:string|null};
type Run={id:string;title:string;body:string;status:string};
const norm=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function missingFaces(panel:Panel,main:Main[],support:Support[]){
 return (panel.cast_names||[]).filter(name=>{
  const key=norm(name),alias:Record<string,string>={viper:'scema',ceceno:'cece',scema:'scema',fromage:'le-fromage'};
  const known=main.find(c=>norm(c.display_name)===key||norm(c.slug)===(alias[key]||key));
  if(known)return !known.avatar_path;
  const side=support.find(c=>norm(c.display_name)===key||norm(c.slug)===key);
  return !side?.portrait_path||side.description.trim().length<15;
 });
}
function promptForChatGPT(run:Run,panels:Panel[],main:Main[],support:Support[],signedPortraits:Record<string,string>,placeReferences:PlaceReference[],siteOrigin:string){
 const ready=panels.filter(p=>missingFaces(p,main,support).length===0);
 const blocked=panels.filter(p=>missingFaces(p,main,support).length>0);
 const used=new Set(ready.flatMap(p=>p.cast_names.map(norm)));
 const reference=main.filter(c=>used.has(norm(c.display_name))||used.has(norm(c.slug))||(c.slug==='scema'&&used.has('viper')))
  .map(c=>'- '+c.display_name+': '+(c.avatar_path||'nessun ritratto'));
 const refsSupport=support.filter(s=>used.has(norm(s.display_name))||used.has(norm(s.slug))).map(s=>'- '+s.display_name+': '+(signedPortraits[s.id]||'immagine non accessibile: allegare il riferimento originale.'));
 const locationsText=[run.body,...panels.map(p=>p.scene)].join(' ').toLocaleLowerCase('it');
 const refsPlaces=placeReferences.filter(p=>p.image_url&&(locationsText.includes(p.name.toLocaleLowerCase('it'))||locationsText.includes(p.slug.replaceAll('-',' '))||(p.slug==='white-pony'&&(locationsText.includes('white pony')||locationsText.includes('cavallo bianco'))))).map(p=>'- '+p.name+' ('+(p.real_world_reference||'riferimento da definire')+'): '+new URL(p.image_url!,siteOrigin).href);
 return [
  'REALIZZA LE ILLUSTRAZIONI DEL FUMETTO «'+run.title+'» — CIUATI LA SAGA.',
  'Voglio immagini effettive, non descrizioni delle immagini. Genera i file e raccoglili in UN SOLO ZIP scaricabile.',
  'Per ogni vignetta produci UNA SOLA immagine verticale 4:5 in PNG o JPG, senza balloon, didascalie o testi incorporati: il sito aggiungerà i dialoghi.',
  'STILE COERENTE: fumetto comics europeo fantasy grottesco, tratto a inchiostro, luci drammatiche, palette calda, volti fedeli alle fotografie di riferimento. NON reinventare i volti. Chiedimi le foto se non riesci ad aprire i riferimenti.',
  'LUOGHI: ogni località della Saga trasfigura un luogo reale. Usa i dettagli riconoscibili della sua origine geografica, adattandoli in modo medievale-fantasy senza sostituirli con ambientazioni generiche.',
  'IL CAVALLO BIANCO (White Pony): trasposizione fantasy dello storico White Pony Pub & Beershop, Corso Vittorio Emanuele II 185, Padova. Riferimento fotografico reale: https://www.blogdipadova.it/white-pony-pub-birra-artigianale-padova/ . Mantieni disposizione e scala di un piccolo pub sotto i portici, bancone della birra, lavagna e assortimento di bottiglie; traduci arredamento in locanda fantasy, evitando la taverna generica. Rob e Robertus Gran Cru soltanto se pertinenti alla scena. Il Cavallo Bianco e il White Pony sono lo stesso luogo.',
  'SVILARNA: trasposizione fantasy dell’altopiano della Sila, Calabria: montagne appenniniche, altopiani, foreste di pini larici silani, laghi e brume. Mantieni morfologia e vegetazione silana, non paesaggi alpini o fiordi nordici.',
  'Per gli altri luoghi segui descrizione e geografia canoniche; non inventare una corrispondenza reale se manca una fonte accertata. Conserva continuità architettonica nelle vignette.',
  'AURONERUM: ordine di guerrieri GIALLO e NERO; araldica, insegne, stendardi e armature giallonere. La dirigenza è chiamata segretamente «La Casta» dai Ciuati (non scrivere questa espressione nelle immagini).',
  'CONFINI: i nomi degli antagonisti restano mascherati (il Gatto e la Volpe, il Dottore, Pollicino, la Pecora); Tolkien è l’unico nome del veterano. Non inserire sport, calcio, fantacalcio, interfacce, immagini di chat o metanarrazione.',
  'DISEGNA SOLTANTO i personaggi elencati sotto CAST VISIBILE per ciascuna vignetta, senza comparse, sagome o figure extra. Se CAST VISIBILE è vuoto, disegna un ambiente senza esseri umani.',
  'NON DISEGNARE le figure menzionate ma non presenti nel CAST VISIBILE. Non anticipare le identità degli antagonisti.',
  'CONSEGNA: ZIP con i file esattamente nominati vignetta-01.png, vignetta-02.png ecc. (o .jpg), ciascuno corrispondente al numero dello storyboard. Non rinumerare e non creare un’unica tavola. Massimo 6 MB per immagine; ZIP massimo 50 MB.',
  'La storia completa qui sotto è solo un riferimento di continuità; gli elementi descritti per le vignette sono vincolanti.',
  '',
  'TRAMA ORIGINALE:',
  run.body,
  '',
  'STORYBOARD DI QUESTA VERSIONE:',
  ...ready.flatMap(p=>[
   '',
   'VIGNETTA '+String(p.panel_number).padStart(2,'0')+' — file vignetta-'+String(p.panel_number).padStart(2,'0')+'.png',
   'CAST VISIBILE: '+(p.cast_names.join(', ')||'nessuno: soltanto ambientazione'),
   'AMBIENTE E AZIONE: '+p.scene,
   'DIDASCALIA (NON da scrivere nell’immagine): '+(p.caption||'nessuna'),
   'DIALOGHI (NON da scrivere nell’immagine): '+(p.dialogue.map(d=>d.speaker+': '+d.text).join(' | ')||'nessuno'),
   'PERSONAGGI SOLO MENZIONATI, DA NON DISEGNARE: '+(p.mentions.join(', ')||'nessuno')
  ]),
  '',
  'RIFERIMENTI VISIVI DEI PERSONAGGI AUTORIZZATI (URL automatici dal progetto; non inventare sembianze):',
  ...reference,...refsSupport,
  'RIFERIMENTI VISIVI DEI LUOGHI PRESENTI NELLA STORIA (illustrazioni canoniche del progetto):',
  ...(refsPlaces.length?refsPlaces:['Nessun luogo dell’atlante riconosciuto nel testo; preservare le descrizioni delle scene.']),
  '',
  blocked.length?'VIGNETTE NON AUTORIZZATE IN QUESTO ZIP (mancano foto/schede): '+blocked.map(p=>'n. '+p.panel_number+' — '+missingFaces(p,main,support).join(', ')).join('; '):'Tutte le vignette dello storyboard possono essere illustrate.',
  'Non generare file per vignette escluse. Le immagini mancanti saranno aggiunte in seguito, una volta completate le relative schede.',
  '',
  'Appena finito, crea e condividi lo ZIP delle vignette. Non creare immagini che raffigurano personaggi ancora senza riferimento approvato.'
 ].join('\n');
}
export default function ComicStudio({run,autoStart}:{run:Run;autoStart:boolean}){
 const [panels,setPanels]=useState<Panel[]>([]),[support,setSupport]=useState<Support[]>([]),[main,setMain]=useState<Main[]>([]),[places,setPlaces]=useState<PlaceReference[]>([]);
 const [images,setImages]=useState<Record<string,string>>({}),[portraitImages,setPortraitImages]=useState<Record<string,string>>({});
 const [view,setView]=useState<'comic'|'storyboard'|'mentioned'>('comic');
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);
 const started=useRef(new Set<string>()),alive=useRef(true);
 const refresh=useCallback(async()=>{
  if(!supabase)return [] as Panel[];
  const client=supabase;
  const [a,b,c,d]=await Promise.all([
   client.from('narrative_comic_panels').select('*').eq('run_id',run.id).order('panel_number'),
   client.from('comic_supporting_characters').select('*').order('display_name'),
   client.from('characters').select('slug,display_name,avatar_path').eq('is_published',true),
   client.from('saga_places').select('slug,name,image_url,real_world_reference').eq('is_published',true)
  ]);
  if(a.error||b.error||c.error||d.error)throw new Error(a.error?.message||b.error?.message||c.error?.message||d.error?.message||'Archivio non disponibile.');
  const ps=(a.data||[]) as Panel[],s=(b.data||[]) as Support[];
  if(alive.current){setPanels(ps);setSupport(s);setMain((c.data||[]) as Main[]);setPlaces((d.data||[]) as PlaceReference[]);setLoading(false);}
  const paths=[...ps.filter(p=>p.image_path).map(p=>p.image_path!),...s.filter(x=>x.portrait_path).map(x=>x.portrait_path!)];
  const unique=[...new Set(paths)];
  if(unique.length){
   const {data}=await client.storage.from('comic-drafts').createSignedUrls(unique,3600);
   const byPath=new Map((data||[]).filter(x=>x.signedUrl).map(x=>[x.path,x.signedUrl!]));
   if(alive.current){
    setImages(Object.fromEntries(ps.filter(p=>p.image_path).map(p=>[p.id,byPath.get(p.image_path!)||''])));
    setPortraitImages(Object.fromEntries(s.filter(p=>p.portrait_path).map(p=>[p.id,byPath.get(p.portrait_path!)||''])));
   }
  }else if(alive.current){setImages({});setPortraitImages({});}
  return ps;
 },[run.id]);
 const storyboard=useCallback(async(force=false)=>{
  if(!supabase)return;
  setBusy('Gemini prepara lo storyboard…');setNotice('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw new Error('Accedi come Admin.');
   const response=await fetch('/api/narratore/storyboard',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({run_id:run.id,regenerate:force})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Storyboard non generato.');
   setPanels((result.panels||[]) as Panel[]);
   await refresh();
   setView('storyboard');
   setNotice('Storyboard pronto. Copia le istruzioni per ChatGPT e carica lo ZIP delle vignette.');
  }catch(e){setNotice(e instanceof Error?e.message:'Errore storyboard.');}finally{setBusy('');}
 },[run.id,refresh]);
 useEffect(()=>{
  alive.current=true;setLoading(true);setPanels([]);setImages({});setNotice('');setBusy('');
  let active=true;
  void(async()=>{try{
   const ps=await refresh();
   if(!active)return;
   if(autoStart&&ps.length===0&&!started.current.has(run.id)){started.current.add(run.id);await storyboard(false);}
  }catch(e){if(active){setLoading(false);setNotice(e instanceof Error?e.message:'Errore caricamento.');}}})();
  return()=>{active=false;alive.current=false;};
 },[run.id,autoStart,refresh,storyboard]);
 async function copyInstructions(){
  if(!panels.length){setNotice('Genera prima lo storyboard.');return;}
  try{await refresh();const client=supabase;const used=new Set(panels.flatMap(p=>p.cast_names.map(norm)));const matching=support.filter(p=>p.portrait_path&&(used.has(norm(p.slug))||used.has(norm(p.display_name))));const signed=matching.length&&client?await client.storage.from('comic-drafts').createSignedUrls(matching.map(p=>p.portrait_path!),3600):null;if(signed?.error)throw signed.error;const urls=Object.fromEntries(matching.map((p,i)=>[p.id,signed?.data?.[i]?.signedUrl||'']));await navigator.clipboard.writeText(promptForChatGPT(run,panels,main,support,urls,places,window.location.origin));setNotice('Istruzioni copiate con i riferimenti fotografici disponibili. I link privati scadono dopo un’ora.');}
  catch{setNotice('Accesso agli appunti non disponibile: prova da un browser aggiornato con HTTPS.');}
 }
 async function uploadZip(file:File){
  if(!supabase)return;
  const client=supabase;
  setBusy('Controllo dello ZIP…');setNotice('');
  let completed=0;
  try{
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(run.body));
   const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(panels.some(p=>p.source_hash!==hash))throw new Error('Storyboard non allineato al testo: rigeneralo prima di importare immagini.');
   const files=await unzipComic(file);
   const byNumber=new Map(panels.map(p=>[p.panel_number,p]));
   for(const item of files){
    const panel=byNumber.get(item.panelNumber);
    if(!panel)throw new Error('La vignetta '+item.panelNumber+' non è nello storyboard.');
    const missing=missingFaces(panel,main,support);
    if(missing.length)throw new Error('Vignetta '+item.panelNumber+' bloccata: mancano informazioni o foto di '+missing.join(', ')+'. Rimuovila dallo ZIP.');
   }
   const {data:{user}}=await client.auth.getUser();
   if(user?.app_metadata?.role!=='admin')throw new Error('Sessione amministratore non valida.');
   for(const item of files){
    setBusy('Importazione '+(completed+1)+'/'+files.length+'…');
    const panel=byNumber.get(item.panelNumber)!;
    const ext=item.mimeType==='image/png'?'png':item.mimeType==='image/webp'?'webp':'jpg';
    const path=run.id+'/vignetta-'+String(item.panelNumber).padStart(2,'0')+'-'+crypto.randomUUID()+'.'+ext;
    const blob=new Blob([item.data.slice().buffer as ArrayBuffer],{type:item.mimeType});
    const saved=await client.storage.from('comic-drafts').upload(path,blob,{contentType:item.mimeType,upsert:false});
    if(saved.error)throw new Error('Immagine '+item.panelNumber+': '+saved.error.message);
    const linked=await client.from('narrative_comic_panels').update({image_path:path,status:'ready',error_message:null,updated_at:new Date().toISOString()}).eq('id',panel.id).eq('source_hash',panel.source_hash).select('id').single();
    if(linked.error||!linked.data){
     await client.storage.from('comic-drafts').remove([path]);
     throw new Error('Collegamento vignetta '+item.panelNumber+' non riuscito.');
    }
    completed++;await refresh();
   }
   setView('comic');
   setNotice('Importate '+completed+' vignette. Le altre restano modificabili; nessuna pubblicazione automatica.');
  }catch(e){
   await refresh();
   setNotice((completed?'Importazione parziale ('+completed+' vignette salvate). ':'')+(e instanceof Error?e.message:'Errore lettura ZIP.'));
  }finally{setBusy('');}
 }
 const mentioned=[...new Set(panels.flatMap(p=>[...(p.cast_names||[]),...(p.mentions||[]),...(p.dialogue||[]).map(d=>d.speaker)]))];
 const protagonists=new Set(main.flatMap(c=>[norm(c.slug),norm(c.display_name),'viper','ceceno','fromage']));
 const profiles=support.filter(s=>mentioned.some(n=>norm(n)===norm(s.display_name)||norm(n)===norm(s.slug))&&!protagonists.has(norm(s.display_name)));
 async function updateInfo(person:Support,description:string){
  if(!supabase)return;
  setBusy('Salvataggio scheda…');
  try{const {error}=await supabase.from('comic_supporting_characters').update({description:description.trim().slice(0,2000),updated_at:new Date().toISOString()}).eq('id',person.id);
   if(error)throw error;setNotice('Scheda salvata.');await refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Errore salvataggio');}finally{setBusy('');}
 }
 async function uploadPortrait(person:Support,file:File){
  if(!supabase)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setNotice('Foto JPG, PNG o WebP, massimo 5 MB.');return;}
  setBusy('Caricamento foto…');
  try{
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path='support/'+person.slug+'/'+crypto.randomUUID()+'.'+ext;
   const up=await supabase.storage.from('comic-drafts').upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   const {error}=await supabase.from('comic_supporting_characters').update({portrait_path:path,updated_at:new Date().toISOString()}).eq('id',person.id);
   if(error)throw error;setNotice('Foto aggiunta.');await refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Errore caricamento');}finally{setBusy('');}
 }
 const readyCount=panels.filter(p=>!!p.image_path).length;
 const blockedCount=panels.filter(p=>missingFaces(p,main,support).length>0).length;
 return <section className="panel comic-studio" aria-label="Studio fumetto">
  <div className="comic-studio-head"><div><div className="eyebrow">LABORATORIO COMICS</div><h2>{run.title}</h2></div><span className="comic-counter">{readyCount}/{panels.length} vignette</span></div>
  <p>Gemini prepara la trama e lo storyboard. Le immagini le generi in ChatGPT e le importi qui tramite ZIP. Nessuna generazione immagini a pagamento dal sito, nessuna pubblicazione automatica.</p>
  <div className="comic-actions">
   <button disabled={!!busy||loading} onClick={()=>void storyboard(false)}>{panels.length?'Controlla storyboard':'Genera storyboard Gemini'}</button>
   <button disabled={!!busy||!panels.length} onClick={()=>void copyInstructions()}>Copia tutto per ChatGPT</button>
   <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'11px 14px',border:'1px solid #a98251',borderRadius:8,color:'#f3d5a5',textDecoration:'none'}}>Apri ChatGPT</a>
   <button disabled={!!busy||!panels.length} onClick={()=>{if(window.confirm('Rigenerare lo storyboard? Le immagini già importate non saranno più collegate alle nuove vignette.'))void storyboard(true);}}>Rigenera storyboard</button>
  </div>
  <div className="comic-import">
   <h3>Importa lo ZIP delle immagini</h3>
   <p>Nella chat ChatGPT incolla il testo copiato e genera lo ZIP. Ogni file deve chiamarsi <code>vignetta-01.png</code>, <code>vignetta-02.png</code> ecc. Sono ammessi anche JPG e WebP. Fino a 50 MB per ZIP e 6 MB per immagine.</p>
   <label className="comic-upload">Seleziona ZIP<input type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={!!busy||!panels.length} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void uploadZip(file);e.currentTarget.value='';}}/></label>
   {blockedCount>0&&<small>{blockedCount} vignetta/e ancora sospese per foto o schede mancanti: non includerle nello ZIP.</small>}
  </div>
  <nav className="comic-tabs" aria-label="Visualizzazione fumetto">
   <button className={view==='comic'?'active':''} onClick={()=>setView('comic')}>Fumetto</button>
   <button className={view==='storyboard'?'active':''} onClick={()=>setView('storyboard')}>Storyboard</button>
   <button className={view==='mentioned'?'active':''} onClick={()=>setView('mentioned')}>Personaggi ({profiles.length})</button>
  </nav>
  {loading?<p>Caricamento…</p>:!panels.length?<div className="comic-empty">Crea lo storyboard per questa bozza.</div>:null}
  {view==='comic'&&<div className="comic-pages">{panels.map(p=>{
   const unknown=missingFaces(p,main,support);
   return <article key={p.id} className="comic-frame">
    <div className="comic-image">{p.image_path&&images[p.id]?<a href={images[p.id]} target="_blank" rel="noreferrer"><img src={images[p.id]} alt={'Vignetta '+p.panel_number+': '+p.scene}/></a>:<div className="comic-image-empty"><strong>VIGNETTA {p.panel_number}</strong><span>{unknown.length?'Volti da caricare: '+unknown.join(', '):'In attesa dello ZIP'}</span><small>{p.scene}</small></div>}</div>
    {p.caption&&<p className="comic-caption">{p.caption}</p>}
    {!!p.dialogue?.length&&<div className="comic-dialogues">{p.dialogue.map((line,i)=><div key={i} className="comic-balloon"><b>{line.speaker}</b><span>{line.text}</span></div>)}</div>}
    <div className="comic-frame-footer"><span>Vignetta {p.panel_number} · {p.image_path?'Importata':'Da importare'}</span><span>{unknown.length?'Foto mancante':'ZIP / vignetta-'+String(p.panel_number).padStart(2,'0')}</span></div>
   </article>;
  })}</div>}
  {view==='storyboard'&&<div className="comic-storyboard">{panels.map(p=><article key={p.id} className="comic-story-card"><h3>Vignetta {p.panel_number}</h3><p>{p.scene}</p><small>In scena: {(p.cast_names||[]).join(', ')||'solo ambientazione'}</small><small>Citati: {(p.mentions||[]).join(', ')||'nessuno'}</small><small>Dialoghi: {(p.dialogue||[]).map(x=>x.speaker+': '+x.text).join(' · ')||'nessuno'}</small></article>)}</div>}
  {view==='mentioned'&&<div className="comic-support-grid">{profiles.map(person=><SupportingEditor key={person.id} person={person}image={portraitImages[person.id]}busy={!!busy} onSave={updateInfo} onUpload={uploadPortrait}/>)}{!profiles.length&&<p>Nessun personaggio secondario menzionato.</p>}</div>}
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
  <h3>{person.display_name}</h3><small>{ready?'Pronto':'Scheda/foto incompleta'}</small>
  <label>Descrizione<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} placeholder="Aspetto, ruolo, relazioni…"/></label>
  <button disabled={busy||description.trim().length<15} onClick={()=>void onSave(person,description)}>Salva scheda</button>
  <label className="comic-upload">Foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void onUpload(person,f);e.currentTarget.value='';}}/></label>
 </article>;
}
