/* ===== Informe de seguimiento (cuatrimestral) ===== */
(() => {
'use strict';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XMLNS = 'http://www.w3.org/XML/1998/namespace';
const NSD = 'xmlns:w="' + W + '" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SECS = INF_SCHEMA.sections;
const ITEM_BY_ID = {};
SECS.forEach(s => s.items.forEach(it => { ITEM_BY_ID[it.id] = it; }));
const pad = n => String(n).padStart(2, '0');
const hoy = () => isoDate(new Date());
const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || ''); };
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
let INFS = [], INF = null, saveT = null, estado = 'ok', abiertas = new Set();

/* ---------- almacenamiento ---------- */
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('registro-rp-informes', 1); r.onupgradeneeded = () => r.result.createObjectStore('informes', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
  }));
  const tx = async (modo, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('informes', modo); const o = fn(t.objectStore('informes')); t.oncomplete = () => res(o && o.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return { all: () => tx('readonly', s => s.getAll()), put: x => tx('readwrite', s => s.put(x)), del: id => tx('readwrite', s => s.delete(id)) };
})();
async function cargar() { try { INFS = (await idb.all() || []).sort((a, b) => (b.creado || 0) - (a.creado || 0)); } catch (e) { INFS = []; } renderLista(); if (window.INI_API) INI_API.refrescar(); }
function nuevoId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function guardarYa() {
  if (!INF) return Promise.resolve();
  clearTimeout(saveT); saveT = null;
  INF.guardado = Date.now();
  const copia = JSON.parse(JSON.stringify(INF));
  const i = INFS.findIndex(x => x.id === copia.id); if (i >= 0) INFS[i] = copia; else INFS.unshift(copia);
  estado = 'guardando'; pintaEstado();
  return idb.put(copia).then(() => {
    estado = 'ok'; pintaEstado();
    try { if (typeof copiaAutoDisponible === 'function' && copiaAutoDisponible()) window.AndroidApp.copiaAuto('informe-' + copia.id + '.json', JSON.stringify({app:'registro-rp', version:1, exportado:new Date().toISOString(), informes:[copia]})); } catch (e) {}
  }).catch(() => { estado = 'error'; pintaEstado(); });
}
function guardarPronto() { estado = 'pendiente'; pintaEstado(); clearTimeout(saveT); saveT = setTimeout(guardarYa, 700); }
function pintaEstado() {
  const el = $('#inf-st'); if (!el) return;
  el.textContent = estado === 'ok' ? 'Guardado' : estado === 'error' ? 'No se pudo guardar' : 'Guardando…';
  el.className = 'copia-est ' + (estado === 'ok' ? 'ok' : estado === 'error' ? 'bad' : '');
}

/* ---------- datos del informe ---------- */
const get = id => INF.v[id];
const buscaItem = id => {
  const m = /^(trab|eq)\.\d+\.(.+)$/.exec(id);
  if (m) return ITEM_BY_ID[m[1]].items.find(x => x.id === m[2]) || null;
  return ITEM_BY_ID[id] || null;
};
const set = (id, val) => {
  const it = buscaItem(id);
  if (val === '' && it && it.def) INF.v[id] = '';
  else if (val === '' || val == null || (Array.isArray(val) && !val.length)) delete INF.v[id];
  else INF.v[id] = val;
  guardarPronto();
};
function nuevoInforme(base) {
  const d = new Date(), h = hoy(); const desde = new Date(d.getFullYear(), d.getMonth() - 4, d.getDate() + 1);
  const inf = base ? JSON.parse(JSON.stringify(base)) : {v:{y2:['PRL y SV']}};
  inf.id = nuevoId(); inf.creado = Date.now(); inf.guardado = Date.now(); inf.excl = [];
  inf.desde = isoDate(desde); inf.hasta = h;
  inf.v = inf.v || {};
  inf.contrato = base && base.contrato && base.contrato.id ? {...base.contrato} : snapContrato();
  if (base) {
    inf.titulo = '';
    // al copiar el anterior: el informe anterior pasa a ser el de referencia y se limpia lo propio del periodo
    if (base.v.f_fecha) inf.v.f_ant_fecha = base.v.f_fecha;
    delete inf.v.f_ant_cierre; delete inf.v.x_ensayos; delete inf.v.x_hall;
  }
  inf.v.f_fecha = dmy(h).replace(/\./g, '.');
  return inf;
}
const delCtr = (inf, r) => !(inf.contrato && inf.contrato.id) || !!(r.contrato && r.contrato.id === inf.contrato.id);
function visitasDe(inf) {
  return (typeof HIST !== 'undefined' ? HIST : []).filter(r => r.rp && r.rp.fecha && r.rp.fecha >= inf.desde && r.rp.fecha <= inf.hasta && delCtr(inf, r))
    .sort((a, b) => (a.rp.fecha + (a.rp.hora || '')).localeCompare(b.rp.fecha + (b.rp.hora || '')) || (a.creado || 0) - (b.creado || 0));
}
const incluidas = inf => visitasDe(inf).filter(r => !(inf.excl || []).includes(r.id));
function fotosDe(r) {
  const out = [];
  (r.maquinaria || []).forEach(e => ((r.maqFotos || {})[e] || []).forEach(f => f && f.data && out.push(f.data)));
  quimDe(r).forEach(qq => (qq.fotos || []).forEach(f => f && f.data && out.push(f.data)));
  itemsDe(r).forEach(it => ((r.resp[it.id] || {}).fotos || []).forEach(f => f && f.data && out.push(f.data)));
  return out;
}
const tituloVisita = r => {
  const a = clean((r.rp || {}).actividad); const t = a ? (/^ejecuci[oó]n\b/i.test(a) ? a : 'Ejecución de ' + a) : 'Ejecución de la actividad';
  return `${t.toUpperCase()} (${dmy(r.rp.fecha)}).`;
};
function modelo(inf) {
  let n = 0, nom = 0;
  const ens = String(inf.v.x_ensayos || '').split('\n').map(clean).filter(Boolean).map(x => ({n:++n, x}));
  const vis = incluidas(inf).map(r => {
    const B = (typeof informeDe === 'function') ? informeDe(r) : [];
    const out = []; let modo = 'p';
    for (const b of B) {
      if (b.t === 'h') { modo = /^oportunidades/i.test(b.x) ? 'om' : /^observaciones/i.test(b.x) ? 'obs' : 'p'; continue; }
      if (b.t === 'li') out.push(modo === 'om' ? {t:'om', x:b.x, n:++nom} : {t:'obs', x:b.x, n:++n});
      else if (!/^se adjuntan?\b/i.test(b.x)) out.push({t:'p', x:b.x});
    }
    return {r, titulo: tituloVisita(r), fecha: dmy(r.rp.fecha), act: clean((r.rp || {}).actividad), apt: clean((r.rp || {}).apartado), b: out, fotos: fotosDe(r)};
  });
  return {ens, vis};
}
function hallazgos(m) {
  const L = [];
  m.ens.forEach(o => L.push(`OBS. ${o.n} (Resultado de ensayos): ${o.x}`));
  m.vis.forEach(v => v.b.forEach(b => { if (b.t === 'obs') L.push(`OBS. ${b.n} (${v.fecha}${v.act ? ', ' + v.act : ''}): ${b.x}`); else if (b.t === 'om') L.push(`Oportunidad de mejora ${b.n} (${v.fecha}${v.act ? ', ' + v.act : ''}): ${b.x}`); }));
  return L;
}

