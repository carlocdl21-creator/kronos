/* ══════════════════════════════════════════════════════════════════
   KRONOS by HANZO — avvio, accesso e collegamenti fra le parti.
   ══════════════════════════════════════════════════════════════════ */

import { CONFIG, isConfigurato } from "./config.js";
import { BASE, BY_ID, INIZIO_CONTRATTO, FINE_CONTRATTO } from "./baseline.js";
import { calc } from "./calcoli.js";
import { disegnaGantt, scala, larghezzaEtichette } from "./gantt.js";
import { disegnaCurva } from "./curva.js";
import {
  disegnaKpi, disegnaFoto, disegnaDdt, disegnaPresenze,
  disegnaRichieste, riempiSelettoriFase
} from "./views.js";
import {
  $, el, clear, toast, errMsg, fmtD, nf2, todayISO, csv, scaricaTesto, scaricaBlob
} from "./util.js";

/* ───────────────────────────── contesto ───────────────────────────── */

const A = {
  store: null,
  dati: { fasi:{}, foto:[], ddt:[], presenze:[], richieste:[] },
  oggi: todayISO(),
  tab: "crono",
  zoom: 1,      // 1 = tutta la commessa a schermo
  vista: "unico",   // "unico" = due barre nella stessa riga, "doppio" = due tavole
  faseAperta: null,
  reqFiltro: "",
  rqRisposta: null,
  rqApertI: new Set(),
  ruolo(){ return A.store?.utente?.ruolo || "committenza"; },
  isImpresa(){ return A.ruolo() === "impresa"; },
  ricarica, render, scaricaFile
};

/* ───────────────────────────── avvio ───────────────────────────── */

async function avvia(){
  if(isConfigurato()){
    const { creaStoreSupabase } = await import("./store-supabase.js");
    A.store = creaStoreSupabase();
  } else {
    const { creaStoreDemo } = await import("./store-demo.js");
    A.store = creaStoreDemo();
    $("demoBox").hidden = false;
    $("loginForm").hidden = true;
  }

  let dentro = false;
  try{ dentro = await A.store.init(); }
  catch(e){ mostraErroreLogin(errMsg(e)); }

  $("boot").hidden = true;
  if(dentro) await entraNellApp();
  else $("login").hidden = false;
}

async function entraNellApp(){
  $("login").hidden = true;
  $("app").hidden = false;
  $("connWarn").hidden = A.store.mode !== "demo";

  applicaRuolo();
  try{ await ricarica(); }
  catch(e){ toast(errMsg(e)); }

  A.store.onCambio(() => { ricarica().catch(() => {}); });
  clearInterval(A._poll);
  A._poll = setInterval(() => { if(!document.hidden) ricarica().catch(() => {}); },
                        Math.max(15, CONFIG.POLL_SECONDI) * 1000);
}

function mostraErroreLogin(msg){
  const box = $("logErr");
  box.textContent = msg;
  box.hidden = false;
}

/* ───────────────────────────── accesso ───────────────────────────── */

$("loginForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  $("logErr").hidden = true;
  const btn = $("logBtn");
  btn.disabled = true; btn.textContent = "Accesso in corso…";
  try{
    await A.store.entra($("logEmail").value.trim(), $("logPwd").value);
    $("logPwd").value = "";
    await entraNellApp();
  }catch(e){
    mostraErroreLogin(errMsg(e));
  }finally{
    btn.disabled = false; btn.textContent = "Accedi";
  }
});

document.querySelectorAll("[data-demo]").forEach(b => {
  b.addEventListener("click", async () => {
    await A.store.entraDemo(b.dataset.demo);
    await entraNellApp();
  });
});

$("btnLogout").addEventListener("click", async () => {
  clearInterval(A._poll);
  await A.store.esci();
  location.reload();
});

$("btnRefresh").addEventListener("click", async () => {
  try{ await ricarica(); toast("Dati aggiornati."); }
  catch(e){ toast(errMsg(e)); }
});

/* ───────────────────────────── dati e disegno ───────────────────────────── */

async function ricarica(){
  A.dati = await A.store.carica();
  render();
}

