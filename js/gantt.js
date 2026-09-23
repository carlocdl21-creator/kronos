/* ══════════════════════════════════════════════════════════════════
   Due diagrammi con la STESSA struttura e la STESSA scala:
   sopra il cronoprogramma contrattuale, sotto quello reale.
   Nel reale le barre si trascinano e si allungano; se la barra non
   coincide con quella di contratto diventa rossa, e resta rossa
   finché non viene scritto il motivo dello scostamento.
   ══════════════════════════════════════════════════════════════════ */

import { BASE } from "./baseline.js";
import { calc, intervallo, foglieDi } from "./calcoli.js";
import { d, iso, addDays, diffDays, fmtD, eur, el, clear } from "./util.js";

const MESI = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];
const DUR_MIN = 1;   // giorni

/** Scala temporale condivisa dalle due tavole. */
export function scala(fasi, oggi){
  const {min:m0, max:m1} = intervallo(fasi, oggi);
  const dow = (d(m0).getUTCDay() + 6) % 7;          // parte dal lunedì
  const min = addDays(m0, -dow);
  const max = addDays(m1, 7);
  return {min, max, giorni: diffDays(max, min) + 1};
}

/** Estremi della barra reale di una riga (anche di gruppo, per somma dei figli). */
export function barraReale(r, fasi, oggi){
  if(r.foglia){
    const c = calc(r, fasi[r.id] || {}, oggi);
    const dichiarata = Boolean(fasi[r.id] && (fasi[r.id].inizio || fasi[r.id].fine || fasi[r.id].avanz));
    return {i:c.effI, f:c.effF, av:c.av, dichiarata, c};
  }
  const figlie = foglieDi(r);
  if(!figlie.length) return {i:r.i, f:r.f, av:0, dichiarata:false, c:null};
  let i = null, f = null, peso = 0, fatto = 0, dichiarata = false;
  for(const g of figlie){
    const b = barraReale(g, fasi, oggi);
    if(!i || b.i < i) i = b.i;
    if(!f || b.f > f) f = b.f;
    peso += g.costo; fatto += g.costo * b.av / 100;
    if(b.dichiarata) dichiarata = true;
  }
  return {i, f, av: peso ? Math.round(fatto / peso * 100) : 0, dichiarata, c:null};
}

/**
 * @param {HTMLElement} gbody contenitore
 * @param {object} o {modo:"base"|"reale", fasi, oggi, px, sc, editabile, onDate, onAvanz, onNota}
 */
