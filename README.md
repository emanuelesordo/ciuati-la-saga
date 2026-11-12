# Ciuati – La Saga

Piattaforma cloud per la saga fantasy corale e satirica.

## Architettura di produzione
- Ramo operativo: `migrazione/github-hosting`.
- Frontend: [GitHub Pages](https://emanuelesordo.github.io/ciuati-la-saga/), pubblicato da `static-site/` tramite `.github/workflows/deploy-pages.yml`.
- Database, autenticazione, Storage privato e Edge Functions: Supabase (eu-central-1).
- Narratore AI: Edge Function `saga-narratore`, con la chiave Gemini conservata esclusivamente nei segreti Supabase.
- Il codice Next.js legacy rimane nel repository, ma non è il frontend distribuito da Pages. I deploy automatici verso il precedente hosting sono disabilitati sul ramo operativo.

## Archivio dialoghi
Il narratore legge un archivio privato `narrator-dialogues/dialogues.json` solo dopo l'importazione amministratore dello ZIP/TXT WhatsApp. Gli estratti selezionati rispettano il capitolo cronologico e servono da campioni linguistici, non da canone. Nessun messaggio originale deve essere committato. La rigenerazione aggiorna la stessa bozza, preservando titolo e sinossi. I moduli di ricerca browser/Edge sono verificati insieme da `scripts/verify-narrative-dialogues.mjs`.

## Sicurezza
Non committare chiavi di servizio, credenziali, chat private o contenuti identificativi. I testi narrativi non sono pubblicati senza approvazione.

### Ricerca cronologica e voce dei personaggi
La generazione separa gli scambi del periodo del capitolo dai campioni linguistici pertinenti di altri periodi. Questi ultimi non possono introdurre avvenimenti futuri. Il ricalcolo della scaletta usa riferimenti dialogici del periodo di ciascun capitolo e la bozza iniziale esistente. La chat completa resta nello Storage privato, mai nel repository.
