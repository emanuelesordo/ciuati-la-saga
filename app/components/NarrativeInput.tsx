'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';

type Mention={type:'character'|'place'|'new_character';id?:string;name:string};
type Entry={id:string;name:string;type:'character'|'place'};
type Kind='ideology'|'perception'|'relationship'|'skill'|'weakness'|'fact'|'story'|'character_proposal';
const scopedKinds:Kind[]=['ideology','perception','relationship','skill','weakness','fact'];
const kinds:{value:Kind;label:string}[]=[
 {value:'ideology',label:'Ideologia: dichiarazioni e punti di vista'},{value:'perception',label:'Percezione di un personaggio'},
 {value:'relationship',label:'Relazione'},{value:'skill',label:'Abilità / mossa segreta'},
 {value:'weakness',label:'Debolezza'},{value:'fact',label:'Ruolo / fatto concreto'},{value:'story',label:'Spunto per la trama'},
 {value:'character_proposal',label:'Proponi un nuovo personaggio'}
];
export default function NarrativeInput({targetId,targetName,targetSecondaryId}:{targetId?:string;targetName?:string;targetSecondaryId?:string}){
 const scoped=Boolean(targetId||targetSecondaryId);
 const [kind,setKind]=useState<Kind>(scoped?'fact':'story');
 const [text,setText]=useState(''),[name,setName]=useState(''),[origin,setOrigin]=useState(''),[traits,setTraits]=useState(''),[role,setRole]=useState('');
 const [entries,setEntries]=useState<Entry[]>([]),[mentions,setMentions]=useState<Mention[]>([]);
 const [authenticated,setAuthenticated]=useState(false),[ownId,setOwnId]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [query,setQuery]=useState<string|null>(null);
 const area=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{
  if(!supabase)return;
  let alive=true;
  async function load(){
   const client=supabase!;
   const [{data:{user}},characters,places]=await Promise.all([
    client.auth.getUser(),client.from('characters').select('id,slug,display_name,owner_id').eq('is_published',true),
    client.from('saga_places').select('id,name').eq('is_published',true)
   ]);
   if(!alive)return;
   setAuthenticated(!!user && (user.app_metadata?.role==='admin'||(characters.data||[]).some(c=>c.owner_id===user.id||c.slug===user.app_metadata?.character_slug)));
   setOwnId((characters.data||[]).find(c=>c.owner_id===user?.id||c.slug===user?.app_metadata?.character_slug)?.id||null);
   setEntries([...(characters.data||[]).map(c=>({id:c.id,name:c.display_name,type:'character' as const})),...(places.data||[]).map(p=>({id:p.id,name:p.name,type:'place' as const}))]);
  }
  void load();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void load();});
  return()=>{alive=false;subscription.unsubscribe();};
 },[]);
 function update(value:string,cursor:number){
  setText(value);
  const match=scoped?null:value.slice(0,cursor).match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
  setQuery(match?match[1]:null);
 }
 function insertMention(entry:Entry|{name:string;type:'new_character'}){
  const node=area.current;const pos=node?.selectionStart??text.length;
  const prefix=text.slice(0,pos),match=prefix.match(/@([\p{L}\p{N}_-]*)$/u);
  if(!match)return;
  const start=pos-match[0].length;
  const next=text.slice(0,start)+'@'+entry.name+' '+text.slice(pos);
  setText(next);setMentions(old=>old.some(m=>m.type===entry.type&&m.name===entry.name)?old:[...old,{type:entry.type,name:entry.name,...('id'in entry?{id:entry.id}:{})}]);
  setQuery(null);
  requestAnimationFrame(()=>{node?.focus();node?.setSelectionRange(start+entry.name.length+2,start+entry.name.length+2);});
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();setNotice('');
  if(!supabase)return;
  if(scoped&&!scopedKinds.includes(kind)){setNotice('Nelle schede sono consentiti soltanto contributi riferiti al personaggio selezionato.');return;}
  if(kind==='ideology'&&!scoped){setNotice('Apri la scheda del personaggio per lasciare un contributo sulla sua ideologia.');return;}
  if(kind==='character_proposal'&&!name.trim()){setNotice('Inserisci il nome del nuovo personaggio.');return;}
  const content=kind==='character_proposal'?[name,origin,traits,role,text].filter(Boolean).join(' — '):text.trim();
  if(content.length<10||content.length>6000){setNotice('Il contributo deve contenere tra 10 e 6000 caratteri.');return;}
  setBusy(true);
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user||(!ownId&&user.app_metadata?.role!=='admin'))throw new Error('Solo i sei Ciuati autenticati possono contribuire.');
   const {data:created,error}=await supabase.from('narrative_inputs').insert({
    author_id:user.id,character_id:ownId,target_character_id:targetId||null,
    kind,content,status:'accepted',mentions:[...(scoped?[]:mentions.filter(m=>text.includes('@'+m.name))),...(targetSecondaryId?[{type:'secondary_character',id:targetSecondaryId,name:targetName||''}]:[])],
    proposal:kind==='character_proposal'?{name:name.trim(),origin:origin.trim(),traits:traits.trim(),role:role.trim()}:{}
   }).select('id').single();
   if(error)throw new Error('Salvataggio non riuscito: '+error.message);
   setText('');setMentions([]);setName('');setOrigin('');setTraits('');setRole('');
   if(kind==='character_proposal'&&created?.id){
    setNotice('Proposta salvata. Generazione della descrizione in corso…');
    const {data:{session}}=await supabase.auth.getSession();
    const ai=await fetch('/api/personaggi-secondari/genera',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({proposalId:created.id})}).catch(()=>null);
    const result=ai?await ai.json().catch(()=>null):null;
    setNotice(ai?.ok&&result?.ok?'Scheda elaborata dall’IA e salvata come bozza privata. L’admin potrà revisionarla e pubblicarla.':'Proposta e bozza salvate. Generazione IA non riuscita: '+(result?.error||'servizio non raggiungibile')+' L’admin potrà riprovare.');
   }else setNotice(scoped?'Contributo salvato nella memoria di '+(targetName||'questo personaggio')+'. L’IA lo elaborerà mantenendo il riferimento a questa scheda.':'Contributo generale registrato. Il narratore potrà utilizzarlo come spunto per la Saga.');
  }catch(error){setNotice(error instanceof Error?error.message:'Errore inatteso.');}
  finally{setBusy(false);}
 }
 if(!authenticated)return <section className="panel narrative-panel"><h2>Alimenta la Saga</h2><p>Per aggiungere idee, percezioni e nuove figure devi accedere con uno dei sei Ciuati.</p><Link href="/accedi">Accedi alla cerchia →</Link></section>;
 const suggestions=query===null?[]:entries.filter(e=>e.name.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))).slice(0,8);
 return <section className="panel narrative-panel"><div className="eyebrow">LE VOCI DELLA CERCHIA</div><h2>{scoped?'Contribuisci alla scheda':'Alimenta il narratore'}</h2><p>{scoped?'Questa testimonianza riguarda esclusivamente '+(targetName||'il personaggio selezionato')+'. Puoi descriverne rapporti e opinioni sugli altri, ma il contributo sarà attribuito soltanto a questa scheda.':'Condividi liberamente idee per gli episodi, luoghi, personaggi e sviluppi della trama.'} Ogni testimonianza viene registrata subito nella memoria interna con autore e provenienza; l’IA ne valuterà l’attendibilità rispetto alle fonti esistenti.</p>{scoped&&<p><Link href="/contributi">Vuoi proporre un’idea generale per la Saga? Vai ai Contributi →</Link></p>}
 <form onSubmit={submit} className="narrative-form">
 <label htmlFor="contribution-kind">Ambito</label>
 <select id="contribution-kind" value={kind} onChange={e=>setKind(e.target.value as Kind)}>{kinds.filter(k=>scoped?scopedKinds.includes(k.value):k.value!=='ideology').map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select>
 {kind==='character_proposal'&&<div className="narrative-proposal">
 <label>Nome del personaggio<input value={name} maxLength={120} onChange={e=>setName(e.target.value)} required/></label>
 <label>Origine<input value={origin} maxLength={250} onChange={e=>setOrigin(e.target.value)}/></label>
 <label>Carattere, ideali e particolarità<input value={traits} maxLength={500} onChange={e=>setTraits(e.target.value)}/></label>
 <label>Ruolo nella Saga<input value={role} maxLength={250} onChange={e=>setRole(e.target.value)}/></label>
 </div>}
 <label htmlFor="contribution-text">{kind==='character_proposal'?'Storia, relazioni e altri dettagli':'Racconta il tuo contributo'}</label>
 <div className="narrative-mention-wrap"><textarea ref={area} id="contribution-text" rows={5} maxLength={6000} value={text} onChange={e=>update(e.target.value,e.target.selectionStart)} onClick={e=>update(text,e.currentTarget.selectionStart)} placeholder={kind==='fact'?'Esempio: svolge il ruolo di riscossore delle tasse per gli Auronerum.':scoped?'Descrivi un aspetto di '+(targetName||'questo personaggio')+'…':'Scrivi @ per citare personaggi e luoghi…'} />
 {!scoped&&query!==null&&<div className="narrative-suggestions" role="listbox" aria-label="Suggerimenti per le menzioni">{suggestions.map(s=><button type="button" role="option" aria-selected={false} key={s.type+s.id} onClick={()=>insertMention(s)}>{s.type==='place'?'Luogo':'Personaggio'} · {s.name}</button>)}{query.trim()&&<button type="button" role="option" aria-selected={false} onClick={()=>insertMention({type:'new_character',name:query.trim()})}>Proponi nuovo personaggio: {query}</button>}</div>}</div>
 {kind==='fact'&&<small>Registra un ruolo, mestiere, incarico, abitudine o evento concreto. Se il fatto è solo una voce, specifica chi lo sostiene: il narratore non lo considererà automaticamente confermato.</small>}
 <small>{scoped?'Il contributo viene associato soltanto al personaggio aperto; per idee trasversali usa la sezione Contributi.':'Usa @ per collegare riferimenti esistenti o proporne di nuovi. I nuovi personaggi restano proposte finché non vengono approvati.'}</small>
 <button type="submit" disabled={busy}>{busy?'Invio…':'Invia al narratore'}</button>
 {notice&&<p role="status" className="narrative-notice">{notice}</p>}
 </form></section>;
}
