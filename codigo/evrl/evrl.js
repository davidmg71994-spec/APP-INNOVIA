/* ================= EVRL: evaluación de riesgos por puesto, modelo INNOVIA (I-CORP 20A-3) ================= */
(() => {
/*EVRL-DATOS*/
const T = DATA.T, TYPES = DATA.types, PZ = DATA.puestos, NOTES = DATA.notes;
const TYPE = Object.fromEntries(TYPES.map(t => [t.key, t]));
/* leyenda del método */
const LEG = {
  P: {A:'Es el resultado más probable que pase', B:'Es completamente posible, probabilidad del 50 % aprox.', C:'La probabilidad que pase es del 25 % aprox.', D:'No es lo más probable, secuencia o coincidencia «rara»', E:'Secuencia o coincidencia remota'},
  S: {A:'Muerte', B:'Lesiones muy graves', C:'Lesiones graves', D:'Lesiones leves', E:'No se prevén daños'},
  R: {A:'Alto · Prioridad 1ª', B:'Medio · Prioridad 2ª', C:'Bajo · Prioridad 3ª'}
};
const RSHORT = {A:'Alto · 1ª', B:'Medio · 2ª', C:'Bajo · 3ª'};
const ESPN = {S:'Seguridad', H:'Higiene', E:'Ergonomía', PS:'Psicosociología', '':'Sin especificar'};
const DEFAULT_ANEXO = 'Anexo I – Evaluación de riesgos laborales por puesto';
const CHEV = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- estado de una EVRL (mismo formato que la herramienta EVRL INNOVIA: sus proyectos .json se abren aquí) ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
function freshRisk(t, vi, on) { const v = t.vars[vi]; return {on, vi, esp:v.esp, v:v.v.slice(), off:[], custom:[]}; }
function makePuesto(base) {
  const bi = base ? PZ.findIndex(p => p.id === base) : -1;
  const p = {id:uid(), name:bi >= 0 ? PZ[bi].name : '', base:base || null, maq:bi >= 0 ? PZ[bi].maq : '', notes:{}, risks:{}, extra:[]};
  NOTES.forEach(n => { p.notes[n.key] = bi >= 0 ? PZ[bi].notes.includes(n.key) : (n.key === 'tareas' || n.key === 'embarazo_er'); });
  TYPES.forEach(t => {
    let vi = bi >= 0 ? t.vars.findIndex(v => v.src === bi) : -1;
    const on = vi >= 0; if (vi < 0) vi = 0;
    p.risks[t.key] = freshRisk(t, vi, on);
  });
  return p;
}
function newState(contrato, base) {
  const p = makePuesto(base === undefined ? 'p1' : base);
  return {v:1, doc:{contrato:contrato || '', anexo:DEFAULT_ANEXO, tipo:'inicial', pg:1, toc:true}, puestos:[p], sel:p.id};
}
function normalize(s) {
  if (!s || !s.doc || !Array.isArray(s.puestos) || !s.puestos.length) return null;
  s.puestos.forEach(p => {
    p.extra = p.extra || []; p.notes = p.notes || {}; p.risks = p.risks || {};
    TYPES.forEach(t => { if (!p.risks[t.key]) p.risks[t.key] = freshRisk(t, 0, false); const r = p.risks[t.key]; if (!t.vars[r.vi]) r.vi = 0; r.off = r.off || []; r.custom = r.custom || []; });
  });
  if (!s.puestos.find(p => p.id === s.sel)) s.sel = s.puestos[0].id;
  return s;
}

/* ---------- almacén: varias EVRL en el móvil, cada una ligada a un contrato ---------- */
const edb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('registro-rp-evrl', 1); r.onupgradeneeded = () => r.result.createObjectStore('docs', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  }));
  const tx = (m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('docs', m); const out = f(t.objectStore('docs')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return {all:() => tx('readonly', s => s.getAll()), put:x => tx('readwrite', s => s.put(x)), del:id => tx('readwrite', s => s.delete(id))};
})();
let DOCS = [], D = null, S = null, fctr = '';
const ui = {open:new Set(), filter:'all', esp:'', q:'', adding:false, more:new Set(), busy:false};
const cur = () => S.puestos.find(p => p.id === S.sel) || S.puestos[0];
async function cargar() { try { DOCS = (await edb.all() || []).filter(d => d && d.S && normalize(d.S)); } catch (e) { DOCS = []; } if (!D) renderLista(); refrescaIni(); }
let saveTimer = null;
function persist() {
  if (!D) return;
  clearTimeout(saveTimer);
  const doc = D;
  saveTimer = setTimeout(async () => { doc.guardado = Date.now(); try { await edb.put(JSON.parse(JSON.stringify(doc))); } catch (e) { toast('No se pudo guardar la EVRL.'); } refrescaIni(); }, 400);
}
async function guardarYa() { if (!D) return; clearTimeout(saveTimer); D.guardado = Date.now(); try { await edb.put(JSON.parse(JSON.stringify(D))); } catch (e) {} }
const refrescaIni = () => { if (window.INI_API && INI_API.refrescar) INI_API.refrescar(); };

/* ---------- utilidades ---------- */
const xesc = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const variant = (k, r) => TYPE[k].vars[r.vi];
const srcName = i => PZ[i] ? PZ[i].short : '';
function itemsOf(v) { const out = []; v.m.forEach((g, gi) => g.items.forEach((it, ii) => out.push({g, gi, it, ii, key:gi + '.' + ii}))); return out; }
function measureCount(k, r) { const v = variant(k, r); const off = new Set(r.off); const all = itemsOf(v); const on = all.filter(x => !off.has(x.key)).length; return {on:on + r.custom.length, total:all.length + r.custom.length}; }
const activeRisks = p => TYPES.filter(t => p.risks[t.key].on);
function countLevels(p) {
  const a = {A:0, B:0, C:0}, b = {A:0, B:0, C:0};
  activeRisks(p).forEach(t => { const r = p.risks[t.key]; if (a[r.v[2]] !== undefined) a[r.v[2]]++; if (b[r.v[4]] !== undefined) b[r.v[4]]++; });
  p.extra.forEach(x => { if (a[x.v[2]] !== undefined) a[x.v[2]]++; if (b[x.v[4]] !== undefined) b[x.v[4]]++; });
  return {a, b};
}
const nRiesgos = p => activeRisks(p).length + p.extra.length;
const ctrCorto = c => c ? (c.nombre || (c.sie ? 'SIE ' + c.sie : 'Contrato')) : '';
const fechaCorta = ms => { if (!ms) return ''; const d = new Date(ms); return fmtDate(isoDate(d)); };
const delFiltro = d => !fctr || (fctr === '-' ? !(d.ctr && d.ctr.id) : !!(d.ctr && d.ctr.id === fctr));