/* ---------- interfaz ---------- */
const sel = (v, o) => v === o ? ' is-sel' : '';
function opcionesHtml(it, id, val) {
  if (it.multi) {
    const arr = Array.isArray(val) ? val : [];
    return `<div class="chips">${it.opts.map((o, i) => `<button type="button" class="chip" data-m="${esc(id)}" data-i="${i}" aria-pressed="${arr.includes(o.l)}">${esc(o.l)}</button>`).join('')}</div>`;
  }
  return `<div class="seg iseg" style="grid-template-columns:repeat(${it.opts.length},minmax(0,1fr))">${it.opts.map(o => `<button type="button" data-y="${esc(id)}" data-v="${esc(o.l)}" class="${sel(val, o.l).trim()}" aria-pressed="${val === o.l}">${esc(o.l)}</button>`).join('')}</div>`;
}
function itemHtml(it, pre = '') {
  const id = pre + it.id, val = INF.v[id];
  switch (it.k) {
    case 'yn': return `<div class="iq" data-q="${esc(id)}">${it.q ? `<p class="iq-t">${esc(it.q)}</p>` : ''}${opcionesHtml(it, id, val)}</div>`;
    case 'tx': return `<div class="iq"><label class="iq-t" for="t-${esc(id)}">${esc(it.l)}</label><textarea id="t-${esc(id)}" data-t="${esc(id)}" rows="${it.rows || 3}" placeholder="${esc(it.def ? '' : 'Escribe aquí (puedes dejarlo vacío)')}">${esc(val != null ? val : (it.def || ''))}</textarea></div>`;
    case 'in': return `<div class="iq"><label class="iq-t" for="t-${esc(id)}">${esc(it.l)}</label><input id="t-${esc(id)}" data-t="${esc(id)}" value="${esc(val || '')}" placeholder="${esc(it.ph || '')}"></div>`;
    case 'lines': return `<div class="iq"><label class="iq-t" for="t-${esc(id)}">${esc(it.l)}</label><textarea id="t-${esc(id)}" data-t="${esc(id)}" rows="${it.def ? 8 : 3}">${esc(val != null ? val : (it.def || ''))}</textarea></div>`;
    case 'obs': return `<div class="iq"><label class="iq-t" for="t-${esc(id)}">${esc(it.l)}</label><textarea id="t-${esc(id)}" data-t="${esc(id)}" rows="3">${esc(val || '')}</textarea></div>`;
    case 'hallazgos': return `<div class="iq"><p class="iq-t">Resumen de hallazgos</p><div class="auto-box" id="hall-auto"></div><label class="iq-t" for="t-${esc(id)}">Añadir texto al resumen (opcional)</label><textarea id="t-${esc(id)}" data-t="${esc(id)}" rows="3">${esc(val || '')}</textarea></div>`;
    case 'grid': return `<div class="iq"><p class="iq-t">${esc(it.l)}</p><div class="igrid" style="grid-template-columns:minmax(80px,1.3fr) repeat(${it.cols.length},minmax(0,1fr))"><span></span>${it.cols.map(c => `<b>${esc(c)}</b>`).join('')}${it.rows.map((rw, ri) => `<span>${esc(rw)}</span>${it.cols.map((c, ci) => { const k = `${id}.${ri * it.cols.length + ci}`; return `<input inputmode="decimal" data-t="${esc(k)}" value="${esc(INF.v[k] || '')}" aria-label="${esc(rw + ' · ' + c)}">`; }).join('')}`).join('')}</div></div>`;
    case 'score': return `<div class="iq"><p class="iq-t">Puntuación de cada apartado</p><div class="iscore">${it.rows.map((rw, ri) => { const k = `${id}.${ri}`; return `<label for="t-${esc(k)}">${esc(rw.l)} <i>(0 a ${rw.max})</i></label><input id="t-${esc(k)}" inputmode="numeric" data-sc="${ri}" data-t="${esc(k)}" value="${esc(INF.v[k] || '')}">`; }).join('')}</div><p class="iq-t">Resultado total: <b id="sc-tot">${esc(totalScore(it))}</b></p></div>`;
    case 'auto': return `<div class="iq"><div class="auto-box" data-auto="${esc(it.id)}"></div></div>`;
    case 'dup': return dupHtml(it);
  }
  return '';
}
function totalScore(it) {
  let s = 0, mx = 0;
  it.rows.forEach((rw, ri) => { const v = String(INF.v[`${it.id}.${ri}`] || '').replace(',', '.'); if (v !== '' && !isNaN(+v)) { s += +v; mx += rw.max; } });
  return mx ? `${Math.round(s * 100) / 100}/${mx}` : '—';
}
function nBloques(it) { return Math.max(1, +INF.v[it.id + '.n'] || 1); }
function dupHtml(it) {
  const n = nBloques(it), tr = it.id === 'trab';
  let h = '';
  for (let k = 0; k < n; k++) {
    const pre = `${it.id}.${k}.`;
    h += `<div class="idup"><div class="idup-h"><b>${tr ? 'Trabajador/a' : 'Equipo o vehículo'} ${k + 1}</b>${n > 1 ? `<button type="button" class="mini del" data-dupdel="${esc(it.id)}" data-k="${k}">Quitar</button>` : ''}</div>`
      + `<div class="iq"><label class="iq-t" for="t-${esc(pre)}n">${esc(it.name.l)}</label><input id="t-${esc(pre)}n" data-t="${esc(pre)}n" value="${esc(INF.v[pre + 'n'] || '')}" placeholder="${esc(it.name.ph)}"></div>`
      + it.items.map(x => itemHtml(x, pre)).join('') + '</div>';
  }
  return `<div class="idups" data-dup="${esc(it.id)}">${h}<button type="button" class="addbtn" data-dupadd="${esc(it.id)}"><span class="plus" aria-hidden="true">+</span>${tr ? 'Añadir otro trabajador' : 'Añadir otro equipo o vehículo'}</button></div>`;
}
function contables(it, pre = '') {
  if (it.k === 'yn' && !it.multi) return [pre + it.id];
  if (it.k === 'dup') { const out = []; for (let k = 0; k < nBloques(it); k++) it.items.forEach(x => out.push(...contables(x, `${it.id}.${k}.`))); return out; }
  return [];
}
function progreso(sec) {
  const ids = sec.items.flatMap(it => contables(it));
  return {n: ids.filter(i => INF.v[i]).length, t: ids.length};
}
/* apartado 9: las fechas de revisión pueden salir de Inicio › Revisiones */
function extraSec(sec) {
  if (sec.id !== 's9' || !window.REV_API) return '';
  const n = REV_API.lista().filter(r => (r.inf || []).length).length;
  return `<div class="iq"><div class="rv-ibox"><p><b>Revisiones de las instalaciones.</b> ${n ? `Tienes ${plural(n, 'revisión', 'revisiones')} con casilla en este apartado: sus fechas pueden pasar solas.` : 'Si das de alta tus revisiones en Inicio › Revisiones, sus fechas pasan solas a este apartado.'}</p>${n ? '<button type="button" class="btn" data-ia="revs">Rellenar con mis revisiones</button>' : ''}</div></div>`;
}
function pillSec(sec) {
  const p = progreso(sec); if (!p.t) return '';
  return `<span class="pill${p.n === p.t ? ' ok' : ''}">${p.n}/${p.t}</span>`;
}
function seccionHtml(sec) {
  const abierta = abiertas.has(sec.id);
  return `<details class="block isec" data-sec="${esc(sec.id)}"${abierta ? ' open' : ''}><summary class="bh"><h2>${esc(sec.t)}</h2><span data-pill="${esc(sec.id)}">${pillSec(sec)}</span></summary><div class="isec-b" data-body="${esc(sec.id)}">${abierta ? extraSec(sec) + sec.items.map(x => itemHtml(x)).join('') : ''}</div></details>`;
}
function visitasBoxHtml() {
  const vs = visitasDe(INF), inc = incluidas(INF);
  return `<details class="block isec" data-sec="sv"${abiertas.has('sv') ? ' open' : ''}><summary class="bh"><h2>Visitas del informe</h2><span data-pill="sv"><span class="pill${inc.length ? ' ok' : ''}">${inc.length}/${vs.length}</span></span></summary><div class="isec-b">`
    + `<div class="iq"><p class="help">El informe recoge las visitas guardadas en el Historial entre estas fechas${INF.contrato && INF.contrato.id ? ' del contrato «' + esc(INF.contrato.nombre || 'SIE ' + INF.contrato.sie) + '»' : ''}. Quita las que no quieras incluir.</p><div class="irange"><label>Desde<input type="date" data-r="desde" value="${esc(INF.desde)}"></label><label>Hasta<input type="date" data-r="hasta" value="${esc(INF.hasta)}"></label></div></div>`
    + `<div class="iq" id="vis-lista">${visListaHtml(vs)}</div></div></details>`;
}
function visListaHtml(vs) {
  if (!vs.length) return `<p class="help">No hay visitas guardadas entre esas fechas${INF.contrato && INF.contrato.id ? ' en este contrato' : ''}. Cambia las fechas o guarda alguna visita en el Historial.</p>`;
  return vs.map(r => { const on = !(INF.excl || []).includes(r.id); return `<label class="ivis"><input type="checkbox" data-v-id="${esc(r.id)}"${on ? ' checked' : ''}><span><b>${esc(fmtDate(r.rp.fecha))}</b> · ${esc(clean(r.rp.actividad) || 'Visita')}<i>${esc(clean(r.rp.ubicacion) || '')}</i></span></label>`; }).join('');
}
function pintaAutos() {
  const m = modelo(INF), nf = m.vis.reduce((k, v) => k + v.fotos.length, 0);
  const cuadro = (k, html) => { document.querySelectorAll(`[data-auto="${k}"]`).forEach(e => { e.innerHTML = html; }); };
  const sinV = '<p class="help">Aún no hay visitas elegidas: se rellenará cuando elijas visitas en «Visitas del informe».</p>';
  cuadro('fase', m.vis.length ? '<ul>' + m.vis.map(v => `<li>${esc(v.titulo)}</li>`).join('') + '</ul>' : sinV);
  cuadro('act', m.vis.length ? '<ul>' + m.vis.map(v => `<li>${esc(cap1(v.act) || 'Actividad')}${v.apt ? ` (${esc(v.apt)})` : ''}</li>`).join('') + '</ul>' : sinV);
  cuadro('visitas', m.vis.length ? '<ul>' + m.vis.map(v => `<li>${esc(v.titulo)} <i>${v.b.filter(b => b.t === 'obs').length} OBS</i></li>`).join('') + '</ul><p class="help">El texto de cada visita es el «Informe redactado» del registro. Si quieres cambiarlo, edítalo en el registro (paso Cierre › Editar texto) y vuelve a generar el Word.</p>' : sinV);
  cuadro('fotos', nf ? `<p>${plural(nf, 'foto', 'fotos')} de ${plural(m.vis.filter(v => v.fotos.length).length, 'visita', 'visitas')}.</p>` : '<p class="help">Las visitas elegidas no tienen fotos.</p>');
  const h = hallazgos(m); const ha = $('#hall-auto');
  if (ha) ha.innerHTML = h.length ? '<ul>' + h.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p class="help">Sin hallazgos todavía.</p>';
}
function pintaPills() {
  SECS.forEach(sec => { const e = document.querySelector(`[data-pill="${sec.id}"]`); if (e) e.innerHTML = pillSec(sec); });
  const e = document.querySelector('[data-pill="sv"]'); if (e) { const vs = visitasDe(INF), inc = incluidas(INF); e.innerHTML = `<span class="pill${inc.length ? ' ok' : ''}">${inc.length}/${vs.length}</span>`; }
}
function ctrSelHtml() {
  const cs = perfilGet().contratos, cur = INF.contrato && INF.contrato.id ? INF.contrato : null;
  if (!cs.length && !cur) return '';
  const opts = cs.map(c => [c.id, nombreContrato(c)]);
  if (cur && !opts.some(o => o[0] === cur.id)) opts.push([cur.id, nombreContrato(cur)]);
  return `<div class="field ititle"><label for="inf-ctr">Contrato</label><select id="inf-ctr" data-ctr="1">${cur ? '' : '<option value="">Todos los contratos</option>'}${opts.map(o => `<option value="${esc(o[0])}"${cur && cur.id === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select><p class="help">Solo entran las visitas de este contrato. Su Nº SIE y su objeto salen en la cabecera del Word.</p></div>`;
}
function renderEditor() {
  const c = $('#inf-ed');
  c.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ia="back">‹ Informes</button><span id="inf-st" class="copia-est ok">Guardado</span></div>`
    + `<div class="field ititle"><label for="inf-tt">Nombre del informe</label><input id="inf-tt" data-name="1" value="${esc(INF.titulo || '')}" placeholder="Informe de seguimiento"></div>`
    + ctrSelHtml()
    + visitasBoxHtml() + SECS.map(seccionHtml).join('');
  pintaAutos(); pintaEstado();
  $('#inf-lista').hidden = true; c.hidden = false; $('#inf-bar').hidden = false;
  window.scrollTo({top:0});
}
function renderLista() {
  const L = $('#inf-lista'); if (!L) return;
  const act = window.INI_API ? INI_API.activo() : null;
  const orden = act ? [...INFS.filter(x => x.contrato && x.contrato.id === act.id), ...INFS.filter(x => !(x.contrato && x.contrato.id === act.id))] : INFS;
  const cards = orden.map(x => {
    const vs = incluidas(x).length; const tit = x.titulo || ('Informe de seguimiento ' + (x.v.f_fecha || ''));
    return `<article class="hcard"><div class="hrow"><b>${esc(tit)}</b></div>${x.contrato && x.contrato.id ? `<p class="help hctr-t">${esc(nombreContrato(x.contrato))}</p>` : ''}<p class="help">Visitas del ${esc(fmtDate(x.desde))} al ${esc(fmtDate(x.hasta))} · ${plural(vs, 'visita', 'visitas')}</p><div class="hbtns"><button type="button" class="mini" data-ia="open" data-id="${esc(x.id)}">Abrir</button><button type="button" class="mini" data-ia="word" data-id="${esc(x.id)}">Word</button><button type="button" class="mini" data-ia="dup" data-id="${esc(x.id)}">Duplicar</button><button type="button" class="mini del" data-ia="del" data-id="${esc(x.id)}">Eliminar</button></div></article>`;
  }).join('');
  L.innerHTML = `<div class="hhead"><div class="hhead-t"><h2>Informe de seguimiento</h2><button type="button" class="mini" data-ia="new">+ Nuevo informe</button></div></div>`
    + (cards ? `<div class="hlist">${cards}</div>` : `<p class="help ivacio">Aquí montas el informe cuatrimestral: rellenas cada apartado, las visitas del Historial entran solas y al final sale el Word con el formato de Innovia.</p>`);
}
function volverLista() { guardarYa(); INF = null; abiertas = new Set(); $('#inf-ed').hidden = true; $('#inf-bar').hidden = true; $('#inf-lista').hidden = false; renderLista(); window.scrollTo({top:0}); }

/* ---------- eventos ---------- */
function refrescaItem(id) {
  const q = document.querySelector(`[data-q="${CSS.escape(id)}"]`); if (!q) return;
  q.querySelectorAll('[data-y]').forEach(b => { const on = INF.v[id] === b.dataset.v; b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', on); });
}
async function onClick(e) {
  const t = e.target;
  const y = t.closest('[data-y]');
  if (y) { const id = y.dataset.y, v = y.dataset.v; set(id, INF.v[id] === v ? '' : v); if (typeof vibrar === 'function') vibrar(INF.v[id] ? 'ok' : 'quitar'); refrescaItem(id); pintaPills(); return; }
  const m = t.closest('[data-m]');
  if (m) {
    const id = m.dataset.m; const it = buscaItem(id); const lab = it.opts[+m.dataset.i].l;
    const arr = Array.isArray(INF.v[id]) ? [...INF.v[id]] : []; const i = arr.indexOf(lab); if (i >= 0) arr.splice(i, 1); else arr.push(lab);
    set(id, arr); m.setAttribute('aria-pressed', arr.includes(lab)); return;
  }
  const da = t.closest('[data-dupadd]');
  if (da) { const it = ITEM_BY_ID[da.dataset.dupadd]; INF.v[it.id + '.n'] = nBloques(it) + 1; guardarPronto(); refrescaBody(da.closest('[data-body]')); return; }
  const dd = t.closest('[data-dupdel]');
  if (dd) {
    const it = ITEM_BY_ID[dd.dataset.dupdel], k = +dd.dataset.k, n = nBloques(it);
    if (!(await ask({title:'¿Quitar este bloque?', body:'<p>Se borran sus respuestas.</p>', yes:'Quitar', danger:true}))) return;
    for (let j = k; j < n - 1; j++) { const copy = (suf) => { const a = `${it.id}.${j + 1}.${suf}`, b = `${it.id}.${j}.${suf}`; if (INF.v[a] != null) INF.v[b] = INF.v[a]; else delete INF.v[b]; }; copy('n'); it.items.forEach(x => copy(x.id)); }
    const last = n - 1; delete INF.v[`${it.id}.${last}.n`]; it.items.forEach(x => delete INF.v[`${it.id}.${last}.${x.id}`]);
    INF.v[it.id + '.n'] = n - 1; guardarPronto(); refrescaBody(dd.closest('[data-body]')); return;
  }
  const a = t.closest('[data-ia]');
  if (a) accion(a.dataset.ia, a.dataset.id);
}
function refrescaBody(body) { if (!body) return; const sec = SECS.find(s => s.id === body.dataset.body); body.innerHTML = extraSec(sec) + sec.items.map(x => itemHtml(x)).join(''); pintaAutos(); pintaPills(); }
function onInput(e) {
  const t = e.target;
  if (t.dataset.name) { INF.titulo = t.value; guardarPronto(); return; }
  if (t.dataset.t) {
    set(t.dataset.t, t.value);
    if (t.dataset.sc != null) { const it = ITEM_BY_ID.sc; const e2 = $('#sc-tot'); if (e2) e2.textContent = totalScore(it); }
    if (t.dataset.t === 'x_ensayos' || t.dataset.t === 'x_hall') pintaAutos();
  }
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.ctr) { const c = contratoPorId(t.value); INF.contrato = c ? snapContrato(c) : (INF.contrato && INF.contrato.id === t.value ? INF.contrato : null); INF.excl = []; guardarPronto(); $('#vis-lista').innerHTML = visListaHtml(visitasDe(INF)); const h = document.querySelector('[data-sec="sv"] .help'); if (h) h.outerHTML = visitasBoxHtml().match(/<p class="help">.*?<\/p>/)[0]; pintaAutos(); pintaPills(); return; }
  if (t.dataset.r) { INF[t.dataset.r] = t.value; guardarPronto(); $('#vis-lista').innerHTML = visListaHtml(visitasDe(INF)); pintaAutos(); pintaPills(); return; }
  if (t.dataset.vId) { const ex = new Set(INF.excl || []); if (t.checked) ex.delete(t.dataset.vId); else ex.add(t.dataset.vId); INF.excl = [...ex]; guardarPronto(); pintaAutos(); pintaPills(); }
}
function onToggle(e) {
  const d = e.target.closest ? e.target.closest('details.isec') : null; if (!d || e.target !== d) return;
  const id = d.dataset.sec;
  if (d.open) {
    abiertas.add(id);
    const sec = SECS.find(s => s.id === id), body = d.querySelector('[data-body]');
    if (sec && body && !body.children.length) { body.innerHTML = extraSec(sec) + sec.items.map(x => itemHtml(x)).join(''); pintaAutos(); }
  } else abiertas.delete(id);
}
async function accion(a, id) {
  if (a === 'back') { volverLista(); return; }
  if (a === 'revs') {
    if (!window.REV_API || !INF) return;
    const r = REV_API.paraInforme(INF);
    if (!r.n) { await ask({title:'Nada que rellenar', body:`<p>No hay revisiones${INF.contrato && INF.contrato.id ? ' de este contrato' : ''} con casilla del informe y hechas antes del ${esc(fmtDate(INF.hasta || hoy()))}.</p>`, yes:'Entendido', single:true}); return; }
    if (!(await ask({title:'¿Rellenar con tus revisiones?', body:r.html, yes:'Rellenar'}))) return;
    Object.entries(r.vals).forEach(([k, v]) => set(k, v));
    refrescaBody(document.querySelector('[data-body="s9"]')); pintaPills();
    toast('Apartado 9 rellenado con tus revisiones.');
    return;
  }
  if (a === 'new') {
    let base = null;
    if (INFS.length) { const r = await ask({title:'Nuevo informe', body:'<p>¿Quieres empezar con las respuestas del informe anterior? Es lo más cómodo si casi todo se repite: luego solo cambias lo que haya cambiado.</p>', yes:'Copiar el anterior', no:'Empezar en blanco'}); if (r === null) return; if (r === true) { const act = window.INI_API ? INI_API.activo() : null; base = (act && INFS.find(x => x.contrato && x.contrato.id === act.id)) || INFS[0]; } }
    INF = nuevoInforme(base); await guardarYa(); renderEditor(); return;
  }
  const x = INFS.find(z => z.id === id);
  if (a === 'open' && x) { INF = JSON.parse(JSON.stringify(x)); renderEditor(); return; }
  if (a === 'dup' && x) { INF = nuevoInforme(x); await guardarYa(); await cargar(); toast('Informe duplicado.'); INF = null; return; }
  if (a === 'del' && x) { if (await ask({title:'¿Eliminar el informe?', body:'<p>Las visitas del Historial no se tocan.</p>', yes:'Eliminar', danger:true})) { await idb.del(x.id); await cargar(); toast('Informe eliminado.'); } return; }
  if (a === 'word') { if (x) { INF = JSON.parse(JSON.stringify(x)); } await generar(); if (x) INF = null; return; }
}
function pendientes() {
  let n = 0, t = 0; SECS.forEach(s => { const p = progreso(s); n += p.n; t += p.t; }); return {n, t};
}

/* ---------- Word ---------- */
const parseFrag = xml => new DOMParser().parseFromString(`<root ${NSD}>${xml}</root>`, 'application/xml').documentElement.firstElementChild;
const kids = (el, tag) => [...el.children].filter(c => c.namespaceURI === W && c.localName === tag);
const qa = (el, tag) => [...el.getElementsByTagNameNS(W, tag)];
const stripIds = el => { el.querySelectorAll('*').forEach(n => { ['w14:paraId', 'w14:textId'].forEach(a => { try { n.removeAttribute(a); } catch (_) {} }); }); if (el.removeAttribute) { el.removeAttribute('w14:paraId'); el.removeAttribute('w14:textId'); } return el; };
const tNodes = p => qa(p, 't');
const ptext = p => tNodes(p).map(t => t.textContent).join('');
const setT = (t, s) => { t.textContent = s; t.setAttributeNS(XMLNS, 'xml:space', 'preserve'); };
function newRun(doc, p, txt) {
  const runs = kids(p, 'r'); const base = runs[runs.length - 1];
  const r = doc.createElementNS(W, 'w:r');
  let rpr = base && kids(base, 'rPr')[0];
  if (!rpr) { const ppr = kids(p, 'pPr')[0]; rpr = ppr && kids(ppr, 'rPr')[0]; }
  if (rpr) { const c = rpr.cloneNode(true); kids(c, 'b').concat(kids(c, 'bCs'), kids(c, 'i')).forEach(n => n.remove()); r.appendChild(c); }
  const t = doc.createElementNS(W, 'w:t'); setT(t, txt); r.appendChild(t); p.appendChild(r); return r;
}
function replaceRange(doc, p, start, end, txt) {
  const ts = tNodes(p);
  if (!ts.length) { newRun(doc, p, txt); return; }
  let pos = 0, placed = false;
  for (let k = 0; k < ts.length; k++) {
    const t = ts[k], s = t.textContent, a = pos, b = pos + s.length; pos = b;
    if (!placed) {
      if (start < b || k === ts.length - 1) {
        const from = Math.min(Math.max(start - a, 0), s.length), to = Math.max(from, Math.min(end, b) - a);
        setT(t, s.slice(0, from) + txt + s.slice(to)); placed = true;
      }
    } else { const ls = Math.max(start, a), le = Math.min(end, b); if (ls < le) setT(t, s.slice(0, ls - a) + s.slice(le - a)); }
  }
}
const setAll = (doc, p, txt) => replaceRange(doc, p, 0, ptext(p).length, txt);
/* párrafo nuevo a partir de un modelo, con solo el texto indicado */
function mkPar(doc, proto, txt) {
  const p = stripIds(proto.cloneNode(true)); const runs = kids(p, 'r');
  runs.slice(0, -1).forEach(r => r.remove());
  const last = runs[runs.length - 1];
  if (last) { kids(last, 't').slice(1).forEach(n => n.remove()); qa(last, 'br').forEach(n => n.remove()); const t = kids(last, 't')[0]; if (t) setT(t, txt); else { const tt = doc.createElementNS(W, 'w:t'); setT(tt, txt); last.appendChild(tt); } }
  else if (txt) newRun(doc, p, txt);
  return p;
}
function mkObs(doc, proto, etiqueta, txt) {
  const p = stripIds(proto.cloneNode(true)); const runs = kids(p, 'r');
  const tieneB = r => kids(r, 'rPr')[0] && kids(kids(r, 'rPr')[0], 'b').length;
  let lab = runs.find(tieneB), cuerpo = runs.find(r => !tieneB(r));
  if (!cuerpo && lab) { cuerpo = lab.cloneNode(true); const rp = kids(cuerpo, 'rPr')[0]; kids(rp, 'b').concat(kids(rp, 'bCs')).forEach(n => n.remove()); p.appendChild(cuerpo); }
  runs.forEach(r => { if (r !== lab && r !== cuerpo) r.remove(); });
  if (lab) { kids(lab, 't').slice(1).forEach(n => n.remove()); setT(kids(lab, 't')[0], etiqueta); }
  if (cuerpo) { kids(cuerpo, 't').slice(1).forEach(n => n.remove()); setT(kids(cuerpo, 't')[0], ' ' + txt); }
  if (lab && cuerpo && lab.compareDocumentPosition(cuerpo) & Node.DOCUMENT_POSITION_PRECEDING) p.insertBefore(lab, cuerpo);
  return p;
}
const imgDims = src => new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth || 4, i.naturalHeight || 3]); i.onerror = () => res([4, 3]); i.src = src; });
async function generarDocx(inf, m) {
  if (typeof JSZip === 'undefined') throw new Error('Falta JSZip');
  const zip = await JSZip.loadAsync(INF_TPL, {base64:true});
  const xml = await zip.file('word/document.xml').async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const v = inf.v;
  /* referencias a nodos (se resuelven todas antes de tocar nada) */
  const resolver = path => {
    let el = body;
    for (const part of path.split('.')) {
      const mm = /^([a-z])(\d+)$/.exec(part), k = mm[1], n = +mm[2];
      if (k === 'r') el = kids(el, 'tr')[n]; else if (k === 'c') el = kids(el, 'tc')[n]; else el = el.children[n];
      if (!el) return null;
    }
    return el;
  };
  const cache = new Map();
  const paths = new Set();
  const addPath = p => { if (p) paths.add(p); };
  SECS.forEach(s => s.items.forEach(it => { addPath(it.p); addPath(it.last); (it.cont || []).forEach(addPath); (it.cells || []).forEach(addPath); (Array.isArray(it.rows) ? it.rows : []).forEach(rw => addPath(rw && rw.p)); addPath(it.tot); addPath(it.tbl); }));
  ['t3.r0.c0', 't3.r0.c0.p1', 't6.r0.c0', 't6.r0.c0.p2', 't23.r0.c0', 't23.r0.c0.p2', 'p77', 'p78', 't64.r29.c0'].forEach(addPath);
  paths.forEach(p => cache.set(p, resolver(p)));
  const R = p => cache.get(p);
  const cbs = qa(doc, 'checkBox');
  const marca = (cb, on) => { const d = kids(cb, 'default')[0]; if (d) d.setAttributeNS(W, 'w:val', on ? '1' : '0'); };
  const prot = {}; Object.keys(INF_PROTOS).forEach(k => { prot[k] = parseFrag(INF_PROTOS[k]); });

  /* marcar casillas y completar textos de un conjunto de elementos */
  const aplicarItem = (it, pre, ctx) => {
    const id = pre + it.id, val = v[id];
    const P = ctx.P;
    if (it.k === 'yn') {
      it.opts.forEach((o, i) => { const cb = ctx.cb(o); if (!cb) return; marca(cb, it.multi ? (Array.isArray(val) && val.includes(o.l)) : val === o.l); });
    } else if (it.k === 'tx') {
      const p = P(it.p); if (!p) return;
      const txt = val != null ? val : (it.def || '');
      const lines = String(txt).split('\n').map(s => s.trim()).filter(Boolean);
      const cont = (it.cont || []).map(P).filter(Boolean);
      const lab = it.lab ? new RegExp(it.lab).exec(ptext(p)) : null; const L = lab ? lab[0].length : 0;
      if (!it.lab) {
        // el párrafo entero es el texto
        const nuevos = lines.map(l => mkPar(doc, p, l));
        if (!nuevos.length) { setAll(doc, p, ''); }
        else { nuevos.forEach(n => p.parentNode.insertBefore(n, p)); p.remove(); }
      } else {
        replaceRange(doc, p, L, ptext(p).length, lines[0] || '');
        let ref = p; const modelo = cont[0] || p;
        lines.slice(1).forEach(l => { const n = mkPar(doc, modelo, l); ref.parentNode.insertBefore(n, ref.nextSibling); ref = n; });
        cont.forEach(c => c.remove());
      }
    } else if (it.k === 'in') {
      const p = P(it.p); if (!p) return;
      const txt = ptext(p), mm = new RegExp(it.re).exec(txt); if (!mm) return;
      const gi = mm[0].indexOf(mm[1]); const s = mm.index + (gi >= 0 ? gi : 0), e = s + mm[1].length;
      let nv = (val != null ? String(val).trim() : ''); if (it.wrap && nv && !/^\(/.test(nv)) nv = '(' + nv + ')';
      if (nv === '' && txt[s - 1] === '(' && txt[e] === ')') replaceRange(doc, p, Math.max(0, s - 2 >= 0 && txt[s - 2] === ' ' ? s - 2 : s - 1), e + 1, '');
      else replaceRange(doc, p, s, e, nv);
    } else if (it.k === 'grid') {
      it.cells.forEach((cp, i) => { const p = R(cp); if (p) setAll(doc, p, String(v[`${id}.${i}`] || '')); });
    } else if (it.k === 'score') {
      it.rows.forEach((rw, i) => { const p = R(rw.p); if (p) setAll(doc, p, String(v[`${id}.${i}`] || '')); });
      const p = R(it.tot); if (p) { const tt = totalScore({id: it.id, rows: it.rows}); setAll(doc, p, tt === '—' ? '' : tt); }
    } else if (it.k === 'lines') {
      const p = P(it.p); if (!p) return; const last = it.last ? P(it.last) : p;
      const txt = val != null ? val : (it.def || '');
      const lines = String(txt).split('\n').map(s => s.trim()).filter(Boolean);
      const sibs = []; for (let e = p; e; e = e.nextElementSibling) { sibs.push(e); if (e === last) break; }
      const nuevos = lines.map(l => mkPar(doc, p, (it.pref || '') + l.replace(/^[-•]\s*/, '')));
      if (!nuevos.length) { setAll(doc, p, it.pref ? it.pref.trim() : ''); sibs.slice(1).forEach(e => e.remove()); }
      else { nuevos.forEach(n => p.parentNode.insertBefore(n, p)); sibs.forEach(e => e.remove()); }
    } else if (it.k === 'obs') {
      const p = P(it.p); if (!p) return;
      const nuevos = m.ens.map(o => mkObs(doc, p, `OBS. ${o.n}`, o.x));
      if (nuevos.length) { nuevos.forEach(n => p.parentNode.insertBefore(n, p)); p.remove(); } else setAll(doc, p, '');
    }
  };
  const ctxGlobal = { P: R, cb: o => cbs[o.cb] };
  SECS.forEach(s => s.items.forEach(it => {
    if (it.k === 'dup') return;
    if (it.k === 'auto' || it.k === 'hallazgos') return;
    aplicarItem(it, '', ctxGlobal);
  }));

  /* bloques repetibles: trabajadores y equipos */
  SECS.forEach(s => s.items.forEach(it => {
    if (it.k !== 'dup') return;
    const tbl = R(it.tbl); const rows = kids(tbl, 'tr');
    const bloqueA = rows.slice(0, it.nrows), bloqueB = rows.slice(it.nrows, it.nrows * 2), ancla = rows[it.nrows * 2];
    const modelo = bloqueA.map(r => r.cloneNode(true));
    const n = nBloques(it);
    for (let k = 0; k < n; k++) {
      const cl = modelo.map(r => stripIds(r.cloneNode(true)));
      cl.forEach(r => tbl.insertBefore(r, ancla));
      const cbl = cl.flatMap(r => qa(r, 'checkBox'));
      const rel = path => { let el = null; path.split('.').forEach((part, i) => { const mm = /^([a-z])(\d+)$/.exec(part), kk = mm[1], nn = +mm[2]; if (i === 0) el = cl[nn]; else if (kk === 'c') el = kids(el, 'tc')[nn]; else el = el.children[nn]; }); return el; };
      const pre = `${it.id}.${k}.`;
      const ctx = { P: rel, cb: o => cbl[o.lc] };
      // nombre
      const np = rel(it.name.p); const tx = ptext(np), mm = new RegExp(it.name.re).exec(tx);
      const nom = String(v[pre + 'n'] || '').trim();
      if (mm) { const gi = mm[0].indexOf(mm[1]); const s0 = mm.index + gi; replaceRange(doc, np, s0, s0 + mm[1].length, nom.toUpperCase()); }
      it.items.forEach(x => aplicarItem(x, pre, ctx));
    }
    bloqueA.concat(bloqueB).forEach(r => r.remove());
  }));

  /* cabecera: bloque de visitas */
  const vis = m.vis;
  // 1. fase
  {
    const celda = R('t3.r0.c0'), ph = R('t3.r0.c0.p1');
    vis.forEach(x => celda.insertBefore(mkPar(doc, prot.fase, x.titulo), ph));
    if (vis.length) ph.remove();
  }
  // 2.1 actividades
  {
    const ph = R('t6.r0.c0.p2'), celda = R('t6.r0.c0');
    vis.forEach(x => celda.insertBefore(mkPar(doc, prot.act, `${cap1(x.act) || 'Actividad'}.${x.apt ? ' (' + x.apt + ')' : ''}`), ph));
    if (vis.length) ph.remove();
  }
  // 3.1 texto de cada visita
  {
    const celda = R('t23.r0.c0'), ph = R('t23.r0.c0.p2');
    vis.forEach((x, i) => {
      celda.insertBefore(mkPar(doc, prot.vtitle, x.titulo), ph);
      x.b.forEach(b => {
        if (b.t === 'p') celda.insertBefore(mkPar(doc, prot.vbody, b.x), ph);
        else if (b.t === 'obs') celda.insertBefore(mkObs(doc, prot.vobs, `OBS. ${b.n}`, b.x), ph);
        else celda.insertBefore(mkObs(doc, prot.vobs, `Oportunidad de mejora ${b.n}.`, b.x), ph);
      });
      if (i < vis.length - 1) celda.insertBefore(mkPar(doc, prot.vblank, ''), ph);
    });
    if (vis.length) ph.remove();
  }
  // resumen de hallazgos
  {
    const hp = R('t64.r29.c0.p1'); const celda = R('t64.r29.c0');
    const L = hallazgos(m); const extra = String(v.x_hall || '').split('\n').map(s => s.trim()).filter(Boolean);
    let ref = hp;
    L.concat(extra).forEach(l => { const n = mkPar(doc, prot.vbody, l); ref.parentNode.insertBefore(n, ref.nextSibling); ref = n; });
  }
  // fecha de cabecera ya se aplica como 'in'
  /* reportaje fotográfico */
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  let relsNuevas = '', nImg = 0, idDraw = 5000; const exts = new Set();
  const marcador = R('p78');
  for (const x of vis) {
    if (!x.fotos.length) continue;
    body.insertBefore(mkPar(doc, prot.ftitle, x.titulo), marcador);
    body.insertBefore(stripIds(prot.fgap.cloneNode(true)), marcador);
    let fila = null, enFila = 0;
    for (const data of x.fotos) {
      const mm = /^data:image\/(png|jpe?g|gif);base64,(.*)$/s.exec(data); if (!mm) continue;
      const ext = mm[1] === 'jpeg' ? 'jpg' : mm[1]; exts.add(ext);
      const [iw, ih] = await imgDims(data);
      const MAXW = 3000000, MAXH = 3200000; const esc_ = Math.min(MAXW / iw, MAXH / ih);
      const cx = Math.round(iw * esc_), cy = Math.round(ih * esc_);
      nImg++; idDraw++; const rid = 'rIdInf' + nImg, nombre = `media/inf${nImg}.${ext}`;
      zip.file('word/' + nombre, mm[2], {base64:true});
      relsNuevas += `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${nombre}"/>`;
      let dr = INF_PROTOS.fdraw
        .replace(/<wp:extent [^>]*\/>/, `<wp:extent cx="${cx}" cy="${cy}"/>`)
        .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${cx}" cy="${cy}"/>`)
        .replace(/<wp:docPr [^>]*\/>/, `<wp:docPr id="${idDraw}" name="Imagen ${nImg}"/>`)
        .replace(/<pic:cNvPr [^>]*\/>/, `<pic:cNvPr id="${idDraw}" name="inf${nImg}"/>`)
        .replace(/r:embed="[^"]*"/, `r:embed="${rid}"`)
        .replace(/<a:effectLst>.*?<\/a:effectLst>/, '');
      const run = parseFrag(`<w:r><w:rPr><w:noProof/></w:rPr>${dr}</w:r>`);
      if (!fila || enFila >= 2) { fila = stripIds(prot.fpar.cloneNode(true)); kids(fila, 'r').forEach(r => r.remove()); body.insertBefore(fila, marcador); enFila = 0; }
      fila.appendChild(doc.importNode(run, true)); enFila++;
    }
    body.insertBefore(stripIds(prot.fgap.cloneNode(true)), marcador);
  }
  marcador.remove();
  /* fecha de la cabecera de página */
  const fe = String(v.f_fecha || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})/);
  if (fe) {
    const f2 = `${pad(+fe[1])}.${pad(+fe[2])}.${fe[3].length === 2 ? '20' + fe[3] : fe[3]}`;
    for (const nom of Object.keys(zip.files).filter(n => /^word\/header\d+\.xml$/.test(n))) {
      const hx = await zip.file(nom).async('string');
      if (!/\d{2}\.\d{2}\.\d{4}/.test(hx)) continue;
      const hd = new DOMParser().parseFromString(hx, 'application/xml');
      qa(hd, 'p').forEach(pp => { const tx = ptext(pp), mm = /\d{2}\.\d{2}\.\d{4}/.exec(tx); if (mm) replaceRange(hd, pp, mm.index, mm.index + mm[0].length, f2); });
      let hs = new XMLSerializer().serializeToString(hd);
      if (!/^<\?xml/.test(hs)) hs = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + hs;
      zip.file(nom, hs);
    }
  }
  /* contrato: Nº SIE de la cabecera y objeto (O/S/M) */
  const ctr = inf.contrato && inf.contrato.id ? (contratoPorId(inf.contrato.id) || inf.contrato) : null;
  if (ctr && ctr.osm) {
    const pp = qa(doc, 'p').find(x => /^\s*O\/\s*S\s*\/\s*M\s*:/.test(ptext(x)));
    if (pp) { const tx = ptext(pp), mm = /^\s*O\/\s*S\s*\/\s*M\s*:\s*/.exec(tx); if (mm && tx.length > mm[0].length) replaceRange(doc, pp, mm[0].length, tx.length, ctr.osm); }
  }
  if (ctr && ctr.sie) {
    for (const nom of Object.keys(zip.files).filter(n => /^word\/header\d+\.xml$/.test(n))) {
      const hx = await zip.file(nom).async('string');
      if (!/SIE:/.test(hx)) continue;
      const hd = new DOMParser().parseFromString(hx, 'application/xml');
      qa(hd, 'p').forEach(pp => { const tx = ptext(pp), mm = /(SIE:\s*)(\d+)/.exec(tx); if (mm) replaceRange(hd, pp, mm.index + mm[1].length, mm.index + mm[0].length, ctr.sie); });
      let hs = new XMLSerializer().serializeToString(hd);
      if (!/^<\?xml/.test(hs)) hs = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + hs;
      zip.file(nom, hs);
    }
  }
  /* empaquetar */
  let salida = new XMLSerializer().serializeToString(doc);
  if (!/^<\?xml/.test(salida)) salida = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + salida;
  zip.file('word/document.xml', salida);
  zip.file('word/_rels/document.xml.rels', rels.replace('</Relationships>', relsNuevas + '</Relationships>'));
  let ct = await zip.file('[Content_Types].xml').async('string');
  exts.forEach(e => { if (!new RegExp(`Extension="${e}"`, 'i').test(ct)) ct = ct.replace('<Default ', `<Default Extension="${e}" ContentType="image/${e === 'jpg' ? 'jpeg' : e}"/><Default `); });
  zip.file('[Content_Types].xml', ct);
  return zip.generateAsync({type:'blob', mimeType:DOCX, compression:'DEFLATE'});
}
async function generar() {
  if (!INF) return;
  const p = pendientes();
  const m = modelo(INF);
  const avisos = [];
  if (!m.vis.length) avisos.push('No hay visitas elegidas: las secciones de visitas y el reportaje fotográfico saldrán vacíos.');
  if (p.t - p.n > 0) avisos.push(`Quedan ${plural(p.t - p.n, 'pregunta', 'preguntas')} sin responder (en el Word saldrán sin marcar).`);
  if (avisos.length) { const r = await ask({title:'Antes de generar el Word', body: avisos.map(a => `<p>${esc(a)}</p>`).join(''), yes:'Generar igualmente', no:'Seguir rellenando'}); if (!r) return; }
  toast('Generando el Word…');
  try {
    await guardarYa();
    const blob = await generarDocx(INF, m);
    const f = String(INF.v.f_fecha || dmy(hoy())).replace(/[^\d.]/g, '') || dmy(hoy());
    const nombre = `Informe de seguimiento ${f}.docx`;
    const msg = `Informe de seguimiento del ${f}.\nIncluye ${plural(m.vis.length, 'visita', 'visitas')} del ${fmtDate(INF.desde)} al ${fmtDate(INF.hasta)}.`;
    await entregar(blob, nombre, 'Informe de seguimiento', msg);
  } catch (e) { console.error(e); toast('No se pudo generar el Word.'); }
}

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-inf'; main.setAttribute('role', 'tabpanel'); main.setAttribute('aria-labelledby', 'tab-inf'); main.hidden = true;
  main.innerHTML = '<div id="inf-lista"></div><div id="inf-ed" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  const bar = document.createElement('div'); bar.className = 'ibar'; bar.id = 'inf-bar'; bar.hidden = true;
  bar.innerHTML = '<button type="button" class="btn primary" data-ia="word-act">Generar el Word</button>';
  document.body.appendChild(bar);
  const tab = document.createElement('button');
  tab.className = 'tab'; tab.setAttribute('role', 'tab'); tab.id = 'tab-inf'; tab.setAttribute('aria-selected', 'false'); tab.setAttribute('aria-controls', 'view-inf');
  tab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5"/><path d="M10 16h5"/></svg><span>Informe</span>';
  $('#tab-hist').parentNode.insertBefore(tab, $('#tab-hist'));
  tab.addEventListener('click', () => { showTab('inf'); renderLista(); });
  main.addEventListener('click', onClick); main.addEventListener('input', onInput); main.addEventListener('change', onChange);
  main.addEventListener('toggle', onToggle, true);
  bar.addEventListener('click', e => { if (e.target.closest('[data-ia="word-act"]')) generar(); });
  cargar();
}
window.INF_API = {
  lista: () => INFS,
  async importar(arr) { for (const x of arr) await idb.put(x); await cargar(); },
  guardado: () => INFS.length,
  /* el primer contrato se queda con los informes que no tenían; al editar un contrato se actualiza su nombre */
  async asignarContrato(snap, soloMismo) {
    const cambia = INFS.filter(x => soloMismo ? (x.contrato && x.contrato.id === snap.id) : !(x.contrato && x.contrato.id));
    for (const x of cambia) { x.contrato = {...snap}; await idb.put(x); }
    if (INF && cambia.some(x => x.id === INF.id)) INF.contrato = {...snap};
    if (cambia.length) await cargar();
  },
  refrescar() { if (!INF) renderLista(); },
  atras() { const v = $('#view-inf'); if (v && !v.hidden && INF) { volverLista(); return true; } return false; },
  onTab(t) { const b = $('#inf-bar'); if (b) b.hidden = !(t === 'inf' && INF); }
};
if (/[?&]test\b/.test(location.search)) window.__t = {hdb, toLocal, getS: () => S, loadHist, getHIST: () => HIST};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
