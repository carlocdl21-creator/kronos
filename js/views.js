/* ══════════════════════════════════════════════════════════════════
   Disegno delle sezioni. Ogni funzione riceve il contesto A di app.js.
   ══════════════════════════════════════════════════════════════════ */

import { BY_ID, TRACCIATE, COSTO_TRACCIATO, STATI, FINE_CONTRATTO } from "./baseline.js";
import { riepilogo } from "./calcoli.js";
import { el, clear, $, fmtD, fmtTs, nf0, eur, toast, errMsg, slug, estensione, MS, todayISO } from "./util.js";

const ORDINE_STATI = ["nuova","presa","lavorazione","terminata"];

/* ══════════════════════════ STATO COMMESSA ══════════════════════════ */

export function disegnaKpi(A){
  const k = riepilogo(A.dati.fasi, A.oggi);
  const box = $("kpis"); clear(box);

  const kpi = (label, val, note, mod, barra, tacca) => {
    const c = el("div", "kpi" + (mod ? " is-" + mod : ""));
    c.appendChild(el("div","k",label));
    c.appendChild(el("div","n",val));
    if(note) c.appendChild(el("div","note",note));
    if(barra != null){
      const m = el("div","meter");
      const i = el("i");
      i.style.width = Math.max(0, Math.min(100, barra)) + "%";
      m.appendChild(i);
      if(tacca != null){
        const t = el("span","tick");
        t.style.left = Math.max(0, Math.min(100, tacca)) + "%";
        t.title = "Avanzamento previsto dal contratto alla data odierna";
        m.appendChild(t);
      }
      c.appendChild(m);
    }
    box.appendChild(c);
  };

  const delta = k.avanz - k.atteso;
  kpi("Avanzamento economico", nf0(k.avanz) + "%",
      `${eur(k.valore)} su ${eur(COSTO_TRACCIATO)}`,
      delta < -10 ? "no" : (delta < -3 ? "warn" : "ok"), k.avanz, k.atteso);
  kpi("Scostamento sul previsto", (delta >= 0 ? "+" : "−") + nf0(Math.abs(delta)) + " pt",
      `Previsto a oggi ${nf0(k.atteso)}%`,
      delta < -10 ? "no" : (delta < -3 ? "warn" : "ok"));
  kpi("Fine lavori stimata", fmtD(k.fineStimata),
      k.slittamento > 0 ? `+${k.slittamento} gg sul termine contrattuale` : "Entro il termine contrattuale",
      k.slittamento > 0 ? (k.slittamento > 10 ? "no" : "warn") : "ok");
  kpi("Lavorazioni scostate", String(k.ritardi.length),
      k.senzaGiust.length ? `${k.senzaGiust.length} senza motivo scritto` : "Tutte giustificate",
      k.senzaGiust.length ? "no" : (k.ritardi.length ? "warn" : "ok"));

  const lu = $("lastUpd");
  if(k.ultimoAgg){
    const gg = Math.floor((Date.now() - new Date(k.ultimoAgg).getTime()) / MS);
    lu.textContent = `Ultimo aggiornamento: ${fmtTs(k.ultimoAgg)}${gg > 0 ? ` — ${gg} giorni fa` : " — oggi"}.` +
      (gg > 7 ? " Il cronoprogramma va aggiornato con cadenza settimanale." : "");
    lu.style.color = gg > 7 ? "var(--no)" : "var(--mute)";
  } else {
    lu.textContent = "Nessun avanzamento ancora dichiarato dall'impresa.";
    lu.style.color = "var(--mute)";
  }

  $("realeHint").textContent = A.isImpresa()
    ? "Trascina le barre per spostarle, tira i bordi per allungarle. Ogni barra che non coincide con il contratto resta rossa finché non scrivi il motivo."
    : "Barre dichiarate dall'impresa. In rosso gli scostamenti dal contratto ancora privi di motivazione.";

  const az = $("alertZone"); clear(az);
  if(k.senzaGiust.length){
    const q = k.senzaGiust.length;
    const n = el("div","notice no");
    n.appendChild(el("i","bi bi-exclamation-octagon-fill"));
    n.appendChild(el("span", null,
      `${q} ${q === 1 ? "lavorazione si scosta" : "lavorazioni si scostano"} dal cronoprogramma contrattuale senza motivo scritto: ` +
      k.senzaGiust.map(c => c.b.nome).join(", ") + "." +
      (A.isImpresa() ? " Fai clic sull'etichetta rossa a fianco della barra per giustificare." : "")));
    az.appendChild(n);
  }
  if(k.slittamento > 0){
    const n = el("div","notice warn");
    n.appendChild(el("i","bi bi-calendar-x"));
    n.appendChild(el("span", null,
      `Fine lavori stimata al ${fmtD(k.fineStimata)}: ${k.slittamento} giorni oltre il termine contrattuale del ${fmtD(FINE_CONTRATTO)}. Sono richieste azioni correttive documentate.`));
    az.appendChild(n);
  }
}

