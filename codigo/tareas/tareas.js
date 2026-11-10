/* ================= Tareas básicas del técnico de PRL (1.24.0) =================
   La lista de lo que hay que hacer cada mes, cada trimestre, cada año, en cada contrato y cuando pasa algo
   (documento «Revisiones TPRL» de David). Cada tarea dice cuándo toca y está unida a donde se lleva en la app:
   - con fecha fija → Calendario (una a una con el formulario relleno, o todas las que falten de golpe);
   - revisiones con certificado → Revisiones de instalaciones (con su caducidad);
   - una vez en cada contrato → «Ya está hecho» o «Programar» por contrato (quedan en el Calendario);
   - cuando pasa algo → recordatorio y, si hay, el apartado de la app donde se hace.
   Lo que se marca vive en el Calendario y en Revisiones: entra en la copia de seguridad y en la sincronización. */
(() => {
/* r: regla del Calendario {k: tipo, rep, dia (31 = último día del mes), m: primer mes (1-12) para trimestrales y anuales}.
   fija: la fecha la dice el documento → entra en «Añadir las que faltan». kw: para reconocer una tarea parecida ya creada a mano. */
const GRUPOS = [
  {id:'mes', t:'Cada mes', s:'Maquinaria, vehículos e instalaciones.', items:[
    {k:'veh-mes', t:'Revisión mensual de vehículos', cuando:'El último día de cada mes', r:{k:'veh', rep:'mes', dia:31}, fija:true, kw:/revisi[oó]n.*veh[ií]culo|veh[ií]culos.*(y|e) maquinaria/i},
    {k:'maq-mes', t:'Revisión mensual de pequeña maquinaria', cuando:'El último día de cada mes', r:{k:'veh', rep:'mes', dia:31}, fija:true, kw:/peque[ñn]a maquinaria/i},
    {k:'acc-winsie', t:'Introducir los accidentes en WINSIE', det:'Si ha habido alguno ese mes.', cuando:'El último día de cada mes', r:{k:'reg', rep:'mes', dia:31}, fija:true, kw:/accidentes.*winsie|winsie.*accidente/i},
    {k:'indices-prl', t:'Volcar los índices PRL', cuando:'En la primera semana del mes siguiente', r:{k:'reg', rep:'mes', dia:7}, fija:true, kw:/[ií]ndices (prl|del mes)/i},
    {k:'gastos', t:'Gastos PRL y datos PRL', cuando:'En la última semana del mes', r:{k:'reg', rep:'mes', dia:25}, fija:true, kw:/gastos/i},
    {k:'plan-mes', t:'Actualizar la planificación preventiva', cuando:'Cada mes', r:{k:'vis', rep:'mes', dia:31}, fija:true, kw:/planificaci[oó]n/i, ir:'plan'}
  ]},
  {id:'coord', t:'Cada mes · como coordinador', items:[
    {k:'horas-winsie', t:'Introducir las horas en WINSIE', cuando:'El último día de cada mes', r:{k:'reg', rep:'mes', dia:31}, fija:true, kw:/horas.*winsie|winsie.*horas/i},
    {k:'indices-coord', t:'Índices del coordinador', cuando:'Antes del día 5 de cada mes', r:{k:'reg', rep:'mes', dia:5}, fija:true, kw:/[ií]ndices.*coordinador/i}
  ]},
  {id:'cma', t:'Cada mes · calidad y medio ambiente', items:[
    {k:'consumos', t:'Registro de consumos', cuando:'A mitad de mes', r:{k:'ma', rep:'mes', dia:15}, fija:true, kw:/consumo/i},
    {k:'residuos', t:'Listado de residuos', cuando:'A mitad de mes', r:{k:'ma', rep:'mes', dia:15}, fija:true, kw:/residuo/i},
    {k:'ppi', t:'PPI', cuando:'A mitad de mes', r:{k:'ma', rep:'mes', dia:15}, fija:true, kw:/\bppi\b/i},
    {k:'barredora-mes', t:'Barredora', det:'Revisión mensual de calidad y medio ambiente.', cuando:'El primer día del mes siguiente', r:{k:'ma', rep:'mes', dia:1}, fija:true, kw:/barredora/i}
  ]},
  {id:'tri', t:'Cada trimestre', s:'El aviso llega el mes siguiente al trimestre: lo de enero, febrero y marzo, en abril; y así con los demás.', items:[
    {k:'inst-tri', t:'Revisión trimestral de instalaciones', det:'Botiquín, extintores (PCI), equipos anticaída, equipos de izado y escaleras manuales.', nota:'Los equipos anticaída y los de izado necesitan además una revisión anual por empresa externa.', cuando:'En enero, abril, julio y octubre', r:{k:'inst', rep:'tri', dia:10, m:1}, fija:true, kw:/trimestral.*(botiqu|instalaci)|botiqu[ií]n.*extintor/i, ir:'rev'},
    {k:'acc-tri', t:'Entregar la hoja trimestral de accidentes', cuando:'En enero, abril, julio y octubre', r:{k:'reg', rep:'tri', dia:10, m:1}, fija:true, kw:/hoja.*accidentes|accidentes.*trimestral/i},
    {k:'comite', t:'Comité o comisión de Seguridad y Salud', cuando:'Una vez cada trimestre (pon tú el día de la reunión)', r:{k:'hito', rep:'tri'}, kw:/comit[eé]|comisi[oó]n de seguridad/i}
  ]},
  {id:'anu', t:'Cada año', s:'Las revisiones anuales van según la caducidad de su certificado: dalas de alta en Revisiones de instalaciones con la fecha de la última y la app te avisa antes de que caduquen.', items:[
    {k:'rv-cesta', t:'Furgón cesta', det:'Empresa externa.', cuando:'Según la caducidad del certificado', rev:{n:'Plataforma elevadora (furgón cesta)', cada:12, inf:['elev']}, kw:/cesta/i},
    {k:'rv-pluma', t:'Camión pluma', det:'Empresa externa.', cuando:'Según la caducidad del certificado', rev:{n:'Camión pluma', cada:12, inf:['elev']}, kw:/pluma/i},
    {k:'rv-pulpo', t:'Camión pulpo', det:'Empresa externa.', cuando:'Según la caducidad del certificado', rev:{n:'Camión pulpo', cada:12, inf:['elev']}, kw:/pulpo/i},
    {k:'rv-carretilla', t:'Carretilla', det:'Empresa externa.', cuando:'Según la caducidad del certificado', rev:{n:'Carretilla elevadora', cada:12, inf:[]}, kw:/carretilla/i},
    {k:'rv-barredora', t:'Barredora', det:'Es propia: la revisión la hacemos nosotros.', cuando:'Una vez al año', rev:{n:'Barredora', cada:12, inf:[]}, kw:/barredora/i},
    {k:'senal-int', t:'Señalización interna', det:'Registro interno de las instalaciones.', cuando:'Una vez al año, el último día del mes', r:{k:'inst', rep:'anu'}, kw:/se[ñn]alizaci[oó]n interna/i},
    {k:'rv-tierra', t:'Sistema de puesta a tierra', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Puesta a tierra', cada:12, inf:['tierra']}, kw:/puesta a tierra/i},
    {k:'rv-aire', t:'Aires acondicionados', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Aire acondicionado', cada:12, inf:['aire']}, kw:/aire acondicionado|aires acondicionados/i},
    {k:'rv-elev', t:'Aparatos elevadores', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Aparatos elevadores', cada:12, inf:['elev']}, kw:/aparatos elevadores|ascensor/i},
    {k:'rv-pci', t:'Protección contra incendios (PCI)', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Protección contra incendios (PCI)', cada:12, inf:['pci']}, kw:/\bpci\b|contra incendios|extintores/i},
    {k:'rv-bt', t:'Instalación eléctrica', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Instalación eléctrica BT', cada:12, inf:['bt']}, kw:/instalaci[oó]n el[eé]ctrica/i},
    {k:'rv-ct', t:'Centros de transformación', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Centro de transformación', cada:12, inf:['otros']}, kw:/centro(s)? de transformaci[oó]n/i},
    {k:'rv-legio', t:'Legionela', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Legionela, anual (PPCL)', cada:12, inf:['legio']}, kw:/legionel/i},
    {k:'rv-portones', t:'Portones', det:'Revisión externa.', cuando:'Según la caducidad del certificado', rev:{n:'Portones', cada:12, inf:['otros']}, kw:/port[oó]n|puertas (basculantes|correderas)/i},
    {k:'sim-amb', t:'Simulacro ambiental', cuando:'Una vez al año', r:{k:'hito', rep:'anu'}, kw:/simulacro.*ambient/i},
    {k:'sim-vial', t:'Simulacro de seguridad vial', cuando:'Una vez al año', r:{k:'hito', rep:'anu'}, kw:/simulacro.*vial/i},
    {k:'sim-prl', t:'Simulacro de PRL (emergencia)', cuando:'Una vez al año', r:{k:'hito', rep:'anu'}, kw:/simulacro.*(prl|emergencia)/i},
    {k:'formacion', t:'Renovar la formación de medio ambiente y PRL', cuando:'Una vez al año', r:{k:'otr', rep:'anu'}, kw:/formaci[oó]n/i}
  ]},
  {id:'ctr', t:'En cada contrato', s:'Se hacen una vez por contrato (las fichas de los productos químicos, una vez al año). Márcalas en cada uno.', items:[
    {k:'ergo', t:'Mediciones ergonómicas', cuando:'Una vez en cada contrato', ctr:true, r:{k:'otr'}},
    {k:'ruido', t:'Estudio de ruido y vibraciones', cuando:'Una vez en cada contrato', ctr:true, r:{k:'otr'}},
    {k:'pvd', t:'Estudio de PVD (pantallas de visualización de datos)', cuando:'Una vez en cada contrato', ctr:true, r:{k:'otr'}},
    {k:'fds', t:'Revisar las fichas de seguridad de los productos químicos', det:'Por si hay fichas nuevas.', cuando:'Una vez al año en cada contrato', ctr:true, anual:true, r:{k:'otr'}}
  ]},
  {id:'cuando', t:'Cuando toque', s:'No tienen fecha fija: hay que acordarse cuando pasa algo.', items:[
    {k:'inf-acc', t:'Informar a los trabajadores de los accidentes', det:'Dejando registro de que se ha informado.', cuando:'Cada vez que haya un accidente'},
    {k:'cae', t:'Actas CAE (coordinación de actividades empresariales)', cuando:'Siempre que entre una subcontrata nueva'},
    {k:'anexos', t:'Anexos al PSS', cuando:'Si una tarea nueva lo requiere y no está contemplada en el PSS', ir:'pss'}
  ]}
];
const TODAS = GRUPOS.flatMap(g => g.items.map(it => ({...it, g:g.id})));
const FILTROS = [['', 'Todas'], ['mes', 'Cada mes'], ['tri', 'Cada trimestre'], ['anu', 'Cada año'], ['ctr', 'En cada contrato'], ['cuando', 'Cuando toque']];
const IRT = {plan:'Abrir la planificación', rev:'Abrir Revisiones', pss:'Abrir PSS/DGP'};
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
let filtro = lsGet('tar-filtro') || '';
if (!FILTROS.some(f => f[0] === filtro)) filtro = '';

/* ---------- fechas ---------- */
const hoy = () => isoDate(new Date());
const pad = n => String(n).padStart(2, '0');
const fmt = s => s ? fmtDate(s) : '';
/* primera fecha de la regla: el año empieza en enero (o en el mes m) y «desde hoy» deja fuera lo pasado */
function primera(r) {
  const y = new Date().getFullYear();
  if (r.rep === 'mes') return `${y}-01-${pad(Math.min(r.dia || 1, 31))}`;
  if (r.rep === 'tri' && r.dia) return `${y}-${pad(r.m || 1)}-${pad(r.dia)}`;
  return hoy();
}
const sumaAnio = s => { const [y, m, d] = s.split('-').map(Number); return isoDate(new Date(y + 1, m - 1, d)); };

/* ---------- dónde está cada una ---------- */
const calLista = () => window.CAL_API ? CAL_API.lista() : [];
const revLista = () => window.REV_API ? REV_API.lista() : [];
const nombreCtr = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';
function enCal(it) {
  const l = calLista();
  const exacta = l.find(t => t.guia === it.k) || l.find(t => (t.t || '').trim().toLowerCase() === it.t.toLowerCase());
  if (exacta) return {t:exacta, igual:true};
  const par = it.kw && l.find(t => it.kw.test(t.t || ''));
  return par ? {t:par, igual:false} : null;
}
function enRev(it) {
  const l = revLista();
  return l.find(r => r.guia === it.k) || l.find(r => (r.nombre || '').toLowerCase() === it.rev.n.toLowerCase()) || (it.kw && l.find(r => it.kw.test(r.nombre || ''))) || null;
}
/* por contrato: la última vez que se marcó hecha y si está programada */
function enCtr(it, c) {
  const l = calLista().filter(t => t.guia === it.k && t.ctr && t.ctr.id === c.id);
  const hechas = l.flatMap(t => Object.keys(t.hechas || {}).filter(d => t.hechas[d])).sort();
  const ult = hechas[hechas.length - 1] || '';
  const prog = l.find(t => !Object.keys(t.hechas || {}).some(d => t.hechas[d]) && t.f >= hoy());
  const vence = it.anual && ult ? sumaAnio(ult) : '';
  return {ult, prog, vence, tocaOtra:!!(it.anual && ult && vence <= hoy()), tarea:l[0] || null};
}
function resumen() {
  const fijas = TODAS.filter(it => it.fija), faltan = fijas.filter(it => !enCal(it));
  const revs = TODAS.filter(it => it.rev), revFaltan = revs.filter(it => !enRev(it));
  return {fijas:fijas.length, faltan, revs:revs.length, revFaltan};
}

/* ---------- pantalla ---------- */
const estadoCal = (it, e) => e
  ? `<button type="button" class="tar-est ${e.igual ? 'ok' : 'par'}" data-tar-cal="${esc(e.t.id)}">${e.igual ? CHECK + 'En tu calendario' : 'Parecida en tu calendario: «' + esc(e.t.t) + '»'}</button>`
  : `<button type="button" class="btn tar-add" data-tar-nueva="${it.k}">+ Al calendario</button>`;
function filaHtml(it) {
  let acc = '';
  if (it.rev) {
    const r = enRev(it);
    acc = r ? `<button type="button" class="tar-est ok" data-tar-rev="${esc(r.id)}">${CHECK}En Revisiones: «${esc(r.nombre || it.rev.n)}»</button>`
      : `<button type="button" class="btn tar-add" data-tar-alta="${it.k}">+ Dar de alta en Revisiones</button>`;
  } else if (it.ctr) {
    const cs = perfilGet().contratos;
    acc = cs.length ? `<div class="tar-ctrs">${cs.map(c => {
      const e = enCtr(it, c);
      const est = e.tocaOtra ? `<span class="tar-st bad">Toca otra vez (hecho el ${esc(fmt(e.ult))})</span>`
        : e.ult ? `<span class="tar-st ok">${CHECK}Hecho el ${esc(fmt(e.ult))}${e.vence ? ' · la próxima, antes del ' + esc(fmt(e.vence)) : ''}</span>`
        : e.prog ? `<span class="tar-st">Programado para el ${esc(fmt(e.prog.f))}</span>` : '<span class="tar-st warn">Pendiente</span>';
      return `<div class="tar-ctr"><span class="tar-cn">${esc(nombreCtr(c))}</span>${est}<span class="tar-cb">
        ${!e.ult || e.tocaOtra ? `<button type="button" class="btn tar-mini" data-tar-hecho="${it.k}" data-ctr="${esc(c.id)}">Ya está hecho</button>` : ''}
        ${!e.prog && (!e.ult || e.tocaOtra) ? `<button type="button" class="btn tar-mini" data-tar-prog="${it.k}" data-ctr="${esc(c.id)}">Programar</button>` : ''}</span></div>`;
    }).join('')}</div>` : '<p class="help">Da de alta tus contratos en Perfil para marcarlo en cada uno.</p>';
  } else if (it.r) acc = estadoCal(it, enCal(it));
  const ir = it.ir ? `<button type="button" class="linkbtn tar-ir" data-tar-ir="${it.ir}">${IRT[it.ir]} ›</button>` : '';
  return `<div class="tar-it" id="tar-${it.k}">
    <div class="tar-tx"><b>${esc(it.t)}</b>${it.det ? `<span>${esc(it.det)}</span>` : ''}<span class="tar-cu">${esc(it.cuando)}</span>${it.nota ? `<span class="tar-nota">${esc(it.nota)}</span>` : ''}</div>
    ${acc || ir ? `<div class="tar-acc">${acc}${ir}</div>` : ''}
  </div>`;
}
function render() {
  const M = $('#view-tar'); if (!M) return;
  const R = resumen();
  const gs = GRUPOS.filter(g => !filtro || g.id === filtro || (filtro === 'mes' && (g.id === 'coord' || g.id === 'cma')));
  M.innerHTML = `<section class="pl-hero tar-hero">
      <p class="pl-eb">Consulta</p>
      <h2>Tareas del técnico de PRL</h2>
      <p class="pl-ctr">Lo que hay que hacer cada mes, cada trimestre y cada año, en cada contrato y cuando pasa algo.</p>
    </section>
    <section class="block tar-res">
      <div class="bb">
        <p class="tar-rn"><b>${R.fijas - R.faltan.length} de ${R.fijas}</b> tareas con fecha fija ya están en tu calendario${R.revs ? ` · <b>${R.revs - R.revFaltan.length} de ${R.revs}</b> revisiones anuales en Revisiones` : ''}.</p>
        ${R.faltan.length ? `<button type="button" class="btn primary" data-tar-todas="1">Añadir al calendario las ${R.faltan.length} que faltan</button><p class="help">Con la fecha que dice cada una (último día de mes, día 5, mitad de mes…). Luego puedes cambiarlas en el Calendario.</p>` : '<p class="help">Todas las de fecha fija están en el calendario: te saldrán en Inicio › Hoy y vencidas cuando toquen.</p>'}
      </div>
    </section>
    <div class="chips nm-filtros tar-filtros" role="group" aria-label="Filtrar tareas">
      ${FILTROS.map(([k, t]) => `<button type="button" class="chip" data-tar-f="${k}" aria-pressed="${filtro === k}">${esc(t)}</button>`).join('')}
    </div>
    ${gs.map(g => `<section class="block tar-g" id="tar-g-${g.id}">
      <header class="bh"><h2>${esc(g.t)}</h2><span class="pill">${g.items.length}</span></header>
      <div class="bb">${g.s ? `<p class="help tar-gs">${esc(g.s)}</p>` : ''}<div class="tar-l">${g.items.map(it => filaHtml({...it, g:g.id})).join('')}</div></div>
    </section>`).join('')}`;
}

/* ---------- acciones ---------- */
const POR = Object.fromEntries(TODAS.map(it => [it.k, it]));
function tareaCal(it, extra = {}) {
  const r = it.r || {k:'otr'};
  return {t:it.t, k:r.k || 'otr', rep:r.rep || '', f:r.rep && (r.dia || r.rep === 'mes') ? primera(r) : (extra.f || hoy()), notas:[it.det, 'Cuándo: ' + it.cuando.toLowerCase() + '.', it.nota].filter(Boolean).join(' '), guia:it.k, ...extra};
}
async function todas() {
  const R = resumen(); if (!R.faltan.length || !window.CAL_API) return;
  const ok = await ask({title:'Añadir al calendario', yes:'Añadir ' + R.faltan.length, body:`<p>Se añaden al calendario, sin contrato y repitiéndose solas:</p><ul class="tar-ul">${R.faltan.map(it => `<li><b>${esc(it.t)}</b> · ${esc(it.cuando.toLowerCase())}</li>`).join('')}</ul><p class="help">Empiezan a contar desde hoy: no salen como vencidas las de meses pasados.</p>`});
  if (ok !== true) return;
  const n = await CAL_API.agregar(R.faltan.map(it => tareaCal(it)));
  render(); toast(`Añadidas ${n} tareas al calendario.`);
}
async function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tarF != null) { filtro = b.dataset.tarF; lsSet('tar-filtro', filtro); render(); const f = $(`[data-tar-f="${filtro}"]`); if (f) f.focus(); return; }
  if (b.dataset.tarTodas) return todas();
  if (b.dataset.tarCal) { if (window.CAL_API) CAL_API.editar(b.dataset.tarCal); return; }
  if (b.dataset.tarRev) { if (window.REV_API) REV_API.editar(b.dataset.tarRev); return; }
  if (b.dataset.tarIr) { const a = b.dataset.tarIr; if (a === 'plan' && window.PLAN_API) PLAN_API.abrirInicio(); else if (a === 'rev' && window.REV_API) REV_API.abrir(); else if (a === 'pss' && window.PSS_API) PSS_API.abrir(); return; }
  const it = POR[b.dataset.tarNueva || b.dataset.tarAlta || b.dataset.tarHecho || b.dataset.tarProg]; if (!it) return;
  if (b.dataset.tarNueva) { if (window.CAL_API) CAL_API.nueva(tareaCal(it)); return; }
  if (b.dataset.tarAlta) { if (window.REV_API) REV_API.nueva({...it.rev, guia:it.k}); return; }
  const c = perfilGet().contratos.find(x => x.id === b.dataset.ctr); if (!c || !window.CAL_API) return;
  const ctr = {id:c.id, nombre:c.nombre || '', sie:c.sie || ''};
  if (b.dataset.tarHecho) {
    const h = hoy();
    await CAL_API.agregar([{...tareaCal(it, {f:h}), rep:'', ctr, hechas:{[h]:true}}]);
    render(); toast(`«${it.t}» hecho en ${nombreCtr(c)}.`);
    return;
  }
  if (b.dataset.tarProg) CAL_API.nueva({...tareaCal(it, {f:hoy()}), rep:'', ctr});
}
function montar() {
  if ($('#view-tar')) return;
  const main = document.createElement('main');
  main.id = 'view-tar'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  main.addEventListener('click', onClick);
}
window.TAREAS_API = {
  abrir(k) { showTab('tar'); render(); window.scrollTo({top:0}); if (k) { const el = $('#tar-' + k); if (el) el.scrollIntoView({block:'center'}); } },
  onTab(t) { if (t === 'tar') render(); },
  lista: () => TODAS.map(it => ({k:it.k, t:it.t, cuando:it.cuando, det:it.det || '', g:(GRUPOS.find(g => g.id === it.g) || {}).t || ''})),
  subtitulo() { const R = resumen(); return R.faltan.length ? `${R.fijas - R.faltan.length} de ${R.fijas} en tu calendario` : 'Mes, trimestre y año'; }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
