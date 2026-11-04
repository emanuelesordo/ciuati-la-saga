'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const characters = [
 {username:'barretta',name:'Barretta'},
 {username:'cece',name:'Cecè'},
 {username:'giogale',name:'Giogale'},
 {username:'hermano',name:'Hermano'},
 {username:'le-fromage',name:'Le Fromage'},
 {username:'scema',name:'ScEma'},
] as const;
const key='ciuati-selected-character';
export default function Accedi(){
 const [selected,setSelected]=useState('');
 const [entered,setEntered]=useState(false);
 useEffect(()=>{try{const value=sessionStorage.getItem(key)||'';if(characters.some(c=>c.username===value)){setSelected(value);setEntered(true)}}catch{}},[]);
 function enter(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!characters.some(c=>c.username===selected))return;try{sessionStorage.setItem(key,selected)}catch{}setEntered(true)}
 function exit(){try{sessionStorage.removeItem(key)}catch{}setEntered(false);setSelected('')}
 const character=characters.find(c=>c.username===selected);
 return <main className="shell"><Link href="/">← Torna alla saga</Link><div className="eyebrow" style={{marginTop:40}}>AREA CIUATI</div><h1>Accesso alla Saga</h1>
 {!entered?<section className="panel"><h2>Chi sei?</h2><p>Seleziona il tuo personaggio per entrare. Nessuna password richiesta.</p><form onSubmit={enter}><label htmlFor="character">Nome character</label><select id="character" required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Seleziona un personaggio</option>{characters.map(c=><option key={c.username} value={c.username}>{c.name}</option>)}</select><button type="submit" disabled={!selected}>Entra</button></form><p>Accesso dimostrativo: il nome selezionato non verifica l'identità e non autorizza modifiche o accesso a informazioni riservate.</p></section>:
 <section className="panel"><h2>Benvenuto, {character?.name}</h2><p>Sei entrato nell'area di consultazione.</p><h3>I protagonisti della Saga</h3><div className="catalog">{characters.map(c=><article key={c.username}><strong>{c.name}</strong></article>)}</div><p>Le schede narrative complete saranno visibili dopo la pubblicazione editoriale.</p><Link href="/personaggi">Apri archivio pubblico</Link><p><button type="button" onClick={exit}>Cambia personaggio / Esci</button></p></section>}
 </main>;
}
