/* ================= Privacidad y seguridad (1.18.0) =================
   - Bloqueo de la app: en Android con el bloqueo del propio móvil (huella, cara, PIN o patrón);
     en el ordenador con un PIN de la app. Se bloquea al abrir y tras unos minutos sin usarla.
   - Copias de seguridad cifradas: AES-256-GCM con una clave sacada de la contraseña (PBKDF2-SHA256,
     600 000 vueltas). La clave se guarda en este dispositivo sin poder leerse (CryptoKey no extraíble).
   - Código de verificación de cada registro: SHA-256 del contenido; cada cambio crea una versión nueva.
   - Borrado de datos y texto informativo de protección de datos para los PDF. */
(() => {
const te = new TextEncoder(), td = new TextDecoder();
const SUB = () => (window.crypto && crypto.subtle) || null;
const AND = () => window.AndroidApp || null;
const fn = n => !!(AND() && typeof AND()[n] === 'function');
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
const val = id => (((document.getElementById(id) || {}).value) || '').trim();
const fFecha = t => { const d = new Date(t); return `${fmtDate(isoDate(d))} a las ${hhmm(d)}`; };
const ITER = 600000, AAD = te.encode('registro-rp');

const IC = {
  candado:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><path d="M12 14.6v2.2"/></svg>',
  escudo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 5 5.8v5.4c0 4.6 3 8.2 7 9.6 4-1.4 7-5 7-9.6V5.8z"/><path d="m8.9 12.2 2.2 2.2 4.1-4.3"/></svg>',
  llave:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="3.8"/><path d="m10.8 12.3 8.7-8.6M16.4 6.8l2.4 2.4M14.2 9l1.9 1.9"/></svg>',
  red:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5S14.4 18.1 12 20.5M12 3.5C9.6 5.9 8.4 8.7 8.4 12s1.2 6.1 3.6 8.5"/><path d="m4.5 4.5 15 15"/></svg>',
  movil:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4"/><path d="M10.5 18h3"/></svg>',
  doc:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/></svg>',
  ojo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/></svg>',
  papelera:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.8h15M9.5 6.8V4.6h5v2.2M6.8 6.8l.8 12.6h8.8l.8-12.6"/></svg>'
};

/* ---------- ajustes ---------- */
const CFG = 'seg-cfg';
function cfg() {
  let c = null; try { c = JSON.parse(lsGet(CFG) || 'null'); } catch (e) {}
  c = c && typeof c === 'object' ? c : {};
  return {lock:c.lock !== false, min:[1, 5, 15, 30].includes(c.min) ? c.min : 5, captura:!!c.captura, aviso:[3, 7, 15, 30].includes(c.aviso) ? c.aviso : 7};
}
const setCfg = o => lsSet(CFG, JSON.stringify({...cfg(), ...o}));

/* ---------- almacén de claves (IndexedDB, CryptoKey no extraíble) ---------- */
const sdb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('registro-rp-seg', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('k')) r.result.createObjectStore('k', {keyPath:'id'}); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const tx = (modo, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('k', modo), q = f(t.objectStore('k')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }));
  return {get:id => tx('readonly', s => s.get(id)), put:o => tx('readwrite', s => s.put(o)), del:id => tx('readwrite', s => s.delete(id))};
})();
let CLAVE = null;
const listo = (async () => { try { CLAVE = (await sdb.get('copias')) || null; } catch (e) { CLAVE = null; } })();

/* ---------- cifrado de copias ---------- */
async function claveDe(pass, sal, it) {
  const k = await SUB().importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return SUB().deriveKey({name:'PBKDF2', hash:'SHA-256', salt:sal, iterations:it}, k, {name:'AES-GCM', length:256}, false, ['encrypt', 'decrypt']);
}
async function cifrarCon(c, texto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await SUB().encrypt({name:'AES-GCM', iv, additionalData:AAD}, c.key, te.encode(texto));
  return JSON.stringify({app:'registro-rp', cifrado:{v:1, alg:'AES-256-GCM', kdf:'PBKDF2-SHA256', it:c.it, sal:c.sal, iv:b64(iv)}, exportado:new Date().toISOString(), datos:b64(new Uint8Array(ct))});
}
async function abrirCon(key, j) {
  try { return td.decode(await SUB().decrypt({name:'AES-GCM', iv:unb64(j.cifrado.iv), additionalData:AAD}, key, unb64(j.datos))); }
  catch (e) { return null; }
}
const FUERZA = p => { let n = 0; if (p.length >= 10) n++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++; if (/\d/.test(p)) n++; if (/[^A-Za-z0-9]/.test(p)) n++; return n; };
async function crearClave() {
  await listo;
  const cambio = !!CLAVE;
  const r = await ask({title:cambio ? 'Cambiar la contraseña de las copias' : 'Contraseña de las copias', yes:'Guardar', body:`
    <p class="help">Las copias de seguridad (Exportar copia${fn('copiaAuto') ? ' y las automáticas de Descargas' : ''}) se cifran con esta contraseña. Sin ella <b>no se pueden abrir</b>, ni siquiera tú: apúntala en un sitio seguro.</p>
    ${cambio ? '<div class="field"><label for="sg-c0">Contraseña actual</label><input id="sg-c0" type="password" autocomplete="current-password"></div>' : ''}
    <div class="field"><label for="sg-c1">${cambio ? 'Contraseña nueva' : 'Contraseña'}</label><input id="sg-c1" type="password" autocomplete="new-password" minlength="8"></div>
    <div class="field"><label for="sg-c2">Repítela</label><input id="sg-c2" type="password" autocomplete="new-password"></div>
    <p class="help">Mínimo 8 caracteres. Mejor si mezclas letras, números y algún símbolo.</p>`});
  if (r !== true) return false;
  const c0 = cambio ? $('#sg-c0').value : '', c1 = $('#sg-c1').value, c2 = $('#sg-c2').value;
  if (cambio) {
    const k0 = await claveDe(c0, unb64(CLAVE.sal), CLAVE.it);
    if ((await abrirCon(k0, JSON.parse(CLAVE.chk))) !== 'ok') { toast('La contraseña actual no es correcta.'); return crearClave(); }
  }
  if (c1.length < 8) { toast('La contraseña tiene que tener al menos 8 caracteres.'); return crearClave(); }
  if (c1 !== c2) { toast('Las dos contraseñas no coinciden.'); return crearClave(); }
  if (FUERZA(c1) < 2) { toast('Es una contraseña muy fácil: alárgala o mezcla letras, números y símbolos.'); return crearClave(); }
  toast('Preparando el cifrado…');
  const n = await nuevaClave(c1);
  toast(cambio ? 'Contraseña cambiada.' + (n ? ` ${plural(n, 'copia automática cifrada', 'copias automáticas cifradas')} de nuevo.` : '')
    : 'Listo: las copias van cifradas.' + (n ? ` ${plural(n, 'copia automática cifrada', 'copias automáticas cifradas')}.` : ''));
  pinta();
  return true;
}
/* guarda la clave sacada de la contraseña y vuelve a escribir cifradas las copias automáticas */
async function nuevaClave(pass, sal = b64(crypto.getRandomValues(new Uint8Array(16))), key = null, it = ITER) {
  key = key || await claveDe(pass, unb64(sal), it);
  const nueva = {id:'copias', key, sal, it, creado:Date.now()};
  nueva.chk = await cifrarCon(nueva, 'ok');
  await sdb.put(nueva); CLAVE = nueva;
  return recopiar();
}
/* vuelve a escribir las copias automáticas (cifradas) y borra las que ya no tienen registro */
async function recopiar() {
  if (!copiaAutoDisponible()) return 0;
  let n = 0;
  for (const r of HIST) { if (await copiaAutomatica(r, true)) n++; }
  if (fn('copiasLimpiar')) { try { AND().copiasLimpiar(JSON.stringify(HIST.map(nombreCopia))); } catch (e) {} }
  renderCopiaEstado();
  return n;
}
const CACHE = new Map();
async function descifrarCopia(j, nombre) {
  const c = j.cifrado || {};
  if (c.alg !== 'AES-256-GCM' || !j.datos || !SUB()) { const e = new Error('formato'); e.seg = true; throw e; }
  await listo;
  const parse = t => JSON.parse(t);
  if (CLAVE && CLAVE.sal === c.sal) { const t = await abrirCon(CLAVE.key, j); if (t != null) return parse(t); }
  if (CACHE.has(c.sal)) { const t = await abrirCon(CACHE.get(c.sal), j); if (t != null) return parse(t); }
  for (let i = 0; i < 3; i++) {
    const r = await ask({title:'Copia cifrada', yes:'Abrir', no:'Saltar', body:`<p class="m-file">${esc(nombre || 'Copia de seguridad')}</p>
      <p>${i ? '<b>Contraseña incorrecta.</b> ' : ''}Escribe la contraseña con la que se hizo la copia.</p>
      <div class="field"><label for="sg-cp">Contraseña de las copias</label><input id="sg-cp" type="password" autocomplete="current-password"></div>`});
    if (r !== true) break;
    const pass = $('#sg-cp').value; if (!pass) continue;
    const key = await claveDe(pass, unb64(c.sal), c.it || ITER);
    const t = await abrirCon(key, j);
    if (t != null) {
      CACHE.set(c.sal, key);
      if (!CLAVE) { try { await nuevaClave(null, c.sal, key, c.it || ITER); toast('Las copias de este dispositivo usarán la misma contraseña.'); } catch (x) {} }
      return parse(t);
    }
  }
  const e = new Error('contraseña'); e.seg = true; throw e;
}

