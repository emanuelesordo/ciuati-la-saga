import {NextRequest,NextResponse} from 'next/server';
import {adminComicClient,comicCharacters,comicDialogue,comicHash,comicNames,isUuid,shortComicText,slugifyComic,normalComic} from '../../../../lib/comic';

export const runtime='nodejs';
export const maxDuration=120;
const responseError=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
type RawPanel={scene?:unknown;caption?:unknown;dialogue?:unknown;cast_names?:unknown;mentions?:unknown};
export async function POST(request:NextRequest){
 try{
  const {db}=await adminComicClient(request);
  const payload=await request.json() as {run_id?:unknown;regenerate?:boolean};
  if(!isUuid(payload.run_id))return responseError('ID bozza non valido.');
  const {data:run,error:runError}=await db.from('narrative_runs').select('id,title,body,status').eq('id',payload.run_id).single();
  if(runError||!run)return responseError('Bozza non trovata.',404);
  if(run.status==='rejected')return responseError('Bozza scartata.',409);
  const hash=comicHash(run.body);
  const existing=await db.from('narrative_comic_panels').select('*').eq('run_id',run.id).order('panel_number');
  if(existing.error)return responseError(existing.error.message,500);
  if(!payload.regenerate&&existing.data?.length&&existing.data.every(p=>p.source_hash===hash))
   return NextResponse.json({panels:existing.data,cached:true},{headers:{'Cache-Control':'no-store'}});
  if(!process.env.GEMINI_API_KEY)return responseError('Chiave Gemini non configurata.',503);
  const {main,support}=await comicCharacters(db);
  const instruction=[
   'Sei lo storyboard artist di un fumetto fantasy satirico. Converti il testo fornito in 6-8 vignette sequenziali, senza inventare nuovi eventi.',
   'Rispondi SOLO JSON: {"panels":[{"scene":"descrizione VISIVA in italiano, ambientazione e azione","caption":"didascalia breve","dialogue":[{"speaker":"nome","text":"frase fedele al testo"}],"cast_names":["nomi dei personaggi EFFETTIVAMENTE VISIBILI"],"mentions":["altri personaggi CITATI o visualizzati"]}]}',
   'Le battute devono essere tratte o adattate strettamente dal testo. Ogni vignetta contiene massimo 2 battute brevi.',
   'Nelle prime scene Le Fromage e un personaggio secondario; non trasformarlo in protagonista centrale.',
   'I personaggi mascherati (il Gatto e la Volpe, il Dottore, Pollicino, la Pecora) devono conservare i nomi mascherati. Tolkien resta Tolkien.',
   'Gli Auronerum portano colori giallo e nero in abiti, drappi e stemmi. «La Casta» è il soprannome segreto usato dai Ciuati per i vertici e non va messo in bocca ai dirigenti come titolo ufficiale.',
   'I LUOGHI sono trasposizioni fantasy di luoghi reali. Il Cavallo Bianco e il White Pony sono la stessa locanda ad Antonova, non due luoghi distinti. Svilarna è l’altopiano della Sila in chiave fantasy: pini larici silani, foreste, laghi, alture e nebbia appenninica, non paesaggi alpini. Mantieni i luoghi riconoscibili da una vignetta all’altra.',
   'I personaggi esterni citati sono elementi da registrare ma NON devono essere descritti con sembianze inventate.',
   'Preferisci vignette con 1-2 protagonisti visibili e alterna primi piani e panoramiche. Il calcio degli Auronerum è reale nell’universo fantasy: conserva allenamenti, campo, pallone, schemi e azioni sportive presenti nella storia. Evita metanarrazione e fumetto nel fumetto.',
   'Ogni vignetta deve mostrare una causa, una reazione o una conseguenza riconoscibile. Mantieni continuità di luogo, posizioni, gesti, oggetti e direzione degli sguardi fra vignette consecutive.',
   'Le battute devono essere chiaramente attribuite a chi parla e riferirsi a ciò che viene mostrato o detto subito prima. Se un passaggio è troppo lungo, riassumilo nella didascalia senza inventare dialoghi nuovi o rendere oscure le motivazioni.',
   'Le comparse possono intervenire soltanto se già presenti nel testo; non spostare entrate, uscite e svolte per distribuire i personaggi artificialmente.',
   'In cast_names usa i nomi esatti, preferibilmente quelli delle reference disponibili, e non aggiungere comparse non presenti nel testo.'
  ].join(' ');
  const prompt=JSON.stringify({title:run.title,story:run.body,availableProtagonists:main.map(c=>c.display_name),supportingCharacters:support.map(c=>c.display_name)});
  const ai=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
   body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.4,maxOutputTokens:5500}}),
   signal:AbortSignal.timeout(90000)
  });
  if(!ai.ok)return responseError('Gemini storyboard non disponibile ('+ai.status+').',502);
  const result=await ai.json() as {candidates?:{content?:{parts?:{text?:string}[]}}[]};
  const raw=result.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  let parsed:{panels?:RawPanel[]};
  try{parsed=JSON.parse(raw);}catch{return responseError('Storyboard AI non leggibile.',502);}
  if(!Array.isArray(parsed.panels)||parsed.panels.length<2)return responseError('Gemini non ha prodotto vignette valide.',502);
  const panels=parsed.panels.slice(0,8).map((p,n)=>({
   run_id:run.id,panel_number:n+1,source_hash:hash,
   scene:shortComicText(p.scene,1200)||'Scorcio degli Auronerum.',
   caption:shortComicText(p.caption,300),
   dialogue:comicDialogue(p.dialogue),
   cast_names:comicNames(p.cast_names).slice(0,4),
   mentions:comicNames(p.mentions).slice(0,12),
   status:'pending',image_path:null,error_message:null
  }));
  // Register mentioned supporting characters, but never invent a face, portrait, or biography.
  const registered=new Set([...main.map(c=>normalComic(c.display_name)),...main.map(c=>normalComic(c.slug)),...support.map(c=>normalComic(c.slug)),'ceceno','scema','fromage']);
  const names=[...new Set(panels.flatMap(p=>[...p.cast_names,...p.mentions,...p.dialogue.map(d=>d.speaker)]) )]
   .filter(n=>n&&n.length>=2&&!registered.has(normalComic(n))&&!['narratore','voce narrante','narration','tutti'].includes(normalComic(n))).slice(0,20);
  if(names.length){
   const create=await db.from('comic_supporting_characters').upsert(names.map(name=>({slug:slugifyComic(name),display_name:name})),
    {onConflict:'slug',ignoreDuplicates:true});
   if(create.error)return responseError('Archivio personaggi incompleti non aggiornato.',500);
  }
  const clear=await db.from('narrative_comic_panels').delete().eq('run_id',run.id);
  if(clear.error)return responseError(clear.error.message,500);
  const saved=await db.from('narrative_comic_panels').insert(panels).select('*');
  if(saved.error)return responseError(saved.error.message,500);
  return NextResponse.json({panels:saved.data||[],cached:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  return responseError(e instanceof Error?e.message:'Errore nella preparazione del fumetto.',500);
 }
}
