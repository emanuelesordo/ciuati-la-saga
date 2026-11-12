# Hosting operativo — Ciuati La Saga

La produzione usa esclusivamente GitHub Pages per il sito statico e Supabase per database, autenticazione, Storage e funzioni AI. Ramo: `migrazione/github-hosting`.

- URL: https://emanuelesordo.github.io/ciuati-la-saga/
- Frontend: `static-site/index.html` e moduli ES locali.
- Deploy: `.github/workflows/deploy-pages.yml` su push del ramo operativo.
- Backend narratore: `supabase/functions/saga-narratore/index.ts`; deploy della funzione nel progetto Supabase, senza API Next.js.
- Archivio chat: bucket privato `narrator-dialogues` con policy admin; importazione dal Narratore, nessun dato originale nel repository.
- Test: `node scripts/verify-narrative-dialogues.mjs`.

Il frontend Next.js storico non viene distribuito da GitHub Pages. Non effettuare deploy applicativi sul precedente hosting. L'integrazione Git esterna va scollegata dal relativo pannello se ancora configurata.