/* ---------- código de verificación de los registros ---------- */
const OMIT = new Set(['guardado', 'integ', 'cambios']);
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
async function huella(rec) {
  const o = {}; for (const k of Object.keys(rec)) if (!OMIT.has(k)) o[k] = rec[k];
  return hex(await SUB().digest('SHA-256', te.encode(canon(o))));
}
const codigo = h => h ? h.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-') : '';
const limpiaCod = s => (s || '').toUpperCase().replace(/[^0-9A-F]/g, '');
async function sellar(rec, prev) {
  if (!SUB()) return rec;
  const h = await huella(rec), pi = prev && prev.integ;
  if (pi && pi.h === h) { rec.integ = pi; rec.cambios = prev.cambios || [{v:pi.v || 1, h:pi.h, f:pi.f}]; return rec; }
  const v = pi ? (pi.v || 1) + 1 : 1, f = Date.now();
  rec.integ = {h, v, f, ...(pi && prev.firma ? {trasFirma:true} : {})};
  rec.cambios = [...((prev && prev.cambios) || (pi ? [{v:pi.v || 1, h:pi.h, f:pi.f}] : [])), {v, h, f, ...(rec.integ.trasFirma ? {trasFirma:true} : {})}].slice(-50);
  return rec;
}
/* al importar: si la copia trae código y el contenido no coincide, alguien la ha tocado fuera de la app */
async function sellarImport(r) {
  if (!SUB() || !r) return r;
  const i = r.integ;
  if (!i || !i.h) return sellar(r, null);
  const h = await huella(r);
  if (h === i.h) return r;
  const f = Date.now(), v = (i.v || 1) + 1;
  r.integ = {h, v, f, alterado:true};
  r.cambios = [...(r.cambios || [{v:i.v || 1, h:i.h, f:i.f}]), {v, h, f, alterado:true}].slice(-50);
  return r;
}
/* registros de versiones anteriores sin código: se sellan una vez */
async function sellarPendientes() {
  if (!SUB()) return 0;
  let n = 0;
  for (const r of HIST) {
    if (r.integ && r.integ.h) continue;
    const h = await huella(r);
    r.integ = {h, v:1, f:Date.now(), ini:true}; r.cambios = [{v:1, h, f:r.integ.f}];
    try { await hdb.put(r); n++; } catch (e) {}
  }
  return n;
}
function histLinea(r) {
  const i = r && r.integ; if (!i || !i.h) return '';
  const v = i.v || 1;
  const nota = v > 1 ? ` · versión ${v}: ${i.alterado ? 'modificado fuera de la app' : i.trasFirma ? 'modificado después de firmar' : 'modificado'} el ${fmtDate(isoDate(new Date(i.f)))}` : '';
  return `<p class="hsub sg-cod${i.alterado ? ' bad' : i.trasFirma ? ' warn' : ''}">${IC.escudo}<span>Código <b>${codigo(i.h)}</b>${esc(nota)}</span></p>`;
}
function codigoPdf(r) {
  if (!r || !r.id) return '';
  const st = HIST.find(x => x.id === r.id);
  if (!st || !st.integ || !st.integ.h) return '';
  if (r !== st && !(r === S && !dirty)) return '';
  return `Código de verificación ${codigo(st.integ.h)} · versión ${st.integ.v || 1} · se comprueba en Visitas PRL › Perfil › Privacidad y seguridad`;
}
async function comprobarCodigo(txt) {
  const c = limpiaCod(txt);
  if (c.length < 8) return {msg:'Escribe el código completo (12 letras y números, por ejemplo 3F9A-11C2-7B0E).', cls:'warn'};
  for (const r of HIST) {
    const vs = r.cambios && r.cambios.length ? r.cambios : r.integ ? [r.integ] : [];
    const hit = vs.find(x => x.h && x.h.toUpperCase().startsWith(c));
    if (!hit) continue;
    const actual = r.integ && hit.h === r.integ.h;
    const ok = actual && (await huella(r)) === r.integ.h;
    const nombre = `${r.codigo ? 'Nº ' + r.codigo + ' · ' : ''}${r.rp?.ubicacion || 'Sin ubicación'} · ${fmtDate(r.rp?.fecha)}`;
    if (actual && ok) return {cls:'ok', msg:`<b>Coincide.</b> Es el registro ${esc(nombre)}, versión ${hit.v || 1} (${fFecha(hit.f)}), y no ha cambiado desde entonces.`};
    if (actual) return {cls:'bad', msg:`<b>Atención:</b> el código es del registro ${esc(nombre)}, pero su contenido en este móvil ya no coincide con él.`};
    return {cls:'warn', msg:`<b>Es una versión anterior.</b> El código es de la versión ${hit.v || 1} del registro ${esc(nombre)} (${fFecha(hit.f)}). Ahora va por la versión ${r.integ.v || 1}${r.integ.alterado ? ', modificada fuera de la app' : ''}.`};
  }
  return {cls:'warn', msg:'No coincide con ningún registro de este dispositivo. Si el registro lo hizo otro técnico, se comprueba en su móvil.'};
}
async function comprobarTodos() {
  const malos = [];
  for (const r of HIST) { if (r.integ && r.integ.h && (await huella(r)) !== r.integ.h) malos.push(r); }
  return malos;
}

