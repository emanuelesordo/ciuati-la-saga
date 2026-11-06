export type BrowserComicImage={panelNumber:number;data:Uint8Array;mimeType:'image/png'|'image/jpeg'|'image/webp';filename:string};
const MAX_ARCHIVE=50*1024*1024;
const MAX_IMAGE=6*1024*1024;
const MAX_COUNT=50;
function imageType(data:Uint8Array):BrowserComicImage['mimeType']|null{
 if(data.length>8&&[137,80,78,71,13,10,26,10].every((x,i)=>data[i]===x))return 'image/png';
 if(data[0]===255&&data[1]===216&&data[2]===255)return 'image/jpeg';
 if(data.length>12&&String.fromCharCode(...data.slice(0,4))==='RIFF'&&String.fromCharCode(...data.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
const numberFromFile=(name:string):number|null=>{
 const base=name.split('/').at(-1)||'';
 const match=/^(?:vignetta|panel|pannello)[-_ ]?0*(\d{1,2})\.(png|jpe?g|webp)$/i.exec(base)||/^0*(\d{1,2})\.(png|jpe?g|webp)$/i.exec(base);
 if(!match)return null;
 const n=Number(match[1]);
 return n>=1&&n<=36?n:null;
};
function crc32(data:Uint8Array){
 let crc=0xffffffff;
 for(const x of data){crc^=x;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
async function inflateRaw(data:Uint8Array){
 if(typeof DecompressionStream==='undefined')throw new Error('Il browser non supporta ZIP compressi. Usa un browser aggiornato.');
 let stream:ReadableStream<Uint8Array>;
 try{
  const decompressor=new DecompressionStream('deflate-raw');
  stream=new Blob([new Uint8Array(data).buffer]).stream().pipeThrough(decompressor);
 }catch{throw new Error('Questo browser non supporta il formato ZIP. Usa Chrome aggiornato.');}
 const reader=stream.getReader(),parts:Uint8Array[]=[];
 let size=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>MAX_IMAGE){await reader.cancel();throw new Error('Una vignetta supera 6 MB.');}
   parts.push(value);
  }
 }finally{reader.releaseLock();}
 const out=new Uint8Array(size);
 let off=0;for(const p of parts){out.set(p,off);off+=p.byteLength;}
 return out;
}
export async function unzipComic(file:File):Promise<BrowserComicImage[]>{
 if(!file.name.toLowerCase().endsWith('.zip')||file.size>MAX_ARCHIVE||file.size<22)throw new Error('Serve uno ZIP fino a 50 MB.');
 const zip=new Uint8Array(await file.arrayBuffer()),dv=new DataView(zip.buffer);
 const u16=(n:number)=>dv.getUint16(n,true),u32=(n:number)=>dv.getUint32(n,true);
 let end=-1;
 for(let n=zip.length-22;n>=Math.max(0,zip.length-65557);n--)if(u32(n)===0x06054b50){end=n;break;}
 if(end<0)throw new Error('Archivio ZIP non valido.');
 if(u16(end+4)!==0||u16(end+6)!==0)throw new Error('ZIP multi-volume non supportato.');
 const count=u16(end+10),size=u32(end+12),start=u32(end+16);
 if(!count||count>MAX_COUNT||start+size>end)throw new Error('Indice ZIP non valido (massimo 50 voci).');
 const results:BrowserComicImage[]=[],used=new Set<number>();
 let pos=start,aggregate=0;
 for(let n=0;n<count;n++){
  if(pos+46>start+size||u32(pos)!==0x02014b50)throw new Error('ZIP corrotto.');
  const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),compressed=u32(pos+20),uncompressed=u32(pos+24);
  const length=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),offset=u32(pos+42);
  const next=pos+46+length+extra+comment;
  if(next>start+size)throw new Error('ZIP corrotto.');
  const name=new TextDecoder().decode(zip.subarray(pos+46,pos+46+length));
  pos=next;
  if(name.endsWith('/')||name.startsWith('__MACOSX/')||name.split('/').at(-1)?.startsWith('.'))continue;
  if(name.includes('..')||name.includes('\\')||name.startsWith('/'))throw new Error('Nome file ZIP non valido.');
  const number=numberFromFile(name);
  if(number===null)throw new Error('Nome non riconosciuto: '+name+'. Usa vignetta-01.png.');
  if(used.has(number))throw new Error('Vignetta '+number+' duplicata nello ZIP.');
  if(flags&1)throw new Error('ZIP cifrati non supportati.');
  if(method!==0&&method!==8)throw new Error('Compressione ZIP non supportata.');
  if(uncompressed<1000||uncompressed>MAX_IMAGE||compressed===0xffffffff||uncompressed===0xffffffff)throw new Error('Immagine oltre 6 MB o formato ZIP64 non supportato.');
  aggregate+=uncompressed;
  if(aggregate>80*1024*1024)throw new Error('Dimensioni totali troppo elevate.');
  if(offset+30>zip.length||u32(offset)!==0x04034b50)throw new Error('Header ZIP corrotto.');
  const begin=offset+30+u16(offset+26)+u16(offset+28);
  if(begin+compressed>start)throw new Error('Vignetta troncata.');
  const slice=zip.slice(begin,begin+compressed);
  const data=method===0?slice:await inflateRaw(slice);
  if(data.byteLength!==uncompressed||crc32(data)!==crc)throw new Error('Verifica integrità fallita: '+name);
  const mimeType=imageType(data);
  if(!mimeType)throw new Error('Non è un file immagine JPEG, PNG o WebP valido: '+name);
  used.add(number);
  results.push({panelNumber:number,data,mimeType,filename:name});
 }
 if(!results.length)throw new Error('ZIP vuoto: nessuna vignetta riconosciuta.');
 return results.sort((a,b)=>a.panelNumber-b.panelNumber);
}
