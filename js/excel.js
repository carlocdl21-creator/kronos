/* ══════════════════════════════════════════════════════════════════
   Scarichi in Excel, con la testata nera di HANZO.

   Gli stessi dati che prima uscivano in CSV: un foglio di calcolo vero,
   con marchio, intestazione della commessa, colonne larghe il giusto e
   la prima riga bloccata. Il CSV si apriva storto in Excel italiano
   (punto e virgola, accenti, date interpretate a caso) e non si poteva
   consegnare così alla Direzione Lavori.

   La libreria si carica solo quando si preme Esporta: non pesa
   sull'avvio dell'applicativo, che in cantiere parte spesso con poca
   linea.
   ══════════════════════════════════════════════════════════════════ */

const CDN = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

const NERO   = "FF0A0A0A";
const GRIGIO = "FF71717A";
const RIGA   = "FFECECEA";
const ZEBRA  = "FFFAFAFA";

let caricata = null;

/** Carica ExcelJS una volta sola, alla prima esportazione. */
function libreria(){
  if(caricata) return caricata;
  caricata = new Promise((ok, no) => {
    if(window.ExcelJS) return ok(window.ExcelJS);
    const s = document.createElement("script");
    s.src = CDN;
    s.onload = () => window.ExcelJS ? ok(window.ExcelJS)
                                    : no(new Error("Libreria Excel non disponibile."));
    s.onerror = () => no(new Error("Non riesco a scaricare la libreria Excel: serve la rete."));
    document.head.appendChild(s);
  });
  return caricata;
}

/* Il marchio chiaro per la testata nera sta in cartella già pronto:
   ridipingerlo a ogni scarico con un canvas sembrava elegante, ma
   img.decode() non si risolve quando la scheda non è in primo piano e
   lo scarico restava appeso. */
let marchio = null;
async function marchioChiaro(){
  if(marchio !== null) return marchio;
  try{
    const r = await fetch("assets/hanzo-chiaro.png");
    if(!r.ok) throw new Error("marchio non trovato");
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for(const b of buf) bin += String.fromCharCode(b);
    marchio = btoa(bin);
  }catch(e){ marchio = ""; }   // senza marchio il foglio esce lo stesso
  return marchio;
}

const lettera = n => {
  let s = "";
  for(n = n + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
};

/**
 * Compone e scarica un foglio di calcolo.
 * @param {object} o
 *   nomeFile    nome del file, senza estensione
 *   titolo      prima riga della testata nera
 *   sottotitolo seconda riga, in grigio
 *   fogli       [{nome, colonne:[{testo, largh, tipo}], righe:[[...]]}]
 *               tipo: "testo" (predefinito) | "numero" | "data" | "euro"
 */
export async function scaricaExcel({nomeFile, titolo, sottotitolo, fogli}){
  const ExcelJS = await libreria();
  const logo = await marchioChiaro();

  const wb = new ExcelJS.Workbook();
  wb.creator = "KRONOS by HANZO";
  wb.created = new Date();

  // attenzione: addImage restituisce 0 per la prima immagine, e 0 è falso
  const idLogo = logo ? wb.addImage({base64: logo, extension: "png"}) : null;

  for(const f of fogli){
    const ws = wb.addWorksheet(f.nome.slice(0, 31), {
      views: [{state: "frozen", ySplit: 5}],
      pageSetup: {orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0}
    });
    const n = f.colonne.length;
    const ultima = lettera(n - 1);

    /* ---------- testata nera ---------- */
    ws.mergeCells(`A1:${ultima}2`);
    const banda = ws.getCell("A1");
    banda.fill = {type:"pattern", pattern:"solid", fgColor:{argb:NERO}};
    banda.value = "";
    ws.getRow(1).height = 26;
    ws.getRow(2).height = 16;
    if(idLogo !== null){
      ws.addImage(idLogo, {tl:{col:0.35, row:0.5}, ext:{width:86, height:21}});
    }

    ws.mergeCells(`A3:${ultima}3`);
    const tit = ws.getCell("A3");
    tit.value = titolo;
    tit.font = {name:"Calibri", size:13, bold:true, color:{argb:NERO}};
    ws.getRow(3).height = 21;

    ws.mergeCells(`A4:${ultima}4`);
    const sot = ws.getCell("A4");
    sot.value = sottotitolo;
    sot.font = {name:"Calibri", size:9, color:{argb:GRIGIO}};
    ws.getRow(4).height = 15;

    /* ---------- intestazione delle colonne ---------- */
    const hd = ws.getRow(5);
    f.colonne.forEach((c, i) => {
      const cella = hd.getCell(i + 1);
      cella.value = c.testo;
      cella.font = {name:"Calibri", size:9, bold:true, color:{argb:"FFFFFFFF"}};
      cella.fill = {type:"pattern", pattern:"solid", fgColor:{argb:NERO}};
      cella.alignment = {vertical:"middle", horizontal:c.tipo === "testo" || !c.tipo ? "left" : "center"};
      ws.getColumn(i + 1).width = c.largh || 18;
    });
    hd.height = 20;

    /* ---------- dati ---------- */
    f.righe.forEach((r, k) => {
      const riga = ws.addRow(r);
      riga.height = 16;
      riga.eachCell({includeEmpty:true}, (cella, i) => {
        const tipo = f.colonne[i - 1]?.tipo || "testo";
        cella.font = {name:"Calibri", size:9.5, color:{argb:NERO}};
        cella.alignment = {vertical:"middle", horizontal: tipo === "testo" ? "left" : "center",
                           wrapText: tipo === "testo"};
        cella.border = {bottom:{style:"thin", color:{argb:RIGA}}};
        if(k % 2) cella.fill = {type:"pattern", pattern:"solid", fgColor:{argb:ZEBRA}};
        if(tipo === "euro")   cella.numFmt = '#,##0.00 "€"';
        if(tipo === "numero") cella.numFmt = "0.#";
      });
    });

    ws.autoFilter = {from:{row:5, column:1}, to:{row:5, column:n}};
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile.replace(/\.xlsx$/i, "") + ".xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
