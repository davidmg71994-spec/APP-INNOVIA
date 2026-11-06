/* ================= Revisiones de instalaciones y equipos, con sus certificados ================= */
(() => {
const CADA = [[1, 'Mensual'], [3, 'Trimestral'], [4, 'Cuatrimestral'], [6, 'Semestral'], [12, 'Anual'], [24, 'Cada 2 años'], [36, 'Cada 3 años'], [60, 'Cada 5 años']];
const CADAT = Object.fromEntries(CADA);
const AVISO = [[0, 'El mismo día'], [7, '1 semana'], [15, '15 días'], [30, '1 mes'], [60, '2 meses']];
/* casillas del apartado 9 del informe cuatrimestral */
const INFK = [['tierra', 'Puesta a tierra'], ['pci', 'Protección contra incendios'], ['aire', 'Aire acondicionado'], ['bt', 'Instalación eléctrica BT'], ['elev', 'Aparatos elevadores'], ['legio', 'Legionela'], ['otros', 'Otros elementos']];
const INFT = Object.fromEntries(INFK);
const INFCAMPOS = {tierra:['y310', 'f_rev_tierra'], pci:['y313', 'f_rev_pci'], aire:['y316', 'f_rev_aire'], bt:['y319', 'f_rev_bt'], elev:['y322', 'f_rev_elev'], otros:['y325', 'f_rev_otros_f'], legio:['y327', 'f_legio']};
const SUG = [
  ['Camión pluma', 12, ['elev']], ['Plataforma elevadora (furgón cesta)', 12, ['elev']], ['Extintores (PCI)', 12, ['pci']], ['Aire acondicionado', 12, ['aire']],
  ['Puesta a tierra', 12, ['tierra']], ['Instalación eléctrica BT', 60, ['bt']], ['Legionela, control trimestral', 3, ['legio']], ['Legionela, anual (PPCL)', 12, ['legio']],
  ['Puertas basculantes', 12, ['otros']], ['Puertas correderas', 12, ['otros']], ['Grupo electrógeno', 12, ['otros']], ['Caldera', 12, ['otros']],
  ['Equipos anticaídas', 12, []], ['Escaleras manuales', 3, []], ['Botiquín', 3, []]
];
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  pdf: SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13h5M9.5 16.5h5"/>'),
  ok: SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  clip: SVG('<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l7.8-7.8a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1"/>'),
  cam: SVG('<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>')
};

/* ---------- almacén: revisiones y certificados (archivos) ---------- */
const rdb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('registro-rp-rev', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('revs')) d.createObjectStore('revs', {keyPath:'id'}); if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', {keyPath:'id'}); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const tx = (st, m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction(st, m); const out = f(t.objectStore(st)); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return {
    all: st => tx(st, 'readonly', s => s.getAll()), get: (st, id) => tx(st, 'readonly', s => s.get(id)),
    put: (st, x) => tx(st, 'readwrite', s => s.put(x)), del: (st, id) => tx(st, 'readwrite', s => s.delete(id))
  };
})();
let REVS = [], DOCS = [], ED = null, modo = lsGet('rev-modo') === 'tabla' ? 'tabla' : 'lista', fctr = '', nuevosDocs = [];
async function cargar() {
  try { REVS = await rdb.all('revs') || []; } catch (e) { REVS = []; }
  /* de los certificados solo se carga la ficha; el archivo se lee al abrirlo */
  try { DOCS = (await rdb.all('docs') || []).map(({blob, ...m}) => m); } catch (e) { DOCS = []; }
  if (!ED) renderMain(); refrescaIni();
}
async function guardarRev(r) {
  r.guardado = Date.now();
  const i = REVS.findIndex(x => x.id === r.id); if (i >= 0) REVS[i] = r; else REVS.push(r);
  try { await rdb.put('revs', JSON.parse(JSON.stringify(r))); } catch (e) { toast('No se pudo guardar.'); }
  refrescaIni();
}
const nid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const refrescaIni = () => { if (window.INI_API && INI_API.refrescar) INI_API.refrescar(); };