export function disegnaGantt(gbody, o){
  const {modo, fasi, oggi, px, sc} = o;
  const reale = modo === "reale";
  const LW = window.innerWidth < 760 ? 192 : 306;
  const TW = sc.giorni * px;
  gbody.style.setProperty("--lw", LW + "px");
  gbody.style.setProperty("--tw", TW + "px");
  clear(gbody);

  /* ── testata: mesi e settimane ── */
  const head = el("div","ghead");
  const hl = el("div","glabel");
  hl.appendChild(el("span","eyebrow", reale ? "Avanzamento reale" : "Baseline di contratto"));
  head.appendChild(hl);

  const s = el("div","gscale");
  let cur = sc.min;
  while(cur <= sc.max){
    const dt = d(cur);
    if(dt.getUTCDate() <= 7 || cur === sc.min){
      const primo = iso(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth()+1, 1)));
      const fineMese = primo > sc.max ? sc.max : addDays(primo, -1);
      const w = (diffDays(fineMese, cur) + 1) * px;
      const m = el("div","gmonth", w < 70 ? MESI[dt.getUTCMonth()] : `${MESI[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`);
      m.style.left = diffDays(cur, sc.min) * px + "px";
      m.style.width = w + "px";
      s.appendChild(m);
      cur = primo > sc.max ? addDays(sc.max, 1) : primo;
    } else cur = addDays(cur, 1);
  }
  for(let w = 0; w * 7 < sc.giorni; w++){
    const wd = el("div","gweek", "S" + (w + 1));
    wd.style.left = w * 7 * px + "px";
    wd.style.width = 7 * px + "px";
    s.appendChild(wd);
  }
  head.appendChild(s);
  gbody.appendChild(head);

  const griglia = `repeating-linear-gradient(to right,var(--line) 0 1px,transparent 1px ${7*px}px)`;
  const x = giorno => diffDays(giorno, sc.min) * px;

  /* ── righe ── */
  for(const r of BASE){
    const row = el("div","grow");
    row.dataset.liv = r.liv;
    row.dataset.id = r.id;

    const lab = el("div","glabel");
    lab.style.setProperty("--ind", (r.liv * 13) + "px");
    lab.appendChild(el("span","num", String(r.n)));
    const nm = el("span","nm", r.nome);
    nm.title = `${r.nome} · ${fmtD(r.i)} → ${fmtD(r.f)} · ${r.durata} gg · ${eur(r.costo)}`;
    lab.appendChild(nm);
    row.appendChild(lab);

    const tr = el("div","gtrack");
    tr.style.backgroundImage = griglia;

    if(!reale){
      /* ---------- tavola contrattuale ---------- */
      const b = el("div","gbar");
      b.style.left = x(r.i) + "px";
      b.style.width = Math.max(4, (diffDays(r.f, r.i) + 1) * px) + "px";
      b.title = `${r.nome}\nContratto: ${fmtD(r.i)} → ${fmtD(r.f)} (${r.durata} gg)`;
      tr.appendChild(b);
    } else {
      /* ---------- tavola reale ---------- */
      const b = barraReale(r, fasi, oggi);
      const tracciabile = r.foglia && !r.continua;
      const scostata = tracciabile && (b.i !== r.i || b.f !== r.f);
      const nota = tracciabile ? ((fasi[r.id]?.giust || "").trim()) : "";

      const bar = el("div","gbar real");
      if(!b.dichiarata && tracciabile) bar.classList.add("vuota");
      if(scostata) bar.classList.add(nota ? "giustificata" : "scostata");
      if(tracciabile && o.editabile) bar.classList.add("editabile");
      bar.style.left = x(b.i) + "px";
      bar.style.width = Math.max(6, (diffDays(b.f, b.i) + 1) * px) + "px";

      const fill = el("i","fill");
      fill.style.width = b.av + "%";
      bar.appendChild(fill);
      if(px >= 6 && (diffDays(b.f, b.i) + 1) * px > 46) bar.appendChild(el("span","pct", b.av + "%"));

      const gg = diffDays(b.f, b.i) + 1;
      bar.title = `${r.nome}\nReale: ${fmtD(b.i)} → ${fmtD(b.f)} (${gg} gg) · avanzamento ${b.av}%` +
        (scostata ? `\nContratto: ${fmtD(r.i)} → ${fmtD(r.f)} (${r.durata} gg)` : "\nIn linea con il contratto");

      if(tracciabile && o.editabile){
        bar.appendChild(el("span","gmaniglia sx"));
        bar.appendChild(el("span","gmaniglia dx"));
        abilitaTrascinamento(bar, {r, b, px, sc, x, onDate:o.onDate});
      }
      tr.appendChild(bar);

      /* motivo dello scostamento, a fianco della barra */
      if(scostata){
        const chip = el("div", "gnota " + (nota ? "presente" : "manca"));
        chip.appendChild(el("i", nota ? "bi bi-chat-square-text" : "bi bi-exclamation-triangle-fill"));
        chip.appendChild(el("span", null, nota || "Motivo dello scostamento"));
        chip.title = nota
          ? `Motivo dello scostamento:\n${nota}` + (o.editabile ? "\n\nFai clic per modificare." : "")
          : (o.editabile ? "Scostamento da giustificare: fai clic per scrivere il motivo."
                         : "Scostamento non ancora giustificato dall'impresa.");
        const fine = x(b.f) + (diffDays(b.f, b.i) + 1 > 0 ? px : 0) + 10;
        chip.style.left = Math.min(fine, Math.max(0, TW - 292)) + "px";
        if(o.editabile) chip.addEventListener("click", () => o.onNota(r));
        else chip.dataset.solaLettura = "1";
        tr.appendChild(chip);
      }

      /* percentuale di avanzamento nella colonna di sinistra */
      if(tracciabile){
        if(o.editabile){
          const box = el("span","gpct");
          const inp = document.createElement("input");
          inp.type = "number"; inp.min = "0"; inp.max = "100"; inp.step = "5";
          inp.id = `fase-${r.id}-avanz`; inp.value = b.av;
          inp.setAttribute("aria-label", `Avanzamento di ${r.nome}`);
          inp.addEventListener("change", () => {
            const v = Math.max(0, Math.min(100, Math.round(Number(inp.value) || 0)));
            inp.value = v; o.onAvanz(r.id, v);
          });
          box.appendChild(inp);
          box.appendChild(el("span", null, "%"));
          lab.appendChild(box);
        } else {
          lab.appendChild(el("span","gpct-ro", b.av + "%"));
        }
      }
    }

    row.appendChild(tr);
    gbody.appendChild(row);
  }

  const t = el("div","gtoday");
  t.style.left = (LW + x(oggi)) + "px";
  gbody.appendChild(t);
}

