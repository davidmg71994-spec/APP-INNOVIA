/* ================= Ordenador: pantalla a dos columnas (1.19.0) =================
   La barra de abajo pasa a ser una barra lateral (esc.css). En pantallas de 1280 px o más:
   - la visita lleva al lado un resumen fijo: pasos, respuestas, incidencias y botones de guardar y PDF;
   - el Historial muestra al lado el detalle del registro elegido (fotos, incidencias, firmas, código). */
(() => {
const G1 = matchMedia('(min-width:1024px)'), G2 = matchMedia('(min-width:1280px)');
const vis = el => !!el && !el.hidden;

/* ---------- barra lateral ---------- */
function lateral() {
  const nav = document.querySelector('.bottomnav'); if (!nav) return;
  if (!nav.querySelector('.esc-logo')) {
    nav.insertAdjacentHTML('afterbegin', '<div class="esc-logo" aria-hidden="true"><img class="logo-l" src="icons/logo-innovia.png" alt="" width="402" height="105"><img class="logo-d" src="icons/logo-innovia-dark.png" alt="" width="402" height="105"><span>Visitas PRL</span></div>');
    nav.insertAdjacentHTML('beforeend', '<div class="esc-pie" id="esc-pie"></div>');
  }
  const n = (lsGet('rp-nombre') || '').trim(), p = perfilGet ? perfilGet() : null;
  $('#esc-pie').innerHTML = `${n ? `<b>${esc(n)}</b>` : ''}${esc((p && p.cargo) || 'Técnico de PRL')}<br>Versión ${esc(APP_VER)}`;
}

/* ---------- posición de los paneles fijos ---------- */
function coloca() {
  const top = document.querySelector('.top'), r = top ? top.getBoundingClientRect() : {bottom:0};
  document.documentElement.style.setProperty('--esc-top', Math.max(16, Math.round(r.bottom) + 16) + 'px');
  [['#view-form', '#esc-res', 360], ['#view-hist', '#esc-det', 460]].forEach(([v, pn, w]) => {
    const m = $(v), pa = $(pn); if (!m || !pa || m.hidden) return;
    const b = m.getBoundingClientRect();
    pa.style.setProperty('--esc-pw', w + 'px'); m.style.setProperty('--esc-pw', w + 'px');
    pa.style.left = Math.round(b.right - 16 - w) + 'px';
  });
  const wiz = $('.wiz');
  document.documentElement.style.setProperty('--esc-bot', (vis($('#view-form')) && wiz && wiz.offsetHeight ? wiz.offsetHeight + 16 : 24) + 'px');
}
let rq = 0;
const pide = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; coloca(); }); };
addEventListener('scroll', pide, {passive:true});
addEventListener('resize', pide);

/* ---------- resumen de la visita ---------- */
function panelRes() {
  let pa = $('#esc-res');
  if (!pa) {
    const m = $('#view-form'); if (!m) return null;
    pa = document.createElement('aside'); pa.id = 'esc-res'; pa.className = 'esc-panel'; pa.setAttribute('aria-label', 'Resumen de la visita');
    m.appendChild(pa); m.classList.add('esc-con');
    pa.addEventListener('click', e => {
      const b = e.target.closest('[data-esc]'); if (!b) return;
      const a = b.dataset.esc;
      if (a === 'paso') { const c = document.getElementById('st-' + b.dataset.id); if (c) c.click(); }
      else if (a === 'save') { const x = $('#btn-save'); if (x) x.click(); }
      else if (a === 'pdf') { const x = $('#btn-pdf'); if (x) x.click(); }
    });
  }
  return pa;
}
function pintaRes() {
  if (!G2.matches) return;
  const pa = panelRes(); if (!pa) return;
  const pasos = STEPS.map((st, i) => {
    const c = document.getElementById('st-' + st.id), cls = c ? c.className : '';
    const est = /\bwarn\b/.test(cls) ? 'warn' : /\bdone\b/.test(cls) ? 'done' : '';
    const cur = !!c && c.getAttribute('aria-current') === 'step';
    const cnt = c ? ($('.c', c) || {}).textContent || '' : '';
    return `<li class="${est}"><button type="button" data-esc="paso" data-id="${st.id}" aria-current="${cur}"><span class="n">${est === 'done' ? '✓' : est === 'warn' ? '!' : i + 1}</span><span>${esc(st.l)}</span><span class="c">${esc(cnt)}</span></button></li>`;
  }).join('');
  const ss = $('#savestate'), sp = ss ? ($('span', ss) || ss).textContent : '';
  const ctr = S.contrato && S.contrato.id ? nombreContrato(S.contrato) : '';
  pa.innerHTML = `<div class="esc-ph"><h2>Resumen de la visita</h2></div>
    <div class="esc-pb">
      <div class="esc-obra"><b>${esc((S.rp.ubicacion || '').trim() || 'Obra sin indicar')}</b><span>${esc([S.rp.fecha ? fmtDate(S.rp.fecha) : '', S.rp.hora || '', ctr].filter(Boolean).join(' · ') || 'Fecha y contrato en «Datos»')}</span></div>
      <ol class="esc-pasos">${pasos}</ol>
      <div class="stats">${($('#stats') || {}).innerHTML || ''}</div>
      ${($('#incid') || {}).innerHTML || ''}
    </div>
    <div class="esc-pf">
      <p class="esc-est ${ss ? (/\bok\b/.test(ss.className) ? 'ok' : /\bwarn\b/.test(ss.className) ? 'warn' : '') : ''}">${esc(sp)}</p>
      <div class="esc-acc"><button type="button" class="btn primary" data-esc="save"${$('#btn-save') && $('#btn-save').hidden ? ' hidden' : ''}>${esc(($('#btn-save') || {}).textContent || 'Guardar')}</button><button type="button" class="btn" data-esc="pdf">PDF</button></div>
    </div>`;
  pide();
}

