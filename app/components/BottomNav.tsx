'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

const items=[{href:'/personaggi',label:'Archivio',symbol:'▣'},{href:'/cronache',label:'Episodi',symbol:'▤'},{href:'/contributi',label:'Contributi',symbol:'✎'}];
export default function BottomNav(){
 const pathname=usePathname();
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{const {data}=await supabase?.auth.getUser()??{data:{user:null}};if(active)setAdmin(data.user?.app_metadata?.role==='admin');};
  void refresh();
  const {data}=supabase?.auth.onAuthStateChange(()=>{void refresh();})??{data:null};
  return()=>{active=false;data?.subscription.unsubscribe();};
 },[]);
 return <nav className="saga-bottom-nav" aria-label="Navigazione principale">
  {items.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href||(item.href==='/personaggi'&&(pathname.startsWith('/personaggi/')||pathname.startsWith('/archivio-personaggi')))?'page':undefined}><span aria-hidden="true">{item.symbol}</span><small>{item.label}</small></Link>)}
  {admin&&<Link href="/admin" aria-current={pathname.startsWith('/admin')?'page':undefined}><span aria-hidden="true">⚙</span><small>Admin</small></Link>}
 </nav>;
}
