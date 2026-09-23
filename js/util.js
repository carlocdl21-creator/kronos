/* ==========================================================================
   Funzioni di servizio: date, numeri, DOM, messaggi.
   ========================================================================== */

export const MS = 86400000;

export function d(s){ const p = String(s).split("-"); return new Date(Date.UTC(+p[0], +p[1]-1, +p[2])); }
export function iso(dt){ return dt.toISOString().slice(0,10); }
export function addDays(s, n){ return iso(new Date(d(s).getTime() + n*MS)); }
export function diffDays(a, b){ return Math.round((d(a) - d(b)) / MS); }
export function todayISO(){ const n = new Date(); return iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))); }

export function fmtD(s){ if(!s) return "—"; const p = String(s).split("-"); return `${p[2]}/${p[1]}/${p[0]}`; }
export function fmtTs(t){
  if(!t) return "—";
  const dt = new Date(t); if(isNaN(dt)) return "—";
  const z = n => String(n).padStart(2,"0");
  return `${z(dt.getDate())}/${z(dt.getMonth()+1)}/${dt.getFullYear()} ${z(dt.getHours())}:${z(dt.getMinutes())}`;
}

const NF2 = new Intl.NumberFormat("it-IT", {minimumFractionDigits:2, maximumFractionDigits:2});
const NF0 = new Intl.NumberFormat("it-IT", {maximumFractionDigits:0});
export const nf2 = v => NF2.format(v);
export const nf0 = v => NF0.format(v);
/** Ore: mezz'ore comprese, senza decimali inutili (8, 6,5). */
const NFORE = new Intl.NumberFormat("it-IT", {maximumFractionDigits:1});
export const nfOre = v => NFORE.format(v);
export const eur = v => "€ " + NF2.format(v);

export function el(tag, cls, txt){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(txt != null) e.textContent = txt;   // sempre textContent: i testi sono input altrui
  return e;
}
export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
export const $ = id => document.getElementById(id);

let toastTimer = null;
export function toast(msg){
  document.querySelector(".toast")?.remove();
  const t = el("div","toast", msg);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3800);
}

/** Messaggi d'errore in italiano, comprensibili a chi sta in cantiere. */
export function errMsg(e){
  const m = String(e?.message || e || "");
  if(/Invalid login credentials/i.test(m)) return "Email o password non corretti.";
  if(/Email not confirmed/i.test(m)) return "Indirizzo email non ancora confermato.";
  if(/row-level security|violates row-level|not authorized|permission denied/i.test(m))
    return "Operazione non consentita con il profilo in uso.";
  if(/Payload too large|exceeded the maximum allowed size/i.test(m)) return "File troppo grande.";
  if(/mime type|not supported/i.test(m)) return "Formato del file non ammesso.";
  if(/Failed to fetch|NetworkError|network/i.test(m)) return "Connessione non disponibile: riprovare.";
  if(/JWT|session|expired/i.test(m)) return "Sessione scaduta: effettuare di nuovo l'accesso.";
  return m || "Operazione non riuscita.";
}

/** CSV con separatore ";" e BOM, per aprirlo direttamente in Excel italiano. */
export function csv(rows){
  return "﻿" + rows.map(r =>
    r.map(c => {
      const s = String(c ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(";")
  ).join("\r\n");
}

export function scaricaBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function scaricaTesto(text, filename, type = "text/csv;charset=utf-8"){
  scaricaBlob(new Blob([text], {type}), filename);
}

export function slug(s){
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
export function estensione(nome, fallback = "bin"){
  const m = String(nome||"").match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : fallback;
}