let attesa = null;
function render(){
  if(attesa) return;
  attesa = setTimeout(() => {
    attesa = null;
    const ae = document.activeElement;
    const keep = (ae && ae.id && /^fase-/.test(ae.id))
      ? {id:ae.id, v:ae.value} : null;

    applicaRuolo();
    disegnaKpi(A);
    riempiSelettoriFase(A);
    disegnaFoto(A);
    disegnaDdt(A);
    disegnaPresenze(A);
    disegnaRichieste(A);
    if(A.tab === "crono") disegnaCrono();

    if(keep){
      const n = $(keep.id);
      if(n){ if(keep.v != null && n.value !== keep.v) n.value = keep.v; n.focus(); }
    }
  }, 0);
}

/** Pixel per giorno: con zoom 1 l'intera commessa sta nella larghezza
 *  disponibile, così tutti i mesi restano sempre visibili. */
function pixelPerGiorno(sc){
  const cont = $("gscroll-base");
  const largh = (cont.clientWidth || window.innerWidth - 40) - larghezzaEtichette() - 2;
  const fit = Math.max(2, Math.floor(largh / sc.giorni));
  return Math.max(2, Math.round(fit * A.zoom));
}

function disegnaCrono(){
  const sc = scala(A.dati.fasi, A.oggi);
  const px = pixelPerGiorno(sc);
  const comune = { fasi:A.dati.fasi, oggi:A.oggi, px, sc };
  const modificabile = {
    editabile: A.isImpresa(),
    onDate: cambiaDate,
    onAvanz: (id, v) => salvaFase(id, {avanz:v}),
    onNota: apriNota
  };

  const unico = A.vista === "unico";
  $("cardUnico").hidden = !unico;
  $("vistaDoppia").hidden = unico;
  document.querySelectorAll("#vistaSwitch button").forEach(b =>
    b.classList.toggle("on", b.dataset.vista === A.vista));

  if(unico){
    disegnaGantt($("gbody-unico"), {...comune, modo:"unico", ...modificabile});
  } else {
    disegnaGantt($("gbody-base"),  {...comune, modo:"base"});
    disegnaGantt($("gbody-reale"), {...comune, modo:"reale", ...modificabile});
  }
  disegnaCurva($("curvaBox"), {fasi:A.dati.fasi, oggi:A.oggi, sc});
}

function applicaRuolo(){
  const imp = A.isImpresa();
  document.querySelectorAll(".impresa-only").forEach(n => { n.hidden = !imp; });
  document.querySelectorAll(".sa-only").forEach(n => { n.hidden = imp; });

  const chip = $("roleChip");
  chip.className = "role-chip " + (imp ? "impresa" : "sa");
  $("roleName").textContent = imp ? "Impresa esecutrice" : "Stazione Appaltante / DL";
  const u = A.store?.utente;
  const w = $("whoami"); clear(w);
  if(u){
    w.appendChild(el("b", null, u.nome));
    w.appendChild(el("span", null, u.email || ""));
  }
  $("footRole").textContent = imp
    ? "Vista impresa esecutrice"
    : "Vista Stazione Appaltante / Direzione Lavori — sola lettura";
}

/* ───────────────────────────── cronoprogramma ───────────────────────────── */

function cambiaDate(id, inizio, fine){
  salvaFase(id, {inizio, fine});
}

async function salvaFase(id, patch){
  if(!A.isImpresa()){ toast("Solo l'impresa esecutrice può modificare il cronoprogramma."); return; }
  const cur = A.dati.fasi[id] || {};
  const body = {
    inizio: cur.inizio || null,
    fine: cur.fine || null,
    avanz: typeof cur.avanz === "number" ? cur.avanz : 0,
    giust: cur.giust || "",
    giustData: cur.giustData || null,
    ...patch
  };
  if("giust" in patch) body.giustData = patch.giust ? new Date().toISOString() : null;
  if(body.inizio && body.fine && body.fine < body.inizio){
    toast("La data di fine non può precedere quella di inizio.");
    render();
    return;
  }
  A.dati.fasi[id] = {...body, aggiornatoIl:new Date().toISOString(), autore:A.store.utente?.nome};
  render();
  try{
    await A.store.salvaFase(id, body);
    await ricarica();
  }catch(e){
    toast(errMsg(e));
    await ricarica();
  }
}

