type Place = { id:string; name:string; description:string };
export default async function Luoghi() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 let places:Place[]=[];
 if(url && key) {try {const r=await fetch(url+'/rest/v1/saga_places?select=id,name,description&is_published=eq.true&order=name.asc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});if(r.ok) places=await r.json() as Place[];}catch{}}
 return <main className="shell"><a href="/">← Torna alla saga</a><div className="eyebrow" style={{marginTop:40}}>ATLANTE DELLA SAGA</div><h1>Luoghi</h1><p>I luoghi che fanno da scenario alle storie.</p>{places.length?places.map(p=><section className="panel" key={p.id}><h2>{p.name}</h2><p>{p.description}</p></section>):<section className="panel"><h2>Atlante in preparazione</h2><p>Qui appariranno i luoghi approvati per la pubblicazione.</p></section>}</main>;
}
