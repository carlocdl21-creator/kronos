/* ==========================================================================
   Archivio dimostrativo — nessun server.
   Le schede restano in localStorage, i file (foto e allegati) in IndexedDB.
   Serve a mostrare l'applicativo funzionante prima di collegare Supabase:
   i dati NON sono condivisi fra utenti né fra dispositivi.
   ========================================================================== */


const K = "kronos.demo.v2";   // cambiando versione i vecchi dati di prova vengono ignorati
const DB_NAME = "kronos-files";

/* ---------- IndexedDB minimale per i file ---------- */
function idb(){
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("files");
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function putFile(key, blob){
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(blob, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function getFile(key){
  const db = await idb();
  return new Promise((res, rej) => {
    const rq = db.transaction("files", "readonly").objectStore("files").get(key);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  });
}
async function delFile(key){
  const db = await idb();
  return new Promise((res) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(key);
    tx.oncomplete = res; tx.onerror = res;
  });
}

const uid = () => "d" + Math.random().toString(36).slice(2, 11);

/* ---------- dati di esempio ---------- */
function semina(){
  return {
    fasi: {
      // ri-programmazione dichiarata prima dell'avvio: scostamento giustificato
      fondazioni: {inizio:"2026-10-07", fine:"2026-11-03", avanz:0,
        giust:"Avvio posticipato di 2 giorni per l'allestimento del cantiere e la bonifica del piano di posa. Il recupero è previsto sulle impermeabilizzazioni, che restano nei 5 giorni di contratto.",
        giustData:"2026-09-22T09:10:00.000Z", aggiornatoIl:"2026-09-22T09:10:00.000Z", autore:"Impresa esecutrice"},
      // stesso scostamento, ma senza motivo scritto: la barra resta rossa
      impermeab: {inizio:"2026-11-04", fine:"2026-11-08", avanz:0,
        giust:"", giustData:null, aggiornatoIl:"2026-09-22T09:12:00.000Z", autore:"Impresa esecutrice"}
    },
    foto: [],
    ddt: [],
    presenze: [],
    richieste: [
      {id:"r001", titolo:"Trasmissione certificati di posa e marcatura CE pannelli XLAM",
       testo:"Si richiede la trasmissione dei certificati di marcatura CE dei pannelli XLAM e della dichiarazione di corretta posa a firma del direttore tecnico di cantiere, con riferimento ai carichi di cui ai DDT 2026/1487 e 2026/1512.",
       stato:"presa", faseId:"xlam", priorita:"alta", scadenza:"2026-09-30",
       autore:"Direzione Lavori", creatoIl:"2026-09-18T09:05:00.000Z",
       eventi:[
         {at:"2026-09-18T09:05:00.000Z", autore:"Direzione Lavori", ruolo:"committenza", testo:"richiesta inoltrata"},
         {at:"2026-09-19T07:30:00.000Z", autore:"Impresa esecutrice", ruolo:"impresa", testo:"stato aggiornato: Presa in carico"},
         {at:"2026-09-19T07:32:00.000Z", autore:"Impresa esecutrice", ruolo:"impresa", testo:"Certificati richiesti al fornitore; trasmissione prevista entro il 26/09."}
       ]},
      {id:"r002", titolo:"Ripristino della recinzione di cantiere su Via Donizetti",
       testo:"A seguito del sopralluogo del 22/09 si rileva il cedimento di due campi di recinzione sul lato prospiciente Via Donizetti. Si richiede il ripristino immediato della delimitazione e della cartellonistica di sicurezza, con riscontro fotografico in piattaforma.",
       stato:"nuova", faseId:"", priorita:"urgente", scadenza:"2026-09-25",
       autore:"Stazione Appaltante", creatoIl:"2026-09-22T14:40:00.000Z",
       eventi:[{at:"2026-09-22T14:40:00.000Z", autore:"Stazione Appaltante", ruolo:"committenza", testo:"richiesta inoltrata"}]}
    ]
  };
}

function leggi(){
  try{
    const raw = localStorage.getItem(K);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* storage non disponibile: si riparte dai dati di esempio */ }
  const s = semina();
  scrivi(s);
  return s;
}
function scrivi(s){
  try{ localStorage.setItem(K, JSON.stringify(s)); }catch(e){ /* quota o modalità privata */ }
}

export function creaStoreDemo(){
  let stato = leggi();
  let listener = null;
  const notifica = () => { scrivi(stato); listener?.(); };

  return {
    mode: "demo",
    utente: null,
    statoRegistrazione: null,

    async init(){
      try{
        const u = JSON.parse(sessionStorage.getItem(K + ".utente") || "null");
        if(u){ this.utente = u; return true; }
      }catch(e){ /* ignora */ }
      return false;
    },
    async entra(){ throw new Error("Accesso non disponibile in modalità dimostrativa."); },
    async registra(){ throw new Error("Registrazione non disponibile in modalità dimostrativa."); },
    async utenze(){ return []; },
    async abilita(){}, async rifiuta(){},
    async entraDemo(ruolo){
      this.statoRegistrazione = "dentro";
      this.utente = {
        id: "demo-" + ruolo,
        ruolo,
        amministratore: ruolo === "impresa",
        nome: ruolo === "impresa" ? "Impresa esecutrice" : "Stazione Appaltante / DL",
        email: ruolo + "@dimostrativo.local"
      };
      try{ sessionStorage.setItem(K + ".utente", JSON.stringify(this.utente)); }catch(e){}
      return this.utente;
    },
    async esci(){
      this.utente = null;
      try{ sessionStorage.removeItem(K + ".utente"); }catch(e){}
    },

    async carica(){
      stato = leggi();
      return {
        fasi: stato.fasi || {},
        foto: stato.foto || [],
        ddt: stato.ddt || [],
        presenze: stato.presenze || [],
        richieste: stato.richieste || []
      };
    },

    async salvaFase(id, body){
      stato.fasi[id] = {...body, aggiornatoIl:new Date().toISOString(), autore:this.utente?.nome || "—"};
      notifica();
    },

    async caricaFoto(file, {faseId, didascalia}){
      const id = uid(), path = "foto/" + id;
      await putFile(path, file);
      stato.foto.push({id, faseId, didascalia, path, nomeFile:file.name, tipo:file.type,
        autore:this.utente?.nome || "—", creatoIl:new Date().toISOString()});
      notifica();
    },
    async eliminaFoto(f){
      stato.foto = stato.foto.filter(x => x.id !== f.id);
      await delFile(f.path);
      notifica();
    },
    async urlFile(path){
      if(!path) return null;
      const b = await getFile(path);
      return b ? URL.createObjectURL(b) : null;
    },
    async blobFile(path){ return path ? await getFile(path) : null; },

    async aggiungiDdt(file){
      const id = uid(), path = "doc/" + id;
      await putFile(path, file);
      stato.ddt.push({id, path, nomeFile:file.name, tipo:file.type,
        autore:this.utente?.nome || "—", creatoIl:new Date().toISOString()});
      notifica();
    },
    async eliminaDdt(r){
      stato.ddt = stato.ddt.filter(x => x.id !== r.id);
      if(r.path) await delFile(r.path);
      notifica();
    },

    async aggiungiPresenza(p){
      stato.presenze.push({id:uid(), ...p, autore:this.utente?.nome || "—", creatoIl:new Date().toISOString()});
      notifica();
    },
    async eliminaPresenza(p){
      stato.presenze = stato.presenze.filter(x => x.id !== p.id);
      notifica();
    },

    async aggiungiRichiesta(r){
      const now = new Date().toISOString();
      stato.richieste.push({id:uid(), ...r, stato:"nuova", autore:this.utente?.nome || "—", creatoIl:now,
        eventi:[{at:now, autore:this.utente?.nome || "—", ruolo:this.utente?.ruolo, testo:"richiesta inoltrata"}]});
      notifica();
    },
    async aggiungiEvento(r, testo, nuovoStato){
      const q = stato.richieste.find(x => x.id === r.id);
      if(!q) return;
      q.eventi = (q.eventi || []).concat([{at:new Date().toISOString(),
        autore:this.utente?.nome || "—", ruolo:this.utente?.ruolo, testo}]);
      if(nuovoStato) q.stato = nuovoStato;
      notifica();
    },

    onCambio(cb){ listener = cb; return () => { listener = null; }; },

    async azzera(){
      stato = semina();
      scrivi(stato);
      listener?.();
    }
  };
}
