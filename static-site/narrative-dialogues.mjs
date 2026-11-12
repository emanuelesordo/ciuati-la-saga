// Shared browser/Edge dialogue logic; no private archive content belongs here.
export const dialogueBucket='narrator-dialogues';
export const dialogueObject='dialogues.json';
export const characterAliases=['Barretta','Viper','Hermano','Cecè','Giogale','Le Fromage','Rob','Il Gatto','La Volpe','Il Dottore','Pollicino','La Pecora','Ambrose','Sciip','Talkien','Patataro'];
export const normalize=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const stop=new Set('a ad al alla alle allo ai agli anche che chi ci da dal dalla dalle dei del della delle degli di e ed era essere fa fare gli ha hai hanno ho i il in io l la le lo lui ma mi ne nei nel nella nelle no non o per poi piu quale quando qui se sei si sia sono sta sto su sul sua sue suo ti tra tu un una uno va vi voi con come cosa dove quello questa questo quelli quelle tutti tutto tanto gia ancora sempre solo molto poco bene male ogni altro altra altri altre stesso stessa stessi mentre prima dopo senza pero perche quindi allora cosi qualche alcuni proprio deve devono puo possono avrebbe avrebbe nostro loro vostre vostro'.split(' '));
const tokens=s=>normalize(s).match(/[\p{L}\p{N}]{3,}/gu)?.filter(w=>!stop.has(w)&&!/^\d+$/.test(w))||[];
const media=/^(?:[<\u200e\u200f\s]*)(?:media omessi|media omitted|immagine omessa|image omitted|video omesso|audio omesso|sticker omesso|gif omessa|documento omesso|messaggio eliminato|this message was deleted|hai eliminato questo messaggio|messaggi e chiamate|i messaggi e le chiamate|le chiamate e i messaggi|<allegato:|attachment:|file allegato|audio non incluso)/i;
export function parseWhatsApp(text){
 const result=[];let current;
 const header=/^\s*\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?(?:\]|\s*[-–])\s*(.*)$/i;
 function flush(){if(current?.sender&&current.text.trim()&&!media.test(current.text.trim()))result.push({...current,text:current.text.trim()});current=undefined;}
 for(const raw of String(text).split(/\r?\n/)){
  const line=raw.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g,'');const m=line.match(header);
  if(m){flush();const content=m[4],p=content.indexOf(': ');if(p<1||p>120)continue;const year=m[3].length===2?'20'+m[3]:m[3],day=Number(m[1]),month=Number(m[2]);if(month<1||month>12||day<1||day>31)continue;current={sender:content.slice(0,p).trim(),text:content.slice(p+2),date:year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'),index:result.length};}
  else if(current)current.text+='\n'+line;
 }
 flush();return result;
}
export function suggestAlias(sender){
 const s=normalize(sender).trim(),options={'Barretta':['barretta','rosi'],'Viper':['viper','scema','ema'],'Hermano':['hermano','peru'],'Cecè':['cece','ceceno','gigi'],'Giogale':['giogale','gio'],'Le Fromage':['le fromage','forna'],'Rob':['rob'],'Il Gatto':['il gatto','gatto'],'La Volpe':['la volpe','volpe'],'Il Dottore':['il dottore','dottore','dentista','griso'],'Pollicino':['pollicino'],'La Pecora':['la pecora','pecora'],'Ambrose':['ambrose'],'Sciip':['sciip','vincent'],'Talkien':['talkien','tolkien'],'Patataro':['patataro']};
 for(const [alias,keys] of Object.entries(options))if(keys.some(k=>s===k||s.split(/[\s_-]+/).includes(k)))return alias;return '';
}
const regexEscape=s=>s.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
export function sanitizeArchive(raw,mapping){
 const substitutions=new Map(),counts=new Map();
 for(const sender of Object.keys(mapping)){const first=sender.trim().split(/\s+/)[0];counts.set(normalize(first),(counts.get(normalize(first))||0)+1);}
 for(const [sender,alias] of Object.entries(mapping)){const name=sender.trim();if(name.length>=3)substitutions.set(name,alias||'[persona]');const first=name.split(/\s+/)[0];if(first.length>=3&&counts.get(normalize(first))===1)substitutions.set(first,alias||'[persona]');}
 const replacements=[...substitutions].sort((a,b)=>b[0].length-a[0].length).map(([name,alias])=>[new RegExp('(^|[^\\p{L}\\p{N}])'+regexEscape(name)+'(?=$|[^\\p{L}\\p{N}])','giu'),alias]);
 const messages=[];
 for(const m of raw){
  const speaker=Object.hasOwn(mapping,m.sender)?mapping[m.sender]:'';if(!characterAliases.includes(speaker))continue;
  let text=m.text.replace(/https?:\/\/\S+|www\.\S+/gi,'[link]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]').replace(/(?:\+?\d[\s().-]*){8,}\d/g,'[recapito]').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  for(const [pattern,alias] of replacements)text=text.replace(pattern,(_,prefix)=>prefix+alias);
  text=text.trim().slice(0,1200);if(!text||media.test(text)||/^(?:\d+|[^\p{L}\p{N}]+)$/u.test(text))continue;
  messages.push({speaker,text,date:m.date,index:m.index});
 }
 return {version:1,messages};
}
export function readArchive(value){
 if(!value||typeof value!=='object'||value.version!==1||!Array.isArray(value.messages)||value.messages.length>75000)throw new Error('Formato archivio non valido.');
 const messages=value.messages.filter(m=>m&&typeof m.text==='string'&&m.text.length<=1200&&typeof m.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&Number.isInteger(m.index)&&m.index>=0&&characterAliases.includes(m.speaker));
 if(messages.length!==value.messages.length)throw new Error('Messaggi archivio non validi.');
 return {version:1,messages:[...messages].sort((a,b)=>a.index-b.index)};
}
const themes=[
 ['calabrese','calabria','nduja','guglielmo','pizzata','pizza','cena','amaro','mangiare','svilarna'],
 ['squadra','campo','partita','allenamento','formazione','convocazione','panchina','titolare','giocare','gol','calcio','auronerum'],
 ['casta','vertici','dirigenza','comando','privilegi','favori','dottore','gatto','volpe','pollicino','esclusione'],
 ['brugge','belgio','birra','white','pony','birreria','birrificio','viaggio'],
 ['comunismo','politica','ideologia','socialismo','capitalismo'],
 ['amicizia','cerchia','ciuati','gruppo','fedelta','lealta','discussione','litigio','disamina']
];
export function episodeCutoff(number){
 return ['2026-04-30','2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-07-31','2026-08-31','2026-08-31','2026-09-30','2026-09-30','2026-09-30','2026-11-30'][Number(number)-1]||'2026-11-30';
}
export function selectDialogueWindows(archive,query,reference='',cutoff='9999-12-31'){
 const all=archive.messages.filter(m=>m.date<=cutoff);if(!all.length)return [];
 const words=new Map();for(const w of tokens(query).slice(0,220))words.set(w,Math.min(5,(words.get(w)||0)+2));
 for(const w of tokens(reference).slice(0,450))if(!words.has(w))words.set(w,0.45);
 for(const group of themes)if(group.some(w=>words.has(w)))for(const w of group)if(!words.has(w))words.set(w,0.7);
 const names=normalize(query+' '+reference.slice(0,1800)),wanted=new Set(characterAliases.filter(a=>names.includes(normalize(a))));
 const mainWords=[...words.entries()].sort((a,b)=>b[1]-a[1]).slice(0,110),df=new Map(),sets=all.map(m=>new Set(tokens(m.text)));
 for(const set of sets)for(const [w] of mainWords)if(set.has(w))df.set(w,(df.get(w)||0)+1);
 const scores=all.map((m,i)=>{let score=0;for(const [w,weight] of mainWords)if(sets[i].has(w))score+=weight*Math.log(1+all.length/(1+(df.get(w)||0)));if(wanted.has(m.speaker))score+=2;return score;});
 const ranked=all.map((_,i)=>({i,score:scores[i]+(scores[i-1]||0)*0.35+(scores[i+1]||0)*0.35})).sort((a,b)=>b.score-a.score||a.i-b.i),picked=[],used=new Set();
 for(const {i,score} of ranked){
  if(score<=0||picked.length>=8)break;if(used.has(i))continue;
  const anchor=all[i],indices=[];for(let j=Math.max(0,i-2);j<=Math.min(all.length-1,i+2);j++)if(all[j].date===anchor.date&&Math.abs(all[j].index-anchor.index)<=8&&!used.has(j))indices.push(j);
  if(indices.length<2)continue;const lines=indices.map(j=>({speaker:all[j].speaker,text:all[j].text.slice(0,420)}));if(new Set(lines.map(l=>l.speaker)).size<2)continue;
  indices.forEach(j=>used.add(j));picked.push({i,window:{date:anchor.date,lines}});
 }
 return picked.sort((a,b)=>a.i-b.i).map(x=>x.window);
}
export function storySimilarity(a,b){
 const grams=s=>{const w=normalize(s).match(/[\p{L}\p{N}]+/gu)||[],set=new Set();for(let i=0;i+3<w.length;i++)set.add(w.slice(i,i+4).join(' '));return set;};
 const x=grams(a),y=grams(b);if(!x.size||!y.size)return 0;let common=0;for(const g of x)if(y.has(g))common++;return common/Math.min(x.size,y.size);
}