/* ---------- detalle del registro en el Historial ---------- */
let selId = null;
function panelDet() {
  let pa = $('#esc-det');
  if (!pa) {
    const m = $('#view-hist'); if (!m) return null;
    pa = document.createElement('aside'); pa.id = 'esc-det'; pa.className = 'esc-panel esc-det'; pa.setAttribute('aria-label', 'Detalle del registro');
    m.appendChild(pa); m.classList.add('esc-con');
    $('#h-list').addEventListener('click', e => {
      if (!G2.matches || e.target.closest('button, a, input')) return;
      const card = e.target.closest('.hcard'); if (!card) return;
      const b = card.querySelector('[data-hact="open"]'); if (!b) return;
      selId = b.dataset.id; marca(); pintaDet();
    });
  }
  return pa;
}
function marca() {
  $$('#h-list .hcard').forEach(c => { const b = c.querySelector('[data-hact="open"]'); c.classList.toggle('esc-sel', !!b && b.dataset.id === selId); });
}
function fotosDe(r) {
  const out = [];
  Object.values(r.resp || {}).forEach(a => (a.fotos || []).forEach(f => { if (f && f.data) out.push(f.data); }));
  Object.values(r.maqFotos || {}).forEach(l => (Array.isArray(l) ? l : [l]).forEach(f => { const d = f && (f.data || f); if (typeof d === 'string' && d.startsWith('data:image')) out.push(d); }));
  return out;
}
function pintaDet() {
  if (!G2.matches) return;
  const pa = panelDet(); if (!pa) return;
  const ids = $$('#h-list [data-hact="open"]').map(b => b.dataset.id);
  if (!selId || !ids.includes(selId)) selId = ids[0] || null;
  marca();
  const rec = selId && HIST.find(x => x.id === selId);
  if (!rec) { pa.innerHTML = '<div class="esc-vacio">Elige un registro de la lista para ver su detalle.</div>'; pide(); return; }
  let A = null; try { A = analyze(normalize(clone(rec))); } catch (e) { A = null; }
  const s = rec.resumen || {}, inc = A ? A.all : [];
  const fotos = fotosDe(rec), ws = (rec.trabajadores || []);
  const firmas = [rec.firma ? {img:rec.firma, n:(rec.rp && rec.rp.nombre) || 'Técnico'} : null, ...ws.filter(w => w.firma).map(w => ({img:w.firma, n:w.nombre || 'Trabajador'}))].filter(Boolean);
  pa.innerHTML = `<div class="esc-ph"><h2>Detalle del registro</h2><span class="pill ${inc.length ? 'bad' : 'ok'}">${inc.length ? plural(inc.length, 'incidencia', 'incidencias') : 'Sin incidencias'}</span></div>
    <div class="esc-pb">
      <div><div class="hmeta"><span>${rec.codigo ? '<b class="hcode">' + esc(rec.codigo) + '</b> · ' : ''}${esc(fmtDate(rec.rp && rec.rp.fecha))} · ${esc((rec.rp && rec.rp.hora) || '')}</span></div>
        <h3>${esc((rec.rp && rec.rp.ubicacion) || 'Sin ubicación')}</h3>
        <p class="hsub">${esc([rec.contrato && rec.contrato.id ? nombreContrato(rec.contrato) : '', rec.rp && rec.rp.nombre].filter(Boolean).join(' · '))}</p>
        ${window.SEG_API ? SEG_API.histLinea(rec) : ''}</div>
      <div class="stats">
        <div class="stat ok"><b>${A ? A.ok : s.ok || 0}</b><span>Conformes</span></div>
        <div class="stat ${(A ? A.bad : s.bad) ? 'bad' : ''}"><b>${A ? A.bad : s.bad || 0}</b><span>No conformes</span></div>
        <div class="stat"><b>${A ? A.na : s.na || 0}</b><span>N.A.</span></div>
        <div class="stat"><b>${A ? A.pend : s.pend || 0}</b><span>Sin responder</span></div>
      </div>
      ${inc.length ? `<div><p class="esc-sub">Incidencias</p><ul class="esc-lst">${inc.map(x => `<li class="bad">${esc(x.t)}<small>${esc(x.sec)}${x.mejora ? ' · oportunidad de mejora' : ''}${x.obs ? ' · ' + esc(x.obs) : ''}</small></li>`).join('')}</ul></div>` : ''}
      ${fotos.length ? `<div><p class="esc-sub">Fotos · ${fotos.length}</p><div class="esc-fotos">${fotos.slice(0, 12).map(f => `<img src="${esc(f)}" alt="Foto del registro" loading="lazy">`).join('')}</div></div>` : ''}
      <div><p class="esc-sub">Trabajadores · ${ws.length}</p>${ws.length ? `<ul class="esc-lst">${ws.map(w => `<li>${esc(w.nombre || 'Sin nombre')}<small>${esc([(w.empresa || '').trim() || 'Personal propio', w.firma ? 'Firmado' : 'Sin firma'].join(' · '))}</small></li>`).join('')}</ul>` : '<p class="help">Sin trabajadores en este registro.</p>'}</div>
      ${firmas.length ? `<div><p class="esc-sub">Firmas</p><div class="esc-firmas">${firmas.map(f => `<figure><img src="${esc(f.img)}" alt="Firma de ${esc(f.n)}"><figcaption>${esc(f.n)}</figcaption></figure>`).join('')}</div></div>` : ''}
      <div class="hbtns">
        <button type="button" class="mini" data-hact="open" data-id="${esc(rec.id)}">Abrir</button>
        <button type="button" class="mini" data-hact="pdf" data-id="${esc(rec.id)}">PDF</button>
        <button type="button" class="mini" data-hact="dup" data-id="${esc(rec.id)}">Duplicar</button>
        <button type="button" class="mini del" data-hact="del" data-id="${esc(rec.id)}">Eliminar</button>
      </div>
    </div>`;
  pide();
}