/* ---------- bloqueo ---------- */
const pinDe = () => { try { const p = JSON.parse(lsGet('seg-pin') || 'null'); return p && p.h ? p : null; } catch (e) { return null; } };
function modo() {
  if (AND()) {
    if (!fn('bloqueoDisponible') || !fn('desbloquear')) return 'no';
    let ok = false; try { ok = !!AND().bloqueoDisponible(); } catch (e) {}
    return ok ? 'movil' : 'sinpantalla';
  }
  return pinDe() ? 'pin' : 'sinpin';
}
const activo = () => { const m = modo(); return cfg().lock && (m === 'movil' || m === 'pin'); };
let bloq = false, ocultoDesde = 0, ultAct = Date.now(), pidiendo = false;
async function derivaPin(pin, sal, it) {
  const k = await SUB().importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await SUB().deriveBits({name:'PBKDF2', hash:'SHA-256', salt:sal, iterations:it}, k, 256));
}
const intentos = () => { try { return JSON.parse(lsGet('seg-int') || 'null') || {n:0, hasta:0}; } catch (e) { return {n:0, hasta:0}; } };
function pintaLock() {
  let el = document.getElementById('seg-lock');
  if (!el) {
    el = document.createElement('div'); el.id = 'seg-lock';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'sl-t');
    el.addEventListener('click', e => { const b = e.target.closest('[data-sl]'); if (!b) return; if (b.dataset.sl === 'movil') pedirMovil(); else if (b.dataset.sl === 'pin') entrarPin(); else if (b.dataset.sl === 'olvido') { const o = $('#sl-olv'); if (o) o.hidden = !o.hidden; } });
    el.addEventListener('keydown', e => { if (e.target.id === 'sl-pin' && e.key === 'Enter') { e.preventDefault(); entrarPin(); } });
    document.body.appendChild(el);
  }
  const m = modo();
  el.innerHTML = `<div class="sl-in">
    <span class="sl-ic">${IC.candado}</span>
    <h2 id="sl-t">Visitas PRL está bloqueada</h2>
    ${m === 'pin' ? `<p>Escribe tu PIN para entrar.</p>
      <div class="sl-pin"><input id="sl-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="PIN"><button type="button" class="btn primary" data-sl="pin">Entrar</button></div>
      <p class="sl-err" id="sl-err" role="alert"></p>
      <button type="button" class="linkbtn" data-sl="olvido">He olvidado el PIN</button>
      <p class="sl-olv" id="sl-olv" hidden>El PIN no se puede recuperar: es lo que protege tus datos. Si no lo recuerdas, borra los datos de este sitio en el navegador (Configuración › Privacidad › Datos de sitios) y después importa tu última copia de seguridad.</p>`
    : `<p>Desbloquea con la huella, la cara o el PIN del móvil.</p>
      <button type="button" class="btn primary" data-sl="movil">Desbloquear</button>
      <p class="sl-err" id="sl-err" role="alert"></p>`}
  </div>`;
}
function bloquear() {
  if (exige) return;
  if (!activo()) { document.documentElement.classList.remove('seg-lk'); return; }
  bloq = true; pidiendo = false;
  document.documentElement.classList.add('seg-lk');
  const ae = document.activeElement; if (ae && ae.blur) ae.blur();
  pintaLock();
  if (modo() === 'movil') setTimeout(pedirMovil, 300);
  else setTimeout(() => { const i = $('#sl-pin'); if (i) i.focus(); }, 60);
}
function abrir() {
  bloq = false; pidiendo = false; ultAct = Date.now(); ocultoDesde = 0;
  lsSet('seg-int', JSON.stringify({n:0, hasta:0}));
  document.documentElement.classList.remove('seg-lk');
  const el = document.getElementById('seg-lock'); if (el) el.remove();
  listo.then(exigirClave);
}
function pedirMovil() {
  if (!bloq || pidiendo) return;
  pidiendo = true;
  const e = $('#sl-err'); if (e) e.textContent = '';
  try { AND().desbloquear(); } catch (x) { pidiendo = false; if (e) e.textContent = 'No se pudo abrir el desbloqueo del móvil.'; }
}
function resultado(ok, msg) {
  pidiendo = false;
  if (ok) { abrir(); return; }
  if (!bloq) return;
  const e = $('#sl-err'); if (e) e.textContent = (msg ? msg + '. ' : '') + 'Pulsa «Desbloquear» para intentarlo otra vez.';
}
async function entrarPin() {
  const i = $('#sl-pin'), e = $('#sl-err'), p = pinDe(); if (!i) return;
  if (!p) { abrir(); return; }
  const st = intentos(), now = Date.now();
  if (now < st.hasta) { e.textContent = `Demasiados intentos. Espera ${Math.ceil((st.hasta - now) / 1000)} segundos.`; return; }
  const v = i.value.trim(); if (!v) { i.focus(); return; }
  i.disabled = true;
  let ok = false; try { ok = (await derivaPin(v, unb64(p.sal), p.it)) === p.h; } catch (x) {}
  i.disabled = false; i.value = '';
  if (ok) { abrir(); return; }
  const n = st.n + 1, hasta = n >= 5 ? Date.now() + 30000 * Math.pow(2, Math.min(n - 5, 6)) : 0;
  lsSet('seg-int', JSON.stringify({n, hasta}));
  e.textContent = hasta ? `PIN incorrecto. Espera ${Math.round((hasta - Date.now()) / 1000)} segundos para volver a intentarlo.` : `PIN incorrecto. ${5 - n === 1 ? 'Queda 1 intento' : `Quedan ${5 - n} intentos`} antes de tener que esperar.`;
  i.focus();
}
async function crearPin() {
  const p = pinDe();
  const r = await ask({title:p ? 'Cambiar el PIN' : 'PIN de la app', yes:'Guardar', body:`
    <p class="help">Te lo pedirá al abrir la app y cuando lleves ${cfg().min} min sin usarla. De 4 a 12 números.</p>
    ${p ? '<div class="field"><label for="sg-p0">PIN actual</label><input id="sg-p0" type="password" inputmode="numeric" autocomplete="off" maxlength="12"></div>' : ''}
    <div class="field"><label for="sg-p1">${p ? 'PIN nuevo' : 'PIN'}</label><input id="sg-p1" type="password" inputmode="numeric" autocomplete="off" maxlength="12"></div>
    <div class="field"><label for="sg-p2">Repítelo</label><input id="sg-p2" type="password" inputmode="numeric" autocomplete="off" maxlength="12"></div>`});
  if (r !== true) return false;
  const a = val('sg-p1'), b = val('sg-p2');
  if (p && (await derivaPin(val('sg-p0'), unb64(p.sal), p.it)) !== p.h) { toast('El PIN actual no es correcto.'); return crearPin(); }
  if (!/^\d{4,12}$/.test(a)) { toast('El PIN tiene que tener entre 4 y 12 números.'); return crearPin(); }
  if (a !== b) { toast('Los dos PIN no coinciden.'); return crearPin(); }
  if (/^(\d)\1+$/.test(a) || '01234567890123'.includes(a) || '98765432109876'.includes(a)) { toast('Ese PIN es muy fácil de adivinar (1111, 1234…). Elige otro.'); return crearPin(); }
  const sal = crypto.getRandomValues(new Uint8Array(16)), it = 200000;
  lsSet('seg-pin', JSON.stringify({sal:b64(sal), it, h:await derivaPin(a, sal, it)}));
  setCfg({lock:true});
  toast(p ? 'PIN cambiado.' : 'PIN guardado: la app se bloqueará cuando no la uses.');
  pinta();
  return true;
}
async function quitarPin() {
  const p = pinDe(); if (!p) return;
  const r = await ask({title:'Quitar el PIN', yes:'Quitar', danger:true, body:'<p>La app dejará de pedir el PIN en este ordenador.</p><div class="field"><label for="sg-p0">PIN actual</label><input id="sg-p0" type="password" inputmode="numeric" autocomplete="off" maxlength="12"></div>'});
  if (r !== true) return;
  if ((await derivaPin(val('sg-p0'), unb64(p.sal), p.it)) !== p.h) { toast('El PIN no es correcto.'); return; }
  try { localStorage.removeItem('seg-pin'); } catch (e) {}
  toast('PIN quitado.'); pinta();
}
/* vuelve de segundo plano (Android avisa con los milisegundos que ha estado fuera) */
function vuelve(ms) { if (!bloq && activo() && ms >= cfg().min * 60000) bloquear(); }
document.addEventListener('visibilitychange', () => {
  if (AND()) return;
  if (document.hidden) ocultoDesde = Date.now();
  else if (ocultoDesde) { const ms = Date.now() - ocultoDesde; ocultoDesde = 0; vuelve(ms); }
});
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { ultAct = Date.now(); }, {passive:true, capture:true}));
setInterval(() => { if (!AND() && !bloq && activo() && Date.now() - ultAct >= cfg().min * 60000) bloquear(); }, 20000);