/* ---------- lista de EVRL ---------- */
function renderLista() {
  const L = $('#ev-lista'); if (!L) return;
  if (fctr && fctr !== '-' && !contratoPorId(fctr)) fctr = '';
  const l = DOCS.filter(delFiltro).sort((a, b) => (b.guardado || 0) - (a.guardado || 0));
  const np = l.reduce((s, d) => s + d.S.puestos.length, 0), na = l.reduce((s, d) => s + d.S.puestos.reduce((x, p) => x + countLevels(p).a.A, 0), 0);
  const cs = perfilGet().contratos, sin = DOCS.some(d => !(d.ctr && d.ctr.id));
  const chip = (id, t) => `<button type="button" class="chip" data-evfc="${esc(id)}" aria-pressed="${fctr === id}">${esc(t)}</button>`;
  L.innerHTML = `<section class="pl-hero ev-hero">
      <p class="pl-eb">Documentos · I-CORP 20A-3</p>
      <h2>Evaluación de riesgos</h2>
      <p class="pl-ctr">Modelo INNOVIA por puesto de trabajo</p>
      <div class="pl-kpis ev-kpis3"><div><b>${l.length}</b><span>EVRL</span></div><div><b>${np}</b><span>Puestos</span></div><div class="${na ? 'bad' : ''}"><b>${na}</b><span>Riesgos altos</span></div></div>
    </section>
    ${cs.length + (sin ? 1 : 0) >= 2 ? `<div class="chips ev-ctrs" role="group" aria-label="Filtrar por contrato">${chip('', 'Todos')}${cs.map(c => chip(c.id, ctrCorto(c))).join('')}${sin ? chip('-', 'Sin contrato') : ''}</div>` : ''}
    ${l.length ? `<div class="ev-docs">${l.map(d => {
      const n = d.S.puestos.length, r = d.S.puestos.reduce((s, p) => s + nRiesgos(p), 0);
      return `<button type="button" class="ev-doc" data-evabrir="${esc(d.id)}"><span class="ev-dt">${esc((d.S.doc.contrato || 'EVRL sin contrato').split('\n')[0])}</span>
        <span class="ev-dm">${plural(n, 'puesto', 'puestos')} · ${plural(r, 'riesgo', 'riesgos')} · ${d.S.doc.tipo === 'periodica' ? 'Periódica' : 'Inicial'}${d.ctr && d.ctr.id ? ' · ' + esc(ctrCorto(d.ctr)) : ''}</span>
        <span class="ev-dp">${d.S.puestos.map((p, i) => `<i>${i + 1}. ${esc(p.name || 'Sin nombre')}</i>`).join('')}</span>
        <small>Guardada el ${esc(fechaCorta(d.guardado))}</small></button>`; }).join('')}</div>`
      : `<div class="empty"><b>${DOCS.length ? 'Nada en este contrato' : 'Aún no tienes ninguna EVRL'}</b><span>Crea una a partir de las plantillas de puesto del modelo INNOVIA (operarios, oficina, campo, jefes) o en blanco. Marcas los riesgos que aplican, ajustas la valoración y las medidas, y sale el Word con el formato del modelo.</span></div>`}
    <div class="ev-lacts">
      <button type="button" class="btn primary" data-eva="nueva">+ Nueva EVRL</button>
      <label class="btn ev-file">Abrir proyecto (.json)<input type="file" id="ev-json" accept=".json,application/json"></label>
      <p class="help">«Abrir proyecto» carga los proyectos guardados con la herramienta EVRL INNOVIA o con esta misma app.</p>
    </div>`;
  vista('lista');
}
function vista(q) {
  const l = $('#ev-lista'), e = $('#ev-ed'); if (l) l.hidden = q !== 'lista'; if (e) e.hidden = q !== 'ed';
  const b = $('#ev-bar'); if (b) b.hidden = q !== 'ed' || $('#view-evrl').hidden;
}
async function nuevaEvrl() {
  const cs = perfilGet().contratos, act = snapContrato();
  const opc = cs.map(c => `<option value="${esc(c.id)}"${act && act.id === c.id ? ' selected' : ''}>${esc(nombreContrato(c))}</option>`).join('');
  const ok = await ask({title:'Nueva EVRL', body:`<div class="field"><label for="ev-nc">Contrato</label><select id="ev-nc"><option value="">Sin contrato</option>${opc}</select></div>
    <div class="field"><span class="lbl">Primer puesto</span><div class="ev-tpls">${PZ.map((p, i) => `<label class="ev-tpl"><input type="radio" name="ev-np" value="${p.id}"${i === 0 ? ' checked' : ''}><span><b>${esc(p.short)}</b><small>${esc(p.name)}</small></span></label>`).join('')}<label class="ev-tpl"><input type="radio" name="ev-np" value=""><span><b>En blanco</b><small>Sin riesgos marcados</small></span></label></div></div>`, yes:'Crear'});
  if (!ok) return;
  const cid = ($('#ev-nc') || {}).value || '', base = (document.querySelector('input[name="ev-np"]:checked') || {}).value;
  const c = cid ? contratoPorId(cid) : null;
  const txt = c ? [c.nombre, c.sie ? 'SIE ' + c.sie : ''].filter(Boolean).join(' · ').toUpperCase() : '';
  D = {id:'ev' + Date.now().toString(36), ctr:c ? snapContrato(c) : null, S:newState(txt, base || null), creado:Date.now(), guardado:Date.now()};
  DOCS.push(D); S = D.S; ui.open.clear(); ui.q = ''; ui.filter = 'all'; ui.esp = '';
  await guardarYa(); renderEd(); window.scrollTo({top:0});
  toast('EVRL creada. Revisa el contrato de la portada y los riesgos del puesto.');
}
function abrirDoc(id) {
  const d = DOCS.find(x => x.id === id); if (!d) return;
  D = d; S = normalize(d.S); ui.open.clear(); ui.q = ''; ui.filter = 'all'; ui.esp = ''; ui.adding = false;
  renderEd(); window.scrollTo({top:0});
}
async function cerrarDoc() {
  clearTimeout(saveTimer);
  const doc = D; D = null; S = null; renderLista(); window.scrollTo({top:0});
  if (doc) { doc.guardado = Date.now(); try { await edb.put(JSON.parse(JSON.stringify(doc))); } catch (e) {} }
  renderLista(); refrescaIni();
}