/* ══════════════════════════ FOTO (cartelle) ══════════════════════════ */

export function disegnaFoto(A){
  $("cnt-foto").textContent = A.dati.foto.length;
  const cartelle = $("fotoCartelle");
  const bread = $("fotoBread");
  const grid = $("fotoGrid");
  const drop = $("fotoDrop");

  if(!A.faseAperta){
    /* ---- elenco cartelle ---- */
    bread.hidden = true; grid.hidden = true; drop.hidden = true;
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
      ? "Trascina qui sopra le foto della lavorazione."
      : "L'impresa non ha ancora caricato foto per questa fase."));
    grid.appendChild(e);
    return;
  }
  for(const f of lista) grid.appendChild(schedaFoto(A, f));
}

function schedaFoto(A, f){
  const card = el("div","filecard");
  const ph = el("div","ph","Caricamento…");
  const img = document.createElement("img");
  img.alt = f.didascalia || "Foto della lavorazione";
  img.loading = "lazy";
  img.addEventListener("error", () => { clear(ph); ph.textContent = "Immagine non disponibile"; });
  A.store.urlFile(f.path).then(u => {
    if(!u){ clear(ph); ph.textContent = "Immagine non disponibile"; return; }
    img.src = u; clear(ph); ph.appendChild(img);
  }).catch(() => { clear(ph); ph.textContent = "Immagine non disponibile"; });
  ph.addEventListener("click", () => lightbox(A, f));
  card.appendChild(ph);

  const meta = el("div","meta");
  if(f.didascalia) meta.appendChild(el("div","nome", f.didascalia));
  meta.appendChild(el("div","sub", `${fmtTs(f.creatoIl)}${f.autore ? " · " + f.autore : ""}`));

  const acts = el("div","acts");
  const bd = el("button","btn sm ghost");
  bd.appendChild(el("i","bi bi-download"));
  bd.appendChild(el("span", null, "Scarica"));
  bd.addEventListener("click", () => A.scaricaFile(f.path, nomeFoto(f)));
  acts.appendChild(bd);
  if(A.isImpresa()){
    const bx = el("button","btn sm danger");
    bx.appendChild(el("i","bi bi-trash"));
    bx.addEventListener("click", async () => {
      if(!confirm("Eliminare definitivamente questa foto?")) return;
      try{ await A.store.eliminaFoto(f); toast("Foto eliminata."); await A.ricarica(); }
      catch(e){ toast(errMsg(e)); }
    });
    acts.appendChild(bx);
  }
  meta.appendChild(acts);
  card.appendChild(meta);
  return card;
}

function nomeFoto(f){
  const base = slug(BY_ID[f.faseId]?.nome || "foto");
  const ext = estensione(f.nomeFile, (f.tipo || "image/jpeg").split("/")[1] || "jpg");
  return `${base}-${String(f.creatoIl || "").slice(0,10)}-${String(f.id).slice(0,4)}.${ext}`;
}

async function lightbox(A, f){
  const url = await A.store.urlFile(f.path);
  if(!url){ toast("Immagine non disponibile."); return; }
  const lb = el("div","lightbox");
  const img = document.createElement("img");
  img.src = url; img.alt = f.didascalia || "Foto della lavorazione";
  lb.appendChild(img);
  lb.appendChild(el("div","cap",
    `${BY_ID[f.faseId]?.nome || ""}${f.didascalia ? " — " + f.didascalia : ""} · ${fmtTs(f.creatoIl)}`));
  const x = el("button","btn sm x","Chiudi");
  lb.appendChild(x);
  const close = () => { lb.remove(); document.removeEventListener("keydown", onk); };
  const onk = ev => { if(ev.key === "Escape") close(); };
  x.addEventListener("click", close);
  lb.addEventListener("click", ev => { if(ev.target === lb) close(); });
  document.addEventListener("keydown", onk);
  document.body.appendChild(lb);
  x.focus();
}

/* ══════════════════════════ BOLLE E DDT ══════════════════════════ */

