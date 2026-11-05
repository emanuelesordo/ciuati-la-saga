# Protocollo canonico — Ciuati, La Saga

## Tre livelli separati
- `lore/personaggi/<slug>.md`: **identikit stabile**, formato in undici campi. Aggiornamento editoriale esplicito, mai append automatico.
- `lore/relazioni/`: futura memoria delle relazioni, direzionale e soggettiva, con fonte e cronologia, in append-only; finché non esistono file, l'archivio relazionale è in Supabase (`saga_character_relations`).
- `lore/eventi/`: futura cronologia append-only degli episodi approvati; finché non esistono file, gli eventi sono conservati in Supabase (`saga_events`).
- `public.characters.profile.dossier`: vista pubblica storica, **non** fonte canonica e **non** autorizzazione a rivelare tutto. Le pagine pubbliche mostrano inizialmente soltanto teaser controllati.

## Personaggi principali
`scema` (Viper), `cece` (Cecè), `giogale`, `barretta`, `hermano`, `le-fromage`.

## Identikit
Campi: Nome intero, Nome breve, Soprannomi, Età, Origine, Residenza, Profilo caratteriale, Ideologia, Skills, Weakness, Descrizione panoramica.
I dettagli marcati da definire o da confermare non devono essere presentati come fatti.
Le revisioni editoriali degli identikit possono riscrivere il file con revisione e audit Git. Il guard append-only non si applica agli identikit.

## Rivelazione progressiva
Il narratore può consultare i sei identikit completi lato server, ma non deve riversarli integralmente negli episodi. Le rivelazioni avvengono attraverso azioni, dialoghi ed eventi pubblicati. I teaser pubblici sono separati dai contenuti canonici.
Non esporre dati personali reali, segreti, o affermazioni non validate.

## Append-only: solo relazioni ed eventi
Gli aggiornamenti AI futuri devono essere proposti e revisionati, con data, fonte, attendibilità e ID evento. Mai convertire testimonianze in fatti oggettivi. Le rettifiche sono voci nuove, non riscritture retroattive. Gli episodi in bozza non aggiornano la memoria approvata.

## Stato reale dell'integrazione
Il narratore legge gli identikit dal filesystem del deployment. La sincronizzazione automatica episodio → relazioni/eventi Git → Supabase **non è ancora implementata**; non dichiarare sincronizzazioni inesistenti.