/* ---------- editor ---------- */
function lvlPill(l) { return l && RSHORT[l] ? `<span class="ev-lvl ${l}">${RSHORT[l]}</span>` : '<span class="ev-lvl x">—</span>'; }
function filteredTypes(p) {
  const q = ui.q.trim().toLowerCase();
  return TYPES.filter(t => {
    const r = p.risks[t.key];
    if (ui.filter === 'on' && !r.on) return false;
    if (ui.filter === 'off' && r.on) return false;
    if (ui.esp && (r.esp || '') !== ui.esp) return false;
    if (q) { const v = variant(t.key, r); if (!(t.label + ' ' + v.name + ' ' + v.note).toLowerCase().includes(q)) return false; }
    return true;
  });
}
function riskRowHtml(p, t) {
  const r = p.risks[t.key], v = variant(t.key, r), open = ui.open.has(t.key);
  const sub = [t.vars.length > 1 ? 'Texto de ' + srcName(v.src) : '', v.name.toUpperCase() !== t.label.toUpperCase() ? v.name : (v.note || '')].filter(Boolean).join(' · ');
  const vals = r.on ? `<span class="ev-ps" title="Posibilidad · Severidad">${esc(r.v[0])}·${esc(r.v[1])}</span>${lvlPill(r.v[2])}<span class="ev-ar">→</span>${lvlPill(r.v[4])}` : '<span class="ev-lvl x">No aplica</span>';
  return `<div class="ev-risk${r.on ? '' : ' off'}${open ? ' open' : ''}" id="ev-r-${t.key}">
    <div class="ev-rrow">
      <button type="button" class="ev-sw" role="switch" aria-checked="${r.on}" data-evk="toggle" data-k="${t.key}" aria-label="${r.on ? 'Aplica' : 'No aplica'}: ${esc(t.label)}"></button>
      <button type="button" class="ev-rname" data-evk="expand" data-k="${t.key}" aria-expanded="${open}"><span class="ev-esp" title="${esc(ESPN[r.esp] || r.esp)}">${esc(r.esp || '–')}</span><b>${esc(t.label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}<span class="ev-rv">${vals}</span></button>
      <button type="button" class="ev-chev" data-evk="expand" data-k="${t.key}" aria-label="${open ? 'Cerrar' : 'Ver'} detalle">${CHEV}</button>
    </div>
    ${open ? panelHtml(p, t, r, v) : ''}
  </div>`;
}
function letters(k, i, curv, set, cls, act) {
  return `<span class="ev-lt ${cls || ''}" role="group">${set.map(l => `<button type="button" data-evk="${act || 'val'}" data-k="${k}" data-i="${i}" data-l="${l}" aria-pressed="${curv === l}" title="${l} · ${esc((i === 1 ? LEG.S : (i === 2 || i === 4) ? LEG.R : LEG.P)[l])}">${l}</button>`).join('')}</span>`;
}
function valGrid(k, vv, act) {
  const m = (L, l) => `<span class="ev-vm">${esc(L[l] || '')}</span>`;
  return `<div class="ev-vg">
    <div class="ev-vh">Valoración inicial</div>
    <div class="ev-vl">Posibilidad</div><div>${letters(k, 0, vv[0], ['A', 'B', 'C', 'D', 'E'], '', act)}${m(LEG.P, vv[0])}</div>
    <div class="ev-vl">Severidad</div><div>${letters(k, 1, vv[1], ['A', 'B', 'C', 'D', 'E'], '', act)}${m(LEG.S, vv[1])}</div>
    <div class="ev-vl">Riesgo</div><div>${letters(k, 2, vv[2], ['A', 'B', 'C'], 'r', act)}${m(LEG.R, vv[2])}</div>
    <div class="ev-vh">Tras aplicar las medidas</div>
    <div class="ev-vl">Posibilidad</div><div>${letters(k, 3, vv[3], ['A', 'B', 'C', 'D', 'E'], '', act)}${m(LEG.P, vv[3])}</div>
    <div class="ev-vl">Severidad</div><div class="ev-vm ev-same">Se mantiene (${esc(vv[1])})</div>
    <div class="ev-vl">Riesgo</div><div>${letters(k, 4, vv[4], ['A', 'B', 'C'], 'r', act)}${m(LEG.R, vv[4])}</div>
  </div>`;
}
function espSeg(k, curv, act) { return `<div class="ev-seg" role="group" aria-label="Especialidad">${['S', 'H', 'E', 'PS'].map(e => `<button type="button" data-evk="${act}" data-k="${k}" data-e="${e}" aria-pressed="${curv === e}" title="${ESPN[e]}">${e}</button>`).join('')}</div>`; }
function panelHtml(p, t, r, v) {
  const off = new Set(r.off);
  const vsel = t.vars.length > 1 ? `<div class="ev-pb"><span class="ev-lbl">Texto de medidas según el puesto</span>
      <div class="ev-seg" role="group">${t.vars.map((x, i) => `<button type="button" data-evk="var" data-k="${t.key}" data-vi="${i}" aria-pressed="${i === r.vi}">${esc(srcName(x.src))}</button>`).join('')}</div>
      <span class="ev-vm">Al cambiar, se cargan las medidas y valoraciones de ese puesto.</span></div>`
    : `<div class="ev-pb"><span class="ev-lbl">Texto de medidas</span><span class="ev-vm">Del puesto ${esc(srcName(v.src))} (único en el modelo)</span></div>`;
  const groups = v.m.map((g, gi) => {
    const keys = g.items.map((_, ii) => gi + '.' + ii), nOn = keys.filter(k => !off.has(k)).length;
    const head = g.h ? `<label class="ev-mgh"><input type="checkbox" data-evk="grp" data-k="${t.key}" data-g="${gi}" ${nOn === keys.length ? 'checked' : ''} ${nOn > 0 && nOn < keys.length ? 'data-ind="1"' : ''}>${esc(g.h)}</label>` : '';
    const items = g.items.map((it, ii) => {
      const key = gi + '.' + ii, on = !off.has(key), mk = t.key + ':' + key;
      const subs = it.s.map((s, si) => { const sk = key + '.' + si, son = !off.has(sk); return `<label class="ev-mi sub${son ? '' : ' unsel'}${on ? '' : ' dim'}"><input type="checkbox" data-evk="item" data-k="${t.key}" data-id="${sk}" ${son ? 'checked' : ''} ${on ? '' : 'disabled'}><span class="ev-mt">${esc(s.t)}</span></label>`; }).join('');
      const long = it.t.length > 240, full = ui.more.has(mk);
      const moreBtn = long ? `<button type="button" class="ev-more" data-evk="more" data-m="${mk}" data-k="${t.key}">${full ? 'ver menos' : 'ver todo'}</button>` : '';
      return `<label class="ev-mi${on ? '' : ' unsel'}"><input type="checkbox" data-evk="item" data-k="${t.key}" data-id="${key}" ${on ? 'checked' : ''}><span class="ev-mt${long && !full ? ' clamp' : ''}">${esc(it.t)}</span></label>${moreBtn ? `<div class="ev-morew">${moreBtn}</div>` : ''}${subs}`;
    }).join('');
    return `<div class="ev-mg">${head}${items}</div>`;
  }).join('');
  const cnt = measureCount(t.key, r);
  const custom = `<div class="ev-custom"><span class="ev-lbl">Medidas propias (se añaden al final, numeradas)</span>
      ${r.custom.map((c, i) => `<div class="ev-ci"><span class="ev-mt">${esc(c)}</span><button type="button" class="ev-b ghost" data-evk="cdel" data-k="${t.key}" data-i="${i}" aria-label="Quitar medida">Quitar</button></div>`).join('')}
      <div class="ev-addrow"><input id="ev-cm-${t.key}" placeholder="Escribe una medida" data-eventer="cadd" data-k="${t.key}" enterkeyhint="done"><button type="button" class="ev-b" data-evk="cadd" data-k="${t.key}">Añadir</button></div></div>`;
  return `<div class="ev-panel">
    ${vsel}
    <div class="ev-pb"><span class="ev-lbl">Especialidad (ESP.)</span>${espSeg(t.key, r.esp, 'esp')}</div>
    <div class="ev-pb">${valGrid(t.key, r.v, 'val')}</div>
    <div class="ev-pb"><div class="ev-mhead"><span class="ev-lbl">Medidas preventivas</span><span class="ev-cnt">${cnt.on} de ${cnt.total} · <button type="button" class="ev-b ghost" data-evk="mall" data-k="${t.key}">Todas</button><button type="button" class="ev-b ghost" data-evk="mnone" data-k="${t.key}">Ninguna</button></span></div>
      <div class="ev-ml">${groups || '<span class="ev-vm">Este riesgo no trae medidas en el modelo.</span>'}</div>
      ${custom}</div>
  </div>`;
}
function extraHtml(p) {
  const cards = p.extra.map((x, i) => `<div class="ev-xcard">
      <div class="ev-xtop"><span class="ev-lbl">Riesgo ${i + 1}</span><button type="button" class="ev-b ghost danger" data-evk="xdel" data-x="${x.id}">Quitar</button></div>
      <input id="ev-xn-${x.id}" data-evxin="name" data-x="${x.id}" value="${esc(x.name)}" placeholder="Nombre del riesgo, p. ej. TRABAJOS EN ESPACIOS CONFINADOS">
      <div class="ev-pb"><span class="ev-lbl">Especialidad (ESP.)</span>${espSeg(x.id, x.esp, 'xesp')}</div>
      ${valGrid(x.id, x.v, 'xval')}
      <div class="field"><label for="ev-xm-${x.id}">Medidas preventivas (una por línea, salen numeradas)</label><textarea id="ev-xm-${x.id}" data-evxin="meas" data-x="${x.id}" rows="5">${esc(x.meas)}</textarea></div>
    </div>`).join('');
  return `<section class="ev-extra" aria-label="Riesgos añadidos">
    <h3 class="cal-gh">Riesgos que no están en la lista<i>${p.extra.length}</i></h3>
    ${cards || '<p class="help">Si el puesto tiene un riesgo que no sale en el modelo, añádelo aquí con su valoración y sus medidas.</p>'}
    <button type="button" class="btn" data-evk="xadd">+ Añadir otro riesgo</button>
  </section>`;
}
function summaryHtml(p) {
  const n = nRiesgos(p), {a, b} = countLevels(p);
  const bar = c => { const tot = c.A + c.B + c.C; if (!tot) return '<div class="ev-bar"></div>'; return `<div class="ev-bar">${['A', 'B', 'C'].map(l => c[l] ? `<span class="${l}" style="flex:${c[l]}" title="${RSHORT[l]}: ${c[l]}">${c[l]}</span>` : '').join('')}</div>`; };
  return `<div class="ev-sum" id="ev-sum">
    <div><div class="ev-big">${n}<small> / ${TYPES.length + p.extra.length}</small></div><div class="ev-bigl">riesgos que aplican</div></div>
    <div class="ev-bars"><div class="ev-brow"><span>Inicial</span>${bar(a)}</div><div class="ev-brow"><span>Tras medidas</span>${bar(b)}</div>
      <div class="ev-leg"><span><i class="A"></i>Alto · 1ª</span><span><i class="B"></i>Medio · 2ª</span><span><i class="C"></i>Bajo · 3ª</span></div></div>
  </div>`;
}
function puestosHtml() {
  const tpl = ui.adding ? `<div class="ev-tplbox"><span class="ev-lbl">¿De qué plantilla partimos?</span>
      ${PZ.map(p => `<button type="button" class="ev-tplb" data-evk="pnew" data-base="${p.id}"><b>${esc(p.short)}</b><small>${esc(p.name)}</small></button>`).join('')}
      <button type="button" class="ev-tplb" data-evk="pnew" data-base=""><b>En blanco</b><small>Sin riesgos marcados, los eliges tú</small></button>
      <button type="button" class="ev-b ghost" data-evk="padd">Cancelar</button></div>` : '';
  return `<div class="ev-pstrip" role="tablist" aria-label="Puestos de trabajo">${S.puestos.map((p, i) => `<button type="button" class="ev-pchip" role="tab" data-evk="psel" data-id="${p.id}" aria-selected="${p.id === S.sel}"><span class="n">${i + 1}</span><span class="t">${esc(p.name || 'Puesto sin nombre')}</span><span class="c">${nRiesgos(p)}</span></button>`).join('')}<button type="button" class="ev-pchip add" data-evk="padd" aria-expanded="${ui.adding}">+ Puesto</button></div>${tpl}`;
}
function renderEd() {
  const E = $('#ev-ed'); if (!E || !S) return;
  const d = S.doc, p = cur(), idx = S.puestos.indexOf(p), base = p.base ? PZ.find(x => x.id === p.base) : null, nOn = activeRisks(p).length, fl = TYPES.length;
  const cs = perfilGet().contratos, cid = D.ctr && D.ctr.id;
  const opts = cs.map(c => `<option value="${esc(c.id)}"${c.id === cid ? ' selected' : ''}>${esc(nombreContrato(c))}</option>`).join('');
  const list = filteredTypes(p);
  E.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-evk="cerrar">‹ Evaluaciones</button><span class="ev-saved">Se guarda sola</span></div>
    <details class="block ev-docb"${(d.contrato || '').trim() ? '' : ' open'}>
      <summary class="bh"><h2>Documento</h2><span class="ev-dsum">${esc((d.contrato || 'Falta el contrato / obra').split('\n')[0])}</span></summary>
      <div class="bb ev-ff">
        <div class="field"><label for="ev-f-contrato">Contrato / obra <i class="opc">sale en la portada y en cada tabla</i></label><textarea id="ev-f-contrato" data-evin="contrato" rows="3" placeholder="Ej.: CONSERVACIÓN INTEGRAL DE CARRETERAS DEL ESTADO. SECTOR V-1 PATERNA">${esc(d.contrato)}</textarea></div>
        <div class="field"><label for="ev-f-anexo">Título del anexo</label><input id="ev-f-anexo" data-evin="anexo" value="${esc(d.anexo)}"></div>
        <div class="field"><span class="lbl">Tipo de evaluación</span><div class="ev-seg big" role="group" aria-label="Tipo de evaluación"><button type="button" data-evk="tipo" data-v="inicial" aria-pressed="${d.tipo === 'inicial'}">Inicial</button><button type="button" data-evk="tipo" data-v="periodica" aria-pressed="${d.tipo === 'periodica'}">Periódica</button></div></div>
        <div class="g2"><div class="field"><label for="ev-f-pg">1ª página del anexo</label><input id="ev-f-pg" data-evin="pg" type="number" min="1" inputmode="numeric" value="${esc(d.pg)}"></div>
          <label class="ev-check ev-toc"><input type="checkbox" id="ev-f-toc" data-evin="toc" ${d.toc ? 'checked' : ''}>Índice de puestos</label></div>
        <div class="field"><label for="ev-f-ctr">Contrato en la app</label><select id="ev-f-ctr" data-evin="ctr"><option value="">Sin contrato</option>${opts}</select></div>
        <div class="ev-dacts"><button type="button" class="ev-b" data-evk="savejson">Guardar proyecto (.json)</button><button type="button" class="ev-b ghost danger" data-evk="docdel">Eliminar esta EVRL</button></div>
      </div>
    </details>
    ${puestosHtml()}
    <section class="ev-sheet" aria-label="Puesto">
      <div class="ev-sh">
        <div class="ev-eb"><span>Puesto ${idx + 1} de ${S.puestos.length}${base ? ' · plantilla ' + esc(base.short) : ' · en blanco'}</span>
          <span class="ev-sacts"><button type="button" class="ev-b on" data-evk="pup" ${idx === 0 ? 'disabled' : ''} aria-label="Subir puesto">↑</button><button type="button" class="ev-b on" data-evk="pdown" ${idx === S.puestos.length - 1 ? 'disabled' : ''} aria-label="Bajar puesto">↓</button><button type="button" class="ev-b on" data-evk="pdup">Duplicar</button>${S.puestos.length > 1 ? '<button type="button" class="ev-b on danger" data-evk="pdel">Eliminar</button>' : ''}</span></div>
        <label class="ev-pt" for="ev-p-name">${idx + 1}. PUESTO DE TRABAJO:</label>
        <input class="ev-pname" id="ev-p-name" data-evpin="name" value="${esc(p.name)}" placeholder="NOMBRE DEL PUESTO">
      </div>
      <div class="ev-smeta">
        <div class="field"><label for="ev-p-maq">Maquinaria / equipos</label><input id="ev-p-maq" data-evpin="maq" value="${esc(p.maq)}" placeholder="Ej.: VEHÍCULOS DE EMPRESA, HERRAMIENTAS MANUALES…"></div>
        <div class="ev-notes"><span class="lbl">Notas al final de la tabla</span>${NOTES.map(n => `<label class="ev-check"><input type="checkbox" data-evk="note" data-n="${n.key}" ${p.notes[n.key] ? 'checked' : ''}><span>${esc(n.label)}</span></label>`).join('')}</div>
      </div>
    </section>
    ${summaryHtml(p)}
    <div class="ev-tools">
      <input id="ev-q" type="search" placeholder="Buscar riesgo…" value="${esc(ui.q)}" aria-label="Buscar riesgo">
      <div class="chips ev-fch" role="group" aria-label="Filtrar">
        <button type="button" class="chip" data-evk="filter" data-v="all" aria-pressed="${ui.filter === 'all'}">Todos <span class="k">${fl}</span></button>
        <button type="button" class="chip" data-evk="filter" data-v="on" aria-pressed="${ui.filter === 'on'}">Aplican <span class="k">${nOn}</span></button>
        <button type="button" class="chip" data-evk="filter" data-v="off" aria-pressed="${ui.filter === 'off'}">No aplican <span class="k">${fl - nOn}</span></button>
        ${['S', 'H', 'E', 'PS'].map(e => `<button type="button" class="chip" data-evk="fesp" data-v="${e}" aria-pressed="${ui.esp === e}" title="${ESPN[e]}">${e}</button>`).join('')}
      </div>
    </div>
    <div class="ev-rt"><div class="ev-rhead"><span>Aplica</span><span>Identificación del riesgo · valoración 1 → 2</span></div>
      <div id="ev-rlist">${list.map(t => riskRowHtml(p, t)).join('') || '<p class="help ev-none">Ningún riesgo coincide con el filtro.</p>'}</div></div>
    ${extraHtml(p)}`;
  setInd(E); vista('ed'); pintaBar();
}
function pintaBar() {
  const b = $('#ev-bar'); if (!b || !S) return;
  const p = cur();
  b.innerHTML = `<span class="ev-who">${S.puestos.indexOf(p) + 1}. ${esc(p.name || 'Puesto sin nombre')} · ${plural(nRiesgos(p), 'riesgo', 'riesgos')}</span><button type="button" class="btn primary" data-evk="export" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'Generando…' : 'Descargar Word'}</button>`;
}
function setInd(root) { root.querySelectorAll('input[data-ind]').forEach(i => { i.indeterminate = true; }); }
function refreshRisk(k) {
  const p = cur(), el = $('#ev-r-' + k);
  if (el) { const tmp = document.createElement('div'); tmp.innerHTML = riskRowHtml(p, TYPE[k]); const n = tmp.firstElementChild; el.replaceWith(n); setInd(n); }
  const sm = $('#ev-sum'); if (sm) sm.outerHTML = summaryHtml(p);
  const nOn = activeRisks(p).length;
  document.querySelectorAll('#ev-ed [data-evk="filter"] .k').forEach(k2 => { const v = k2.parentNode.dataset.v; k2.textContent = v === 'all' ? TYPES.length : v === 'on' ? nOn : TYPES.length - nOn; });
  document.querySelectorAll(`#ev-ed .ev-pchip[data-id="${p.id}"] .c`).forEach(c => { c.textContent = nRiesgos(p); });
  pintaBar();
}
function changed(k) { persist(); if (k) refreshRisk(k); else { const y = window.scrollY; renderEd(); window.scrollTo({top:y}); } }