/** Finestra per scrivere il motivo dello scostamento. */
function apriNota(r){
  const f = A.dati.fasi[r.id] || {};
  const c = calc(r, f, A.oggi);

  const back = el("div","modale");
  const box = el("div","modale-box");
  box.appendChild(el("h3", null, "Motivo dello scostamento"));
  box.appendChild(el("div","ctx",
    `${r.nome} — contratto ${fmtD(r.i)} → ${fmtD(r.f)} (${r.durata} gg), ` +
    `reale ${fmtD(c.effI)} → ${fmtD(c.effF)}. ` +
    `Scostamento: ${c.dI >= 0 ? "+" : ""}${c.dI} gg sull'avvio, ${c.dF >= 0 ? "+" : ""}${c.dF} gg sul termine.`));

  const lab = el("label","field");
  lab.appendChild(el("span", null, "Motivo e azione correttiva"));
  const ta = document.createElement("textarea");
  ta.value = (f.giust || "");
  ta.placeholder = "Es. consegna materiale posticipata dal fornitore; recupero con turno aggiuntivo del sabato.";
  ta.style.minHeight = "120px";
  lab.appendChild(ta);
  box.appendChild(lab);

  const riga = el("div","row-end");
  const chiudi = () => { back.remove(); document.removeEventListener("keydown", onk); };
  const onk = ev => { if(ev.key === "Escape") chiudi(); };

  if((f.giust || "").trim()){
    const togli = el("button","btn sm danger","Cancella motivo");
    togli.addEventListener("click", () => { chiudi(); salvaFase(r.id, {giust:""}); });
    riga.appendChild(togli);
  }
  const annulla = el("button","btn push","Annulla");
  annulla.addEventListener("click", chiudi);
  riga.appendChild(annulla);

  const salva = el("button","btn primary");
  salva.appendChild(el("i","bi bi-check-lg"));
  salva.appendChild(el("span", null, "Salva motivo"));
  salva.addEventListener("click", () => {
    const t = ta.value.trim();
    if(!t){ toast("Scrivere il motivo dello scostamento."); ta.focus(); return; }
    chiudi();
    salvaFase(r.id, {giust:t});
    toast("Motivo registrato: lo scostamento risulta giustificato.");
  });
  riga.appendChild(salva);
  box.appendChild(riga);

  back.appendChild(box);
  back.addEventListener("click", ev => { if(ev.target === back) chiudi(); });
  document.addEventListener("keydown", onk);
  document.body.appendChild(back);
  ta.focus();
}

/* ───────────────────────────── file ───────────────────────────── */

async function scaricaFile(path, nome){
  try{
    const b = await A.store.blobFile(path);
    if(!b){ toast("File non disponibile."); return; }
    scaricaBlob(b, nome);
  }catch(e){ toast(errMsg(e)); }
}

/* ───────────────────────────── foto ───────────────────────────── */

async function caricaFoto(files){
  if(!A.isImpresa()){ toast("Solo l'impresa esecutrice può caricare le foto."); return; }
  if(!A.faseAperta){ toast("Aprire prima la cartella della fase."); return; }
  const arr = Array.from(files || []);
  if(!arr.length) return;
  toast(`Caricamento di ${arr.length} file…`);
  let ok = 0;
  for(const file of arr){
    try{ await A.store.caricaFoto(file, {faseId:A.faseAperta, didascalia:""}); ok++; }
    catch(e){ toast(errMsg(e)); }
  }
  if(ok){
    toast(`${ok} foto caricate in “${BY_ID[A.faseAperta]?.nome || "—"}”.`);
    await ricarica();
  }
}

collegaDropzone($("fotoDrop"), $("fotoFile"), caricaFoto);

/* ───────────────────────────── bolle e DDT ───────────────────────────── */

