/* ==========================================================================
   KRONOS — avvio dell'applicativo, autenticazione e collegamenti fra le parti.
   ========================================================================== */

import { CONFIG, isConfigurato } from "./config.js";
import { BASE, BY_ID, TRACCIATE, FINE_CONTRATTO } from "./baseline.js";
import { calc } from "./calcoli.js";
import { disegnaGantt } from "./gantt.js";
import {
  disegnaKpi, disegnaTabella, disegnaFoto, disegnaDdt,
  disegnaPresenze, disegnaRichieste, riempiSelettoriFase
} from "./views.js";
import {
  $, el, clear, toast, errMsg, fmtD, nf2, todayISO,
  csv, scaricaTesto, scaricaBlob
} from "./util.js";

/* ------------------------------ contesto ------------------------------ */

const A = {
  store: null,
  dati: { fasi:{}, foto:[], ddt:[], presenze:[], richieste:[] },
  oggi: todayISO(),
  tab: "crono",
  px: 8,
  fotoFiltro: "",
  reqFiltro: "",
  ruolo(){ return A.store?.utente?.ruolo || "committenza"; },
  isImpresa(){ return A.ruolo() === "impresa"; },
  ricarica, render, salvaFase, scaricaFile
};

/* ------------------------------ avvio ------------------------------ */

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

  // aggiornamenti in tempo reale + riallineamento periodico di sicurezza
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

/* ------------------------------ accesso ------------------------------ */

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

/* ------------------------------ dati ------------------------------ */

async function ricarica(){
  A.dati = await A.store.carica();
  render();
}

let rafT = null;
function render(){
  if(rafT) return;
  // setTimeout e non requestAnimationFrame: una scheda in secondo piano
  // sospende i frame e la pagina resterebbe vuota fino al ritorno a fuoco.
  rafT = setTimeout(() => {
    rafT = null;
    // il ridisegno non deve far perdere il campo che si sta compilando
    const ae = document.activeElement;
    const keep = (ae && ae.id && /^fase-/.test(ae.id))
      ? {id:ae.id, v:ae.value, s:ae.selectionStart, e:ae.selectionEnd} : null;

    applicaRuolo();
    disegnaKpi(A);
    disegnaTabella(A);
    riempiSelettoriFase(A);
    disegnaFoto(A);
    disegnaDdt(A);
    disegnaPresenze(A);
    disegnaRichieste(A);
    if(A.tab === "crono") disegnaGantt($("gbody"), {fasi:A.dati.fasi, oggi:A.oggi, px:A.px});

    if(keep){
      const n = $(keep.id);
      if(n){
        if(keep.v != null && n.value !== keep.v) n.value = keep.v;
        n.focus();
        try{ if(keep.s != null) n.setSelectionRange(keep.s, keep.e); }catch(e){}
      }
    }
  }, 0);
}

function applicaRuolo(){
  const imp = A.isImpresa();
  document.querySelectorAll(".impresa-only").forEach(n => { n.hidden = !imp; });
  document.querySelectorAll(".sa-only").forEach(n => { n.hidden = imp; });

  $("roleChip").className = "role-chip " + (imp ? "impresa" : "sa");
  $("roleName").textContent = imp ? "Impresa esecutrice" : "Stazione Appaltante / Direzione Lavori";
  $("rolePerm").textContent = imp
    ? "Aggiorna il cronoprogramma, carica ed elimina foto e documenti, registra le presenze e gestisce lo stato delle richieste."
    : "Consultazione e download di cronoprogramma, foto, bolle e presenze; può inoltrare richieste all'impresa.";
  $("whoami").textContent = A.store?.utente ? `${A.store.utente.nome} · ${A.store.utente.email}` : "";
  $("footRole").textContent = imp
    ? "Vista impresa esecutrice"
    : "Vista Stazione Appaltante / Direzione Lavori (sola lettura)";
}

/* --------------------------- cronoprogramma --------------------------- */