/* ---------- acciones del editor ---------- */
const act = {
  psel(d) { S.sel = d.id; ui.open.clear(); ui.adding = false; changed(); const s = $('.ev-sheet'); if (s) s.scrollIntoView({block:'start'}); },
  padd() { ui.adding = !ui.adding; const y = window.scrollY; renderEd(); window.scrollTo({top:y}); },
  pnew(d) { const p = makePuesto(d.base || null); S.puestos.push(p); S.sel = p.id; ui.adding = false; ui.open.clear(); changed(); const s = $('.ev-sheet'); if (s) s.scrollIntoView({block:'start'}); if (!d.base) setTimeout(() => { const i = $('#ev-p-name'); if (i) i.focus(); }, 30); },
  pup() { const i = S.puestos.indexOf(cur()); if (i > 0) { const [p] = S.puestos.splice(i, 1); S.puestos.splice(i - 1, 0, p); changed(); } },
  pdown() { const i = S.puestos.indexOf(cur()); if (i < S.puestos.length - 1) { const [p] = S.puestos.splice(i, 1); S.puestos.splice(i + 1, 0, p); changed(); } },
  pdup() { const p = JSON.parse(JSON.stringify(cur())); p.id = uid(); p.name = p.name + ' (copia)'; p.extra.forEach(x => { x.id = uid(); }); const i = S.puestos.indexOf(cur()); S.puestos.splice(i + 1, 0, p); S.sel = p.id; changed(); toast('Puesto duplicado.'); },
  async pdel() { const p = cur(); if (!(await ask({title:'¿Eliminar el puesto?', body:`<p>«${esc(p.name || 'Puesto sin nombre')}» y todo lo marcado en él se borra de esta EVRL.</p>`, yes:'Eliminar', danger:true}))) return; const i = S.puestos.indexOf(p); S.puestos.splice(i, 1); S.sel = S.puestos[Math.max(0, i - 1)].id; changed(); toast('Puesto eliminado.'); },
  tipo(d) { S.doc.tipo = d.v; changed(); },
  note(d, el) { cur().notes[d.n] = el.checked; persist(); },
  filter(d) { ui.filter = d.v; changed(); },
  fesp(d) { ui.esp = ui.esp === d.v ? '' : d.v; changed(); },
  toggle(d) { const r = cur().risks[d.k]; r.on = !r.on; changed(d.k); },
  expand(d) { if (ui.open.has(d.k)) ui.open.delete(d.k); else ui.open.add(d.k); refreshRisk(d.k); },
  var(d) { const p = cur(), t = TYPE[d.k], r = p.risks[d.k], vi = +d.vi; if (vi === r.vi) return; const keep = r.custom; p.risks[d.k] = Object.assign(freshRisk(t, vi, r.on), {custom:keep}); changed(d.k); },
  val(d) { cur().risks[d.k].v[+d.i] = d.l; changed(d.k); },
  esp(d) { cur().risks[d.k].esp = d.e; changed(d.k); },
  item(d, el) {
    const r = cur().risks[d.k], off = new Set(r.off), id = d.id;
    if (el.checked) { off.delete(id); if (id.split('.').length === 2) [...off].forEach(x => { if (x.startsWith(id + '.')) off.delete(x); }); }
    else off.add(id);
    r.off = [...off]; changed(d.k);
  },
  grp(d, el) {
    const r = cur().risks[d.k], v = variant(d.k, r), g = v.m[+d.g], off = new Set(r.off), pre = d.g + '.';
    if (el.checked) [...off].forEach(x => { if (x.startsWith(pre)) off.delete(x); });
    else g.items.forEach((_, ii) => off.add(pre + ii));
    r.off = [...off]; changed(d.k);
  },
  more(d) { if (ui.more.has(d.m)) ui.more.delete(d.m); else ui.more.add(d.m); refreshRisk(d.k); },
  mall(d) { cur().risks[d.k].off = []; changed(d.k); },
  mnone(d) { const r = cur().risks[d.k]; r.off = itemsOf(variant(d.k, r)).map(x => x.key); changed(d.k); },
  cadd(d) { const inp = $('#ev-cm-' + d.k), val = ((inp || {}).value || '').trim(); if (!val) { if (inp) inp.focus(); return; } cur().risks[d.k].custom.push(val); changed(d.k); setTimeout(() => { const i = $('#ev-cm-' + d.k); if (i) i.focus(); }, 20); },
  cdel(d) { cur().risks[d.k].custom.splice(+d.i, 1); changed(d.k); },
  xadd() { const x = {id:uid(), name:'', esp:'S', v:['D', 'C', 'B', 'E', 'C'], meas:''}; cur().extra.push(x); changed(); setTimeout(() => { const i = $('#ev-xn-' + x.id); if (i) { i.focus(); i.scrollIntoView({block:'center'}); } }, 30); },
  xdel(d) { const p = cur(); p.extra = p.extra.filter(x => x.id !== d.x); changed(); },
  xval(d) { const x = cur().extra.find(y => y.id === d.k); x.v[+d.i] = d.l; changed(); },
  xesp(d) { const x = cur().extra.find(y => y.id === d.k); x.esp = d.e; changed(); },
  async export() { await doExport(); },
  async savejson() { await guardarYa(); const name = 'EVRL_' + slug(S.doc.contrato || 'proyecto') + '_' + hoyCompacto() + '.json'; await entregar(new Blob([JSON.stringify(S, null, 1)], {type:'application/json'}), name, 'Proyecto de EVRL'); },
  async docdel() {
    if (!(await ask({title:'¿Eliminar esta EVRL?', body:`<p>Se borran sus ${plural(S.puestos.length, 'puesto', 'puestos')} de este móvil. Si quieres conservarla, antes pulsa «Guardar proyecto (.json)».</p>`, yes:'Eliminar', danger:true}))) return;
    clearTimeout(saveTimer); try { await edb.del(D.id); } catch (e) {}
    DOCS = DOCS.filter(x => x.id !== D.id); D = null; S = null; renderLista(); refrescaIni(); toast('EVRL eliminada.');
  },
  cerrar() { cerrarDoc(); }
};