async function caricaDdt(files){
  if(!A.isImpresa()){ toast("Solo l'impresa esecutrice può caricare i documenti."); return; }
  const arr = Array.from(files || []);
  if(!arr.length) return;
  toast(`Caricamento di ${arr.length} documenti…`);
  let ok = 0;
  for(const file of arr){
    try{ await A.store.aggiungiDdt(file); ok++; }
    catch(e){ toast(errMsg(e)); }
  }
  if(ok){ toast(`${ok} documenti caricati.`); await ricarica(); }
}

collegaDropzone($("ddtDrop"), $("ddtFile"), caricaDdt);
$("ddtPick").addEventListener("click", () => $("ddtFile").click());

function collegaDropzone(zona, input, azione){
  zona.addEventListener("click", () => input.click());
  input.addEventListener("change", ev => { azione(ev.target.files); ev.target.value = ""; });
  ["dragenter","dragover"].forEach(t =>
    zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add("hot"); }));
  ["dragleave","drop"].forEach(t =>
    zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove("hot"); }));
  zona.addEventListener("drop", e => { if(e.dataTransfer?.files) azione(e.dataTransfer.files); });
}

/* ───────────────────────────── presenze ───────────────────────────── */

$("mnSave").addEventListener("click", async () => {
  const data = $("mnData").value;
  const cognome = $("mnCognome").value.trim();
  const nome = $("mnNome").value.trim();
  const lavorazione = $("mnLavorazione").value.trim();
  if(!data){ toast("Indicare la giornata."); $("mnData").focus(); return; }
  if(!cognome && !nome){ toast("Indicare almeno il cognome dell'operaio."); $("mnCognome").focus(); return; }
  if(!lavorazione){ toast("Indicare la lavorazione svolta."); $("mnLavorazione").focus(); return; }

  const btn = $("mnSave"); btn.disabled = true;
  try{
    await A.store.aggiungiPresenza({
      data, nome, cognome,
      ore: Math.max(0, Number($("mnOre").value) || 0),
      lavorazione,
      impresa: $("mnImpresa").value.trim()
    });
    toast(`Presenza di ${[cognome, nome].filter(Boolean).join(" ")} registrata.`);
    // giornata, lavorazione e impresa restano: si passa all'operaio successivo
    $("mnNome").value = ""; $("mnCognome").value = "";
    $("mnCognome").focus();
    await ricarica();
  }catch(e){ toast(errMsg(e)); }
  finally{ btn.disabled = false; }
});

/* ───────────────────────────── richieste ───────────────────────────── */

$("rqApri").addEventListener("click", () => { $("rqForm").hidden = false; $("rqTit").focus(); });
$("rqChiudi").addEventListener("click", () => { $("rqForm").hidden = true; });

$("rqSend").addEventListener("click", async () => {
  const titolo = $("rqTit").value.trim();
  const testo = $("rqTxt").value.trim();
  if(!titolo || !testo){ toast("Compilare oggetto e testo della richiesta."); return; }
  const btn = $("rqSend"); btn.disabled = true;
  try{
    await A.store.aggiungiRichiesta({
      titolo, testo,
      faseId: $("rqFase").value,
      priorita: $("rqPrio").value,
      scadenza: $("rqDue").value || null
    });
    toast("Richiesta inoltrata all'impresa.");
    $("rqTit").value = ""; $("rqTxt").value = ""; $("rqDue").value = "";
    $("rqForm").hidden = true;
    await ricarica();
  }catch(e){ toast(errMsg(e)); }
  finally{ btn.disabled = false; }
});

/* ───────────────────────────── esportazioni ───────────────────────────── */

$("expCsv").addEventListener("click", () => {
  const rows = [["N","Attività","Livello","Contratto inizio","Contratto fine","Durata (gg)","Importo",
                 "Reale inizio","Reale fine","Avanzamento %","Δ inizio (gg)","Δ fine (gg)","Motivo dello scostamento"]];
  for(const r of BASE){
    const c = (r.foglia && !r.continua) ? calc(r, A.dati.fasi[r.id] || {}, A.oggi) : null;
    rows.push([r.n, r.nome, r.liv, fmtD(r.i), fmtD(r.f), r.durata, nf2(r.costo),
      c?.inizio ? fmtD(c.inizio) : "", c?.fine ? fmtD(c.fine) : "",
      c ? c.av : "", c ? c.dI : "", c ? c.dF : "", c ? c.just : ""]);
  }
  scaricaTesto(csv(rows), "cronoprogramma-3613-asilo-marcaria.csv");
});

