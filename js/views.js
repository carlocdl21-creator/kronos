/* ==========================================================================
   Disegno delle cinque sezioni dell'applicativo.
   Ogni funzione riceve il contesto A creato da app.js.
   ========================================================================== */

import { BASE, BY_ID, TRACCIATE, COSTO_TRACCIATO, STATI, FINE_CONTRATTO } from "./baseline.js";
import { calc, riepilogo } from "./calcoli.js";
import { el, clear, $, fmtD, fmtTs, nf0, eur, toast, errMsg, slug, estensione, MS } from "./util.js";

/* ============================ STATO COMMESSA ============================ */

export function disegnaKpi(A){
  const k = riepilogo(A.dati.fasi, A.oggi);
  const box = $("kpis"); clear(box);

  const kpi = (label, val, note, mod, barPct, tickPct) => {
    const c = el("div", "kpi" + (mod ? " is-" + mod : ""));
    c.appendChild(el("div","lbl",label));
    c.appendChild(el("div","n",val));
    if(note) c.appendChild(el("div","note",note));
    if(barPct != null){
      const bm = el("div","bar-mini dual");
      const i = el("i"); i.style.width = Math.max(0, Math.min(100, barPct)) + "%";
      bm.appendChild(i);
      if(tickPct != null){
        const tk = el("span","tick");
        tk.style.left = Math.max(0, Math.min(100, tickPct)) + "%";
        tk.title = "Avanzamento atteso da baseline";
        bm.appendChild(tk);
      }
      c.appendChild(bm);
    }
    box.appendChild(c);
  };

  const delta = k.avanz - k.atteso;
  kpi("Avanzamento economico", nf0(k.avanz) + "%",
      `${eur(k.valore)} su ${eur(COSTO_TRACCIATO)}`,
      delta < -10 ? "crit" : (delta < -3 ? "warn" : "ok"), k.avanz, k.atteso);
  kpi("Scostamento su baseline", (delta >= 0 ? "+" : "−") + nf0(Math.abs(delta)) + " pt",
      `Atteso a oggi ${nf0(k.atteso)}%`,
      delta < -10 ? "crit" : (delta < -3 ? "warn" : "ok"));
  kpi("Fine lavori stimata", fmtD(k.fineStimata),
      k.slittamento > 0 ? `+${k.slittamento} gg sul termine contrattuale` : "Entro il termine contrattuale",
      k.slittamento > 0 ? (k.slittamento > 10 ? "crit" : "warn") : "ok");
  kpi("Attività in scostamento", String(k.ritardi.length),
      k.senzaGiust.length ? `${k.senzaGiust.length} senza giustificazione` : "Tutte giustificate",
      k.senzaGiust.length ? "crit" : (k.ritardi.length ? "warn" : "ok"));

  const lu = $("lastUpd");
  if(k.ultimoAgg){
    const gg = Math.floor((Date.now() - new Date(k.ultimoAgg).getTime()) / MS);
    lu.textContent = `Ultimo aggiornamento del cronoprogramma: ${fmtTs(k.ultimoAgg)}` +
                     (gg > 0 ? ` (${gg} giorni fa)` : " (oggi)");
    lu.style.color = gg > 7 ? "var(--crit)" : "var(--muted)";
  } else {
    lu.textContent = "Nessun avanzamento ancora registrato dall'impresa.";
    lu.style.color = "var(--muted)";
  }

  const az = $("alertZone"); clear(az);
  if(k.senzaGiust.length){
    const n = el("div","notice crit");
    n.appendChild(el("b",null,"Giustificazioni mancanti"));
    const q = k.senzaGiust.length;
    n.appendChild(el("span", null,
      `${q} ${q === 1 ? "attività presenta" : "attività presentano"} uno scostamento rispetto al cronoprogramma contrattuale senza giustificazione: ` +
      k.senzaGiust.map(c => c.b.nome).join(", ") + "." +
      (A.isImpresa() ? " L'impresa deve compilare il campo “Giustificazione dello scostamento”." : "")));
    az.appendChild(n);
  }
  if(k.slittamento > 0){
    const n = el("div","notice warn");
    n.appendChild(el("b",null,"Termine contrattuale"));
    n.appendChild(el("span", null,
      `La data di fine stimata sulla base degli avanzamenti dichiarati è il ${fmtD(k.fineStimata)}, ` +
      `con uno slittamento di ${k.slittamento} giorni rispetto al ${fmtD(FINE_CONTRATTO)}. ` +
      `Sono richieste azioni correttive documentate.`));
    az.appendChild(n);
  }
}

