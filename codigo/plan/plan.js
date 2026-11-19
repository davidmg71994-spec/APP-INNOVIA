/* ================= Planificación preventiva (tabla de seguimiento de medidas correctoras) ================= */
(() => {
const CATS = [
  {k:'prl', c:'#F7CAAC', t:'Periódica · PRL', d:'Actividad preventiva periódica cuyo origen NO es una deficiencia en Seguridad / PRL'},
  {k:'ma', c:'#E2EFD9', t:'Periódica · CA-MA', d:'Actividad preventiva periódica cuyo origen NO es una deficiencia en CA - MA'},
  {k:'spp', c:'#DEEAF6', t:'Visita Responsable SPP/MA', d:'Observación, NC u oportunidad de mejora detectada en la visita al servicio del Responsable SPP / MA'},
  {k:'aud', c:'#EA9999', t:'Auditoría', d:'Observación, NC u oportunidad de mejora de una auditoría interna o externa'},
  {k:'def', c:'#FFFFFF', t:'Deficiencia en visita', d:'Deficiencia en PRL - CA - MA detectada en una visita al servicio del técnico (TPCMA)'}
];
const CAT = Object.fromEntries(CATS.map((c, i) => [c.k, {...c, i}]));
const TIPOS = [['obs', 'Observación', 'Observación'], ['nc', 'No conformidad', 'N.C'], ['om', 'Oportunidad de mejora', 'O.M']];
const PRIO = [['1', 'Alta'], ['2', 'Media'], ['3', 'Baja']];
const PLAZOS = ['1 SEMANA', '1 MES', '2 MESES', '3 MESES', '6 MESES', 'MENSUAL', 'TRIMESTRAL', 'ANUAL'];
const SUG = {
  riesgo: ['Seguridad', 'Higiene', 'Ergonomía', 'Vigilancia de la Salud', 'Formación', 'Información', 'EPI', 'Señalización', 'Equipos de trabajo', 'Vehículos', 'Instalaciones', 'Emergencias', 'Simulacro', 'Comité de SyS', 'Coordinación de actividades (CAE)', 'Seguridad vial', 'Aspectos ambientales', 'Residuos', 'Legionella', 'Productos químicos', 'Requisitos legales', 'Documentación del sistema'],
  resp: ['TSPRL', 'TMA', 'TSPRL - CA - MA', 'Responsable PRL', 'Jefe COEX', 'Técnico COEX', 'Dpto. PRL', 'Administrativ@', 'Delegados de Prevención'],
  reg: ['DropBox', 'Visita a tajo', 'Fotos visita tajo', 'Google Calendar', 'Tablón de anuncios', 'Acta', 'Certificado', 'Registro de entrega']
};
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/* ---------- almacén ---------- */
const pdb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('registro-rp-plan', 1); r.onupgradeneeded = () => r.result.createObjectStore('planes', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  }));
  const tx = (m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('planes', m); const out = f(t.objectStore('planes')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return { all: () => tx('readonly', s => s.getAll()), put: x => tx('readwrite', s => s.put(x)), del: id => tx('readwrite', s => s.delete(id)) };
})();
let PLANES = [], PL = null, FILA = null, filtro = '', saveT = null;
async function cargar() { try { PLANES = (await pdb.all() || []).sort((a, b) => (b.anio - a.anio) || ((b.creado || 0) - (a.creado || 0))); } catch (e) { PLANES = []; } if (!PL) renderLista(); refrescaIni(); }
function guardarYa() {
  if (!PL) return Promise.resolve();
  clearTimeout(saveT); saveT = null;
  PL.guardado = Date.now();
  const copia = JSON.parse(JSON.stringify(PL));
  const i = PLANES.findIndex(x => x.id === copia.id); if (i >= 0) PLANES[i] = copia; else PLANES.unshift(copia);
  pintaEstado('Guardando…');
  return pdb.put(copia).then(() => pintaEstado('Guardado'), () => pintaEstado('No se pudo guardar', true));
}
function guardarPronto() { clearTimeout(saveT); pintaEstado('Cambios sin guardar'); saveT = setTimeout(guardarYa, 600); }
function pintaEstado(t, mal) { document.querySelectorAll('.pl-est').forEach(e => { e.textContent = t; e.classList.toggle('bad', !!mal); }); }
const nid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const refrescaIni = () => { if (window.INI_API && INI_API.refrescar) INI_API.refrescar(); };

/* ---------- fechas, plazos y estado ---------- */
const hoyISO = () => isoDate(new Date());
const mesTxt = ym => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ''); return m ? `${MESES[+m[2] - 1]}-${m[1]}` : (ym || ''); };
function plazoMeses(s) {
  const t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/diari/.test(t)) return {d:1};
  if (/semanal/.test(t)) return {d:7};
  if (/mensual/.test(t)) return {m:1};
  if (/trimestral/.test(t)) return {m:3};
  if (/cuatrimestral/.test(t)) return {m:4};
  if (/semestral/.test(t)) return {m:6};
  if (/anual/.test(t)) return {m:12};
  const m = /(\d+)\s*(dia|semana|mes|ano)/.exec(t); if (!m) return null;
  const n = +m[1];
  return m[2] === 'dia' ? {d:n} : m[2] === 'semana' ? {d:7 * n} : m[2] === 'mes' ? {m:n} : {m:12 * n};
}
function vence(f) {
  const m = /^(\d{4})-(\d{2})$/.exec(f.fdet || ''), p = plazoMeses(f.plazo); if (!m || !p) return null;
  /* la detección se apunta por meses: el plazo acaba el último día del mes que toque */
  const meses = p.m || Math.floor(p.d / 28);
  return isoDate(new Date(+m[1], +m[2] - 1 + meses + 1, 0));
}
function estado(f) {
  if (f.fapl) return {k:'ok', t:'Aplicada · ' + fmtDate(f.fapl)};
  const v = vence(f);
  if (v && v < hoyISO()) return {k:'bad', t:'Vencida · ' + fmtDate(v)};
  return {k:'pend', t:v ? 'Pendiente · vence ' + fmtDate(v) : 'Pendiente'};
}
const vacia = f => !((f.riesgo || '').trim() || (f.medida || '').trim());
function resumen(pl) {
  const fs = (pl ? pl.filas : []).filter(f => !vacia(f));
  const e = fs.map(estado);
  return {n:fs.length, ok:e.filter(x => x.k === 'ok').length, bad:e.filter(x => x.k === 'bad').length, pend:e.filter(x => x.k === 'pend').length};
}
const ordenFilas = fs => fs.map((f, i) => [f, i]).sort((a, b) => (CAT[a[0].cat].i - CAT[b[0].cat].i) || (a[1] - b[1])).map(x => x[0]);
const titPlan = pl => `Planificación preventiva ${pl.anio}`;
const actId = () => { const a = window.INI_API ? INI_API.activo() : null; return a ? a.id : null; };
const delActivo = pl => { const a = actId(); return !a || !pl.contrato || !pl.contrato.id || pl.contrato.id === a; };