$("mnCsv").addEventListener("click", () => {
  const rows = [["Giornata","Cognome","Nome","Ore","Lavorazione","Impresa"]];
  for(const r of A.dati.presenze.slice().sort((a,b) =>
      String(a.data||"").localeCompare(String(b.data||"")) ||
      String(a.cognome||"").localeCompare(String(b.cognome||"")))){
    rows.push([fmtD(r.data), r.cognome||"", r.nome||"", r.ore ?? 0,
               r.lavorazione||"", r.impresa||""]);
  }
  scaricaTesto(csv(rows), "presenze-cantiere-3613.csv");
});

/* ───────────────────────────── navigazione ───────────────────────────── */

function selezionaTab(t){
  A.tab = t;
  document.querySelectorAll(".tab").forEach(b =>
    b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
  for(const k of ["crono","foto","ddt","mano","req"]) $("tp-" + k).hidden = (k !== t);
  try{ localStorage.setItem("kronos.tab", t); }catch(e){}
  if(t === "crono") disegnaCrono();
}
document.querySelectorAll(".tab").forEach(b =>
  b.addEventListener("click", () => selezionaTab(b.dataset.tab)));

$("zoomIn").addEventListener("click", () => { A.zoom = Math.min(5, A.zoom + .5); disegnaCrono(); });
$("zoomOut").addEventListener("click", () => { A.zoom = Math.max(1, A.zoom - .5); disegnaCrono(); });

document.querySelectorAll("#vistaSwitch button").forEach(b =>
  b.addEventListener("click", () => {
    A.vista = b.dataset.vista;
    try{ localStorage.setItem("kronos.vista", A.vista); }catch(e){}
    disegnaCrono();
  }));

/* nella vista a due tavole lo scorrimento resta allineato */
(function sincronizzaScorrimento(){
  const a = $("gscroll-base"), b = $("gscroll-reale");
  let bloccato = false;
  const lega = (da, verso) => da.addEventListener("scroll", () => {
    if(bloccato) return;
    bloccato = true;
    verso.scrollLeft = da.scrollLeft;
    requestAnimationFrame(() => { bloccato = false; });
  });
  lega(a, b); lega(b, a);
})();

let rz = null;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => { if(A.tab === "crono") disegnaCrono(); }, 180);
});

/* ───────────────────────────── predisposizioni ───────────────────────────── */

try{
  const v = localStorage.getItem("kronos.vista");
  if(v === "unico" || v === "doppio") A.vista = v;
}catch(e){}
for(const [tinta, icona, titolo, valore] of [
  ["c-luogo",  "bi-geo-alt-fill",     "Luogo dei lavori",    "Marcaria (MN)"],
  ["c-cig",    "bi-hash",             "CIG",                 "BC7A0B7386"],
  ["c-avvio",  "bi-flag-fill",        "Consegna dei lavori", fmtD(INIZIO_CONTRATTO)],
  ["c-durata", "bi-hourglass-split",  "Durata contrattuale", "121 giorni"]
]){
  const c = el("span","st-chip " + tinta);
  c.title = titolo;
  c.appendChild(el("i","bi " + icona));
  c.appendChild(el("span", null, valore));
  $("stDati").appendChild(c);
}
$("mnData").value = A.oggi;
$("mnImpresa").value = "";
try{
  const t = localStorage.getItem("kronos.tab");
  selezionaTab(t && ["crono","foto","ddt","mano","req"].includes(t) ? t : "crono");
}catch(e){ selezionaTab("crono"); }

avvia().catch(e => {
  $("boot").hidden = true;
  $("login").hidden = false;
  mostraErroreLogin(errMsg(e));
});