/* ---------- fechas y estado ---------- */
const hoy = () => isoDate(new Date());
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const pISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const dias = (a, b) => Math.round((pISO(b) - pISO(a)) / 864e5);
const menosMeses = (s, k) => { const d = pISO(s), t = new Date(d.getFullYear(), d.getMonth() - k, 1); return isoDate(new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), dim(t.getFullYear(), t.getMonth())))); };
const masDias = (s, n) => { const d = pISO(s); d.setDate(d.getDate() + n); return isoDate(d); };
/* la última revisión puede ser un día (AAAA-MM-DD) o solo un mes (AAAA-MM): entonces vence el último día del mes */
function venceDe(u, cada) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(u || ''); if (!m || !cada) return '';
  const y = +m[1], mo = +m[2] - 1;
  if (!m[3]) return isoDate(new Date(y, mo + +cada + 1, 0));
  const t = new Date(y, mo + +cada, 1);
  return isoDate(new Date(t.getFullYear(), t.getMonth(), Math.min(+m[3], dim(t.getFullYear(), t.getMonth()))));
}
const fFecha = u => { if (!u) return ''; const m = /^(\d{4})-(\d{2})$/.exec(u); return m ? `${m[2]}/${m[1]}` : fmtDate(u); };
const fFechaL = u => /^\d{4}-\d{2}$/.test(u || '') ? fFecha(u) + ' (día sin confirmar)' : fFecha(u);
function estado(r, ref) {
  const h = ref || hoy(), v = venceDe(r.ultima, r.cada);
  if (!v) return {k:'none', t:r.ultima ? 'Sin periodicidad' : 'Sin fecha', v:'', n:null};
  /* «1 mes» y «2 meses» son meses de calendario: el aviso cae el mismo día del mes anterior */
  const ak = +r.aviso || 0, n = dias(h, v), av = ak === 30 || ak === 60 ? menosMeses(v, ak / 30) : masDias(v, -ak);
  if (n < 0) return {k:'bad', t:`Vencida hace ${-n} d`, v, n, av};
  if (n === 0) return {k:'warn', t:'Vence hoy', v, n, av};
  if (h >= av || n <= 30) return {k:'warn', t:`Vence en ${n} d`, v, n, av};
  if (n <= 60) return {k:'soon', t:`Vence en ${n} d`, v, n, av};
  return {k:'ok', t:`Vigente (${n} d)`, v, n, av};
}
const docsDe = (r, fecha) => DOCS.filter(d => d.rev === r.id && (fecha === undefined || d.fecha === fecha));
const certOk = r => !!r.ultima && docsDe(r, r.ultima).length > 0;
const delFiltro = r => !fctr || (fctr === '-' ? !(r.ctr && r.ctr.id) : !!(r.ctr && r.ctr.id === fctr));
const orden = l => [...l].sort((a, b) => { const va = estado(a).v || '9999', vb = estado(b).v || '9999'; return va < vb ? -1 : va > vb ? 1 : (a.nombre || '').localeCompare(b.nombre || ''); });
function resumen(todas) {
  const l = REVS.filter(r => todas || delFiltro(r)), e = l.map(r => estado(r).k);
  return {n:l.length, bad:e.filter(k => k === 'bad').length, warn:e.filter(k => k === 'warn').length, soon:e.filter(k => k === 'soon').length, ok:e.filter(k => k === 'ok').length, sinCert:l.filter(r => r.ultima && !certOk(r)).length};
}
function infAuto(n) {
  const t = String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), out = [];
  if (/tierra/.test(t)) out.push('tierra');
  if (/baja tension|\bbt\b|electric/.test(t)) out.push('bt');
  if (/extintor|\bpci\b|incendio|\bbie/.test(t)) out.push('pci');
  if (/aire acond|climatiz/.test(t)) out.push('aire');
  if (/pluma|grua|plataforma|cesta|elevador|pemp|carretilla|autocargante/.test(t)) out.push('elev');
  if (/legionel/.test(t)) out.push('legio');
  if (/puerta|porton|caldera|grupo electr|compresor|deposito/.test(t)) out.push('otros');
  return out;
}