/* ======================= REGISTRO AVANZAMENTI ======================= */

export function disegnaTabella(A){
  const tb = $("tbFasi"); clear(tb);
  const edit = A.isImpresa();

  $("tableHint").textContent = edit
    ? "Compilare date reali e percentuale di avanzamento. Ogni scostamento rispetto alla baseline richiede una giustificazione scritta, visibile alla Direzione Lavori."
    : "Dati dichiarati dall'impresa esecutrice. Gli scostamenti rispetto alla baseline contrattuale sono evidenziati con la relativa giustificazione.";

  let gruppo = null;
  for(const r of BASE){
    if(r.liv <= 2 && !r.foglia){
      if(r.liv <= 1){
        const tr0 = el("tr","grp");
        const td0 = el("td", null, `${r.nome}  ·  ${fmtD(r.i)} → ${fmtD(r.f)}  ·  ${eur(r.costo)}`);
        td0.colSpan = 9; tr0.appendChild(td0); tb.appendChild(tr0);
      }
      gruppo = r.nome;
      continue;
    }
    if(!r.foglia || r.continua) continue;

    const c = calc(r, A.dati.fasi[r.id] || {}, A.oggi);
    const tr = el("tr");
    if(c.richiede) tr.className = "flag" + (c.just ? " has-just" : "");

    const tdN = el("td");
    const nm = el("div","rowname", r.nome);
    nm.appendChild(el("small", null, `${gruppo || ""} · ${r.durata} gg · ${eur(r.costo)}`));
    tdN.appendChild(nm); tr.appendChild(tdN);

    tr.appendChild(el("td","num", `${fmtD(r.i)} → ${fmtD(r.f)}`));

    for(const [campo, valore] of [["inizio", c.inizio], ["fine", c.fine]]){
      const td = el("td","num cell-in");
      if(edit){
        const inp = document.createElement("input");
        inp.type = "date"; inp.id = `fase-${r.id}-${campo}`;
        inp.value = valore || ""; inp.min = "2026-01-01"; inp.max = "2028-12-31";
        inp.addEventListener("change", () => A.salvaFase(r.id, campo, inp.value || null));
        td.appendChild(inp);
      } else td.textContent = fmtD(valore);
      tr.appendChild(td);
    }

    const tdA = el("td","num cell-in");
    if(edit){
      const ai = document.createElement("input");
      ai.type = "number"; ai.min = "0"; ai.max = "100"; ai.step = "5";
      ai.id = `fase-${r.id}-avanz`; ai.value = c.av;
      ai.addEventListener("change", () => {
        const v = Math.max(0, Math.min(100, Math.round(Number(ai.value) || 0)));
        ai.value = v; A.salvaFase(r.id, "avanz", v);
      });
      tdA.appendChild(ai);
    } else tdA.textContent = c.av + "%";
    tr.appendChild(tdA);

    const deltaTd = v => {
      const td = el("td","num");
      td.appendChild(el("span", "delta " + (v > 0 ? "pos" : v < 0 ? "neg" : "zero"),
        v === 0 ? "—" : `${v > 0 ? "+" : ""}${v} gg`));
      return td;
    };
    tr.appendChild(deltaTd(c.dI));
    tr.appendChild(deltaTd(c.dF));

    const tdS = el("td");
    let p;
    if(c.av >= 100) p = el("span","pill ok","Completata");
    else if(c.ritAvvio > 0) p = el("span","pill crit",`Non avviata (+${c.ritAvvio} gg)`);
    else if(c.av > 0) p = el("span", "pill " + (c.sev === "ok" ? "info" : c.sev), `In corso ${c.av}%`);
    else p = el("span","pill neutral", c.stato === "futura" ? "Da avviare" : "In attesa");
    tdS.appendChild(p);
    if(c.av > 0 && c.av < 100) tdS.appendChild(el("div","subnote", `atteso ${c.atteso}%`));
    tr.appendChild(tdS);

    const tdG = el("td");
    if(edit && c.richiede){
      const ta = document.createElement("textarea");
      ta.id = `fase-${r.id}-giust`; ta.value = c.just; ta.rows = 2;
      ta.placeholder = "Motivo dello scostamento e azione correttiva…";
      ta.style.minHeight = "52px"; ta.style.fontSize = "13px";
      ta.addEventListener("change", () => A.salvaFase(r.id, "giust", ta.value.trim()));
      tdG.appendChild(ta);
      if(!c.just){
        tdG.appendChild(el("div","justif missing",
          "Giustificazione obbligatoria: lo scostamento è visibile alla Stazione Appaltante."));
      } else if(c.f.giustData){
        const w = el("div","who", "aggiornata il " + fmtTs(c.f.giustData));
        w.style.marginTop = "4px"; tdG.appendChild(w);
      }
    } else if(c.richiede){
      if(c.just){
        const j = el("div","justif", c.just);
        j.appendChild(el("div","who",
          (c.f.autore || "Impresa esecutrice") + (c.f.giustData ? " · " + fmtTs(c.f.giustData) : "")));
        tdG.appendChild(j);
      } else {
        tdG.appendChild(el("div","justif missing","Scostamento non ancora giustificato dall'impresa."));
      }
    } else {
      const okd = el("div","subnote", c.av > 0 ? "In linea con la baseline." : "—");
      okd.style.color = "var(--muted)";
      tdG.appendChild(okd);
    }
    tr.appendChild(tdG);
    tb.appendChild(tr);
  }
}

