/* ================= Sincronizar móvil y ordenador (1.21.0; carpeta del móvil por Enlace Móvil en 1.21.1) =================
   El móvil y el ordenador juntan sus datos a través de una carpeta compartida, sin servidor: una de OneDrive o
   una carpeta del propio móvil que Windows muestra en el Explorador con Enlace Móvil (CrossDevice):
   - cada dispositivo escribe SU archivo («VisitasPRL-<ordenador|movil>-<id>.json», cifrado con la clave de las copias)
     y lee los de los demás;
   - en el ordenador (Edge o Chrome) la app usa la carpeta que elige el técnico (File System Access);
   - en el móvil (app de Android) el técnico crea su archivo en la carpeta compartida y elige el del ordenador (Storage Access Framework).
   Se junta cada elemento por su fecha de guardado (gana el último) y los borrados viajan como «borrados»
   para que nada vuelva a aparecer. Lo que se sincroniza: visitas guardadas, informes, planificaciones,
   calendario, revisiones (con sus certificados), evaluaciones de riesgos y contratos del perfil.
   El PDF del PSS/DGP no (pesa demasiado): cada dispositivo tiene su carpeta. */
(() => {
const AND = () => !!(window.AndroidApp && typeof AndroidApp.syncLeer === 'function');
const WEB = () => !AND() && typeof window.showDirectoryPicker === 'function';
const PUEDE = () => AND() || WEB();
const PREFIJO = 'VisitasPRL-';
const CK = 'sync-cfg', BK = 'sync-borrados';
const leeJ = (k, d) => { try { const v = JSON.parse(lsGet(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
let CFG = leeJ(CK, {});
const cfg = () => CFG;
const guarda = () => lsSet(CK, JSON.stringify(CFG));
const activa = () => !!CFG.on && PUEDE();
const borrados = () => leeJ(BK, {});
const guardaBorrados = b => {
  const lim = Date.now() - 400 * 864e5;   // se olvidan al cabo de algo más de un año
  Object.keys(b).forEach(k => { if (b[k] < lim) delete b[k]; });
  lsSet(BK, JSON.stringify(b));
};
const hora = t => { if (!t) return ''; const d = new Date(t), h = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); return isoDate(d) === isoDate(new Date()) ? 'hoy a las ' + h : fmtDate(isoDate(d)) + ' a las ' + h; };
const idCorto = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(4)); r.forEach(x => { s += a[x % a.length]; }); return s; };
const nombrePropio = () => `${PREFIJO}${AND() ? 'movil' : 'ordenador'}-${CFG.id || (CFG.id = idCorto())}.json`;

/* ---------- lo que se sincroniza ---------- */
const MOD = {
  reg:{n:['visita', 'visitas'], l:() => HIST, db:['registro-rp-historial', 'registros']},
  inf:{n:['informe', 'informes'], l:() => window.INF_API ? INF_API.lista() : [], db:['registro-rp-informes', 'informes']},
  plan:{n:['planificación', 'planificaciones'], l:() => window.PLAN_API ? PLAN_API.lista() : [], db:['registro-rp-plan', 'planes']},
  cal:{n:['tarea del calendario', 'tareas del calendario'], l:() => window.CAL_API ? CAL_API.lista() : [], db:['registro-rp-cal', 'tareas']},
  rev:{n:['revisión', 'revisiones'], l:() => window.REV_API ? REV_API.lista() : [], db:['registro-rp-rev', 'revs']},
  evrl:{n:['evaluación de riesgos', 'evaluaciones de riesgos'], l:() => window.EVRL_API ? EVRL_API.lista() : [], db:['registro-rp-evrl', 'docs']}
};
const fechaDe = x => (x && (x.guardado || x.creado)) || 0;
/* firma barata de los datos: cambia cuando se guarda, se añade o se borra algo */
function firmaLocal() {
  const p = perfilGet();
  return Object.keys(MOD).map(m => m + ':' + MOD[m].l().map(x => x.id + '@' + fechaDe(x)).sort().join(',')).join('|')
    + '|ctr:' + (p.contratos || []).map(c => c.id + '=' + (c.nombre || '') + (c.sie || '')).join(',')
    + '|b:' + Object.keys(borrados()).length;
}
/* lo que estaba en la última sincronización y ya no está: se ha borrado aquí */
function detectarBorrados() {
  const v = CFG.visto; if (!v) return;
  const b = borrados(), ahora = Date.now(); let n = 0;
  Object.keys(MOD).forEach(m => {
    const act = MOD[m].l(); if (!act.length) return;   // lista vacía: sin cargar todavía, o vaciada (no se arriesga)
    const ids = new Set(act.map(x => x.id));
    (v[m] || []).forEach(id => { if (!ids.has(id) && !b[m + ':' + id]) { b[m + ':' + id] = ahora; n++; } });
  });
  if (n) guardaBorrados(b);
}
const anotarVisto = () => { CFG.visto = {}; Object.keys(MOD).forEach(m => { CFG.visto[m] = MOD[m].l().map(x => x.id); }); };
async function datos() {
  return {app:'registro-rp', tipo:'sincro', version:1, disp:AND() ? 'movil' : 'ordenador', id:CFG.id, escrito:Date.now(),
    registros:HIST, informes:MOD.inf.l(), planes:MOD.plan.l(), calendario:MOD.cal.l(),
    revisiones:window.REV_API ? await REV_API.exportar() : null, evrl:MOD.evrl.l(),
    perfil:{...perfilGet(), nombre:lsGet('rp-nombre') || ''}, borrados:borrados()};
}

/* ---------- borrar aquí lo que se borró en el otro dispositivo ---------- */
function idbBorra(db, st, id) {
  return new Promise((res, rej) => {
    const r = indexedDB.open(db);
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(st)) { d.close(); return res(); } const t = d.transaction(st, 'readwrite'); t.objectStore(st).delete(id); t.oncomplete = () => { d.close(); res(); }; t.onerror = () => { d.close(); rej(t.error); }; };
    r.onerror = () => rej(r.error);
  });
}
async function borraLocal(m, id) {
  const M = MOD[m]; await idbBorra(M.db[0], M.db[1], id);
  if (m !== 'reg') { const a = M.l(), i = a.findIndex(x => x.id === id); if (i >= 0) a.splice(i, 1); }
}

/* «No borrar»: se queda con fecha de ahora, así vuelve a subir y el otro dispositivo lo recupera */
async function revivir(m, id) {
  const x = MOD[m].l().find(y => y.id === id); if (!x) return;
  const n = {...x, guardado:Date.now()};
  if (m === 'reg') await hdb.put(n);
  else if (m === 'inf') await INF_API.importar([n]);
  else if (m === 'plan') await PLAN_API.importar([n]);
  else if (m === 'cal') await CAL_API.importar([n]);
  else if (m === 'rev') await REV_API.importar({revs:[n], docs:[]});
  else if (m === 'evrl') await EVRL_API.importar([n]);
}

/* ---------- juntar los datos del otro dispositivo ---------- */
async function aplicar(d, preguntar) {
  const n = {reg:0, inf:0, plan:0, cal:0, rev:0, evrl:0, ctr:0, del:0};
  const b = borrados();
  /* 1. sus borrados (si son muchos de golpe, se pregunta) */
  const susB = d.borrados && typeof d.borrados === 'object' ? d.borrados : {};
  const aBorrar = [];
  Object.entries(susB).forEach(([k, ts]) => {
    const i = k.indexOf(':'), m = k.slice(0, i), id = k.slice(i + 1); if (!MOD[m]) return;
    const loc = MOD[m].l().find(x => x.id === id);
    if (loc && fechaDe(loc) <= ts && !(m === 'reg' && S.id === id && dirty)) aBorrar.push([m, id, ts]);
    else if (!loc && !(b[k] >= ts)) b[k] = ts;
  });
  let borrar = true;
  if (aBorrar.length > 3) {
    if (!preguntar) { CFG.pendBorrar = aBorrar.length; borrar = false; }
    else borrar = (await ask({title:'¿Borrar también aquí?', yes:'Borrar', no:'No borrar', danger:true, body:`<p>En el otro dispositivo se han borrado <b>${aBorrar.length} elementos</b> (${resumen(aBorrar.reduce((o, [m]) => { o[m] = (o[m] || 0) + 1; return o; }, {}))}).</p><p>Si no lo esperabas, pulsa «No borrar»: se quedan aquí y vuelven al otro dispositivo.</p>`})) === true;
    if (preguntar && !borrar) { for (const [m, id] of aBorrar) { try { await revivir(m, id); } catch (e) {} } CFG.pendBorrar = 0; }
  }
  if (borrar) { for (const [m, id, ts] of aBorrar) { try { await borraLocal(m, id); b[m + ':' + id] = Math.max(b[m + ':' + id] || 0, ts); n.del++; } catch (e) {} } CFG.pendBorrar = 0; }
  guardaBorrados(b);
  const vivo = (m, x) => { const t = b[m + ':' + x.id]; return !t || fechaDe(x) > t; };
  const nuevo = (m, x) => { const a = MOD[m].l().find(y => y.id === x.id); return !a || fechaDe(x) > fechaDe(a); };
  /* 2. visitas */
  for (const r of Array.isArray(d.registros) ? d.registros : []) {
    if (!r || !r.id || !r.rp || !r.resp || !vivo('reg', r) || !nuevo('reg', r)) continue;
    if (S.id === r.id && dirty) continue;   // la tienes abierta y cambiada aquí: gana la tuya al guardarla
    try { if (window.SEG_API && SEG_API.sellarImport) await SEG_API.sellarImport(r); await hdb.put(r); n.reg++; try { await copiaAutomatica(r, true); } catch (x) {} } catch (e) {}
  }
  /* 3. lo demás, con la importación de cada apartado (que ya se queda con lo más reciente) */
  const filtra = (m, arr) => (Array.isArray(arr) ? arr : []).filter(x => x && x.id && vivo(m, x) && nuevo(m, x));
  if (window.INF_API) { const l = filtra('inf', d.informes); if (l.length) { await INF_API.importar(l); n.inf = l.length; } }
  if (window.PLAN_API) { const l = filtra('plan', d.planes); if (l.length) n.plan = await PLAN_API.importar(l); }
  if (window.CAL_API) { const l = filtra('cal', d.calendario); if (l.length) n.cal = await CAL_API.importar(l); }
  if (window.REV_API && d.revisiones) { const l = filtra('rev', d.revisiones.revs); if (l.length || (d.revisiones.docs || []).length) n.rev = await REV_API.importar({revs:l, docs:d.revisiones.docs || []}); }
  if (window.EVRL_API) { const l = filtra('evrl', d.evrl); if (l.length) n.evrl = await EVRL_API.importar(l); }
  if (d.perfil && window.INI_API && INI_API.importarPerfil) n.ctr = INI_API.importarPerfil(d.perfil) || 0;
  if (n.reg || n.del || aBorrar.length) await loadHist();
  return n;
}
function resumen(n) {
  const t = [];
  Object.keys(MOD).forEach(m => { if (n[m]) t.push(plural(n[m], MOD[m].n[0], MOD[m].n[1])); });
  if (n.ctr) t.push(plural(n.ctr, 'contrato', 'contratos'));
  return t.join(', ');
}
function refrescarVista() {
  const v = [...document.querySelectorAll('main[id^="view-"]')].find(x => !x.hidden); if (!v) return;
  const t = v.id.slice(5);
  ['INI_API', 'PLAN_API', 'CAL_API', 'REV_API', 'EVRL_API', 'NORMA_API', 'PSS_API'].forEach(a => { try { if (window[a] && window[a].onTab) window[a].onTab(t); } catch (e) {} });
}

/* ---------- carpeta del ordenador (Edge o Chrome) ---------- */
const kv = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('registro-rp-sync', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (modo, f) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('kv', modo), q = f(t.objectStore('kv')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {get:k => tx('readonly', s => s.get(k)), set:(k, v) => tx('readwrite', s => s.put(v, k)), del:k => tx('readwrite', s => s.delete(k))};
})();
let DIR = null;
async function carpeta() { if (!DIR) { try { DIR = await kv.get('dir'); } catch (e) { DIR = null; } } return DIR; }
async function permiso(pedir) {
  const h = await carpeta(); if (!h) return false;
  const o = {mode:'readwrite'};
  try { if ((await h.queryPermission(o)) === 'granted') return true; if (!pedir) return false; return (await h.requestPermission(o)) === 'granted'; } catch (e) { return false; }
}
async function webLeer() {
  const h = await carpeta(), out = [];
  for await (const [nombre, e] of h.entries()) {
    if (e.kind !== 'file' || nombre === CFG.nombre || !nombre.startsWith(PREFIJO) || !/\.json$/i.test(nombre)) continue;
    const f = await e.getFile(), ant = (CFG.otros || {})[nombre];
    out.push({nombre, mod:f.lastModified, texto:ant && ant.h && ant.mod === f.lastModified && ant.tam === f.size ? null : await f.text(), tam:f.size});
  }
  return out;
}
async function webEscribir(t) {
  const h = await carpeta();
  const fh = await h.getFileHandle(CFG.nombre, {create:true});
  const w = await fh.createWritable(); await w.write(t); await w.close();
}

/* ---------- archivos del móvil (app de Android) ---------- */
const esperas = {};
const espera = (k, ms) => new Promise(res => {
  esperas[k] = res;
  if (ms) setTimeout(() => { if (esperas[k] === res) { delete esperas[k]; res({ok:false, info:'tiempo'}); } }, ms);
});
async function andLeer() {
  const p = espera('leido', 120000); AndroidApp.syncLeer();
  const r = await p; if (!r.ok) throw new Error(r.info || 'No se pudo leer');
  let meta = []; try { meta = JSON.parse(r.info || '[]'); } catch (e) {}
  const out = meta.map((m, i) => {
    if (!m.ok) return {nombre:m.nombre, mod:m.mod, error:m.error || 'sin acceso', texto:null};
    const ant = (CFG.otros || {})[m.nombre];
    return {nombre:m.nombre, mod:m.mod, tam:m.tam, texto:ant && ant.h && m.mod && ant.mod === m.mod && ant.tam === m.tam ? null : AndroidApp.syncTexto(i)};
  });
  try { AndroidApp.syncSoltar(); } catch (e) {}
  return out;
}
async function andEscribir(t) {
  const p = espera('escrito', 120000); AndroidApp.syncEscribir(t);
  const r = await p; if (!r.ok) throw new Error(r.info || 'No se pudo escribir el archivo de este móvil');
}
const estadoAnd = () => { try { return JSON.parse(AndroidApp.syncEstado() || '{}'); } catch (e) { return {}; } };

/* ---------- el archivo puede llegar con restos al final (algunos proveedores no lo recortan) ---------- */
function parseSobre(t) {
  try { return JSON.parse(t); } catch (e) {
    const i = t.indexOf('"datos":"'), j = i > 0 ? t.indexOf('"}', i + 9) : -1;
    if (j > 0) return JSON.parse(t.slice(0, j + 2));
    throw e;
  }
}
async function huella(t) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(h)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''); }

