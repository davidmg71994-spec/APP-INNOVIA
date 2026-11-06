/* ================= Inicio de Innovia: perfil del técnico y sus contratos ================= */
(() => {
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  casa: SVG('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
  hist: SVG('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/>'),
  sen: SVG('<path d="M12 3.5 21 19H3z"/><path d="M12 10v4"/><path d="M12 16.6v.1"/>'),
  inf: SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 15.5h5"/>'),
  plan: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m8.5 14.5 2 2 4-4"/>'),
  evrl: SVG('<path d="M12 3.2 19 6v5.5c0 4.4-3 7.9-7 9.3-4-1.4-7-4.9-7-9.3V6z"/><path d="M12 9v4"/><path d="M12 15.8v.1"/>'),
  hoy: SVG('<path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 5.5 2.5 7 2.5 7H4s2.5-1.5 2.5-7"/><path d="M10 19.5a2 2 0 0 0 4 0"/>'),
  cal: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h.01M8 17.2h2M12 17.2h2"/>'),
  rev: SVG('<path d="M14.7 6.3a4 4 0 0 0-5 5L3.5 17.5l3 3 6.2-6.2a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>'),
  norma: SVG('<path d="M5 4.5h10.5L19 8v11.5H5z"/><path d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/>'),
  mas: SVG('<path d="M12 5v14M5 12h14"/>'),
  sig: SVG('<path d="m9 6 6 6-6 6"/>'),
  baja: SVG('<path d="m6 9 6 6 6-6"/>'),
  yo: SVG('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  vis: SVG('<path d="M9 4h6v3H9z"/><path d="M7 5.5H5.5v15h13v-15H17"/><path d="m9 13 2 2 4-4"/>'),
  doc: SVG('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>'),
  con: SVG('<path d="M4 5.5c2.7-1 5.3-1 8 .7 2.7-1.7 5.3-1.7 8-.7v13c-2.7-1-5.3-1-8 .7-2.7-1.7-5.3-1.7-8-.7z"/><path d="M12 6.2v13.2"/>'),
  ctr: SVG('<path d="M4 7.5h16v12H4z"/><path d="M9 7.5V5h6v2.5"/><path d="M4 12.5h16"/>')
};

let HCTR;            // filtro del historial: undefined = contrato activo, null = todos, '-' = sin contrato, o el id
let enPerfil = false;

const P = () => perfilGet();
function activo() {
  const p = P();
  return p.contratos.find(c => c.id === p.activo) || p.contratos[0] || null;
}
const nombreTec = () => (lsGet('rp-nombre') || '').trim();
const iniciales2 = n => n.trim() ? n.trim().split(/\s+/).slice(0, 2).map(w => esc(w[0].toUpperCase())).join('') : IC.yo;
const saludo = () => { const h = new Date().getHours(); return h >= 6 && h < 14 ? 'Buenos días' : h >= 14 && h < 21 ? 'Buenas tardes' : 'Buenas noches'; };
const delContrato = (r, c) => !c || !!(r.contrato && r.contrato.id === c.id);
const hist = () => (typeof HIST !== 'undefined' && Array.isArray(HIST)) ? HIST : [];
const infs = () => (window.INF_API ? INF_API.lista() : []);
const corto = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';

function datos() {
  const c = activo(), ym = isoDate(new Date()).slice(0, 7);
  const regs = hist().filter(r => delContrato(r, c));
  const mes = regs.filter(r => ((r.rp && r.rp.fecha) || '').startsWith(ym));
  const def = mes.reduce((n, r) => n + (((r.resumen || {}).inc) || 0), 0);
  const ins = infs().filter(x => !c || !x.contrato || !x.contrato.id || x.contrato.id === c.id);
  return {c, regs, mes, def, ins};
}

/* ---------- pantalla de inicio ---------- */
function planSub() {
  const r = window.PLAN_API ? PLAN_API.resumenActivo() : null;
  if (!r) return 'Medidas, plazos y responsables';
  return r.n ? `${r.anio}: ${r.pend + r.bad} ${r.pend + r.bad === 1 ? 'pendiente' : 'pendientes'}${r.bad ? ` · ${r.bad} ${r.bad === 1 ? 'vencida' : 'vencidas'}` : ''}` : `${r.anio}: en blanco`;
}
function calSub() {
  const r = window.CAL_API ? CAL_API.resumen() : null;
  if (!r || !r.n) return 'En blanco: añade tus tareas';
  return [r.hoy ? `Hoy: ${r.hoy}` : 'Nada para hoy', r.semana ? `${r.semana} en 7 días` : '', r.venc ? plural(r.venc, 'vencida', 'vencidas') : ''].filter(Boolean).join(' · ');
}
const calN = () => { const r = window.CAL_API ? CAL_API.resumen() : null; return r && r.venc ? r.venc : null; };
const planN = () => { const r = window.PLAN_API ? PLAN_API.resumenActivo() : null; return r && r.n ? r.n : null; };
function tile(o) {
  return `<button type="button" class="ini-t${o.soon ? ' soon' : ''}${o.wide ? ' wide' : ''}${o.bad ? ' bad' : ''}" data-ini="${o.act}"${o.soon ? ` data-n="${esc(o.t)}"` : ''}>
    <span class="ini-ic">${o.ic}</span><span class="ini-tt"><b>${esc(o.t)}</b><small>${esc(o.s)}</small></span>
    ${o.soon ? '<span class="ini-soon">Próximamente</span>' : o.n ? `<span class="ini-n">${esc(o.n)}</span>` : ''}</button>`;
}
function renderHome() {
  const box = $('#ini-home'); if (!box) return;
  const p = P(), nom = nombreTec(), {c, regs, mes, def, ins} = datos();
  const enCurso = !S.id && ((S.rp.ubicacion || '').trim() || Object.keys(S.resp || {}).length);
  const falta = !nom || !p.contratos.length;
  box.innerHTML = `
  <section class="ini-hero">
    <div class="ini-in">
      <div class="ini-top"><img class="ini-logo" src="icons/logo-innovia-dark.png" alt="Innovia" width="402" height="105"><button type="button" class="ini-av" data-ini="perfil" aria-label="Mi perfil">${iniciales2(nom)}</button></div>
      <p class="ini-sp">Servicio de Prevención · Técnicos PRL</p>
      <h1 class="ini-hi">${esc(saludo())}${nom ? ', ' + esc(nom.split(/\s+/)[0]) : ''}</h1>
      <button type="button" class="ini-ctr" data-ini="ctr">${IC.ctr}<span><small>${c ? 'Contrato activo' + (c.sie ? ' · SIE ' + esc(c.sie) : '') : 'Sin contratos'}</small><b>${c ? esc(corto(c)) : 'Añade tu primer contrato'}</b></span>${p.contratos.length > 1 ? IC.baja : IC.sig}</button>
      <div class="ini-kpis">
        <div><b>${mes.length}</b><span>Visitas este mes</span></div>
        <div class="${def ? 'bad' : ''}"><b>${def}</b><span>Deficiencias este mes</span></div>
        <div><b>${ins.length}</b><span>${ins.length === 1 ? 'Informe' : 'Informes'}</span></div>
      </div>
    </div>
  </section>
  <div class="ini-in ini-body">
    ${falta ? `<div class="ini-setup"><b>Configura tu perfil</b><span>${!nom ? 'Pon tu nombre y da' : 'Da'} de alta los contratos que llevas. Cada visita e informe quedará ligado a su contrato.</span><button type="button" class="btn primary" data-ini="onb">Configurar mi perfil</button></div>` : ''}
    <button type="button" class="btn primary ini-new" data-ini="nueva">${IC.mas}Nueva visita</button>
    ${enCurso ? `<button type="button" class="ini-cont" data-ini="seguir"><span><small>Registro sin guardar</small><b>${esc((S.rp.ubicacion || '').trim() || 'Registro empezado')}</b></span><i>Continuar</i></button>` : ''}
    <h2 class="ini-sec">Actividad diaria</h2>
    <div class="ini-grid">
      ${tile({act:'hist', ic:IC.hist, t:'Historial', s:c ? 'Visitas de este contrato' : 'Tus visitas guardadas', n:regs.length})}
      ${tile({act:'sen', ic:IC.sen, t:'Señalización', s:'Láminas de la Norma 8.3-IC'})}
      ${tile({act:'cal', ic:IC.cal, t:'Calendario PRL', s:calSub(), n:calN(), wide:true, bad:!!calN()})}
    </div>
    <h2 class="ini-sec">Documentos</h2>
    <div class="ini-grid">
      ${tile({act:'inf', ic:IC.inf, t:'Informe de seguimiento', s:'Cuatrimestral, en Word', n:ins.length})}
      ${tile({act:'plan', ic:IC.plan, t:'Planificación preventiva', s:planSub(), n:planN()})}
      ${tile({act:'soon', ic:IC.evrl, t:'Evaluación de riesgos (EVRL)', s:'Puestos, riesgos y prioridades', soon:true, wide:true})}
    </div>
    <h2 class="ini-sec">Control y consulta</h2>
    <div class="ini-grid">
      ${tile({act:'soon', ic:IC.rev, t:'Revisiones', s:'Vehículos, equipos, instalaciones', soon:true})}
      ${tile({act:'soon', ic:IC.norma, t:'Normativa PRL', s:'Consulta con enlace al BOE', soon:true})}
    </div>
    <button type="button" class="ini-me" data-ini="perfil"><span class="ini-av sm">${iniciales2(nom)}</span><span><b>${esc(nom || 'Mi perfil')}</b><small>${esc(p.cargo || 'Técnico de prevención')} · ${plural(p.contratos.length, 'contrato', 'contratos')}</small></span>${IC.sig}</button>
  </div>`;
}

/* ---------- perfil ---------- */
function renderPerfil() {
  const box = $('#ini-perfil'); if (!box) return;
  const p = P(), a = activo();
  const cards = p.contratos.map(c => {
    const on = a && a.id === c.id;
    return `<article class="ini-cc${on ? ' on' : ''}">
      <div class="ini-cc-h"><b>${esc(c.nombre || 'Contrato sin nombre')}</b>${on ? '<span class="pill ok">Activo</span>' : ''}</div>
      ${c.sie || c.cliente ? `<p class="ini-cc-s">${[c.sie && 'Nº SIE ' + c.sie, c.cliente].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
      ${c.osm ? `<p class="help">${esc(c.osm)}</p>` : ''}
      <div class="hbtns">${on ? '' : `<button type="button" class="mini" data-ini="usar" data-id="${esc(c.id)}">Usar este</button>`}<button type="button" class="mini" data-ini="editar" data-id="${esc(c.id)}">Editar</button><button type="button" class="mini del" data-ini="borrar" data-id="${esc(c.id)}">Eliminar</button></div>
    </article>`;
  }).join('');
  box.innerHTML = `
  <div class="ini-in ini-pf">
    <div class="ihead"><button type="button" class="linkbtn" data-ini="home">‹ Inicio</button></div>
    <div class="ini-pfh"><span class="ini-av lg">${iniciales2(nombreTec())}</span><div><h2>Mi perfil</h2><p class="help">Se guarda solo en este móvil y entra en la copia de seguridad.</p></div></div>
    <section class="block">
      <header class="bh"><h2>Mis datos</h2></header>
      <div class="bb g2">
        <div class="field span2"><label for="pf-nombre">Nombre y apellidos</label><input id="pf-nombre" data-pf="nombre" autocomplete="name" value="${esc(nombreTec())}"></div>
        <div class="field span2"><label for="pf-cargo">Cargo</label><input id="pf-cargo" data-pf="cargo" value="${esc(p.cargo || '')}" placeholder="Técnico de prevención"></div>
        <div class="field"><label for="pf-tel">Teléfono</label><input id="pf-tel" data-pf="tel" type="tel" autocomplete="tel" value="${esc(p.tel || '')}"></div>
        <div class="field"><label for="pf-email">Correo</label><input id="pf-email" data-pf="email" type="email" autocomplete="email" value="${esc(p.email || '')}"></div>
      </div>
      <p class="help ini-note">Tu nombre sale en cada registro, en los PDF y en los informes.</p>
    </section>
    <section class="block">
      <header class="bh"><h2>Mis contratos</h2><span class="pill">${p.contratos.length}</span></header>
      <div class="bb">
        ${cards || '<p class="help">Aún no tienes contratos. Añade los que llevas: cada visita e informe se guardará con su contrato y podrás ver cada uno por separado.</p>'}
        <button type="button" class="btn ini-add" data-ini="nuevo">${IC.mas}Añadir contrato</button>
      </div>
    </section>
  </div>`;
}
function verPerfil(on) {
  enPerfil = on;
  $('#ini-home').hidden = on; $('#ini-perfil').hidden = !on;
  document.body.classList.toggle('ini-pf-on', on);
  if (on) renderPerfil(); else renderHome();
  navSync('ini');
  window.scrollTo({top:0});
}

/* ---------- contratos ---------- */
async function formContratoModal(c) {
  const nuevo = !c; c = c || {};
  const r = await ask({title:nuevo ? 'Nuevo contrato' : 'Editar contrato', yes:nuevo ? 'Añadir' : 'Guardar', body:`
    <div class="field"><label for="cf-nom">Nombre corto</label><input id="cf-nom" value="${esc(c.nombre || '')}" placeholder="Ej.: Sector V-1 · Conservación Valencia"></div>
    <div class="field"><label for="cf-sie">Nº SIE</label><input id="cf-sie" inputmode="numeric" value="${esc(c.sie || '')}" placeholder="Ej.: 517"></div>
    <div class="field"><label for="cf-cli">Cliente u organismo</label><input id="cf-cli" value="${esc(c.cliente || '')}" placeholder="Ej.: Ministerio de Transportes"></div>
    <div class="field"><label for="cf-osm">Objeto del contrato (O/S/M)</label><textarea id="cf-osm" rows="3" placeholder="Ej.: Ejecución de diversas operaciones de conservación y explotación…">${esc(c.osm || '')}</textarea></div>
    <p class="help">El Nº SIE y el objeto salen en la cabecera del informe de seguimiento.</p>`});
  if (r !== true) return null;
  const v = id => ((($('#' + id) || {}).value) || '').trim();
  const out = {id:c.id || ('c' + Date.now().toString(36) + key().slice(0, 3)), nombre:v('cf-nom'), sie:v('cf-sie'), cliente:v('cf-cli'), osm:v('cf-osm')};
  if (!out.nombre && !out.sie) { toast('Pon al menos el nombre o el Nº SIE.'); return formContratoModal({...c, ...out}); }
  return out;
}
async function nuevoContrato() {
  const c = await formContratoModal(null); if (!c) return null;
  return crearContrato(c);
}
async function crearContrato(c) {
  const p = P(); const primero = !p.contratos.length;
  p.contratos.push(c); if (primero || !p.activo) p.activo = c.id;
  perfilSet(p); HCTR = undefined;
  if (primero) await asignarSueltos(c);
  if (!S.id && !S.contrato) { S.contrato = snapContrato(c); queueDraft(); }
  formContrato(); renderTodo();
  toast(`Contrato «${corto(c)}» añadido.`);
  return c;
}
/* al dar de alta el primer contrato: las visitas e informes de antes no tienen contrato */
async function asignarSueltos(c) {
  const sueltos = hist().filter(r => !(r.contrato && r.contrato.id));
  const infSueltos = infs().filter(x => !(x.contrato && x.contrato.id));
  if (!sueltos.length && !infSueltos.length) return;
  const que = [sueltos.length && plural(sueltos.length, 'visita guardada', 'visitas guardadas'), infSueltos.length && plural(infSueltos.length, 'informe', 'informes')].filter(Boolean).join(' y ');
  const ok = await ask({title:'¿Asignar lo que ya tienes?', yes:'Asignar', no:'Dejar sin contrato',
    body:`<p>Tienes ${que} de antes de usar contratos.</p><p>¿Los paso a «${esc(corto(c))}»? Si llevas varios contratos, podrás cambiar cada visita desde su paso «Datos».</p>`});
  if (ok !== true) return;
  const snap = snapContrato(c);
  try {
    for (const r of sueltos) { r.contrato = snap; await hdb.put(r); }
    if (window.INF_API && INF_API.asignarContrato) await INF_API.asignarContrato(snap);
    await loadHist();
    toast(`Asignado: ${que}.`);
  } catch (e) { toast('No se pudieron asignar todos.'); }
}
async function editarContrato(id) {
  const p = P(), i = p.contratos.findIndex(c => c.id === id); if (i < 0) return;
  const c = await formContratoModal(p.contratos[i]); if (!c) return;
  p.contratos[i] = c; perfilSet(p);
  /* el nombre guardado en las visitas se actualiza para que todo diga lo mismo */
  const snap = snapContrato(c), cambiar = hist().filter(r => r.contrato && r.contrato.id === id && (r.contrato.nombre !== snap.nombre || r.contrato.sie !== snap.sie));
  try { for (const r of cambiar) { r.contrato = snap; await hdb.put(r); } if (cambiar.length) await loadHist(); } catch (e) {}
  if (S.contrato && S.contrato.id === id) S.contrato = snap;
  if (window.INF_API && INF_API.asignarContrato) await INF_API.asignarContrato(snap, true);
  formContrato(); renderTodo(); toast('Contrato guardado.');
}
async function borrarContrato(id) {
  const p = P(), c = p.contratos.find(x => x.id === id); if (!c) return;
  const n = hist().filter(r => r.contrato && r.contrato.id === id).length;
  const ok = await ask({title:'¿Eliminar el contrato?', danger:true, yes:'Eliminar',
    body:`<p>«${esc(corto(c))}» deja de estar en tu perfil.</p>${n ? `<p>Sus ${plural(n, 'visita', 'visitas')} no se borran: siguen en el Historial con su contrato, en «Todos».</p>` : ''}`});
  if (ok !== true) return;
  p.contratos = p.contratos.filter(x => x.id !== id);
  if (p.activo === id) p.activo = p.contratos[0] ? p.contratos[0].id : null;
  perfilSet(p); HCTR = undefined; formContrato(); renderTodo();
}
function usarContrato(id) {
  const p = P(); if (!p.contratos.some(c => c.id === id)) return;
  p.activo = id; perfilSet(p); HCTR = undefined;
  /* un registro recién empezado y vacío pasa al contrato nuevo */
  if (!S.id && !(S.rp.ubicacion || '').trim() && !Object.keys(S.resp || {}).length) { S.contrato = snapContrato(); queueDraft(); formContrato(); }
  renderTodo();
  toast(`Trabajando en «${corto(activo())}».`);
}
async function elegirContrato() {
  const p = P();
  if (!p.contratos.length) { await nuevoContrato(); return; }
  const a = activo();
  const r = await ask({title:'Contrato activo', yes:'Usar este', no:'Gestionar contratos', body:`<p class="help">Las visitas nuevas, los informes y el Historial se ponen en este contrato.</p>
    <div class="ini-pick">${p.contratos.map(c => `<label class="ini-opt"><input type="radio" name="ini-c" value="${esc(c.id)}"${a && a.id === c.id ? ' checked' : ''}><span><b>${esc(c.nombre || 'Contrato')}</b>${c.sie || c.cliente ? `<small>${[c.sie && 'Nº SIE ' + c.sie, c.cliente].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</span></label>`).join('')}</div>`});
  if (r === true) { const el = document.querySelector('input[name="ini-c"]:checked'); if (el && (!a || el.value !== a.id)) usarContrato(el.value); }
  else if (r === false) { showTab('ini'); verPerfil(true); }
}

/* ---------- el contrato dentro del registro (paso Datos) ---------- */
function formContrato() {
  const f = $('#f-contrato'), sel = $('#rp-contrato'); if (!f || !sel) return;
  const p = P(), cur = S.contrato && S.contrato.id ? S.contrato : null;
  const opts = p.contratos.map(c => ({id:c.id, t:nombreContrato(c)}));
  if (cur && !opts.some(o => o.id === cur.id)) opts.push({id:cur.id, t:nombreContrato(cur) + ' (ya no está en tu perfil)'});
  f.hidden = !opts.length;
  sel.innerHTML = (cur ? '' : '<option value="">Sin contrato</option>') + opts.map(o => `<option value="${esc(o.id)}">${esc(o.t)}</option>`).join('');
  sel.value = cur ? cur.id : '';
}
function cambiaContratoForm() {
  const sel = $('#rp-contrato'); if (!sel) return;
  const c = contratoPorId(sel.value);
  S.contrato = c ? snapContrato(c) : (S.contrato && S.contrato.id === sel.value ? S.contrato : null);
  formContrato(); changed(); renderCabecera();
}

/* ---------- filtro del Historial por contrato ---------- */
function filtroHist() {
  if (!P().contratos.length) return null;
  if (HCTR === undefined) { const a = activo(); return a ? a.id : null; }
  return HCTR;
}
function chipsHist() {
  const box = $('#h-ctr'); if (!box) return;
  const p = P();
  if (!p.contratos.length) { box.hidden = true; box.innerHTML = ''; pintaHomeSiVisible(); return; }
  const f = filtroHist() || '';
  const sin = hist().some(r => !(r.contrato && r.contrato.id));
  const chips = [['', 'Todos'], ...p.contratos.map(c => [c.id, corto(c)]), ...(sin ? [['-', 'Sin contrato']] : [])];
  box.hidden = false;
  box.innerHTML = chips.map(([id, t]) => `<button type="button" class="chip" data-hc="${esc(id)}" aria-pressed="${f === id}">${esc(t)}</button>`).join('');
  pintaHomeSiVisible();
}
function pintaHomeSiVisible() { const v = $('#view-ini'); if (v && !v.hidden && !enPerfil) renderHome(); }

/* ---------- eventos ---------- */
function renderTodo() {
  if (enPerfil) renderPerfil(); else renderHome();
  if (typeof renderHist === 'function') renderHist();
  if (window.INF_API && INF_API.refrescar) INF_API.refrescar();
}
async function onClick(e) {
  const b = e.target.closest('[data-ini]'); if (!b) return;
  const a = b.dataset.ini;
  if (a === 'perfil') return verPerfil(true);
  if (a === 'onb') return abrirOnb();
  if (a === 'home') return verPerfil(false);
  if (a === 'ctr') return elegirContrato();
  if (a === 'nuevo') return nuevoContrato();
  if (a === 'usar') return usarContrato(b.dataset.id);
  if (a === 'editar') return editarContrato(b.dataset.id);
  if (a === 'borrar') return borrarContrato(b.dataset.id);
  if (a === 'hist') return showTab('hist');
  if (a === 'sen') { senFrom = null; return showTab('sen'); }
  if (a === 'inf') { const t = $('#tab-inf'); if (t) t.click(); return; }
  if (a === 'plan') { if (window.PLAN_API) PLAN_API.abrirInicio(); return; }
  if (a === 'cal') { if (window.CAL_API) CAL_API.abrir(); return; }
  if (a === 'seguir') { showTab('form'); return; }
  if (a === 'nueva') {
    if (!(await confirmLeave())) return;
    S = blank(); dirty = false; renderAll(); queueDraft(); showTab('form'); setStep(0);
    return;
  }
  if (a === 'soon') toast(`«${b.dataset.n}» llegará en una próxima versión.`);
}
function onInput(e) {
  const t = e.target, k = t.dataset.pf; if (!k) return;
  if (k === 'nombre') {
    lsSet('rp-nombre', t.value);
    if (!S.id || !(S.rp.nombre || '').trim()) { S.rp.nombre = t.value; const f = $('#rp-nombre'); if (f) f.value = t.value; queueDraft(); }
    const av = document.querySelector('.ini-pfh .ini-av'); if (av) av.innerHTML = iniciales2(t.value);
    return;
  }
  const p = P(); p[k] = t.value.trim(); perfilSet(p);
}

/* ---------- barra de abajo por grupos y subpestañas arriba ---------- */
const GRUPO = {form:'vis', hist:'vis', inf:'doc', plan:'doc', sen:'con'};
let tabAct = 'ini';
function navSync(t) {
  if (t) tabAct = t;
  const g = tabAct === 'ini' ? (enPerfil ? 'pf' : 'ini') : (GRUPO[tabAct] || 'ini');
  document.querySelectorAll('.bottomnav [data-grp]').forEach(b => b.setAttribute('aria-selected', b.dataset.grp === g));
  const sub = $('#subnav'); if (!sub) return;
  const con = g === 'vis' || g === 'doc' || g === 'con';
  sub.hidden = !con; document.body.classList.toggle('sub-on', con);
  sub.querySelectorAll('[data-g]').forEach(b => { b.hidden = b.dataset.g !== g; });
  if (GRUPO[tabAct]) lsSet('sub-' + g, tabAct);
}
function irGrupo(g) {
  if (g === 'ini') { showTab('ini'); if (enPerfil) verPerfil(false); return; }
  if (g === 'pf') { showTab('ini'); verPerfil(true); return; }
  const def = {vis:'form', doc:'inf', con:'sen'}[g], ult = lsGet('sub-' + g);
  const t = ult && GRUPO[ult] === g ? ult : def;
  const b = $('#tab-' + t); if (b) b.click();
}
function montarNav() {
  const nav = $('.bottomnav'); if (!nav || $('#subnav')) return;
  /* subpestañas: las de siempre, ahora arriba y agrupadas */
  const sub = document.createElement('nav'); sub.className = 'subnav'; sub.id = 'subnav'; sub.setAttribute('role', 'tablist'); sub.setAttribute('aria-label', 'Apartados de la sección'); sub.hidden = true;
  const mover = (id, g) => { const b = $('#' + id); if (!b) return; b.className = 'stab'; b.dataset.g = g; sub.appendChild(b); };
  const nueva = (id, g, ic, txt, soon) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'stab' + (soon ? ' soon' : ''); b.id = id; b.dataset.g = g; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.innerHTML = ic + `<span>${esc(txt)}</span>` + (soon ? '<i>pronto</i>' : ''); sub.appendChild(b); return b; };
  mover('tab-form', 'vis'); mover('tab-hist', 'vis');
  mover('tab-inf', 'doc');
  nueva('tab-plan', 'doc', IC.plan, 'Planificación').addEventListener('click', () => { if (window.PLAN_API) PLAN_API.abrirInicio(); });
  nueva('tab-evrl', 'doc', IC.evrl, 'EVRL', true).addEventListener('click', () => toast('La evaluación de riesgos (EVRL) llegará en una próxima versión.'));
  mover('tab-sen', 'con');
  nueva('tab-norma', 'con', IC.norma, 'Normativa', true).addEventListener('click', () => toast('La normativa PRL llegará en una próxima versión.'));
  const tin = $('.top-in'), steps = $('#steps'); tin.insertBefore(sub, steps);
  /* barra de abajo: 5 secciones */
  const ti = $('#tab-ini'); ti.dataset.grp = 'ini';
  [['vis', IC.vis, 'Visitas'], ['doc', IC.doc, 'Documentos'], ['con', IC.con, 'Consulta'], ['pf', IC.yo, 'Perfil']].forEach(([g, ic, t]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tab'; b.id = 'nav-' + g; b.dataset.grp = g; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
    b.innerHTML = ic + `<span>${t}</span>`; b.addEventListener('click', () => irGrupo(g)); nav.appendChild(b);
  });
  ti.onclick = null;
  navSync();
}

/* ---------- primera vez: perfil, contrato y primera visita ---------- */
let onbPaso = 0;
function abrirOnb(paso = 0) {
  let o = $('#onb');
  if (!o) {
    o = document.createElement('div'); o.className = 'onb'; o.id = 'onb'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'onb-t');
    document.body.appendChild(o);
    o.addEventListener('click', onbClick);
  }
  o.hidden = false; document.body.classList.add('onb-on');
  onbIr(paso);
}
function cerrarOnb(visto = true) { const o = $('#onb'); if (o) o.hidden = true; document.body.classList.remove('onb-on'); if (visto) lsSet('onb-vista', '1'); renderTodo(); }
function onbIr(i) {
  onbPaso = Math.max(0, Math.min(2, i));
  const o = $('#onb'), p = P(), nom = nombreTec(), c = activo();
  const dots = [0, 1, 2].map(k => `<i class="${k === onbPaso ? 'on' : k < onbPaso ? 'ok' : ''}"></i>`).join('');
  const top = `<div class="onb-top"><img src="icons/logo-innovia-dark.png" alt="Innovia" width="402" height="105"><div class="onb-dots" aria-hidden="true">${dots}</div><p class="onb-n">Paso ${onbPaso + 1} de 3</p></div>`;
  let body = '', foot = '';
  if (onbPaso === 0) {
    body = `<h2 id="onb-t">Te damos la bienvenida a Visitas PRL</h2><p class="onb-x">Empecemos por ti. Tu nombre sale en cada registro, en los PDF y en los informes.</p>
      <div class="field"><label for="ob-nom">Nombre y apellidos</label><input id="ob-nom" autocomplete="name" value="${esc(nom)}" placeholder="Ej.: Ana García López"></div>
      <div class="field"><label for="ob-cargo">Cargo</label><input id="ob-cargo" value="${esc(p.cargo || '')}" placeholder="Técnico de prevención"></div>
      <div class="g2"><div class="field"><label for="ob-tel">Teléfono</label><input id="ob-tel" type="tel" autocomplete="tel" value="${esc(p.tel || '')}"></div><div class="field"><label for="ob-mail">Correo</label><input id="ob-mail" type="email" autocomplete="email" value="${esc(p.email || '')}"></div></div>`;
    foot = `<button type="button" class="btn" data-ob="luego">Ahora no</button><button type="button" class="btn primary" data-ob="s1">Siguiente</button>`;
  } else if (onbPaso === 1) {
    body = `<h2 id="onb-t">Tu contrato</h2><p class="onb-x">${p.contratos.length ? 'Ya tienes estos contratos. Puedes añadir otro o seguir.' : 'Da de alta el contrato con el que trabajas. Cada visita, informe y planificación quedará ligada a él. Si llevas varios, añade el resto luego desde Perfil.'}</p>
      ${p.contratos.length ? `<div class="onb-ctrs">${p.contratos.map(x => `<div class="onb-ctr${c && c.id === x.id ? ' on' : ''}">${IC.ctr}<span><b>${esc(x.nombre || 'Contrato')}</b>${x.sie ? `<small>Nº SIE ${esc(x.sie)}</small>` : ''}</span></div>`).join('')}</div>
        <button type="button" class="btn ini-add" data-ob="otro">${IC.mas}Añadir otro contrato</button>` : `
      <div class="field"><label for="ob-cn">Nombre corto del contrato</label><input id="ob-cn" placeholder="Ej.: Sector V-1 · Conservación Valencia"></div>
      <div class="field"><label for="ob-sie">Nº SIE</label><input id="ob-sie" inputmode="numeric" placeholder="Ej.: 517"></div>
      <div class="field"><label for="ob-osm">Objeto del contrato (O/S/M) <i class="opc">opcional</i></label><textarea id="ob-osm" rows="3" placeholder="Ej.: Ejecución de diversas operaciones de conservación y explotación en las carreteras del Sector V-1…"></textarea></div>`}`;
    foot = `<button type="button" class="btn" data-ob="atras">Atrás</button><button type="button" class="btn primary" data-ob="s2">${p.contratos.length ? 'Siguiente' : 'Guardar y seguir'}</button>`;
  } else {
    body = `<h2 id="onb-t">Todo listo${nom ? ', ' + esc(nom.split(/\s+/)[0]) : ''}</h2><p class="onb-x">Ya puedes hacer tu primera visita. La app te lleva paso a paso por el registro de comprobación y al final sale el PDF.</p>
      <div class="onb-res"><span class="ini-av lg">${iniciales2(nom)}</span><span><b>${esc(nom || 'Sin nombre')}</b><small>${esc(p.cargo || 'Técnico de prevención')}</small>${c ? `<small class="hctr-t">${esc(nombreContrato(c))}</small>` : '<small>Sin contrato todavía</small>'}</span></div>
      <ul class="onb-tips"><li><b>Inicio</b>: tus cifras del mes, el contrato activo y tu calendario PRL.</li><li><b>Visitas</b>: el registro y el historial.</li><li><b>Documentos</b>: informe de seguimiento y planificación preventiva.</li><li><b>Perfil</b>: tus datos y tus contratos.</li></ul>`;
    foot = `<button type="button" class="btn" data-ob="fin">Ir al Inicio</button><button type="button" class="btn primary" data-ob="visita">Empezar mi primera visita</button>`;
  }
  o.innerHTML = top + `<div class="onb-body"><div class="onb-in">${body}</div></div><div class="onb-foot">${foot}</div>`;
  o.scrollTop = 0;
  setTimeout(() => { const f = o.querySelector('.onb-in input'); if (f && onbPaso < 2) f.focus(); }, 60);
}
async function onbClick(e) {
  const b = e.target.closest('[data-ob]'); if (!b) return;
  const a = b.dataset.ob, v = id => ((($('#' + id) || {}).value) || '').trim();
  if (a === 'luego') { cerrarOnb(true); toast('Puedes terminarlo cuando quieras desde Inicio › Configurar mi perfil.'); return; }
  if (a === 'atras') return onbIr(onbPaso - 1);
  if (a === 's1') {
    const nom = v('ob-nom'); if (!nom) { toast('Escribe tu nombre y apellidos.'); $('#ob-nom').focus(); return; }
    lsSet('rp-nombre', nom);
    if (!S.id || !(S.rp.nombre || '').trim()) { S.rp.nombre = nom; const f = $('#rp-nombre'); if (f) f.value = nom; queueDraft(); }
    const p = P(); p.cargo = v('ob-cargo'); p.tel = v('ob-tel'); p.email = v('ob-mail'); perfilSet(p);
    return onbIr(1);
  }
  if (a === 'otro') { const c = await formContratoModal(null); if (c) await crearContrato(c); return onbIr(1); }
  if (a === 's2') {
    if (!P().contratos.length) {
      const c = {id:'c' + Date.now().toString(36) + key().slice(0, 3), nombre:v('ob-cn'), sie:v('ob-sie'), cliente:'', osm:v('ob-osm')};
      if (!c.nombre && !c.sie) { toast('Pon al menos el nombre o el Nº SIE del contrato.'); $('#ob-cn').focus(); return; }
      await crearContrato(c);
    }
    return onbIr(2);
  }
  if (a === 'fin') { cerrarOnb(true); showTab('ini'); if (enPerfil) verPerfil(false); return; }
  if (a === 'visita') {
    cerrarOnb(true);
    if (!(await confirmLeave())) return;
    S = blank(); dirty = false; renderAll(); queueDraft(); showTab('form'); setStep(0);
  }
}
function onbAuto() {
  if (lsGet('onb-vista') || ($('#onb') && !$('#onb').hidden)) return;
  if (nombreTec() && P().contratos.length) return;
  if (!$('#guia').hidden || !$('#modal').hidden) return;
  abrirOnb(nombreTec() ? 1 : 0);
}

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-ini'; main.setAttribute('role', 'tabpanel'); main.setAttribute('aria-labelledby', 'tab-ini');
  main.innerHTML = '<div id="ini-home"></div><div id="ini-perfil" hidden></div>';
  const form = $('#view-form'); form.parentNode.insertBefore(main, form);
  const tab = document.createElement('button');
  tab.className = 'tab'; tab.setAttribute('role', 'tab'); tab.id = 'tab-ini'; tab.setAttribute('aria-selected', 'true'); tab.setAttribute('aria-controls', 'view-ini');
  tab.innerHTML = IC.casa + '<span>Inicio</span>';
  const nav = $('.bottomnav'); nav.insertBefore(tab, nav.firstChild); nav.classList.add('n5');
  tab.addEventListener('click', () => { showTab('ini'); if (enPerfil) verPerfil(false); });
  main.addEventListener('click', onClick); main.addEventListener('input', onInput);
  const sel = $('#rp-contrato'); if (sel) sel.addEventListener('change', cambiaContratoForm);
  $('#h-ctr').addEventListener('click', e => { const b = e.target.closest('[data-hc]'); if (!b) return; HCTR = b.dataset.hc || null; renderHist(); });
  formContrato();
  showTab('ini');
  setTimeout(montarNav, 0);
  setTimeout(onbAuto, 1600);
}
window.INI_API = {
  activo, filtroHist, chipsHist, formContrato,
  atras() {
    const o = $('#onb'); if (o && !o.hidden) { if (onbPaso > 0) onbIr(onbPaso - 1); else cerrarOnb(true); return true; }
    if (enPerfil && !$('#view-ini').hidden) { verPerfil(false); return true; }
    return false;
  },
  onTab(t) { document.body.classList.toggle('on-ini', t === 'ini'); if (t === 'ini') { if (enPerfil) renderPerfil(); else renderHome(); } navSync(t); },
  trasGuia() { setTimeout(onbAuto, 350); },
  abrirOnb,
  /* copia de seguridad: añade los contratos que no estén y el nombre si falta */
  importarPerfil(pf) {
    if (!pf || typeof pf !== 'object') return 0;
    const p = P(); let n = 0;
    (Array.isArray(pf.contratos) ? pf.contratos : []).forEach(c => { if (c && c.id && !p.contratos.some(x => x.id === c.id)) { p.contratos.push({id:c.id, nombre:c.nombre || '', sie:c.sie || '', cliente:c.cliente || '', osm:c.osm || ''}); n++; } });
    ['cargo', 'tel', 'email'].forEach(k => { if (!p[k] && pf[k]) p[k] = pf[k]; });
    if (!p.activo && p.contratos[0]) p.activo = pf.activo && p.contratos.some(c => c.id === pf.activo) ? pf.activo : p.contratos[0].id;
    if (!nombreTec() && pf.nombre) lsSet('rp-nombre', pf.nombre);
    perfilSet(p); formContrato(); renderTodo();
    return n;
  },
  refrescar: renderTodo
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
