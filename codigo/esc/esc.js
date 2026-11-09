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

window.ESC_API = {
  onTab(t) { lateral(); if (t === 'form') pintaRes(); if (t === 'hist') pintaDet(); pide(); },
  refrescar() { lateral(); pintaRes(); pintaDet(); }
};
const cambia = () => { if (G2.matches) { pintaRes(); pintaDet(); } pide(); };
(G2.addEventListener ? G2.addEventListener('change', cambia) : G2.addListener(cambia));
(G1.addEventListener ? G1.addEventListener('change', cambia) : G1.addListener(cambia));
lateral();
setTimeout(() => { pintaRes(); pintaDet(); coloca(); }, 0);
})();