/* ---------- enganches: se repinta cuando la app actualiza la visita o el Historial ---------- */
const _ud = updateDerived;
updateDerived = function () { _ud.apply(this, arguments); try { pintaRes(); } catch (e) {} };
/* el paso en curso se marca también en el resumen, sin repintarlo entero */
const marcaPaso = () => $$('#esc-res .esc-pasos [data-id]').forEach(b => { const c = document.getElementById('st-' + b.dataset.id); b.setAttribute('aria-current', String(!!c && c.getAttribute('aria-current') === 'step')); });
if ($('#steps') && window.MutationObserver) new MutationObserver(marcaPaso).observe($('#steps'), {subtree:true, attributes:true, attributeFilter:['aria-current']});
const _rh = renderHist;
renderHist = function () { _rh.apply(this, arguments); try { pintaDet(); } catch (e) {} };

/* ================= 1.20.0: más cómodo en el ordenador ================= */
const IC_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const escribiendo = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const hayDialogo = () => [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].some(d => !d.hidden && d.getClientRects().length);

/* ---------- pestañas con el nombre completo (en el móvil, el corto) ---------- */
const LARGOS = {'tab-form':'Registro de visita', 'tab-hist':'Historial de visitas', 'tab-inf':'Informe cuatrimestral', 'tab-plan':'Planificación preventiva', 'tab-evrl':'Evaluación de riesgos laborales', 'tab-sen':'Señalización (manual de obras fijas)', 'tab-norma':'Normativa legal'};
function nombres() {
  Object.entries(LARGOS).forEach(([id, l]) => {
    const b = document.getElementById(id); if (!b || b.dataset.escL) return;
    const sp = b.querySelector(':scope > span'); if (!sp) return;
    const tn = [...sp.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
    sp.insertBefore(Object.assign(document.createElement('i'), {className:'esc-c', textContent:tn.textContent}), tn);
    sp.insertBefore(Object.assign(document.createElement('i'), {className:'esc-l', textContent:l}), tn);
    tn.remove(); b.dataset.escL = '1';
  });
  const sub = $('#subnav');
  if (sub && !$('#esc-kbh')) sub.insertAdjacentHTML('beforeend', '<span class="esc-kbh" id="esc-kbh" aria-hidden="true" hidden>Teclado: <kbd>S</kbd> Sí <kbd>N</kbd> No <kbd>A</kbd> N.A. · <kbd>↑</kbd><kbd>↓</kbd> pregunta · <kbd>Intro</kbd> siguiente · <kbd>Ctrl</kbd><kbd>K</kbd> buscar</span>');
  const nav = $('.bottomnav'), lg = nav && nav.querySelector('.esc-logo');
  if (lg && !$('#esc-bus')) {
    lg.insertAdjacentHTML('afterend', `<button type="button" class="esc-bus" id="esc-bus" aria-label="Buscar en toda la app (Control + K)">${IC_LUPA}<span>Buscar</span><kbd>Ctrl K</kbd></button>`);
    $('#esc-bus').addEventListener('click', () => abrePaleta());
  }
}

/* ---------- responder la visita con el teclado ---------- */
let kbId = null;
function marcaKb(el, ver) {
  $$('#view-form [data-item].kb-on').forEach(x => { if (x !== el) x.classList.remove('kb-on'); });
  if (!el) { kbId = null; return; }
  kbId = el.dataset.item; el.classList.add('kb-on');
  if (ver) el.scrollIntoView({behavior:reduced() ? 'auto' : 'smooth', block:'center'});
}
function kbActual() {
  const its = itemsPaso(); if (!its.length) return null;
  return (kbId && its.find(x => x.dataset.item === kbId)) || its.find(x => !(S.resp[x.dataset.item] || {}).v) || its[0];
}
function kbTecla(e) {
  const v = $('#view-form'); if (!v || v.hidden || hayDialogo() || (window.SEG_API && SEG_API.bloqueada && SEG_API.bloqueada())) return;
  const t = e.target;
  if (escribiendo(t)) {
    /* Esc en una observación: vuelve a la pregunta */
    const it = e.key === 'Escape' && t.closest && t.closest('#view-form [data-item]');
    if (it) { e.preventDefault(); t.blur(); document.body.classList.add('kb-modo'); marcaKb(it, false); }
    return;
  }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const RESP = {s:'SI', n:'NO', a:'NA'};
  if (k === 'ArrowRight' || k === 'ArrowLeft') { const b = $(k === 'ArrowRight' ? '#wiz-next' : '#wiz-prev'); if (b && !b.disabled && b.offsetParent) { e.preventDefault(); kbId = null; b.click(); } return; }
  const el = kbActual(); if (!el) return;
  const its = itemsPaso(), i = its.indexOf(el), id = el.dataset.item;
  if (RESP[k]) {
    e.preventDefault(); document.body.classList.add('kb-modo'); marcaKb(el, false);
    const b = el.querySelector(`[data-ans="${RESP[k]}"]`); if (b) b.click();
    const r = S.resp[id] || {};
    if (r.v && isBad(ITEM[id], r.v)) {
      /* «No»: se queda en la pregunta y deja escribir la deficiencia */
      setTimeout(() => { const o = $('#o-' + id); if (o && !o.hidden) { o.focus({preventScroll:true}); o.scrollIntoView({behavior:reduced() ? 'auto' : 'smooth', block:'center'}); } }, 60);
    } else if (r.v) {
      const nx = its.slice(i + 1).find(x => !(S.resp[x.dataset.item] || {}).v) || its[i + 1];
      if (nx) marcaKb(nx, false);
    }
    return;
  }
  if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'j' || k === 'k') {
    e.preventDefault(); document.body.classList.add('kb-modo');
    const n = its[Math.max(0, Math.min(its.length - 1, i + (k === 'ArrowDown' || k === 'j' ? 1 : -1)))];
    marcaKb(n, true); return;
  }
  if (k === 'Enter' && (t === document.body || t.closest('#view-form [data-item]'))) {
    e.preventDefault(); document.body.classList.add('kb-modo');
    if (its[i + 1]) marcaKb(its[i + 1], true);
    else { const b = $('#wiz-next'); if (b && !b.disabled) { kbId = null; b.click(); } }
    return;
  }
  if (k === 'o') { e.preventDefault(); const b = el.querySelector('[data-act="obs"]'); if (b) { const tl = $('#tl-' + id); if (tl && tl.hidden) { const m = el.querySelector('[data-act="mas"]'); if (m) m.click(); } b.click(); setTimeout(() => { const o = $('#o-' + id); if (o) o.focus(); }, 60); } return; }
  if (k === 'f') { e.preventDefault(); const f = $('#f-' + id); if (f) f.click(); return; }
}
const formV = $('#view-form');
if (formV) formV.addEventListener('pointerdown', e => {
  document.body.classList.remove('kb-modo');
  const it = e.target.closest('[data-item]'); if (it) marcaKb(it, false);
});