/* ---------- pantalla principal ---------- */
const ctrCorto = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';
const variosCtr = () => perfilGet().contratos.length > 1 || REVS.some(r => !(r.ctr && r.ctr.id));
const titulo = r => [r.nombre, r.ident].filter(Boolean).join(' ');
function certChip(r) {
  if (!r.ultima) return '';
  const n = docsDe(r, r.ultima).length;
  return n ? `<span class="rv-cert ok">${IC.pdf}Certificado</span>` : '<span class="rv-cert falta">Falta certificado</span>';
}
function tarjeta(r) {
  const e = estado(r);
  const meta = [r.centro, !fctr && variosCtr() && r.ctr && r.ctr.id ? ctrCorto(r.ctr) : '', CADAT[r.cada] || ''].filter(Boolean).map(esc).join(' · ');
  return `<article class="rv-card st-${e.k}">
    <button type="button" class="rv-open" data-edit="${esc(r.id)}">
      <span class="rv-h"><b>${esc(titulo(r) || 'Sin nombre')}</b><span class="rv-st ${e.k}">${esc(e.t)}</span></span>
      ${meta ? `<span class="rv-meta">${meta}</span>` : ''}
      <span class="rv-fechas"><span><small>Última</small>${esc(fFechaL(r.ultima) || '—')}</span><span><small>Vence</small>${esc(e.v ? fmtDate(e.v) : '—')}</span><span><small>Aviso</small>${esc(e.av ? fmtDate(e.av) : '—')}</span></span>
    </button>
    <div class="rv-acts">${certChip(r)}<button type="button" class="rv-hecha" data-hecha="${esc(r.id)}">${IC.ok}Revisión hecha</button></div>
  </article>`;
}
function tablaHtml(l) {
  return `<div class="rv-tw"><table class="rv-t"><thead><tr><th>Instalación</th><th>Centro</th><th>Última revisión</th><th>Cada</th><th>Vence</th><th>Aviso</th><th>Estado</th><th>Certificado</th></tr></thead><tbody>
    ${l.map(r => { const e = estado(r); return `<tr data-edit="${esc(r.id)}" tabindex="0"><td><b>${esc(titulo(r))}</b>${r.ctr && r.ctr.id && !fctr && variosCtr() ? `<small>${esc(ctrCorto(r.ctr))}</small>` : ''}</td><td>${esc(r.centro || '')}</td><td class="n">${esc(fFechaL(r.ultima))}</td><td>${esc(CADAT[r.cada] || '')}</td><td class="n">${esc(e.v ? fmtDate(e.v) : '')}</td><td class="n">${esc(e.av ? fmtDate(e.av) : '')}</td><td><span class="rv-st ${e.k}">${esc(e.t)}</span></td><td>${r.ultima ? (certOk(r) ? '<span class="rv-cert ok">Sí</span>' : '<span class="rv-cert falta">Falta</span>') : ''}</td></tr>`; }).join('')}
  </tbody></table></div><p class="help">Pulsa una fila para editarla. Vence = última revisión + periodicidad. El aviso salta antes, según lo que pongas en cada una.</p>`;
}
function ctrsHtml() {
  const cs = perfilGet().contratos, sin = REVS.some(r => !(r.ctr && r.ctr.id));
  if (cs.length + (sin ? 1 : 0) < 2) return '';
  const b = (id, txt) => `<button type="button" class="chip" data-fc="${esc(id)}" aria-pressed="${fctr === id}">${esc(txt)}</button>`;
  return `<div class="chips rv-ctrs" role="group" aria-label="Filtrar por contrato">${b('', 'Todos')}${cs.map(c => b(c.id, ctrCorto(c))).join('')}${sin ? b('-', 'Sin contrato') : ''}</div>`;
}
function renderMain() {
  const M = $('#rev-main'); if (!M) return;
  if (fctr && fctr !== '-' && !contratoPorId(fctr)) fctr = '';
  const l = orden(REVS.filter(delFiltro)), s = resumen(), c = fctr && fctr !== '-' ? contratoPorId(fctr) : null;
  M.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ra="ini">‹ Inicio</button></div>
    <section class="pl-hero rv-hero">
      <p class="pl-eb">Revisiones</p>
      <h2>Instalaciones y equipos</h2>
      <p class="pl-ctr">${c ? esc(nombreContrato(c)) : fctr === '-' ? 'Sin contrato' : 'Todos tus contratos'}</p>
      <div class="pl-kpis"><div class="${s.bad ? 'bad' : ''}"><b>${s.bad}</b><span>Vencidas</span></div><div><b>${s.warn}</b><span>Vencen ya</span></div><div><b>${s.soon}</b><span>En 60 días</span></div><div class="ok"><b>${s.ok}</b><span>Vigentes</span></div></div>
    </section>
    ${!REVS.length ? `<div class="empty rv-blank"><b>Aún no tienes revisiones</b><span>Añade las instalaciones y equipos que hay que revisar: camión pluma, extintores, aire acondicionado, puesta a tierra, legionela… La app calcula cuándo vence cada una, te avisa antes y guarda su certificado. Las fechas pasan solas al informe cuatrimestral.</span><button type="button" class="btn primary" data-nueva="1">+ Añadir la primera</button></div>` : `
    ${ctrsHtml()}
    ${s.sinCert ? `<p class="rv-aviso">${plural(s.sinCert, 'revisión sin certificado', 'revisiones sin certificado')}. Súbelo desde la ficha de cada una.</p>` : ''}
    <div class="pl-modo" role="group" aria-label="Cómo verlas"><button type="button" data-rmodo="lista" aria-pressed="${modo === 'lista'}">Lista</button><button type="button" data-rmodo="tabla" aria-pressed="${modo === 'tabla'}">Tabla</button></div>
    ${l.length ? (modo === 'tabla' ? tablaHtml(l) : `<div class="rv-list">${l.map(tarjeta).join('')}</div>`) : '<div class="empty"><b>Nada en este contrato</b><span>Pulsa «Todos» para ver el resto.</span></div>'}`}`;
  vista('main');
}
function vista(q) {
  const m = $('#rev-main'), f = $('#rev-form'); if (m) m.hidden = q !== 'main'; if (f) f.hidden = q !== 'form';
  const b = $('#rev-bar'); if (b) b.hidden = q !== 'main' || $('#view-rev').hidden || !REVS.length;
}

/* ---------- ficha ---------- */
function abrirForm(id, enfocar) {
  const r = id ? REVS.find(x => x.id === id) : null;
  ED = r ? JSON.parse(JSON.stringify(r)) : {id:nid('r'), nombre:'', ident:'', ctr:fctr === '-' ? null : (fctr ? snapContrato(contratoPorId(fctr)) : snapContrato()), centro:'', empresa:'', cada:12, ultima:'', aviso:30, inf:[], infTocado:false, notas:'', hist:[], nueva:true};
  nuevosDocs = [];
  renderForm(); vista('form'); window.scrollTo({top:0});
  if (enfocar) setTimeout(() => { const e = $(enfocar); if (e) e.scrollIntoView({block:'center'}); }, 60);
  else if (!r) setTimeout(() => { const i = $('#rf-n'); if (i) i.focus(); }, 60);
}
function docHtml(d) {
  const img = /^image\//.test(d.tipo || '');
  return `<div class="rv-doc" data-doc="${esc(d.id)}"><span class="rv-di">${img ? `<img alt="" data-thumb="${esc(d.id)}">` : IC.pdf}</span><span class="rv-dt"><b>${esc(d.nombre || 'Certificado')}</b><small>${d.fecha ? 'Revisión del ' + esc(fFecha(d.fecha)) : ''}${d.tam ? ' · ' + Math.max(1, Math.round(d.tam / 1024)) + ' KB' : ''}</small></span><button type="button" class="mini" data-ver="${esc(d.id)}">Ver</button><button type="button" class="mini del" data-quitar="${esc(d.id)}" aria-label="Quitar ${esc(d.nombre || 'certificado')}">Quitar</button></div>`;
}
function renderForm() {
  const F = $('#rev-form'); if (!F || !ED) return;
  const cs = perfilGet().contratos, cid = ED.ctr && ED.ctr.id;
  const opts = cs.map(c => `<option value="${esc(c.id)}"${c.id === cid ? ' selected' : ''}>${esc(nombreContrato(c) || 'Contrato')}</option>`).join('') + (cid && !cs.some(c => c.id === cid) ? `<option value="${esc(cid)}" selected>${esc(nombreContrato(ED.ctr))}</option>` : '');
  const mes = /^\d{4}-\d{2}$/.test(ED.ultima || '');
  const e = estado(ED);
  const actuales = ED.ultima ? docsDe(ED, ED.ultima) : [], antiguos = DOCS.filter(d => d.rev === ED.id && d.fecha !== ED.ultima).sort((a, b) => (b.fecha || '') < (a.fecha || '') ? -1 : 1);
  F.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ra="volver">‹ Revisiones</button>${ED.nueva ? '' : `<span class="rv-st ${e.k}">${esc(e.t)}</span>`}</div>
    <section class="block">
      <header class="bh"><h2>${ED.nueva ? 'Nueva revisión' : 'Ficha de la revisión'}</h2></header>
      <div class="bb rv-ff">
        <div class="field"><label for="rf-n">Instalación o equipo</label><input id="rf-n" maxlength="120" value="${esc(ED.nombre)}" placeholder="Ej.: Camión pluma"></div>
        ${ED.nueva ? `<details class="cal-sug"><summary>Ideas rápidas <small>las revisiones habituales</small></summary><div class="chips">${SUG.map((s, i) => `<button type="button" class="chip" data-sug="${i}">${esc(s[0])}</button>`).join('')}</div></details>` : ''}
        <div class="g2">
          <div class="field"><label for="rf-i">Matrícula o nº de serie <i class="opc">opcional</i></label><input id="rf-i" maxlength="40" value="${esc(ED.ident || '')}" placeholder="Ej.: 9607 MRH"></div>
          <div class="field"><label for="rf-ce">Centro <i class="opc">opcional</i></label><input id="rf-ce" maxlength="60" value="${esc(ED.centro || '')}" placeholder="Ej.: V1, nave de Teruel"></div>
        </div>
        <div class="field"><label for="rf-c">Contrato</label><select id="rf-c"><option value="">Sin contrato</option>${opts}</select></div>
        <div class="field"><label for="rf-e">Empresa que la revisa <i class="opc">opcional</i></label><input id="rf-e" maxlength="80" value="${esc(ED.empresa || '')}" placeholder="Ej.: Transtel"></div>
        <div class="field"><span class="lbl" id="rf-cl">¿Cada cuánto se revisa?</span><div class="chips rv-chips" role="group" aria-labelledby="rf-cl">${CADA.map(([k, t]) => `<button type="button" class="chip" data-cada="${k}" aria-pressed="${+ED.cada === k}">${esc(t)}</button>`).join('')}</div></div>
        <div class="field"><label for="rf-u">Última revisión</label>
          <div class="rv-ult"><input id="rf-u" type="${mes ? 'month' : 'date'}" value="${esc(ED.ultima || '')}"><label class="rv-mes"><input type="checkbox" id="rf-m"${mes ? ' checked' : ''}> Solo sé el mes</label></div>
          <p class="help" id="rf-vh">${venceAyuda()}</p></div>
        <div class="field"><span class="lbl" id="rf-al">Avisarme antes de que venza</span><div class="chips rv-chips" role="group" aria-labelledby="rf-al">${AVISO.map(([k, t]) => `<button type="button" class="chip" data-aviso="${k}" aria-pressed="${+ED.aviso === k}">${esc(t)}</button>`).join('')}</div></div>
        <div class="field" id="rf-cert"><span class="lbl">Certificado de mantenimiento</span>
          ${!ED.ultima ? '<p class="help">Pon primero la fecha de la última revisión: el certificado queda unido a esa revisión.</p>' : `
          ${actuales.length ? actuales.map(docHtml).join('') : '<p class="rv-falta">Falta el certificado de esta revisión.</p>'}
          <div class="rv-up"><label class="btn rv-file">${IC.clip}Subir PDF o foto<input type="file" id="rf-doc" accept="application/pdf,image/*" multiple></label><label class="btn rv-file">${IC.cam}Hacer foto<input type="file" id="rf-cam" accept="image/*" capture="environment"></label></div>`}
          ${antiguos.length ? `<details class="rv-ant"><summary>Certificados de revisiones anteriores (${antiguos.length})</summary>${antiguos.map(docHtml).join('')}</details>` : ''}
        </div>
        <div class="field"><span class="lbl" id="rf-il">Casilla del informe cuatrimestral <i class="opc">apartado 9</i></span><div class="chips rv-chips" role="group" aria-labelledby="rf-il">${INFK.map(([k, t]) => `<button type="button" class="chip" data-inf="${k}" aria-pressed="${(ED.inf || []).includes(k)}">${esc(t)}</button>`).join('')}</div><p class="help">Su fecha pasa sola a esa casilla al pulsar «Rellenar con mis revisiones» en el informe. Si no marcas ninguna, no va al informe.</p>${window.NORMA_API ? NORMA_API.enlacesRev(ED.inf) : ''}</div>
        <div class="field"><label for="rf-no">Notas <i class="opc">opcional</i></label><textarea id="rf-no" rows="2" maxlength="600">${esc(ED.notas || '')}</textarea></div>
        ${(ED.hist || []).length ? `<div class="field"><span class="lbl">Revisiones anteriores</span><ul class="rv-hist">${[...ED.hist].sort().reverse().map(f => `<li>${esc(fFechaL(f))}${docsDe(ED, f).length ? ' · con certificado' : ''}</li>`).join('')}</ul></div>` : ''}
      </div>
    </section>
    <div class="cal-fbtns">
      <button type="button" class="btn primary" data-ra="guardar">${ED.nueva ? 'Añadir revisión' : 'Guardar cambios'}</button>
      ${ED.nueva ? '' : `<button type="button" class="btn" data-hecha="${esc(ED.id)}">${IC.ok}Registrar revisión nueva</button><button type="button" class="btn danger-t" data-ra="borrar">Eliminar</button>`}
      <button type="button" class="btn" data-ra="volver">Cancelar</button>
    </div>`;
  pintaMiniaturas();
}
function venceAyuda() {
  const e = estado(ED);
  if (!ED.ultima) return 'Si aún no se ha hecho ninguna, déjalo vacío y regístrala cuando se haga.';
  return e.v ? `Vence el ${fmtDate(e.v)}. Aviso el ${fmtDate(e.av)}.` : '';
}
const urls = new Map();
async function pintaMiniaturas() {
  for (const im of document.querySelectorAll('#rev-form img[data-thumb]')) {
    const id = im.dataset.thumb;
    if (!urls.has(id)) { try { const d = await rdb.get('docs', id); if (d && d.blob) urls.set(id, URL.createObjectURL(d.blob)); } catch (e) {} }
    if (urls.has(id)) im.src = urls.get(id);
  }
}
function leerForm() {
  const v = id => ((($('#' + id) || {}).value) || '').trim();
  ED.nombre = v('rf-n'); ED.ident = v('rf-i'); ED.centro = v('rf-ce'); ED.empresa = v('rf-e'); ED.notas = v('rf-no');
  const u = v('rf-u'); ED.ultima = /^\d{4}-\d{2}(-\d{2})?$/.test(u) ? u : '';
  const cid = v('rf-c'); ED.ctr = cid ? (contratoPorId(cid) ? snapContrato(contratoPorId(cid)) : ED.ctr) : null;
  if (!ED.infTocado && ED.nueva) ED.inf = infAuto(ED.nombre);
}
async function guardarForm() {
  leerForm();
  if (!ED.nombre) { toast('Escribe qué instalación o equipo es.'); $('#rf-n').focus(); return; }
  const nueva = !!ED.nueva; delete ED.nueva; delete ED.infTocado;
  if (nueva) ED.creado = Date.now();
  /* los certificados subidos antes de cambiar la fecha pasan a la fecha nueva */
  for (const id of nuevosDocs) { const d = DOCS.find(x => x.id === id); if (d && d.fecha !== ED.ultima && ED.ultima) { const full = await rdb.get('docs', id); if (full) { full.fecha = ED.ultima; await rdb.put('docs', full); d.fecha = ED.ultima; } } }
  nuevosDocs = [];
  const r = ED; ED = null;
  await guardarRev(r); renderMain(); window.scrollTo({top:0});
  toast(nueva ? 'Revisión añadida.' : 'Cambios guardados.');
}
async function cancelar() {
  /* si era nueva, los certificados subidos se borran */
  if (ED && ED.nueva) for (const id of nuevosDocs) { try { await rdb.del('docs', id); } catch (e) {} DOCS = DOCS.filter(d => d.id !== id); }
  nuevosDocs = []; ED = null; renderMain(); window.scrollTo({top:0});
}
async function borrar() {
  const r = ED && REVS.find(x => x.id === ED.id); if (!r) return;
  const nd = docsDe(r).length;
  if (!(await ask({title:'¿Eliminar la revisión?', body:`<p>«${esc(titulo(r))}» se borra${nd ? ` con ${plural(nd, 'certificado', 'certificados')}` : ''}.</p>`, yes:'Eliminar', danger:true}))) return;
  for (const d of docsDe(r)) { try { await rdb.del('docs', d.id); } catch (e) {} }
  DOCS = DOCS.filter(d => d.rev !== r.id); REVS = REVS.filter(x => x.id !== r.id);
  try { await rdb.del('revs', r.id); } catch (e) {}
  ED = null; renderMain(); refrescaIni(); toast('Revisión eliminada.');
}
/* revisión hecha: la anterior pasa al historial y la nueva queda como última */
async function revisionHecha(id) {
  const enFicha = !!ED;
  if (enFicha) leerForm();
  const r = enFicha ? ED : REVS.find(x => x.id === id); if (!r) return;
  const ok = await ask({title:'Revisión hecha', body:`<p>«${esc(titulo(r))}»</p><div class="field"><label for="rr-f">Fecha de la revisión</label><input id="rr-f" type="date" value="${hoy()}" max="${hoy()}"></div><p class="help">${r.ultima ? `La de ${esc(fFecha(r.ultima))} pasa al historial con su certificado. ` : ''}Después puedes subir el certificado.</p>`, yes:'Registrar'});
  if (!ok) return;
  const f = (($('#rr-f') || {}).value || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) { toast('Pon la fecha de la revisión.'); return; }
  if (r.ultima && r.ultima !== f) { r.hist = [...new Set([...(r.hist || []), r.ultima])]; }
  r.ultima = f;
  if (enFicha) { renderForm(); if (!r.nueva) await guardarRev(JSON.parse(JSON.stringify((({nueva, infTocado, ...x}) => x)(r)))); }
  else { await guardarRev(r); abrirForm(r.id, '#rf-cert'); }
  toast('Revisión registrada. Sube el certificado cuando lo tengas.');
}

