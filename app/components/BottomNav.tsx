'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

const items=[{href:'/',label:'Home',symbol:'⌂'},{href:'/personaggi',label:'Archivio',symbol:'▣'},{href:'/cronache',label:'Episodi',symbol:'▤'},{href:'/contributi',label:'Contributi',symbol:'✎'}];
export default function BottomNav(){
 const pathname=usePathname();
 const router=useRouter();
 const parent=pathname==='/'?null:pathname.startsWith('/archivio-personaggi/')?'/archivio-personaggi':pathname.startsWith('/personaggi/')?'/personaggi':pathname.startsWith('/cronache/')?'/cronache':pathname.startsWith('/admin/')?'/admin':pathname.split('/').slice(0,-1).join('/')||'/';
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{const {data}=await supabase?.auth.getUser()??{data:{user:null}};if(active)setAdmin(data.user?.app_metadata?.role==='admin');};
  void refresh();
  const {data}=supabase?.auth.onAuthStateChange(()=>{void refresh();})??{data:null};
  return()=>{active=false;data?.subscription.unsubscribe();};
 },[]);
 return <nav className="saga-bottom-nav" aria-label="Navigazione principale">
  <button type="button" disabled={!parent} onClick={()=>{if(parent)router.push(parent);}} aria-label="Torna al livello precedente"><span aria-hidden="true">←</span><small>Indietro</small></button>
  {items.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href||(item.href==='/personaggi'&&(pathname.startsWith('/personaggi/')||pathname.startsWith('/archivio-personaggi')))?'page':undefined}><span aria-hidden="true">{item.symbol}</span><small>{item.label}</small></Link>)}
  {admin&&<Link href="/admin" aria-current={pathname.startsWith('/admin')?'page':undefined}><span aria-hidden="true">⚙</span><small>Admin</small></Link>}
 </nav>;
}