/* ---------- deficiencias de las visitas ---------- */
function defsVisitas(pl) {
  const ya = new Set(pl.filas.filter(f => f.origen).map(f => f.origen.k));
  const out = [];
  (typeof HIST !== 'undefined' ? HIST : []).forEach(r => {
    if (!r.rp || !String(r.rp.fecha || '').startsWith(String(pl.anio))) return;
    if (pl.contrato && pl.contrato.id && !(r.contrato && r.contrato.id === pl.contrato.id)) return;
    let A; try { A = analyze(normalize(clone(r))); } catch (e) { return; }
    A.all.forEach(x => { const k = `${r.id}|${x.sec}|${x.t}`; if (!ya.has(k)) out.push({k, r, x}); });
  });
  return out.sort((a, b) => (a.r.rp.fecha || '').localeCompare(b.r.rp.fecha || ''));
}
async function traerDefs() {
  const ds = defsVisitas(PL);
  if (!ds.length) { toast('No hay deficiencias nuevas en las visitas de este año.'); return; }
  const r = await ask({title:'Deficiencias de las visitas', yes:'Traer las marcadas', body:`<p class="help">Entran como filas blancas («Deficiencia en visita»). Después completa la prioridad, el plazo y el responsable.</p>
    <div class="pl-defs">${ds.map((d, i) => `<label class="pl-def"><input type="checkbox" data-di="${i}"${d.x.mejora ? '' : ' checked'}><span><b>${esc(d.x.sec)}${d.x.mejora ? ' · oportunidad de mejora' : ''}</b>${esc(d.x.t)}${d.x.obs ? `<i>${esc(d.x.obs)}</i>` : ''}<small>${esc(fmtDate(d.r.rp.fecha))} · ${esc((d.r.rp.ubicacion || '').trim() || 'Visita')}${d.r.codigo ? ' · ' + esc(d.r.codigo) : ''}</small></span></label>`).join('')}</div>`});
  if (r !== true) return;
  const marc = [...document.querySelectorAll('#m-body [data-di]')].filter(c => c.checked).map(c => ds[+c.dataset.di]);
  if (!marc.length) return;
  marc.forEach(({k, r: v, x}) => PL.filas.push({id:nid('f'), cat:'def', tipo:x.mejora ? 'om' : '', riesgo:x.sec, prio:'', medida:x.obs || ('Subsanar: ' + x.t), fdet:(v.rp.fecha || '').slice(0, 7), plazo:'', fapl:'', coste:'', resp:'', reg:['Visita a tajo', v.codigo, fmtDate(v.rp.fecha)].filter(Boolean).join(' · '), obs:[x.obs ? x.t : '', (v.rp.ubicacion || '').trim()].filter(Boolean).join(' · '), origen:{v:v.id, k}, creado:Date.now()}));
  await guardarYa(); renderEd(); toast(`Añadidas ${plural(marc.length, 'deficiencia', 'deficiencias')}.`);
}