/* ---------- certificados ---------- */
async function comprimir(file) {
  if (!/^image\//.test(file.type) || file.size < 1.2e6) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const b = await new Promise(res => c.toBlob(res, 'image/jpeg', .82));
    return b && b.size < file.size ? b : file;
  } catch (e) { return file; }
}
async function subir(files) {
  if (!ED) return;
  leerForm();
  if (!ED.ultima) { toast('Pon primero la fecha de la última revisión.'); return; }
  let n = 0;
  for (const f of files) {
    if (f.size > 25e6) { toast(`«${f.name}» pesa demasiado (más de 25 MB).`); continue; }
    const b = await comprimir(f);
    const ext = (/\.([a-z0-9]{2,4})$/i.exec(f.name || '') || [])[1] || (/pdf/.test(f.type) ? 'pdf' : 'jpg');
    const nombre = f.name && !/^image\.|^foto_/i.test(f.name) ? f.name : `Certificado ${ED.nombre || ''} ${fFecha(ED.ultima).replace(/\//g, '-')}.${b === f ? ext : 'jpg'}`.replace(/\s+/g, ' ');
    const d = {id:nid('d'), rev:ED.id, fecha:ED.ultima, nombre, tipo:b.type || f.type || 'application/octet-stream', tam:b.size, subido:Date.now()};
    try { await rdb.put('docs', {...d, blob:b}); DOCS.push(d); nuevosDocs.push(d.id); n++; }
    catch (e) { toast('No se pudo guardar el archivo en el móvil.'); }
  }
  if (!n) return;
  if (!ED.nueva) { const copia = JSON.parse(JSON.stringify(ED)); delete copia.infTocado; await guardarRev(copia); }
  renderForm(); const c = $('#rf-cert'); if (c) c.scrollIntoView({block:'center'});
  toast(n === 1 ? 'Certificado guardado.' : `${n} archivos guardados.`);
}
async function verDoc(id) {
  const d = await rdb.get('docs', id).catch(() => null); if (!d || !d.blob) { toast('No se encuentra el archivo.'); return; }
  const blob = d.blob.type ? d.blob : new Blob([d.blob], {type:d.tipo});
  await entregar(blob, d.nombre || 'Certificado', 'Certificado de mantenimiento');
}
async function quitarDoc(id) {
  const d = DOCS.find(x => x.id === id); if (!d) return;
  if (!(await ask({title:'¿Quitar el certificado?', body:`<p>«${esc(d.nombre)}» se borra de la app.</p>`, yes:'Quitar', danger:true}))) return;
  try { await rdb.del('docs', id); } catch (e) {}
  DOCS = DOCS.filter(x => x.id !== id); nuevosDocs = nuevosDocs.filter(x => x !== id);
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
  if (ED) { leerForm(); renderForm(); }
  refrescaIni(); toast('Certificado quitado.');
}

