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
supabase/codici.sql     codici d'invito e prima utenza amministratrice
supabase/verifica.sql   controllo dell'installazione, non modifica nulla
dev-server.py           server locale di prova, senza cache
assets/                 icone e marchi del raggruppamento
manifest.json           per aggiungere KRONOS alla schermata Home del telefono
```

Nessuna dipendenza da installare e nessuna compilazione: sono file statici,
la libreria Supabase viene caricata dal CDN.

---

## Messa in funzione

### 1. Archivio condiviso (Supabase, piano gratuito)

1. Creare un progetto su <https://supabase.com> (regione Europa, es. Frankfurt).
   Annotare la password del database: Supabase la mostra una volta sola.
2. **SQL Editor → New query**: incollare per intero `supabase/schema.sql`
   ed eseguire. Si può ri-eseguire senza danni.
   - Se compare l'avviso *REGOLE SUI FILE NON CREATE*, l'utenza dell'editor
     non può scrivere sulle tabelle di sistema: creare a mano le tre regole
     da **Storage → Policies** sui bucket `foto` e `documenti`
     (lettura: utenti autenticati; caricamento ed eliminazione: solo impresa).
3. Creare **la sola utenza amministratrice** da **Authentication → Users →
   Add user → Create new user**, con **Auto Confirm User spuntato**.
   Tutti gli altri si registreranno da soli.
4. **SQL Editor**: aprire `supabase/codici.sql`, mettere la propria email al
   posto di `TUA-EMAIL@esempio.it` ed eseguire. Crea i due codici d'invito e
   abilita l'amministratore. In fondo stampa codici e utenze: annotare i codici.
5. Eseguire `supabase/verifica.sql`: sei righe, tutte devono dire **ok**.
   Chi dice *MANCA* indica da sé come rimediare.
6. **Project Settings → API**: copiare *Project URL* e la chiave
   *anon public* (sui progetti nuovi si chiama *publishable*, comincia per
   `sb_publishable_`) in `js/config.js`. Mai la *service_role*: quella
   scavalca tutte le regole di accesso.

### Come entrano gli altri

Ognuno si registra dal sito con **il codice della propria parte**: quello
`SA-…` per Stazione Appaltante e Direzione Lavori, quello `IMP-…` per
l'impresa. Il ruolo lo decide il database leggendo il codice, non il browser:
chi ha il codice della committenza non può entrare come impresa.

Chi si registra resta **in attesa**. L'amministratore vede il pulsante con il
numero delle richieste nella testata di KRONOS e abilita o rifiuta con un
tocco. Il codice dice da che parte stai, l'abilitazione dice se entri.

I codici hanno **scadenza** (120 giorni) e un tetto di **registrazioni** —
20 per la committenza, 30 per l'impresa: non è il numero di accessi, è quante
persone possono registrarsi con quel codice. Si revocano in una riga:

```sql
update public.codici_invito set attivo = false where codice = 'SA-…';
```

Il modello è stato provato su PostgreSQL 16 impersonando i ruoli: un utente
abilitato non riesce a nominarsi amministratore, a cambiarsi ruolo, ad
abilitare altri, a leggere o creare codici; un codice inesistente viene
respinto; chi è in attesa non vede nulla del cantiere.

> Il piano gratuito mette in pausa il progetto dopo una settimana senza
> accessi: si riattiva dal pannello in un minuto. Per un cantiere vero
> conviene il piano a pagamento.

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

## Dal telefono, in cantiere

L'impresa lavora dal telefono: nelle foto delle lavorazioni e nelle bolle
compare il pulsante **Scatta foto**, che apre direttamente la fotocamera
posteriore (`capture="environment"`), senza passare dalla galleria. Accanto
resta il pulsante per scegliere immagini o PDF già salvati.

Le foto vengono **ridotte prima di partire** (lato massimo 2200 px, JPEG
82%): uno scatto da 4 MB diventa circa 400 KB, mantenendo l'orientamento.
Con poco campo fa la differenza fra un caricamento e un'attesa inutile, e
l'archivio gratuito di Supabase (1 GB) regge molte più foto.

Anche il foglio presenze è pensato per il telefono: campi a tutta larghezza,
testo a 16 px — sotto quella misura iOS ingrandisce la pagina a ogni tocco —
e giornata, lavorazione e impresa che restano compilate fra un operaio e
l'altro.

Conviene aggiungere il sito alla schermata Home: su iPhone *Condividi →
Aggiungi a Home*, su Android *Installa app*. Grazie a `manifest.json` si apre
a tutto schermo, senza la barra del browser, e sembra un'applicazione.

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
