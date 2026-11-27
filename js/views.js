/* ══════════════════════════════════════════════════════════════════
   Disegno delle sezioni. Ogni funzione riceve il contesto A di app.js.
   ══════════════════════════════════════════════════════════════════ */

import { BY_ID, TRACCIATE, STATI, METEO, FINE_CONTRATTO } from "./baseline.js";
import { riepilogo } from "./calcoli.js";
import { el, clear, $, fmtD, fmtTs, nf0, nfOre, toast, errMsg, slug, estensione, MS, todayISO } from "./util.js";

const ORDINE_STATI = ["nuova","presa","lavorazione","terminata"];

/* ══════════════════════════ STATO COMMESSA ══════════════════════════ */

export function disegnaKpi(A){
  const k = riepilogo(A.dati.fasi, A.oggi);

  const lu = $("lastUpd"); clear(lu);
  const gg = k.ultimoAgg ? Math.floor((Date.now() - new Date(k.ultimoAgg).getTime()) / MS) : null;
  const vecchio = gg === null || gg > 7;
  lu.className = "st-agg" + (vecchio ? " scaduto" : "");
  lu.appendChild(el("i", "bi " + (vecchio ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill")));
  lu.appendChild(el("span", null, k.ultimoAgg
    ? `aggiornato ${gg === 0 ? "oggi" : gg === 1 ? "ieri" : gg + " giorni fa"}`
    : "mai aggiornato"));
  lu.title = k.ultimoAgg
    ? `Ultimo aggiornamento: ${fmtTs(k.ultimoAgg)}` +
      (vecchio ? " — il cronoprogramma va aggiornato ogni settimana." : "")
    : "L'impresa non ha ancora dichiarato avanzamenti.";

  $("realeHint").textContent = A.isImpresa()
    ? "Trascina le barre, tira i bordi per allungarle."
    : "Dichiarato dall'impresa.";

  /* Gli avvisi non sono più un cartello rosso largo quanto la pagina:
     due pastiglie accanto alle altre, che al clic portano sulla barra. */
  const av = $("avvisi"); clear(av);

  /* Perché i campi non si scrivono: detto qui, dov'è lo sguardo, e non
     lasciato capire dal fatto che non succede niente. */
  if(!A.isImpresa()){
    const p = el("span", "avviso info");
    p.appendChild(el("i","bi bi-eye"));
    p.appendChild(el("span", null, "sola lettura"));
    p.title = "Sei entrato come Stazione Appaltante / Direzione Lavori: " +
      "il cronoprogramma, gli avanzamenti e i caricamenti sono riservati " +
      "all\u2019impresa esecutrice.";
    av.appendChild(p);
  }

  if(k.senzaGiust.length){
    const q = k.senzaGiust.length;
    const p = el("button", "avviso no");
    p.type = "button";
    p.appendChild(el("i","bi bi-exclamation-triangle-fill"));
    p.appendChild(el("span", null,
      q === 1 ? "1 scostamento da giustificare" : `${q} scostamenti da giustificare`));
    p.title = k.senzaGiust.map(c => c.b.nome).join(", ") +
      (A.isImpresa() ? " — fai clic per andare alla barra" : "");
    p.addEventListener("click", () => A.vaiAllaFase(k.senzaGiust[0].b.id));
    av.appendChild(p);
  }

  if(k.slittamento > 0){
    const p = el("span", "avviso warn");
    p.appendChild(el("i","bi bi-calendar-x"));
    p.appendChild(el("span", null, `+${k.slittamento} gg sul termine`));
    p.title = `Fine lavori stimata al ${fmtD(k.fineStimata)}, ` +
      `contro il termine contrattuale del ${fmtD(FINE_CONTRATTO)}.`;
    av.appendChild(p);
  }
}

/* ══════════════════════════ FOTO (cartelle) ══════════════════════════ */

export function disegnaFoto(A){
  $("cnt-foto").textContent = A.dati.foto.length;
  const cartelle = $("fotoCartelle");
  const bread = $("fotoBread");
  const grid = $("fotoGrid");
  const drop = $("fotoDrop");
  const azioni = $("fotoAzioni");

  if(!A.faseAperta){
    /* ---- elenco cartelle ---- */
    bread.hidden = true; grid.hidden = true; drop.hidden = true; azioni.hidden = true;
    cartelle.hidden = false;
    clear(cartelle);
    for(const r of TRACCIATE){
      const n = A.dati.foto.filter(f => f.faseId === r.id).length;
      const b = el("button", "folder" + (n ? " piena" : ""));
      b.type = "button";
      const ico = el("div","ico");
      ico.appendChild(el("i", n ? "bi bi-folder-fill" : "bi bi-folder"));
      b.appendChild(ico);
      const tx = el("div","tx");
      tx.appendChild(el("b", null, r.nome));
      tx.appendChild(el("span", null, n ? `${n} foto` : "vuota"));
      b.appendChild(tx);
      b.addEventListener("click", () => { A.faseAperta = r.id; disegnaFoto(A); });
      cartelle.appendChild(b);
    }
    return;
  }

  /* ---- dentro una cartella ---- */
  const fase = BY_ID[A.faseAperta];
  cartelle.hidden = true;
  bread.hidden = false;
  grid.hidden = false;
  drop.hidden = !A.isImpresa();
  azioni.hidden = !A.isImpresa();

  clear(bread);
  const indietro = el("button","btn sm");
  indietro.appendChild(el("i","bi bi-arrow-left"));
  indietro.appendChild(el("span", null, "Tutte le fasi"));
  indietro.addEventListener("click", () => { A.faseAperta = null; disegnaFoto(A); });
  bread.appendChild(indietro);
  bread.appendChild(el("i","bi bi-chevron-right sep"));
  bread.appendChild(el("span","qui", fase?.nome || "Fase"));

  const lista = A.dati.foto
    .filter(f => f.faseId === A.faseAperta)
    .sort((a,b) => String(b.creatoIl||"").localeCompare(String(a.creatoIl||"")));

  bread.appendChild(el("span","muted", lista.length ? `${lista.length} foto` : "nessuna foto"));

  clear(grid);
  if(!lista.length){
    const e = el("div","empty");
    e.appendChild(el("i","bi bi-camera"));
    e.appendChild(el("b", null, "Cartella vuota"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Scatta o scegli le foto della lavorazione."
      : "L'impresa non ha ancora caricato foto per questa fase."));
    grid.appendChild(e);
    return;
  }
  const voci = lista.map(f => voceFoto(A, f));
  for(let i = 0; i < voci.length; i++) grid.appendChild(tessera(A, voci, i));
}

/* ══════════════════════════ GALLERIA ══════════════════════════

   Una tessera sola per le foto delle lavorazioni e per le bolle:
   l'immagine riempie il riquadro, la didascalia le sta sopra in
   sovraimpressione — data, ora e autore, che è quello che si cerca
   davvero quando si torna a guardare un cantiere — e le azioni
   compaiono all'angolo quando ci si passa sopra. Al clic la foto si
   apre a tutto schermo, con le frecce per scorrere tutta la cartella
   senza tornare indietro ogni volta.
   ══════════════════════════════════════════════════════════════ */

/** La foto di una lavorazione, normalizzata per la galleria. */
function voceFoto(A, f){
  return {
    path: f.path,
    immagine: true,
    titolo: f.didascalia || BY_ID[f.faseId]?.nome || "Foto della lavorazione",
    contesto: BY_ID[f.faseId]?.nome || "",
    quando: fmtTs(f.creatoIl),
    autore: f.autore || "",
    nomeScarico: nomeFoto(f),
    conferma: "Eliminare definitivamente questa foto?",
    elimina: () => A.store.eliminaFoto(f)
  };
}

const sottotitolo = v => v.quando + (v.autore ? " · " + v.autore : "");

/** Il riquadro grigio quando l'immagine non arriva: niente scatole rotte. */
function guasto(testo){
  const g = el("span","guasto");
  g.appendChild(el("i","bi bi-image-alt"));
  g.appendChild(el("span", null, testo || "Immagine non disponibile"));
  return g;
}

/**
 * Una tessera della galleria.
 * @param {object} A contesto dell'applicativo
 * @param {Array}  voci tutte le voci della cartella: servono al visore
 * @param {number} i quale di queste
 */
function tessera(A, voci, i){
  const v = voci[i];
  const box = el("div", "tessera" + (v.immagine ? "" : " doc"));

  const apri = el("button","tessera-apri");
  apri.type = "button";

  if(v.immagine){
    apri.setAttribute("aria-label", `Apri a tutto schermo: ${v.titolo}`);
    const scheletro = el("span","scheletro");
    apri.appendChild(scheletro);
    const img = document.createElement("img");
    img.alt = v.titolo;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("load",  () => { scheletro.remove(); img.classList.add("vista"); });
    img.addEventListener("error", () => { scheletro.remove(); apri.appendChild(guasto()); });
    A.store.urlFile(v.path).then(u => {
      if(!u){ scheletro.remove(); apri.appendChild(guasto()); return; }
      v.url = u; img.src = u;
    }).catch(() => { scheletro.remove(); apri.appendChild(guasto()); });
    apri.appendChild(img);
    apri.addEventListener("click", () => apriVisore(A, voci, i));
  } else {
    apri.setAttribute("aria-label", `Scarica: ${v.titolo}`);
    apri.appendChild(el("i","doc-ico bi bi-filetype-pdf"));
    apri.addEventListener("click", () => A.scaricaFile(v.path, v.nomeScarico));
  }

  const velo = el("span","velo");
  const lente = el("span","lente");
  lente.appendChild(el("i", v.immagine ? "bi bi-arrows-angle-expand" : "bi bi-download"));
  velo.appendChild(lente);
  apri.appendChild(velo);

  const cap = el("span","didascalia");
  cap.appendChild(el("b", null, v.titolo));
  cap.appendChild(el("span", null, sottotitolo(v)));
  apri.appendChild(cap);

  box.appendChild(apri);

  /* Le azioni stanno fuori dal pulsante che apre: un bottone dentro un
     altro bottone non è HTML valido e la tastiera ci si perde. */
  const az = el("div","tessera-azioni");
  const bd = el("button","tondo");
  bd.type = "button";
  bd.title = "Scarica";
  bd.setAttribute("aria-label", `Scarica ${v.titolo}`);
  bd.appendChild(el("i","bi bi-download"));
  bd.addEventListener("click", () => A.scaricaFile(v.path, v.nomeScarico));
  az.appendChild(bd);

  if(A.isImpresa() && v.elimina){
    const bx = el("button","tondo rosso");
    bx.type = "button";
    bx.title = "Elimina";
    bx.setAttribute("aria-label", `Elimina ${v.titolo}`);
    bx.appendChild(el("i","bi bi-trash"));
    bx.addEventListener("click", async () => {
      if(!confirm(v.conferma)) return;
      try{ await v.elimina(); toast("Eliminato."); await A.ricarica(); }
      catch(e){ toast(errMsg(e)); }
    });
    az.appendChild(bx);
  }
  box.appendChild(az);
  return box;
}

function nomeFoto(f){
  const base = slug(BY_ID[f.faseId]?.nome || "foto");
  const ext = estensione(f.nomeFile, (f.tipo || "image/jpeg").split("/")[1] || "jpg");
  return `${base}-${String(f.creatoIl || "").slice(0,10)}-${String(f.id).slice(0,4)}.${ext}`;
}

/**
 * Il visore a tutto schermo. Scorre solo le immagini della cartella —
 * i PDF si scaricano, non si sfogliano — con frecce, tastiera e
 * trascinamento del dito su telefono.
 */
function apriVisore(A, voci, partenza){
  const foto = voci.filter(v => v.immagine);
  if(!foto.length) return;
  let i = Math.max(0, foto.indexOf(voci[partenza]));

  const prima = document.body.style.overflow;
  let giro = 0;                              // per non far vincere un caricamento vecchio

  const vs = el("div","visore");
  vs.setAttribute("role","dialog");
  vs.setAttribute("aria-modal","true");
  vs.setAttribute("aria-label","Foto a tutto schermo");

  /* ---- barra in alto: che cosa si sta guardando, e le due azioni ---- */
  const barra = el("div","vs-barra");
  const tx = el("div","vs-tx");
  const tit = el("b"); const sub = el("span");
  tx.appendChild(tit); tx.appendChild(sub);
  barra.appendChild(tx);

  const gruppo = el("div","vs-azioni");
  const bScarica = el("button","vs-btn");
  bScarica.type = "button";
  bScarica.appendChild(el("i","bi bi-download"));
  bScarica.appendChild(el("span", null, "Scarica"));
  bScarica.addEventListener("click", () => A.scaricaFile(foto[i].path, foto[i].nomeScarico));
  gruppo.appendChild(bScarica);

  const bChiudi = el("button","vs-btn solo");
  bChiudi.type = "button";
  bChiudi.title = "Chiudi (Esc)";
  bChiudi.setAttribute("aria-label","Chiudi");
  bChiudi.appendChild(el("i","bi bi-x-lg"));
  gruppo.appendChild(bChiudi);
  barra.appendChild(gruppo);
  vs.appendChild(barra);

  /* ---- il palco ---- */
  const palco = el("div","vs-palco");
  /* La cornice ha misure proprie: senza, il massimo in percentuale
     dell'immagine non ha niente su cui calcolarsi e la foto esce dallo
     schermo. */
  const cornice = el("div","vs-cornice");
  const img = document.createElement("img");
  img.alt = "";
  img.addEventListener("load", () => img.classList.add("vista"));
  cornice.appendChild(img);
  palco.appendChild(cornice);
  vs.appendChild(palco);

  const prec = el("button","vs-nav prec");
  prec.type = "button"; prec.title = "Precedente"; prec.setAttribute("aria-label","Foto precedente");
  prec.appendChild(el("i","bi bi-chevron-left"));
  const succ = el("button","vs-nav succ");
  succ.type = "button"; succ.title = "Successiva"; succ.setAttribute("aria-label","Foto successiva");
  succ.appendChild(el("i","bi bi-chevron-right"));
  vs.appendChild(prec); vs.appendChild(succ);

  const conta = el("div","vs-conta");
  vs.appendChild(conta);

  /* ---- navigazione ---- */
  async function url(v){
    if(v.url) return v.url;
    try{ v.url = await A.store.urlFile(v.path); }catch(e){ v.url = null; }
    return v.url;
  }

  async function mostra(n){
    const mio = ++giro;
    i = (n + foto.length) % foto.length;
    const v = foto[i];
    tit.textContent = v.titolo;
    sub.textContent = (v.contesto && v.contesto !== v.titolo ? v.contesto + " · " : "") + sottotitolo(v);
    conta.textContent = `${i + 1} di ${foto.length}`;
    conta.hidden = foto.length < 2;
    prec.hidden = succ.hidden = foto.length < 2;
    img.alt = v.titolo;
    img.classList.remove("vista");
    palco.classList.add("attesa");
    const u = await url(v);
    if(mio !== giro) return;                   // nel frattempo si è girata pagina
    palco.classList.remove("attesa");
    if(!u){ img.removeAttribute("src"); toast("Immagine non disponibile."); return; }
    img.src = u;
    /* le vicine si scaricano prima che servano: lo sfoglio resta liscio */
    for(const k of [i + 1, i - 1]){
      const w = foto[(k + foto.length) % foto.length];
      if(w && w !== v) url(w).then(x => { if(x) new Image().src = x; });
    }
  }

  const vai = p => mostra(i + p);
  prec.addEventListener("click", () => vai(-1));
  succ.addEventListener("click", () => vai(1));

  const chiudi = () => {
    vs.remove();
    document.removeEventListener("keydown", tasti);
    document.body.style.overflow = prima;
  };
  const tasti = ev => {
    if(ev.key === "Escape"){ ev.preventDefault(); chiudi(); }
    else if(ev.key === "ArrowLeft"){ ev.preventDefault(); vai(-1); }
    else if(ev.key === "ArrowRight"){ ev.preventDefault(); vai(1); }
  };
  bChiudi.addEventListener("click", chiudi);
  vs.addEventListener("click", ev => {
    if(ev.target === vs || ev.target === palco || ev.target === cornice) chiudi();
  });
  document.addEventListener("keydown", tasti);

  /* dito su telefono: trascinare a destra o a sinistra cambia foto */
  let x0 = null, y0 = null;
  palco.addEventListener("touchstart", ev => {
    x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
  }, {passive:true});
  palco.addEventListener("touchend", ev => {
    if(x0 === null) return;
    const dx = ev.changedTouches[0].clientX - x0;
    const dy = ev.changedTouches[0].clientY - y0;
    x0 = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) vai(dx < 0 ? 1 : -1);
  }, {passive:true});

  document.body.style.overflow = "hidden";
  document.body.appendChild(vs);
  mostra(i);
  bChiudi.focus();
}

/* ══════════════════════════ BOLLE E DDT ══════════════════════════ */

export function disegnaDdt(A){
  $("cnt-ddt").textContent = A.dati.ddt.length;
  $("ddtDrop").hidden = !A.isImpresa();
  $("ddtAzioni").hidden = !A.isImpresa();

  const grid = $("ddtGrid"); clear(grid);
  const lista = A.dati.ddt.slice()
    .sort((a,b) => String(b.creatoIl||"").localeCompare(String(a.creatoIl||"")));

  $("ddtSub").textContent = lista.length
    ? `${lista.length} document${lista.length === 1 ? "o" : "i"} in archivio`
    : "Archivio vuoto";

  if(!lista.length){
    const e = el("div","empty");
    e.appendChild(el("i","bi bi-file-earmark-arrow-up"));
    e.appendChild(el("b", null, "Nessun documento"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Fotografa la bolla di consegna, oppure allega il PDF."
      : "L'impresa non ha ancora caricato bolle di consegna."));
    grid.appendChild(e);
    return;
  }

  /* Le bolle: le foto scattate al camion si sfogliano come le altre,
     i PDF allegati si scaricano e basta. */
  const voci = lista.map(r => ({
    path: r.path,
    immagine: String(r.tipo || "").startsWith("image/"),
    titolo: r.nomeFile || "Documento",
    contesto: "Bolla di consegna",
    quando: fmtTs(r.creatoIl),
    autore: r.autore || "",
    nomeScarico: r.nomeFile || `bolla-${String(r.id).slice(0,6)}.pdf`,
    conferma: `Eliminare \u201c${r.nomeFile || "il documento"}\u201d?`,
    elimina: () => A.store.eliminaDdt(r)
  }));
  for(let i = 0; i < voci.length; i++) grid.appendChild(tessera(A, voci, i));
}

/* ══════════════════════════ PRESENZE ══════════════════════════ */

export function disegnaPresenze(A){
  const tb = $("tbMano"); clear(tb);
  $("cnt-mano").textContent = A.dati.presenze.length;

  const lista = A.dati.presenze.slice().sort((a,b) => {
    const d = String(b.data||"").localeCompare(String(a.data||""));
    return d !== 0 ? d : String(a.cognome||"").localeCompare(String(b.cognome||""));
  });
  const ore = lista.reduce((a,r) => a + (Number(r.ore) || 0), 0);
  const giornate = new Set(lista.map(r => r.data)).size;
  $("mnSub").textContent = lista.length
    ? `${lista.length} ${lista.length === 1 ? "presenza" : "presenze"} su ` +
      `${giornate} ${giornate === 1 ? "giornata" : "giornate"} · ${nfOre(ore)} ore complessive`
    : "Nessuna presenza registrata";

  if(!lista.length){
    const tr = el("tr"), td = el("td");
    td.colSpan = 8;
    const e = el("div","empty");
    e.appendChild(el("i","bi bi-people"));
    e.appendChild(el("b", null, "Giornale vuoto"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Registra gli operai presenti in cantiere, uno per riga."
      : "L'impresa non ha ancora registrato le presenze giornaliere."));
    td.appendChild(e); tr.appendChild(td); tb.appendChild(tr);
    return;
  }

  let giornoPrec = null;
  for(const r of lista){
    const tr = el("tr");
    if(r.data !== giornoPrec){ tr.classList.add("nuovo-giorno"); giornoPrec = r.data; }
    tr.appendChild(el("td",null, fmtD(r.data)));

    const tdM = el("td");
    const m = METEO[r.meteo];
    if(m){
      const chip = el("span", "meteo " + r.meteo);
      chip.appendChild(el("i", "bi " + m.ico));
      chip.appendChild(el("span", null, m.lab));
      tdM.appendChild(chip);
    } else tdM.textContent = "—";
    tr.appendChild(tdM);

    const nome = [r.cognome, r.nome].filter(Boolean).join(" ") || "—";
    tr.appendChild(el("td","forte", nome));
    tr.appendChild(el("td",null, `${nfOre(Number(r.ore) || 0)} h`));
    tr.appendChild(el("td",null, r.lavorazione || "—"));
    tr.appendChild(el("td","col-impresa", r.impresa || "—"));
    tr.appendChild(el("td", r.note ? "nota" : "muted", r.note || "—"));
    const tdX = el("td");
    if(A.isImpresa()){
      const x = el("button","btn sm danger");
      x.appendChild(el("i","bi bi-trash"));
      x.title = "Elimina la presenza";
      x.addEventListener("click", async () => {
        if(!confirm(`Eliminare la presenza di ${nome} del ${fmtD(r.data)}?`)) return;
        try{ await A.store.eliminaPresenza(r); toast("Presenza eliminata."); await A.ricarica(); }
        catch(e){ toast(errMsg(e)); }
      });
      tdX.appendChild(x);
    }
    tr.appendChild(tdX);
    tb.appendChild(tr);
  }
}

/* ══════════════════════════ RICHIESTE ══════════════════════════ */

export function disegnaRichieste(A){
  const tutte = A.dati.richieste;
  const aperte = tutte.filter(r => r.stato !== "terminata").length;
  $("cnt-req").textContent = aperte;

  /* filtri con conteggio */
  const filtri = $("rqFiltri"); clear(filtri);
  const conta = s => tutte.filter(r => r.stato === s).length;
  const voci = [["", "Tutte", tutte.length], ...ORDINE_STATI.map(s => [s, STATI[s].lab, conta(s)])];
  for(const [val, lab, n] of voci){
    const b = el("button", "rq-f" + (A.reqFiltro === val ? " on" : ""));
    b.type = "button";
    b.appendChild(el("span", null, lab));
    b.appendChild(el("b", null, String(n)));
    b.addEventListener("click", () => { A.reqFiltro = val; disegnaRichieste(A); });
    filtri.appendChild(b);
  }

  const box = $("rqList"); clear(box);
  const lista = tutte
    .filter(r => !A.reqFiltro || r.stato === A.reqFiltro)
    .sort((a,b) => {
      const ap = a.stato === "terminata", bp = b.stato === "terminata";
      if(ap !== bp) return ap ? 1 : -1;               // le chiuse in fondo
      return String(b.creatoIl||"").localeCompare(String(a.creatoIl||""));
    });

  if(!lista.length){
    const e = el("div","empty");
    e.appendChild(el("i","bi bi-chat-left-dots"));
    e.appendChild(el("b", null, A.reqFiltro ? "Nessuna richiesta in questo stato" : "Nessuna richiesta"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Qui compaiono le richieste della Stazione Appaltante e della Direzione Lavori."
      : "Usa “Nuova richiesta” per inoltrare una richiesta formale all'impresa."));
    box.appendChild(e);
    return;
  }
  for(const r of lista) box.appendChild(schedaRichiesta(A, r));
}

function schedaRichiesta(A, r){
  const card = el("div","rq st-" + r.stato);
  card.appendChild(el("div","rq-stato-rail"));
  const main = el("div","rq-main");

  /* intestazione */
  const hd = el("div","rq-hd");
  hd.appendChild(el("h3", null, r.titolo || "Richiesta"));
  if(r.priorita && r.priorita !== "normale"){
    hd.appendChild(el("span", "pill " + (r.priorita === "urgente" ? "no" : "warn"),
      r.priorita === "urgente" ? "Urgente" : "Priorità alta"));
  }
  hd.appendChild(el("span", "pill " + pillStato(r.stato), STATI[r.stato]?.lab || "—"));
  main.appendChild(hd);

  /* riga informazioni */
  const meta = el("div","rq-meta");
  const pezzi = [`Inoltrata il ${fmtTs(r.creatoIl)}`];
  if(r.autore && r.autore !== "—") pezzi.push(r.autore);
  if(r.faseId && BY_ID[r.faseId]) pezzi.push(BY_ID[r.faseId].nome);
  pezzi.forEach((t, i) => {
    if(i) meta.appendChild(el("span","dot","·"));
    meta.appendChild(el("span", null, t));
  });
  if(r.scadenza){
    meta.appendChild(el("span","dot","·"));
    const scaduta = r.stato !== "terminata" && r.scadenza < todayISO();
    meta.appendChild(el("span", scaduta ? "rq-scaduta" : null,
      scaduta ? `riscontro scaduto il ${fmtD(r.scadenza)}` : `riscontro entro il ${fmtD(r.scadenza)}`));
  }
  main.appendChild(meta);

  main.appendChild(el("div","rq-testo", r.testo || ""));

  /* avanzamento della lavorazione */
  const st = el("div","stepper");
  const idx = ORDINE_STATI.indexOf(r.stato);
  ORDINE_STATI.forEach((s, i) => {
    if(i) st.appendChild(el("i","bi bi-chevron-right step-freccia"));
    const passo = el("div", "step " + (i < idx ? "fatto" : i === idx ? "ora" : ""));
    const b = el("span","bullet");
    if(i < idx) b.appendChild(el("i","bi bi-check"));
    passo.appendChild(b);
    passo.appendChild(el("span", null, STATI[s].lab));
    if(A.isImpresa() && i !== idx && s !== "nuova"){
      passo.classList.add("cliccabile");
      passo.setAttribute("role","button");
      passo.tabIndex = 0;
      const vai = async () => {
        try{
          await A.store.aggiungiEvento(r, "stato aggiornato: " + STATI[s].lab, s);
          toast(`Richiesta ${STATI[s].lab.toLowerCase()}.`);
          await A.ricarica();
        }catch(e){ toast(errMsg(e)); }
      };
      passo.addEventListener("click", vai);
      passo.addEventListener("keydown", ev => { if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); vai(); } });
    }
    st.appendChild(passo);
  });
  main.appendChild(st);

  /* cronologia */
  const eventi = r.eventi || [];
  if(eventi.length){
    const tutti = A.rqApertI.has(r.id);
    const mostra = tutti ? eventi : eventi.slice(-3);
    const th = el("div","rq-thread");
    if(!tutti && eventi.length > 3){
      const piu = el("button","rq-piu", `Mostra tutti i ${eventi.length} passaggi`);
      piu.addEventListener("click", () => { A.rqApertI.add(r.id); disegnaRichieste(A); });
      th.appendChild(piu);
    }
    for(const ev of mostra){
      const it = el("div","rq-ev");
      const chi = ev.autore && ev.autore !== "—"
        ? ev.autore
        : (ev.ruolo === "impresa" ? "Impresa esecutrice" : "Stazione Appaltante / DL");
      it.appendChild(el("span","chi", chi));
      it.appendChild(el("span", null, " " + ev.testo));
      it.appendChild(el("span","quando", fmtTs(ev.at)));
      th.appendChild(it);
    }
    main.appendChild(th);
  }

  /* risposta */
  const acts = el("div","rq-acts");
  if(A.rqRisposta === r.id){
    const box = el("div","rq-rispondi");
    const ta = document.createElement("textarea");
    ta.placeholder = "Scrivi una nota o una risposta…";
    ta.id = "rq-nota-" + r.id;
    box.appendChild(ta);
    const invia = el("button","btn primary sm");
    invia.appendChild(el("i","bi bi-send"));
    invia.addEventListener("click", async () => {
      const t = ta.value.trim();
      if(!t) return;
      try{
        await A.store.aggiungiEvento(r, t, null);
        A.rqRisposta = null;
        toast("Nota registrata.");
        await A.ricarica();
      }catch(e){ toast(errMsg(e)); }
    });
    box.appendChild(invia);
    main.appendChild(box);
    const annulla = el("button","btn sm ghost","Annulla");
    annulla.addEventListener("click", () => { A.rqRisposta = null; disegnaRichieste(A); });
    acts.appendChild(annulla);
  } else {
    const b = el("button","btn sm");
    b.appendChild(el("i","bi bi-chat-left-text"));
    b.appendChild(el("span", null, "Aggiungi nota"));
    b.addEventListener("click", () => {
      A.rqRisposta = r.id;
      disegnaRichieste(A);
      document.getElementById("rq-nota-" + r.id)?.focus();
    });
    acts.appendChild(b);
  }
  main.appendChild(acts);

  card.appendChild(main);
  return card;
}

function pillStato(s){
  return s === "terminata" ? "ok" : s === "nuova" ? "neutral" : s === "lavorazione" ? "ink" : "warn";
}

/* ══════════════════════════ SELETTORI FASE ══════════════════════════ */

export function riempiSelettoriFase(A){
  for(const [id, conVuoto] of [["rqFase",true]]){
    const sel = $(id); if(!sel) continue;
    const prec = sel.value;
    clear(sel);
    if(conVuoto){
      const o = document.createElement("option");
      o.value = ""; o.textContent = "— non specificata —";
      sel.appendChild(o);
    }
    for(const r of TRACCIATE){
      const o = document.createElement("option");
      o.value = r.id; o.textContent = `${r.n}. ${r.nome}`;
      sel.appendChild(o);
    }
    if(prec) sel.value = prec;
  }
}