/* ---------- informe cuatrimestral: apartado 9 ---------- */
const corto = u => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(u || ''); return !m ? '' : m[3] ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : `${m[2]}/${m[1]}`; };
const largo = u => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(u || ''); return !m ? '' : m[3] ? `${m[3]}/${m[2]}/${m[1]}` : `${m[2]}/${m[1]}`; };
const lista = a => a.length < 2 ? a.join('') : a.slice(0, -1).join('; ') + ' y ' + a[a.length - 1];
function paraInforme(inf) {
  const ref = (inf && inf.hasta) || hoy(), cid = inf && inf.contrato && inf.contrato.id;
  const rs = REVS.filter(r => (!cid || !(r.ctr && r.ctr.id) || r.ctr.id === cid) && (r.inf || []).length);
  const vals = {}, filas = [], venc = [];
  /* la revisión que vale es la última hecha antes del cierre del informe */
  const fechaA = r => [r.ultima, ...(r.hist || [])].filter(f => f && f.slice(0, 10) <= ref).sort().pop() || '';
  INFK.forEach(([k, t]) => {
    const l = rs.filter(r => r.inf.includes(k)).map(r => ({r, f:fechaA(r)})).filter(x => x.f).sort((a, b) => a.f < b.f ? -1 : 1);
    if (!l.length) return;
    const vencidas = l.filter(x => venceDe(x.f, x.r.cada) < ref);
    const [yn, fc] = INFCAMPOS[k];
    vals[yn] = vencidas.length ? 'NO' : 'SÍ';
    vals[fc] = k === 'legio' ? largo(l[l.length - 1].f) : lista(l.map(x => corto(x.f)));
    if (k === 'otros') vals.f_rev_otros = [...new Set(l.map(x => x.r.nombre))].join(', ');
    if (k === 'legio' && l.some(x => /ppcl|plan/i.test(x.r.nombre))) vals.y330 = 'SÍ';
    vencidas.forEach(x => venc.push(`${titulo(x.r)} (venció el ${fmtDate(venceDe(x.f, x.r.cada))})`));
    filas.push(`<li><b>${esc(t)}</b>: ${esc(vals[yn])} · ${esc(vals[fc])}${k === 'otros' ? ` (${esc(vals.f_rev_otros)})` : ''}</li>`);
  });
  if (filas.length) vals.y308 = 'SÍ';
  if (venc.length && !((inf.v || {}).ct64_r10_c0_p1 || '').trim()) vals.ct64_r10_c0_p1 = `Revisiones vencidas a ${fmtDate(ref)}: ${venc.join('; ')}.`;
  const html = filas.length ? `<p>Con tus revisiones${cid ? ' de este contrato' : ''} a fecha ${esc(fmtDate(ref))} se rellena el apartado 9:</p><ul class="rv-inf-l">${filas.join('')}</ul>${venc.length ? `<p>${vals.ct64_r10_c0_p1 ? 'En «Comentarios» se apunta' : 'Hay'} lo vencido: ${esc(venc.join('; '))}.</p>` : ''}<p class="help">Lo que ya hubiera en esas casillas se sustituye.</p>` : '';
  return {n:filas.length, vals, html};
}

