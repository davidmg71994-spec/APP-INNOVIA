/* ================= Historial ordenado (1.29.0) =================
   Las visitas se agrupan por año y mes, cada mes en un desplegable (el más reciente abierto) con su número de visitas
   y cuántas tienen incidencias. Cada visita es una línea corta: día, obra y estado; al tocarla se abren sus datos y
   botones (en el ordenador ancho, el detalle sale en el panel de la derecha). Filtro «Con incidencias». */
let HX_INC = false;
const HX_ABIERTOS = new Set(), HX_CERRADOS = new Set();
const HX_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HX_DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const hxCap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const HX_ANCHO = matchMedia('(min-width:1280px)');   // el mismo ancho en el que el Historial tiene panel de detalle
function hxFecha(r) {
  const f = (r && r.rp && r.rp.fecha) || '';
  if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10);
  return isoDate(new Date((r && r.creado) || Date.now()));
}
/* para buscar también por el nombre del mes («noviembre») */
function hxMesTxt(r) { const f = hxFecha(r); return HX_MESES[+f.slice(5, 7) - 1] + ' ' + f.slice(0, 4); }
const HX_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const HX_BAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/></svg>';
function hxFila(r, cf) {
  const s = r.resumen || {}, nInc = s.inc || 0, f = hxFecha(r), d = new Date(f + 'T12:00:00');
  const nW = (r.trabajadores || []).length, nV = (r.vehiculos || []).length;
  const ctr = !cf && r.contrato && r.contrato.id ? nombreContrato(r.contrato) : '';
  const sub = [r.rp && r.rp.hora, ctr, plural(nW, 'trabajador', 'trabajadores')].filter(Boolean).join(' · ');
  const est = nInc ? `<span class="hx-st bad">${HX_BAD}<span>${nInc}<span class="hx-stl"> ${nInc === 1 ? 'incidencia' : 'incidencias'}</span></span></span>` : `<span class="hx-st ok" title="Sin incidencias">${HX_OK}<span class="hx-stl">Sin incidencias</span></span>`;
  return `<article class="hcard hx-f${nInc ? ' flag' : ''}">
    <div class="hx-main" role="button" tabindex="0" aria-expanded="false" aria-label="${esc(fmtDate(f) + ' · ' + ((r.rp && r.rp.ubicacion) || 'Sin ubicación') + ' · ' + (nInc ? plural(nInc, 'incidencia', 'incidencias') : 'sin incidencias'))}">
      <span class="hx-dia" aria-hidden="true"><b>${d.getDate()}</b><small>${HX_DIAS[d.getDay()]}</small></span>
      <span class="hx-txt"><b class="htitle">${esc((r.rp && r.rp.ubicacion) || 'Sin ubicación')}</b><span class="hsub">${esc(sub)}</span></span>
      ${est}
    </div>
    <div class="hx-mas">
      <p class="hsub">${r.codigo ? '<b class="hcode">' + esc(r.codigo) + '</b> · ' : ''}${esc(fmtDate(f))} · ${esc((r.rp && r.rp.nombre) || '')} · ${nV} ${nV === 1 ? 'vehículo' : 'vehículos'}${s.pend ? ' · ' + s.pend + ' sin responder' : ''}${r.firma ? '' : ' · sin firma'}</p>
      ${window.SEG_API ? SEG_API.histLinea(r) : ''}
      <div class="hbtns">
        <button type="button" class="mini" data-hact="open" data-id="${esc(r.id)}">Abrir</button>
        <button type="button" class="mini" data-hact="pdf" data-id="${esc(r.id)}">PDF</button>
        <button type="button" class="mini" data-hact="dup" data-id="${esc(r.id)}">Duplicar</button>
        <button type="button" class="mini del" data-hact="del" data-id="${esc(r.id)}">Eliminar</button>
      </div>
    </div>
  </article>`;
}
function histAgrupado(list, cf, q) {
  const k = r => hxFecha(r) + ' ' + ((r.rp && r.rp.hora) || '');
  const orden = [...list].sort((a, b) => k(b).localeCompare(k(a)) || (b.creado || 0) - (a.creado || 0));
  const grupos = new Map();
  orden.forEach(r => { const m = hxFecha(r).slice(0, 7); if (!grupos.has(m)) grupos.set(m, []); grupos.get(m).push(r); });
  const todo = !!q || HX_INC;   // buscando o filtrando: todo abierto
  const incT = orden.filter(r => (r.resumen || {}).inc).length;
  const tot = $('#hx-tot'); if (tot) tot.textContent = `${plural(orden.length, 'visita', 'visitas')}${incT ? ' · ' + incT + ' con incidencias' : ''}`;
  let anio = '', i = 0, out = '';
  for (const [m, l] of grupos) {
    const y = m.slice(0, 4);
    if (y !== anio) { anio = y; out += `<h3 class="hx-anio">${y}</h3>`; }
    const inc = l.filter(r => (r.resumen || {}).inc).length;
    const abierto = todo || HX_ABIERTOS.has(m) || (i === 0 && !HX_CERRADOS.has(m));
    out += `<details class="hx-mes" data-mes="${m}"${abierto ? ' open' : ''}><summary><span class="hx-mt">${hxCap(HX_MESES[+m.slice(5, 7) - 1])}</span><span class="hx-mn">${plural(l.length, 'visita', 'visitas')}${inc ? `<b class="hx-mi">${HX_BAD}${inc}<span class="hx-stl"> con incidencias</span></b>` : ''}</span></summary><div class="hx-l">${l.map(r => hxFila(r, cf)).join('')}</div></details>`;
    i++;
  }
  return out;
}
/* tocar una visita: en el móvil se abren sus datos y botones; en el ordenador ancho lo lleva el panel de detalle */
document.addEventListener('click', e => {
  const sm = e.target.closest('#h-list .hx-mes > summary');
  if (sm) { const d = sm.parentNode, k = d.dataset.mes; if (d.open) { HX_ABIERTOS.delete(k); HX_CERRADOS.add(k); } else { HX_ABIERTOS.add(k); HX_CERRADOS.delete(k); } return; }
  const inc = e.target.closest('#hx-inc');
  if (inc) { HX_INC = !HX_INC; inc.setAttribute('aria-pressed', HX_INC); renderHist(); return; }
  const m = e.target.closest('#h-list .hx-main'); if (!m || HX_ANCHO.matches) return;
  const card = m.closest('.hcard'), ab = !card.classList.contains('abierta');
  card.classList.toggle('abierta', ab); m.setAttribute('aria-expanded', ab);
});
document.addEventListener('keydown', e => {
  const m = e.target.closest && e.target.closest('#h-list .hx-main');
  if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); m.click(); }
});