/* ---------- borrar datos ---------- */
const BDS = ['registro-rp', 'registro-rp-historial', 'registro-rp-informes', 'registro-rp-plan', 'registro-rp-cal', 'registro-rp-rev', 'registro-rp-evrl', 'registro-rp-pss', 'registro-rp-seg'];
async function vaciarBD(nombre) {
  await new Promise(res => {
    let r; try { r = indexedDB.open(nombre); } catch (e) { res(); return; }
    r.onerror = () => res();
    r.onupgradeneeded = () => {};
    r.onsuccess = () => {
      const d = r.result, st = [...d.objectStoreNames];
      if (!st.length) { d.close(); res(); return; }
      try { const t = d.transaction(st, 'readwrite'); st.forEach(s => t.objectStore(s).clear()); t.oncomplete = t.onerror = t.onabort = () => { d.close(); res(); }; }
      catch (e) { d.close(); res(); }
    };
  });
}
async function borrarTodo() {
  const auto = copiaAutoDisponible();
  const r = await ask({title:'Borrar todo de este ' + (AND() ? 'móvil' : 'navegador'), yes:'Borrar todo', danger:true, body:`
    <p>Se borran los registros, informes, planificaciones, EVRL, calendario, revisiones, PSS/DGP, el perfil y los ajustes. <b>No se puede deshacer.</b></p>
    <p class="help">Útil al cambiar de móvil o al dejar la app. Si quieres conservar algo, exporta antes una copia.</p>
    ${auto ? '<label class="ajuste"><span><b>Borrar también las copias automáticas</b><small>Las de Descargas › Visitas PRL › Copias que hizo esta app.</small></span><input type="checkbox" id="sg-bc" role="switch" checked></label>' : ''}
    <div class="field"><label for="sg-bt">Escribe BORRAR para confirmar</label><input id="sg-bt" autocomplete="off" autocapitalize="characters"></div>`});
  if (r !== true) return;
  if (val('sg-bt').toUpperCase() !== 'BORRAR') { toast('No se ha borrado nada: hay que escribir BORRAR.'); return; }
  const conCopias = auto && !!($('#sg-bc') || {}).checked;
  toast('Borrando…');
  if (conCopias && fn('copiasLimpiar')) { try { AND().copiasLimpiar('[]'); } catch (e) {} }
  let nombres = BDS;
  try { if (indexedDB.databases) nombres = [...new Set([...BDS, ...(await indexedDB.databases()).map(d => d.name).filter(Boolean)])]; } catch (e) {}
  for (const n of nombres) await vaciarBD(n);
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  if (fn('pantallaSegura')) { try { AND().pantallaSegura(false); } catch (e) {} }
  location.reload();
}
function antiguos(anos) {
  const d = new Date(); d.setFullYear(d.getFullYear() - anos);
  const lim = isoDate(d);
  return HIST.filter(r => ((r.rp && r.rp.fecha) || isoDate(new Date(r.creado || Date.now()))) < lim);
}
async function borrarAntiguos() {
  const anos = +(val('sg-anos') || 5), l = antiguos(anos);
  if (!l.length) { toast(`No hay registros de hace más de ${anos} años.`); return; }
  const r = await ask({title:'Borrar registros antiguos', yes:'Borrar', danger:true, body:`<p>${plural(l.length, 'registro', 'registros')} de visitas de hace más de ${anos} años. Se borran de este ${AND() ? 'móvil' : 'navegador'}${copiaAutoDisponible() ? ' y de sus copias automáticas' : ''}. <b>No se puede deshacer.</b></p><p class="help">Si tu empresa tiene que conservarlos, exporta antes una copia.</p>`});
  if (r !== true) return;
  for (const x of l) { try { await hdb.del(x.id); } catch (e) {} }
  await loadHist();
  if (fn('copiasLimpiar')) { try { AND().copiasLimpiar(JSON.stringify(HIST.map(nombreCopia))); } catch (e) {} }
  toast(`Borrados ${plural(l.length, 'registro', 'registros')}.`); pinta();
}

