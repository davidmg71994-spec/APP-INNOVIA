/* ================= Carpeta PSS/DGP: el plan de cada contrato, su índice y la búsqueda ================= */
(() => {
const SV = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICP = {
  car: SV('<path d="M3.5 7.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 19 8h-7l-2-2.5H5A1.5 1.5 0 0 0 3.5 7z"/><path d="M3.5 11h17"/>'),
  pdf: SV('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5"/><path d="M9 13h6M9 16.5h4"/>'),
  lupa: SV('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>'),
  x: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
  mas: SV('<path d="M12 5v14M5 12h14"/>'),
  menu: SV('<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>'),
  sig: SV('<path d="m9.5 6 6 6-6 6"/>'),
  ant: SV('<path d="m14.5 6-6 6 6 6"/>'),
  baja: SV('<path d="m6 9.5 6 6 6-6"/>'),
  ok: SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  warn: SV('<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.01"/>'),
  usar: SV('<path d="M7 4.5h10v15H7z"/><path d="m9.5 12 2 2 3.5-4"/>')
};
const pdb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('registro-rp-pss', 1);
      r.onupgradeneeded = () => { const d = r.result; ['docs', 'pdf', 'txt'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, {keyPath:'id'}); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const tx = (st, m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction(st, m); const out = f(t.objectStore(st)); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return {
    all: st => tx(st, 'readonly', s => s.getAll()), get: (st, id) => tx(st, 'readonly', s => s.get(id)),
    put: (st, x) => tx(st, 'readwrite', s => s.put(x)), del: (st, id) => tx(st, 'readwrite', s => s.delete(id))
  };
})();

/* ---------- estado ---------- */
let DOCS = [];                 // {id, ctr, nombre, titulo, tam, paginas, indice:[{n,t,p,l}], idx:[págs del índice], fuente, escaneado, estado, creado, guardado}
const LEY = new Map();         // id → {i, n} mientras se lee el PDF
const TXT = new Map();         // id → {raw:[texto por página], norm:[...]}
let ABI = null;                // PDF abierto {id, pdf}
let fctr = null;               // obra (contrato) cuya carpeta se ve: null = lista de obras (o la activa si solo hay una), '' = sin obra
let sel = null;                // documento cuyo índice se ve
let q = '';                    // búsqueda en la carpeta
let VER = null;                // visor {id, i, desde, hasta, foco, q, max}
let menuDoc = null;            // documento con el menú abierto
let reponer = null;            // id del documento al que se le vuelve a poner el PDF
const MAXP = 25;               // páginas del visor de una vez
const EMB = () => document.getElementById('pdfjs-src');   // versión web de un solo archivo

/* ---------- lector de PDF (pdf.js, se carga al usarlo) ---------- */
let LIB = null;
async function pdfjs() {
  if (LIB) return LIB;
  const e = EMB(), w = document.getElementById('pdfjs-worker');
  const url = e ? URL.createObjectURL(new Blob([e.textContent], {type:'text/javascript'})) : new URL('pdfjs/pdf.min.js', document.baseURI).href;
  const m = await import(url);
  const lib = m && m.GlobalWorkerOptions ? m : (m && m.default) || window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = w ? URL.createObjectURL(new Blob([w.textContent], {type:'text/javascript'})) : new URL('pdfjs/pdf.worker.min.js', document.baseURI).href;
  LIB = lib; return lib;
}
async function abrirPdf(id) {
  if (ABI && ABI.id === id) return ABI.pdf;
  if (ABI) { try { ABI.pdf.destroy(); } catch (e) {} ABI = null; }
  const lib = await pdfjs();
  const rec = await pdb.get('pdf', id);
  if (!rec || !rec.blob) throw new Error('sinpdf');
  const data = new Uint8Array(await rec.blob.arrayBuffer());
  const opts = {data, useSystemFonts:true, enableXfa:false, isEvalSupported:false};
  if (!EMB()) opts.wasmUrl = new URL('pdfjs/wasm/', document.baseURI).href;
  const pdf = await lib.getDocument(opts).promise;
  ABI = {id, pdf}; return pdf;
}
function cerrarPdf() { if (ABI) { try { ABI.pdf.destroy(); } catch (e) {} ABI = null; } }

/* ---------- texto: líneas a partir de las piezas de cada página ---------- */
function lineas(items) {
  const its = items.filter(it => typeof it.str === 'string' && it.str.trim() && it.transform).map(it => ({s:it.str, x:it.transform[4], y:it.transform[5], h:Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || it.height || 10, w:it.width || 0}));
  its.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const L = [];
  for (const it of its) {
    const l = L.find(z => Math.abs(z.y - it.y) <= Math.max(2, Math.min(z.h, it.h) * 0.45));
    if (l) l.its.push(it); else L.push({y:it.y, h:it.h, its:[it]});
  }
  L.sort((a, b) => b.y - a.y);
  return L.map(l => {
    l.its.sort((a, b) => a.x - b.x);
    let s = '', fin = null;
    for (const it of l.its) {
      if (fin !== null && it.x - fin > it.h * 0.2 && !/\s$/.test(s) && !/^\s/.test(it.s)) s += ' ';
      s += it.s; fin = it.x + it.w;
    }
    return s.replace(/\s+/g, ' ').trim();
  }).filter(Boolean).join('\n');
}

/* ---------- normalizar para buscar (misma longitud que el texto, para resaltar) ---------- */
const normTxt = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]/g, ' ').replace(/\.(?!\d)|(?<!\d)\./g, ' ');
const normN = n => String(n || '').trim().replace(/\.+$/, '');
const ACR = new Set('epi epis pss dgp bt at mt prl cae rd une itc tp ic fds pemp adr spp spa ma ce ue iso en ett ute rp i ii iii iv v vi vii viii ix x xi xii xiii xiv xv'.split(' '));
function bonito(t) {
  t = String(t || '').replace(/\s+/g, ' ').replace(/[\s.·…_:\-–]+$/, '').trim();
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  if (letras.length > 3 && letras.replace(/[^a-záéíóúüñ]/g, '').length / letras.length < 0.25) {
    t = t.toLowerCase().replace(/[\wÁÉÍÓÚÜÑáéíóúüñ./-]+/g, w => ACR.has(w.replace(/[^a-zñ]/g, '')) && w.replace(/[^a-zñ]/g, '') === w.replace(/[./-]/g, '') ? w.toUpperCase() : /\d/.test(w) ? w.toUpperCase() : w);
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

/* ---------- el índice del documento ---------- */
const NUM_RE = /^\s*((?:\d{1,3}\.){0,6}\d{1,3})\.?(?:\s+|\s*[-–:]\s*)(\S.*)$/;
const LEAD_RE = /^(.*?\S)\s*(?:[.·…_]\s*){3,}\s*(\d{1,4})\s*$/;
function indiceImpreso(lines) {
  const N = lines.length, idx = [];
  for (let i = 0; i < Math.min(N, 40); i++) {
    const n = lines[i].filter(l => LEAD_RE.test(l)).length;
    if (n >= 4) idx.push(i);
    else if (idx.length && i - idx[idx.length - 1] > 1) break;
  }
  const ents = []; let pend = null;
  for (const i of idx) for (const l0 of lines[i]) {
    const l = l0.trim(); if (!l || /^(indice|índice|sumario|contenido)\b/i.test(l)) continue;
    const m = LEAD_RE.exec(l);
    if (m) {
      const head = m[1].trim(), p = +m[2];
      if (pend && !NUM_RE.test(head)) { pend.t += ' ' + head; pend.p = p; ents.push(pend); pend = null; continue; }
      if (pend) { ents.push(pend); pend = null; }
      const nm = NUM_RE.exec(head);
      ents.push(nm ? {n:normN(nm[1]), t:nm[2], p} : {n:'', t:head, p});
    } else {
      const nm = NUM_RE.exec(l);
      if (nm && l.length < 160) { if (pend) ents.push(pend); pend = {n:normN(nm[1]), t:nm[2], p:null}; }
      else if (pend && l.length < 160) pend.t += ' ' + l;
    }
  }
  if (pend) ents.push(pend);
  let max = 0;
  const ok = ents.filter(e => { if (!e.p) return true; if (e.p < max) return false; max = e.p; return true; })
    .filter(e => e.t && e.t.replace(/[\s.·…_\d]/g, '').length >= 2);
  return {ents:ok, idx};
}
function sigue(a, b) {
  if (!a) return b.length <= 2 && b[0] >= 0 && b[0] <= 2;
  if (b.length === a.length + 1 && b.slice(0, -1).every((x, k) => x === a[k]) && b[b.length - 1] >= 1 && b[b.length - 1] <= 2) return true;
  for (let k = 1; k <= a.length; k++) {
    if (b.length !== k) continue;
    const d = b[k - 1] - a[k - 1];
    if (b.slice(0, k - 1).every((x, j) => x === a[j]) && d >= 1 && d <= 3) return true;
  }
  return false;
}
const HEAD_RE = /^((?:\d{1,2}\.){0,5}\d{1,2})\.?\s+([A-ZÁÉÍÓÚÜÑ¿¡(«"“][^\n]{1,140})$/;
function titulosCuerpo(lines, idx) {
  const out = [], no = new Set(idx); let prev = null;
  lines.forEach((ls, i) => {
    if (no.has(i)) return;
    for (const l0 of ls) {
      const l = l0.trim(); if (l.length > 150 || LEAD_RE.test(l)) continue;
      const m = HEAD_RE.exec(l); if (!m) continue;
      const t = m[2].trim();
      if (/[.,;]$/.test(t) && t.length > 40) continue;
      if (t.split(/\s+/).length > 16) continue;
      const num = m[1].split('.').map(Number);
      if (num.some(x => x > 60) || !sigue(prev, num)) continue;
      out.push({n:normN(m[1]), t, p:i + 1}); prev = num;
    }
  });
  return out;
}
function tieneTitulo(nl, n, key) {
  if (!nl) return false;
  for (const l of nl) { const s = l.trimStart(); if (s.includes(key) && (!n || s.startsWith(n))) return true; }
  for (const l of nl) if (l.trimStart().startsWith(key)) return true;
  return false;
}
function ajustaPaginas(ents, lines, idx) {
  const N = lines.length, no = new Set(idx), NL = lines.map(ls => ls.map(normTxt));
  const key = e => normTxt(e.t).replace(/\s+/g, ' ').trim().slice(0, 26).trim();
  const offs = [];
  for (const e of ents.slice(0, 40)) {
    if (!e.p) continue; const k = key(e); if (k.length < 4) continue;
    for (let off = -2; off <= 80; off++) { const i = e.p - 1 + off; if (i < 0 || i >= N || no.has(i)) continue; if (tieneTitulo(NL[i], e.n, k)) { offs.push(off); break; } }
  }
  const cuenta = new Map(); offs.forEach(o => cuenta.set(o, (cuenta.get(o) || 0) + 1));
  let off = 0, mx = 0; cuenta.forEach((c, o) => { if (c > mx) { mx = c; off = o; } });
  for (const e of ents) {
    if (!e.p) continue;
    let i = e.p - 1 + off; const k = key(e);
    if (k.length >= 4 && !tieneTitulo(NL[i], e.n, k)) for (const d of [1, -1, 2, 3]) if (tieneTitulo(NL[i + d], e.n, k)) { i += d; break; }
    e.p = Math.max(1, Math.min(N, i + 1));
  }
}
function construirIndice(ol, raw) {
  const lines = raw.map(t => t.split('\n'));
  const imp = indiceImpreso(lines);
  if (imp.ents.length) ajustaPaginas(imp.ents, lines, imp.idx);
  const mar = ol.map(o => { const m = NUM_RE.exec(o.titulo || ''); return {n:m ? normN(m[1]) : '', t:(m ? m[2] : o.titulo || '').trim(), p:o.p, d:o.d}; }).filter(x => x.t);
  const conNum = l => l.filter(e => e.n).length;
  let ind = [], fuente = '';
  if (mar.length >= 3 && conNum(mar) >= mar.length * 0.5 && conNum(mar) >= conNum(imp.ents)) { ind = mar; fuente = 'marcadores'; }
  else if (imp.ents.length >= 3) {
    ind = imp.ents; fuente = 'índice';
    if (mar.length >= 3) { const pm = new Map(mar.map(x => [normTxt(x.t).replace(/\s+/g, ' ').trim(), x.p])); ind.forEach(e => { const p = pm.get(normTxt(e.t).replace(/\s+/g, ' ').trim()); if (p) e.p = p; }); }
  }
  else if (mar.length >= 3) {
    ind = mar; fuente = 'marcadores';
    const tit = titulosCuerpo(lines, imp.idx), tm = new Map(tit.map(x => [normTxt(x.t).replace(/\s+/g, ' ').trim(), x.n]));
    ind.forEach(e => { if (!e.n) e.n = tm.get(normTxt(e.t).replace(/\s+/g, ' ').trim()) || ''; });
  }
  else { const tit = titulosCuerpo(lines, imp.idx); if (tit.length >= 3) { ind = tit; fuente = 'títulos'; } }
  const minD = Math.min(...ind.map(e => e.d || 1), 1);
  return {indice:ind.map(e => ({n:e.n || '', t:bonito(e.t), p:e.p || null, l:e.n ? e.n.split('.').length : (e.d || 1) - minD + 1})), fuente, idx:imp.idx};
}
async function leerOutline(pdf) {
  let ol = null; try { ol = await pdf.getOutline(); } catch (e) {}
  if (!ol || !ol.length) return [];
  const out = [];
  const rec = async (items, d) => {
    for (const it of items) {
      let p = null;
      try {
        let dest = it.dest; if (typeof dest === 'string') dest = await pdf.getDestination(dest);
        if (Array.isArray(dest) && dest[0] != null) p = (typeof dest[0] === 'object' ? await pdf.getPageIndex(dest[0]) : +dest[0]) + 1;
      } catch (e) {}
      out.push({titulo:it.title, d, p});
      if (it.items && it.items.length && out.length < 3000) await rec(it.items, d + 1);
    }
  };
  await rec(ol, 1);
  return out;
}
/* índice pegado a mano (por ejemplo, copiado del Word) */
function indicePegado(txt) {
  const out = [];
  String(txt || '').split(/\r?\n/).forEach(l0 => {
    const l = l0.replace(/\t+/g, ' ').trim(); if (!l) return;
    const m = LEAD_RE.exec(l) || /^(.*?\S)\s+(\d{1,4})$/.exec(l);
    const head = m ? m[1] : l, p = m ? +m[2] : null;
    const nm = NUM_RE.exec(head);
    if (nm) out.push({n:normN(nm[1]), t:bonito(nm[2]), p, l:normN(nm[1]).split('.').length});
  });
  return out;
}

/* ---------- leer un PDF: texto de cada página e índice ---------- */
async function leer(d) {
  if (LEY.has(d.id)) return;
  LEY.set(d.id, {i:0, n:0}); progreso(d.id);
  try {
    const pdf = await abrirPdf(d.id), N = pdf.numPages, raw = [];
    LEY.get(d.id).n = N; progreso(d.id);
    for (let i = 1; i <= N; i++) {
      const pg = await pdf.getPage(i);
      let t = ''; try { const tc = await pg.getTextContent(); t = lineas(tc.items).normalize('NFC'); } catch (e) {}
      raw.push(t); pg.cleanup();
      const L = LEY.get(d.id); if (L) L.i = i;
      if (i % 4 === 0 || i === N) progreso(d.id);
    }
    const ol = await leerOutline(pdf);
    const r = construirIndice(ol, raw);
    Object.assign(d, {paginas:N, indice:r.indice, idx:r.idx, fuente:r.fuente, escaneado:raw.join('').replace(/\s/g, '').length < 40 * N, estado:'ok', error:'', guardado:Date.now()});
    await pdb.put('txt', {id:d.id, raw});
    TXT.set(d.id, {raw, norm:raw.map(normTxt)});
    await pdb.put('docs', d);
  } catch (e) {
    const m = String(e && (e.name || '') + ' ' + (e.message || e));
    d.estado = /sinpdf/.test(m) ? 'sinpdf' : 'error';
    d.error = /Password/i.test(m) ? 'El PDF tiene contraseña: guárdalo sin contraseña y vuelve a añadirlo.' : /Invalid|corrupt|structure/i.test(m) ? 'El archivo no parece un PDF válido.' : 'No se pudo leer el PDF.';
    await pdb.put('docs', d).catch(() => {});
  }
  LEY.delete(d.id);
  render(); refrescaIni(); formPss();
}
function progreso(id) {
  const L = LEY.get(id);
  document.querySelectorAll(`[data-psprog="${id}"]`).forEach(el => {
    el.hidden = !L;
    if (!L) return;
    const pct = L.n ? Math.round(100 * L.i / L.n) : 0;
    el.innerHTML = `<span class="ps-bar"><i style="width:${pct}%"></i></span><small>${L.n ? `Leyendo el PDF… ${L.i} de ${L.n} páginas` : 'Abriendo el PDF…'}</small>`;
  });
  const h = document.querySelector('[data-psprogini]');
  if (h && L) h.textContent = L.n ? `Leyendo el PDF… ${L.i} de ${L.n} páginas` : 'Abriendo el PDF…';
}
async function textos(d) {
  if (TXT.has(d.id)) return TXT.get(d.id);
  const r = await pdb.get('txt', d.id).catch(() => null);
  const t = r && r.raw ? {raw:r.raw, norm:r.raw.map(normTxt)} : {raw:[], norm:[]};
  TXT.set(d.id, t); return t;
}

/* ---------- documentos de un contrato ---------- */
const ctrAct = () => { const p = perfilGet(); const c = p.contratos.find(x => x.id === p.activo) || p.contratos[0]; return c ? c.id : null; };
const corto = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';
const ctrSel = () => fctr === null ? ctrAct() : fctr;
const sinCtr = d => !(d.ctr && d.ctr.id);
const suelto = d => sinCtr(d) || !contratoPorId(d.ctr.id);   // sin obra, o de una obra que ya no está en el perfil
const docsDe = id => DOCS.filter(d => id == null ? true : id === '' ? suelto(d) : !!(d.ctr && d.ctr.id === id)).sort((a, b) => a.creado - b.creado);
/* en la visita: los de su obra y los que no tienen obra */
const conIndice = id => (id ? DOCS.filter(d => (d.ctr && d.ctr.id === id) || sinCtr(d)) : DOCS).filter(d => d.indice && d.indice.length).sort((a, b) => a.creado - b.creado);
const verLista = () => fctr === null && perfilGet().contratos.length >= 2;
const alcance = () => verLista() ? DOCS : docsDe(ctrSel());
const fmtTam = b => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const etq = e => [e.n, e.t].filter(Boolean).join(' · ');
function tituloDe(nombre, c) {
  const b = String(nombre || '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim();
  return b || ('PSS/DGP' + (c ? ' ' + corto(c) : ''));
}
function secDe(d, pag) {
  let r = -1;
  (d.indice || []).forEach((e, i) => { if (e.p && e.p <= pag && (r < 0 || e.p >= d.indice[r].p)) r = i; });
  return r;
}
function rango(d, i) {
  const e = d.indice[i]; if (!e || !e.p) return [1, d.paginas || 1];
  const sig = d.indice.slice(i + 1).find(x => x.p && (x.l || 1) <= (e.l || 1) && x.p >= e.p);
  return [e.p, sig ? Math.max(e.p, sig.p) : (d.paginas || e.p)];
}

/* ---------- búsqueda inteligente ---------- */
const STOP = new Set('de la el los las y en a del con por para un una unos unas al o e u que se su sus lo como sobre entre sin'.split(' '));
const SIN = {
  epi:['equipo de proteccion individual', 'equipos de proteccion individual', 'proteccion individual'],
  altura:['distinto nivel', 'caida', 'arnes', 'anticaida'], caida:['distinto nivel', 'altura', 'arnes'],
  zanja:['excavacion', 'vaciado', 'talud'], excavacion:['zanja', 'vaciado', 'movimiento de tierra'],
  senal:['balizamiento', '8.3 ic', 'desvio', 'cono'], balizamiento:['senal', 'cono', 'baliza'],
  corte:['ocupacion de carril', 'desvio', 'cierre de carril'], trafico:['circulacion', 'calzada', 'vehiculo'],
  quimico:['producto quimico', 'fds', 'ficha de datos de seguridad', 'sustancia'], fds:['ficha de datos de seguridad'],
  extintor:['incendio', 'pci', 'extincion'], incendio:['extintor', 'extincion'],
  emergencia:['evacuacion', 'primeros auxilios', '112', 'accidente'], accidente:['emergencia', 'primeros auxilios', 'incidente'],
  maquina:['maquinaria', 'equipo de trabajo'], maquinaria:['maquina', 'equipo de trabajo'],
  grua:['camion pluma', 'izado', 'elevacion de carga', 'gruista'], pluma:['grua', 'izado', 'gruista'],
  soldadura:['oxicorte', 'soldador'], electrico:['electricidad', 'tension', 'contacto electrico'], electricidad:['electrico', 'tension'],
  noche:['nocturno', 'visibilidad', 'iluminacion'], nocturno:['noche', 'iluminacion'],
  calor:['estres termico', 'golpe de calor', 'temperatura'], frio:['vialidad invernal', 'helada', 'nieve'],
  nieve:['vialidad invernal', 'fundente', 'quitanieve'], vialidad:['nieve', 'fundente'], hielo:['helada', 'fundente', 'vialidad invernal'],
  andamio:['medio auxiliar', 'plataforma de trabajo'], escalera:['medio auxiliar', 'escala'],
  ruido:['acustico', 'auditiv', 'protector'], polvo:['respiratori', 'mascarilla'], amianto:['fibrocemento', 'uralita'],
  barrera:['bionda', 'pretil', 'sistema de contencion'], bionda:['barrera metalica', 'sistema de contencion'],
  malla:['cerramiento', 'vallado'], vallado:['malla', 'cerramiento', 'valla'], cerramiento:['malla', 'vallado'],
  desbroce:['siega', 'desbrozadora'], poda:['tala', 'motosierra', 'arbolado'], tala:['poda', 'motosierra'],
  bacheo:['aglomerado', 'pavimento', 'firme'], pintura:['marca vial', 'repintado'],
  cuneta:['drenaje', 'obra de fabrica'], drenaje:['cuneta', 'obra de fabrica'],
  formacion:['informacion', 'curso'], recurso:['recurso preventivo'],
  carga:['manipulacion manual', 'izado'], manual:['manipulacion manual de carga', 'sobreesfuerzo'], sobreesfuerzo:['manipulacion manual', 'postura']
};
function raiz(w) {
  if (/^\d/.test(w)) return w;
  let r = w;
  if (r.length > 5 && /[lnrdz]es$/.test(r)) r = r.slice(0, -2);
  else if (r.length > 3 && /s$/.test(r)) r = r.slice(0, -1);
  if (r.length > 5 && /[ao]$/.test(r)) r = r.slice(0, -1);
  return r;
}
const SINR = Object.fromEntries(Object.entries(SIN).map(([k, v]) => [raiz(k), v]));
const tokens = s => normTxt(s).split(/\s+/).filter(w => w && !STOP.has(w)).map(raiz);
function pos(norm, a) {
  const ws = a.split(' ');
  if (ws.length > 1) { let p0 = -1; for (const w of ws) { const p = pos(norm, w); if (p < 0) return -1; if (p0 < 0) p0 = p; } return p0; }
  let i = norm.indexOf(a);
  while (i >= 0) { if (i === 0 || norm[i - 1] === ' ') return i; i = norm.indexOf(a, i + 1); }
  return -1;
}
const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const frase = (norm, qn) => new RegExp('(^| )' + qn.split(' ').map(escRe).join('\\s+')).test(norm);
function casa(norm, t) { if (pos(norm, t) >= 0) return 2; for (const a of SINR[t] || []) if (pos(norm, a) >= 0) return 1; return 0; }
const alts = t => [t, ...(SINR[t] || [])];
function posiciones(norm, t) {
  const out = [];
  for (const a of alts(t)) { const w = a.split(' ')[0]; let i = norm.indexOf(w); while (i >= 0) { if (i === 0 || norm[i - 1] === ' ') out.push(i); i = norm.indexOf(w, i + 1); } }
  return out.sort((x, y) => x - y);
}
/* dónde empieza cada apartado dentro de su página, para saber a cuál pertenece lo encontrado */
function posTitulo(norm, e) {
  const tk = normTxt(e.t).replace(/\s+/g, ' ').trim().slice(0, 18).trim(); if (!tk) return -1;
  if (e.n) { let i = norm.indexOf(e.n); while (i >= 0) { if ((i === 0 || norm[i - 1] === ' ') && norm.slice(i + e.n.length, i + e.n.length + 60).replace(/\s+/g, ' ').trim().startsWith(tk)) return i; i = norm.indexOf(e.n, i + 1); } }
  const w = tk.split(' ')[0]; let i = norm.indexOf(w);
  while (i >= 0) { if ((i === 0 || norm[i - 1] === ' ') && norm.slice(i, i + 80).replace(/\s+/g, ' ').startsWith(tk)) return i; i = norm.indexOf(w, i + 1); }
  return -1;
}
function secEn(d, pag, at, T) {
  T.heads = T.heads || new Map();
  let hs = T.heads.get(pag);
  if (!hs) { hs = []; (d.indice || []).forEach((e, i) => { if (e.p === pag) { const p = posTitulo(T.norm[pag - 1] || '', e); hs.push({i, at:p < 0 ? 0 : p}); } }); hs.sort((a, b) => a.at - b.at || a.i - b.i); T.heads.set(pag, hs); }
  let r = null; for (const h of hs) if (h.at <= at) r = h.i;
  if (r !== null) return r;
  let k = -1; (d.indice || []).forEach((e, i) => { if (e.p && e.p < pag && (k < 0 || e.p >= d.indice[k].p)) k = i; });
  return k;
}
function buscar(qs, docs, conTexto = true) {
  const out = {num:[], tit:[], txt:[]};
  const qn = normTxt(qs).replace(/\s+/g, ' ').trim();
  if (!qn) return out;
  if (/^\d+(\.\d+)*\.?$/.test(qn)) {
    const k = normN(qn);
    docs.forEach(d => (d.indice || []).forEach((e, i) => { if (e.n === k || e.n.startsWith(k + '.')) out.num.push({d, i, e, s:e.n === k ? 100 : 50 - e.n.length}); }));
    out.num.sort((a, b) => b.s - a.s);
    return out;
  }
  const tk = tokens(qs); if (!tk.length) return out;
  docs.forEach(d => (d.indice || []).forEach((e, i) => {
    const tn = normTxt(e.t); let s = 0;
    for (const t of tk) { const c = casa(tn, t); if (!c) return; s += c * 10; }
    if (tn.trim().startsWith(tk[0])) s += 15;
    if (pos(tn, qn) >= 0) s += 20;
    out.tit.push({d, i, e, s:s - (e.l || 1)});
  }));
  out.tit.sort((a, b) => b.s - a.s);
  if (!conTexto) return out;
  const grupos = new Map();
  docs.forEach(d => {
    const T = TXT.get(d.id); if (!T) return;
    const no = new Set(d.idx || []);
    T.norm.forEach((norm, pi) => {
      if (no.has(pi)) return;
      let s = 0;
      for (const t of tk) { const c = casa(norm, t); if (!c) return; s += c; }
      if (tk.length > 1 && frase(norm, qn)) s += 10;
      /* se ancla en la palabra más rara de la página (la que más dice), no en la primera */
      let ps = null; for (const t of tk) { const x = posiciones(norm, t); if (x.length && (!ps || x.length < ps.length)) ps = x; }
      ps = ps || []; const vistos = new Set();
      (ps.length ? ps : [0]).forEach(at => {
        const si = secEn(d, pi + 1, at, T); if (vistos.has(si)) return; vistos.add(si);
        const k = d.id + '|' + si;
        const g = grupos.get(k) || {d, i:si, e:d.indice[si] || null, pags:[], s:0, at};
        if (!g.pags.length) g.at = at;
        if (!g.pags.length && g.e) { const tn = normTxt(g.e.t); tk.forEach(t => { const c = casa(tn, t); if (c) g.s += 4 * c; }); }
        g.pags.push(pi + 1); g.s += s; grupos.set(k, g);
      });
    });
  });
  out.txt = [...grupos.values()].sort((a, b) => b.s - a.s).slice(0, 30);
  out.tk = tk;
  return out;
}
/* trozo del texto con las palabras buscadas resaltadas */
function trozo(d, pag, tk, at) {
  const T = TXT.get(d.id); if (!T) return '';
  const raw = T.raw[pag - 1] || '', norm = T.norm[pag - 1] || '';
  let p0 = at != null ? at : -1; if (p0 < 0) for (const t of tk) for (const a of alts(t)) { const p = pos(norm, a.split(' ')[0]); if (p >= 0 && (p0 < 0 || p < p0)) p0 = p; }
  if (p0 < 0) return '';
  let a = Math.max(0, p0 - 60), b = Math.min(raw.length, p0 + 120);
  while (a > 0 && /\S/.test(raw[a - 1])) a--;
  while (b < raw.length && /\S/.test(raw[b])) b++;
  const rs = [];
  for (const t of tk) for (const al of alts(t)) for (const w of al.split(' ')) {
    let i = norm.indexOf(w, a);
    while (i >= 0 && i < b) { if (i === 0 || norm[i - 1] === ' ') { let e = i + w.length; while (e < b && /[a-z0-9]/.test(norm[e])) e++; rs.push([i, e]); } i = norm.indexOf(w, i + 1); }
  }
  rs.sort((x, y) => x[0] - y[0]);
  let h = '', c = a;
  for (const [s, e] of rs) { if (s < c) continue; h += esc(raw.slice(c, s)) + '<mark>' + esc(raw.slice(s, e)) + '</mark>'; c = e; }
  h += esc(raw.slice(c, b));
  return (a > 0 ? '…' : '') + h.replace(/\n/g, ' ') + (b < raw.length ? '…' : '');
}

/* ---------- pintar ---------- */
function fila(d, e, i, modo, act) {
  return `<button type="button" class="ps-ix" data-${modo}="${d.id}|${i}" style="--l:${Math.max(0, (e.l || 1) - 1)}"${act ? ' aria-current="true"' : ''}>
    ${e.n ? `<span class="ps-n">${esc(e.n)}</span>` : ''}<span class="ps-t">${esc(e.t)}</span>${e.p ? `<span class="ps-p">pág. ${e.p}</span>` : ''}</button>`;
}
function arbol(d, modo, actual) {
  const ents = d.indice || []; if (!ents.length) return '';
  const minL = Math.min(...ents.map(e => e.l || 1));
  const capDe = i => { for (let k = i; k >= 0; k--) if ((ents[k].l || 1) === minL) return k; return 0; };
  const abierto = actual != null && actual >= 0 ? capDe(actual) : -1;
  let h = '', abiertoGrp = false;
  ents.forEach((e, i) => {
    if ((e.l || 1) === minL) {
      if (abiertoGrp) h += '</div></details>';
      const hijos = ents.slice(i + 1).findIndex(x => (x.l || 1) === minL), nh = hijos < 0 ? ents.length - i - 1 : hijos;
      h += `<details class="ps-cap"${i === abierto ? ' open' : ''}><summary><span class="ps-n">${esc(e.n || '')}</span><span class="ps-t">${esc(e.t)}</span>${nh ? `<i>${nh}</i>` : '<span></span>'}${ICP.baja}</summary><div class="ps-hijos">`;
      abiertoGrp = true;
      h += fila(d, {...e, l:minL}, i, modo, i === actual).replace('class="ps-ix"', 'class="ps-ix cap"').replace('</span><span class="ps-p">', '<small class="ps-np">El apartado entero</small></span><span class="ps-p">');
    } else h += fila(d, {...e, l:(e.l || 1) - minL + 1}, i, modo, i === actual);
  });
  if (abiertoGrp) h += '</div></details>';
  return `<div class="ps-arbol">${h}</div>`;
}
function resHtml(r, modo, docs) {
  const obras = new Set(docs.map(d => (d.ctr && d.ctr.id) || '')).size > 1, varios = docs.length > 1;
  const de = d => obras ? `<span class="ps-dn">${esc([d.ctr ? corto(d.ctr) : 'Sin obra', d.titulo].join(' · '))}</span>` : varios ? `<span class="ps-dn">${esc(d.titulo)}</span>` : '';
  const rowS = (x, extra = '') => `<button type="button" class="ps-ix res" data-${modo}="${x.d.id}|${x.i}"${x.pag ? ` data-pag="${x.pag}"` : ''}>
    ${x.e && x.e.n ? `<span class="ps-n">${esc(x.e.n)}</span>` : ''}<span class="ps-t">${x.e ? esc(x.e.t) : 'Antes del primer apartado'}${de(x.d)}${extra}</span>${x.e && x.e.p ? `<span class="ps-p">pág. ${x.pag || x.e.p}</span>` : x.pag ? `<span class="ps-p">pág. ${x.pag}</span>` : ''}</button>`;
  let h = '';
  if (r.num.length) h += `<p class="ps-gh">Apartados <i>${r.num.length}</i></p><div class="ps-lista">${r.num.slice(0, 60).map(x => rowS(x)).join('')}</div>`;
  if (r.tit.length) h += `<p class="ps-gh">En el índice <i>${r.tit.length}</i></p><div class="ps-lista">${r.tit.slice(0, 15).map(x => rowS(x)).join('')}</div>`;
  if (r.txt.length) h += `<p class="ps-gh">Dentro del texto <i>${r.txt.length}</i></p><div class="ps-lista">${r.txt.map(g => rowS({...g, pag:g.pags[0]}, `<small class="ps-sn">${trozo(g.d, g.pags[0], r.tk, g.at)}</small><small class="ps-np">${g.pags.length > 1 ? `Sale en ${g.pags.length} páginas` : 'Sale en 1 página'}</small>`)).join('')}</div>`;
  return h;
}

/* ---------- vista de la carpeta ---------- */
function vista(w) { const M = $('#ps-main'), V = $('#ps-ver'); if (M) M.hidden = w !== 'main'; if (V) V.hidden = w !== 'ver'; }
function render() {
  const M = $('#ps-main'); if (!M) return;
  if (verLista()) { renderObras(M); vista(VER ? 'ver' : 'main'); LEY.forEach((x, id) => progreso(id)); if (q) pintaRes(); return; }
  const p = perfilGet(), cid = ctrSel(), c = contratoPorId(cid), docs = docsDe(cid);
  if (sel && !docs.some(d => d.id === sel)) sel = null;
  if (!sel && docs.length) sel = (docs.find(d => d.indice && d.indice.length) || docs[0]).id;
  const d = DOCS.find(x => x.id === sel);
  const ejemplos = ['6.1', 'malla', 'trabajos en altura', 'camión pluma', 'señalización nocturna'];
  M.innerHTML = `<section class="pl-hero ps-hero">
      ${p.contratos.length > 1 ? `<button type="button" class="ps-volver" data-psa="obras">${ICP.ant}Todas las obras</button>` : ''}
      <p class="pl-eb">Carpeta PSS/DGP de la obra</p>
      <h2>${c ? esc(corto(c)) : cid === '' ? 'Sin obra asignada' : 'PSS/DGP'}</h2>
      <p class="pl-ctr">${c && c.sie ? 'Nº SIE ' + esc(c.sie) + ' · ' : ''}${docs.length ? plural(docs.length, 'documento', 'documentos') : 'Carpeta vacía'}</p>
    </section>
    ${docs.length ? `<div class="ps-buscar"><label for="ps-q" class="vh">Buscar en el PSS/DGP</label><input id="ps-q" type="search" placeholder="Apartado, actividad o palabra" value="${esc(q)}" autocomplete="off" enterkeyhint="search">${q ? `<button type="button" class="ps-qx" data-psa="limpia" aria-label="Borrar la búsqueda">${ICP.x}</button>` : ''}</div>
    <div class="chips ps-ej" role="group" aria-label="Ejemplos de búsqueda">${ejemplos.map(t => `<button type="button" class="chip" data-psej="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <div id="ps-res"></div>
    <div id="ps-cuerpo"${q ? ' hidden' : ''}>
      ${docs.length ? `<div class="ps-docs">${docs.map(docHtml).join('')}</div>` : `<div class="ps-vacia">${ICP.car}<b>La carpeta está vacía</b><span>Añade el PDF del PSS/DGP${c ? ' de ' + esc(corto(c)) : ''}. La app lee su índice para buscar cualquier apartado y para elegirlo en las visitas. Funciona sin cobertura.</span></div>`}
      <button type="button" class="btn ${docs.length ? '' : 'primary'} ps-add" data-psa="add">${ICP.mas}${docs.length ? 'Añadir otro PDF (anexo, adenda…)' : 'Añadir el PDF del PSS/DGP'}</button>
      ${d ? indiceHtml(d) : ''}
      ${!p.contratos.length ? `<p class="help ps-av0">Si das de alta tus obras en el Perfil, cada una tendrá su propia carpeta PSS/DGP.</p>` : ''}
    </div>`;
  vista(VER ? 'ver' : 'main');
  LEY.forEach((x, id) => progreso(id));
  if (q) pintaRes();
}
function renderObras(M) {
  const p = perfilGet(), act = ctrAct(), sueltos = docsDe('');
  M.innerHTML = `<section class="pl-hero ps-hero">
      <p class="pl-eb">Consulta</p>
      <h2>PSS/DGP</h2>
      <p class="pl-ctr">Una carpeta por obra · ${plural(p.contratos.length, 'obra', 'obras')}</p>
    </section>
    ${DOCS.length ? `<div class="ps-buscar"><label for="ps-q" class="vh">Buscar en el PSS/DGP de todas las obras</label><input id="ps-q" type="search" placeholder="Buscar en todas las obras" value="${esc(q)}" autocomplete="off" enterkeyhint="search">${q ? `<button type="button" class="ps-qx" data-psa="limpia" aria-label="Borrar la búsqueda">${ICP.x}</button>` : ''}</div>` : ''}
    <div id="ps-res"></div>
    <div id="ps-cuerpo"${q ? ' hidden' : ''}>
      <div class="ps-obras">${p.contratos.map(c => obraHtml(c, docsDe(c.id), c.id === act)).join('')}${sueltos.length ? obraHtml(null, sueltos, false) : ''}</div>
      <button type="button" class="btn ps-add" data-psa="nuevaobra">${ICP.mas}Añadir otra obra</button>
    </div>`;
}
function obraHtml(c, docs, activa) {
  const id = c ? c.id : '', n = docs.reduce((s, d) => s + ((d.indice || []).length), 0), lee = docs.filter(d => LEY.has(d.id));
  const st = docs.length ? [plural(docs.length, 'documento', 'documentos'), n ? plural(n, 'apartado', 'apartados') : docs.some(d => d.estado === 'sinpdf') ? 'falta el PDF' : lee.length ? '' : 'sin índice'].filter(Boolean).join(' · ') : 'Sin PSS/DGP todavía';
  return `<article class="ps-obra${docs.length ? ' con' : ''}">
    <button type="button" class="ps-oh" data-psobra="${esc(id)}"><span class="ps-oi">${ICP.car}</span><span class="ps-dt"><b>${c ? esc(corto(c)) : 'Sin obra asignada'}</b><small>${esc([c && c.sie ? 'SIE ' + c.sie : '', st].filter(Boolean).join(' · '))}</small></span>${activa ? '<i class="ps-act">Activa</i>' : ''}${ICP.sig}</button>
    ${lee.map(d => `<div class="ps-prog" data-psprog="${d.id}"></div>`).join('')}
    <div class="ps-ob">${docs.length ? `<button type="button" class="btn" data-psobra="${esc(id)}">Abrir la carpeta</button>${c ? `<button type="button" class="btn" data-psa="addobra" data-ctr="${esc(id)}">${ICP.mas}Añadir PDF</button>` : ''}`
      : `<button type="button" class="btn primary" data-psa="addobra" data-ctr="${esc(id)}">${ICP.mas}Añadir el PSS/DGP</button>`}</div>
  </article>`;
}
function docHtml(d) {
  const n = (d.indice || []).length, L = LEY.get(d.id);
  const sub = d.estado === 'sinpdf' ? 'Índice de una copia de seguridad: falta el PDF en este móvil'
    : d.estado === 'error' ? (d.error || 'No se pudo leer el PDF')
    : [d.paginas ? plural(d.paginas, 'página', 'páginas') : '', d.estado === 'ok' ? (n ? plural(n, 'apartado', 'apartados') : 'sin índice') : '', d.tam ? fmtTam(d.tam) : ''].filter(Boolean).join(' · ');
  return `<article class="ps-doc${d.id === sel ? ' on' : ''}${d.estado === 'error' || d.estado === 'sinpdf' ? ' mal' : ''}">
    <button type="button" class="ps-dh" data-psdoc="${d.id}"><span class="ps-di">${ICP.pdf}</span><span class="ps-dt"><b>${esc(d.titulo)}</b><small>${esc(sub)}</small></span></button>
    <button type="button" class="ps-dm" data-psmenu="${d.id}" aria-expanded="${menuDoc === d.id}" aria-label="Opciones de ${esc(d.titulo)}">${ICP.menu}</button>
    <div class="ps-prog" data-psprog="${d.id}"${L ? '' : ' hidden'}></div>
    ${d.estado === 'ok' && !n ? `<p class="ps-av">${d.escaneado ? 'Es un PDF escaneado (imagen) y no tiene texto que leer.' : 'No he encontrado el índice en el PDF.'} Puedes pegar el índice a mano y así podrás elegir el apartado en las visitas.</p>` : ''}
    ${d.estado === 'sinpdf' ? `<button type="button" class="btn ps-rep" data-psa="reponer" data-id="${d.id}">Añadir el PDF</button>` : ''}
    ${menuDoc === d.id ? `<div class="ps-menu">
      <button type="button" class="btn" data-psa="ver" data-id="${d.id}"${d.estado === 'sinpdf' ? ' disabled' : ''}>Ver el documento entero</button>
      <button type="button" class="btn" data-psa="compartir" data-id="${d.id}"${d.estado === 'sinpdf' ? ' disabled' : ''}>Compartir o guardar el PDF</button>
      <button type="button" class="btn" data-psa="renombrar" data-id="${d.id}">Cambiar el nombre</button>
      <button type="button" class="btn" data-psa="mover" data-id="${d.id}">Pasarlo a otra obra</button>
      <button type="button" class="btn" data-psa="pegar" data-id="${d.id}">Pegar el índice a mano</button>
      <button type="button" class="btn" data-psa="releer" data-id="${d.id}"${d.estado === 'sinpdf' ? ' disabled' : ''}>Volver a leer el índice</button>
      <button type="button" class="btn danger" data-psa="borrar" data-id="${d.id}">Quitar de la carpeta</button>
    </div>` : ''}
  </article>`;
}
function indiceHtml(d) {
  const n = (d.indice || []).length; if (!n) return '';
  const fuente = {marcadores:'leído de los marcadores del PDF', 'índice':'leído del índice del documento', 'títulos':'leído de los títulos del documento', manual:'pegado a mano'}[d.fuente] || '';
  return `<section class="ps-ind"><div class="ps-ih"><h3>Índice</h3><small>${plural(n, 'apartado', 'apartados')}${fuente ? ' · ' + fuente : ''}</small></div>${arbol(d, 'pssec')}</section>`;
}
async function pintaRes() {
  const R = $('#ps-res'), C = $('#ps-cuerpo'); if (!R) return;
  const docs = alcance(), todas = verLista();
  if (!q.trim()) { R.innerHTML = ''; if (C) C.hidden = false; return; }
  if (C) C.hidden = true;
  await Promise.all(docs.filter(d => d.estado === 'ok').map(textos));
  const r = buscar(q, docs);
  const h = resHtml(r, 'pssec', docs);
  R.innerHTML = h || `<p class="ps-nada">No sale «${esc(q)}» en el PSS/DGP ${todas ? 'de ninguna obra' : 'de esta obra'}.${docs.some(d => LEY.has(d.id)) ? ' Todavía se está leyendo el PDF: prueba en un momento.' : ''}</p>`;
}

/* ---------- visor de un apartado ---------- */
let OBS = null;
async function ver(id, i, opts = {}) {
  const d = DOCS.find(x => x.id === id); if (!d) return;
  showTab('pss');
  const e = i >= 0 ? d.indice[i] : null;
  let [desde, hasta] = i >= 0 ? rango(d, i) : [1, d.paginas || 1];
  if (opts.pag) { desde = Math.min(desde, opts.pag); hasta = Math.max(hasta, opts.pag); }
  VER = {id, i, desde, hasta, foco:opts.pag || desde, q:opts.q || '', volver:opts.volver || '', max:Math.min(hasta, Math.max(desde + MAXP - 1, (opts.pag || desde) + 2))};
  pintaVisor();
}
function pintaVisor() {
  const V = $('#ps-ver'); if (!V || !VER) return;
  const d = DOCS.find(x => x.id === VER.id); if (!d) { VER = null; vista('main'); return; }
  const e = VER.i >= 0 ? d.indice[VER.i] : null, n = d.indice.length;
  const pags = []; for (let k = VER.desde; k <= VER.max; k++) pags.push(k);
  V.innerHTML = `<div class="ps-vh">
      <button type="button" class="linkbtn" data-psa="volver">‹ ${VER.volver === 'form' ? 'Volver a la visita' : 'PSS/DGP'}</button>
      <div class="ps-vt">${e && e.n ? `<span class="ps-n">${esc(e.n)}</span>` : ''}<b>${e ? esc(e.t) : esc(d.titulo)}</b><small>${esc(d.titulo)} · ${VER.desde === VER.hasta ? 'pág. ' + VER.desde : `págs. ${VER.desde}–${VER.hasta}`}${VER.q ? ` · resaltado: «${esc(VER.q)}»` : ''}</small></div>
      <div class="ps-vb">
        <button type="button" class="btn" data-psa="prev"${VER.i <= 0 ? ' disabled' : ''} aria-label="Apartado anterior">${ICP.ant}</button>
        ${e ? `<button type="button" class="btn primary" data-psa="usar">${ICP.usar}Usar en la visita</button>` : '<span></span>'}
        <button type="button" class="btn" data-psa="next"${VER.i < 0 || VER.i >= n - 1 ? ' disabled' : ''} aria-label="Apartado siguiente">${ICP.sig}</button>
      </div>
    </div>
    ${d.estado === 'sinpdf' ? `<p class="ps-av">Este índice vino de una copia de seguridad y en este móvil falta el PDF. Añádelo desde la carpeta para ver las páginas.</p>` : `<div class="ps-pags">${pags.map(k => `<figure class="ps-pg" data-pg="${k}"><div class="ps-cv" style="aspect-ratio:${VER.ar || '0.707'}"></div><figcaption>Página ${k}${d.paginas ? ' de ' + d.paginas : ''}</figcaption></figure>`).join('')}</div>
    ${VER.max < VER.hasta ? `<button type="button" class="btn ps-mas" data-psa="maspags">Ver ${Math.min(MAXP, VER.hasta - VER.max)} páginas más</button>` : ''}`}`;
  vista('ver');
  if (d.estado === 'sinpdf') return;
  if (OBS) OBS.disconnect();
  OBS = 'IntersectionObserver' in window ? new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { OBS.unobserve(en.target); pintaPagina(en.target); } }), {rootMargin:'600px 0px'}) : null;
  V.querySelectorAll('.ps-pg').forEach(f => OBS ? OBS.observe(f) : pintaPagina(f));
  const f = V.querySelector(`.ps-pg[data-pg="${VER.foco}"]`);
  if (f && VER.foco !== VER.desde) setTimeout(() => f.scrollIntoView({block:'start'}), 60); else window.scrollTo({top:0});
}
async function pintaPagina(fig) {
  if (!VER) return;
  const num = +fig.dataset.pg, id = VER.id, qv = VER.q;
  const box = fig.querySelector('.ps-cv'); if (!box || box.dataset.ok) return;
  box.dataset.ok = '1';
  try {
    const pdf = await abrirPdf(id), page = await pdf.getPage(num);
    const vp1 = page.getViewport({scale:1}), w = box.clientWidth || fig.clientWidth || 360;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let scale = w / vp1.width * dpr; const maxPx = 5e6;
    if (vp1.width * vp1.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (vp1.width * vp1.height));
    const vp = page.getViewport({scale});
    const cv = document.createElement('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
    box.style.aspectRatio = `${vp1.width} / ${vp1.height}`;
    if (VER && !VER.ar) VER.ar = `${vp1.width} / ${vp1.height}`;
    await page.render({canvasContext:cv.getContext('2d'), viewport:vp}).promise;
    box.replaceChildren(cv);
    if (qv) await resaltaPagina(page, vp, box, qv);
    page.cleanup();
  } catch (e) { box.innerHTML = '<p class="ps-av">No se pudo mostrar esta página.</p>'; }
}
async function resaltaPagina(page, vp, box, qv) {
  const tk = tokens(qv); if (!tk.length) return;
  const lib = await pdfjs(), tc = await page.getTextContent();
  const W = vp.width, H = vp.height, rects = [];
  for (const it of tc.items) {
    if (!it.str || !it.transform) continue;
    const n = normTxt(it.str);
    for (const t of tk) for (const a of alts(t)) for (const w of a.split(' ')) {
      let i = n.indexOf(w);
      while (i >= 0) {
        if (i === 0 || n[i - 1] === ' ') {
          let e = i + w.length; while (e < n.length && /[a-z0-9]/.test(n[e])) e++;
          const tx = lib.Util.transform(vp.transform, it.transform), fh = Math.hypot(tx[2], tx[3]), iw = (it.width || 0) * vp.scale;
          const L = n.length || 1, x = tx[4] + iw * i / L, ww = Math.max(4, iw * (e - i) / L);
          rects.push([x, tx[5] - fh * 0.95, ww, fh * 1.15]);
        }
        i = n.indexOf(w, i + 1);
      }
    }
  }
  if (!rects.length) return;
  const ov = document.createElement('div'); ov.className = 'ps-hl';
  ov.innerHTML = rects.slice(0, 200).map(([x, y, w, h]) => `<i style="left:${(100 * x / W).toFixed(2)}%;top:${(100 * y / H).toFixed(2)}%;width:${(100 * w / W).toFixed(2)}%;height:${(100 * h / H).toFixed(2)}%"></i>`).join('');
  box.appendChild(ov);
}

function cierraVisor() {
  const vf = VER && VER.volver === 'form';
  VER = null; if (OBS) OBS.disconnect();
  if (vf) { showTab('form'); if (typeof go === 'function') go('b-pss'); } else render();
}

/* ---------- el apartado en la visita ---------- */
function ponApartado(d, e) {
  if (!e) return;
  const act = (S.rp.actividad || '').trim(), titulos = new Set(DOCS.flatMap(x => (x.indice || []).map(y => normTxt(y.t).trim())));
  S.rp.apartado = e.n || S.rp.apartado || '';
  if (!act || titulos.has(normTxt(act).trim())) S.rp.actividad = e.t;
  S.rp.enPss = 'SI';
  const a = $('#rp-apt'), b = $('#rp-act'); if (a) a.value = S.rp.apartado; if (b) b.value = S.rp.actividad;
  applyKseg(); changed(); formPss();
  if (typeof vibrar === 'function') vibrar('ok');
}
function docsVisita() { return conIndice(S.contrato && S.contrato.id); }
function buscaN(docs, n) { n = normN(n); for (const d of docs) { const i = (d.indice || []).findIndex(e => e.n && e.n === n); if (i >= 0) return {d, i, e:d.indice[i]}; } return null; }
function formPss() {
  const H = $('#ps-hint'); if (!H) return;
  const docs = docsVisita(), apt = normN(($('#rp-apt') || {}).value || S.rp.apartado || '');
  const btn = $('#ps-apt-btn'); if (btn) btn.classList.toggle('vacio', !docs.length);
  if (!docs.length) {
    const hay = docsDe(S.contrato && S.contrato.id).length;
    H.className = 'ps-hint'; H.innerHTML = hay ? `<span>El PSS/DGP de este contrato todavía no tiene índice.</span> <button type="button" class="linkbtn" data-psa="carpeta">Abrir la carpeta</button>`
      : `<span>Sube el PSS/DGP del contrato a su carpeta y elegirás el apartado de una lista.</span> <button type="button" class="linkbtn" data-psa="carpeta">Ir a la carpeta PSS/DGP</button>`;
    return;
  }
  if (!apt) { H.className = 'ps-hint'; H.innerHTML = '<span>Toca <b>Índice</b> para elegir el apartado del PSS/DGP, o escribe el número o la actividad.</span>'; return; }
  const f = buscaN(docs, apt);
  if (f) { H.className = 'ps-hint ok'; H.innerHTML = `${ICP.ok}<span><b>${esc(f.e.n)}</b> · ${esc(f.e.t)}${f.e.p ? ` · pág. ${f.e.p}` : ''}</span> <button type="button" class="linkbtn" data-psver="${f.d.id}|${f.i}">Ver en el PSS/DGP</button>`; }
  else { H.className = 'ps-hint warn'; H.innerHTML = `${ICP.warn}<span>El apartado <b>${esc(apt)}</b> no está en el índice del PSS/DGP de este contrato.</span>`; }
}
function sugerir(campo) {
  const B = $('#ps-sug'); if (!B) return;
  const docs = docsVisita(), v = (campo.value || '').trim();
  if (!docs.length || !v || (campo.id === 'rp-act' && v.length < 3)) { B.hidden = true; B.innerHTML = ''; return; }
  const r = buscar(v, docs, false), l = (r.num.length ? r.num : r.tit).slice(0, 6);
  if (!l.length || (l.length === 1 && l[0].e.n === normN(v))) { B.hidden = true; B.innerHTML = ''; return; }
  B.innerHTML = `<p class="ps-gh">Del índice del PSS/DGP</p><div class="ps-lista">${l.map(x => `<button type="button" class="ps-ix res" data-pspick="${x.d.id}|${x.i}">${x.e.n ? `<span class="ps-n">${esc(x.e.n)}</span>` : ''}<span class="ps-t">${esc(x.e.t)}</span>${x.e.p ? `<span class="ps-p">pág. ${x.e.p}</span>` : ''}</button>`).join('')}</div>`;
  B.hidden = false;
}
/* desplegable con todo el índice */
let qs = '';
function abrirHoja() {
  const Sh = $('#ps-hoja'); if (!Sh) return;
  qs = ''; Sh.hidden = false; document.body.classList.add('ps-noscroll');
  pintaHoja(true);
}
function cerrarHoja() { const Sh = $('#ps-hoja'); if (!Sh || Sh.hidden) return false; Sh.hidden = true; document.body.classList.remove('ps-noscroll'); const a = $('#rp-apt'); if (a) a.focus({preventScroll:true}); return true; }
async function pintaHoja(inicio) {
  const Sh = $('#ps-hoja'); if (!Sh) return;
  const docs = docsVisita(), c = S.contrato;
  const L = Sh.querySelector('.ps-hl2');
  if (inicio) {
    Sh.innerHTML = `<div class="ps-hin" role="dialog" aria-modal="true" aria-labelledby="ps-ht">
      <div class="ps-hh"><div><b id="ps-ht">Apartado del PSS/DGP</b><small>${c ? esc(corto(c)) : 'Visita sin contrato'}</small></div><button type="button" class="ps-hx" data-psa="cerrarhoja" aria-label="Cerrar">${ICP.x}</button></div>
      ${docs.length ? `<div class="ps-buscar"><label for="ps-hq" class="vh">Buscar apartado</label><input id="ps-hq" type="search" placeholder="Número, actividad o palabra" autocomplete="off" enterkeyhint="search"></div>` : ''}
      <div class="ps-hl2"></div></div>`;
  }
  const box = Sh.querySelector('.ps-hl2');
  if (!docs.length) { box.innerHTML = `<div class="ps-vacia">${ICP.car}<b>No hay índice del PSS/DGP</b><span>Sube el PDF del PSS/DGP de ${c ? esc(corto(c)) : 'este contrato'} a su carpeta y aquí tendrás todos los apartados.</span><button type="button" class="btn primary" data-psa="carpeta">Ir a la carpeta PSS/DGP</button></div>`; return; }
  if (qs.trim()) {
    await Promise.all(docs.map(textos));
    const r = buscar(qs, docs);
    box.innerHTML = resHtml(r, 'pspick', docs) || `<p class="ps-nada">No sale «${esc(qs)}» en el PSS/DGP.</p>`;
  } else {
    const act = buscaN(docs, S.rp.apartado || '');
    box.innerHTML = docs.map(d => `${docs.length > 1 ? `<p class="ps-gh">${esc(d.titulo)}</p>` : ''}${arbol(d, 'pspick', act && act.d === d ? act.i : null)}`).join('');
    const cur = box.querySelector('[aria-current="true"]'); if (cur) setTimeout(() => cur.scrollIntoView({block:'center'}), 30);
  }
}

/* ---------- acciones ---------- */
async function subir(file) {
  if (!file) return;
  if (!/pdf/i.test(file.type || '') && !/\.pdf$/i.test(file.name || '')) { toast('Elige un archivo PDF.'); return; }
  const blob = new Blob([await file.arrayBuffer()], {type:'application/pdf'});
  let d = reponer ? DOCS.find(x => x.id === reponer) : null;
  reponer = null;
  if (d) Object.assign(d, {nombre:file.name, tam:file.size, estado:'leyendo', error:'', guardado:Date.now()});
  else {
    const c = contratoPorId(ctrSel());
    d = {id:'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ctr:c ? snapContrato(c) : null, nombre:file.name, titulo:tituloDe(file.name, c), tam:file.size, paginas:0, indice:[], idx:[], fuente:'', estado:'leyendo', creado:Date.now(), guardado:Date.now()};
    DOCS.push(d);
  }
  if (ABI && ABI.id === d.id) cerrarPdf();
  TXT.delete(d.id);
  await pdb.put('pdf', {id:d.id, blob});
  await pdb.put('docs', d);
  sel = d.id; q = ''; VER = null;
  if (fctr === null) fctr = d.ctr && d.ctr.id ? d.ctr.id : (perfilGet().contratos.length ? '' : null);
  const v = $('#view-pss'); if (v && v.hidden) showTab('pss');
  render(); refrescaIni();
  toast('PDF guardado en la carpeta. Leyendo el índice…');
  leer(d);
}
function elegirPdf(idRep) { reponer = idRep || null; const f = $('#ps-file'); if (f) { f.value = ''; f.click(); } }
async function accion(a, b) {
  const id = b.dataset.id, d = id && DOCS.find(x => x.id === id);
  if (a === 'add') { elegirPdf(); return; }
  if (a === 'addobra') { fctr = b.dataset.ctr || ''; elegirPdf(); return; }
  if (a === 'obras') { fctr = null; sel = null; q = ''; menuDoc = null; render(); window.scrollTo({top:0}); return; }
  if (a === 'nuevaobra') { if (window.INI_API && INI_API.nuevoContrato) { const c = await INI_API.nuevoContrato(); if (c) { showTab('pss'); fctr = null; render(); } } return; }
  if (a === 'reponer') { elegirPdf(id); return; }
  if (a === 'limpia') { q = ''; render(); const i = $('#ps-q'); if (i) i.focus(); return; }
  if (a === 'volver') { cierraVisor(); return; }
  if (a === 'carpeta') { cerrarHoja(); PSS_API.abrir(); return; }
  if (a === 'cerrarhoja') { cerrarHoja(); return; }
  if (a === 'maspags' && VER) { VER.max = Math.min(VER.hasta, VER.max + MAXP); const y = window.scrollY; pintaVisor(); window.scrollTo({top:y}); return; }
  if ((a === 'prev' || a === 'next') && VER) { const k = VER.i + (a === 'prev' ? -1 : 1); ver(VER.id, k, {volver:VER.volver}); return; }
  if (a === 'usar' && VER) {
    const dd = DOCS.find(x => x.id === VER.id), e = dd && dd.indice[VER.i]; if (!e) return;
    ponApartado(dd, e); toast(`En la visita: ${etq(e)}`);
    showTab('form'); if (typeof go === 'function') go('b-pss');
    return;
  }
  if (!d) return;
  if (a === 'ver') { menuDoc = null; ver(d.id, -1); return; }
  if (a === 'compartir') {
    const r = await pdb.get('pdf', d.id); if (!r || !r.blob) { toast('Falta el PDF en este móvil.'); return; }
    if (window.AndroidApp && r.blob.size > 40 * 1048576) { toast('El PDF es demasiado grande para compartirlo desde la app.'); return; }
    await entregar(r.blob, d.nombre || (d.titulo + '.pdf'), 'PSS/DGP'); return;
  }
  if (a === 'mover') {
    const p = perfilGet(); if (!p.contratos.length) { toast('Primero da de alta tus obras en el Perfil.'); return; }
    const cur = d.ctr && d.ctr.id;
    const r = await ask({title:'¿De qué obra es este PDF?', body:`<div class="ps-mv">${p.contratos.map(c => `<label class="ps-mvo"><input type="radio" name="ps-mv" value="${esc(c.id)}"${c.id === cur ? ' checked' : ''}><span>${esc(nombreContrato(c))}</span></label>`).join('')}</div>`, yes:'Mover'});
    if (r !== true) return;
    const c = contratoPorId((document.querySelector('input[name="ps-mv"]:checked') || {}).value); if (!c) return;
    d.ctr = snapContrato(c); d.guardado = Date.now(); await pdb.put('docs', d);
    fctr = c.id; sel = d.id; menuDoc = null; render(); refrescaIni(); formPss(); toast(`Ahora está en la carpeta de «${corto(c)}».`); return;
  }
  if (a === 'renombrar') {
    const r = await ask({title:'Nombre del documento', body:`<label class="field"><span class="lbl">Nombre</span><input id="ps-ren" value="${esc(d.titulo)}" maxlength="120"></label>`, yes:'Guardar'});
    if (r !== true) return; const v = (($('#ps-ren') || {}).value || '').trim(); if (!v) return;
    d.titulo = v; d.guardado = Date.now(); await pdb.put('docs', d); render(); refrescaIni(); return;
  }
  if (a === 'pegar') {
    const r = await ask({title:'Pegar el índice', body:`<p>Copia el índice del Word o del PDF y pégalo aquí: una línea por apartado, con su número (por ejemplo «6.1.9.5 Malla de cerramiento ....... 123»). La página es opcional.</p><textarea id="ps-pega" rows="9" placeholder="6.1.9.5 Malla de cerramiento ..... 123"></textarea>`, yes:'Usar este índice'});
    if (r !== true) return;
    const ind = indicePegado(($('#ps-pega') || {}).value);
    if (!ind.length) { toast('No he encontrado apartados con número en el texto pegado.'); return; }
    Object.assign(d, {indice:ind, fuente:'manual', guardado:Date.now()}); await pdb.put('docs', d);
    menuDoc = null; render(); refrescaIni(); formPss(); toast(`Índice guardado: ${plural(ind.length, 'apartado', 'apartados')}.`); return;
  }
  if (a === 'releer') { menuDoc = null; d.estado = 'leyendo'; render(); leer(d); return; }
  if (a === 'borrar') {
    const r = await ask({title:'Quitar de la carpeta', body:`<p>Se quita «${esc(d.titulo)}» y su índice de este móvil. Las visitas que ya tienen el apartado puesto no cambian.</p>`, yes:'Quitar', danger:true});
    if (r !== true) return;
    if (ABI && ABI.id === d.id) cerrarPdf();
    await Promise.all(['docs', 'pdf', 'txt'].map(s => pdb.del(s, d.id).catch(() => {})));
    DOCS = DOCS.filter(x => x.id !== d.id); TXT.delete(d.id); if (sel === d.id) sel = null; menuDoc = null;
    render(); refrescaIni(); formPss(); toast('Quitado de la carpeta.');
  }
}
function onClick(e) {
  const ej = e.target.closest('[data-psej]'); if (ej) { q = ej.dataset.psej; render(); return; }
  const sc = e.target.closest('[data-pssec]'); if (sc) { const [id, i] = sc.dataset.pssec.split('|'); ver(id, +i, {pag:+sc.dataset.pag || 0, q:sc.dataset.pag ? q : ''}); return; }
  const ob = e.target.closest('[data-psobra]'); if (ob) { fctr = ob.dataset.psobra; sel = null; q = ''; menuDoc = null; render(); window.scrollTo({top:0}); return; }
  const dc = e.target.closest('[data-psdoc]'); if (dc) { sel = dc.dataset.psdoc; render(); return; }
  const mn = e.target.closest('[data-psmenu]'); if (mn) { menuDoc = menuDoc === mn.dataset.psmenu ? null : mn.dataset.psmenu; render(); return; }
  const a = e.target.closest('[data-psa]'); if (a) accion(a.dataset.psa, a);
}
function refrescaIni() { const v = $('#view-ini'); if (v && !v.hidden && window.INI_API) INI_API.refrescar(); }

/* ---------- montar ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-pss'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="ps-main"></div><div id="ps-ver" hidden></div><input type="file" id="ps-file" accept="application/pdf,.pdf" hidden>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  main.addEventListener('click', onClick);
  main.addEventListener('input', e => { if (e.target.id === 'ps-q') { q = e.target.value; const x = main.querySelector('.ps-qx'); if (!!q !== !!x) { const pos0 = e.target.selectionStart; render(); const i = $('#ps-q'); if (i) { i.focus(); try { i.setSelectionRange(pos0, pos0); } catch (er) {} } } else pintaRes(); } });
  main.addEventListener('change', e => {
    if (e.target.id === 'ps-file') { const f = e.target.files && e.target.files[0]; subir(f).catch(() => toast('No se pudo guardar el PDF.')); }
  });
  main.addEventListener('keydown', e => { if (e.target.id === 'ps-q' && e.key === 'Enter') e.target.blur(); });
  /* desplegable en la visita */
  const hoja = document.createElement('div'); hoja.id = 'ps-hoja'; hoja.className = 'ps-hoja'; hoja.hidden = true;
  document.body.appendChild(hoja);
  hoja.addEventListener('click', e => {
    if (e.target === hoja) { cerrarHoja(); return; }
    const pk = e.target.closest('[data-pspick]');
    if (pk) { const [id, i] = pk.dataset.pspick.split('|'), d = DOCS.find(x => x.id === id); if (d) { ponApartado(d, d.indice[+i]); toast(`Apartado ${etq(d.indice[+i])}`); } cerrarHoja(); return; }
    const a = e.target.closest('[data-psa]'); if (a) accion(a.dataset.psa, a);
  });
  hoja.addEventListener('input', e => { if (e.target.id === 'ps-hq') { qs = e.target.value; pintaHoja(false); } });
  hoja.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHoja(); if (e.target.id === 'ps-hq' && e.key === 'Enter') e.target.blur(); });
  montarVisita();
  pdb.all('docs').then(l => {
    DOCS = (l || []).filter(x => x && x.id);
    render(); refrescaIni(); formPss();
    setTimeout(() => DOCS.filter(d => d.estado === 'leyendo').forEach(d => leer(d)), 1500);
  }).catch(() => { render(); });
}
function montarVisita() {
  const apt = $('#rp-apt'), act = $('#rp-act'); if (!apt || $('#ps-apt-btn')) return;
  const box = document.createElement('div'); box.className = 'ps-combo';
  apt.parentNode.insertBefore(box, apt); box.appendChild(apt);
  const b = document.createElement('button'); b.type = 'button'; b.id = 'ps-apt-btn'; b.className = 'ps-cb';
  b.setAttribute('aria-label', 'Elegir el apartado en el índice del PSS/DGP'); b.innerHTML = `Índice${ICP.baja}`;
  box.appendChild(b);
  const fieldApt = box.closest('.field');
  const sug = document.createElement('div'); sug.id = 'ps-sug'; sug.className = 'field span2 ps-sug'; sug.hidden = true;
  const hint = document.createElement('p'); hint.id = 'ps-hint'; hint.className = 'ps-hint';
  const hw = document.createElement('div'); hw.className = 'field span2 ps-hw'; hw.appendChild(hint);
  fieldApt.parentNode.insertBefore(sug, fieldApt.nextSibling);
  fieldApt.parentNode.insertBefore(hw, sug.nextSibling);
  b.addEventListener('click', abrirHoja);
  [apt, act].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => { sugerir(inp); setTimeout(formPss, 0); });
    inp.addEventListener('focus', () => { if (inp.value.trim()) sugerir(inp); });
    inp.addEventListener('blur', () => setTimeout(() => { const s = $('#ps-sug'); if (s && !s.contains(document.activeElement)) s.hidden = true; }, 180));
  });
  sug.addEventListener('pointerdown', e => e.preventDefault());
  sug.addEventListener('click', e => {
    const pk = e.target.closest('[data-pspick]'); if (!pk) return;
    const [id, i] = pk.dataset.pspick.split('|'), d = DOCS.find(x => x.id === id);
    if (d) ponApartado(d, d.indice[+i]); sug.hidden = true;
  });
  hint.addEventListener('click', e => {
    const v = e.target.closest('[data-psver]'); if (v) { const [id, i] = v.dataset.psver.split('|'); ver(id, +i, {volver:'form'}); return; }
    const a = e.target.closest('[data-psa]'); if (a) accion(a.dataset.psa, a);
  });
  formPss();
}

window.PSS_API = {
  lista: () => DOCS,
  abrir(o = {}) {
    VER = null; menuDoc = null; q = '';
    fctr = o.ctr !== undefined ? o.ctr : null;
    showTab('pss'); render();
    if (o.buscar) setTimeout(() => { const i = $('#ps-q'); if (i) i.focus(); }, 60);
  },
  anadir(ctrId) { fctr = ctrId != null ? ctrId : ctrAct(); elegirPdf(); },
  /* para el Inicio */
  resumen(ctrId) {
    const docs = docsDe(ctrId), L = docs.map(d => LEY.get(d.id)).find(Boolean) || null;
    return {docs:docs.length, apartados:docs.reduce((s, d) => s + ((d.indice || []).length), 0), paginas:docs.reduce((s, d) => s + (d.paginas || 0), 0), leyendo:L, error:docs.some(d => d.estado === 'error'), sinPdf:docs.some(d => d.estado === 'sinpdf')};
  },
  ver, buscar:(s, ctrId) => buscar(s, docsDe(ctrId)), textos:id => { const d = DOCS.find(x => x.id === id); return d ? textos(d) : null; },
  formPss, ponApartado,
  /* copia de seguridad: el índice viaja, el PDF no (pesa demasiado) */
  exportar: () => DOCS.map(d => ({id:d.id, ctr:d.ctr || null, nombre:d.nombre, titulo:d.titulo, tam:d.tam, paginas:d.paginas, indice:d.indice || [], idx:d.idx || [], fuente:d.fuente || '', creado:d.creado, guardado:d.guardado})),
  async importar(arr) {
    let n = 0;
    for (const x of arr || []) {
      if (!x || !x.id || !Array.isArray(x.indice) || DOCS.some(d => d.id === x.id)) continue;
      const d = {...x, estado:'sinpdf'}; await pdb.put('docs', d); DOCS.push(d); n++;
    }
    if (n) { render(); refrescaIni(); formPss(); }
    return n;
  },
  atras() {
    if (cerrarHoja()) return true;
    const v = $('#view-pss'); if (!v || v.hidden) return false;
    if (VER) { cierraVisor(); return true; }
    if (q) { q = ''; render(); return true; }
    if (fctr !== null && perfilGet().contratos.length >= 2) { fctr = null; sel = null; menuDoc = null; render(); return true; }
    return false;
  },
  onTab(t) { if (t !== 'pss') { cerrarHoja(); } }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