/* ---------- una vuelta de sincronización ---------- */
let ocupado = false, otraVez = null, ultimaVuelta = 0;
async function sincronizar(o = {}) {
  if (!activa()) return null;
  if (window.SEG_API && SEG_API.bloqueada && SEG_API.bloqueada()) { setTimeout(() => sincronizar(o), 3000); return null; }   // en cuanto se desbloquee
  if (histState !== 'ok') { setTimeout(() => sincronizar(o), 1500); return null; }
  if (ocupado) { otraVez = {...(otraVez || {}), ...o, preguntar:!!(o.preguntar || (otraVez && otraVez.preguntar))}; return null; }
  ocupado = true; ultimaVuelta = Date.now(); CFG.estado = 'sincronizando'; pinta();
  const total = {reg:0, inf:0, plan:0, cal:0, rev:0, evrl:0, ctr:0, del:0};
  let falta = '';
  try {
    if (WEB() && !(await carpeta())) { CFG.estado = 'carpeta'; return null; }
    if (WEB() && !(await permiso(!!o.preguntar))) { CFG.estado = 'permiso'; return null; }
    detectarBorrados();
    /* 1. leer los de los demás */
    const otros = AND() ? await andLeer() : await webLeer();
    CFG.otros = CFG.otros || {};
    for (const x of otros) {
      if (x.error) { CFG.otros[x.nombre] = {...(CFG.otros[x.nombre] || {}), h:'', error:x.error}; continue; }
      if (x.texto == null) continue;
      const h = await huella(x.texto), ant = CFG.otros[x.nombre] || {};
      if (ant.h === h && !o.forzar) { CFG.otros[x.nombre] = {...ant, mod:x.mod, tam:x.tam}; continue; }
      let j; try { j = parseSobre(x.texto); } catch (e) { CFG.otros[x.nombre] = {...ant, h:'', error:'el archivo no se puede leer'}; continue; }
      const d = j && j.cifrado ? await SEG_API.abrirSync(j, x.nombre, !!o.preguntar) : j;
      if (!d) { falta = x.nombre; CFG.otros[x.nombre] = {...ant, h:'', error:'falta la contraseña'}; continue; }
      if (!d.registros && d.tipo !== 'sincro') continue;
      const n = await aplicar(d, !!o.preguntar);
      Object.keys(total).forEach(k => { total[k] += n[k] || 0; });
      CFG.otros[x.nombre] = {h, mod:x.mod, tam:x.tam, leido:Date.now(), disp:d.disp || '', escrito:d.escrito || 0, pendiente:!!CFG.pendBorrar};
      if (CFG.pendBorrar) CFG.otros[x.nombre].h = '';   // se vuelve a mirar en la próxima vuelta
    }
    /* 2. escribir el mío si ha cambiado algo */
    const f = firmaLocal();
    if (f !== CFG.firma || o.forzar || !CFG.escrito) {
      const env = await SEG_API.cifrarSync(JSON.stringify(await datos()));
      if (!env) throw new Error('Sin la contraseña de las copias no se puede sincronizar.');
      if (AND()) await andEscribir(env); else await webEscribir(env);
      CFG.firma = f; CFG.escrito = Date.now();
      lsSet('seg-copia-fuera', String(CFG.escrito));   // el archivo compartido ya es una copia fuera del dispositivo
    }
    anotarVisto();
    CFG.ultima = Date.now(); CFG.error = falta ? 'falta-clave' : ''; CFG.estado = 'ok';
    const r = resumen(total);
    if (r || total.del) {
      toast('Sincronizado: ' + [r && r + ' del otro dispositivo', total.del && plural(total.del, 'borrado', 'borrados')].filter(Boolean).join(' · ') + '.');
      refrescarVista();
    }
    return total;
  } catch (e) {
    CFG.error = (e && e.message) || 'No se pudo sincronizar'; CFG.estado = 'error';
    if (o.preguntar) toast('No se pudo sincronizar: ' + CFG.error);
    return null;
  } finally {
    ocupado = false; guarda(); pinta();
    if (otraVez) { const oo = otraVez; otraVez = null; setTimeout(() => sincronizar(oo), 300); }
  }
}

