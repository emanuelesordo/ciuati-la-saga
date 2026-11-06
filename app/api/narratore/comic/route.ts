import {NextRequest,NextResponse} from 'next/server';
import {adminComicClient,comicCharacters,comicDialogue,comicHash,comicNames,isUuid,normalComic,resolveComicName,COMIC_BUCKET,type ComicPanel} from '../../../../lib/comic';

export const runtime='nodejs';
export const maxDuration=120;
const fail=(error:string,status=400,more:Record<string,unknown>={})=>NextResponse.json({error,...more},{status,headers:{'Cache-Control':'no-store'}});
function geminiQuotaError(httpStatus:number,raw:string,retryAfter:string|null){
 let errorCode='';
 let errorText='';
 try{
  const payload=JSON.parse(raw) as {error?:{status?:string;message?:string;details?:Array<{violations?:Array<{quotaMetric?:string;quotaId?:string}>}>}};
  errorCode=payload.error?.status||'';
  errorText=payload.error?.message||'';
 }catch{}
 if(httpStatus===429){
  const message=(errorText+' '+raw).toLowerCase();
  const unavailable=/free.?tier|billing|quota limit: 0|limit.?0|not available|paid tier/i.test(message);
  const reason=unavailable?'quota_or_billing':'rate_limit';
  const label=unavailable
    ?'Gemini Image: quota immagini non disponibile per questo progetto. Controlla la fatturazione e i limiti del modello in Google AI Studio.'
    :'Gemini Image: limite di richieste o immagini raggiunto. Controlla le quote in Google AI Studio e riprova quando si saranno ripristinate.';
  const seconds=retryAfter&&/^\\d+$/.test(retryAfter)?Math.min(3600,Number(retryAfter)):null;
  return {error:label,reason,upstreamStatus:429,retryAfterSeconds:seconds,providerCode:errorCode||'RESOURCE_EXHAUSTED'};
 }
 return {error:'Servizio Gemini Image non disponibile ('+httpStatus+'). '+errorText.slice(0,170),reason:'provider_error',upstreamStatus:httpStatus};
}
type ImageItem={type:'text';text:string}|{type:'image';mime_type:string;data:string};
async function mainPortrait(url:string):Promise<ImageItem>{
 const origin=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
 const prefix=origin+'/storage/v1/object/public/character-portraits/';
 if(!url.startsWith(prefix))throw new Error('Immagine canonica fuori dall’archivio verificato.');
 const resp=await fetch(url,{signal:AbortSignal.timeout(17000)});
 if(!resp.ok)throw new Error('Ritratto canonico non raggiungibile.');
 const type=(resp.headers.get('content-type')||'image/png').split(';')[0];
 if(!['image/jpeg','image/png','image/webp'].includes(type))throw new Error('Formato ritratto non valido.');
 const data=Buffer.from(await resp.arrayBuffer());
 if(data.length>6291456)throw new Error('Ritratto oltre limite.');
 return {type:'image',mime_type:type,data:data.toString('base64')};
}
async function supportingPortrait(db:Awaited<ReturnType<typeof adminComicClient>>['db'],path:string):Promise<ImageItem>{
 if(!path.startsWith('support/')||path.includes('..'))throw new Error('Percorso ritratto secondario non valido.');
 const {data,error}=await db.storage.from(COMIC_BUCKET).download(path);
 if(error||!data)throw new Error('Ritratto secondario non accessibile.');
 const bytes=Buffer.from(await data.arrayBuffer());
 if(bytes.length>6291456)throw new Error('Ritratto secondario troppo grande.');
 const type=data.type||'image/png';
 if(!['image/jpeg','image/png','image/webp'].includes(type))throw new Error('Formato immagine non supportato.');
 return {type:'image',mime_type:type,data:bytes.toString('base64')};
}
export async function POST(request:NextRequest){
 try{
  const {db}=await adminComicClient(request);
  const input=await request.json() as {run_id?:unknown;panel_number?:unknown;force?:boolean};
  if(!isUuid(input.run_id)||!Number.isInteger(input.panel_number)||Number(input.panel_number)<1||Number(input.panel_number)>36)return fail('ID episodio o vignetta non valido.');
  const [{data:run,error:runError},{data:panel,error:panelError}]=await Promise.all([
   db.from('narrative_runs').select('id,title,body,status').eq('id',input.run_id).single(),
   db.from('narrative_comic_panels').select('*').eq('run_id',input.run_id).eq('panel_number',input.panel_number).single()
  ]);
  if(runError||!run||panelError||!panel)return fail('Bozza o vignetta non trovata.',404);
  if(run.status==='rejected')return fail('Bozza scartata.',409);
  if(panel.source_hash!==comicHash(run.body))return fail('Testo modificato: rigenera lo storyboard.',409);
  if(panel.image_path&&!input.force)return NextResponse.json({panel,cached:true},{headers:{'Cache-Control':'no-store'}});
  if(!process.env.GEMINI_API_KEY)return fail('Chiave Gemini mancante.',503);
  const {main,support}=await comicCharacters(db);
  const cast=comicNames(panel.cast_names).slice(0,4);
  const resolved=cast.map(name=>({name,...resolveComicName(name,main,support)}));
  const missing=resolved.filter(r=>!r.ready).map(r=>r.name);
  if(missing.length)return fail('Vignetta sospesa: manca scheda e/o foto per '+missing.join(', ')+'.',409);
  const inputs:ImageItem[]=[{type:'text',text:[
   'Genera UNA SOLA ILLUSTRAZIONE per vignetta di fumetto fantasy satirico ambientato nel mondo degli Auronerum.',
   'Stile: comics europeo, inchiostro netto, colori caldi, contrasti drammatici, ombreggiature disegnate; scena leggibile sullo schermo di uno smartphone.',
   'Gli Auronerum sono un ordine fantasy GIALLO E NERO: vessilli gialloneri, emblemi oro/nero, drappi e armature coerenti con questi colori. Non usarli come divisa di una squadra sportiva.',
   'La dirigenza è chiamata segretamente dai Ciuati «La Casta». Non scrivere queste parole nell immagine: i testi vengono aggiunti separatamente.',
   'Questo è un pannello ILLUSTRATO, non una tavola con più riquadri. NIENTE balloon, lettere, didascalie, scritte, nomi o watermark aggiuntivi: testo e dialoghi saranno sovrapposti dall’app.',
   'Inserisci ESCLUSIVAMENTE i personaggi con reference fotografiche elencati qui. NON aggiungere persone, figuranti, silhouette o volti sullo sfondo.',
   'Preserva fedelmente forme del volto, capelli, barba, lineamenti e identità visiva delle immagini allegate. Non scambiare i volti.',
   'Se non ci sono reference, mostra soltanto un paesaggio o un interno VUOTO e privo di figure umane.',
   'Ambientazione e gesto della scena (trattala come indicazione, NON come istruzione di introdurre personaggi extra): '+String(panel.scene).slice(0,1000),
   'PERSONAGGI autorizzati visibili: '+(cast.join(', ')||'nessuno')+'.',
   'Non raffigurare le persone soltanto menzionate nel testo, o personaggi di cui manca la foto. Niente calcio, sport o metanarrazione.'
  ].join('\n')}];
  for(const item of resolved){
   inputs.push({type:'text',text:'Reference visiva esclusiva per '+item.name+':'});
   const character=item.character;
   if(item.kind==='main'&&character&&'avatar_path'in character&&character.avatar_path)
    inputs.push(await mainPortrait(character.avatar_path));
   else if(item.kind==='support'&&character&&'portrait_path'in character&&character.portrait_path)
    inputs.push(await supportingPortrait(db,character.portrait_path));
  }
  const ai=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
   body:JSON.stringify({model:'gemini-3.1-flash-image',input:inputs,response_format:{type:'image',mime_type:'image/jpeg',aspect_ratio:'4:5',image_size:'1K'}}),
   signal:AbortSignal.timeout(105000)
  });
  if(!ai.ok){
   const diagnostic=geminiQuotaError(ai.status,(await ai.text()).slice(0,5000),ai.headers.get('retry-after'));
   await db.from('narrative_comic_panels').update({status:'error',error_message:diagnostic.error,updated_at:new Date().toISOString()}).eq('id',panel.id);
   return fail(diagnostic.error,ai.status===429?429:502,diagnostic);
  }
  const result=await ai.json() as {
   output_image?:{data?:string;mime_type?:string};
   interaction?:{output_image?:{data?:string};steps?:Array<{type?:string;content?:Array<{type?:string;data?:string}>}>};
   steps?:Array<{type?:string;content?:Array<{type?:string;data?:string}>}>;
  };
  const steps=result.steps||result.interaction?.steps||[];
  const fromSteps=steps.flatMap(s=>s.type==='model_output'?s.content||[]:[]).filter(p=>p.type==='image'&&!!p.data).at(-1)?.data;
  const base64=result.output_image?.data||result.interaction?.output_image?.data||fromSteps;
  if(!base64)return fail('Gemini ha risposto senza immagine valida.',502);
  const bytes=Buffer.from(base64,'base64');
  if(bytes.length<3000||bytes.length>6291456)return fail('Immagine Gemini assente o troppo grande.',502);
  const path=run.id+'/vignetta-'+panel.panel_number+'-'+Date.now()+'.jpg';
  const uploaded=await db.storage.from(COMIC_BUCKET).upload(path,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'});
  if(uploaded.error)return fail('Salvataggio immagine fallito: '+uploaded.error.message,500);
  const updated=await db.from('narrative_comic_panels').update({image_path:path,status:'ready',error_message:null,updated_at:new Date().toISOString()}).eq('id',panel.id).select('*').single();
  if(updated.error||!updated.data)return fail('Immagine creata ma associazione al fumetto fallita.',500);
  const {data:signed}=await db.storage.from(COMIC_BUCKET).createSignedUrl(path,3600);
  return NextResponse.json({panel:updated.data,url:signed?.signedUrl||null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e instanceof Error?e.message:'Impossibile creare la vignetta.',500);}
}