/* ---------- buscador de toda la app (Ctrl + K) ---------- */
const A = (g, t, s, run, extra) => ({g, t, s, run, h:norm([t, s, extra || ''].join(' '))});
function iniAccion(a) {
  const v = $('#view-ini'); if (!v) return;
  const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.ini = a;
  v.appendChild(b); b.click(); b.remove();
}
function apartados() {
  const borr = !S.id && ((S.rp.ubicacion || '').trim() || Object.keys(S.resp || {}).length);
  return [
    A('ap', 'Nueva visita', 'Empezar un registro en blanco', () => iniAccion('nueva'), 'registro nuevo'),
    borr ? A('ap', 'Seguir con la visita', (S.rp.ubicacion || '').trim() || 'Registro sin guardar', () => showTab('form'), 'borrador continuar') : null,
    A('ap', 'Inicio', 'Hoy y vencidas, deficiencias por mes', () => { const b = $('#tab-ini'); if (b) b.click(); }),
    A('ap', 'Visitas a obra', 'Historial de visitas', () => showTab('hist'), 'historial registros'),
    A('ap', 'Calendario', 'Tareas de PRL', () => iniAccion('cal')),
    A('ap', 'Informe cuatrimestral', 'Documentos', () => iniAccion('inf'), 'informe seguimiento'),
    A('ap', 'Planificación preventiva', 'Documentos · medidas correctoras', () => iniAccion('plan')),
    A('ap', 'Evaluación de riesgos laborales', 'Documentos · EVRL por puesto', () => iniAccion('evrl'), 'evrl'),
    A('ap', 'Revisiones de instalaciones', 'Equipos y certificados', () => iniAccion('rev')),
    A('ap', 'Señalización (manual de obras fijas)', 'Consulta · Norma 8.3-IC', () => iniAccion('sen')),
    A('ap', 'Normativa legal', 'Consulta · fichas y enlace al BOE', () => iniAccion('norma'), 'leyes reales decretos'),
    A('ap', 'PSS/DGP', 'Consulta · carpeta del plan de seguridad', () => iniAccion('pss'), 'plan de seguridad y salud documento de gestion preventiva'),
    A('ap', 'Mi perfil', 'Datos y contratos', () => { const b = $('#nav-pf'); if (b) b.click(); }, 'contratos nombre cargo'),
    window.SEG_API ? A('ap', 'Privacidad y seguridad', 'Bloqueo, copias cifradas, código de verificación', () => SEG_API.ver(), 'contraseña') : null,
    window.SEG_API ? A('ap', 'Guardar una copia de seguridad', 'Exportar todos los datos cifrados', () => SEG_API.hacerCopia(), 'exportar backup') : null
  ].filter(Boolean);
}
function verRegistro(id) {
  showTab('hist');
  const busca = () => document.querySelector(`#h-list [data-hact="open"][data-id="${CSS.escape(id)}"]`);
  let b = busca();
  if (!b) { const q = $('#h-q'); if (q && q.value) { q.value = ''; q.dispatchEvent(new Event('input', {bubbles:true})); } b = busca(); }
  if (!b) { const t = $('#h-ctr [data-hc=""]'); if (t) t.click(); b = busca(); }
  if (!b) return;
  const card = b.closest('.hcard');
  selId = id; marca(); pintaDet();
  if (card) { card.scrollIntoView({behavior:reduced() ? 'auto' : 'smooth', block:'center'}); card.classList.remove('esc-flash'); void card.offsetWidth; card.classList.add('esc-flash'); }
}
function irPregunta(id) {
  const el = $('#it-' + id); if (!el) return;
  showTab('form');
  const k = stepEls().findIndex(els => els.some(x => x && x.contains(el)));
  if (k >= 0 && k !== paso) setStep(k);
  setTimeout(() => { marcaKb(el, true); document.body.classList.add('kb-modo'); el.classList.remove('siguiente'); void el.offsetWidth; el.classList.add('siguiente'); }, 60);
}
function resultados(q) {
  const tk = norm(q).split(/\s+/).filter(Boolean);
  const casa = x => tk.every(t => x.h.includes(t));
  const nota = x => { const tt = norm(x.t); return (tt.startsWith(tk[0] || '') ? 3 : 0) + (tk.every(t => tt.includes(t)) ? 2 : 0); };
  const top = (l, n) => l.filter(casa).sort((a, b) => nota(b) - nota(a)).slice(0, n);
  if (!tk.length) return [{g:'Apartados', l:apartados()}];
  const G = [];
  G.push({g:'Apartados', l:top(apartados(), 6)});
  G.push({g:'Visitas a obra', l:top(HIST.map(r => {
    const rp = r.rp || {}, n = (r.resumen && r.resumen.inc) || 0;
    return A('vis', rp.ubicacion || 'Sin ubicación', [r.codigo, fmtDate(rp.fecha), r.contrato && r.contrato.id ? nombreContrato(r.contrato) : '', n ? plural(n, 'incidencia', 'incidencias') : 'sin incidencias'].filter(Boolean).join(' · '), () => verRegistro(r.id), [rp.nombre, rp.actividad, rp.fecha].join(' '));
  }), 5)});
  G.push({g:'Preguntas de la visita', l:top(ITEMS.map(it => A('preg', it.q, 'Ir a la pregunta en el registro', () => irPregunta(it.id))), 5)});
  if (window.NORMA_API) G.push({g:'Normativa legal', l:top(NORMA_API.lista().map(x => A('norma', x.c + ' · ' + x.n, x.f || '', () => NORMA_API.abrir(x.id), Object.entries(x).filter(([k, v]) => k !== 'u' && typeof v === 'string').map(([, v]) => v).join(' '))), 5)});
  G.push({g:'Señalización', l:top(SEN.map(e => A('sen', senTitle(e) + ' · ' + e.zona, SEN_G[e.g], () => { showTab('sen'); senFrom = null; senOpenOne(e.p); }, [e.ej, e.fig, e.n].join(' '))), 5)});
  if (window.REV_API) G.push({g:'Revisiones de instalaciones', l:top(REV_API.lista().map(r => A('rev', r.nombre || 'Revisión', [r.ident, r.ctr && r.ctr.nombre].filter(Boolean).join(' · '), () => REV_API.editar(r.id), r.ident || '')), 4)});
  if (window.PSS_API && q.trim().length >= 3) {
    try {
      const R = PSS_API.buscar(q, null);
      G.push({g:'PSS/DGP', l:[...R.num, ...R.tit].slice(0, 5).map(x => A('pss', (x.e.n ? x.e.n + ' ' : '') + x.e.t, x.d.titulo || x.d.nombre || 'PSS/DGP', () => { PSS_API.abrir({ctr:x.d.ctr && x.d.ctr.id ? x.d.ctr.id : null}); PSS_API.ver(x.d.id, x.i); }))});
    } catch (e) {}
  }
  return G.filter(x => x.l.length);
}
const ICG = {ap:'→', vis:'V', preg:'?', norma:'§', sen:'△', rev:'R', pss:'P'};
let PL = [], PS = 0;
function pintaPaleta() {
  const q = $('#esc-kq').value, G = resultados(q);
  PL = G.flatMap(x => x.l); PS = Math.min(PS, Math.max(0, PL.length - 1));
  let n = 0;
  $('#esc-kr').innerHTML = PL.length ? G.map(x => `<p class="esc-kg">${esc(x.g)}</p>` + x.l.map(r => { const i = n++; return `<button type="button" class="esc-ki" role="option" id="esc-ki-${i}" data-i="${i}" aria-selected="${i === PS}"><span class="esc-kic g-${r.g}" aria-hidden="true">${ICG[r.g] || '·'}</span><span class="esc-kt"><b>${esc(r.t)}</b>${r.s ? `<small>${esc(r.s)}</small>` : ''}</span></button>`; }).join('')).join('')
    : `<p class="esc-kvacio">Nada con «${esc(q)}». Prueba con otra palabra: extintores, arcén, andamio, camión…</p>`;
  $('#esc-kq').setAttribute('aria-activedescendant', PL.length ? 'esc-ki-' + PS : '');
}
function selPaleta(i) {
  PS = Math.max(0, Math.min(PL.length - 1, i));
  $$('#esc-kr .esc-ki').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === PS)));
  const b = $('#esc-ki-' + PS); if (b) b.scrollIntoView({block:'nearest'});
  $('#esc-kq').setAttribute('aria-activedescendant', b ? b.id : '');
}
function cierraPaleta() { const p = $('#esc-k'); if (p) p.hidden = true; document.body.classList.remove('esc-k-on'); }
function ejecuta(i) { const r = PL[i]; if (!r) return; cierraPaleta(); setTimeout(() => { try { r.run(); } catch (e) { toast('No se pudo abrir.'); } }, 0); }
function abrePaleta() {
  let p = $('#esc-k');
  if (!p) {
    document.body.insertAdjacentHTML('beforeend', `<div class="esc-k" id="esc-k" role="dialog" aria-modal="true" aria-label="Buscar en toda la app" hidden>
      <div class="esc-kbox">
        <div class="esc-kq">${IC_LUPA}<input id="esc-kq" type="search" placeholder="Buscar visitas, preguntas, normativa, señalización, PSS…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="esc-kr" aria-label="Buscar"><kbd>Esc</kbd></div>
        <div class="esc-kr" id="esc-kr" role="listbox" aria-label="Resultados"></div>
        <div class="esc-kpie"><span><kbd>↑</kbd><kbd>↓</kbd> elegir</span><span><kbd>Intro</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div>
      </div></div>`);
    p = $('#esc-k');
    p.addEventListener('click', e => { if (e.target === p) return cierraPaleta(); const b = e.target.closest('.esc-ki'); if (b) ejecuta(+b.dataset.i); });
    p.addEventListener('mousemove', e => { const b = e.target.closest('.esc-ki'); if (b && +b.dataset.i !== PS) selPaleta(+b.dataset.i); });
    const inp = $('#esc-kq');
    inp.addEventListener('input', () => { PS = 0; pintaPaleta(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selPaleta(PS + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selPaleta(PS - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); ejecuta(PS); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cierraPaleta(); }
    });
  }
  if (!p.hidden) { $('#esc-kq').select(); return; }
  p.hidden = false; document.body.classList.add('esc-k-on');
  PS = 0; $('#esc-kq').value = ''; pintaPaleta();
  setTimeout(() => $('#esc-kq').focus(), 0);
}
document.addEventListener('keydown', e => {
  if (e.defaultPrevented) return;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === 'k' || k === 'K')) {
    if (window.SEG_API && SEG_API.bloqueada && SEG_API.bloqueada()) return;
    e.preventDefault(); abrePaleta(); return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === '/' && !escribiendo(e.target) && !hayDialogo() && !(window.SEG_API && SEG_API.bloqueada && SEG_API.bloqueada())) { e.preventDefault(); abrePaleta(); return; }
  kbTecla(e);
});