/* ---------- Word con el formato del modelo ---------- */
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'EVRL';
const hoyCompacto = () => isoDate(new Date()).replace(/-/g, '');
function remapNums(xml, ctx) {
  const map = {};
  return xml.replace(/<w:numId w:val="(\d+)"\/>/g, (m, id) => {
    if (id === '0') return m;
    const info = DATA.numbering.nums[id]; if (!info) return m;
    if (!map[id]) {
      const n = ++ctx.max; map[id] = n;
      const ov = info[1].map((st, i) => `<w:lvlOverride w:ilvl="${i}"><w:startOverride w:val="${st}"/></w:lvlOverride>`).join('');
      ctx.nums.push(`<w:num w:numId="${n}"><w:abstractNumId w:val="${info[0]}"/>${ov}</w:num>`);
    }
    return `<w:numId w:val="${map[id]}"/>`;
  });
}
const fill = (tpl, o) => Object.keys(o).reduce((s, k) => s.split('%%' + k + '%%').join(o[k]), tpl);
function riskRowXml(esp, nameXml, v, measXml) {
  return T.trOpen + fill(T.tcESP, {T:xesc(esp)}) + T.tcNameOpen + nameXml + '</w:tc>'
    + fill(T.tcV1, {T:xesc(v[0])}) + fill(T.tcV1, {T:xesc(v[1])}) + fill(T.tcV1, {T:xesc(v[2])})
    + T.tcMeasOpen + (measXml || T.pEmpty) + '</w:tc>'
    + fill(T.tcV2a, {T:xesc(v[3])}) + fill(T.tcV2b, {T:xesc(v[4])}) + '</w:tr>';
}
function measuresXml(k, r) {
  const v = variant(k, r), off = new Set(r.off); let out = '';
  v.m.forEach((g, gi) => {
    let parts = '';
    g.items.forEach((it, ii) => { const key = gi + '.' + ii; if (off.has(key)) return; parts += it.x + it.s.map((s, si) => off.has(key + '.' + si) ? '' : s.x).join(''); });
    if (parts) out += (g.hx || '') + parts;
  });
  const tpl = v.ct || T.genericItem;
  r.custom.forEach(c => { out += fill(tpl, {T:xesc(c)}); });
  return out;
}
function tocXml(names) {
  const rp = '<w:rPr><w:noProof/><w:webHidden/></w:rPr>';
  const entry = (i, name, first) => {
    const bm = '_TocEVRL' + (i + 1);
    const fld = first ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : '';
    return `<w:p>${T.tocEntryPPr}${fld}<w:hyperlink w:anchor="${bm}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hipervnculo"/><w:b/><w:bCs/><w:noProof/><w:w w:val="105"/></w:rPr><w:t xml:space="preserve">${xesc((i + 1) + '. ' + name)}</w:t></w:r><w:r>${rp}<w:tab/></w:r><w:r>${rp}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rp}<w:instrText xml:space="preserve"> PAGEREF ${bm} \\h </w:instrText></w:r><w:r>${rp}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rp}<w:t></w:t></w:r><w:r>${rp}<w:fldChar w:fldCharType="end"/></w:r></w:hyperlink></w:p>`;
  };
  return T.tocOpen + names.map((n, i) => entry(i, n, i === 0)).join('') + T.tocClose;
}
function buildDocumentXml(st, ctx) {
  const d = st.doc, contrato = (d.contrato || '').trim();
  let out = T.docHead + T.coverPre + fill(T.coverTable, {CONTRATO:xesc(contrato), ANEXO:xesc(d.anexo || DEFAULT_ANEXO)});
  const names = st.puestos.map(p => (p.name || 'PUESTO SIN NOMBRE').trim());
  if (d.toc) out += tocXml(names);
  out += T.midPre;
  st.puestos.forEach((p, i) => {
    if (i > 0) out += T.sep;
    out += T.tblOpen;
    out += fill(T.rowTitle, {TITLE:xesc(`${i + 1}. PUESTO DE TRABAJO: “${names[i]}”`), BM:'_TocEVRL' + (i + 1), BMID:String(900 + i)});
    out += fill(T.rowContrato, {CONTRATO:xesc(contrato), XI:d.tipo === 'inicial' ? 'X' : ''});
    out += fill(T.rowMaq, {MAQ:xesc(p.maq || ''), XP:d.tipo === 'periodica' ? 'X' : ''});
    out += T.rowHead3 + T.rowHead4;
    TYPES.forEach(t => { const r = p.risks[t.key]; if (!r.on) return; const v = variant(t.key, r); out += remapNums(riskRowXml(r.esp, v.nx, r.v, measuresXml(t.key, r)), ctx); });
    p.extra.forEach(x => {
      if (!(x.name || '').trim() && !(x.meas || '').trim()) return;
      const nameXml = fill(T.pName, {T:xesc((x.name || '').trim())});
      const meas = (x.meas || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => fill(T.genericItem, {T:xesc(s)})).join('');
      out += remapNums(riskRowXml(x.esp, nameXml, x.v, meas), ctx);
    });
    NOTES.forEach(n => { if (p.notes[n.key]) out += fill(T.rowNote, {T:xesc(n.text)}); });
    out += '</w:tbl>';
  });
  out += fill(T.sectEnd, {PGNUM:`<w:pgNumType w:start="${Math.max(1, parseInt(d.pg, 10) || 1)}"/>`});
  return out;
}
async function buildDocx(st) {
  if (typeof JSZip === 'undefined') throw new Error('nozip');
  const zip = await JSZip.loadAsync(TPL_B64, {base64:true});
  const ctx = {max:DATA.numbering.maxNumId, nums:[]};
  zip.file('word/document.xml', buildDocumentXml(st, ctx));
  let num = await zip.file('word/numbering.xml').async('string');
  const ins = ctx.nums.join('');
  num = num.includes('<w:numIdMacAtCleanup') ? num.replace('<w:numIdMacAtCleanup', ins + '<w:numIdMacAtCleanup') : num.replace('</w:numbering>', ins + '</w:numbering>');
  zip.file('word/numbering.xml', num);
  return zip.generateAsync({type:'blob', compression:'DEFLATE', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
async function doExport() {
  if (ui.busy || !S) return;
  if (!(S.doc.contrato || '').trim()) { toast('Falta el contrato / obra: va en la portada y en cada tabla.'); const db = $('.ev-docb'); if (db) db.open = true; const f = $('#ev-f-contrato'); if (f) { f.focus(); f.scrollIntoView({block:'center'}); } return; }
  const unnamed = S.puestos.find(p => !(p.name || '').trim());
  if (unnamed) { S.sel = unnamed.id; renderEd(); toast('Ponle nombre al puesto antes de descargar.'); const i = $('#ev-p-name'); if (i) { i.focus(); i.scrollIntoView({block:'center'}); } return; }
  const empty = S.puestos.find(p => !nRiesgos(p));
  if (empty) { S.sel = empty.id; renderEd(); toast(`El puesto «${empty.name || 'sin nombre'}» no tiene ningún riesgo marcado.`); return; }
  ui.busy = true; pintaBar();
  try {
    await guardarYa();
    const blob = await buildDocx(S);
    const name = 'EVRL_' + slug(S.doc.contrato || 'INNOVIA') + '_' + hoyCompacto() + '.docx';
    await entregar(blob, name, 'Evaluación de riesgos (EVRL)', 'Al abrirlo, Word pregunta si actualizar los campos: dile que sí y el índice se rellena con las páginas.');
  } catch (err) {
    console.error(err);
    toast(err && err.message === 'nozip' ? 'No se ha podido cargar el generador de Word.' : 'No se ha podido generar el Word.');
  } finally { ui.busy = false; pintaBar(); }
}

/* ---------- eventos ---------- */
async function onClick(e) {
  const ab = e.target.closest('[data-evabrir]'); if (ab) { abrirDoc(ab.dataset.evabrir); return; }
  const fc = e.target.closest('[data-evfc]'); if (fc) { fctr = fc.dataset.evfc; renderLista(); return; }
  const la = e.target.closest('[data-eva]'); if (la && la.dataset.eva === 'nueva') { nuevaEvrl(); return; }
  const el = e.target.closest('[data-evk]'); if (!el || el.disabled || !S) return;
  const name = el.dataset.evk;
  if (el.tagName === 'INPUT' && (name === 'item' || name === 'grp' || name === 'note')) { act[name](el.dataset, el); return; }
  if (el.tagName === 'INPUT') return;
  if (act[name]) { e.preventDefault(); act[name](el.dataset, el); }
}
function onInput(e) {
  if (!S) return;
  const el = e.target, d = el.dataset;
  if (d.evin) {
    if (d.evin === 'pg') S.doc.pg = Math.max(1, parseInt(el.value, 10) || 1);
    else if (d.evin === 'toc') S.doc.toc = el.checked;
    else if (d.evin === 'ctr') { const c = el.value ? contratoPorId(el.value) : null; D.ctr = c ? snapContrato(c) : null; }
    else { S.doc[d.evin] = el.value; if (d.evin === 'contrato') { const s = $('.ev-dsum'); if (s) s.textContent = (el.value || 'Falta el contrato / obra').split('\n')[0]; } }
    persist(); return;
  }
  if (d.evpin) { cur()[d.evpin] = el.value; persist(); if (d.evpin === 'name') { const c = $(`#ev-ed .ev-pchip[data-id="${cur().id}"] .t`); if (c) c.textContent = el.value || 'Puesto sin nombre'; pintaBar(); } return; }
  if (d.evxin) { const x = cur().extra.find(y => y.id === d.x); if (x) { x[d.evxin] = el.value; persist(); } return; }
  if (el.id === 'ev-q') { ui.q = el.value; const p = cur(); const L = $('#ev-rlist'); L.innerHTML = filteredTypes(p).map(t => riskRowHtml(p, t)).join('') || '<p class="help ev-none">Ningún riesgo coincide con el filtro.</p>'; setInd(L); }
}
async function onChange(e) {
  const t = e.target;
  if (t.id === 'ev-json') {
    const f = t.files && t.files[0]; t.value = ''; if (!f) return;
    try {
      const s = normalize(JSON.parse(await f.text())); if (!s) throw new Error('x');
      const act0 = snapContrato();
      D = {id:'ev' + Date.now().toString(36), ctr:act0 || null, S:s, creado:Date.now(), guardado:Date.now()};
      DOCS.push(D); S = s; ui.open.clear(); await guardarYa(); renderEd(); window.scrollTo({top:0});
      toast('Proyecto abierto: ' + f.name);
    } catch (err) { toast('Ese archivo no es un proyecto de EVRL válido.'); }
    return;
  }
  if (S && (t.dataset.evin === 'toc' || t.dataset.evin === 'ctr')) onInput(e);
}

/* ---------- arranque ---------- */
function montar() {
  const main = document.createElement('main');
  main.id = 'view-evrl'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="ev-lista"></div><div id="ev-ed" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  const bar = document.createElement('div'); bar.className = 'ibar ev-ibar'; bar.id = 'ev-bar'; bar.hidden = true;
  document.body.appendChild(bar);
  main.addEventListener('click', onClick); bar.addEventListener('click', onClick);
  main.addEventListener('input', onInput); main.addEventListener('change', onChange);
  main.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.eventer && S) { e.preventDefault(); act[e.target.dataset.eventer](e.target.dataset, e.target); } });
  cargar();
}
window.EVRL_API = {
  lista: () => DOCS,
  resumen() { return {n:DOCS.length, puestos:DOCS.reduce((s, d) => s + d.S.puestos.length, 0)}; },
  abrir() { showTab('evrl'); if (!S) renderLista(); else renderEd(); },
  buildDocx: st => buildDocx(normalize(JSON.parse(JSON.stringify(st)))),
  async importar(arr) {
    const actual = new Map(DOCS.map(d => [d.id, d])); let n = 0;
    for (const d of Array.isArray(arr) ? arr : []) { if (d && d.id && d.S && normalize(d.S) && (!actual.has(d.id) || (d.guardado || 0) > (actual.get(d.id).guardado || 0))) { await edb.put(d); n++; } }
    if (n) await cargar();
    return n;
  },
  atras() { const v = $('#view-evrl'); if (!v || v.hidden || !S) return false; cerrarDoc(); return true; },
  onTab(t) { const b = $('#ev-bar'); if (b) b.hidden = !(t === 'evrl' && S); if (t !== 'evrl' && S) guardarYa(); if (t === 'evrl') { if (S) pintaBar(); else renderLista(); } }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
