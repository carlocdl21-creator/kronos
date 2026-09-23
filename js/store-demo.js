/* ==========================================================================
   Archivio dimostrativo — nessun server.
   Le schede restano in localStorage, i file (foto e allegati) in IndexedDB.
   Serve a mostrare l'applicativo funzionante prima di collegare Supabase:
   i dati NON sono condivisi fra utenti né fra dispositivi.
   ========================================================================== */

import { todayISO } from "./util.js";

const K = "kronos.demo.v1";
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
  const T = todayISO();
  return {
    fasi: {
      fondazioni: {inizio:"2026-08-03", fine:"2026-08-29", avanz:100,
        giust:"Avvio posticipato di 2 giorni per il completamento della bonifica del piano di posa. Fine slittata di 3 giorni per sospensione delle lavorazioni nelle giornate del 18 e 19/08 (allerta meteo arancione). Recupero programmato sulle opere di impermeabilizzazione.",
        giustData:"2026-08-31T07:40:00.000Z", aggiornatoIl:"2026-08-31T07:40:00.000Z", autore:"Impresa esecutrice"},
      impermeab: {inizio:"2026-08-31", fine:"2026-09-04", avanz:100,
        giust:"Slittamento di 4 giorni conseguente al termine delle opere di fondazione. Durata della lavorazione invariata (5 gg): nessun impatto sull'avvio del montaggio XLAM.",
        giustData:"2026-09-04T15:10:00.000Z", aggiornatoIl:"2026-09-04T15:10:00.000Z", autore:"Impresa esecutrice"},
      xlam: {inizio:"2026-09-07", fine:"2026-09-22", avanz:100,
        giust:"Consegna dei pannelli XLAM posticipata di 6 giorni dal fornitore (rif. DDT n. 2026/1487 del 07/09). Durata di montaggio rispettata (16 gg). Azione correttiva: turno aggiuntivo del sabato sulle opere di copertura per il recupero del ritardo.",
        giustData:"2026-09-22T16:05:00.000Z", aggiornatoIl:"2026-09-22T16:05:00.000Z", autore:"Impresa esecutrice"},
      cop_strut: {inizio:"2026-09-23", fine:"2026-09-28", avanz:30,
        giust:"Avvio subordinato al completamento del montaggio XLAM (+6 gg). Squadra raddoppiata dal 23/09: la lavorazione si chiude in 6 giorni anziché 5, con recupero di 1 giorno sul ritardo accumulato.",
        giustData:"2026-09-23T06:50:00.000Z", aggiornatoIl:"2026-09-23T06:50:00.000Z", autore:"Impresa esecutrice"},
      cop_arch: {inizio:"2026-09-24", fine:"2026-10-03", avanz:5,
        giust:"", giustData:null, aggiornatoIl:"2026-09-23T06:52:00.000Z", autore:"Impresa esecutrice"}
    },
    foto: [],
    ddt: [
      {id:"ddt1487", numero:"2026/1487", data:"2026-09-07", fornitore:"Fornitore pannelli XLAM",
       descrizione:"Pannelli XLAM – 1° carico (pareti piano terra)", faseId:"xlam",
       path:null, nomeFile:null, autore:"Impresa esecutrice", creatoIl:"2026-09-07T09:20:00.000Z"},
      {id:"ddt1512", numero:"2026/1512", data:"2026-09-11", fornitore:"Fornitore pannelli XLAM",
       descrizione:"Pannelli XLAM – 2° carico (solaio di copertura) e ferramenta di collegamento", faseId:"xlam",
       path:null, nomeFile:null, autore:"Impresa esecutrice", creatoIl:"2026-09-11T08:15:00.000Z"}
    ],
    presenze: [
      {id:"p1", data:"2026-09-21", impresa:"Impresa esecutrice – squadra carpenteria", nOperai:7, ore:56,
       faseId:"xlam", nominativi:"Rossi M., Bianchi L., Ferrari A., Conti P., Moretti S., Rizzo D., Greco V.",
       autore:"Impresa esecutrice", creatoIl:"2026-09-21T17:00:00.000Z"},
      {id:"p2", data:"2026-09-22", impresa:"Impresa esecutrice – squadra carpenteria", nOperai:7, ore:56,
       faseId:"xlam", nominativi:"Rossi M., Bianchi L., Ferrari A., Conti P., Moretti S., Rizzo D., Greco V.",
       autore:"Impresa esecutrice", creatoIl:"2026-09-22T17:05:00.000Z"},
      {id:"p3", data:T, impresa:"Impresa esecutrice + subappalto lattoneria", nOperai:9, ore:72,
       faseId:"cop_strut", nominativi:"Rossi M., Bianchi L., Ferrari A., Conti P., Moretti S., Rizzo D., Greco V., Sala G., Neri F.",
       autore:"Impresa esecutrice", creatoIl:new Date().toISOString()}
    ],
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

    async init(){
      try{
        const u = JSON.parse(sessionStorage.getItem(K + ".utente") || "null");
        if(u){ this.utente = u; return true; }
      }catch(e){ /* ignora */ }
      return false;
    },
    async entra(){ throw new Error("Accesso non disponibile in modalità dimostrativa."); },
    async entraDemo(ruolo){
      this.utente = {
        id: "demo-" + ruolo,
        ruolo,
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

    async aggiungiDdt(meta, file){
      const id = uid();
      let path = null;
      if(file){ path = "doc/" + id; await putFile(path, file); }
      stato.ddt.push({id, ...meta, path, nomeFile:file?.name || null, tipo:file?.type || null,
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