/* ---------- copia fuera del dispositivo (OneDrive, SharePoint, correo de la empresa) ---------- */
const FUERA = 'seg-copia-fuera';
const ultimaFuera = () => +(lsGet(FUERA) || 0);
const hayDatos = () => !!(HIST.length || (window.INF_API && INF_API.lista().length) || (window.PLAN_API && PLAN_API.lista().length) || (window.CAL_API && CAL_API.lista().length) || (window.REV_API && REV_API.lista().length) || (window.EVRL_API && EVRL_API.lista().length) || (window.PSS_API && PSS_API.lista().length));
const diasDesde = t => Math.floor((Date.now() - t) / 864e5);
function marcarFuera() { lsSet(FUERA, String(Date.now())); refrescaPerfil(); const v = $('#view-seg'); if (v && !v.hidden) pinta(); }
/* tarea para «Hoy y vencidas» de Inicio cuando toca hacer copia */
function pendiente() {
  if (!hayDatos()) return null;
  const u = ultimaFuera(), dias = cfg().aviso;
  if (u && diasDesde(u) < dias) return null;
  const desde = u || Math.min(...HIST.map(r => r.creado || r.guardado || Date.now()), Date.now());
  if (!u && diasDesde(desde) < 1) return null;
  return {t:'Guardar una copia fuera del ' + (AND() ? 'móvil' : 'ordenador'), d:isoDate(new Date(desde)), k:'bad',
    extra:u ? `La última, hace ${plural(diasDesde(u), 'día', 'días')}` : 'Aún no has guardado ninguna'};
}
async function entregarCopia(blob, nombre, msg) {
  const A = AND();
  if (A) {
    const r = await ask({title:'Copia de seguridad', yes:'Compartir', no:'Guardar en el móvil', body:`<p class="m-file">${esc(nombre)}</p>
      <p>Va cifrada con tu contraseña. Para no perderla si pierdes el móvil, pulsa <b>Compartir</b> y elige <b>OneDrive</b> (o Teams o SharePoint) y una carpeta de la empresa, por ejemplo «Visitas PRL». También puedes enviártela al correo de la empresa.</p>
      <p class="help">«Guardar en el móvil» la deja en Descargas › Visitas PRL, que no te salva si pierdes el móvil.</p>`});
    if (r === null) return;
    try {
      const b = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
      if (r === true) {
        if (msg && typeof A.compartirTexto === 'function') A.compartirTexto(b, nombre, 'application/json', msg); else A.compartir(b, nombre, 'application/json');
        marcarFuera();
      } else if (A.guardar(b, nombre, 'application/json')) toast('Guardada en Descargas › Visitas PRL. Para tenerla fuera del móvil, compártela a OneDrive.');
      else { toast('Este móvil no deja guardar directamente: elige dónde guardarla.'); A.compartir(b, nombre, 'application/json'); marcarFuera(); }
    } catch (e) { toast('No se pudo preparar la copia.'); }
    return;
  }
  const picker = typeof window.showSaveFilePicker === 'function';
  const r = await ask({title:'Copia de seguridad', yes:picker ? 'Guardar en…' : 'Descargar', no:'Cerrar', body:`<p class="m-file">${esc(nombre)}</p>
    <p>Va cifrada con tu contraseña. ${picker ? 'Elige tu carpeta de <b>OneDrive</b> o de <b>SharePoint</b> de la empresa; la próxima vez se abrirá directamente ahí.' : 'Después, muévela a tu carpeta de <b>OneDrive</b> o de <b>SharePoint</b> de la empresa.'}</p>`});
  if (r !== true) return;
  if (picker) {
    try {
      const h = await window.showSaveFilePicker({id:'copias-visitas-prl', suggestedName:nombre, types:[{description:'Copia de Visitas PRL', accept:{'application/json':['.json']}}]});
      const w = await h.createWritable(); await w.write(blob); await w.close();
      marcarFuera(); toast('Copia guardada en ' + (h.name || 'la carpeta elegida') + '.');
    } catch (e) { if (e && e.name !== 'AbortError') { descargar(blob, nombre); marcarFuera(); } }
    return;
  }
  descargar(blob, nombre); marcarFuera();
  toast('Descargada. Muévela a tu carpeta de OneDrive o SharePoint.');
}

/* ---------- contraseña de las copias obligatoria en el móvil ---------- */
const PRUEBA = /[?&]test\b/.test(location.search) && !/[?&]segclave\b/.test(location.search);
let exige = false;
function exigirClave() {
  if (CLAVE || !AND() || PRUEBA || bloq || !SUB()) return;
  exige = true;
  document.documentElement.classList.add('seg-lk');
  let el = document.getElementById('seg-lock');
  if (!el) { el = document.createElement('div'); el.id = 'seg-lock'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'sl-t'); document.body.appendChild(el); }
  el.innerHTML = `<div class="sl-in sl-clave">
    <span class="sl-ic">${IC.llave}</span>
    <h2 id="sl-t">Protege tus copias</h2>
    <p>La app guarda copias de tus registros en Descargas y te deja exportarlas. Van cifradas con una contraseña que eliges ahora: sin ella nadie puede abrirlas.</p>
    <div class="sl-campos">
      <label for="sl-c1">Contraseña</label><input id="sl-c1" type="password" autocomplete="new-password">
      <label for="sl-c2">Repítela</label><input id="sl-c2" type="password" autocomplete="new-password">
    </div>
    <p class="sl-nota">Mínimo 8 caracteres, mejor con letras, números y algún símbolo. <b>Apúntala en un sitio seguro: no se puede recuperar.</b></p>
    <p class="sl-err" id="sl-err" role="alert"></p>
    <button type="button" class="btn primary" data-sl="clave">Guardar la contraseña</button>
  </div>`;
  el.onclick = e => { if (e.target.closest('[data-sl="clave"]')) guardarObligatoria(); };
  el.onkeydown = e => { if (e.key === 'Enter' && /^sl-c[12]$/.test(e.target.id)) { e.preventDefault(); if (e.target.id === 'sl-c1') $('#sl-c2').focus(); else guardarObligatoria(); } };
  setTimeout(() => { const i = $('#sl-c1'); if (i) i.focus(); }, 60);
}
async function guardarObligatoria() {
  const a = $('#sl-c1').value, b = $('#sl-c2').value, e = $('#sl-err'), btn = document.querySelector('[data-sl="clave"]');
  const err = t => { e.textContent = t; };
  if (a.length < 8) return err('La contraseña tiene que tener al menos 8 caracteres.');
  if (a !== b) return err('Las dos contraseñas no coinciden.');
  if (FUERZA(a) < 2) return err('Es muy fácil: alárgala o mezcla letras, números y símbolos.');
  err(''); btn.disabled = true; btn.textContent = 'Preparando el cifrado…';
  try { await nuevaClave(a); }
  catch (x) { btn.disabled = false; btn.textContent = 'Guardar la contraseña'; return err('No se pudo guardar. Inténtalo otra vez.'); }
  exige = false;
  document.documentElement.classList.remove('seg-lk');
  const el = document.getElementById('seg-lock'); if (el) el.remove();
  toast('Contraseña guardada: tus copias van cifradas.');
  renderCopiaEstado(); refrescaPerfil();
}

/* ---------- texto de protección de datos para los PDF ---------- */
const clausula = () => (lsGet('seg-clausula') || '').trim().slice(0, 1500);