/* ---------- eventos ---------- */
async function onClick(e) {
  const hc = e.target.closest('[data-hecha]'); if (hc) { revisionHecha(hc.dataset.hecha); return; }
  const ed = e.target.closest('[data-edit]'); if (ed) { abrirForm(ed.dataset.edit); return; }
  const nv = e.target.closest('[data-nueva]'); if (nv) { abrirForm(null); return; }
  const md = e.target.closest('[data-rmodo]'); if (md) { modo = md.dataset.rmodo; lsSet('rev-modo', modo); renderMain(); return; }
  const fc = e.target.closest('[data-fc]'); if (fc) { fctr = fc.dataset.fc; renderMain(); return; }
  const vd = e.target.closest('[data-ver]'); if (vd) { verDoc(vd.dataset.ver); return; }
  const qd = e.target.closest('[data-quitar]'); if (qd) { quitarDoc(qd.dataset.quitar); return; }
  if (!ED) { const b0 = e.target.closest('[data-ra]'); if (b0 && b0.dataset.ra === 'ini') showTab('ini'); return; }
  const sg = e.target.closest('[data-sug]');
  if (sg) { const s = SUG[+sg.dataset.sug]; leerForm(); ED.nombre = s[0]; ED.cada = s[1]; ED.inf = [...s[2]]; ED.infTocado = true; ED.aviso = s[1] >= 12 ? 30 : s[1] >= 6 ? 15 : 7; renderForm(); toast('Pon la fecha de la última revisión y guarda.'); const u = $('#rf-u'); if (u) u.focus(); return; }
  const cd = e.target.closest('[data-cada]'); if (cd) { leerForm(); ED.cada = +cd.dataset.cada; marca('[data-cada]', 'cada', ED.cada); $('#rf-vh').textContent = venceAyuda(); return; }
  const av = e.target.closest('[data-aviso]'); if (av) { leerForm(); ED.aviso = +av.dataset.aviso; marca('[data-aviso]', 'aviso', ED.aviso); $('#rf-vh').textContent = venceAyuda(); return; }
  const ik = e.target.closest('[data-inf]');
  if (ik) { leerForm(); const k = ik.dataset.inf, s = new Set(ED.inf || []); if (s.has(k)) s.delete(k); else s.add(k); ED.inf = INFK.map(x => x[0]).filter(x => s.has(x)); ED.infTocado = true; document.querySelectorAll('#rev-form [data-inf]').forEach(b => b.setAttribute('aria-pressed', ED.inf.includes(b.dataset.inf))); return; }
  const b = e.target.closest('[data-ra]'); if (!b) return;
  const a = b.dataset.ra;
  if (a === 'ini') { showTab('ini'); return; }
  if (a === 'volver') return cancelar();
  if (a === 'guardar') return guardarForm();
  if (a === 'borrar') return borrar();
}
function marca(sel, k, v) { document.querySelectorAll('#rev-form ' + sel).forEach(b => b.setAttribute('aria-pressed', +b.dataset[k] === v)); }
function onInput(e) {
  if (!ED) return;
  const t = e.target;
  if (t.id === 'rf-n' && ED.nueva && !ED.infTocado) { ED.inf = infAuto(t.value); document.querySelectorAll('#rev-form [data-inf]').forEach(b => b.setAttribute('aria-pressed', ED.inf.includes(b.dataset.inf))); }
  if (t.id === 'rf-u') { const u = t.value; const antes = ED.ultima; leerForm(); const h = $('#rf-vh'); if (h) h.textContent = venceAyuda(); if (!!antes !== !!ED.ultima && e.type === 'change') renderForm(); }
}
async function onChange(e) {
  const t = e.target;
  if (t.id === 'rf-doc' || t.id === 'rf-cam') { const fs = [...(t.files || [])]; t.value = ''; if (fs.length) await subir(fs); return; }
  if (t.id === 'rf-m' && ED) {
    leerForm();
    if (t.checked && /^\d{4}-\d{2}-\d{2}$/.test(ED.ultima)) ED.ultima = ED.ultima.slice(0, 7);
    if (!t.checked && /^\d{4}-\d{2}$/.test(ED.ultima)) ED.ultima = '';
    const u = $('#rf-u'); u.type = t.checked ? 'month' : 'date'; u.value = ED.ultima; $('#rf-vh').textContent = venceAyuda();
    return;
  }
  onInput(e);
}

