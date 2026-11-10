/* ================= Panel con gráficos en Inicio (1.25.0) =================
   Cinco piezas, del contrato activo (o de todos si no hay): visitas de cada mes del año, en qué bloque aparecen
   las deficiencias (últimos 12 meses), estado de la planificación preventiva, revisiones de instalaciones y tareas
   del mes. Todo sale de lo que ya hay en la app (HIST, PLAN_API, REV_API, CAL_API): no guarda nada.
   Barras finas con el extremo redondeado, una sola escala por gráfico, el valor del mes actual escrito y el resto
   al pasar o tocar (aviso flotante); los estados llevan icono y texto, nunca solo color; y «Ver los datos en tabla». */
(() => {
const MES1 = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const IOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IWARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v6"/><path d="M12 17v.01"/><circle cx="12" cy="12" r="9"/></svg>';
const IBAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
const IPEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>';
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const delCtr = (r, c) => !c || !!(r.contrato && r.contrato.id === c.id);
const regs = c => (typeof HIST !== 'undefined' && Array.isArray(HIST) ? HIST : []).filter(r => delCtr(r, c));
const fechaDe = r => String((r.rp && r.rp.fecha) || '');

/* ---------- datos ---------- */
function visitasAnio(c) {
  const y = new Date().getFullYear(), m0 = new Date().getMonth(), n = Array(12).fill(0);
  regs(c).forEach(r => { const f = fechaDe(r); if (f.slice(0, 4) === String(y)) { const m = +f.slice(5, 7) - 1; if (m >= 0 && m < 12) n[m]++; } });
  return {y, m0, n, total:n.reduce((a, b) => a + b, 0)};
}
const BLOQUE = id => { const s = STEPS.find(x => x.id === id); return s ? s.l : 'Obra / tajo'; };
function defBloques(c) {
  const d = new Date(), desde = isoDate(new Date(d.getFullYear(), d.getMonth() - 11, 1)), cnt = new Map();
  let vis = 0;
  regs(c).forEach(r => {
    if (fechaDe(r) < desde) return; vis++;
    Object.entries(r.resp || {}).forEach(([id, x]) => { const it = ITEM[id]; if (it && x && x.v && isBad(it, x.v)) { const b = BLOQUE(it.home); cnt.set(b, (cnt.get(b) || 0) + 1); } });
  });
  const l = [...cnt.entries()].map(([b, n]) => ({b, n})).sort((a, b) => b.n - a.n);
  return {l, total:l.reduce((a, x) => a + x.n, 0), vis};
}
const plan = () => window.PLAN_API && PLAN_API.resumenActivo ? PLAN_API.resumenActivo() : null;
const revs = c => window.REV_API && REV_API.resumenDe ? REV_API.resumenDe(c && c.id) : null;
const tareas = () => window.CAL_API ? CAL_API.resumen() : null;

/* ---------- piezas ---------- */
function figVisitas(V) {
  const max = Math.max(1, ...V.n);
  const cols = V.n.map((v, i) => {
    const fut = i > V.m0, now = i === V.m0, h = v ? Math.max(6, Math.round(100 * v / max)) : 0;
    const tip = `${MESL[i][0].toUpperCase() + MESL[i].slice(1)}: ${fut ? 'aún no ha llegado' : plural(v, 'visita', 'visitas')}`;
    return `<button type="button" class="pn-c${now ? ' now' : ''}${fut ? ' fut' : ''}" data-tip="${esc(tip)}" aria-label="${esc(tip)}">
      ${now && v ? `<em>${v}</em>` : ''}<i style="height:${h}%"></i><span>${MES1[i]}</span></button>`;
  }).join('');
  return `<figure class="pn-w pn-vis">
    <figcaption><b>Visitas en ${V.y}</b><span>${plural(V.total, 'visita', 'visitas')} · este mes ${V.n[V.m0]}</span><button type="button" class="pn-ir" data-ini="hist">Historial ›</button></figcaption>
    ${V.total ? `<div class="pn-cols">${cols}</div>` : '<p class="pn-vac">Aún no hay visitas guardadas este año. Cada visita que guardes sumará aquí, mes a mes.</p>'}
  </figure>`;
}
function figDef(D) {
  const max = Math.max(1, ...D.l.map(x => x.n));
  const cuerpo = !D.vis ? '<p class="pn-vac">Cuando guardes visitas verás en qué bloques aparecen las deficiencias.</p>'
    : !D.l.length ? `<p class="pn-vac">${IOK}Ninguna deficiencia en las ${plural(D.vis, 'visita', 'visitas')} de los últimos 12 meses.</p>`
    : `<div class="pn-rows">${D.l.slice(0, 7).map(x => {
        const tip = `${x.b}: ${plural(x.n, 'deficiencia', 'deficiencias')} (${Math.round(100 * x.n / D.total)} %)`;
        return `<button type="button" class="pn-r" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><span class="pn-rl">${esc(x.b)}</span><span class="pn-rb"><i style="width:${Math.max(3, Math.round(100 * x.n / max))}%"></i></span><span class="pn-rv">${x.n}</span></button>`;
      }).join('')}</div>`;
  return `<figure class="pn-w pn-def">
    <figcaption><b>Dónde aparecen las deficiencias</b><span>Últimos 12 meses${D.total ? ' · ' + plural(D.total, 'deficiencia', 'deficiencias') : ''}</span></figcaption>
    ${cuerpo}
  </figure>`;
}
function figPlan(Pl) {
  const segs = Pl && Pl.n ? [['ok', 'Aplicadas', Pl.ok, IOK], ['pend', 'En plazo', Pl.pend, IPEND], ['bad', 'Fuera de plazo', Pl.bad, IBAD]] : [];
  const tot = segs.reduce((a, s) => a + s[2], 0);
  const cuerpo = !tot ? '<p class="pn-vac">Sin medidas en la planificación de este año.</p>'
    : `<div class="pn-stack" role="img" aria-label="${esc(segs.map(s => `${s[1]}: ${s[2]}`).join(', '))}">${segs.filter(s => s[2]).map(s => `<i class="st-${s[0]}" style="flex:${s[2]} 1 0" data-tip="${esc(`${s[1]}: ${plural(s[2], 'medida', 'medidas')} (${Math.round(100 * s[2] / tot)} %)`)}" tabindex="0"></i>`).join('')}</div>
      <ul class="pn-leg">${segs.map(s => `<li class="st-${s[0]}">${s[3]}<span>${s[1]}</span><b>${s[2]}</b></li>`).join('')}</ul>`;
  return `<figure class="pn-w pn-plan">
    <figcaption><b>Planificación preventiva${Pl && Pl.anio ? ' ' + Pl.anio : ''}</b><span>${tot ? Math.round(100 * Pl.ok / tot) + ' % aplicadas · ' + plural(tot, 'medida', 'medidas') : 'Sin planificación'}</span><button type="button" class="pn-ir" data-ini="plan">Abrir ›</button></figcaption>
    ${cuerpo}
  </figure>`;
}
function figRev(Rv) {
  const al = Rv ? Rv.ok + Rv.soon : 0;
  const cuerpo = !Rv || !Rv.n ? '<p class="pn-vac">Sin revisiones dadas de alta.</p>'
    : `<ul class="pn-tiles">
        <li class="st-ok">${IOK}<b>${al}</b><span>Al día</span></li>
        <li class="st-warn">${IWARN}<b>${Rv.warn}</b><span>Vencen pronto</span></li>
        <li class="st-bad">${IBAD}<b>${Rv.bad}</b><span>Vencidas</span></li>
      </ul>`;
  return `<figure class="pn-w pn-rev">
    <figcaption><b>Revisiones de instalaciones</b><span>${Rv && Rv.n ? plural(Rv.n, 'revisión', 'revisiones') + (Rv.none ? ` · ${Rv.none} sin fecha` : '') : ''}</span><button type="button" class="pn-ir" data-ini="rev">Abrir ›</button></figcaption>
    ${cuerpo}
  </figure>`;
}
function figTar(T) {
  const mes = MESL[new Date().getMonth()];
  const p = T && T.mes ? Math.round(100 * T.hechasMes / T.mes) : 0;
  const cuerpo = !T || !T.mes ? '<p class="pn-vac">Sin tareas en el calendario este mes. Añádelas desde Consulta › Tareas.</p>'
    : `<div class="pn-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${T.mes}" aria-valuenow="${T.hechasMes}" aria-label="Tareas de ${mes}: ${T.hechasMes} de ${T.mes} hechas"><i style="width:${p}%"></i></div>
      <p class="pn-pt"><b>${p} %</b> hechas${T.venc ? `<span class="pn-bad">${IBAD}${plural(T.venc, 'vencida', 'vencidas')}</span>` : ''}</p>`;
  return `<figure class="pn-w pn-tar">
    <figcaption><b>Tareas de ${mes}</b><span>${T && T.mes ? `${T.hechasMes} de ${T.mes} hechas` : ''}</span><button type="button" class="pn-ir" data-ini="cal">Calendario ›</button></figcaption>
    ${cuerpo}
  </figure>`;
}
function tabla(V, D, Pl, Rv, T) {
  const f = (a, b) => `<tr><th scope="row">${esc(a)}</th><td>${esc(String(b))}</td></tr>`;
  return `<details class="pn-tabla"><summary>Ver los datos en tabla</summary>
    <table><caption>Visitas en ${V.y}</caption><tbody>${V.n.map((v, i) => i <= V.m0 ? f(MESL[i][0].toUpperCase() + MESL[i].slice(1), v) : '').join('')}</tbody></table>
    ${D.l.length ? `<table><caption>Deficiencias por bloque (últimos 12 meses)</caption><tbody>${D.l.map(x => f(x.b, x.n)).join('')}</tbody></table>` : ''}
    ${Pl && Pl.n ? `<table><caption>Planificación preventiva</caption><tbody>${f('Aplicadas', Pl.ok)}${f('En plazo', Pl.pend)}${f('Fuera de plazo', Pl.bad)}</tbody></table>` : ''}
    ${Rv && Rv.n ? `<table><caption>Revisiones</caption><tbody>${f('Al día', Rv.ok + Rv.soon)}${f('Vencen pronto', Rv.warn)}${f('Vencidas', Rv.bad)}${Rv.none ? f('Sin fecha', Rv.none) : ''}</tbody></table>` : ''}
    ${T && T.mes ? `<table><caption>Tareas del mes</caption><tbody>${f('Hechas', T.hechasMes)}${f('Total', T.mes)}${f('Vencidas (todas)', T.venc)}</tbody></table>` : ''}
  </details>`;
}
function html(c) {
  const V = visitasAnio(c), D = defBloques(c), Pl = plan(), Rv = revs(c), T = tareas();
  return `<section class="ini-card ini-panel" id="ini-panel" aria-labelledby="pn-h">
    <div class="ini-ch"><h2 id="pn-h">Panel</h2><span class="pn-ctr">${c ? esc(c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : 'Todos los contratos'}</span></div>
    <div class="pn-grid">${figVisitas(V)}${figDef(D)}${figPlan(Pl)}${figRev(Rv)}${figTar(T)}</div>
    ${tabla(V, D, Pl, Rv, T)}
    <div class="pn-tip" id="pn-tip" role="tooltip" hidden></div>
  </section>`;
}

/* ---------- aviso flotante al pasar o tocar ---------- */
function muestra(el) {
  const p = $('#ini-panel'), t = $('#pn-tip'); if (!p || !t || !el) return;
  t.textContent = el.dataset.tip; t.hidden = false;
  const rp = p.getBoundingClientRect(), re = el.getBoundingClientRect();
  const w = t.offsetWidth, x = Math.max(8, Math.min(rp.width - w - 8, re.left - rp.left + re.width / 2 - w / 2));
  t.style.left = x + 'px'; t.style.top = Math.max(4, re.top - rp.top - t.offsetHeight - 8) + 'px';
}
const oculta = () => { const t = $('#pn-tip'); if (t) t.hidden = true; };
document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('#ini-panel [data-tip]'); if (el) muestra(el); else if (e.target.closest && !e.target.closest('#ini-panel')) oculta(); });
document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('#ini-panel [data-tip]'); if (el) muestra(el); else oculta(); });
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('#ini-panel [data-tip]'); if (el) muestra(el); else if (!e.target.closest || !e.target.closest('#ini-panel')) oculta(); });
addEventListener('scroll', oculta, {passive:true});

window.PANEL_API = {html, datos:c => ({visitas:visitasAnio(c), def:defBloques(c), plan:plan(), rev:revs(c), tareas:tareas()})};
})();
