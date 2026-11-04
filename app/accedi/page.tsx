'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
type Status = { username: string; needs_activation: boolean };
const usernamePattern = /^[a-z0-9][a-z0-9_-]{2,39}$/;
function accountEmail(username:string){return username+'@accounts.ciuati.invalid';}
export default function Accedi(){
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [newPassword,setNewPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [user,setUser]=useState<User|null>(null);
 const [status,setStatus]=useState<Status|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!supabase){setLoading(false);return;}
  const client=supabase;
  const load=async()=>{
   const {data:{user:current}}=await client.auth.getUser();
   setUser(current);
   if(current){const {data}=await client.rpc('character_account_status');setStatus((data as Status[]|null)?.[0]??null);}
   setLoading(false);
  };
  void load();
  const {data:{subscription}}=client.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'){setUser(null);setStatus(null);}
  });
  return ()=>subscription.unsubscribe();
 },[]);
 async function login(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;
  const normalized=username.trim().toLowerCase();
  if(!usernamePattern.test(normalized)){setMessage('Username non valido.');return;}
  setBusy(true);setMessage('');
  const {data,error}=await supabase.auth.signInWithPassword({email:accountEmail(normalized),password});
  if(error||!data.user){setMessage('Credenziali non valide o account non ancora attivato.');setBusy(false);return;}
  const {data:rows,error:statusError}=await supabase.rpc('character_account_status');
  const record=(rows as Status[]|null)?.[0]??null;
  if(statusError||!record){await supabase.auth.signOut();setMessage('Questo account non è associato a un personaggio autorizzato.');setBusy(false);return;}
  setUser(data.user);setStatus(record);setPassword('');setBusy(false);
 }
 async function activate(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||!user)return;
  if(newPassword.length<12){setMessage('Usa almeno 12 caratteri.');return;}
  if(newPassword!==confirm){setMessage('Le password non coincidono.');return;}
  setBusy(true);setMessage('');
  const {error}=await supabase.auth.updateUser({password:newPassword});
  if(error){setMessage('Impossibile aggiornare la password: '+error.message);setBusy(false);return;}
  const {data, error:rpcError}=await supabase.rpc('complete_character_activation');
  if(rpcError||data!==true){setMessage('Password aggiornata. Attivazione da verificare con l’amministratore.');setBusy(false);return;}
  setStatus({...status!,needs_activation:false});setNewPassword('');setConfirm('');setMessage('Password personale impostata. Account attivo.');setBusy(false);
 }
 async function logout(){if(!supabase)return;await supabase.auth.signOut();setUser(null);setStatus(null);setMessage('');}
 return <main className="shell"><a href="/">← Torna alla saga</a><div className="eyebrow" style={{marginTop:40}}>AREA PERSONALE</div><h1>Accesso Ciuati</h1>
 {!supabase?<p>Servizio temporaneamente non configurato.</p>:loading?<p>Verifica sessione…</p>:
 !user?<section className="panel"><h2>Entra con il tuo character</h2><p>Gli account sono assegnati dall’amministratore. Al primo accesso usa la password temporanea ricevuta in privato.</p><form onSubmit={login}><label htmlFor="username">Nome character</label><input id="username" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)}/><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button type="submit" disabled={busy}>{busy?'Accesso…':'Accedi'}</button></form></section>:
 !status?<section className="panel"><h2>Accesso non autorizzato</h2><p>Nessun personaggio associato a questo account.</p><button onClick={logout}>Esci</button></section>:
 status.needs_activation?<section className="panel"><h2>Prima attivazione: {status.username}</h2><p>Scegli ora la tua password personale (almeno 12 caratteri).</p><form onSubmit={activate}><label htmlFor="new-password">Nuova password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><label htmlFor="confirm-password">Conferma password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/><button disabled={busy} type="submit">{busy?'Salvataggio…':'Attiva account'}</button></form><button onClick={logout}>Esci</button></section>:
 <section className="panel"><h2>Benvenuto, {status.username}</h2><p>Account attivo. La scheda personale sarà disponibile nella prossima versione.</p><button onClick={logout}>Esci</button></section>}
 {message&&<p role="status">{message}</p>}</main>;
}
