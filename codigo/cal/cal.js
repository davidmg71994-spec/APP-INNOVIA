/* ================= Calendario PRL del técnico: empieza en blanco, cada uno añade sus tareas ================= */
(() => {
const TIPOS = [
  {k:'vis', t:'Visitas y planificación'},
  {k:'inst', t:'Instalaciones'},
  {k:'veh', t:'Vehículos y maquinaria'},
  {k:'reg', t:'Índices y registros'},
  {k:'ma', t:'Medio ambiente'},
  {k:'hito', t:'Comités, informes y simulacros'},
  {k:'otr', t:'Otros'}
];
const TIPO = Object.fromEntries(TIPOS.map(x => [x.k, x]));
const REP = [['', 'No se repite'], ['sem', 'Cada semana'], ['mes', 'Cada mes'], ['tri', 'Cada 3 meses'], ['cua', 'Cada 4 meses'], ['semes', 'Cada 6 meses'], ['anu', 'Cada año']];
const REPT = Object.fromEntries(REP);
const REPM = {mes:1, tri:3, cua:4, semes:6, anu:12};
/* ideas rápidas: solo rellenan el formulario, el técnico decide */
const SUG = [
  ['Visita a tajo de día', 'vis', 'mes'], ['Visita a tajo de noche', 'vis', 'mes'], ['Revisión de la planificación preventiva', 'vis', 'mes'],
  ['Índices PRL del mes anterior', 'reg', 'mes'], ['Horas WINSIE', 'reg', 'mes'], ['Gastos PRL del mes', 'reg', 'mes'], ['Hoja trimestral de accidentes', 'reg', 'tri'],
  ['Revisión de vehículos y maquinaria', 'veh', 'mes'], ['Revisión de pequeña maquinaria', 'veh', 'mes'],
  ['Revisión trimestral de botiquín, extintores, anticaídas y escaleras', 'inst', 'tri'], ['Control de legionela', 'inst', 'tri'],
  ['Registro de consumos y residuos', 'ma', 'mes'], ['Indicadores de seguridad vial', 'otr', 'mes'], ['Cartel de sensibilización y tablón', 'otr', 'mes'],
  ['Comité de Seguridad y Salud', 'hito', 'tri'], ['Informe de seguimiento cuatrimestral', 'hito', 'cua'], ['Simulacro de emergencia', 'hito', 'anu']
];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const REPIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a8 8 0 0 1 14-4.5M20 13a8 8 0 0 1-14 4.5"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>';

/* ---------- almacén ---------- */
const cdb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('registro-rp-cal', 1); r.onupgradeneeded = () => r.result.createObjectStore('tareas', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  }));
  const tx = (m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('tareas', m); const out = f(t.objectStore('tareas')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return { all: () => tx('readonly', s => s.getAll()), put: x => tx('readwrite', s => s.put(x)), del: id => tx('readwrite', s => s.delete(id)) };
})();
let TAREAS = [], ED = null, modo = ['mes', 'lista'].includes(lsGet('cal-modo')) ? lsGet('cal-modo') : 'agenda', fctr = '', mesV = null, diaSel = null;
async function cargar() { try { TAREAS = await cdb.all() || []; } catch (e) { TAREAS = []; } if (!ED) renderMain(); refrescaIni(); }
async function guardar(t) {
  t.guardado = Date.now();
  const i = TAREAS.findIndex(x => x.id === t.id); if (i >= 0) TAREAS[i] = t; else TAREAS.push(t);
  try { await cdb.put(JSON.parse(JSON.stringify(t))); } catch (e) { toast('No se pudo guardar la tarea.'); }
  refrescaIni();
}
const nid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const refrescaIni = () => { if (window.INI_API && INI_API.refrescar) INI_API.refrescar(); };