/* ---------- puesta en marcha ---------- */
async function activar() {
  if (!PUEDE()) { await ask({title:'Sincronizar móvil y ordenador', single:true, yes:'Entendido', body:'<p>Se puede usar en la app de Android y en el ordenador con <b>Edge</b> o <b>Chrome</b>.</p>'}); return; }
  if (WEB()) {
    const ok = await ask({title:'Sincronizar móvil y ordenador', yes:'Elegir carpeta', body:`<p>En la ventana que se abre, elige la carpeta que compartirán los dos:</p>
      <ul class="sy-pasos"><li><b>Con Enlace Móvil</b> (móvil personal): a la izquierda, tu móvil › <b>storage › Download › Visitas PRL</b>.</li>
      <li><b>Con OneDrive</b> (si el móvil tiene la misma cuenta): tu OneDrive › <b>Visitas PRL</b>.</li></ul>
      <p>Pulsa <b>«Seleccionar carpeta»</b> y permite que la app la use (<b>«Editar archivos»</b>; si te lo ofrece, <b>«Permitir en cada visita»</b>).</p>
      <p class="help">La app deja ahí su archivo cifrado y lee el del móvil. Después, en el móvil: Perfil › Sincronizar móvil y ordenador.</p>`});
    if (ok !== true) return;
    let h; try { h = await window.showDirectoryPicker({id:'visitas-prl-sync', mode:'readwrite', startIn:'documents'}); } catch (e) { return; }
    DIR = h; try { await kv.set('dir', h); } catch (e) { /* se recuerda mientras la app esté abierta */ }
    if (!(await permiso(true))) { toast('Sin permiso para la carpeta no se puede sincronizar.'); return; }
    CFG = {on:true, id:CFG.id || idCorto(), carpeta:h.name, otros:{}}; CFG.nombre = nombrePropio(); guarda();
    await sincronizar({preguntar:true, forzar:true});
    return;
  }
  /* móvil: 1) su archivo en la carpeta compartida; 2) el del ordenador */
  const ok = await ask({title:'Sincronizar móvil y ordenador', yes:'Elegir dónde guardar', body:`<p><b>Antes</b>, actívalo en el ordenador: así ya existe la carpeta con su archivo.</p>
    <p>Se abre el selector de archivos. Elige la misma carpeta que en el ordenador:</p>
    <ul class="sy-pasos"><li><b>Con Enlace Móvil</b>: <b>Descargas › Visitas PRL</b> (en este móvil).</li><li><b>Con OneDrive</b>: toca <b>☰ › OneDrive › Visitas PRL</b>.</li></ul>
    <p>Y pulsa <b>«Guardar»</b>.</p>`});
  if (ok !== true) return;
  CFG.id = CFG.id || idCorto();
  const p = espera('propio'); AndroidApp.syncElegirPropio(nombrePropio());
  const r = await p; if (!r.ok) { toast('No se ha elegido dónde guardar.'); return; }
  let nom = nombrePropio(); try { nom = JSON.parse(r.info || '[]')[0] || nom; } catch (e) {}
  CFG = {...CFG, on:true, nombre:nom, otros:{}}; delete CFG.firma; delete CFG.escrito; guarda();
  await elegirOtros(true);
}
async function elegirOtros(alta) {
  const ok = await ask({title:alta ? 'Ahora, el archivo del ordenador' : 'Archivo del ordenador', yes:'Elegir archivo', no:alta ? 'Más tarde' : 'Cancelar', body:`<ol class="sy-pasos"><li>En la misma carpeta (<b>Descargas › Visitas PRL</b>, u <b>OneDrive › Visitas PRL</b>), toca el archivo <b>«VisitasPRL-ordenador-…json»</b>.</li><li>Si tienes más de un ordenador, mantén pulsado para elegir varios.</li></ol>`});
  if (ok === true) {
    const p = espera('otros'); AndroidApp.syncElegirOtros();
    const r = await p; if (!r.ok) toast('No se ha elegido ningún archivo.');
  }
  await sincronizar({preguntar:true, forzar:true});
}
async function desactivar() {
  const ok = await ask({title:'¿Dejar de sincronizar?', yes:'Dejar de sincronizar', danger:true, body:'<p>Los datos de este dispositivo no se tocan. El archivo compartido se queda donde está: puedes borrarlo tú si no lo vas a usar.</p>'});
  if (ok !== true) return;
  if (AND()) { try { AndroidApp.syncQuitar(); } catch (e) {} }
  else { DIR = null; try { await kv.del('dir'); } catch (e) {} }
  CFG = {id:CFG.id}; guarda(); pinta(); toast('Sincronización desactivada.');
}