async function salvaFase(id, campo, valore){
  const cur = A.dati.fasi[id] || {};
  const body = {
    inizio: cur.inizio || null,
    fine: cur.fine || null,
    avanz: typeof cur.avanz === "number" ? cur.avanz : 0,
    giust: cur.giust || "",
    giustData: cur.giustData || null
  };
  body[campo] = valore;
  if(campo === "giust") body.giustData = valore ? new Date().toISOString() : null;
  if(body.inizio && body.fine && body.fine < body.inizio){
    toast("La data di fine non può precedere quella di inizio.");
    render();
    return;
  }
  A.dati.fasi[id] = {...body, aggiornatoIl:new Date().toISOString(), autore:A.store.utente?.nome};
  render();
  try{
    await A.store.salvaFase(id, body);
    toast("Avanzamento registrato.");
    await ricarica();
  }catch(e){
    toast(errMsg(e));
    await ricarica();
  }
}

/* ------------------------------ file ------------------------------ */

async function scaricaFile(path, nome){
  try{
    const b = await A.store.blobFile(path);
    if(!b){ toast("File non disponibile."); return; }
    scaricaBlob(b, nome);
  }catch(e){ toast(errMsg(e)); }
}

/* ------------------------------ foto ------------------------------ */

async function caricaFoto(files){
  if(!A.isImpresa()){ toast("Solo l'impresa esecutrice può caricare le foto."); return; }
  const arr = Array.from(files || []);
  if(!arr.length) return;
  const faseId = $("fotoFase").value;
  const didascalia = $("fotoCap").value.trim();
  toast(`Caricamento di ${arr.length} file in corso…`);
  let ok = 0;
  for(const file of arr){
    try{ await A.store.caricaFoto(file, {faseId, didascalia}); ok++; }
    catch(e){ toast(errMsg(e)); }
  }
  if(ok){
    toast(`${ok} foto caricate nella fase “${BY_ID[faseId]?.nome || "—"}”.`);
    $("fotoCap").value = "";
    await ricarica();
  }
}

$("fotoBtn").addEventListener("click", () => $("fotoFile").click());
$("fotoFile").addEventListener("change", ev => { caricaFoto(ev.target.files); ev.target.value = ""; });
$("fotoFilter").addEventListener("change", ev => { A.fotoFiltro = ev.target.value; disegnaFoto(A); });

const drop = $("fotoDrop");
["dragenter","dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("hot"); }));
["dragleave","drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("hot"); }));
drop.addEventListener("drop", e => { if(e.dataTransfer?.files) caricaFoto(e.dataTransfer.files); });
drop.addEventListener("click", () => $("fotoFile").click());

/* ------------------------------ DDT ------------------------------ */

let ddtFile = null;
$("ddtPick").addEventListener("click", () => $("ddtFile").click());
$("ddtFile").addEventListener("change", ev => {
  ddtFile = ev.target.files[0] || null;
  $("ddtFileName").textContent = ddtFile ? ddtFile.name : "Nessun file selezionato";
});
$("ddtSave").addEventListener("click", async () => {
  const numero = $("ddtNum").value.trim();
  const data = $("ddtData").value;
  if(!numero || !data){ toast("Indicare almeno numero e data del documento."); return; }
  const btn = $("ddtSave"); btn.disabled = true;
  try{
    await A.store.aggiungiDdt({
      numero, data,
      fornitore: $("ddtForn").value.trim(),
      descrizione: $("ddtDesc").value.trim(),
      faseId: $("ddtFase").value
    }, ddtFile);
    toast("Bolla registrata.");
    ["ddtNum","ddtForn","ddtDesc"].forEach(i => { $(i).value = ""; });
    ddtFile = null;
    $("ddtFile").value = "";
    $("ddtFileName").textContent = "Nessun file selezionato";
    await ricarica();
  }catch(e){ toast(errMsg(e)); }
  finally{ btn.disabled = false; }
});

/* ------------------------------ presenze ------------------------------ */

$("mnSave").addEventListener("click", async () => {
  const data = $("mnData").value;
  if(!data){ toast("Indicare la giornata."); return; }
  const btn = $("mnSave"); btn.disabled = true;
  try{
    await A.store.aggiungiPresenza({
      data,
      impresa: $("mnImpresa").value.trim(),
      nOperai: Math.max(0, Number($("mnNum").value) || 0),
      ore: Math.max(0, Number($("mnOre").value) || 0),
      faseId: $("mnFase").value,
      nominativi: $("mnNomi").value.trim()
    });
    toast("Giornata registrata.");
    $("mnNomi").value = "";
    await ricarica();
  }catch(e){ toast(errMsg(e)); }
  finally{ btn.disabled = false; }
});

/* ------------------------------ richieste ------------------------------ */

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
    await ricarica();
  }catch(e){ toast(errMsg(e)); }
  finally{ btn.disabled = false; }
});
$("rqFilter").addEventListener("change", ev => { A.reqFiltro = ev.target.value; disegnaRichieste(A); });