/* ---------- pantallas ---------- */
function vista(q) {
  ['#pl-lista', '#pl-ed', '#pl-fila'].forEach(s => { const e = $(s); if (e) e.hidden = s !== q; });
  const b = $('#pl-bar'); if (b) b.hidden = q !== '#pl-ed' || $('#view-plan').hidden;
  window.scrollTo({top:0});
}
function renderLista() {
  const L = $('#pl-lista'); if (!L) return;
  const a = actId();
  const orden = a ? [...PLANES.filter(x => x.contrato && x.contrato.id === a), ...PLANES.filter(x => !(x.contrato && x.contrato.id === a))] : PLANES;
  const cards = orden.map(x => { const s = resumen(x); return `<article class="hcard pl-card">
      <div class="hrow"><b>${esc(titPlan(x))}</b>${s.bad ? `<span class="pill bad">${plural(s.bad, 'vencida', 'vencidas')}</span>` : ''}</div>
      ${x.contrato && x.contrato.id ? `<p class="help hctr-t">${esc(nombreContrato(x.contrato))}</p>` : ''}
      <p class="help">${s.n ? `${plural(s.n, 'medida', 'medidas')} · ${s.ok} ${s.ok === 1 ? 'aplicada' : 'aplicadas'} · ${s.pend} ${s.pend === 1 ? 'pendiente' : 'pendientes'}` : 'En blanco'}</p>
      <div class="hbtns"><button type="button" class="mini" data-pa="open" data-id="${esc(x.id)}">Abrir</button><button type="button" class="mini" data-pa="xlsx" data-id="${esc(x.id)}">Excel</button><button type="button" class="mini del" data-pa="del" data-id="${esc(x.id)}">Eliminar</button></div>
    </article>`; }).join('');
  L.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-pa="ini">‹ Inicio</button></div>
    <div class="hhead"><div class="hhead-t"><h2>Planificación preventiva</h2><button type="button" class="mini" data-pa="new">+ Nueva</button></div></div>
    ${cards ? `<div class="hlist">${cards}</div>` : `<div class="empty"><b>Aún no hay planificaciones</b><span>Crea la del año para el contrato activo. Empieza en blanco y vas añadiendo medidas; al final sale el Excel con el formato de Innovia.</span></div>`}
    <section class="pl-imp" aria-labelledby="pl-imp-t">
      <div class="pl-imp-tx"><b id="pl-imp-t">¿Ya tienes planificaciones hechas?</b><span>Impórtalas desde su Excel (.xlsx). Cada medida entra con su origen según el color de la fila, con sus fechas, plazos y responsables.</span></div>
      <button type="button" class="btn" data-pa="imp">Importar Excel</button>
    </section>`;
}
function leyendaHtml(fs) {
  const n = k => fs.filter(f => f.cat === k).length;
  return `<div class="pl-ley" role="group" aria-label="Filtrar por origen">
    <button type="button" class="pl-lc${filtro ? '' : ' on'}" data-pf=""><span class="pl-sw all"></span><b>Todas</b><i>${fs.length}</i></button>
    ${CATS.map(c => `<button type="button" class="pl-lc${filtro === c.k ? ' on' : ''}" data-pf="${c.k}"><span class="pl-sw" style="background:${c.c}"></span><b>${esc(c.t)}</b><i>${n(c.k)}</i></button>`).join('')}
  </div>`;
}
function filaHtml(f) {
  const c = CAT[f.cat], e = estado(f), tp = TIPOS.find(t => t[0] === f.tipo);
  return `<article class="pl-row cat-${f.cat} st-${e.k}" style="--cc:${c.c}">
    <button type="button" class="pl-open" data-fila="${esc(f.id)}">
      <span class="pl-rh"><span class="pl-cat">${esc(c.t)}${tp ? ' · ' + esc(tp[1]) : ''}</span>${f.prio ? `<span class="pl-p p${esc(f.prio)}">P${esc(f.prio)}</span>` : ''}</span>
      <b>${esc(f.riesgo || 'Sin riesgo / aspecto')}</b>
      <span class="pl-med">${esc(f.medida || 'Sin medida correctora')}</span>
      <span class="pl-meta">${[f.resp, f.plazo, f.fdet && 'Detectada ' + mesTxt(f.fdet).toLowerCase()].filter(Boolean).map(esc).join(' · ')}</span>
    </button>
    <div class="pl-acts"><span class="pl-st ${e.k}">${esc(e.t)}</span>${e.k === 'ok'
      ? `<button type="button" class="pl-undo" data-undo="${esc(f.id)}">Deshacer</button>`
      : `<button type="button" class="pl-apl" data-apl="${esc(f.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Aplicada</button>`}</div>
  </article>`;
}
/* lista: vencidas arriba, luego pendientes (por fecha de vencimiento) y al final las aplicadas */
const PESO = {bad:0, pend:1, ok:2};
function ordenEstado(fs) {
  return fs.map(f => ({f, e:estado(f), v:vence(f) || '9999'})).sort((a, b) => (PESO[a.e.k] - PESO[b.e.k])
    || (a.e.k === 'ok' ? (b.f.fapl || '').localeCompare(a.f.fapl || '') : a.v.localeCompare(b.v))
    || (CAT[a.f.cat].i - CAT[b.f.cat].i));
}
function listaHtml(fs) {
  const xs = ordenEstado(fs), grupos = [['bad', 'Vencidas'], ['pend', 'Pendientes'], ['ok', 'Aplicadas']];
  return grupos.map(([k, t]) => { const g = xs.filter(x => x.e.k === k); return g.length ? `<h3 class="pl-gh g-${k}"><span>${t}</span><i>${g.length}</i></h3>${g.map(x => filaHtml(x.f)).join('')}` : ''; }).join('');
}
/* por meses: lo que vence cada mes del año */
const MES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function mesesHtml(fs) {
  const y = String(PL.anio), hoyYM = hoyISO().slice(0, 7);
  const cubo = {}, antes = [], despues = [], sin = [];
  ordenEstado(fs).forEach(x => { const v = vence(x.f); if (!v) sin.push(x); else if (v.slice(0, 4) < y) antes.push(x); else if (v.slice(0, 4) > y) despues.push(x); else (cubo[v.slice(0, 7)] = cubo[v.slice(0, 7)] || []).push(x); });
  const yms = MES3.map((_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const est = xs => !xs || !xs.length ? 'vacio' : xs.some(x => x.e.k === 'bad') ? 'bad' : xs.some(x => x.e.k === 'pend') ? 'pend' : 'ok';
  const tira = `<div class="pl-tira" role="group" aria-label="Meses de ${y}">${yms.map((ym, i) => { const xs = cubo[ym] || []; return `<button type="button" class="pl-mc m-${est(xs)}${ym === hoyYM ? ' hoy' : ''}" data-mes="${ym}"><span>${MES3[i]}</span><b>${xs.length || ''}</b></button>`; }).join('')}</div>
    <p class="pl-tley"><i class="m-bad"></i>Con vencidas <i class="m-pend"></i>Pendientes <i class="m-ok"></i>Todo aplicado</p>`;
  const sec = (id, tit, xs, hoy) => {
    const nb = xs.filter(x => x.e.k === 'bad').length, np = xs.filter(x => x.e.k === 'pend').length;
    const res = xs.length ? [plural(xs.length, 'medida', 'medidas'), nb && plural(nb, 'vencida', 'vencidas'), np && plural(np, 'pendiente', 'pendientes')].filter(Boolean).join(' · ') : 'Nada vence este mes';
    return `<section class="pl-mes${xs.length ? '' : ' vacio'}${hoy ? ' hoy' : ''}" id="${id}"><h3 class="pl-mh"><span>${esc(tit)}${hoy ? ' <em>Este mes</em>' : ''}</span><i>${res}</i></h3>${xs.map(x => filaHtml(x.f)).join('')}</section>`;
  };
  return tira
    + (antes.length ? sec('pl-m-antes', `Antes de ${y}`, antes) : '')
    + yms.map((ym, i) => sec('pl-m-' + ym, `${MESES[i]} ${y}`, cubo[ym] || [], ym === hoyYM)).join('')
    + (despues.length ? sec('pl-m-despues', `Después de ${y}`, despues) : '')
    + (sin.length ? sec('pl-m-sin', 'Sin fecha de vencimiento', sin) : '')
    + (sin.length ? '<p class="help">Para que una medida salga en su mes, pon la fecha de detección y un plazo como «3 MESES», «MENSUAL» o «ANUAL».</p>' : '');
}
let modo = lsGet('pl-modo') === 'meses' ? 'meses' : 'lista';
function renderEd() {
  const E = $('#pl-ed'); if (!E || !PL) return;
  PL.filas = PL.filas.filter(f => !vacia(f) || (FILA && f.id === FILA));
  const fs = PL.filas, s = resumen(PL), ds = defsVisitas(PL);
  const vis = fs.filter(f => !vacia(f) && (!filtro || f.cat === filtro));
  E.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-pa="back">‹ Planificaciones</button><span class="copia-est ok pl-est">Guardado</span></div>
    <section class="pl-hero">
      <p class="pl-eb">Tabla de seguimiento de medidas correctoras</p>
      <h2>${esc(titPlan(PL))}</h2>
      ${PL.contrato && PL.contrato.id ? `<p class="pl-ctr">${esc(nombreContrato(PL.contrato))}</p>` : ''}
      <div class="pl-kpis"><div><b>${s.n}</b><span>Medidas</span></div><div><b>${s.pend}</b><span>Pendientes</span></div><div class="${s.bad ? 'bad' : ''}"><b>${s.bad}</b><span>Vencidas</span></div><div class="ok"><b>${s.ok}</b><span>Aplicadas</span></div></div>
    </section>
    ${ds.length ? `<button type="button" class="pl-traer" data-pa="defs"><span><b>${plural(ds.length, 'deficiencia', 'deficiencias')} en tus visitas de ${PL.anio}</b><small>Tráelas a la tabla como filas blancas</small></span><i>Revisar</i></button>` : ''}
    <h3 class="ini-sec">Origen</h3>
    ${leyendaHtml(fs.filter(f => !vacia(f)))}
    <div class="pl-modo" role="group" aria-label="Cómo ver las medidas"><button type="button" data-modo="lista" aria-pressed="${modo === 'lista'}">Lista</button><button type="button" data-modo="meses" aria-pressed="${modo === 'meses'}">Por meses</button></div>
    <div class="pl-list">${vis.length ? (modo === 'meses' ? mesesHtml(vis) : listaHtml(vis)) : `<div class="empty"><b>${filtro ? 'Nada con este origen' : 'Planificación en blanco'}</b><span>${filtro ? 'Pulsa «Todas» para ver el resto.' : 'Pulsa «Añadir medida» y elige de dónde viene: actividad periódica, visita del Responsable SPP/MA, auditoría o deficiencia de una visita.'}</span></div>`}</div>`;
  pintaEstado('Guardado'); vista('#pl-ed');
  if (modo === 'meses' && irMesHoy) { irMesHoy = false; const h = document.querySelector('.pl-mes.hoy'); if (h) setTimeout(() => h.scrollIntoView({block:'start'}), 30); }
}
let irMesHoy = false;
function chipsHtml(name, opts, val) {
  return `<div class="chips pl-chips">${opts.map(([v, t]) => `<button type="button" class="chip" data-ch="${name}" data-v="${esc(v)}" aria-pressed="${val === v}">${esc(t)}</button>`).join('')}</div>`;
}
function renderFila() {
  const F = $('#pl-fila'), f = PL && PL.filas.find(x => x.id === FILA); if (!F || !f) return;
  const c = CAT[f.cat], conTipo = f.cat === 'spp' || f.cat === 'aud';
  const dl = (id, arr) => `<datalist id="${id}">${arr.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
  const fld = (k, l, extra = '', span = true) => `<div class="field${span ? ' span2' : ''}"><label for="pf-${k}">${l}</label><input id="pf-${k}" data-pk="${k}" value="${esc(f[k] || '')}" ${extra}></div>`;
  F.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-pa="fback">‹ ${esc(titPlan(PL))}</button><span class="copia-est ok pl-est">Guardado</span></div>
    <section class="block pl-form" style="--cc:${c.c}">
      <header class="bh"><h2>Medida correctora</h2></header>
      <div class="bb">
        <div class="field"><span class="lbl">¿De dónde viene?</span>
          <div class="pl-orig">${CATS.map(x => `<label class="pl-o${x.k === f.cat ? ' on' : ''}"><input type="radio" name="pl-cat" value="${x.k}"${x.k === f.cat ? ' checked' : ''}><span class="pl-sw" style="background:${x.c}"></span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span></label>`).join('')}</div>
        </div>
        ${conTipo ? `<div class="field"><span class="lbl">Tipo</span>${chipsHtml('tipo', TIPOS.map(t => [t[0], t[1]]), f.tipo)}</div>` : ''}
        <div class="field"><label for="pf-riesgo">Riesgo / aspecto deficiente</label><input id="pf-riesgo" data-pk="riesgo" list="pl-dl-r" value="${esc(f.riesgo || '')}" placeholder="Ej.: Seguridad, Vigilancia de la Salud, Legionella…">${dl('pl-dl-r', SUG.riesgo)}</div>
        <div class="field"><span class="lbl">Prioridad</span>${chipsHtml('prio', PRIO.map(([v, t]) => [v, v + ' · ' + t]), f.prio)}</div>
        <div class="field"><label for="pf-medida">Medidas correctoras y/o soluciones propuestas</label><textarea id="pf-medida" data-pk="medida" rows="3">${esc(f.medida || '')}</textarea></div>
        <div class="bb-in g2">
          <div class="field"><label for="pf-fdet">Fecha de detección</label><input id="pf-fdet" data-pk="fdet" type="month" value="${esc(f.fdet || '')}"></div>
          <div class="field"><div class="lblrow"><label for="pf-fapl">Fecha de aplicación</label><button type="button" class="linkmini" data-pa="hoy">Hoy</button></div><input id="pf-fapl" data-pk="fapl" type="date" value="${esc(f.fapl || '')}"></div>
        </div>
        <div class="field"><label for="pf-plazo">Tiempo máximo de resolución</label><input id="pf-plazo" data-pk="plazo" value="${esc(f.plazo || '')}" placeholder="Ej.: 3 MESES">
          <div class="chips pl-chips sm">${PLAZOS.map(p => `<button type="button" class="chip" data-plazo="${esc(p)}" aria-pressed="${(f.plazo || '').toUpperCase() === p}">${esc(p)}</button>`).join('')}</div>
          <p class="help pl-vence">${esc(estado(f).t)}</p></div>
        <div class="bb-in g2">
          ${fld('coste', 'Presupuesto / coste', 'placeholder="0 EUROS"', false)}
          <div class="field"><label for="pf-resp">Persona responsable</label><input id="pf-resp" data-pk="resp" list="pl-dl-h" value="${esc(f.resp || '')}" placeholder="TSPRL">${dl('pl-dl-h', SUG.resp)}</div>
        </div>
        <div class="field"><label for="pf-reg">Registro (evidencias)</label><input id="pf-reg" data-pk="reg" list="pl-dl-i" value="${esc(f.reg || '')}" placeholder="Ej.: DropBox">${dl('pl-dl-i', SUG.reg)}</div>
        <div class="field"><label for="pf-obs">Observaciones</label><textarea id="pf-obs" data-pk="obs" rows="2">${esc(f.obs || '')}</textarea></div>
        <div class="pl-fbtns"><button type="button" class="btn primary" data-pa="fok">Listo</button><button type="button" class="btn ghost danger-t" data-pa="fdel">Eliminar medida</button></div>
      </div>
    </section>`;
  vista('#pl-fila');
}
function pintaVence() { const f = PL.filas.find(x => x.id === FILA), e = $('.pl-vence'); if (f && e) e.textContent = estado(f).t; }