export function disegnaDdt(A){
  $("cnt-ddt").textContent = A.dati.ddt.length;
  $("ddtDrop").hidden = !A.isImpresa();
  $("ddtPick").hidden = !A.isImpresa();

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
      ? "Trascina qui sopra le bolle di consegna: PDF o foto del documento."
      : "L'impresa non ha ancora caricato bolle di consegna."));
    grid.appendChild(e);
    return;
  }

  for(const r of lista){
    const card = el("div","filecard");
    const ph = el("div","ph");
    const immagine = String(r.tipo || "").startsWith("image/");
    if(immagine){
      ph.textContent = "Caricamento…";
      const img = document.createElement("img");
      img.alt = r.nomeFile || "Bolla di consegna";
      img.loading = "lazy";
      img.addEventListener("error", () => { clear(ph); ph.textContent = "Anteprima non disponibile"; });
      A.store.urlFile(r.path).then(u => {
        if(!u){ clear(ph); ph.textContent = "Anteprima non disponibile"; return; }
        img.src = u; clear(ph); ph.appendChild(img);
      }).catch(() => { clear(ph); ph.textContent = "Anteprima non disponibile"; });
      ph.addEventListener("click", () => lightbox(A, {path:r.path, didascalia:r.nomeFile, creatoIl:r.creatoIl, faseId:null}));
    } else {
      ph.style.cursor = "default";
      ph.appendChild(el("i","doc bi bi-filetype-pdf"));
    }
    card.appendChild(ph);

    const meta = el("div","meta");
    meta.appendChild(el("div","nome", r.nomeFile || "Documento"));
    meta.appendChild(el("div","sub", `${fmtTs(r.creatoIl)}${r.autore ? " · " + r.autore : ""}`));

    const acts = el("div","acts");
    const bd = el("button","btn sm ghost");
    bd.appendChild(el("i","bi bi-download"));
    bd.appendChild(el("span", null, "Scarica"));
    bd.addEventListener("click", () => A.scaricaFile(r.path, r.nomeFile || `bolla-${String(r.id).slice(0,6)}.pdf`));
    acts.appendChild(bd);
    if(A.isImpresa()){
      const bx = el("button","btn sm danger");
      bx.appendChild(el("i","bi bi-trash"));
      bx.addEventListener("click", async () => {
        if(!confirm(`Eliminare “${r.nomeFile || "il documento"}”?`)) return;
        try{ await A.store.eliminaDdt(r); toast("Documento eliminato."); await A.ricarica(); }
        catch(e){ toast(errMsg(e)); }
      });
      acts.appendChild(bx);
    }
    meta.appendChild(acts);
    card.appendChild(meta);
    grid.appendChild(card);
  }
}

/* ══════════════════════════ PRESENZE ══════════════════════════ */

export function disegnaPresenze(A){
  const tb = $("tbMano"); clear(tb);
  $("cnt-mano").textContent = A.dati.presenze.length;

  const lista = A.dati.presenze.slice().sort((a,b) => String(b.data||"").localeCompare(String(a.data||"")));
  const ore = lista.reduce((a,r) => a + (Number(r.ore) || 0), 0);
  $("mnSub").textContent = lista.length
    ? `${lista.length} giornate registrate · ${nf0(ore)} ore complessive`
    : "Nessuna giornata registrata";

  if(!lista.length){
    const tr = el("tr"), td = el("td");
    td.colSpan = 7;
    const e = el("div","empty");
    e.appendChild(el("i","bi bi-people"));
    e.appendChild(el("b", null, "Giornale vuoto"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Registra gli operai presenti in cantiere giorno per giorno."
      : "L'impresa non ha ancora registrato le presenze giornaliere."));
    td.appendChild(e); tr.appendChild(td); tb.appendChild(tr);
    return;
  }

  for(const r of lista){
    const tr = el("tr");
    tr.appendChild(el("td",null, fmtD(r.data)));
    tr.appendChild(el("td",null, r.impresa || "—"));
    tr.appendChild(el("td",null, String(r.nOperai ?? 0)));
    tr.appendChild(el("td",null, nf0(Number(r.ore) || 0)));
    tr.appendChild(el("td",null, BY_ID[r.faseId]?.nome || "—"));
    tr.appendChild(el("td",null, r.nominativi || "—"));
    const tdX = el("td");
    if(A.isImpresa()){
      const x = el("button","btn sm danger");
      x.appendChild(el("i","bi bi-trash"));
      x.addEventListener("click", async () => {
        if(!confirm(`Eliminare la registrazione del ${fmtD(r.data)}?`)) return;
        try{ await A.store.eliminaPresenza(r); toast("Registrazione eliminata."); await A.ricarica(); }
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
  for(const [id, conVuoto] of [["mnFase",true],["rqFase",true]]){
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