/* ---------- fechas y repeticiones ---------- */
const hoy = () => isoDate(new Date());
const pISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const masDias = (s, n) => { const d = pISO(s); d.setDate(d.getDate() + n); return isoDate(d); };
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const corta = s => { const d = pISO(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
const larga = s => { const d = pISO(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/* fechas en que toca la tarea entre a y b (ambas incluidas) */
function fechas(t, a, b) {
  if (!t.f) return [];
  const fin = t.hasta && t.hasta < b ? t.hasta : b;
  /* las repeticiones anteriores al día en que se creó la tarea no cuentan */
  const ini = t.rep && t.desde && t.desde > a ? t.desde : a;
  if (!t.rep) return t.f >= a && t.f <= b ? [t.f] : [];
  const out = [];
  if (t.rep === 'sem') {
    let s = t.f;
    if (s < ini) { const n = Math.ceil((pISO(ini) - pISO(s)) / 864e5 / 7); s = masDias(s, 7 * n); }
    for (; s <= fin; s = masDias(s, 7)) out.push(s);
    return out;
  }
  const paso = REPM[t.rep]; if (!paso) return [];
  const f0 = pISO(t.f), d0 = f0.getDate();
  const ia = pISO(ini);
  let k = Math.max(0, Math.floor(((ia.getFullYear() - f0.getFullYear()) * 12 + ia.getMonth() - f0.getMonth()) / paso) - 1);
  for (let guard = 0; guard < 400; guard++, k++) {
    const y = f0.getFullYear(), m = f0.getMonth() + k * paso;
    const d = new Date(y, m, 1); const s = isoDate(new Date(d.getFullYear(), d.getMonth(), Math.min(d0, dim(d.getFullYear(), d.getMonth()))));
    if (s > fin) break;
    if (s >= ini) out.push(s);
  }
  return out;
}
const hecha = (t, d) => !!(t.hechas && t.hechas[d]);
const delFiltro = t => !fctr || (fctr === '-' ? !(t.ctr && t.ctr.id) : !!(t.ctr && t.ctr.id === fctr));
/* todas las apariciones (tarea + fecha) en un rango */
function ocurr(a, b, todas) {
  const out = [];
  TAREAS.filter(t => todas || delFiltro(t)).forEach(t => fechas(t, a, b).forEach(d => out.push({t, d, ok:hecha(t, d)})));
  return out.sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : (x.t.t || '').localeCompare(y.t.t || ''));
}
const vencidas = todas => ocurr(masDias(hoy(), -400), masDias(hoy(), -1), todas).filter(o => !o.ok);
function resumen(todas) {
  const h = hoy(), sem = ocurr(h, masDias(h, 7), todas), ym = h.slice(0, 7);
  const mes = ocurr(ym + '-01', ym + '-31', todas);
  return {n:TAREAS.length, hoy:sem.filter(o => o.d === h && !o.ok).length, semana:sem.filter(o => !o.ok).length, venc:vencidas(todas).length, hechasMes:mes.filter(o => o.ok).length, mes:mes.length};
}

/* ---------- pantalla principal (1.26.0: más sencilla, tres pestañas: Pendientes, Mes y Mis tareas) ---------- */
const ctrCorto = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
function filaHtml(o, conFecha = true) {
  const {t, d, ok} = o, late = !ok && d < hoy();
  const meta = [conFecha ? `<span>${esc(corta(d))}</span>` : '', t.ctr && t.ctr.id && !fctr ? `<span class="cal-tc">${esc(ctrCorto(t.ctr))}</span>` : '', t.rep ? `<span class="cal-rp">${REPIC}${esc(REPT[t.rep])}</span>` : '', late ? '<span class="cal-late">Vencida</span>' : ''].filter(Boolean).join('');
  return `<div class="cal-row${ok ? ' st-ok' : ''}${late ? ' st-bad' : ''}">
    <button type="button" class="cal-ck" data-hecha="${esc(t.id)}" data-d="${d}" aria-pressed="${ok}" aria-label="${ok ? 'Desmarcar' : 'Marcar como hecha'}: ${esc(t.t)}">${CHECK}</button>
    <button type="button" class="cal-open" data-edit="${esc(t.id)}" data-d="${d}"><b>${esc(t.t)}</b>${meta ? `<span class="cal-meta">${meta}</span>` : ''}</button>
  </div>`;
}
function grupo(tit, list, cls = '', conFecha = true) {
  if (!list.length) return '';
  return `<h3 class="cal-gh ${cls}">${esc(tit)}<i>${list.length}</i></h3><div class="cal-list">${list.map(o => filaHtml(o, conFecha)).join('')}</div>`;
}
function agendaHtml() {
  const h = hoy(), v = vencidas(), hoyL = ocurr(h, h), sem = ocurr(masDias(h, 1), masDias(h, 7));
  /* más adelante: de las que se repiten, solo la siguiente vez; plegado para que la pantalla quede corta */
  const vistas = new Set([...hoyL, ...sem].map(o => o.t.id)), mas = ocurr(masDias(h, 8), masDias(h, 30)).filter(o => !vistas.has(o.t.id) && (vistas.add(o.t.id), true));
  const alDia = !v.length && !hoyL.filter(o => !o.ok).length && !sem.length;
  const masH = mas.length ? `<details class="cal-mas"><summary>Más adelante <small>hasta 30 días</small><i>${mas.length}</i></summary><div class="cal-list">${mas.map(o => filaHtml(o)).join('')}</div></details>` : '';
  if (alDia && !hoyL.length) return `<div class="cal-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/></svg><b>Nada pendiente esta semana</b></div>${masH || '<p class="help cal-vacio">Tampoco hay nada en los próximos 30 días. Mira el mes entero en «Mes».</p>'}`;
  return grupo('Vencidas', v, 'g-bad') + grupo('Hoy', hoyL, 'g-hoy', false) + grupo('Esta semana', sem) + masH;
}
function mesHtml() {
  const [y, m] = mesV, a = `${y}-${pad2(m + 1)}-01`, b = `${y}-${pad2(m + 1)}-${pad2(dim(y, m))}`, h = hoy();
  const os = ocurr(a, b), by = {};
  os.forEach(o => (by[o.d] = by[o.d] || []).push(o));
  if (!diaSel || !diaSel.startsWith(a.slice(0, 7))) diaSel = h.startsWith(a.slice(0, 7)) ? h : (Object.keys(by).sort()[0] || a);
  let g = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span class="cal-dow">${x}</span>`).join('');
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) g += '<span class="cal-d out" aria-hidden="true"></span>';
  for (let d = 1; d <= dim(y, m); d++) {
    const s = `${y}-${pad2(m + 1)}-${pad2(d)}`, l = by[s] || [], wd = new Date(y, m, d).getDay();
    const pend = l.filter(o => !o.ok).length, late = pend && s < h, todo = l.length && !pend;
    /* un número por día (las que quedan) en vez de puntos de colores: no hace falta leyenda */
    const marca = todo ? `<i class="cal-c ok" aria-hidden="true">${CHECK}</i>` : pend ? `<i class="cal-c" aria-hidden="true">${pend}</i>` : '';
    /* 1.26.1 · con sitio (ordenador, tableta) el día enseña en pequeño lo que toca: primero lo pendiente; en el móvil, el número */
    const orden = [...l.filter(o => !o.ok), ...l.filter(o => o.ok)], MAXT = 3;
    const tits = orden.length ? `<span class="cal-ts" aria-hidden="true">${orden.slice(0, MAXT).map(o => `<span class="cal-tt${o.ok ? ' ok' : !o.ok && s < h ? ' late' : ''}">${esc(o.t.t)}</span>`).join('')}${orden.length > MAXT ? `<span class="cal-tm">+${orden.length - MAXT} más</span>` : ''}</span>` : '';
    g += `<button type="button" class="cal-d${wd === 0 || wd === 6 ? ' we' : ''}${s === h ? ' hoy' : ''}${s === diaSel ? ' sel' : ''}${late ? ' late' : ''}${todo ? ' todo' : ''}${l.length ? ' con' : ''}" data-dia="${s}" aria-label="${esc(larga(s))}: ${l.length ? plural(l.length, 'tarea', 'tareas') + (pend ? `, ${pend} sin hacer` : ', todas hechas') + ': ' + esc(orden.map(o => o.t.t).join('; ')) : 'sin tareas'}" aria-pressed="${s === diaSel}"${l.length ? ` title="${esc(orden.map(o => (o.ok ? '✓ ' : '') + o.t.t).join('\n'))}"` : ''}><span class="n">${d}</span>${marca}${tits}</button>`;
  }
  const lm = by[diaSel] || [];
  const pend = os.filter(o => !o.ok).length;
  return `<div class="cal-mbar"><button type="button" class="nav-b" data-mes="-1" aria-label="Mes anterior">‹</button><h3>${cap(MESES[m])} ${y}</h3><button type="button" class="nav-b" data-mes="1" aria-label="Mes siguiente">›</button></div>
    <p class="cal-msum">${plural(os.length, 'tarea', 'tareas')} · ${os.length - pend} ${os.length - pend === 1 ? 'hecha' : 'hechas'}${h.startsWith(a.slice(0, 7)) ? '' : ` · <button type="button" class="linkbtn cal-hoyb" data-mes="0">Volver a hoy</button>`}</p>
    <div class="cal-grid" role="group" aria-label="${cap(MESES[m])} ${y}">${g}</div>
    <div class="cal-dhead"><h3 class="cal-gh">${esc(cap(larga(diaSel)))}<i>${lm.length}</i></h3><button type="button" class="cal-addd" data-nueva="${diaSel}">${PLUS}Añadir</button></div>
    ${lm.length ? `<div class="cal-list">${lm.map(o => filaHtml(o, false)).join('')}</div>` : '<p class="help cal-vacio">Sin tareas este día.</p>'}`;
}
/* «Mis tareas»: una línea por tarea (no por fecha) para añadir, cambiar o quitar */
function proxima(t) {
  const h = hoy(), v = fechas(t, masDias(h, -400), masDias(h, -1)).filter(d => !hecha(t, d));
  if (v.length) return {d:v[0], txt:`vencida el ${corta(v[0])}`, late:true};
  const l = fechas(t, h, masDias(h, 800)).filter(d => !hecha(t, d));
  if (l.length) return {d:l[0], txt:(l[0] === h ? 'hoy' : corta(l[0]))};
  if (!t.rep && t.f < h) return {d:t.f, txt:`${corta(t.f)}, ${hecha(t, t.f) ? 'hecha' : 'pasada'}`};
  return {d:'9999', txt:'sin próximas fechas'};
}
function listaHtml() {
  const l = TAREAS.filter(delFiltro).map(t => ({t, p:proxima(t)})).sort((x, y) => x.p.d < y.p.d ? -1 : x.p.d > y.p.d ? 1 : (x.t.t || '').localeCompare(y.t.t || ''));
  const filas = l.map(({t, p}) => {
    const meta = [`<span>${t.rep ? `${REPIC}${esc(REPT[t.rep])}` : 'Una vez'}</span>`, (p.late ? `<span class="cal-late">${cap(esc(p.txt))}</span>` : `<span>${t.rep ? 'Próxima: ' : ''}${esc(p.txt)}</span>`), t.ctr && t.ctr.id && !fctr ? `<span class="cal-tc">${esc(ctrCorto(t.ctr))}</span>` : ''].filter(Boolean).join('');
    return `<div class="cal-row cal-def">
      <button type="button" class="cal-open" data-edit="${esc(t.id)}"><b>${esc(t.t)}</b><span class="cal-meta">${meta}</span></button>
      <button type="button" class="cal-quitar" data-quitar="${esc(t.id)}" aria-label="Quitar: ${esc(t.t)}">${TRASH}<span>Quitar</span></button>
    </div>`;
  }).join('');
  return `<button type="button" class="btn primary cal-add" data-nueva="">${PLUS}Añadir tarea</button>
    ${l.length ? `<p class="help cal-lh">Toca una tarea para cambiarla. «Quitar» la borra con todas sus repeticiones.</p><div class="cal-list">${filas}</div>` : '<p class="help cal-vacio">No hay tareas con este filtro.</p>'}`;
}
function ctrsHtml() {
  const cs = perfilGet().contratos, sin = TAREAS.some(t => !(t.ctr && t.ctr.id));
  if (cs.length < 2 && !sin) return '';
  const o = (id, txt) => `<option value="${esc(id)}"${fctr === id ? ' selected' : ''}>${esc(txt)}</option>`;
  return `<label class="cal-fcw"><span>Contrato</span><select id="cal-fc">${o('', 'Todos')}${cs.map(c => o(c.id, ctrCorto(c))).join('')}${sin ? o('-', 'Sin contrato') : ''}</select></label>`;
}
function resumenHtml(r) {
  const p = [];
  if (r.venc) p.push(`<span class="cal-pill bad">${plural(r.venc, 'vencida', 'vencidas')}</span>`);
  if (r.hoy) p.push(`<span class="cal-pill hoy">${r.hoy} hoy</span>`);
  if (r.semana - r.hoy > 0) p.push(`<span class="cal-pill">${r.semana - r.hoy} esta semana</span>`);
  if (!p.length) p.push(`<span class="cal-pill ok">${CHECK}Al día</span>`);
  return `<p class="cal-res" aria-label="Resumen">${p.join('')}</p>`;
}
function renderMain() {
  const M = $('#cal-main'); if (!M) return;
  if (fctr && fctr !== '-' && !contratoPorId(fctr)) fctr = '';
  if (!mesV) { const d = new Date(); mesV = [d.getFullYear(), d.getMonth()]; }
  const r = resumen(), vacio = !TAREAS.length;
  const pendN = r.venc + r.semana;
  const tab = (k, txt, n) => `<button type="button" role="tab" data-cmodo="${k}" aria-selected="${modo === k}" aria-pressed="${modo === k}">${txt}${n ? `<i>${n}</i>` : ''}</button>`;
  M.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ca="ini">‹ Inicio</button></div>
    <header class="cal-top"><h2>Calendario</h2>${vacio ? '' : resumenHtml(r)}</header>
    ${vacio ? `<div class="empty cal-blank"><b>Tu calendario está en blanco</b><span>Añade tus tareas de PRL: las sueltas (una reunión, una entrega) y las que se repiten cada semana, mes, trimestre o año (visitas a tajo, índices, revisiones, comités…).</span><button type="button" class="btn primary" data-nueva="">${PLUS}Añadir la primera tarea</button></div>` : `
    <div class="cal-tabs" role="tablist" aria-label="Cómo ver las tareas">${tab('agenda', 'Pendientes', pendN)}${tab('mes', 'Mes')}${tab('lista', 'Mis tareas', TAREAS.length)}</div>
    ${ctrsHtml()}
    <div class="cal-body" role="tabpanel">${modo === 'mes' ? mesHtml() : modo === 'lista' ? listaHtml() : agendaHtml()}</div>`}`;
  vista('main');
}
function vista(q) {
  const m = $('#cal-main'), f = $('#cal-form'); if (m) m.hidden = q !== 'main'; if (f) f.hidden = q !== 'form';
  const b = $('#cal-bar'); if (b) b.hidden = q !== 'main' || $('#view-cal').hidden || !TAREAS.length || modo === 'lista';
}

/* ---------- formulario de tarea (1.26.0: lo justo arriba; tipo, «hasta» y notas en «Más opciones») ---------- */
function abrirForm(id, fecha) {
  const t = id ? TAREAS.find(x => x.id === id) : null;
  const a = snapContrato();
  ED = t ? JSON.parse(JSON.stringify(t)) : {id:nid(), t:'', k:'', ctr:fctr === '-' ? null : (fctr ? snapContrato(contratoPorId(fctr)) : a), f:fecha || hoy(), rep:'', hasta:'', notas:'', hechas:{}, nueva:true};
  renderForm(); vista('form'); window.scrollTo({top:0});
  if (!t) setTimeout(() => { const i = $('#cf-t'); if (i) i.focus(); }, 60);
}
function renderForm() {
  const F = $('#cal-form'); if (!F || !ED) return;
  const cs = perfilGet().contratos, cid = ED.ctr && ED.ctr.id;
  const opts = cs.map(c => `<option value="${esc(c.id)}"${c.id === cid ? ' selected' : ''}>${esc(nombreContrato(c) || 'Contrato')}</option>`).join('') + (cid && !cs.some(c => c.id === cid) ? `<option value="${esc(cid)}" selected>${esc(nombreContrato(ED.ctr))}</option>` : '');
  const masAbierto = !!(ED.notas || ED.hasta);
  F.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ca="volver">‹ Calendario</button></div>
    <section class="block cal-fb">
      <header class="bh"><h2>${ED.nueva ? 'Añadir tarea' : 'Cambiar tarea'}</h2></header>
      <div class="bb cal-ff">
        <div class="field"><label for="cf-t">¿Qué hay que hacer?</label><input id="cf-t" type="text" maxlength="200" autocomplete="off" placeholder="Ej.: Visita a tajo de noche" value="${esc(ED.t)}"></div>
        ${ED.nueva ? `<details class="cal-sug"><summary>Ideas rápidas <small>las tareas habituales de PRL</small></summary><div class="chips">${SUG.map((s, i) => `<button type="button" class="chip" data-sug="${i}">${esc(s[0])}</button>`).join('')}</div></details>` : ''}
        <div class="field"><label for="cf-f">${ED.rep ? 'Primera fecha' : 'Fecha'}</label><input id="cf-f" type="date" value="${esc(ED.f)}"></div>
        <div class="field"><span class="lbl" id="cf-rl">¿Se repite?</span><div class="chips cal-reps" role="group" aria-labelledby="cf-rl">${REP.map(([k, t]) => `<button type="button" class="chip" data-rep="${k}" aria-pressed="${ED.rep === k}">${esc(t)}</button>`).join('')}</div>
          <p class="help" id="cf-rh">${repAyuda()}</p></div>
        <div class="field"${cs.length || cid ? '' : ' hidden'}><label for="cf-c">Contrato</label><select id="cf-c"><option value="">Sin contrato</option>${opts}</select></div>
        <details class="cal-masop"${masAbierto ? ' open' : ''}><summary>Más opciones <small>tipo, hasta cuándo y notas</small></summary>
          <div class="cal-ff">
            <div class="field"><span class="lbl" id="cf-kl">Tipo</span><div class="chips cal-tipos" role="group" aria-labelledby="cf-kl">${TIPOS.map(x => `<button type="button" class="chip" data-tipo="${x.k}" aria-pressed="${ED.k === x.k}">${esc(x.t)}</button>`).join('')}</div></div>
            <div class="field" id="cf-hw"${ED.rep ? '' : ' hidden'}><label for="cf-h">Hasta <i class="opc">opcional</i></label><input id="cf-h" type="date" value="${esc(ED.hasta || '')}"></div>
            <div class="field"><label for="cf-n">Notas <i class="opc">opcional</i></label><textarea id="cf-n" rows="3" maxlength="1500">${esc(ED.notas || '')}</textarea></div>
          </div>
        </details>
      </div>
    </section>
    <div class="cal-fbtns">
      <button type="button" class="btn primary" data-ca="guardar">${ED.nueva ? 'Añadir al calendario' : 'Guardar cambios'}</button>
      ${ED.nueva ? '' : `<button type="button" class="btn danger-t" data-ca="borrar">${TRASH}Quitar del calendario</button>`}
      <button type="button" class="btn" data-ca="volver">Cancelar</button>
    </div>`;
}
function repAyuda() {
  if (!ED.rep || !ED.f) return ED.rep ? '' : 'Una sola vez, el día que pongas.';
  const d = pISO(ED.f), dia = d.getDate();
  const txt = ED.rep === 'sem' ? `Todos los ${DIAS[d.getDay()]}` : ED.rep === 'anu' ? `Cada año, el ${dia} de ${MESES[d.getMonth()]}` : `El día ${dia} ${ED.rep === 'mes' ? 'de cada mes' : 'cada ' + REPM[ED.rep] + ' meses'}${dia > 28 ? ' (o el último día si el mes es más corto)' : ''}`;
  return txt + (ED.nueva ? '. Los cambios valen para todas las repeticiones.' : '. Al editarla cambian todas las repeticiones; las ya marcadas como hechas se mantienen.');
}
function leerForm() {
  const v = id => ((($('#' + id) || {}).value) || '').trim();
  ED.t = v('cf-t'); ED.f = v('cf-f'); ED.notas = v('cf-n'); ED.hasta = ED.rep ? v('cf-h') : '';
  const cid = v('cf-c'); ED.ctr = cid ? (contratoPorId(cid) ? snapContrato(contratoPorId(cid)) : ED.ctr) : null;
}
async function guardarForm() {
  leerForm();
  if (!ED.t) { toast('Escribe qué hay que hacer.'); $('#cf-t').focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ED.f)) { toast('Pon la fecha.'); $('#cf-f').focus(); return; }
  if (ED.hasta && ED.hasta < ED.f) { toast('«Hasta» no puede ser antes de la primera fecha.'); const mo = $('.cal-masop'); if (mo) mo.open = true; $('#cf-h').focus(); return; }
  const nueva = !!ED.nueva; delete ED.nueva;
  if (!ED.k) ED.k = 'otr';
  if (nueva) ED.creado = Date.now();
  /* una tarea que se repite empieza a contar desde el día en que la das de alta: no llena de vencidas los meses pasados */
  if (ED.rep && !ED.desde) ED.desde = hoy();
  const t = ED; ED = null;
  await guardar(t);
  if (modo === 'mes') { const d = pISO(t.f); if (!t.rep) { mesV = [d.getFullYear(), d.getMonth()]; diaSel = t.f; } }
  renderMain(); window.scrollTo({top:0});
  toast(nueva ? (t.rep ? `Tarea añadida: ${REPT[t.rep].toLowerCase()}.` : `Tarea añadida para el ${fmtDate(t.f)}.`) : 'Cambios guardados.');
}
async function borrar(id) {
  const t = TAREAS.find(x => x.id === (id || (ED && ED.id))); if (!t) return;
  if (!(await ask({title:'¿Quitar la tarea?', body:`<p>«${esc(t.t)}»${t.rep ? ' y todas sus repeticiones' : ''} se quita del calendario.</p>`, yes:'Quitar', danger:true}))) return;
  TAREAS = TAREAS.filter(x => x.id !== t.id);
  try { await cdb.del(t.id); } catch (e) {}
  const y = window.scrollY; ED = null; renderMain(); refrescaIni(); if (id) window.scrollTo({top:y}); toast('Tarea quitada.');
}

/* ---------- eventos ---------- */
async function onClick(e) {
  const hc = e.target.closest('[data-hecha]');
  if (hc) {
    const t = TAREAS.find(x => x.id === hc.dataset.hecha), d = hc.dataset.d; if (!t) return;
    t.hechas = t.hechas || {};
    const ya = !!t.hechas[d];
    if (ya) delete t.hechas[d]; else t.hechas[d] = Date.now();
    const y = window.scrollY; await guardar(t); renderMain(); window.scrollTo({top:y});
    toast(ya ? 'Vuelve a estar pendiente.' : 'Hecha. ¡Bien!');
    return;
  }
  const qt = e.target.closest('[data-quitar]'); if (qt) return borrar(qt.dataset.quitar);
  const ed = e.target.closest('[data-edit]'); if (ed) { abrirForm(ed.dataset.edit); return; }
  const nv = e.target.closest('[data-nueva]'); if (nv) { abrirForm(null, nv.dataset.nueva || (modo === 'mes' && diaSel && diaSel >= hoy() ? diaSel : hoy())); return; }
  const md = e.target.closest('[data-cmodo]'); if (md) { modo = md.dataset.cmodo; lsSet('cal-modo', modo); renderMain(); return; }
  const ms = e.target.closest('[data-mes]');
  if (ms) { const n = +ms.dataset.mes; if (!n) { const d = new Date(); mesV = [d.getFullYear(), d.getMonth()]; diaSel = hoy(); } else { const d = new Date(mesV[0], mesV[1] + n, 1); mesV = [d.getFullYear(), d.getMonth()]; diaSel = null; } renderMain(); return; }
  const dia = e.target.closest('[data-dia]'); if (dia) { diaSel = dia.dataset.dia; const y = window.scrollY; renderMain(); window.scrollTo({top:y}); return; }
  const sg = e.target.closest('[data-sug]');
  if (sg && ED) { const s = SUG[+sg.dataset.sug]; leerForm(); ED.t = s[0]; ED.k = s[1]; ED.rep = s[2]; renderForm(); toast('Revisa la fecha y guarda.'); const f = $('#cf-f'); if (f) f.focus(); return; }
  const tp = e.target.closest('[data-tipo]'); if (tp && ED) { ED.k = ED.k === tp.dataset.tipo ? '' : tp.dataset.tipo; tp.parentNode.querySelectorAll('[data-tipo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tipo === ED.k)); return; }
  const rp = e.target.closest('[data-rep]');
  if (rp && ED) { leerForm(); ED.rep = rp.dataset.rep; rp.parentNode.querySelectorAll('[data-rep]').forEach(b => b.setAttribute('aria-pressed', b.dataset.rep === ED.rep)); $('#cf-hw').hidden = !ED.rep; $('#cf-rh').textContent = repAyuda(); const l = $('label[for="cf-f"]'); if (l) l.textContent = ED.rep ? 'Primera fecha' : 'Fecha'; return; }
  const b = e.target.closest('[data-ca]'); if (!b) return;
  const a = b.dataset.ca;
  if (a === 'ini') { showTab('ini'); return; }
  if (a === 'volver') { ED = null; renderMain(); window.scrollTo({top:0}); return; }
  if (a === 'guardar') return guardarForm();
  if (a === 'borrar') return borrar();
}
function onInput(e) {
  if (e.target.id === 'cal-fc') { fctr = e.target.value; renderMain(); return; }
  if (ED && e.target.id === 'cf-f') { ED.f = e.target.value; const h = $('#cf-rh'); if (h) h.textContent = repAyuda(); }
}

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-cal'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="cal-main"></div><div id="cal-form" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  const bar = document.createElement('div'); bar.className = 'ibar'; bar.id = 'cal-bar'; bar.hidden = true;
  bar.innerHTML = '<button type="button" class="btn primary" data-nueva="">+ Añadir tarea</button>';
  document.body.appendChild(bar);
  main.addEventListener('click', onClick); main.addEventListener('input', onInput); main.addEventListener('change', onInput);
  bar.addEventListener('click', onClick);
  cargar();
}
window.CAL_API = {
  lista: () => TAREAS,
  abrir() { ED = null; showTab('cal'); renderMain(); },
  /* para el Inicio: todos los contratos */
  resumen: () => resumen(true),
  /* para «Hoy y vencidas» del Inicio: una línea por tarea, con la fecha más antigua sin marcar */
  pendientes() {
    const h = hoy(), m = new Map();
    ocurr(masDias(h, -400), h, true).filter(o => !o.ok).forEach(o => { const x = m.get(o.t.id); if (x) x.n++; else m.set(o.t.id, {id:o.t.id, t:o.t.t || '', k:o.t.k || 'otr', ctr:o.t.ctr || null, d:o.d, n:1}); });
    return [...m.values()];
  },
  /* visitas a tajo previstas este mes (tareas de «Visitas» con «visita» en el nombre) */
  visitasMes(ctrId) {
    const ym = hoy().slice(0, 7);
    return ocurr(ym + '-01', ym + '-31', true).filter(o => o.t.k === 'vis' && /visita/i.test(o.t.t || '') && (!ctrId || !(o.t.ctr && o.t.ctr.id) || o.t.ctr.id === ctrId)).length;
  },
  editar(id, d) { showTab('cal'); if (TAREAS.some(x => x.id === id)) abrirForm(id, d); },
  /* 1.24.0 · desde «Tareas del técnico»: el formulario de nueva tarea ya relleno (el técnico revisa y guarda) */
  nueva(pre) {
    ED = null; showTab('cal'); abrirForm(null, pre.f);
    Object.assign(ED, {t:pre.t || '', k:pre.k || '', rep:pre.rep || '', notas:pre.notas || '', ctr:'ctr' in pre ? (pre.ctr || null) : null});
    if (pre.guia) ED.guia = pre.guia;
    renderForm(); vista('form');
  },
  /* y varias de golpe; las que se repiten cuentan desde hoy (no salen vencidas las de antes) */
  async agregar(arr) {
    let n = 0;
    for (const x of arr || []) {
      if (!x || !x.t || !/^\d{4}-\d{2}-\d{2}$/.test(x.f || '')) continue;
      const t = {id:nid(), t:x.t, k:x.k || 'otr', ctr:x.ctr || null, f:x.f, rep:x.rep || '', hasta:'', notas:x.notas || '', hechas:x.hechas || {}, creado:Date.now()};
      if (x.guia) t.guia = x.guia;
      if (t.rep) t.desde = hoy();
      await guardar(t); n++;
    }
    if (n && !ED) renderMain();
    return n;
  },
  async importar(arr) {
    const act = new Map(TAREAS.map(x => [x.id, x])); let n = 0;
    for (const x of arr) { if (x && x.id && x.t && x.f && (!act.has(x.id) || (x.guardado || 0) > (act.get(x.id).guardado || 0))) { await cdb.put(x); n++; } }
    if (n) await cargar();
    return n;
  },
  atras() {
    const v = $('#view-cal'); if (!v || v.hidden) return false;
    if (ED) { ED = null; renderMain(); return true; }
    showTab('ini'); return true;
  },
  onTab(t) { const b = $('#cal-bar'); if (b) b.hidden = !(t === 'cal' && !ED && TAREAS.length && modo !== 'lista'); if (t === 'cal' && !ED) renderMain(); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