/* ============================== FOTO ============================== */

export function disegnaFoto(A){
  const grid = $("fotoGrid"); clear(grid);
  $("cnt-foto").textContent = A.dati.foto.length;

  const list = A.dati.foto
    .filter(f => !A.fotoFiltro || f.faseId === A.fotoFiltro)
    .sort((a, b) => String(b.creatoIl || "").localeCompare(String(a.creatoIl || "")));

  if(!list.length){
    const e = el("div","empty");
    e.appendChild(el("b", null, A.fotoFiltro ? "Nessuna foto per questa fase" : "Nessuna foto caricata"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Selezionare la fase di riferimento e caricare le immagini delle lavorazioni eseguite."
      : "L'impresa non ha ancora caricato documentazione fotografica per questa selezione."));
    grid.appendChild(e);
    return;
  }

  for(const f of list){
    const card = el("div","foto");
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
    meta.appendChild(el("div","fase-tag", BY_ID[f.faseId]?.nome || "Fase non indicata"));
    if(f.didascalia) meta.appendChild(el("div","cap", f.didascalia));
    meta.appendChild(el("div","sub", `${fmtTs(f.creatoIl)}${f.autore ? " · " + f.autore : ""}`));

    const acts = el("div","acts");
    const bd = el("button","btn sm ghost","Scarica");
    bd.addEventListener("click", () => A.scaricaFile(f.path, nomeFoto(f)));
    acts.appendChild(bd);
    if(A.isImpresa()){
      const bx = el("button","btn sm danger","Elimina");
      bx.addEventListener("click", async () => {
        if(!confirm("Eliminare definitivamente questa foto dalla documentazione di cantiere?")) return;
        try{ await A.store.eliminaFoto(f); toast("Foto eliminata."); await A.ricarica(); }
        catch(e){ toast(errMsg(e)); }
      });
      acts.appendChild(bx);
    }
    meta.appendChild(acts);
    card.appendChild(meta);
    grid.appendChild(card);
  }
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

/* ============================== DDT ============================== */

export function disegnaDdt(A){
  const tb = $("tbDdt"); clear(tb);
  $("cnt-ddt").textContent = A.dati.ddt.length;

  const list = A.dati.ddt.slice().sort((a,b) => String(b.data||"").localeCompare(String(a.data||"")));
  $("ddtSub").textContent = list.length
    ? `${list.length} documenti di trasporto registrati`
    : "Nessun documento registrato";

  if(!list.length){
    const tr = el("tr"), td = el("td");
    td.colSpan = 7;
    const e = el("div","empty");
    e.appendChild(el("b",null,"Registro vuoto"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Registrare le bolle di consegna dei materiali approvvigionati."
      : "L'impresa non ha ancora registrato bolle di consegna."));
    td.appendChild(e); tr.appendChild(td); tb.appendChild(tr);
    return;
  }

  for(const r of list){
    const tr = el("tr");
    tr.appendChild(el("td","num", fmtD(r.data)));
    tr.appendChild(el("td","num", r.numero || "—"));
    tr.appendChild(el("td", null, r.fornitore || "—"));
    tr.appendChild(el("td", null, r.descrizione || "—"));
    tr.appendChild(el("td", null, BY_ID[r.faseId]?.nome || "—"));

    const tdF = el("td");
    if(r.path){
      const b = el("button","btn sm ghost", r.tipo === "application/pdf" ? "PDF" : "Immagine");
      b.addEventListener("click", () => A.scaricaFile(r.path, nomeDdt(r)));
      tdF.appendChild(b);
    } else tdF.textContent = "—";
    tr.appendChild(tdF);

    const tdX = el("td");
    if(A.isImpresa()){
      const x = el("button","btn sm danger","Elimina");
      x.addEventListener("click", async () => {
        if(!confirm(`Eliminare la bolla n. ${r.numero || "—"}?`)) return;
        try{ await A.store.eliminaDdt(r); toast("Bolla eliminata."); await A.ricarica(); }
        catch(e){ toast(errMsg(e)); }
      });
      tdX.appendChild(x);
    }
    tr.appendChild(tdX);
    tb.appendChild(tr);
  }
}

function nomeDdt(r){
  const ext = estensione(r.nomeFile, r.tipo === "application/pdf" ? "pdf" : "jpg");
  return `ddt-${String(r.numero || r.id).replace(/[^\w.-]+/g,"-")}.${ext}`;
}

/* ============================ PRESENZE ============================ */

export function disegnaPresenze(A){
  const tb = $("tbMano"); clear(tb);
  $("cnt-mano").textContent = A.dati.presenze.length;

  const list = A.dati.presenze.slice().sort((a,b) => String(b.data||"").localeCompare(String(a.data||"")));
  const ore = list.reduce((a,r) => a + (Number(r.ore) || 0), 0);
  $("mnSub").textContent = list.length
    ? `${list.length} giornate registrate · ${nf0(ore)} ore complessive`
    : "Nessuna giornata registrata";

  if(!list.length){
    const tr = el("tr"), td = el("td");
    td.colSpan = 7;
    const e = el("div","empty");
    e.appendChild(el("b",null,"Giornale vuoto"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Registrare gli operai presenti in cantiere giorno per giorno."
      : "L'impresa non ha ancora registrato le presenze giornaliere."));
    td.appendChild(e); tr.appendChild(td); tb.appendChild(tr);
    return;
  }

  for(const r of list){
    const tr = el("tr");
    tr.appendChild(el("td","num", fmtD(r.data)));
    tr.appendChild(el("td", null, r.impresa || "—"));
    tr.appendChild(el("td","num", String(r.nOperai ?? 0)));
    tr.appendChild(el("td","num", nf0(Number(r.ore) || 0)));
    tr.appendChild(el("td", null, BY_ID[r.faseId]?.nome || "—"));
    tr.appendChild(el("td", null, r.nominativi || "—"));
    const tdX = el("td");
    if(A.isImpresa()){
      const x = el("button","btn sm danger","Elimina");
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

/* ============================ RICHIESTE ============================ */

export function disegnaRichieste(A){
  const box = $("rqList"); clear(box);
  const aperte = A.dati.richieste.filter(r => r.stato !== "terminata").length;
  $("cnt-req").textContent = aperte;
  $("rqSub").textContent = A.dati.richieste.length
    ? `${A.dati.richieste.length} richieste · ${aperte} ancora aperte`
    : "Nessuna richiesta inoltrata";

  const list = A.dati.richieste
    .filter(r => !A.reqFiltro || r.stato === A.reqFiltro)
    .sort((a,b) => String(b.creatoIl||"").localeCompare(String(a.creatoIl||"")));

  if(!list.length){
    const e = el("div","empty");
    e.appendChild(el("b",null,"Nessuna richiesta"));
    e.appendChild(el("span", null, A.isImpresa()
      ? "Le richieste inoltrate dalla Stazione Appaltante e dalla Direzione Lavori compaiono qui."
      : "Utilizzare il riquadro sopra per inoltrare una richiesta formale all'impresa esecutrice."));
    box.appendChild(e);
    return;
  }

  for(const r of list){
    const st = STATI[r.stato] || STATI.nuova;
    const card = el("div","req st-" + r.stato);

    const hd = el("div","req-hd");
    hd.appendChild(el("h3", null, r.titolo || "Richiesta"));
    if(r.priorita && r.priorita !== "normale"){
      hd.appendChild(el("span", "pill " + (r.priorita === "urgente" ? "crit" : "warn"),
        r.priorita === "urgente" ? "Urgente" : "Priorità alta"));
    }
    hd.appendChild(el("span","pill " + st.pill, st.lab));
    card.appendChild(hd);

    card.appendChild(el("div","req-bd", r.testo || ""));

    const meta = [`Inoltrata il ${fmtTs(r.creatoIl)}`];
    if(r.autore && r.autore !== "—") meta.push(`da ${r.autore}`);
    if(r.faseId && BY_ID[r.faseId]) meta.push(`fase: ${BY_ID[r.faseId].nome}`);
    if(r.scadenza) meta.push(`riscontro entro il ${fmtD(r.scadenza)}`);
    card.appendChild(el("div","req-meta", meta.join("  ·  ")));

    if(r.eventi?.length){
      const tl = el("div","timeline");
      tl.appendChild(el("div","lbl","Lavorazione della richiesta"));
      for(const ev of r.eventi){
        const it = el("div","tl-item");
        it.appendChild(el("span","when", fmtTs(ev.at)));
        const who = ev.autore && ev.autore !== "—"
          ? ev.autore
          : (ev.ruolo === "impresa" ? "Impresa esecutrice" : "Stazione Appaltante / DL");
        it.appendChild(el("span", null, `${who} — ${ev.testo}`));
        tl.appendChild(it);
      }
      card.appendChild(tl);
    }

    const acts = el("div","req-acts");
    if(A.isImpresa()){
      acts.appendChild(el("span","lbl","Stato"));
      for(const [k, lab] of [["presa","Presa in carico"],["lavorazione","In lavorazione"],["terminata","Terminata"]]){
        const b = el("button", "btn sm" + (r.stato === k ? " primary" : ""), lab);
        b.disabled = r.stato === k;
        b.addEventListener("click", async () => {
          try{
            await A.store.aggiungiEvento(r, "stato aggiornato: " + lab, k);
            toast(`Richiesta aggiornata: ${lab}.`);
            await A.ricarica();
          }catch(e){ toast(errMsg(e)); }
        });
        acts.appendChild(b);
      }
    }
    const bn = el("button","btn sm ghost","Aggiungi nota");
    bn.style.marginLeft = "auto";
    bn.addEventListener("click", async () => {
      const t = prompt("Nota da allegare alla richiesta:");
      if(!t || !t.trim()) return;
      try{ await A.store.aggiungiEvento(r, t.trim(), null); toast("Nota registrata."); await A.ricarica(); }
      catch(e){ toast(errMsg(e)); }
    });
    acts.appendChild(bn);
    card.appendChild(acts);

    box.appendChild(card);
  }
}

/* ===================== SELETTORI DELLE FASI ===================== */

export function riempiSelettoriFase(A){
  for(const [id, conVuoto] of [["fotoFase",false],["ddtFase",true],["mnFase",true],["rqFase",true]]){
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

  const ff = $("fotoFilter"); clear(ff);
  const all = document.createElement("option");
  all.value = ""; all.textContent = "Tutte le fasi";
  ff.appendChild(all);
  for(const r of TRACCIATE){
    const n = A.dati.foto.filter(f => f.faseId === r.id).length;
    const o = document.createElement("option");
    o.value = r.id; o.textContent = `${r.n}. ${r.nome}${n ? `  (${n})` : ""}`;
    ff.appendChild(o);
  }
  ff.value = A.fotoFiltro;
}
