# KRONOS by HANZO

Applicativo di programmazione e monitoraggio della commessa.

Articola l'opera nelle singole fasi costruttive definite dal cronoprogramma
contrattuale, confronta settimana per settimana l'avanzamento reale con quello
pianificato, impone la giustificazione scritta di ogni scostamento e mette a
disposizione della Stazione Appaltante e della Direzione Lavori una visione in
tempo reale del cantiere: cronoprogramma aggiornato, documentazione fotografica
delle lavorazioni, bolle di consegna dei materiali, elenco degli operai presenti
nelle singole giornate e registro delle richieste.

**Commessa di riferimento:** 3613 — Costruzione Nuovo Asilo Nido Comunale,
Comune di Marcaria (MN), CIG BC7A0B7386.
**Baseline:** elaborato `3613_E_GE_1016 — Cronoprogramma lavori`, rev. 00 del
13/07/2026 (121 giorni naturali, 01/08/2026 → 29/11/2026, € 771.395,62).

---

## I due accessi

| | Impresa esecutrice | Stazione Appaltante / Direzione Lavori |
|---|---|---|
| Cronoprogramma reale | trascina e allunga le barre, dichiara l'avanzamento, scrive il motivo degli scostamenti | consulta ed esporta |
| Foto lavorazioni | carica ed elimina dentro la cartella della fase | consulta e scarica |
| Bolle e DDT | carica ed elimina i documenti | consulta e scarica |
| Presenze cantiere | registra ed elimina | consulta ed esporta |
| Richieste | aggiorna lo stato (presa in carico → in lavorazione → terminata) e risponde | inoltra le richieste e risponde |

I permessi non sono soltanto nascosti nell'interfaccia: sono applicati dal
database tramite le policy RLS di `supabase/schema.sql`.

---

## Struttura del progetto

```
index.html              impaginazione dell'applicativo e schermata di accesso
css/app.css             foglio di stile unico (tema chiaro e scuro)
js/config.js            → UNICO FILE DA COMPILARE: indirizzo e chiave Supabase
js/app.js               avvio, accesso, eventi, esportazioni
js/baseline.js          le 31 righe del cronoprogramma contrattuale
js/calcoli.js           scostamenti, avanzamento atteso, avanzamento economico
js/gantt.js             le tavole di Gantt e il trascinamento delle barre
js/curva.js             curva a S: avanzamento previsto contro realizzato
js/views.js             disegno delle sezioni (cartelle foto, bolle, presenze, richieste)
js/store-supabase.js    archivio condiviso: database, file, tempo reale
js/store-demo.js        archivio dimostrativo locale (senza server)
js/util.js              date, numeri, CSV, messaggi
supabase/schema.sql     tabelle, ruoli, policy, bucket dei file
supabase/utenti.sql     assegnazione dei ruoli alle utenze
dev-server.py           server locale di prova, senza cache
```

Nessuna dipendenza da installare e nessuna compilazione: sono file statici,
la libreria Supabase viene caricata dal CDN.

---

## Messa in funzione

### 1. Archivio condiviso (Supabase, piano gratuito)

1. Creare un progetto su <https://supabase.com>.
2. Aprire **SQL Editor**, incollare ed eseguire per intero `supabase/schema.sql`.
3. Creare le utenze in **Authentication → Users → Add user**
   (indicare email e password, spuntare *Auto Confirm User*).
4. Assegnare i ruoli eseguendo `supabase/utenti.sql`, dopo aver sostituito
   email e nominativi con quelli reali.
5. In **Project Settings → API** copiare *Project URL* e chiave *anon public*
   e incollarle in `js/config.js`.

La chiave `anon` è pensata per stare nel browser: da sola non dà accesso a
nulla, perché ogni tabella è protetta dalle policy.

### 2. Pubblicazione del sito (GitHub Pages)

Il sito è statico: basta abilitare Pages sul repository.

**Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**

Il sito risponde entro un paio di minuti su
`https://<utente>.github.io/kronos/`.

### 3. Dominio proprio

Per pubblicarlo su `cantiere.get-hanzo.com`:

1. Nel DNS di `get-hanzo.com` aggiungere un record
   **CNAME** `cantiere` → `<utente>.github.io.`
2. In **Settings → Pages → Custom domain** indicare `cantiere.get-hanzo.com`
   e attendere la verifica.
3. Spuntare **Enforce HTTPS** quando il certificato risulta emesso
   (pochi minuti dopo la propagazione del DNS).

### 4. Prova in locale

I moduli ES non funzionano aprendo il file con doppio clic: serve un server.

```bash
cd ~/Desktop/KRONOS && python3 dev-server.py
```

Poi aprire <http://localhost:8099>.

`dev-server.py` è `http.server` con le intestazioni che impediscono al
browser di tenere in cache i moduli: senza, le modifiche non si vedono
finché non si ricarica tenendo premuto Shift.

---

## Modalità dimostrativa

Finché `js/config.js` resta vuoto, l'applicativo parte in modalità
dimostrativa: si sceglie il ruolo dalla schermata di accesso e i dati
(comprese le foto) restano sul dispositivo, in `localStorage` e `IndexedDB`.
Serve a mostrare il funzionamento in sede di gara, **non** all'uso in cantiere,
perché nulla viene condiviso fra gli utenti.

---

## Manutenzione

**Cambio di commessa.** Sostituire le 31 righe di `js/baseline.js` con la WBS
del nuovo cronoprogramma e aggiornare la testata in `index.html`
(oggetto, stazione appaltante, CIG, termini). Gli `id` delle righe
sono le chiavi della tabella `fasi`: cambiandoli si azzerano gli avanzamenti.

**Le due viste del cronoprogramma.** “Sovrapposto” mette nella stessa riga la
barra di contratto (sottile, grigia) e quella reale (spessa): lo sfasamento si
legge senza spostare gli occhi. “Due tavole” tiene i due cronoprogrammi
affiancati verticalmente, con la stessa scala e lo scorrimento sincronizzato.
Sopra, la curva a S confronta l'avanzamento economico cumulato previsto dal
contratto con quello realizzato: la forbice fra le due linee è il ritardo.
La curva reale è ricostruita dalle barre dichiarate e dalle percentuali di
avanzamento, non da una storia di rilevazioni settimanali.

**Scostamenti.** In `js/calcoli.js`: una lavorazione è in scostamento quando la
barra reale non coincide con quella di contratto (inizio o fine diversi). Finché
manca il motivo scritto la barra resta rossa; appena il motivo è inserito torna
al colore normale e il testo compare a fianco della barra.

**Aspetto.** `css/app.css` riprende il design system di HANZO: carattere Poppins,
palette neutra bianco/zinco/nero, semaforico discreto, raggi 8–14, ombre leggere.
