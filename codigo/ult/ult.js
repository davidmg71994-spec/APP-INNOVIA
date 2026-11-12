/* ================= Últimas fechas (1.30.0) =================
   Junto al calendario: cuándo se hizo por última vez cada charla de sensibilización, formación periódica, simulacro y
   comité/comisión, por contrato. Cada cosa se anota el día que se hace (fecha, tema, contrato, asistentes, notas) y la
   tarjeta dice la última fecha, cuánto hace y, si se elige «Avisar cada…», cuándo toca la próxima. */
(() => {
const ULT_TIPOS = [
  {k:'charla', t:'Charlas de sensibilización', u:'charla de sensibilización', ph:'Ej.: Riesgo de atropello en obras de carretera', ic:'<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'},
  {k:'form', t:'Formación periódica', u:'formación', ph:'Ej.: Reciclaje de trabajos en altura', ic:'<path d="M3 8.5L12 4l9 4.5-9 4.5z"/><path d="M7 10.6V15c1.4 1.4 3 2 5 2s3.6-.6 5-2v-4.4M21 8.5V14"/>'},
  {k:'sim', t:'Simulacros', u:'simulacro', ph:'Ej.: Simulacro de accidente en tajo con evacuación', ic:'<path d="M12 3c1.5 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1 2.5 2 3 0-3 .5-5.5 1-7.5z"/>'},
  {k:'com', t:'Comités y comisiones', u:'comité o comisión', ph:'Ej.: Comité de Seguridad y Salud, 3.er trimestre', ic:'<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3.5 18c.6-3 2.4-4.6 4.5-4.6S11.9 15 12.5 18M11.5 18c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6"/>'}
];
const ULT_CADA = [[0, 'No avisar'], [1, 'Cada mes'], [2, 'Cada 2 meses'], [3, 'Cada 3 meses'], [6, 'Cada 6 meses'], [12, 'Cada año']];
const CADA_DEF = {charla:0, form:0, sim:12, com:3};
const SVGi = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I_OK = SVGi('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), I_BAD = SVGi('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>'), I_RELOJ = SVGi('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>');
const pad2 = n => String(n).padStart(2, '0');
const hoy = () => isoDate(new Date());
const tipo = k => ULT_TIPOS.find(x => x.k === k) || ULT_TIPOS[0];
let ACTS = [], ED = null, fctr = null, listo = false;

/* ---------- datos ---------- */
const udb = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('registro-rp-ult', 1); r.onupgradeneeded = () => r.result.createObjectStore('acts', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  }));
  const tx = (m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('acts', m); const out = f(t.objectStore('acts')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return {all: () => tx('readonly', s => s.getAll()), put: o => tx('readwrite', s => s.put(o)), del: id => tx('readwrite', s => s.delete(id))};
})();
async function cargar() { try { ACTS = (await udb.all()) || []; } catch (e) { ACTS = []; } listo = true; }
const nid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function cadaDe(k) { try { const o = JSON.parse(lsGet('ult-cada') || '{}'); return k in o ? +o[k] || 0 : CADA_DEF[k] || 0; } catch (e) { return CADA_DEF[k] || 0; } }
function ponCada(k, n) { let o = {}; try { o = JSON.parse(lsGet('ult-cada') || '{}') || {}; } catch (e) {} o[k] = n; lsSet('ult-cada', JSON.stringify(o)); }
/* mismo día n meses después (si no existe, el último del mes) */
function masMeses(f, n) {
  const [y, m, d] = f.split('-').map(Number), t = new Date(y, m - 1 + n, 1), dm = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(Math.min(d, dm))}`;
}
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
function haceTxt(f) {
  const d = diasEntre(f, hoy());
  if (d < 0) return 'dentro de ' + plural(-d, 'día', 'días');
  if (d === 0) return 'hoy'; if (d === 1) return 'ayer';
  if (d < 45) return 'hace ' + d + ' días';
  const m = Math.round(d / 30.44); if (m < 18) return 'hace ' + plural(m, 'mes', 'meses');
  return 'hace ' + (Math.round(d / 365.25 * 10) / 10).toString().replace('.', ',') + ' años';
}
const activoId = () => { const p = perfilGet(); return p.activo && p.contratos.some(c => c.id === p.activo) ? p.activo : ''; };
const snap = c => c ? {id:c.id, nombre:c.nombre || '', sie:c.sie || ''} : null;
const ctrNom = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : 'Sin contrato';
const delFiltro = (a, f) => !f ? true : f === '-' ? !(a.ctr && a.ctr.id) : !!(a.ctr && a.ctr.id === f);

/* estado de un tipo para un filtro de contrato */
function estadoDe(k, f) {
  const l = ACTS.filter(a => a.k === k && delFiltro(a, f)).sort((a, b) => b.f.localeCompare(a.f) || (b.creado || 0) - (a.creado || 0));
  const cada = cadaDe(k), u = l[0] || null, h = hoy();
  let est = 'neutro', prox = '';
  if (cada && u) { prox = masMeses(u.f, cada); est = prox < h ? 'bad' : diasEntre(h, prox) <= 30 ? 'warn' : 'ok'; }
  else if (cada) est = 'nada';
  return {k, l, u, cada, prox, est, anio:l.filter(a => a.f.startsWith(h.slice(0, 4))).length};
}

/* ---------- pantalla ---------- */
function vista(q) { const m = $('#ult-main'), fo = $('#ult-form'); if (m) m.hidden = q !== 'main'; if (fo) fo.hidden = q !== 'form'; }
function filtroHtml() {
  const cs = perfilGet().contratos, sin = ACTS.some(a => !(a.ctr && a.ctr.id));
  if (cs.length < 2 && !sin) return '';
  const o = (id, t) => `<option value="${esc(id)}"${fctr === id ? ' selected' : ''}>${esc(t)}</option>`;
  return `<label class="ult-fc"><span>Contrato</span><select id="ult-fc">${o('', 'Todos')}${cs.map(c => o(c.id, ctrNom(c))).join('')}${sin ? o('-', 'Sin contrato') : ''}</select></label>`;
}
function tarjeta(T) {
  const e = estadoDe(T.k, fctr), u = e.u;
  const cadaTxt = (ULT_CADA.find(x => x[0] === e.cada) || [0, ''])[1].toLowerCase();
  const est = e.est === 'bad' ? `<p class="ult-est bad">${I_BAD}<span>Toca ya: tocaba el ${esc(fmtDate(e.prox))} (${cadaTxt})</span></p>`
    : e.est === 'warn' ? `<p class="ult-est warn">${I_RELOJ}<span>Toca antes del ${esc(fmtDate(e.prox))} (${cadaTxt})</span></p>`
    : e.est === 'ok' ? `<p class="ult-est ok">${I_OK}<span>Al día · la próxima antes del ${esc(fmtDate(e.prox))}</span></p>`
    : e.est === 'nada' ? `<p class="ult-est warn">${I_RELOJ}<span>Sin anotar todavía (${cadaTxt})</span></p>` : '';
  const filas = e.l.map(a => `<li><button type="button" class="ult-fila" data-ult-edit="${esc(a.id)}"><b>${esc(fmtDate(a.f))}</b><span>${esc([a.t, !fctr && a.ctr && a.ctr.id ? ctrNom(a.ctr) : '', a.n ? plural(+a.n, 'asistente', 'asistentes') : ''].filter(Boolean).join(' · ') || 'Sin tema')}</span></button></li>`).join('');
  return `<section class="ult-card ult-k-${T.k} st-${e.est}" id="ultc-${T.k}" aria-labelledby="ult-h-${T.k}">
    <header class="ult-ch"><span class="ult-ic" aria-hidden="true">${SVGi(T.ic)}</span><h3 id="ult-h-${T.k}">${esc(T.t)}</h3>${e.anio ? `<span class="ult-cnt">${plural(e.anio, 'vez', 'veces')} este año</span>` : ''}</header>
    ${u ? `<div class="ult-last"><small>Última</small><b>${esc(fmtDate(u.f))}</b><span>${esc(haceTxt(u.f))}${u.t ? ' · ' + esc(u.t) : ''}</span></div>` : '<p class="ult-vacio">Todavía no hay ninguna anotada.</p>'}
    ${est}
    <div class="ult-acc"><button type="button" class="btn primary ult-add" data-ult-nueva="${T.k}">+ Anotar</button>
      <label class="ult-cada"><span>Avisar</span><select data-ult-cada="${T.k}" aria-label="Cada cuánto toca: ${esc(T.t)}">${ULT_CADA.map(([n, t]) => `<option value="${n}"${n === e.cada ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
    ${e.l.length ? `<details class="ult-his"><summary>Ver las anotadas (${e.l.length})</summary><ul>${filas}</ul></details>` : ''}
  </section>`;
}
function renderMain() {
  const M = $('#ult-main'); if (!M) return;
  if (fctr === null) fctr = activoId();
  if (fctr && fctr !== '-' && !perfilGet().contratos.some(c => c.id === fctr)) fctr = '';
  M.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ult="ini">‹ Inicio</button><button type="button" class="linkbtn" data-ult="cal">Calendario ›</button></div>
    <header class="ult-top"><h2>Últimas fechas</h2><p class="help">Cuándo se hizo por última vez cada cosa. Anota cada charla, formación, simulacro o comité el día que se haga; con «Avisar» te dice cuándo toca la siguiente.</p></header>
    ${filtroHtml()}
    <div class="ult-grid">${ULT_TIPOS.map(tarjeta).join('')}</div>`;
  vista('main');
}
function abrirForm(id, k) {
  const a = id ? ACTS.find(x => x.id === id) : null;
  const c = fctr && fctr !== '-' ? perfilGet().contratos.find(x => x.id === fctr) : (fctr === '-' ? null : perfilGet().contratos.find(x => x.id === activoId()));
  ED = a ? JSON.parse(JSON.stringify(a)) : {id:nid(), k:k || 'charla', f:hoy(), t:'', ctr:snap(c), n:'', notas:'', nueva:true};
  renderForm(); vista('form'); window.scrollTo({top:0});
  if (!a) setTimeout(() => { const i = $('#uf-t'); if (i) i.focus(); }, 60);
}
function renderForm() {
  const F = $('#ult-form'); if (!F || !ED) return;
  const T = tipo(ED.k), cs = perfilGet().contratos, cid = ED.ctr && ED.ctr.id;
  const opts = cs.map(c => `<option value="${esc(c.id)}"${c.id === cid ? ' selected' : ''}>${esc(ctrNom(c))}</option>`).join('') + (cid && !cs.some(c => c.id === cid) ? `<option value="${esc(cid)}" selected>${esc(ctrNom(ED.ctr))}</option>` : '');
  F.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-ult="volver">‹ Últimas fechas</button></div>
    <section class="block"><header class="bh"><h2>${ED.nueva ? 'Anotar' : 'Cambiar'} ${esc(T.u)}</h2></header>
      <div class="bb ult-ff">
        <div class="field"><span class="lbl" id="uf-kl">¿Qué se ha hecho?</span><div class="chips" role="group" aria-labelledby="uf-kl">${ULT_TIPOS.map(x => `<button type="button" class="chip" data-ult-tipo="${x.k}" aria-pressed="${x.k === ED.k}">${esc(x.t)}</button>`).join('')}</div></div>
        <div class="field"><label for="uf-f">Fecha</label><input id="uf-f" type="date" value="${esc(ED.f)}"></div>
        <div class="field"><label for="uf-t">Tema</label><input id="uf-t" type="text" maxlength="200" autocomplete="off" placeholder="${esc(T.ph)}" value="${esc(ED.t || '')}"></div>
        <div class="field"${cs.length || cid ? '' : ' hidden'}><label for="uf-c">Contrato</label><select id="uf-c"><option value="">Sin contrato</option>${opts}</select></div>
        <div class="field"><label for="uf-n">Asistentes <i class="opc">opcional</i></label><input id="uf-n" type="number" inputmode="numeric" min="0" max="999" value="${esc(ED.n === undefined ? '' : String(ED.n))}"></div>
        <div class="field"><label for="uf-o">Notas <i class="opc">opcional</i></label><textarea id="uf-o" rows="3" maxlength="1500" placeholder="Quién la dio, dónde, observaciones…">${esc(ED.notas || '')}</textarea></div>
      </div></section>
    <div class="ult-fbtns"><button type="button" class="btn primary" data-ult="guardar">${ED.nueva ? 'Anotar' : 'Guardar cambios'}</button>${ED.nueva ? '' : '<button type="button" class="btn danger-t" data-ult="borrar">Quitar</button>'}<button type="button" class="btn" data-ult="volver">Cancelar</button></div>`;
}
function leerForm() {
  if (!ED) return;
  const v = id => { const el = $('#' + id); return el ? el.value : ''; };
  ED.f = v('uf-f') || ED.f; ED.t = v('uf-t').trim(); ED.notas = v('uf-o').trim();
  const n = v('uf-n'); ED.n = n === '' ? '' : Math.max(0, Math.min(999, parseInt(n, 10) || 0));
  const cid = v('uf-c'); ED.ctr = cid ? snap(perfilGet().contratos.find(c => c.id === cid) || (ED.ctr && ED.ctr.id === cid ? ED.ctr : null)) : null;
}
async function guardarForm() {
  leerForm();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ED.f || '')) { toast('Pon la fecha.'); $('#uf-f').focus(); return; }
  const o = {...ED}; delete o.nueva; o.guardado = Date.now(); if (!o.creado) o.creado = o.guardado;
  try { await udb.put(o); } catch (e) { toast('No se pudo guardar.'); return; }
  const i = ACTS.findIndex(x => x.id === o.id); if (i >= 0) ACTS[i] = o; else ACTS.push(o);
  const T = tipo(o.k), nueva = ED.nueva; ED = null; renderMain(); refrescaIni();
  const el = $('#ultc-' + o.k); if (el) el.scrollIntoView({block:'center'});
  toast(nueva ? `Anotada: ${T.u}, ${fmtDate(o.f)}.` : 'Cambios guardados.');
}
async function borrar() {
  const a = ED && ACTS.find(x => x.id === ED.id); if (!a) return;
  if (!(await ask({title:'¿Quitar esta anotación?', body:`<p>${esc(tipo(a.k).u)} del ${esc(fmtDate(a.f))}${a.t ? ' («' + esc(a.t) + '»)' : ''}.</p>`, yes:'Quitar', danger:true}))) return;
  ACTS = ACTS.filter(x => x.id !== a.id); try { await udb.del(a.id); } catch (e) {}
  ED = null; renderMain(); refrescaIni(); toast('Anotación quitada.');
}
function refrescaIni() { if (window.INI_API && INI_API.refrescar) try { INI_API.refrescar(); } catch (e) {} }
async function onClick(e) {
  const nv = e.target.closest('[data-ult-nueva]'); if (nv) return abrirForm(null, nv.dataset.ultNueva);
  const ed = e.target.closest('[data-ult-edit]'); if (ed) return abrirForm(ed.dataset.ultEdit);
  const tp = e.target.closest('[data-ult-tipo]');
  if (tp && ED) { leerForm(); ED.k = tp.dataset.ultTipo; renderForm(); return; }
  const b = e.target.closest('[data-ult]'); if (!b) return;
  const a = b.dataset.ult;
  if (a === 'ini') { showTab('ini'); return; }
  if (a === 'cal') { if (window.CAL_API) CAL_API.abrir(); return; }
  if (a === 'volver') { ED = null; renderMain(); window.scrollTo({top:0}); return; }
  if (a === 'guardar') return guardarForm();
  if (a === 'borrar') return borrar();
}
function onChange(e) {
  if (e.target.id === 'ult-fc') { fctr = e.target.value; renderMain(); return; }
  const cd = e.target.closest('[data-ult-cada]');
  if (cd) { const k = cd.dataset.ultCada, y = window.scrollY; ponCada(k, +cd.value); renderMain(); window.scrollTo({top:y}); refrescaIni(); toast(+cd.value ? 'Aviso guardado.' : 'Sin aviso.'); }
}
function montar() {
  if ($('#view-ult')) return;
  const main = document.createElement('main');
  main.id = 'view-ult'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="ult-main"></div><div id="ult-form" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  main.addEventListener('click', onClick); main.addEventListener('change', onChange);
  cargar().then(refrescaIni);
}
window.ULT_API = {
  abrir(k) { ED = null; fctr = activoId(); showTab('ult'); renderMain(); window.scrollTo({top:0}); if (k) { const el = $('#ultc-' + k); if (el) el.scrollIntoView({block:'center'}); } },
  onTab(t) { if (t === 'ult' && !ED) renderMain(); },
  atras() { const v = $('#view-ult'); if (!v || v.hidden) return false; if (ED) { ED = null; renderMain(); return true; } showTab('ini'); return true; },
  lista: () => ACTS,
  async importar(arr) {
    if (!Array.isArray(arr)) return 0;
    if (!listo) await cargar();
    let n = 0;
    for (const a of arr) {
      if (!a || !a.id || !ULT_TIPOS.some(x => x.k === a.k) || !/^\d{4}-\d{2}-\d{2}$/.test(a.f || '')) continue;
      const i = ACTS.findIndex(x => x.id === a.id);
      if (i >= 0 && (ACTS[i].guardado || 0) >= (a.guardado || 0)) continue;
      try { await udb.put(a); } catch (e) { continue; }
      if (i >= 0) ACTS[i] = a; else ACTS.push(a); n++;
    }
    if (n) refrescaIni();
    return n;
  },
  /* para el Inicio: lo del contrato activo */
  resumen() {
    const f = activoId(), es = ULT_TIPOS.map(T => estadoDe(T.k, f));
    return {bad:es.filter(e => e.est === 'bad').length, warn:es.filter(e => e.est === 'warn' || e.est === 'nada').length, n:ACTS.filter(a => delFiltro(a, f)).length, es};
  },
  subtitulo() {
    const R = this.resumen();
    if (R.bad) return plural(R.bad, 'toca ya', 'tocan ya');
    const sim = R.es.find(e => e.k === 'sim');
    return R.n ? (sim && sim.u ? 'Último simulacro: ' + haceTxt(sim.u.f) : plural(R.n, 'anotada', 'anotadas')) : 'Charlas, formación, simulacros, comités';
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
