# Protocollo canonico e memoria evolutiva — Ciuati, La Saga

## Fonte di verità
- `lore/personaggi/<slug>.md`: memoria narrativa canonica, verificabile e versionata in Git.
- `public.characters.profile.dossier` in Supabase: **vista sintetica derivata** per gli identikit pubblici.
- `saga_character_relations` e `saga_events`: rappresentazioni interrogabili del mondo e degli episodi.
- La descrizione visibile non deve mai sostituire i Markdown originali.

## Personaggi principali
`scema` (Viper), `cece` (Ceceno), `giogale`, `barretta`, `hermano`, `le-fromage`.

## Regola append-only
1. Le sezioni iniziali contengono i fatti canonici di partenza. Non editarle o cancellarle per gli aggiornamenti automatici.
2. Ogni modifica narrativa produce **una nuova voce** nella sezione `Registro append-only` del relativo personaggio; mai una riscrittura di voci precedenti.
3. Se una voce è inesatta, aggiungere una **rettifica** che citi la voce originaria, preservandola.
4. Ogni append deve indicare data, episodio/fonte, classificazione, grado di conferma e conseguenze narrative.
5. La verifica tecnica dell'append confronta il blob precedente e quello nuovo: il nuovo contenuto **deve iniziare con i byte esatti di quello precedente**; solo una coda non vuota è consentita. Vietato alterare frontespizio, delimitatori o testo esistente.
6. L'AI deve aprire una modifica versionata (preferibilmente PR) e non scrivere direttamente sul ramo principale senza controllo e audit. Gli episodi non approvati non possono aggiornare il canone.
7. Concorrenza: rileggere SHA attuale prima della modifica; in caso di conflitto, rileggere, rigenerare l'append e ripetere la verifica. Non sovrascrivere revisioni contemporanee.

## Tipi di informazione
- **Fatto confermato**: evento narrativo stabilito da un episodio approvato o da un dettaglio canonico dell'autore.
- **Testimonianza**: ciò che un altro personaggio dice o crede su questo personaggio. Conservare la fonte e il soggetto; non trasformarlo in un tratto oggettivo senza riscontri.
- **Voce**: ipotesi, diceria o leggenda, da attribuire chiaramente.
- **Sviluppo**: cambiamento della condotta mostrato dagli episodi, senza cancellare il carattere originario.
- **Rettifica**: correzione esplicita di una voce canonica precedente, con motivazione e riferimento.

## Pipeline futura del motore narrante
1. Caricare i sei file Markdown alla revisione Git nota, più i luoghi e gli eventi approvati.
2. Generare un episodio **coerente** con le informazioni canoniche, facendo distinguere narratore, dialoghi e dicerie.
3. Solo dopo approvazione/pubblicazione, estrarre per personaggio un elenco di nuove osservazioni con prove.
4. Proporre un append nei file interessati; verificare il prefisso byte-per-byte e revisionare.
5. Rileggere i file aggiornati e sintetizzare i soli campi pubblici richiesti dall'identikit in Supabase (identità, origine, ideali, forza, debolezza, mossa segreta).
6. Aggiornare relazioni e eventi sul DB, mantenendo separati **la cerchia** e **villains**.
7. Registrare la revisione Git sorgente e l'ID episodio; la sincronizzazione dev'essere idempotente e ripetibile.
8. Non attribuire automaticamente opinioni politiche reali, dati personali riservati o accuse a persone reali.

## Stato di integrazione
I file Markdown sono ora predisposti come fonte canonica. **Il collegamento automatico AI → append Git → sincronizzazione Supabase non è ancora implementato**. Nessun processo deve fingere di sincronizzarsi: esporre sempre lo stato e gli errori effettivi.