/* ---------- pantalla ---------- */
let hecho = null;
function estado() {
  const m = modo(), c = cfg(), auto = copiaAutoDisponible();
  const sellados = HIST.filter(r => r.integ && r.integ.h).length;
  const L = [];
  L.push(m === 'movil' ? (c.lock ? ['ok', IC.candado, 'Bloqueo de la app', `Con la huella, la cara o el PIN del móvil. Al abrirla y tras ${c.min} min fuera.`] : ['warn', IC.candado, 'Bloqueo de la app', 'Desactivado.'])
    : m === 'sinpantalla' ? ['bad', IC.candado, 'Bloqueo de la app', 'Este móvil no tiene bloqueo de pantalla. Ponle un PIN o la huella en los ajustes del móvil y la app lo usará.']
    : m === 'pin' ? (c.lock ? ['ok', IC.candado, 'Bloqueo de la app', `Con PIN. Al abrirla y tras ${c.min} min sin usarla.`] : ['warn', IC.candado, 'Bloqueo de la app', 'Desactivado.'])
    : m === 'no' ? ['warn', IC.candado, 'Bloqueo de la app', 'Esta versión del APK no lo permite: instala la última.']
    : ['warn', IC.candado, 'Bloqueo de la app', 'Sin PIN. Crea uno abajo para que nadie más pueda abrirla en este ordenador.']);
  L.push(CLAVE ? ['ok', IC.llave, 'Copias de seguridad', `Cifradas con AES-256 y tu contraseña${auto ? ', también las automáticas' : ''}.`]
    : ['warn', IC.llave, 'Copias de seguridad', `Sin contraseña: ${auto ? 'las copias automáticas de Descargas no van cifradas' : 'la primera vez que exportes te pedirá una'}.`]);
  { const u = ultimaFuera(), d = cfg().aviso;
    L.push(!hayDatos() && !u ? ['info', IC.doc, 'Copia fuera del ' + (AND() ? 'móvil' : 'ordenador'), 'Cuando tengas registros, te recordará guardar una copia en OneDrive o SharePoint.']
      : u && diasDesde(u) < d ? ['ok', IC.doc, 'Copia fuera del ' + (AND() ? 'móvil' : 'ordenador'), `La última, ${diasDesde(u) ? 'hace ' + plural(diasDesde(u), 'día', 'días') : 'hoy'}. Te avisa cada ${d} días.`]
      : ['warn', IC.doc, 'Copia fuera del ' + (AND() ? 'móvil' : 'ordenador'), u ? `La última fue hace ${plural(diasDesde(u), 'día', 'días')}. Haz una ahora y guárdala en OneDrive o SharePoint.` : 'Aún no has guardado ninguna. Haz una y guárdala en OneDrive o SharePoint.']); }
  L.push(['ok', IC.escudo, 'Registros', HIST.length ? `${sellados} de ${HIST.length} con código de verificación. Cada cambio queda como una versión nueva.` : 'Cada registro que guardes llevará su código de verificación.']);
  L.push(['ok', IC.red, 'Conexiones', 'Ninguna. La app no tiene servidor, no carga nada de internet y no puede enviar datos a ningún sitio.']);
  if (AND()) L.push(c.captura ? ['ok', IC.ojo, 'Capturas de pantalla', 'Bloqueadas, y la app no se ve en las apps recientes.'] : ['info', IC.ojo, 'Capturas de pantalla', 'Permitidas.']);
  return L;
}
function perfilHtml() {
  const L = estado(), malos = L.filter(x => x[0] === 'bad').length, avisos = L.filter(x => x[0] === 'warn').length;
  return `<section class="block sg-pf">
    <header class="bh"><h2>Privacidad y seguridad</h2><span class="pill ${malos ? 'bad' : avisos ? '' : 'ok'}">${malos || avisos ? plural(malos + avisos, 'aviso', 'avisos') : 'Todo bien'}</span></header>
    <div class="bb">
      <p class="help">Tus datos se guardan solo en este ${AND() ? 'móvil' : 'dispositivo'}. Bloqueo de la app, copias cifradas, código de verificación de los registros y borrado de datos.</p>
      <button type="button" class="btn" data-seg="abrir">${IC.escudo}Abrir Privacidad y seguridad</button>
    </div>
  </section>`;
}
function vista() {
  let v = $('#view-seg');
  if (!v) {
    v = document.createElement('main'); v.id = 'view-seg'; v.setAttribute('role', 'tabpanel'); v.hidden = true;
    const hist = $('#view-hist'); hist.parentNode.insertBefore(v, hist);
    v.addEventListener('click', onClick);
    v.addEventListener('change', onChange);
    v.addEventListener('keydown', e => { if (e.target.id === 'sg-cod' && e.key === 'Enter') { e.preventDefault(); onClick({target:$('[data-seg="cod"]')}); } });
  }
  return v;
}
function pinta() {
  const v = $('#view-seg'); if (!v || v.hidden) { refrescaPerfil(); return; }
  const c = cfg(), m = modo(), auto = copiaAutoDisponible(), old = antiguos(5).length;
  const est = estado().map(([k, ic, t, d]) => `<li class="sg-e ${k}"><span class="sg-ic">${ic}</span><span><b>${t}</b><small>${esc(d)}</small></span></li>`).join('');
  v.innerHTML = `
  <div class="ihead"><button type="button" class="linkbtn" data-seg="volver">‹ Mi perfil</button></div>
  <section class="pl-hero sg-hero">
    <p class="pl-eb">Mi perfil</p>
    <h2>Privacidad y seguridad</h2>
    <p class="pl-ctr">Todo se guarda solo en este ${AND() ? 'móvil' : 'dispositivo'}: sin servidores, sin cuentas y sin enviar datos a ningún sitio. Solo sale lo que tú compartes.</p>
  </section>
  <section class="block"><header class="bh"><h2>Estado</h2></header><div class="bb"><ul class="sg-est">${est}</ul></div></section>

  <section class="block"><header class="bh"><h2>Bloqueo de la app</h2></header><div class="bb">
    ${m === 'movil' || m === 'sinpantalla' ? `<p class="help">Usa el mismo bloqueo del móvil: huella, cara, PIN o patrón. La app no guarda ninguna clave.</p>` : m === 'no' ? '' : `<p class="help">En el ordenador la app pide un PIN propio. La protección de fondo es la de tu sesión de Windows: bloquéala (tecla Windows + L) al levantarte.</p>`}
    <div class="ajustes">
      <label class="ajuste"><span><b>Bloquear la app</b><small>Al abrirla y cuando vuelvas tras el tiempo de abajo.</small></span><input type="checkbox" id="sg-lock" role="switch" ${c.lock && (m === 'movil' || m === 'pin') ? 'checked' : ''} ${m === 'movil' || m === 'pin' ? '' : 'disabled'}></label>
      <label class="ajuste sg-sel"><span><b>Tiempo</b><small>${AND() ? 'Fuera de la app' : 'Sin usarla'} durante:</small></span><select id="sg-min">${[1, 5, 15, 30].map(x => `<option value="${x}" ${x === c.min ? 'selected' : ''}>${x} min</option>`).join('')}</select></label>
      ${AND() && fn('pantallaSegura') ? `<label class="ajuste"><span><b>Impedir capturas de pantalla</b><small>Tampoco se verá el contenido en las apps recientes.</small></span><input type="checkbox" id="sg-cap" role="switch" ${c.captura ? 'checked' : ''}></label>` : ''}
    </div>
    ${!AND() ? `<div class="hbtns"><button type="button" class="mini" data-seg="pin">${pinDe() ? 'Cambiar el PIN' : 'Crear el PIN'}</button>${pinDe() ? '<button type="button" class="mini del" data-seg="sinpin">Quitar el PIN</button>' : ''}${pinDe() && c.lock ? '<button type="button" class="mini" data-seg="ya">Bloquear ahora</button>' : ''}</div>` : m === 'movil' && c.lock ? '<div class="hbtns"><button type="button" class="mini" data-seg="ya">Bloquear ahora</button></div>' : ''}
  </div></section>

  <section class="block"><header class="bh"><h2>Copias de seguridad cifradas</h2><span class="pill ${CLAVE ? 'ok' : ''}">${CLAVE ? 'Activado' : 'Sin contraseña'}</span></header><div class="bb">
    <p class="help">«Exportar copia»${auto ? ' y las copias automáticas de Descargas › Visitas PRL › Copias' : ''} se cifran con AES-256 y tu contraseña. Aunque alguien consiga el archivo (por WhatsApp, un pendrive o el móvil perdido), sin la contraseña no puede leerlo. Al importar te la pide.</p>
    ${CLAVE ? `<p class="help">Contraseña creada el ${fFecha(CLAVE.creado)}.</p>` : ''}
    <div class="hbtns"><button type="button" class="mini" data-seg="clave">${CLAVE ? 'Cambiar la contraseña' : 'Crear la contraseña'}</button>${CLAVE && auto ? '<button type="button" class="mini" data-seg="recopiar">Volver a cifrar las copias de Descargas</button>' : ''}</div>
  </div></section>

  <section class="block"><header class="bh"><h2>Copia fuera del ${AND() ? 'móvil' : 'ordenador'}</h2></header><div class="bb">
    <p class="help">Si pierdes ${AND() ? 'el móvil' : 'el ordenador'}, solo conservas lo que hayas guardado fuera. Haz una copia de vez en cuando y guárdala en <b>OneDrive</b> o <b>SharePoint</b> de la empresa (o mándatela al correo de la empresa). La app te lo recuerda en Inicio.</p>
    <p class="help">${ultimaFuera() ? `Última copia fuera: ${fFecha(ultimaFuera())}.` : 'Aún no has guardado ninguna copia fuera.'}</p>
    <div class="ajustes"><label class="ajuste sg-sel"><span><b>Recordármelo</b><small>Si no he guardado una copia fuera en:</small></span><select id="sg-aviso">${[3, 7, 15, 30].map(x => `<option value="${x}" ${x === c.aviso ? 'selected' : ''}>${x} días</option>`).join('')}</select></label></div>
    <div class="hbtns"><button type="button" class="mini" data-seg="copia">Hacer una copia ahora</button></div>
  </div></section>

  <section class="block"><header class="bh"><h2>Comprobar un registro</h2></header><div class="bb">
    <p class="help">Cada registro guardado lleva un código de verificación (sale al pie del PDF y en el Historial). Si alguien cambia el registro, el código cambia y la versión anterior queda apuntada. Escribe el código de un PDF para saber si coincide con lo guardado.</p>
    <div class="sg-codq"><label for="sg-cod" class="vh">Código de verificación</label><input id="sg-cod" placeholder="3F9A-11C2-7B0E" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="button" class="btn primary" data-seg="cod">Comprobar</button></div>
    <div id="sg-codr" class="sg-res" hidden></div>
    <div class="hbtns"><button type="button" class="mini" data-seg="todos">Comprobar todos los registros</button></div>
    <div id="sg-todr" class="sg-res" hidden></div>
  </div></section>

  <section class="block"><header class="bh"><h2>Protección de datos en los PDF</h2></header><div class="bb">
    <p class="help">Texto informativo que sale al final del PDF de cada registro, para los trabajadores que firman. Lo facilita el Delegado de Protección de Datos de tu empresa: pégalo aquí tal cual.</p>
    <div class="field"><label for="sg-cl">Texto informativo</label><textarea id="sg-cl" rows="5" maxlength="1500" placeholder="Ej.: Responsable: … Finalidad: gestión de la prevención de riesgos laborales en obra… Derechos: …">${esc(clausula())}</textarea></div>
    <div class="hbtns"><button type="button" class="mini" data-seg="cl">Guardar el texto</button></div>
  </div></section>

  <section class="block"><header class="bh"><h2>Qué guarda la app</h2></header><div class="bb">
    <ul class="sg-datos">
      <li><b>Visitas</b>: obra, fecha, respuestas, deficiencias, fotos, nombres y firmas de los trabajadores y empresas.</li>
      <li><b>Documentos</b>: informes de seguimiento, planificación preventiva, EVRL, calendario y revisiones con sus certificados.</li>
      <li><b>PSS/DGP</b>: los PDF que añades y su índice.</li>
      <li><b>Tu perfil</b>: nombre, cargo, teléfono, correo y contratos.</li>
    </ul>
    <p class="help">${AND() ? 'Todo queda dentro de la app, en la zona privada del móvil que Android cifra y protege con el bloqueo de pantalla y que ninguna otra app puede leer. Android no la incluye en sus copias de seguridad en la nube.' : 'Todo queda dentro de este navegador, en tu usuario de Windows. No hay copia en ningún servidor.'} Solo sale cuando tú compartes un PDF, un Word, un Excel o una copia.</p>
    <p class="help">${AND() ? 'Permisos del móvil: ninguno peligroso. No pide ubicación, contactos, micrófono ni acceso a tus fotos: la cámara y la galería se abren solo cuando tú pulsas para añadir una foto, y únicamente se queda la que eliges.' : 'En el ordenador no instala nada ni pide permisos.'}</p>
  </div></section>

  <section class="block"><header class="bh"><h2>Borrar datos</h2></header><div class="bb">
    <div class="sg-ant"><label for="sg-anos">Registros de visitas de más de</label><select id="sg-anos">${[3, 4, 5, 6, 8, 10].map(x => `<option value="${x}" ${x === 5 ? 'selected' : ''}>${x} años</option>`).join('')}</select><span id="sg-antn" class="pill">${old}</span></div>
    <div class="hbtns"><button type="button" class="mini del" data-seg="antiguos">Borrar esos registros</button></div>
    <hr class="sg-hr">
    <p class="help">Al cambiar de móvil o dejar la app: borra todo lo que hay en este ${AND() ? 'móvil' : 'navegador'}.</p>
    <div class="hbtns"><button type="button" class="mini del" data-seg="todo">${IC.papelera}Borrar todo de este ${AND() ? 'móvil' : 'navegador'}</button></div>
  </div></section>

  <section class="block sg-tec"><header class="bh"><h2>Información técnica</h2></header><div class="bb">
    <dl>
      <dt>Versión</dt><dd>${esc(APP_VER)}</dd>
      <dt>Funcionamiento</dt><dd>${AND() ? 'App de Android con la web dentro (WebView). Se sirve desde el propio APK, sin servidor.' : 'Web de un solo archivo; funciona sin conexión una vez abierta.'}</dd>
      <dt>Política de contenido</dt><dd>Solo se ejecuta el código de la propia app (cada script autorizado por su huella SHA-256). Conexiones a fuera, marcos y formularios bloqueados.${AND() ? ' Además, el APK bloquea cualquier petición a otro servidor.' : ''}</dd>
      <dt>Cifrado de copias</dt><dd>AES-256-GCM. Clave sacada de la contraseña con PBKDF2-SHA256 (600 000 vueltas) y sal aleatoria; se guarda en este dispositivo sin poder leerse.</dd>
      <dt>Código de verificación</dt><dd>SHA-256 del contenido completo del registro (fotos y firmas incluidas); se muestran los 12 primeros caracteres.</dd>
      <dt>Bloqueo</dt><dd>${AND() ? 'BiometricPrompt / KeyguardManager de Android: el desbloqueo lo hace el sistema.' : 'PIN guardado como huella PBKDF2-SHA256 (200 000 vueltas). Tras 5 fallos, espera creciente.'}</dd>
      <dt>Librerías</dt><dd>pdf-lib 1.17.1 (MIT), JSZip 3.10.1 (MIT), pdf.js 6.2.108 de Mozilla (Apache 2.0). Letras Montserrat, Source Sans 3 e IBM Plex Mono (SIL OFL), dentro de la app.</dd>
    </dl>
  </div></section>`;
  if (hecho) { const x = $('#' + hecho.id); if (x) { x.hidden = false; x.className = 'sg-res ' + hecho.cls; x.innerHTML = hecho.msg; } hecho = null; }
}
function refrescaPerfil() { const b = document.querySelector('.sg-pf'); if (b) b.outerHTML = perfilHtml(); }
function ver() { vista(); showTab('seg'); pinta(); }
function volver() { const pf = document.querySelector('.bottomnav [data-grp="pf"]'); if (pf) pf.click(); else showTab('ini'); }
async function onClick(e) {
  const b = e.target && e.target.closest ? e.target.closest('[data-seg]') : null; if (!b) return;
  const a = b.dataset.seg;
  if (a === 'abrir') return ver();
  if (a === 'volver') return volver();
  if (a === 'clave') return crearClave();
  if (a === 'pin') return crearPin();
  if (a === 'sinpin') return quitarPin();
  if (a === 'ya') return bloquear();
  if (a === 'recopiar') { const n = await recopiar(); toast(n ? `${plural(n, 'copia cifrada', 'copias cifradas')} de nuevo en Descargas.` : 'No hay registros que copiar.'); return; }
  if (a === 'cod') { const r = await comprobarCodigo(val('sg-cod')); const x = $('#sg-codr'); x.hidden = false; x.className = 'sg-res ' + r.cls; x.innerHTML = r.msg; return; }
  if (a === 'todos') {
    const malos = await comprobarTodos(), x = $('#sg-todr'); x.hidden = false;
    x.className = 'sg-res ' + (malos.length ? 'bad' : 'ok');
    const n = HIST.filter(r => r.integ).length;
    x.innerHTML = malos.length ? `<b>${plural(malos.length, 'registro no coincide', 'registros no coinciden')}</b> con su código: ${malos.slice(0, 6).map(r => esc(r.codigo || r.rp?.ubicacion || r.id)).join(', ')}${malos.length > 6 ? '…' : ''}. ${malos.length === 1 ? 'Se ha modificado' : 'Se han modificado'} por fuera de la app.`
      : !n ? 'Aún no hay registros guardados.' : `<b>Todo correcto.</b> ${n === 1 ? 'El registro coincide' : `Los ${n} registros coinciden`} con su código de verificación.`;
    return;
  }
  if (a === 'copia') return exportBackup();
  if (a === 'cl') { lsSet('seg-clausula', ($('#sg-cl').value || '').trim().slice(0, 1500)); toast(clausula() ? 'Guardado: saldrá al final del PDF de cada registro.' : 'Texto quitado de los PDF.'); return; }
  if (a === 'antiguos') return borrarAntiguos();
  if (a === 'todo') return borrarTodo();
}
function onChange(e) {
  const t = e.target;
  if (t.id === 'sg-lock') { setCfg({lock:t.checked}); toast(t.checked ? 'Bloqueo activado.' : 'Bloqueo desactivado.'); pinta(); }
  else if (t.id === 'sg-min') { setCfg({min:+t.value}); pinta(); }
  else if (t.id === 'sg-aviso') { setCfg({aviso:+t.value}); pinta(); }
  else if (t.id === 'sg-cap') { setCfg({captura:t.checked}); try { AND().pantallaSegura(t.checked); } catch (x) {} pinta(); }
  else if (t.id === 'sg-anos') { const n = $('#sg-antn'); if (n) n.textContent = antiguos(+t.value).length; }
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-seg="abrir"]'); if (b && !b.closest('#view-seg')) ver(); });

