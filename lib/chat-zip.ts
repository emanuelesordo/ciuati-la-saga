// Read only the WhatsApp text entry, not attached photos or voice messages.
const maxText=25*1024*1024;
const bytes=(b:ArrayBuffer)=>new DataView(b);
export async function readChatFile(file:File):Promise<string>{
 if(file.name.toLowerCase().endsWith('.txt')){if(file.size>maxText)throw new Error('Testo troppo grande (25 MB).');return file.text();}
 if(!file.name.toLowerCase().endsWith('.zip'))throw new Error('Seleziona uno ZIP WhatsApp o il file TXT esportato.');
 const offset=Math.max(0,file.size-65557);const tail=bytes(await file.slice(offset).arrayBuffer());
 let end=-1;for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50&&i+22+tail.getUint16(i+20,true)===tail.byteLength){end=i;break;}
 if(end<0||tail.getUint16(end+4,true)!==0||tail.getUint16(end+6,true)!==0)throw new Error('ZIP non valido o multipart.');
 const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),start=tail.getUint32(end+16,true);
 if(count===65535||size===0xffffffff||start===0xffffffff||size>15*1024*1024||start+size>file.size)throw new Error('ZIP64 o indice ZIP troppo grande: esporta la chat senza media oppure usa il TXT.');
 const central=bytes(await file.slice(start,start+size).arrayBuffer());
 const entries:{name:string;method:number;compressed:number;uncompressed:number;offset:number;flags:number}[]=[];
 let p=0;for(let i=0;i<count;i++){
  if(p+46>central.byteLength||central.getUint32(p,true)!==0x02014b50)throw new Error('Indice ZIP danneggiato.');
  const n=central.getUint16(p+28,true),e=central.getUint16(p+30,true),c=central.getUint16(p+32,true);
  if(p+46+n+e+c>central.byteLength)throw new Error('Indice ZIP incompleto.');
  const name=new TextDecoder().decode(new Uint8Array(central.buffer,p+46,n));
  if(/\.txt$/i.test(name)&&!name.startsWith('__MACOSX/')&&!name.split('/').pop()?.startsWith('._'))entries.push({name,method:central.getUint16(p+10,true),compressed:central.getUint32(p+20,true),uncompressed:central.getUint32(p+24,true),offset:central.getUint32(p+42,true),flags:central.getUint16(p+8,true)});
  p+=46+n+e+c;
 }
 const preferred=entries.filter(e=>/(^|\/)_chat\.txt$/i.test(e.name));const entry=preferred.length===1?preferred[0]:entries.length===1?entries[0]:undefined;
 if(!entry)throw new Error('Nessun TXT univoco nello ZIP. Estrai il file di conversazione e caricalo direttamente.');
 if(entry.flags&1||entry.uncompressed>maxText||entry.compressed>maxText||![0,8].includes(entry.method))throw new Error('Testo ZIP protetto, troppo grande o compressione non supportata.');
 if(entry.offset+30>file.size)throw new Error('Offset ZIP non valido.');
 const local=bytes(await file.slice(entry.offset,entry.offset+30).arrayBuffer());if(local.getUint32(0,true)!==0x04034b50)throw new Error('Intestazione ZIP non valida.');
 const dataStart=entry.offset+30+local.getUint16(26,true)+local.getUint16(28,true);
 if(dataStart+entry.compressed>file.size)throw new Error('Dati ZIP incompleti.');
 const compressed=file.slice(dataStart,dataStart+entry.compressed);
 if(entry.method===0){if(compressed.size!==entry.uncompressed)throw new Error('Dimensione ZIP non coerente.');return compressed.text();}
 const stream=compressed.stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
 const reader=stream.getReader(),decoder=new TextDecoder();let total=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxText||total>entry.uncompressed)throw new Error('Decompressione oltre il limite.');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(total!==entry.uncompressed)throw new Error('Dimensione ZIP non coerente.');return text;
}
