import AtlasMap, { type AtlasPlace } from './AtlasMap';
export default async function Luoghi() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 let places:AtlasPlace[]=[];
 if(url && key) {try {const r=await fetch(url+'/rest/v1/saga_places?select=id,slug,name,description&is_published=eq.true&order=name.asc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});if(r.ok) places=await r.json() as AtlasPlace[];}catch{}}
 return <main className="atlas-shell"><a href="/">← Torna alla Saga</a><div className="eyebrow" style={{marginTop:28}}>ATLANTE DELLA SAGA</div><h1>Le terre dei Ciuati</h1><p>Un mondo di città contese, regioni leggendarie e un santuario che non ha bisogno di presentazioni.</p>{places.length?<AtlasMap places={places}/>:<section className="panel"><h2>Atlante in preparazione</h2><p>I luoghi pubblicati appariranno qui non appena disponibili.</p></section>}</main>;
}
