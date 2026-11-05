'use client';
import {useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
export default function Accedi(){const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
async function login(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);const {error,data}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error){setMessage('Accesso non riuscito: '+error.message);return;}setMessage(data.user?.app_metadata?.role==='admin'?'Accesso riuscito. Apri il pannello amministratore.':'Accesso riuscito. Non hai privilegi amministrativi.');}
return <main className="shell"><Link href="/">← Torna alla saga</Link><div className="eyebrow" style={{marginTop:40}}>AREA CIUATI</div><h1>Accesso alla Saga</h1><section className="panel"><h2>Accedi con le tue credenziali</h2><form onSubmit={login} style={{display:'grid',gap:14,maxWidth:420}}><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="submit" disabled={busy}>Accedi</button></form>{message&&<p role="status">{message}</p>}<p><Link href="/admin">Pannello amministratore</Link></p></section></main>;
}
