'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

type Character = {slug:string;display_name:string;avatar_path:string|null};
const characters=[
  {slug:'scema',name:'Viper'},
  {slug:'cece',name:'Cecè'},
  {slug:'le-fromage',name:'Le Fromage'},
  {slug:'barretta',name:'Barretta'},
  {slug:'hermano',name:'Hermano'},
  {slug:'giogale',name:'Giogale'},
] as const;

export default function Accedi(){
 const [selected,setSelected]=useState<string|null>(null);
 const [avatars,setAvatars]=useState<Record<string,string>>({});
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [firstAccess,setFirstAccess]=useState(false);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const modalRef=useRef<HTMLDivElement>(null);
 const passwordRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!selected)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'&&!busy){e.preventDefault();choose('');}
   if(e.key==='Tab'&&modalRef.current){const nodes=Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  };
  document.addEventListener('keydown',onKey);
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  passwordRef.current?.focus();
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=oldOverflow;previous?.focus();};
 },[selected,busy]);
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  supabase.from('characters').select('slug,display_name,avatar_path').in('slug',characters.map(c=>c.slug)).then(({data})=>{
   if(active&&data)setAvatars(Object.fromEntries((data as Character[]).filter(c=>c.avatar_path).map(c=>[c.slug,c.avatar_path!])));
  });
  return ()=>{active=false};
 },[]);
 const chosen=selected==='admin'?'Amministratore':characters.find(c=>c.slug===selected)?.name;
 const email=selected==='admin'?'admin@ciuati.invalid':selected+'@ciuati.invalid';
 function choose(slug:string){setSelected(slug);setPassword('');setConfirmPassword('');setFirstAccess(false);setMessage('');}
 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(!supabase||!selected)return setMessage('Servizio di autenticazione non configurato.');
  if(password.length<8)return setMessage('La password deve avere almeno 8 caratteri.');
  if(firstAccess&&password!==confirmPassword)return setMessage('Le due password non coincidono.');
  setBusy(true);setMessage('');
  try{
   if(firstAccess){
    if(selected==='admin'){setMessage('L’account amministratore è già configurato.');return;}
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{}}});
    if(error){setMessage(error.message);return;}
    if(!data.session){setMessage('Password inviata al servizio. Il primo accesso richiede la conferma dell’account da parte dell’amministratore.');return;}
   }else{
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage('Password errata oppure personaggio non ancora attivato. Al primo accesso usa «Imposta password».');return;}
   }
   const {data:{user}}=await supabase.auth.getUser();
   const isAdmin=user?.app_metadata?.role==='admin';
   const isCharacter=user?.app_metadata?.character_slug===selected;
   if((selected==='admin'&&!isAdmin)||(selected!=='admin'&&!isCharacter)){
    await supabase.auth.signOut();
    setMessage('Account non associato a questo personaggio. Contatta l’amministratore.');
    return;
   }
   window.location.assign(selected==='admin'?'/admin':'/personaggi/'+encodeURIComponent(selected));
  }catch{setMessage('Accesso non disponibile. Riprova.');}
  finally{setBusy(false);}
 }
 return <main className="shell saga-login">
  <Link href="/">← Torna alla saga</Link>
  <div className="eyebrow" style={{marginTop:36}}>IL PORTALE DELLA CERCHIA</div>
  <h1>Chi sei, <span>Ciuatu?</span></h1>
  <p>Scegli il tuo personaggio per accedere alla Saga.</p>
  <div className="saga-login-grid">
   {characters.map(c=><button type="button" key={c.slug} onClick={()=>choose(c.slug)} aria-pressed={selected===c.slug} className={'saga-login-card'+(selected===c.slug?' selected':'')}>
    <span className="saga-login-art">{avatars[c.slug]?<img src={avatars[c.slug]} alt="" />:<span className="saga-fallback">{c.name.slice(0,1)}</span>}</span>
    <strong>{c.name}</strong><small>MEMBRO DELLA CERCHIA</small>
   </button>)}
   <button type="button" onClick={()=>choose('admin')} aria-pressed={selected==='admin'} className={'saga-login-card saga-login-admin'+(selected==='admin'?' selected':'')}>
    <span className="saga-login-art saga-ai-art" aria-hidden="true"><svg viewBox="0 0 180 180" role="img"><path d="M30 150 Q17 64 90 23 Q163 64 150 150Z" fill="#372c54" stroke="#d4a65e" strokeWidth="5"/><path d="M48 121 47 83 69 53 111 53 133 83 132 121 105 146 75 146Z" fill="#263c54" stroke="#d7b97d" strokeWidth="4"/><rect x="61" y="83" width="58" height="39" rx="11" fill="#101828" stroke="#d7b97d" strokeWidth="3"/><rect x="69" y="94" width="17" height="13" rx="4" fill="#73dfed"/><rect x="95" y="94" width="17" height="13" rx="4" fill="#73dfed"/><path d="M82 132 Q90 139 98 132" fill="none" stroke="#e2bb73" strokeWidth="3"/><path d="M36 150 Q90 128 144 150" fill="none" stroke="#d7a75d" strokeWidth="5"/><path d="m114 148 25-24 5 5-23 26" fill="#f1db9c"/></svg></span>
    <strong>Admin</strong><small>IL CRONISTA ARCANO</small>
   </button>
  </div>
  {selected&&<div className="saga-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)choose('');}}><section ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="saga-modal-title" className="panel saga-login-panel saga-modal">
   <button type="button" className="saga-back" onClick={()=>choose('')}>← Cambia personaggio</button>
   <div className="saga-modal-emblem" aria-hidden="true">✦</div><h2 id="saga-modal-title">{chosen}</h2>
   <p>{firstAccess?'Imposta la password personale per il primo accesso.':'Inserisci la tua password personale.'}</p>
   <form onSubmit={submit}>
    <label htmlFor="saga-password">Password</label>
    <input ref={passwordRef} id="saga-password" type="password" autoComplete={firstAccess?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/>
    {firstAccess&&<><label htmlFor="saga-password-confirm">Conferma password</label><input id="saga-password-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8}/></>}
    <button type="submit" disabled={busy}>{busy?'Verifica in corso…':firstAccess?'Salva password':'Accedi'}</button>
   </form>
   {selected!=='admin'&&<button className="saga-switch" type="button" onClick={()=>{setFirstAccess(v=>!v);setMessage('');setPassword('');setConfirmPassword('')}}>{firstAccess?'Hai già una password? Accedi':'Primo accesso? Imposta password'}</button>}
   {message&&<p role="status" className="saga-login-message">{message}</p>}
  </section></div>}
 </main>;
}