window.SEG_API = {
  listo,
  /* copias */
  async prepararCopia(data) {
    await listo;
    if (!SUB()) return data;
    if (!CLAVE) {
      const ok = await ask({title:'Protege la copia con contraseña', yes:'Crear contraseña', body:'<p>Las copias de seguridad van cifradas: aunque alguien consiga el archivo, no puede abrirlo sin tu contraseña.</p><p class="help">Solo se pide una vez. Al importar la copia en otro móvil u ordenador te la pedirá.</p>'});
      if (ok !== true || !(await crearClave())) return null;
    }
    return cifrarCon(CLAVE, data);
  },
  async cifrarAuto(t) { await listo; return CLAVE && SUB() ? cifrarCon(CLAVE, t) : t; },
  descifrarCopia,
  cifradas:() => !!CLAVE,
  notaCopias(el) {
    if (!el || el.hidden || el.classList.contains('bad')) return;
    const t = el.textContent.replace(/\.\s*$/, '');
    if (CLAVE) el.textContent = t + ' · cifradas con tu contraseña.';
    else { el.classList.remove('ok'); el.classList.add('warn'); el.textContent = t + ' · sin cifrar: crea la contraseña en Perfil › Privacidad y seguridad.'; }
  },
  /* registros */
  sellar, sellarImport, histLinea, codigoPdf, codigo, clausula,
  /* bloqueo (lo llama la app de Android) */
  resultado, vuelve,
  bloqueada:() => bloq || exige,
  pendiente, entregarCopia,
  hacerCopia:() => exportBackup(),
  /* sincronización con OneDrive: se cifra con la clave de las copias; si el otro dispositivo usa otra,
     se pide su contraseña una vez y este dispositivo se queda con ella (así los dos usan la misma) */
  async cifrarSync(texto) { await listo; if (!SUB()) return null; if (!CLAVE && !(await crearClave())) return null; return cifrarCon(CLAVE, texto); },
  async abrirSync(j, nombre, preguntar) {
    const c = (j && j.cifrado) || {};
    if (c.alg !== 'AES-256-GCM' || !j.datos || !SUB()) { const e = new Error('formato'); e.seg = true; throw e; }
    await listo;
    if (CLAVE && CLAVE.sal === c.sal) { const t = await abrirCon(CLAVE.key, j); if (t != null) return JSON.parse(t); }
    if (!preguntar) return null;
    for (let i = 0; i < 3; i++) {
      const r = await ask({title:'Contraseña del otro dispositivo', yes:'Usar', no:'Ahora no', body:`<p class="m-file">${esc(nombre || 'Archivo de OneDrive')}</p>
        <p>${i ? '<b>Contraseña incorrecta.</b> ' : ''}Este archivo está cifrado con la contraseña de las copias del otro dispositivo. Escríbela: desde ahora este dispositivo usará la misma.</p>
        <div class="field"><label for="sg-sy">Contraseña de las copias</label><input id="sg-sy" type="password" autocomplete="current-password"></div>`});
      if (r !== true) return null;
      const pass = $('#sg-sy').value; if (!pass) continue;
      const key = await claveDe(pass, unb64(c.sal), c.it || ITER);
      const t = await abrirCon(key, j);
      if (t != null) {
        await nuevaClave(null, c.sal, key, c.it || ITER);
        toast('Listo: los dos dispositivos usan la misma contraseña de copias.');
        try { pinta(); } catch (e) {}
        return JSON.parse(t);
      }
    }
    return null;
  },
  bloquear,
  /* pantalla */
  ver, perfilHtml,
  onTab(t) { if (t === 'seg') pinta(); },
  atras() { const v = $('#view-seg'); if (v && !v.hidden) { volver(); return true; } return false; }
};

/* arranque */
vista();
if (AND() && fn('pantallaSegura') && cfg().captura) { try { AND().pantallaSegura(true); } catch (e) {} }
if (activo()) bloquear(); else document.documentElement.classList.remove('seg-lk');
listo.then(exigirClave);
listo.then(async () => {
  if (typeof initHist === 'function' && histState === 'wait') { try { await initHist(); } catch (e) {} }
  const n = await sellarPendientes();
  if (n) await loadHist();
  renderCopiaEstado(); refrescaPerfil();
});
})();