/* ------------------------------ esportazioni ------------------------------ */

$("expCsv").addEventListener("click", () => {
  const rows = [["N","Attività","Livello","Baseline inizio","Baseline fine","Durata (gg)","Importo",
                 "Inizio reale","Fine reale","Avanzamento %","Δ inizio (gg)","Δ fine (gg)","Giustificazione"]];
  for(const r of BASE){
    const c = (r.foglia && !r.continua) ? calc(r, A.dati.fasi[r.id] || {}, A.oggi) : null;
    rows.push([r.n, r.nome, r.liv, fmtD(r.i), fmtD(r.f), r.durata, nf2(r.costo),
      c?.inizio ? fmtD(c.inizio) : "", c?.fine ? fmtD(c.fine) : "",
      c ? c.av : "", c ? c.dI : "", c ? c.dF : "", c ? c.just : ""]);
  }
  scaricaTesto(csv(rows), "cronoprogramma-3613-asilo-marcaria.csv");
});

$("ddtCsv").addEventListener("click", () => {
  const rows = [["Data","N. documento","Fornitore","Materiale","Fase","Allegato"]];
  for(const r of A.dati.ddt.slice().sort((a,b) => String(a.data||"").localeCompare(String(b.data||"")))){
    rows.push([fmtD(r.data), r.numero||"", r.fornitore||"", r.descrizione||"",
               BY_ID[r.faseId]?.nome || "", r.path ? "sì" : "no"]);
  }
  scaricaTesto(csv(rows), "registro-ddt-3613.csv");
});

$("mnCsv").addEventListener("click", () => {
  const rows = [["Giornata","Impresa/squadra","N. operai","Ore","Lavorazione","Nominativi"]];
  for(const r of A.dati.presenze.slice().sort((a,b) => String(a.data||"").localeCompare(String(b.data||"")))){
    rows.push([fmtD(r.data), r.impresa||"", r.nOperai ?? 0, r.ore ?? 0,
               BY_ID[r.faseId]?.nome || "", r.nominativi||""]);
  }
  scaricaTesto(csv(rows), "presenze-cantiere-3613.csv");
});

/* ------------------------------ navigazione ------------------------------ */

function selezionaTab(t){
  A.tab = t;
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
  for(const k of ["crono","foto","ddt","mano","req"]) $("tp-" + k).hidden = (k !== t);
  try{ localStorage.setItem("kronos.tab", t); }catch(e){}
  if(t === "crono") disegnaGantt($("gbody"), {fasi:A.dati.fasi, oggi:A.oggi, px:A.px});
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => selezionaTab(b.dataset.tab)));

$("zoomIn").addEventListener("click", () => {
  A.px = Math.min(20, A.px + 2);
  disegnaGantt($("gbody"), {fasi:A.dati.fasi, oggi:A.oggi, px:A.px});
});
$("zoomOut").addEventListener("click", () => {
  A.px = Math.max(3, A.px - 2);
  disegnaGantt($("gbody"), {fasi:A.dati.fasi, oggi:A.oggi, px:A.px});
});

let rz = null;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => { if(A.tab === "crono") disegnaGantt($("gbody"), {fasi:A.dati.fasi, oggi:A.oggi, px:A.px}); }, 180);
});

/* ------------------------------ predisposizioni ------------------------------ */

$("mnData").value = A.oggi;
$("ddtData").value = A.oggi;
try{
  const t = localStorage.getItem("kronos.tab");
  selezionaTab(t && ["crono","foto","ddt","mano","req"].includes(t) ? t : "crono");
}catch(e){ selezionaTab("crono"); }

avvia().catch(e => {
  $("boot").hidden = true;
  $("login").hidden = false;
  mostraErroreLogin(errMsg(e));
});