/* ---------- arrastrar y soltar archivos ---------- */
const visible = el => !!el && !!el.getClientRects().length;
const vista = id => { const v = $('#' + id); return !!v && !v.hidden; };
function aInput(inp, files) {
  const dt = new DataTransfer(); [...files].forEach(f => dt.items.add(f));
  inp.files = dt.files; inp.dispatchEvent(new Event('change', {bubbles:true}));
}
function destinoFoto(t) {
  const it = t && t.closest && t.closest('#view-form [data-item]');
  if (it) return {inp:$('#f-' + it.dataset.item), n:'la pregunta'};
  const q = t && t.closest && t.closest('#view-form .rowcard');
  const qi = q && q.querySelector('input[type="file"][data-qphoto]:not([capture])'); if (qi) return {inp:qi, n:'el producto químico'};
  const eq = t && t.closest && t.closest('#view-form .eqf');
  const ei = eq && eq.querySelector('input[type="file"][data-mphoto]:not([capture])'); if (ei) return {inp:ei, n:'el equipo'};
  return null;
}
let arr = 0;
const tieneArchivos = e => !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
function capa(on) {
  let c = $('#esc-drop');
  if (!c && on) { document.body.insertAdjacentHTML('beforeend', '<div class="esc-drop" id="esc-drop" aria-hidden="true"><div><b>Suelta el archivo</b><span>Foto → encima de la pregunta · PDF → carpeta PSS/DGP (o certificado de la revisión abierta) · Copia de seguridad (.json) → importar</span></div></div>'); c = $('#esc-drop'); }
  if (c) c.classList.toggle('on', !!on);
}
let sobre = null;
function marcaSobre(el) { if (sobre && sobre !== el) sobre.classList.remove('esc-sobre'); sobre = el; if (el) el.classList.add('esc-sobre'); }
addEventListener('dragenter', e => { if (!tieneArchivos(e) || hayDialogo()) return; arr++; capa(true); });
addEventListener('dragleave', e => { if (!tieneArchivos(e)) return; arr = Math.max(0, arr - 1); if (!arr) { capa(false); marcaSobre(null); } });
addEventListener('dragover', e => {
  if (!tieneArchivos(e) || hayDialogo()) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  const d = vista('view-form') && destinoFoto(e.target);
  marcaSobre(d ? (e.target.closest('[data-item]') || e.target.closest('.eqf') || e.target.closest('.rowcard')) : null);
});
addEventListener('drop', async e => {
  if (!tieneArchivos(e)) return;
  e.preventDefault(); arr = 0; capa(false); marcaSobre(null);
  if (hayDialogo() || (window.SEG_API && SEG_API.bloqueada && SEG_API.bloqueada())) return;
  const files = [...e.dataTransfer.files]; if (!files.length) return;
  const img = files.filter(f => /^image\//.test(f.type)), pdf = files.filter(f => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name)), json = files.filter(f => /json/i.test(f.type) || /\.json$/i.test(f.name));
  const rv = $('#rf-doc');
  if (rv && visible(rv.closest('label') || rv) && (img.length || pdf.length)) { aInput(rv, [...pdf, ...img]); return; }
  if (img.length && img.length === files.length) {
    let d = vista('view-form') ? destinoFoto(e.target) : null;
    if (!d && vista('view-form') && kbId) d = {inp:$('#f-' + kbId), n:'la pregunta'};
    if (d && d.inp) { aInput(d.inp, img.slice(0, 6)); toast(img.length === 1 ? `Foto añadida a ${d.n}.` : `${Math.min(img.length, 6)} fotos añadidas a ${d.n}.`); return; }
    toast(vista('view-form') ? 'Suelta la foto encima de la pregunta a la que va.' : 'Para añadir una foto, abre la visita y suéltala encima de la pregunta.');
    return;
  }
  if (pdf.length === 1 && files.length === 1 && window.PSS_API) {
    const enPss = vista('view-pss');
    if (!enPss) {
      const p = perfilGet(), c = p.contratos.find(x => x.id === p.activo) || p.contratos[0];
      const ok = await ask({title:'¿Guardar en la carpeta PSS/DGP?', yes:'Guardar', body:`<p>«${esc(pdf[0].name)}» se guarda en la carpeta PSS/DGP${c ? ' de <b>' + esc(c.nombre || 'tu contrato') + '</b>' : ''} y la app lee su índice.</p>`});
      if (ok !== true) return;
      PSS_API.abrir();
    }
    const inp = $('#ps-file'); if (inp) aInput(inp, pdf);
    return;
  }
  if (json.length && json.length === files.length) {
    const ev = $('#ev-json');
    if (ev && vista('view-evrl') && visible(ev.closest('label') || ev)) { aInput(ev, json.slice(0, 1)); return; }
    /* la importación de siempre: lee la copia y pregunta antes de añadir nada */
    const inp = $('#imp-file'); if (inp) aInput(inp, json);
    return;
  }
  toast(pdf.length > 1 ? 'Suelta los PDF de uno en uno.' : 'Ese archivo no se puede usar aquí.');
});

window.ESC_API = {
  onTab(t) { lateral(); nombres(); const h = $('#esc-kbh'); if (h) h.hidden = t !== 'form'; if (t !== 'form') marcaKb(null); if (t === 'form') pintaRes(); if (t === 'hist') pintaDet(); pide(); },
  refrescar() { lateral(); pintaRes(); pintaDet(); },
  buscar: abrePaleta
};
nombres();
const cambia = () => { if (G2.matches) { pintaRes(); pintaDet(); } pide(); };
(G2.addEventListener ? G2.addEventListener('change', cambia) : G2.addListener(cambia));
(G1.addEventListener ? G1.addEventListener('change', cambia) : G1.addListener(cambia));
lateral();
setTimeout(() => { pintaRes(); pintaDet(); coloca(); }, 0);
})();