/* ---------- acciones ---------- */
async function nuevaPlan() {
  const ctr = snapContrato(), anio = new Date().getFullYear();
  const ya = PLANES.find(x => x.anio === anio && ((x.contrato && x.contrato.id) || null) === (ctr ? ctr.id : null));
  if (ya) { toast(`Ya tienes la planificación ${anio}${ctr ? ' de este contrato' : ''}.`); return abrir(ya.id); }
  const pl = {id:nid('p'), creado:Date.now(), guardado:Date.now(), anio, contrato:ctr, filas:[]};
  const prev = PLANES.filter(x => ((x.contrato && x.contrato.id) || null) === (ctr ? ctr.id : null) && x.anio < anio).sort((a, b) => b.anio - a.anio)[0];
  const per = prev ? prev.filas.filter(f => (f.cat === 'prl' || f.cat === 'ma') && !vacia(f)) : [];
  if (per.length) {
    const r = await ask({title:'Nueva planificación', yes:'Copiar las periódicas', no:'Empezar en blanco', body:`<p>La planificación ${prev.anio} tiene ${plural(per.length, 'actividad periódica', 'actividades periódicas')} (naranja y verde).</p><p>¿Las copio para ${anio}? Se ponen en los mismos meses y sin fecha de aplicación.</p>`});
    if (r === null) return;
    if (r === true) per.forEach(f => pl.filas.push({...JSON.parse(JSON.stringify(f)), id:nid('f'), fdet:f.fdet ? anio + f.fdet.slice(4) : '', fapl:'', obs:'', origen:null, creado:Date.now()}));
  }
  PL = pl; filtro = ''; await guardarYa(); renderEd(); refrescaIni();
}
function abrir(id) { const x = PLANES.find(z => z.id === id); if (!x) return; PL = JSON.parse(JSON.stringify(x)); filtro = ''; FILA = null; irMesHoy = modo === 'meses'; renderEd(); }
function volverLista() { guardarYa(); PL = null; FILA = null; renderLista(); vista('#pl-lista'); refrescaIni(); }
function nuevaFila() {
  const f = {id:nid('f'), cat:filtro || '', tipo:'', riesgo:'', prio:'', medida:'', fdet:hoyISO().slice(0, 7), plazo:'', fapl:'', coste:'', resp:'', reg:'', obs:'', origen:null, creado:Date.now()};
  return elegirOrigen(f);
}
async function elegirOrigen(f) {
  if (!f.cat) {
    const r = await ask({title:'¿De dónde viene la medida?', yes:'Continuar', body:`<p class="help">Elige el origen: marca el color de la fila en el Excel, como en la leyenda.</p><div class="pl-orig">${CATS.map((x, i) => `<label class="pl-o"><input type="radio" name="pl-ncat" value="${x.k}"${i === 0 ? ' checked' : ''}><span class="pl-sw" style="background:${x.c}"></span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span></label>`).join('')}</div>`});
    if (r !== true) return;
    const el = document.querySelector('input[name="pl-ncat"]:checked'); f.cat = el ? el.value : 'prl';
  }
  PL.filas.push(f); FILA = f.id; renderFila(); setTimeout(() => { const i = $('#pf-riesgo'); if (i) i.focus(); }, 80);
}
function cerrarFila() {
  const f = PL.filas.find(x => x.id === FILA);
  if (f && vacia(f)) PL.filas = PL.filas.filter(x => x.id !== FILA);
  FILA = null; guardarYa(); renderEd(); refrescaIni();
}
async function onClick(e) {
  const ap = e.target.closest('[data-apl],[data-undo]');
  if (ap) {
    const id = ap.dataset.apl || ap.dataset.undo, f = PL && PL.filas.find(x => x.id === id); if (!f) return;
    const y = window.scrollY;
    f.fapl = ap.dataset.apl ? hoyISO() : '';
    await guardarYa(); renderEd(); window.scrollTo({top:y}); refrescaIni();
    toast(ap.dataset.apl ? 'Medida aplicada hoy.' : 'Vuelve a estar pendiente.');
    return;
  }
  const md = e.target.closest('[data-modo]'); if (md) { modo = md.dataset.modo; lsSet('pl-modo', modo); irMesHoy = modo === 'meses'; renderEd(); return; }
  const mc = e.target.closest('[data-mes]'); if (mc) { const s2 = document.getElementById('pl-m-' + mc.dataset.mes); if (s2) s2.scrollIntoView({behavior:reduced() ? 'auto' : 'smooth', block:'start'}); return; }
  const fb = e.target.closest('[data-fila]'); if (fb) { FILA = fb.dataset.fila; renderFila(); return; }
  const lc = e.target.closest('[data-pf]'); if (lc) { filtro = lc.dataset.pf; renderEd(); return; }
  const ch = e.target.closest('[data-ch]');
  if (ch) { const f = PL.filas.find(x => x.id === FILA); if (!f) return; const k = ch.dataset.ch; f[k] = f[k] === ch.dataset.v ? '' : ch.dataset.v; ch.parentNode.querySelectorAll('[data-ch]').forEach(b => b.setAttribute('aria-pressed', f[k] === b.dataset.v)); guardarPronto(); return; }
  const pz = e.target.closest('[data-plazo]');
  if (pz) { const f = PL.filas.find(x => x.id === FILA); if (!f) return; f.plazo = pz.dataset.plazo; $('#pf-plazo').value = f.plazo; pz.parentNode.querySelectorAll('[data-plazo]').forEach(b => b.setAttribute('aria-pressed', b === pz)); pintaVence(); guardarPronto(); return; }
  const b = e.target.closest('[data-pa]'); if (!b) return;
  const a = b.dataset.pa, id = b.dataset.id;
  if (a === 'ini') { showTab('ini'); return; }
  if (a === 'new') return nuevaPlan();
  if (a === 'imp') { const fi = $('#pl-file'); if (fi) fi.click(); return; }
  if (a === 'open') return abrir(id);
  if (a === 'back') return volverLista();
  if (a === 'defs') return traerDefs();
  if (a === 'fback' || a === 'fok') return cerrarFila();
  if (a === 'hoy') { const f = PL.filas.find(x => x.id === FILA); if (!f) return; f.fapl = hoyISO(); $('#pf-fapl').value = f.fapl; pintaVence(); guardarPronto(); return; }
  if (a === 'fdel') {
    const f = PL.filas.find(x => x.id === FILA);
    if (f && !vacia(f) && !(await ask({title:'¿Eliminar la medida?', body:`<p>${esc(f.riesgo || f.medida)}</p>`, yes:'Eliminar', danger:true}))) return;
    PL.filas = PL.filas.filter(x => x.id !== FILA); FILA = null; await guardarYa(); renderEd(); return;
  }
  if (a === 'xlsx') { const x = PLANES.find(z => z.id === id); if (x) await exportar(x); return; }
  if (a === 'del') {
    const x = PLANES.find(z => z.id === id); if (!x) return;
    if (!(await ask({title:'¿Eliminar la planificación?', body:`<p>${esc(titPlan(x))}${x.contrato ? ' · ' + esc(nombreContrato(x.contrato)) : ''}. Las visitas no se tocan.</p>`, yes:'Eliminar', danger:true}))) return;
    await pdb.del(x.id); await cargar(); toast('Planificación eliminada.'); return;
  }
}
function onInput(e) {
  const t = e.target, k = t.dataset.pk; if (!k || !PL) return;
  const f = PL.filas.find(x => x.id === FILA); if (!f) return;
  f[k] = t.value;
  if (k === 'plazo') document.querySelectorAll('[data-plazo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.plazo === t.value.toUpperCase()));
  if (k === 'plazo' || k === 'fdet' || k === 'fapl') pintaVence();
  guardarPronto();
}
function onChange(e) {
  const t = e.target;
  if (t.id === 'pl-file') { const fs = [...(t.files || [])]; t.value = ''; if (fs.length) importarExcel(fs); return; }
  if (t.name === 'pl-cat') { const f = PL.filas.find(x => x.id === FILA); if (!f) return; f.cat = t.value; if (f.cat !== 'spp' && f.cat !== 'aud') f.tipo = ''; guardarPronto(); renderFila(); }
}

/* ---------- Excel con el formato de Innovia ---------- */
const COLW = [77.29, 24.14, 156.29, 23.43, 20.86, 20.57, 18.57, 22.43, 37.86, 128.86];
const LET = 'ABCDEFGHIJ';
function altoFila(vals) {
  let L = 1;
  vals.forEach((v, i) => { const n = String(v || '').split('\n').reduce((s, p) => s + Math.max(1, Math.ceil(p.length * 1.08 / COLW[i])), 0); L = Math.max(L, n); });
  return Math.max(31.5, Math.round((L * 12.75 + 8) * 4) / 4);
}
function celdasFila(f) {
  const tp = TIPOS.find(t => t[0] === f.tipo);
  let A = (f.riesgo || '').trim();
  if (tp && (f.cat === 'spp' || f.cat === 'aud' || f.tipo === 'om') && !/\((obs|n\.?\s?c|o\.?\s?m)/i.test(A)) A = (A ? A + ' ' : '') + `(${tp[2]})`;
  return [A, f.prio ? +f.prio : '', f.medida || '', mesTxt(f.fdet), f.plazo || '', f.fapl ? fmtDate(f.fapl) : '', f.coste || '', f.resp || '', f.reg || '', f.obs || ''];
}
async function generarXlsx(pl) {
  if (typeof JSZip === 'undefined') throw new Error('Falta JSZip');
  const zip = await JSZip.loadAsync(PLAN_TPL, {base64:true});
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const sx = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const doc = new DOMParser().parseFromString(sx, 'application/xml');
  const el = (tag, at = {}) => { const n = doc.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
  const sd = doc.getElementsByTagNameNS(NS, 'sheetData')[0];
  const rows = [...sd.getElementsByTagNameNS(NS, 'row')];
  const byR = r => rows.find(x => x.getAttribute('r') === String(r));
  const proto = {}; CATS.forEach((c, i) => { proto[c.k] = [...byR(4 + i).getElementsByTagNameNS(NS, 'c')].map(x => x.getAttribute('s')); });
  const ley = [10, 11, 12, 13, 14, 15].map(r => byR(r).cloneNode(true));
  rows.forEach(x => { if (+x.getAttribute('r') >= 4) sd.removeChild(x); });
  /* título */
  const a2 = [...byR(2).getElementsByTagNameNS(NS, 'c')].find(x => x.getAttribute('r') === 'A2');
  const ponTexto = (c, txt) => { while (c.firstChild) c.removeChild(c.firstChild); c.setAttribute('t', 'inlineStr'); const is = el('is'), t = el('t'); t.setAttribute('xml:space', 'preserve'); t.textContent = txt; is.appendChild(t); c.appendChild(is); };
  ponTexto(a2, `TABLA SEGUIMIENTO DE MEDIDAS CORRECTORAS (planificación preventiva O/S/M) PRL (${pl.anio})`);
  /* filas */
  let r = 4;
  const filas = ordenFilas(pl.filas.filter(f => !vacia(f)));
  const datos = filas.length ? filas.map(f => [f.cat, celdasFila(f)]) : Array.from({length:5}, () => ['def', Array(10).fill('')]);
  datos.forEach(([cat, vals]) => {
    const row = el('row', {r:String(r), ht:String(altoFila(vals)), customHeight:'1'});
    vals.forEach((v, i) => {
      const c = el('c', {r:LET[i] + r, s:proto[cat][i]});
      if (typeof v === 'number') { c.setAttribute('t', 'n'); const vv = el('v'); vv.textContent = String(v); c.appendChild(vv); }
      else if (v !== '') ponTexto(c, String(v));
      row.appendChild(c);
    });
    sd.appendChild(row); r++;
  });
  /* leyenda debajo */
  const r0 = r + 2;
  ley.forEach((row, i) => {
    const nr = r0 + i; row.setAttribute('r', String(nr));
    [...row.getElementsByTagNameNS(NS, 'c')].forEach(c => c.setAttribute('r', c.getAttribute('r').replace(/\d+$/, String(nr))));
    sd.appendChild(row);
  });
  const mc = doc.getElementsByTagNameNS(NS, 'mergeCells')[0];
  while (mc.firstChild) mc.removeChild(mc.firstChild);
  ['A2:J2', `A${r0}:E${r0}`, ...[1, 2, 3, 4, 5].map(i => `B${r0 + i}:E${r0 + i}`)].forEach(ref => mc.appendChild(el('mergeCell', {ref})));
  mc.setAttribute('count', '7');
  const dim = doc.getElementsByTagNameNS(NS, 'dimension')[0]; if (dim) dim.setAttribute('ref', `A1:J${r0 + 5}`);
  let out = new XMLSerializer().serializeToString(doc);
  if (!/^<\?xml/.test(out)) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + out;
  zip.file('xl/worksheets/sheet1.xml', out);
  /* nombre de la hoja */
  const corto = pl.contrato ? (pl.contrato.nombre || ('SIE ' + pl.contrato.sie)) : 'Planificación';
  const hoja = `${corto} ${pl.anio}`.replace(/[\\\/\?\*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31).replace(/'/g, '');
  let wb = await zip.file('xl/workbook.xml').async('string');
  wb = wb.replace(/(<sheet [^>]*name=")[^"]*(")/, `$1${hoja.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}$2`);
  zip.file('xl/workbook.xml', wb);
  return zip.generateAsync({type:'blob', mimeType:XLSX, compression:'DEFLATE'});
}
async function exportar(pl) {
  if (PL && pl.id === PL.id) await guardarYa();
  toast('Generando el Excel…');
  try {
    const blob = await generarXlsx(pl);
    const c = pl.contrato;
    const base = [c && c.sie, c && (c.nombre || '').toUpperCase()].filter(Boolean).join(' - ') || 'Planificación preventiva';
    const nombre = `${base} ${pl.anio}.xlsx`.replace(/[\\\/\?\*:|"<>]/g, ' ').replace(/\s+/g, ' ');
    const s = resumen(pl);
    const msg = `Planificación preventiva ${pl.anio}${c ? ' · ' + nombreContrato(c) : ''}.\n${plural(s.n, 'medida', 'medidas')}: ${s.ok} ${s.ok === 1 ? 'aplicada' : 'aplicadas'}, ${s.pend} ${s.pend === 1 ? 'pendiente' : 'pendientes'}${s.bad ? ` y ${s.bad} ${s.bad === 1 ? 'vencida' : 'vencidas'}` : ''}.`;
    await entregar(blob, nombre, 'Planificación preventiva', msg);
  } catch (e) { console.error(e); toast('No se pudo generar el Excel.'); }
}

/* ---------- importar planificaciones ya hechas (Excel de Innovia u otro con las mismas columnas) ---------- */
const XNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const nrm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const COLS = [['fdet', /deteccion/], ['fapl', /aplicacion|ejecucion/], ['plazo', /tiempo|plazo/], ['prio', /prioridad/], ['coste', /presupuesto|coste|costo/],
  ['resp', /responsable/], ['reg', /registro|evidencia/], ['obs', /observacion/], ['riesgo', /riesgo|aspecto/], ['medida', /medida|solucion/]];
/* paleta antigua de Excel (colores «indexed») */
const PAL = '000000FFFFFFFF000000FF000000FFFFFF00FF00FF00FFFF000000FFFFFFFF000000FF000000FFFFFF00FF00FF00FFFF800000008000000080808000800080008080C0C0C08080809999FF993366FFFFCCCCFFFF660066FF80800066CCCCCCFF000080FF00FFFFFF0000FFFF8000808000000080800000FF00CCFFCCFFFFCCFFCCFFFF9999CCFFFF99CCCC99FFFFCC993366FF33CCCC99CC00FFCC00FF9900FF6600666699969696003366339966003300333300993300993366333399333333';
function tintar(hex, t) {
  if (!t) return hex;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; }
  l = t < 0 ? l * (1 + t) : l * (1 - t) + t;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = x => { if (x < 0) x += 1; if (x > 1) x -= 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  return (s ? [f(h + 1 / 3), f(h), f(h - 1 / 3)] : [l, l, l]).map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const rgbDe = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
const dist = (a, b) => { const x = rgbDe(a), y = rgbDe(b); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
const MESN = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad2 = n => String(n).padStart(2, '0');
const anio4 = y => { y = +y; return y < 100 ? 2000 + y : y; };
function serialISO(n, d1904) { if (!(n > 59 && n < 2958465)) return ''; return new Date(Math.round((n + (d1904 ? 1462 : 0) - 25569) * 864e5)).toISOString().slice(0, 10); }
/* fecha de detección → AAAA-MM */
function aMes(v, d1904) {
  if (typeof v === 'number') return v < 3000 ? '' : serialISO(v, d1904).slice(0, 7);
  const t = nrm(v); if (!t) return '';
  let m = /^(20\d\d)[-\/.](\d{1,2})/.exec(t); if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad2(m[2])}`;
  m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(t); if (m && +m[2] >= 1 && +m[2] <= 12) return `${anio4(m[3])}-${pad2(m[2])}`;
  m = /^(\d{1,2})[-\/.](\d{4}|\d{2})$/.exec(t); if (m && +m[1] >= 1 && +m[1] <= 12) return `${anio4(m[2])}-${pad2(m[1])}`;
  m = /([a-z]{3,})[a-z]*\.?[\s\-\/.de]*('?\d{2,4})/.exec(t);
  if (m) { const i = MESN.indexOf(m[1].slice(0, 3) === 'set' ? 'sep' : m[1].slice(0, 3)); if (i >= 0) return `${anio4(m[2].replace("'", ''))}-${pad2(i + 1)}`; }
  return '';
}
/* fecha de aplicación → AAAA-MM-DD */
function aDia(v, d1904) {
  if (typeof v === 'number') return v < 3000 ? '' : serialISO(v, d1904);
  const t = nrm(v); if (!t) return '';
  let m = /^(20\d\d)-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(t); if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${anio4(m[3])}-${pad2(m[2])}-${pad2(m[1])}`;
  const ym = aMes(t); return ym ? ym + '-01' : '';
}
function aPrio(v) {
  const t = nrm(v); if (!t) return '';
  if (/^1\b|alta/.test(t)) return '1'; if (/^2\b|media/.test(t)) return '2'; if (/^3\b|baja/.test(t)) return '3';
  return '';
}
function catLeyenda(t) {
  if (/auditor/.test(t)) return 'aud';
  if (/spp/.test(t)) return 'spp';
  if (/periodic/.test(t)) return /seguridad|prl/.test(t) ? 'prl' : 'ma';
  if (/deficiencia|visita/.test(t)) return 'def';
  return '';
}
function tipoDe(riesgo) {
  const pats = [['obs', /\s*\((observaci[oó]n|obs\.?)\)\s*/i], ['nc', /\s*\((n\.?\s?c\.?|no conformidad)\)\s*/i], ['om', /\s*\((o\.?\s?m\.?|oportunidad de mejora)\)\s*/i]];
  for (const [k, re] of pats) if (re.test(riesgo)) return {tipo:k, riesgo:riesgo.replace(re, ' ').replace(/\s+/g, ' ').trim()};
  return {tipo:'', riesgo};
}
const strX = v => typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v == null ? '' : v).trim();
async function leerExcel(file) {
  const cab = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (cab[0] === 0xD0 && cab[1] === 0xCF) return {error:'xls'};
  if (!(cab[0] === 0x50 && cab[1] === 0x4B)) return {error:'formato'};
  let zip; try { zip = await JSZip.loadAsync(file); } catch (e) { return {error:'formato'}; }
  const P = new DOMParser(), xml = async p => { const f = zip.file(p); return f ? P.parseFromString(await f.async('string'), 'application/xml') : null; };
  const by = (n, tag) => n ? [...n.getElementsByTagNameNS(XNS, tag)] : [];
  const wb = await xml('xl/workbook.xml'); if (!wb) return {error:'formato'};
  const pr = by(wb, 'workbookPr')[0], d1904 = !!pr && /^(1|true)$/.test(pr.getAttribute('date1904') || '');
  const txtDe = n => { let s = ''; if (n) for (const ch of n.childNodes) { if (ch.localName === 't') s += ch.textContent; else if (ch.localName === 'r') { const t = by(ch, 't')[0]; if (t) s += t.textContent; } } return s; };
  const sst = by(await xml('xl/sharedStrings.xml'), 'si').map(txtDe);
  /* colores del tema */
  const th = await xml('xl/theme/theme1.xml'), tema = [];
  if (th) { const cs = th.getElementsByTagNameNS('*', 'clrScheme')[0]; if (cs) { const v = [...cs.children].map(c => { const x = c.firstElementChild; return x ? (x.getAttribute('lastClr') || x.getAttribute('val') || '') : ''; }); tema.push(v[1], v[0], v[3], v[2], ...v.slice(4)); } }
  const st = await xml('xl/styles.xml');
  const idxCol = by(by(st, 'indexedColors')[0], 'rgbColor').map(c => (c.getAttribute('rgb') || '').slice(-6));
  const color = c => {
    if (!c) return null;
    if (c.getAttribute('rgb')) return c.getAttribute('rgb').slice(-6).toUpperCase();
    if (c.getAttribute('theme') != null) { const b = tema[+c.getAttribute('theme')]; return b ? tintar(b.toUpperCase(), +(c.getAttribute('tint') || 0)) : null; }
    if (c.getAttribute('indexed') != null) { const i = +c.getAttribute('indexed'); return idxCol[i] ? idxCol[i].toUpperCase() : i < 64 ? PAL.slice((i % 64) * 6, (i % 64) * 6 + 6) : null; }
    return null;
  };
  const rellenos = by(by(st, 'fills')[0], 'fill').map(f => { const p = by(f, 'patternFill')[0]; if (!p || !p.getAttribute('patternType') || p.getAttribute('patternType') === 'none') return null; return color(by(p, 'fgColor')[0]) || color(by(p, 'bgColor')[0]); });
  const xfs = by(by(st, 'cellXfs')[0], 'xf').map(x => rellenos[+(x.getAttribute('fillId') || 0)] || null);
  /* hojas */
  const rels = await xml('xl/_rels/workbook.xml.rels'), dest = {};
  if (rels) [...rels.getElementsByTagNameNS('*', 'Relationship')].forEach(r => { dest[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const hojas = [];
  for (const sh of by(wb, 'sheet')) {
    if (sh.getAttribute('state') === 'hidden' || sh.getAttribute('state') === 'veryHidden') continue;
    const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sh.getAttribute('r:id');
    let tg = dest[rid] || ''; if (!tg) continue;
    tg = tg.startsWith('/') ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
    const doc = await xml(tg); if (!doc) continue;
    const filas = new Map();
    by(doc, 'c').forEach(c => {
      const m = /^([A-Z]+)(\d+)$/.exec(c.getAttribute('r') || ''); if (!m) return;
      const col = [...m[1]].reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1, r = +m[2], t = c.getAttribute('t'), vn = by(c, 'v')[0];
      let v = '';
      if (t === 's') v = vn ? (sst[+vn.textContent] || '') : '';
      else if (t === 'inlineStr') v = txtDe(by(c, 'is')[0]);
      else if (t === 'str' || t === 'e') v = vn ? vn.textContent : '';
      else if (t === 'b') v = vn ? (vn.textContent === '1' ? 'SÍ' : 'NO') : '';
      else if (vn && vn.textContent !== '') v = Number(vn.textContent);
      if (!filas.has(r)) filas.set(r, new Map());
      filas.get(r).set(col, {v, f:xfs[+(c.getAttribute('s') || 0)] || null});
    });
    const nums = [...filas.keys()].sort((a, b) => a - b);
    /* cabecera: la fila con más columnas reconocidas (al menos 4, y la de medidas) */
    let hr = 0, map = null;
    for (const r of nums.filter(n => n <= 40)) {
      const mm = {};
      filas.get(r).forEach((cel, col) => { const t = nrm(cel.v); if (!t || typeof cel.v === 'number') return; const k = COLS.find(([key, re]) => re.test(t) && mm[key] == null); if (k) mm[k[0]] = col; });
      if (mm.medida != null && Object.keys(mm).length >= 4 && (!map || Object.keys(mm).length > Object.keys(map).length)) { hr = r; map = mm; }
    }
    if (!map) continue;
    const titulo = nums.filter(n => n < hr).map(n => [...filas.get(n).values()].map(x => strX(x.v)).join(' ')).join(' ');
    /* leyenda: color → origen */
    const ley = {};
    let rl = 0, cl = 0;
    nums.some(n => n !== hr && [...filas.get(n).entries()].some(([col, x]) => /^leyenda/.test(nrm(x.v)) && ((rl = n), (cl = col), true)));
    /* la leyenda: el color y el texto de las celdas de su columna y las siguientes, no los de la tabla de al lado */
    if (rl) nums.filter(n => n > rl && n <= rl + 8).forEach(n => {
      const cs = [...filas.get(n).entries()].filter(([col]) => col >= cl && col <= cl + 5).map(e => e[1]);
      const k = catLeyenda(nrm(cs.map(x => strX(x.v)).join(' '))), f = (cs.find(x => x.f) || {}).f;
      if (k && f && !Object.values(ley).includes(k)) ley[f] = k;
    });
    const corta = rl > hr && cl <= Math.max(...Object.values(map)); /* leyenda debajo de la tabla: ahí acaban las medidas */
    const refs = [...Object.entries(ley), ...CATS.map(c => [c.c.slice(1).toUpperCase(), c.k])];
    const catDe = f => { if (!f) return {k:'def', ok:true}; if (ley[f]) return {k:ley[f], ok:true}; let mej = null, dm = Infinity; refs.forEach(([h, k]) => { const d = dist(f, h); if (d < dm) { dm = d; mej = k; } }); return {k:mej, ok:dm < 3000}; };
    const val = (fila, k) => map[k] != null && fila.get(map[k]) ? fila.get(map[k]).v : '';
    const out = []; let sinColor = 0, aplTexto = 0;
    for (const r of nums.filter(n => n > hr && !(corta && n >= rl))) {
      const fila = filas.get(r);
      let riesgo = strX(val(fila, 'riesgo')), medida = strX(val(fila, 'medida'));
      if (!riesgo && !medida) continue;
      if (/riesgo|aspecto/.test(nrm(riesgo)) && /medida/.test(nrm(medida))) continue; /* cabecera repetida */
      /* el color de la fila: el de la primera celda con relleno que no sea blanco */
      const orden = [map.riesgo, ...Object.values(map)].filter(c => c != null);
      const fcel = (orden.map(c => fila.get(c)).find(x => x && x.f && x.f !== 'FFFFFF') || {}).f || null;
      const cat = catDe(fcel); if (!cat.ok) sinColor++;
      const tp = tipoDe(riesgo); riesgo = tp.riesgo;
      const va = val(fila, 'fapl'); let fapl = aDia(va, d1904), obs = strX(val(fila, 'obs'));
      if (!fapl && strX(va)) { aplTexto++; obs = [obs, 'Fecha de aplicación en el Excel: ' + strX(va)].filter(Boolean).join(' · '); }
      out.push({id:nid('f'), cat:cat.k, tipo:(cat.k === 'spp' || cat.k === 'aud' || tp.tipo === 'om') ? tp.tipo : '', riesgo, prio:aPrio(val(fila, 'prio')), medida,
        fdet:aMes(val(fila, 'fdet'), d1904), plazo:strX(val(fila, 'plazo')), fapl, coste:strX(val(fila, 'coste')), resp:strX(val(fila, 'resp')), reg:strX(val(fila, 'reg')), obs, origen:null, imp:true, creado:Date.now()});
    }
    if (!out.length) continue;
    /* año: hoja, título, nombre del archivo o el más repetido en las fechas de detección */
    const y4 = s => { const m = /(?:^|\D)(20\d\d)(?!\d)/.exec(s || ''); return m ? +m[1] : null; };
    const cuenta = {}; out.forEach(f => { if (f.fdet) cuenta[f.fdet.slice(0, 4)] = (cuenta[f.fdet.slice(0, 4)] || 0) + 1; });
    const moda = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
    const anio = y4(sh.getAttribute('name')) || y4(titulo) || y4(file.name) || (moda ? +moda[0] : new Date().getFullYear());
    hojas.push({archivo:file.name, hoja:sh.getAttribute('name') || '', texto:nrm([file.name, sh.getAttribute('name'), titulo].join(' ')), anio, filas:out, sinColor, aplTexto});
  }
  return {hojas};
}
const claveFila = f => `${nrm(f.riesgo)}|${nrm(f.medida)}|${f.fdet || ''}`;
const mismoCtr = (a, b) => ((a && a.id) || null) === ((b && b.id) || null);
function ctrDe(texto, ctrs) {
  for (const c of ctrs) {
    const sie = nrm(c.sie), nom = nrm(c.nombre);
    if ((sie.length >= 3 && texto.includes(sie)) || (nom.length >= 3 && texto.includes(nom))) return c;
  }
  return null;
}
async function importarExcel(files) {
  if (typeof JSZip === 'undefined') { toast('No se puede leer Excel en este dispositivo.'); return; }
  toast('Leyendo el Excel…');
  const hojas = [], malos = [];
  for (const f of files) {
    let r; try { r = await leerExcel(f); } catch (e) { console.error(e); r = {error:'formato'}; }
    if (r.error) malos.push([f.name, r.error]); else if (!r.hojas.length) malos.push([f.name, 'vacio']); else hojas.push(...r.hojas);
  }
  const porque = {xls:'es del formato antiguo de Excel (.xls). Ábrelo en Excel y guárdalo como «Libro de Excel (.xlsx)».', formato:'no es un archivo de Excel (.xlsx).', vacio:'no tiene una tabla de planificación reconocible: hacen falta las columnas de siempre (riesgos, medidas correctoras, fechas…).'};
  const malosHtml = malos.map(([n, e]) => `<p class="pl-imp-mal"><b>${esc(n)}</b> ${esc(porque[e])}</p>`).join('');
  if (!hojas.length) { await ask({title:'No se ha podido importar', single:true, yes:'Entendido', body:malosHtml}); return; }
  const p = perfilGet(), ctrs = p.contratos.map(c => ({id:c.id, nombre:c.nombre || '', sie:c.sie || ''})), act = snapContrato();
  hojas.forEach(h => { h.ctr = ctrDe(h.texto, ctrs) || act; });
  const yNow = new Date().getFullYear();
  const anios = h => { const ys = new Set([h.anio]); for (let y = yNow + 1; y >= yNow - 8; y--) ys.add(y); return [...ys].sort((a, b) => b - a); };
  const nota = (h, i) => { const ya = PLANES.find(x => +x.anio === +h.anio && mismoCtr(x.contrato, h.ctr)); if (!ya) return 'Se creará una planificación nueva.'; const claves = new Set(ya.filas.map(claveFila)), n = h.filas.filter(f => !claves.has(claveFila(f))).length; return n ? `Ya tienes esta planificación: se añadirán ${plural(n, 'medida que no está', 'medidas que no están')}.` : 'Ya tienes esta planificación con todas estas medidas: no se añadirá nada.'; };
  const cuenta = h => CATS.map(c => { const n = h.filas.filter(f => f.cat === c.k).length; return n ? `<span class="pl-imp-c"><i class="pl-sw" style="background:${c.c}"></i>${n} ${esc(c.t)}</span>` : ''; }).join('');
  const body = `<p class="help">Revisa a qué año y contrato va cada planificación. El color de cada fila decide su origen, como en la leyenda.</p>
    ${hojas.map((h, i) => { const apl = h.filas.filter(f => f.fapl).length; return `<div class="pl-imp-h">
      <label class="pl-imp-sel"><input type="checkbox" data-ih="${i}" checked><span><b>${esc(h.hoja || h.archivo)}</b><small>${esc(h.archivo)}</small></span></label>
      <p class="pl-imp-n">${plural(h.filas.length, 'medida', 'medidas')} · ${apl} ${apl === 1 ? 'aplicada' : 'aplicadas'}</p>
      <div class="pl-imp-cs">${cuenta(h)}</div>
      <div class="bb-in g2">
        <div class="field"><label for="ih-y${i}">Año</label><select id="ih-y${i}" data-iy="${i}">${anios(h).map(y => `<option value="${y}"${y === h.anio ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label for="ih-c${i}">Contrato</label><select id="ih-c${i}" data-ic="${i}">${ctrs.map(c => `<option value="${esc(c.id)}"${h.ctr && h.ctr.id === c.id ? ' selected' : ''}>${esc(nombreContrato(c))}</option>`).join('')}<option value=""${h.ctr ? '' : ' selected'}>Sin contrato</option></select></div>
      </div>
      <p class="help pl-imp-nota" id="ih-n${i}">${esc(nota(h, i))}</p>
      ${h.sinColor ? `<p class="help pl-imp-av">${plural(h.sinColor, 'fila tiene', 'filas tienen')} un color que no está en la leyenda: revisa su origen después de importar.</p>` : ''}
      ${h.aplTexto ? `<p class="help pl-imp-av">${plural(h.aplTexto, 'medida tiene', 'medidas tienen')} texto en vez de fecha de aplicación: queda en Observaciones y la medida, pendiente.</p>` : ''}
    </div>`; }).join('')}
    ${malosHtml}`;
  const pr = ask({title:hojas.length === 1 ? 'Importar planificación' : `Importar ${hojas.length} planificaciones`, yes:'Importar', body});
  const mb = $('#m-body');
  mb.onchange = e => {
    const t = e.target, i = +(t.dataset.iy || t.dataset.ic); if (Number.isNaN(i) || !hojas[i]) return;
    if (t.dataset.iy != null) hojas[i].anio = +t.value;
    if (t.dataset.ic != null) hojas[i].ctr = ctrs.find(c => c.id === t.value) || null;
    const n = document.getElementById('ih-n' + i); if (n) n.textContent = nota(hojas[i], i);
  };
  const r = await pr;
  const marc = [...mb.querySelectorAll('[data-ih]')].filter(c => c.checked).map(c => hojas[+c.dataset.ih]);
  mb.onchange = null;
  if (r !== true || !marc.length) return;
  const res = [];
  for (const h of marc) {
    let pl = PLANES.find(x => +x.anio === +h.anio && mismoCtr(x.contrato, h.ctr));
    const nuevo = !pl;
    if (nuevo) pl = {id:nid('p'), creado:Date.now(), guardado:Date.now(), anio:+h.anio, contrato:h.ctr ? {...h.ctr} : null, filas:[]};
    else pl = JSON.parse(JSON.stringify(pl));
    const claves = new Set(pl.filas.map(claveFila)); let n = 0;
    h.filas.forEach(f => { const k = claveFila(f); if (claves.has(k)) return; claves.add(k); pl.filas.push(f); n++; });
    pl.guardado = Date.now();
    pl.importado = [...(pl.importado || []), {archivo:h.archivo, hoja:h.hoja, f:Date.now(), n}].slice(-20);
    await pdb.put(pl);
    const i = PLANES.findIndex(x => x.id === pl.id); if (i >= 0) PLANES[i] = pl; else PLANES.unshift(pl);
    res.push({pl, n, nuevo, rep:h.filas.length - n});
  }
  await cargar();
  if (res.length === 1 && res[0].n) { abrir(res[0].pl.id); }
  const txt = res.map(x => `${titPlan(x.pl)}${x.pl.contrato ? ' · ' + nombreContrato(x.pl.contrato) : ''}: ${x.n ? plural(x.n, 'medida añadida', 'medidas añadidas') : 'nada nuevo'}${x.rep ? ` (${plural(x.rep, 'ya estaba', 'ya estaban')})` : ''}`).join('\n');
  toast(res.length === 1 ? txt : `Importadas ${plural(res.length, 'planificación', 'planificaciones')}.`);
}

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-plan'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="pl-lista"></div><div id="pl-ed" hidden></div><div id="pl-fila" hidden></div><input type="file" id="pl-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple hidden>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  const bar = document.createElement('div'); bar.className = 'ibar pl-bar'; bar.id = 'pl-bar'; bar.hidden = true;
  bar.innerHTML = '<button type="button" class="btn" data-pb="xlsx">Excel</button><button type="button" class="btn primary" data-pb="add">+ Añadir medida</button>';
  document.body.appendChild(bar);
  main.addEventListener('click', onClick); main.addEventListener('input', onInput); main.addEventListener('change', onChange);
  bar.addEventListener('click', e => { const b = e.target.closest('[data-pb]'); if (!b || !PL) return; if (b.dataset.pb === 'add') nuevaFila(); else exportar(PL); });
  cargar();
}
window.PLAN_API = {
  lista: () => PLANES,
  abrirInicio() { showTab('plan'); if (!PL) { renderLista(); vista('#pl-lista'); } },
  /* la del año del contrato activo, para el Inicio */
  resumenActivo() {
    const a = actId(), y = new Date().getFullYear();
    const pl = PLANES.find(x => x.anio === y && (!a || (x.contrato && x.contrato.id === a))) || null;
    return pl ? {...resumen(pl), anio:pl.anio} : null;
  },
  /* para «Hoy y vencidas» del Inicio: medidas vencidas o que vencen en 30 días, de las planificaciones de este año */
  pendientes() {
    const y = new Date().getFullYear(), lim = isoDate(new Date(Date.now() + 30 * 864e5)), out = [];
    PLANES.filter(p => +p.anio === y).forEach(p => (p.filas || []).forEach(f => {
      if (vacia(f)) return;
      const e = estado(f); if (e.k === 'ok') return;
      const v = vence(f); if (e.k !== 'bad' && !(v && v <= lim)) return;
      out.push({plan:p.id, id:f.id, t:(f.medida || f.riesgo || '').trim(), riesgo:(f.riesgo || '').trim(), ctr:p.contrato || null, k:e.k === 'bad' ? 'bad' : 'warn', v});
    }));
    return out;
  },
  async editarFila(planId, filaId) {
    if (PL && PL.id !== planId) await guardarYa();
    showTab('plan');
    if (!PL || PL.id !== planId) abrir(planId);
    if (PL && PL.filas.some(f => f.id === filaId)) { FILA = filaId; renderFila(); }
    else if (!PL) { renderLista(); vista('#pl-lista'); }
  },
  async importar(arr) {
    const act = new Map(PLANES.map(x => [x.id, x])); let n = 0;
    for (const x of arr) { if (x && x.id && Array.isArray(x.filas) && (!act.has(x.id) || (x.guardado || 0) > (act.get(x.id).guardado || 0))) { await pdb.put(x); n++; } }
    if (n) await cargar();
    return n;
  },
  atras() {
    const v = $('#view-plan'); if (!v || v.hidden) return false;
    if (FILA) { cerrarFila(); return true; }
    if (PL) { volverLista(); return true; }
    return false;
  },
  onTab(t) {
    const b = $('#pl-bar'); if (b) b.hidden = !(t === 'plan' && PL && !FILA);
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
