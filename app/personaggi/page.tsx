type Character = { id: string; slug: string; display_name: string; biography: string; avatar_path: string | null };
async function getCharacters(): Promise<Character[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(url + '/rest/v1/characters?select=id,slug,display_name,biography,avatar_path&is_published=eq.true&order=display_name.asc', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
      cache: 'no-store'
    });
    if (!response.ok) return [];
    return await response.json() as Character[];
  } catch { return []; }
}
export default async function Personaggi() {
  const characters = await getCharacters();
  return <main className="shell"><a href="/">← Torna alla saga</a><div className="eyebrow" style={{marginTop:40}}>ARCHIVIO PUBBLICO</div><h1>Personaggi</h1><p>Gli identikit ufficiali dei protagonisti della saga.</p>{characters.length ? <div className="catalog">{characters.map(c => <article className="panel" key={c.id}><h2>{c.display_name}</h2><p>{c.biography || 'Identikit in preparazione.'}</p></article>)}</div> : <section className="panel"><h2>Nessun personaggio pubblicato</h2><p>Le schede compariranno qui dopo l'approvazione editoriale. Nessuna informazione privata viene mostrata.</p></section>}</main>;
}
