import {inflateRawSync} from 'node:zlib';

export type ZipComicImage={panelNumber:number;data:Buffer;mimeType:'image/png'|'image/jpeg'|'image/webp';filename:string};
const MAX_ARCHIVE=24*1024*1024;
const MAX_IMAGE=6*1024*1024;
const MAX_ENTRIES=50;
const imageType=(data:Buffer):ZipComicImage['mimeType']|null=>{
 if(data.length>=8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255)return 'image/jpeg';
 if(data.length>=12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')return 'image/webp';
 return null;
};
const panelNumber=(name:string):number|null=>{
 const base=name.split('/').at(-1)||'';
 const match=/^(?:vignetta|panel|pannello)[-_ ]?0*(\d{1,2})\.(?:png|jpe?g|webp)$/i.exec(base)
  ||/^0*(\d{1,2})\.(?:png|jpe?g|webp)$/i.exec(base);
 if(!match)return null;
 const number=Number(match[1]);
 return number>=1&&number<=36?number:null;
};
function crc32(data:Buffer):number{
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
export function parseComicZip(zip:Buffer):ZipComicImage[]{
 if(zip.length<22||zip.length>MAX_ARCHIVE)throw new Error('ZIP non valido o oltre 24 MB.');
 let end=-1;
 for(let n=zip.length-22;n>=Math.max(0,zip.length-65557);n--){
  if(zip.readUInt32LE(n)===0x06054b50){end=n;break;}
 }
 if(end<0)throw new Error('Archivio ZIP non valido.');
 if(zip.readUInt16LE(end+4)!==0||zip.readUInt16LE(end+6)!==0)throw new Error('ZIP multi-volume non supportato.');
 const total=zip.readUInt16LE(end+10);
 if(total===0||total>MAX_ENTRIES)throw new Error('Lo ZIP deve contenere da 1 a 50 file.');
 const size=zip.readUInt32LE(end+12),start=zip.readUInt32LE(end+16);
 if(start+size>zip.length||start+size>end)throw new Error('Indice ZIP danneggiato.');
 const result:ZipComicImage[]=[];
 const used=new Set<number>();
 let pos=start;
 let aggregate=0;
 for(let i=0;i<total;i++){
  if(pos+46>start+size||zip.readUInt32LE(pos)!==0x02014b50)throw new Error('Indice ZIP non leggibile.');
  const flag=zip.readUInt16LE(pos+8),method=zip.readUInt16LE(pos+10);
  const expectedCrc=zip.readUInt32LE(pos+16);
  const compressed=zip.readUInt32LE(pos+20),uncompressed=zip.readUInt32LE(pos+24);
  const nameLength=zip.readUInt16LE(pos+28),extraLength=zip.readUInt16LE(pos+30),commentLength=zip.readUInt16LE(pos+32);
  const localOffset=zip.readUInt32LE(pos+42);
  const next=pos+46+nameLength+extraLength+commentLength;
  if(next>start+size)throw new Error('Nome file ZIP danneggiato.');
  const filename=zip.subarray(pos+46,pos+46+nameLength).toString('utf8');
  pos=next;
  if(filename.endsWith('/')||filename.startsWith('__MACOSX/')||filename.split('/').at(-1)?.startsWith('.'))continue;
  if(filename.includes('..')||filename.includes('\\')||filename.startsWith('/'))throw new Error('Percorso interno ZIP non consentito.');
  const index=panelNumber(filename);
  if(index===null)throw new Error('Nome file non riconosciuto: '+filename+'. Usa vignetta-01.png e numeri progressivi.');
  if(used.has(index))throw new Error('Due file per la vignetta '+index+'.');
  if(flag&1)throw new Error('ZIP protetti da password non supportati.');
  if(method!==0&&method!==8)throw new Error('Compressione ZIP non supportata.');
  if(compressed===0xffffffff||uncompressed===0xffffffff)throw new Error('ZIP64 non supportato.');
  if(uncompressed<1000||uncompressed>MAX_IMAGE)throw new Error('Dimensione immagine non consentita: '+filename);
  aggregate+=uncompressed;
  if(aggregate>40*1024*1024)throw new Error('Immagini complessivamente troppo grandi.');
  if(localOffset+30>zip.length||zip.readUInt32LE(localOffset)!==0x04034b50)throw new Error('Header ZIP mancante.');
  const offset=localOffset+30+zip.readUInt16LE(localOffset+26)+zip.readUInt16LE(localOffset+28);
  if(offset+compressed>start)throw new Error('Immagine ZIP troncata.');
  const slice=zip.subarray(offset,offset+compressed);
  const data=method===8?inflateRawSync(slice,{maxOutputLength:MAX_IMAGE+1}):Buffer.from(slice);
  if(data.length!==uncompressed||crc32(data)!==expectedCrc)throw new Error('Integrità immagine non valida: '+filename);
  const mimeType=imageType(data);
  if(!mimeType)throw new Error('Solo immagini JPG, PNG e WebP autentiche: '+filename);
  result.push({panelNumber:index,filename,data,mimeType});
  used.add(index);
 }
 if(!result.length)throw new Error('Non sono presenti immagini valide nello ZIP.');
 return result.sort((a,b)=>a.panelNumber-b.panelNumber);
}