/* ---------- en pantalla: tarjeta del Perfil, pie de la barra lateral y aviso ---------- */
function lineas() {
  const L = [];
  if (!activa()) return L;
  L.push(['', CFG.ultima ? 'Última sincronización: ' + hora(CFG.ultima) : 'Todavía sin sincronizar']);
  L.push(['', `Este ${AND() ? 'móvil' : 'ordenador'} escribe <b>${esc(CFG.nombre || '')}</b>${!AND() && CFG.carpeta ? ' en la carpeta «' + esc(CFG.carpeta) + '»' : ''}`]);
  const ot = Object.entries(CFG.otros || {});
  const enAnd = AND() ? (estadoAnd().otros || []) : [];
  if (AND() && !enAnd.length) L.push(['warn', 'Falta elegir el archivo del ordenador.']);
  if (AND() && estadoAnd().propio != null && estadoAnd().propioOk === false) L.push(['warn', 'El móvil no tiene permiso permanente para escribir su archivo: pulsa «Desactivar» y vuelve a activarlo.']);
  ot.forEach(([n, x]) => L.push([x.error ? 'warn' : '', `Lee <b>${esc(n)}</b>${x.error ? ' · ' + esc(x.error) : x.escrito ? ` · copia del ${x.disp === 'movil' ? 'móvil' : x.disp === 'ordenador' ? 'ordenador' : 'otro dispositivo'} de ${hora(x.escrito)}` : ''}`]));
  if (!AND() && !ot.length && CFG.ultima) L.push(['', 'Aún no hay archivo del móvil en la carpeta: actívalo también en el móvil.']);
  if (CFG.estado === 'permiso') L.push(['warn', 'Hace falta volver a dar permiso a la carpeta: pulsa «Sincronizar ahora».']);
  if (CFG.estado === 'carpeta') L.push(['warn', 'Este navegador ha olvidado la carpeta: pulsa «Cambiar carpeta» y elige otra vez la carpeta compartida.']);
  if (CFG.pendBorrar) L.push(['warn', `Hay ${CFG.pendBorrar} borrados del otro dispositivo sin confirmar: pulsa «Sincronizar ahora».`]);
  if (CFG.error === 'falta-clave') L.push(['warn', 'Falta la contraseña de las copias del otro dispositivo: pulsa «Sincronizar ahora».']);
  else if (CFG.error) L.push(['warn', 'Último error: ' + esc(CFG.error)]);
  return L;
}
function perfilHtml() {
  const on = activa();
  return `<section class="block sy-card" id="sy-card">
    <header class="bh"><h2>Sincronizar móvil y ordenador</h2><span class="pill ${on ? 'ok' : ''}">${on ? 'Activada' : 'Desactivada'}</span></header>
    <div class="bb">
      <p class="help">${on ? 'Lo que guardas aquí aparece en el otro dispositivo, y al revés: visitas guardadas, informes, planificaciones, calendario, revisiones, evaluaciones de riesgos y contratos. Va cifrado con la contraseña de las copias. El PDF del PSS/DGP no viaja.' : 'Junta lo del móvil y lo del ordenador a través de una carpeta compartida: la del propio móvil, que el ordenador ve con Enlace Móvil, o una de OneDrive. Sin servidores: cada dispositivo deja ahí su archivo cifrado y lee el del otro.'}</p>
      ${on ? `<ul class="sy-est">${lineas().map(([c, t]) => `<li class="${c}">${t}</li>`).join('')}</ul>` : ''}
      ${!PUEDE() ? '<p class="help">Disponible en la app de Android y en el ordenador con Edge o Chrome.</p>' : ''}
      <div class="sy-acc">${on ? `<button type="button" class="btn primary" data-sy="ya"${CFG.estado === 'sincronizando' ? ' disabled' : ''}>${CFG.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar ahora'}</button>${AND() ? '<button type="button" class="btn" data-sy="otros">Archivo del ordenador</button>' : '<button type="button" class="btn" data-sy="carpeta">Cambiar carpeta</button>'}<button type="button" class="btn sy-off" data-sy="off">Desactivar</button>` : PUEDE() ? '<button type="button" class="btn primary" data-sy="on">Activar</button>' : ''}</div>
    </div>
  </section>`;
}
function pinta() {
  const c = $('#sy-card'); if (c) c.outerHTML = perfilHtml();
  /* pie de la barra lateral (ordenador) */
  const nav = $('.bottomnav');
  if (nav) {
    let p = $('#sy-pie');
    if (activa()) {
      if (!p) { nav.insertAdjacentHTML('beforeend', '<button type="button" class="sy-pie" id="sy-pie" data-sy="ya"></button>'); p = $('#sy-pie'); }
      const mal = CFG.estado === 'permiso' || CFG.estado === 'carpeta' || CFG.estado === 'error' || CFG.error || CFG.pendBorrar;
      p.className = 'sy-pie' + (mal ? ' warn' : '') + (CFG.estado === 'sincronizando' ? ' on' : '');
      p.innerHTML = `<i aria-hidden="true"></i><span>${CFG.estado === 'sincronizando' ? 'Sincronizando…' : CFG.estado === 'permiso' ? 'Sincronizar: pulsa para seguir' : mal ? 'Sincronizar: revisar' : CFG.ultima ? 'Sincronizado · ' + hora(CFG.ultima).replace('hoy a las ', '') : 'Sincronizar'}</span>`;
      p.title = 'Sincronizar ahora';
    } else if (p) p.remove();
  }
  /* aviso flotante si hace falta un toque (permiso de la carpeta o confirmar borrados) */
  let a = $('#sy-aviso');
  const hace = activa() && (CFG.estado === 'permiso' || CFG.pendBorrar || CFG.error === 'falta-clave');
  if (hace) {
    if (!a) { document.body.insertAdjacentHTML('beforeend', '<button type="button" class="sy-aviso" id="sy-aviso" data-sy="ya"></button>'); a = $('#sy-aviso'); }
    a.innerHTML = `<b>Sincronizar</b><span>${CFG.estado === 'permiso' ? 'Toca para seguir sincronizando' : CFG.pendBorrar ? 'Hay borrados por confirmar' : 'Falta la contraseña del otro dispositivo'}</span>`;
  } else if (a) a.remove();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-sy]'); if (!b) return;
  const a = b.dataset.sy;
  if (a === 'on') return activar();
  if (a === 'off') return desactivar();
  if (a === 'ya') return sincronizar({preguntar:true, forzar:!!b.closest('#sy-card')});
  if (a === 'otros') return elegirOtros(false);
  if (a === 'carpeta') { const id = CFG.id; DIR = null; try { await kv.del('dir'); } catch (x) {} CFG = {id}; guarda(); return activar(); }
});

/* ---------- cuándo se sincroniza ---------- */
let tGuardar = 0;
const pronto = (ms = 4000) => { if (!activa()) return; clearTimeout(tGuardar); tGuardar = setTimeout(() => sincronizar(), ms); };
const _rh2 = renderHist;
renderHist = function () { _rh2.apply(this, arguments); if (activa() && !ocupado) pronto(); };
document.addEventListener('visibilitychange', () => {
  if (!activa()) return;
  if (document.visibilityState === 'hidden') { clearTimeout(tGuardar); if (firmaLocal() !== CFG.firma) sincronizar(); }
  else if (Date.now() - ultimaVuelta > 20000) sincronizar();
});
setInterval(() => { if (activa() && document.visibilityState === 'visible' && Date.now() - ultimaVuelta > 110000) sincronizar(); }, 30000);

window.SYNC_API = {
  perfilHtml, sincronizar, activa,
  estado: () => ({...CFG}),
  /* respuestas de la app de Android */
  nativo(k, ok, info) { const r = esperas[k]; delete esperas[k]; if (r) r({ok:!!ok, info:info || ''}); },
  alSalir() { if (activa() && firmaLocal() !== CFG.firma) sincronizar(); },
  alVolver() { if (activa() && Date.now() - ultimaVuelta > 20000) sincronizar(); }
};
pinta();
if (activa()) setTimeout(() => sincronizar(), 2500);
})();