/* ══════════════════════════════════════════════════════════════════
   Trascinamento: corpo = sposta, maniglie = allunga o accorcia.
   ══════════════════════════════════════════════════════════════════ */
function abilitaTrascinamento(bar, {r, b, px, sc, x, onDate}){
  bar.addEventListener("pointerdown", ev => {
    if(ev.button !== 0) return;
    const modo = ev.target.classList.contains("sx") ? "sx"
               : ev.target.classList.contains("dx") ? "dx" : "muovi";
    ev.preventDefault();
    bar.setPointerCapture(ev.pointerId);

    const x0 = ev.clientX;
    const i0 = b.i, f0 = b.f;
    let i1 = i0, f1 = f0;

    const info = el("div","gdrag-info");
    document.body.appendChild(info);
    const mostra = () => {
      const gg = diffDays(f1, i1) + 1;
      info.textContent = `${fmtD(i1)} → ${fmtD(f1)} · ${gg} gg`;
      const q = bar.getBoundingClientRect();
      info.style.left = Math.max(8, q.left) + "px";
      info.style.top = Math.max(8, q.top - 30 + window.scrollY) + "px";
    };
    mostra();

    const muovi = e => {
      const dg = Math.round((e.clientX - x0) / px);
      if(modo === "muovi"){ i1 = addDays(i0, dg); f1 = addDays(f0, dg); }
      else if(modo === "sx"){
        i1 = addDays(i0, dg);
        if(diffDays(f1, i1) + 1 < DUR_MIN) i1 = addDays(f1, -(DUR_MIN - 1));
      } else {
        f1 = addDays(f0, dg);
        if(diffDays(f1, i1) + 1 < DUR_MIN) f1 = addDays(i1, DUR_MIN - 1);
      }
      bar.style.left = x(i1) + "px";
      bar.style.width = Math.max(6, (diffDays(f1, i1) + 1) * px) + "px";
      mostra();
    };
    const chiudi = () => {
      bar.removeEventListener("pointermove", muovi);
      bar.removeEventListener("pointerup", chiudi);
      bar.removeEventListener("pointercancel", chiudi);
      info.remove();
      if(i1 !== i0 || f1 !== f0) onDate(r.id, i1, f1);
    };
    bar.addEventListener("pointermove", muovi);
    bar.addEventListener("pointerup", chiudi);
    bar.addEventListener("pointercancel", chiudi);
  });
}
