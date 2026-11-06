# Migrazione hosting — Ciuati La Saga

## Verifiche dal sorgente
- Repository privato, ramo `main`.
- Next.js 16.1.6, React 19.2.4 e Supabase.
- `next.config.mjs` include esplicitamente file Markdown locali nel bundle della route server `/api/narratore` (`outputFileTracingIncludes`): questa route non può essere trasferita direttamente su GitHub Pages.
- `app/components/NarrativeInput.tsx` utilizza Supabase nel browser; autenticazione, permessi RLS e operazioni dinamiche devono essere testati separatamente.

## Vincoli e decisioni
- GitHub Pages distribuisce contenuti statici, non esegue API Next.js né funzioni server.
- Il repository è privato: verificare disponibilità di Pages in base al piano GitHub prima di configurare la pubblicazione. Non rendere pubblico il repository per aggirare i limiti senza audit di segreti e contenuti.
- GitHub Actions compila, ma non costituisce da solo un servizio di hosting per applicazioni server.
- Non cambiare `output: 'export'` prima di aver migrato `/api/narratore` e ogni altra route server.

## Sequenza senza downtime
1. Inventariare tutte le route server, middleware, immagini dinamiche e accessi a file locali.
2. Spostare il narratore in una funzione server sicura (ad esempio Supabase Edge Functions), adattando l'accesso al lore Markdown e proteggendo le chiavi.
3. Adattare Next.js a export statico e percorsi/basePath per Pages; verificare link e asset.
4. Creare workflow GitHub Actions con build/test e deploy Pages, se il piano supporta il repository privato; in alternativa scegliere hosting statico compatibile.
5. Verificare login, RLS, contributi, foto, carosello, cronache e narratore su mobile.
6. Solo dopo il collaudo, cambiare il dominio e disattivare Vercel.

**Stato:** audit iniziale; nessun cutover e nessuna pubblicazione effettuata. Il sito Vercel esistente rimane intatto.