/* ---------- copia de seguridad ---------- */
const aB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
function deB64(b64, tipo) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], {type:tipo || 'application/octet-stream'}); }

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-rev'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="rev-main"></div><div id="rev-form" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  const bar = document.createElement('div'); bar.className = 'ibar'; bar.id = 'rev-bar'; bar.hidden = true;
  bar.innerHTML = '<button type="button" class="btn primary" data-nueva="1">+ Nueva revisión</button>';
  document.body.appendChild(bar);
  main.addEventListener('click', onClick); main.addEventListener('input', onInput); main.addEventListener('change', onChange);
  main.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-edit]')) { e.preventDefault(); abrirForm(e.target.dataset.edit); } });
  bar.addEventListener('click', onClick);
  cargar();
}
window.REV_API = {
  lista: () => REVS,
  abrir() { if (ED) { ED = null; nuevosDocs = []; } showTab('rev'); renderMain(); },
  resumen: () => resumen(true),
  paraInforme,
  async exportar() {
    const docs = [];
    for (const m of DOCS) { try { const d = await rdb.get('docs', m.id); if (d && d.blob) docs.push({...m, b64:await aB64(d.blob)}); } catch (e) {} }
    return {revs:REVS, docs};
  },
  async importar(x) {
    if (!x || typeof x !== 'object') return 0;
    const act = new Map(REVS.map(r => [r.id, r])); let n = 0;
    for (const r of Array.isArray(x.revs) ? x.revs : []) { if (r && r.id && r.nombre && (!act.has(r.id) || (r.guardado || 0) > (act.get(r.id).guardado || 0))) { await rdb.put('revs', r); n++; } }
    const ya = new Set(DOCS.map(d => d.id));
    for (const d of Array.isArray(x.docs) ? x.docs : []) { if (d && d.id && d.b64 && !ya.has(d.id)) { const {b64, ...m} = d; try { await rdb.put('docs', {...m, blob:deB64(b64, m.tipo)}); } catch (e) {} } }
    if (n || (x.docs || []).length) await cargar();
    return n;
  },
  atras() {
    const v = $('#view-rev'); if (!v || v.hidden) return false;
    if (ED) { cancelar(); return true; }
    showTab('ini'); return true;
  },
  onTab(t) { const b = $('#rev-bar'); if (b) b.hidden = !(t === 'rev' && !ED && REVS.length); if (t === 'rev' && !ED) renderMain(); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
