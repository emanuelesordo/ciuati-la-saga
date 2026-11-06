import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {adminComicClient,comicCharacters,comicHash,comicNames,isUuid,resolveComicName,COMIC_BUCKET} from '../../../../lib/comic';
import {parseComicZip} from '../../../../lib/comic-zip';

export const runtime='nodejs';
export const maxDuration=120;
const error=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 try{
  const {db}=await adminComicClient(request);
  const incoming=request.headers.get('content-length');
  if(incoming&&Number(incoming)>25*1024*1024)return error('ZIP troppo grande: massimo 24 MB.',413);
  const form=await request.formData();
  const runId=form.get('run_id'), file=form.get('file');
  if(!isUuid(runId)||!(file instanceof File))return error('Seleziona una bozza e un archivio ZIP.');
  if(!file.name.toLowerCase().endsWith('.zip')||file.size>24*1024*1024||file.size<22)return error('Carica uno ZIP valido, massimo 24 MB.',413);
  const [{data:run,error:runError},{data:panels,error:panelsError}]=await Promise.all([
   db.from('narrative_runs').select('id,body,status').eq('id',runId).single(),
   db.from('narrative_comic_panels').select('*').eq('run_id',runId).order('panel_number')
  ]);
  if(runError||!run||panelsError||!panels?.length)return error('Bozza o storyboard non trovati.',404);
  if(run.status==='rejected')return error('Bozza scartata.',409);
  const hash=comicHash(run.body);
  if(panels.some(p=>p.source_hash!==hash))return error('La trama è cambiata. Rigenera lo storyboard prima di importare immagini.',409);
  const images=parseComicZip(Buffer.from(await file.arrayBuffer()));
  const byNumber=new Map(panels.map(p=>[p.panel_number,p]));
  for(const image of images){
   if(!byNumber.has(image.panelNumber))return error('La vignetta '+image.panelNumber+' non appartiene allo storyboard attuale.',400);
  }
  const {main,support}=await comicCharacters(db);
  const blocked=images.filter(image=>{
   const panel=byNumber.get(image.panelNumber)!;
   return comicNames(panel.cast_names).some(name=>!resolveComicName(name,main,support).ready);
  });
  if(blocked.length){
   const details=blocked.map(image=>{
    const panel=byNumber.get(image.panelNumber)!;
    const names=comicNames(panel.cast_names).filter(name=>!resolveComicName(name,main,support).ready);
    return image.panelNumber+' ('+names.join(', ')+')';
   });
   return error('Importazione sospesa: mancano scheda o foto per le vignette '+details.join('; ')+'. Escludi i relativi file dallo ZIP oppure completa i personaggi.',409);
  }
  let done=0;
  const uploadedPaths:string[]=[];
  const previous:Array<{id:string;image_path:string|null}>=[];
  try{
   for(const image of images){
    const panel=byNumber.get(image.panelNumber)!;
    const ext=image.mimeType==='image/png'?'png':image.mimeType==='image/webp'?'webp':'jpg';
    const path=run.id+'/vignetta-'+String(image.panelNumber).padStart(2,'0')+'-'+randomUUID()+'.'+ext;
    const saved=await db.storage.from(COMIC_BUCKET).upload(path,image.data,{contentType:image.mimeType,upsert:false});
    if(saved.error)throw new Error('Storage vignetta '+image.panelNumber+': '+saved.error.message);
    uploadedPaths.push(path);
    const updated=await db.from('narrative_comic_panels').update({
     image_path:path,status:'ready',error_message:null,updated_at:new Date().toISOString()
    }).eq('id',panel.id).eq('source_hash',hash).select('id').single();
    if(updated.error||!updated.data)throw new Error('Collegamento vignetta '+image.panelNumber+' fallito.');
    previous.push({id:panel.id,image_path:panel.image_path});
    done++;
   }
  }catch(e){
   for(const old of previous){
    await db.from('narrative_comic_panels').update({
     image_path:old.image_path,status:old.image_path?'ready':'pending',error_message:null
    }).eq('id',old.id);
   }
   await db.storage.from(COMIC_BUCKET).remove(uploadedPaths);
   return error('Importazione annullata: '+(e instanceof Error?e.message:'errore di salvataggio'),500);
  }
  return NextResponse.json({imported:done,total:panels.length,panels:images.map(x=>x.panelNumber)},{
   headers:{'Cache-Control':'no-store'}
  });
 }catch(e){
  return error(e instanceof Error?e.message:'Errore importazione ZIP.',500);
 }
}
