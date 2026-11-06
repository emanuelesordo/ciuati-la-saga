'use client';
import {useState,type ReactNode} from 'react';
export default function ProfileSections({sheet,contributions}:{sheet:ReactNode;contributions:ReactNode}){
 const [mode,setMode]=useState<'sheet'|'contributions'>('sheet');
 return <section className="profile-sections">
  <div className="profile-mode-tabs" role="tablist" aria-label="Modalità scheda">
   <button role="tab" aria-selected={mode==='sheet'} className={mode==='sheet'?'active':''} onClick={()=>setMode('sheet')}>Scheda</button>
   <button role="tab" aria-selected={mode==='contributions'} className={mode==='contributions'?'active':''} onClick={()=>setMode('contributions')}>Contributi</button>
  </div>
  <div role="tabpanel">{mode==='sheet'?sheet:contributions}</div>
 </section>;
}
