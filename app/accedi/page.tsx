'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
export default function Accedi() {
 const [email,setEmail]=useState('');
 const [code,setCode]=useState('');
 const [user,setUser]=useState<User|null>(null);
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!supabase)return;
  const client=supabase;
  void client.auth.getUser().then(({data})=>setUser(data.user));
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));
  return ()=>subscription.unsubscribe();
 },[]);
 async function requestCode(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy(true);setMessage('');
  const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:true}});
  setBusy(false);if(error){setMessage(error.message);return;}setSent(true);setMessage('Controlla la tua email: inserisci il codice ricevuto.');
 }
 async function verifyCode(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy(true);setMessage('');
  const {error}=await supabase.auth.verifyOtp({email:email.trim(),token:code.trim(),type:'email'});
  setBusy(false);if(error){setMessage(error.message);return;}setMessage('Accesso effettuato.');
 }
 async function signOut(){if(!supabase)return;await supabase.auth.signOut();setUser(null);setSent(false);setCode('');setMessage('Disconnessione effettuata.');}
 return <main className="shell"><a href="/">← Torna alla saga</a><div className="eyebrow" style={{marginTop:40}}>AREA PERSONALE</div><h1>Accesso</h1>
 {!supabase?<p>Autenticazione non configurata.</p>:user?<section className="panel"><h2>Accesso effettuato</h2><p>Account: {user.email}</p><p>La gestione dei personaggi sarà disponibile nel prossimo aggiornamento.</p><button onClick={signOut}>Esci</button></section>:
 <section className="panel"><h2>{sent?'Verifica email':'Entra o registrati'}</h2><p>Riceverai un codice monouso via email. Non serve una password.</p>
 {!sent?<form onSubmit={requestCode}><label htmlFor="email">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/><button disabled={busy} type="submit">{busy?'Invio…':'Invia codice'}</button></form>:
 <form onSubmit={verifyCode}><label htmlFor="code">Codice email</label><input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)}/><button disabled={busy} type="submit">{busy?'Verifica…':'Verifica codice'}</button><button type="button" onClick={()=>{setSent(false);setMessage('');}}>Cambia email</button></form>}
 {message&&<p role="status">{message}</p>}</section>}</main>;
}
