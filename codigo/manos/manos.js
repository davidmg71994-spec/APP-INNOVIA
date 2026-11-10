/* ================= Visita manos libres (1.22.0) =================
   La app lee en voz alta cada pregunta Sí/No/N.A. de la visita y apunta lo que se contesta hablando:
   «sí», «no, falta valla en el lado derecho», «no aplica», «repite», «atrás», «siguiente», «pausa», «salir».
   Es una opción: los botones y el teclado siguen igual, y lo dicho se ve y se corrige en el formulario.
   Móvil: voz del propio Android (AndroidApp.voz*: TextToSpeech y SpeechRecognizer).
   Ordenador: Web Speech API del navegador (Chrome/Edge; el reconocimiento de Chrome usa internet). */
(() => {
const NAT = () => !!(window.AndroidApp && typeof AndroidApp.vozEscuchar === 'function');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const puede = () => NAT() || (!!SR && 'speechSynthesis' in window);
const ML = {on:false, pausa:true, gen:0, cur:null, fase:'pregunta', oido:'', estado:'', msg:'', ultPaso:-1, prefijo:'', vistas:new Set(), fuera:false, fotoDe:null, intro:true};
const MIC = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/* ---------- qué se pregunta: las preguntas Sí/No/N.A. que aplican, en el orden de la pantalla ---------- */
function oculto(el) {
  const raiz = stepEls().flat().find(r => r && r.contains(el));
  for (let n = el; n && n !== raiz; n = n.parentElement) if (n.hidden) return true;
  return false;
}
function entradas() {
  const out = [];
  for (const el of $$('#view-form .item[data-item], #view-form .chip[data-esp]')) {
    if (oculto(el)) continue;
    if (el.dataset.esp) {
      const sc = SECS.find(s => s.key === el.dataset.esp); if (!sc) continue;
      out.push({k:'esp:' + sc.key, esp:sc.key, q:sc.ask || sc.t, el, paso:stepOf(el)});
      continue;
    }
    const it = ITEM[el.dataset.item]; if (!it) continue;
    out.push({k:it.id, id:it.id, it, q:it.q, el, paso:stepOf(el)});
  }
  return out;
}
const respondida = e => e.esp ? (S.rp[e.esp] === 'si' || ML.vistas.has(e.k)) : !!(S.resp[e.id] || {}).v;
const faltaFoto = id => { const r = S.resp[id] || {}; return !!r.v && isBad(ITEM[id], r.v) && !r.mejora && !(r.fotos || []).length; };

/* ---------- entender lo que se dice ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:"«»()]/g, ' ').replace(/\s+/g, ' ').trim();
const CMDS = [
  ['repetir', /^(repite(la|lo|me)?|repetir|otra vez|como dices|como|que|perdon|no te he oido)$/],
  ['atras', /^(atras|anterior|la anterior|pregunta anterior|vuelve|volver|vuelve atras)$/],
  ['saltar', /^(siguiente|la siguiente|siguiente pregunta|salta(la)?|saltar|pasa|pasar|paso|omitir|despues|luego|sigue|seguir|continua|continuar)$/],
  ['pausa', /^(pausa|para|parar|espera|un momento|stop|alto)$/],
  ['salir', /^(salir|sal|terminar|termina|terminado|fin|acabar|acaba|cerrar|cierra)$/],
  ['foto', /^(foto|haz (una )?foto|hacer (una )?foto|una foto|camara)$/],
  ['ayuda', /^(ayuda|que (puedo )?digo|opciones|que puedo decir)$/],
  ['nada', /^(nada|ninguna|ninguno|sin observacion(es)?|no hay nada|nada mas|vacio)$/]
];
/* tras «no», estas palabras ya son la deficiencia: «no hay vallado» se apunta entero */
const NO_VERBO = /^no (hay|tiene|tienen|lleva|llevan|esta|estan|se|existe|existen|usa|usan|utiliza|utilizan|dispone|disponen|cumple|cumplen|hace|hacen|llevaba|habia|tenia)\b/;
const RESP = [
  ['NA', /^(no aplica|no se aplica|no procede|no corresponde|n a|ene a|na)\b/],
  ['SI', /^(si|sip|correcto|correcta|bien|ok|okay|vale|afirmativo|cumple|cumplen|perfecto|todo bien|todo correcto|esta bien|estan bien|claro)\b/],
  ['NO', /^(no|negativo|incumple|mal|tampoco)\b/],
  ['NO', /^(falta|faltan|hay que|sin)\b/]
];
const mayus = s => { const w = String(s || '').trim().replace(/^[\s,.;:-]+/, ''); return w ? w[0].toUpperCase() + w.slice(1) : ''; };
function quita(orig, n) { return mayus(String(orig).trim().split(/\s+/).slice(n).join(' ')); }
function interpretaUno(a) {
  const t = norm(a);
  if (!t) return {tipo:'nada'};
  for (const [c, rx] of CMDS) if (rx.test(t)) return {tipo:'cmd', c};
  for (const [v, rx] of RESP) {
    const m = rx.exec(t); if (!m) continue;
    let resto;
    if (v === 'NO' && /^(falta|faltan|hay que|sin)$/.test(m[1])) resto = mayus(a);   // «falta valla» → «Falta valla»
    else if (v === 'NO' && NO_VERBO.test(t)) resto = mayus(a);                      // «no hay vallado» → «No hay vallado»
    else resto = quita(a, m[1].split(' ').length);                                  // «no, falta valla» → «Falta valla»
    return {tipo:'resp', v, resto};
  }
  return {tipo:'texto', txt:mayus(a)};
}
function interpretar(alts) {
  const l = (alts || []).filter(Boolean);
  for (const a of l) { const r = interpretaUno(a); if (r.tipo === 'cmd' || r.tipo === 'resp') return r; }
  return l.length ? {tipo:'texto', txt:mayus(l[0])} : {tipo:'nada'};
}

/* ---------- voz: hablar y escuchar ---------- */
let pend = {h:null, o:null}, uid = 0, rec = null, wake = null;
function vozEs() {
  try { const vs = speechSynthesis.getVoices(); return vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; } catch (e) { return null; }
}
function decir(t) {
  return new Promise(res => {
    const id = 'ml' + (++uid);
    const fin = ok => { if (pend.h && pend.h.id === id) { pend.h = null; res(ok); } };
    pend.h = {id, res};
    estado('habla');
    if (NAT()) { try { AndroidApp.vozHablar(t, id); } catch (e) { fin(false); } }
    else {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; u.rate = 1.05;
        const v = vozEs(); if (v) u.voice = v;
        u.onend = () => fin(true); u.onerror = () => fin(false);
        speechSynthesis.speak(u);
      } catch (e) { fin(false); }
    }
    setTimeout(() => fin(false), 5000 + t.length * 110);
  });
}
function oir() {
  return new Promise(res => {
    const id = ++uid;
    const fin = r => { if (pend.o && pend.o.id === id) { pend.o = null; res(r); } };
    pend.o = {id, res};
    estado('prepara');
    if (NAT()) { try { AndroidApp.vozEscuchar(); } catch (e) { fin({ok:false, error:'error'}); } }
    else {
      try {
        const r = new SR(); rec = r; let hay = false;
        r.lang = 'es-ES'; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
        r.onstart = () => estado('oye');
        r.onresult = ev => { hay = true; const a = ev.results && ev.results[0] ? [...ev.results[0]].map(x => x.transcript) : []; fin(a.length ? {ok:true, alts:a} : {ok:false, error:'nada'}); };
        r.onerror = ev => fin({ok:false, error:/not-allowed|service-not-allowed/.test(ev.error) ? 'permiso' : ev.error === 'no-speech' ? 'nada' : ev.error === 'network' ? 'red' : ev.error === 'aborted' ? 'cancelado' : (ev.error || 'error')});
        r.onend = () => { if (!hay) fin({ok:false, error:'nada'}); };
        r.start();
      } catch (e) { fin({ok:false, error:'error'}); }
    }
    setTimeout(() => fin({ok:false, error:'nada'}), 16000);
  });
}
function parar() {
  if (NAT()) { try { AndroidApp.vozParar(); } catch (e) {} }
  else { try { speechSynthesis.cancel(); } catch (e) {} try { if (rec) rec.abort(); } catch (e) {} }
  rec = null;
  if (pend.h) { const p = pend.h; pend.h = null; p.res(false); }
  if (pend.o) { const p = pend.o; pend.o = null; p.res({ok:false, error:'cancelado'}); }
}
function pantallaEncendida(on) {
  if (NAT()) { try { AndroidApp.vozPantalla(!!on); } catch (e) {} return; }
  try {
    if (on && navigator.wakeLock && !wake) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {});
    if (!on && wake) { wake.release(); wake = null; }
  } catch (e) {}
}

/* ---------- aplicar al formulario (lo mismo que tocar los botones) ---------- */
function responder(e, v) {
  if (e.esp) {
    const quiero = v === 'SI', b = $(`#view-form .chip[data-esp="${e.esp}"]`);
    if (b && (S.rp[e.esp] === 'si') !== quiero) b.click();
    ML.vistas.add(e.k); return;
  }
  const b = e.el.querySelector(`[data-ans="${v}"]`);
  if (b && (S.resp[e.id] || {}).v !== v) b.click();
}
function anotar(id, txt, sumar) {
  if (!txt) return;
  const r = (S.resp[id] ||= {});
  r.obs = sumar && r.obs ? r.obs.replace(/[\s.]*$/, '') + '. ' + txt : txt;
  applyItem(id); changed();
}

/* ---------- pantalla ---------- */
function crear() {
  if ($('#ml')) return;
  document.body.insertAdjacentHTML('beforeend', `
<div class="ml" id="ml" role="dialog" aria-modal="true" aria-labelledby="ml-t" hidden>
  <div class="ml-in">
    <header class="ml-h">
      <div><h2 id="ml-t">${MIC}Visita manos libres</h2><span id="ml-n"></span></div>
      <button type="button" class="ml-x" data-ml="salir">Salir</button>
    </header>
    <div class="ml-intro" id="ml-intro">
      <p><b>Te leo cada pregunta y contestas hablando.</b> Lo que digas se apunta en la visita y lo puedes corregir luego con los botones.</p>
      <ul>
        <li><b>«Sí»</b>, <b>«no aplica»</b></li>
        <li><b>«No, falta valla en el lado derecho»</b>: apunta la deficiencia tal cual</li>
        <li><b>«Repite»</b>, <b>«atrás»</b>, <b>«siguiente»</b>, <b>«pausa»</b>, <b>«salir»</b></li>
      </ul>
      <p class="ml-nota" id="ml-nota"></p>
    </div>
    <div class="ml-q" id="ml-q" aria-live="polite"></div>
    <div class="ml-r" id="ml-r"></div>
    <div class="ml-e" id="ml-e" aria-live="polite"><span class="ml-dot" aria-hidden="true"></span><span id="ml-et"></span></div>
    <div class="ml-oi" id="ml-oi"></div>
    <div class="ml-ans" role="group" aria-label="Contestar con los botones">
      <button type="button" data-ml="SI">Sí</button><button type="button" data-ml="NO">No</button><button type="button" data-ml="NA">N.A.</button>
    </div>
    <button type="button" class="ml-foto" id="ml-foto" data-ml="foto" hidden>${ICON.cam}<span>Foto de la deficiencia</span></button>
    <div class="ml-nav">
      <button type="button" data-ml="atras">‹ Atrás</button>
      <button type="button" data-ml="repetir">Repetir</button>
      <button type="button" data-ml="saltar">Saltar ›</button>
    </div>
    <button type="button" class="ml-go" id="ml-go" data-ml="go">Empezar</button>
  </div>
</div>`);
  $('#ml').addEventListener('click', e => { const b = e.target.closest('[data-ml]'); if (b) tocar(b.dataset.ml); });
}
const ESTADOS = {habla:'Leyendo la pregunta…', prepara:'Un momento…', oye:'Escuchando: habla ahora', piensa:'Apuntando…', pausa:'En pausa'};
function estado(s) { ML.estado = s; pinta(); }
function pinta() {
  const m = $('#ml'); if (!m || m.hidden) return;
  const lista = entradas(), i = lista.findIndex(x => x.k === ML.cur), e = lista[i];
  $('#ml-intro').hidden = !ML.intro;
  $('#ml-nota').textContent = ML.msg || '';
  $('#ml-n').textContent = e ? `Pregunta ${i + 1} de ${lista.length}${STEPS[e.paso] ? ' · ' + STEPS[e.paso].l : ''}` : '';
  $('#ml-q').textContent = e && !ML.intro ? (ML.fase === 'deficiencia' ? '¿Qué deficiencia anoto?' : e.q) : '';
  let r = '';
  if (e && !ML.intro) {
    if (e.esp) r = S.rp[e.esp] === 'si' ? 'Marcado: sí se hacen' : '';
    else {
      const x = S.resp[e.id] || {};
      if (x.v) r = `<b class="${x.v === 'NA' ? 'na' : isBad(e.it, x.v) ? 'bad' : 'ok'}">${x.v === 'SI' ? 'Sí' : x.v === 'NO' ? 'No' : 'N.A.'}</b>${x.obs ? ' · ' + esc(x.obs) : ''}${faltaFoto(e.id) ? ' · <span class="bad">falta la foto</span>' : (x.fotos || []).length ? ' · foto ✓' : ''}`;
    }
  }
  $('#ml-r').innerHTML = r;
  $('#ml-et').textContent = ML.intro ? '' : ML.pausa ? (ML.msg || ESTADOS.pausa) : (ESTADOS[ML.estado] || '');
  $('#ml-e').className = 'ml-e' + (ML.estado === 'oye' && !ML.pausa ? ' oye' : '') + (ML.estado === 'habla' && !ML.pausa ? ' habla' : '') + (ML.intro ? ' vacio' : '');
  $('#ml-oi').textContent = ML.oido && !ML.intro ? '«' + ML.oido + '»' : '';
  $('#ml-foto').hidden = !(e && e.id && faltaFoto(e.id) && NAT());
  $$('#ml .ml-ans button').forEach(b => {
    const v = e && (e.esp ? (S.rp[e.esp] === 'si' ? 'SI' : '') : (S.resp[e.id] || {}).v);
    b.setAttribute('aria-pressed', !ML.intro && b.dataset.ml === v);
    b.disabled = ML.intro || !e;
  });
  $$('#ml .ml-nav button').forEach(b => { b.disabled = ML.intro || !e; });
  $('#ml .ml-ans').hidden = ML.intro; $('#ml .ml-nav').hidden = ML.intro;
  const go = $('#ml-go');
  go.textContent = ML.intro ? 'Empezar' : ML.pausa ? 'Seguir' : 'Pausa';
  go.classList.toggle('pausa', !ML.intro && !ML.pausa);
}

/* ---------- el recorrido ---------- */
const vivo = g => ML.on && !ML.pausa && g === ML.gen;
function mover(d) {
  const lista = entradas(), i = lista.findIndex(x => x.k === ML.cur);
  const n = lista[i + d];
  ML.fase = 'pregunta';
  if (n) { ML.cur = n.k; return true; }
  if (d > 0) { ML.cur = null; return true; }
  return false;
}
function reiniciar(espera = 60) {
  ML.gen++; parar();
  const g = ML.gen;
  if (ML.on && !ML.pausa) setTimeout(() => { if (g === ML.gen) bucle(g); }, espera);
  pinta();
}
function pausar(msg) { ML.pausa = true; ML.msg = msg || ''; ML.gen++; parar(); estado('pausa'); }

async function escuchar(g, reintentos = 2) {
  for (let n = 0; ; n++) {
    const r = await oir();
    if (!vivo(g)) return null;
    if (r.ok) { ML.oido = (r.alts || [])[0] || ''; estado('piensa'); return r.alts; }
    if (r.error === 'cancelado') return null;
    if (r.error === 'permiso') { pausar('Sin permiso para el micrófono. Dale permiso a la app y pulsa «Seguir».'); return null; }
    if (r.error === 'sin-reconocimiento') { pausar('Este equipo no tiene reconocimiento de voz. Puedes seguir con los botones.'); return null; }
    if (r.error === 'red') { pausar('El reconocimiento de voz necesita conexión aquí. Puedes seguir con los botones.'); return null; }
    if (r.error === 'ocupado') { await new Promise(s => setTimeout(s, 400)); if (!vivo(g)) return null; n--; continue; }
    if (n >= reintentos) return [];
    await decir(n === 0 ? 'No te he oído.' : 'Sigo sin oírte.');
    if (!vivo(g)) return null;
  }
}
async function comando(c, e, g) {
  if (c === 'repetir') { ML.fase = ML.fase === 'deficiencia' ? 'deficiencia' : 'pregunta'; ML.ultPaso = -1; return; }
  if (c === 'atras') { if (!mover(-1)) await decir('Es la primera pregunta.'); ML.ultPaso = -1; return; }
  if (c === 'saltar') { mover(1); return; }
  if (c === 'pausa') { pausar('En pausa. Pulsa «Seguir» para continuar.'); return; }
  if (c === 'salir') { await decir('Hasta luego.'); cerrar(); return; }
  if (c === 'foto') { await decir(NAT() ? 'Pulsa el botón Foto de la pantalla.' : 'Las fotos se añaden con los botones de la pregunta.'); return; }
  if (c === 'ayuda') { await decir('Di sí, no y lo que pasa, o no aplica. También: repite, atrás, siguiente, pausa o salir.'); return; }
}
async function bucle(g) {
  while (vivo(g)) {
    const lista = entradas(), e = lista.find(x => x.k === ML.cur);
    if (!e) { await terminar(g); return; }
    if (paso !== e.paso) setStep(e.paso, {scroll:false});
    pinta();
    if (ML.fase === 'deficiencia') {
      await decir(ML.prefijo + '¿Qué deficiencia anoto?'); ML.prefijo = '';
      if (!vivo(g)) return;
      const a = await escuchar(g); if (a === null) return;
      const r = interpretar(a);
      if (r.tipo === 'cmd' && r.c !== 'nada') { await comando(r.c, e, g); continue; }
      if (r.tipo === 'texto' || r.tipo === 'resp') anotar(e.id, r.tipo === 'texto' ? r.txt : mayus(a[0]));
      ML.fase = 'tras'; continue;
    }
    if (ML.fase === 'tras') {
      const x = S.resp[e.id] || {};
      const foto = faltaFoto(e.id);
      await decir((x.obs ? 'Anotado: ' + x.obs + '. ' : 'Anotada la deficiencia. ') + (foto && NAT() ? 'Si quieres, pulsa Foto. Di siguiente para seguir.' : 'Di siguiente para seguir.'));
      if (!vivo(g)) return;
      const a = await escuchar(g, 0); if (a === null) return;
      const r = interpretar(a);
      if (!a.length || (r.tipo === 'cmd' && (r.c === 'saltar' || r.c === 'nada'))) { mover(1); continue; }
      if (r.tipo === 'cmd') { await comando(r.c, e, g); if (r.c === 'repetir') ML.fase = 'tras'; continue; }
      if (r.tipo === 'resp') { responder(e, r.v); if (r.resto) anotar(e.id, r.resto); if (!isBad(e.it, r.v)) mover(1); continue; }
      if (r.tipo === 'texto') { anotar(e.id, r.txt, true); ML.prefijo = 'Añadido. '; continue; }
      continue;
    }
    /* la pregunta */
    const sec = ML.ultPaso !== e.paso && STEPS[e.paso] ? STEPS[e.paso].l + '. ' : '';
    ML.ultPaso = e.paso;
    await decir(ML.prefijo + sec + e.q); ML.prefijo = '';
    if (!vivo(g)) return;
    let r = null;
    for (let n = 0; n < 2 && vivo(g); n++) {
      const a = await escuchar(g); if (a === null) return;
      if (!a.length) { pausar('No te oigo. Pulsa «Seguir» cuando quieras.'); return; }
      r = interpretar(a);
      if (r.tipo === 'resp' || r.tipo === 'cmd') break;
      if (n === 0) { await decir(e.esp ? 'No te he entendido. Di sí o no.' : 'No te he entendido. Di sí, no o no aplica.'); if (!vivo(g)) return; }
    }
    if (!vivo(g)) return;
    if (!r || (r.tipo !== 'resp' && r.tipo !== 'cmd')) { pausar('No te he entendido. Contesta con los botones o pulsa «Seguir».'); return; }
    if (r.tipo === 'cmd') { await comando(r.c, e, g); continue; }
    responder(e, r.v);
    if (e.esp) { ML.prefijo = r.v === 'SI' ? 'Marcado. ' : ''; mover(1); continue; }
    if (r.resto) anotar(e.id, r.resto);
    if (isBad(e.it, r.v)) { ML.fase = (S.resp[e.id] || {}).obs ? 'tras' : 'deficiencia'; continue; }
    ML.prefijo = r.v === 'NA' ? 'No aplica. ' : r.v === 'SI' ? 'Sí. ' : 'No. ';
    mover(1);
  }
}
async function terminar(g) {
  const sinFoto = entradas().filter(e => e.id && faltaFoto(e.id)).length;
  const sinContestar = entradas().filter(e => e.id && !respondida(e)).length;
  const t = 'Has terminado las preguntas.' + (sinContestar ? ` Quedan ${sinContestar} sin contestar.` : '') + (sinFoto ? ` Faltan ${sinFoto === 1 ? 'una foto' : sinFoto + ' fotos'} de deficiencias.` : '') + ' Revisa la visita y guárdala.';
  await decir(t);
  if (g !== ML.gen) return;
  cerrar(t);
}

/* ---------- botones ---------- */
function tocar(a) {
  if (a === 'salir') { cerrar(); return; }
  if (a === 'go') {
    if (ML.intro) { ML.intro = false; ML.msg = ''; ML.pausa = false; ML.ultPaso = -1; reiniciar(); return; }
    if (ML.pausa) { ML.pausa = false; ML.msg = ''; ML.ultPaso = -1; reiniciar(); }
    else pausar('En pausa. Pulsa «Seguir» para continuar.');
    return;
  }
  const lista = entradas(), e = lista.find(x => x.k === ML.cur);
  if (a === 'foto') {
    if (!e || !e.id) return;
    ML.fotoDe = e.id; ML.fuera = true; ML.gen++; parar();
    const inp = $('#fc-' + e.id) || $('#f-' + e.id);
    if (inp) { inp.addEventListener('change', () => setTimeout(alVolver, 400), {once:true}); inp.click(); }
    return;
  }
  if (!e) return;
  if (a === 'SI' || a === 'NO' || a === 'NA') {
    responder(e, a);
    ML.oido = '';
    if (e.esp) mover(1);
    else if (isBad(e.it, a)) ML.fase = (S.resp[e.id] || {}).obs ? 'tras' : 'deficiencia';
    else mover(1);
  } else if (a === 'atras') { mover(-1); ML.ultPaso = -1; }
  else if (a === 'saltar') mover(1);
  else if (a === 'repetir') ML.ultPaso = -1;
  if (ML.pausa) { ML.pausa = false; ML.msg = ''; }
  reiniciar();
}

/* ---------- abrir y cerrar ---------- */
function abrir() {
  if (!puede()) { toast('Este navegador no puede leer ni escuchar. Prueba con Chrome o Edge, o en la app del móvil.'); return; }
  crear();
  const lista = entradas();
  if (!lista.length) { toast('No hay preguntas que contestar en esta visita.'); return; }
  const pri = lista.find(e => e.id && !respondida(e));
  ML.cur = (pri || lista[0]).k; ML.fase = 'pregunta'; ML.oido = ''; ML.prefijo = ''; ML.ultPaso = -1; ML.vistas = new Set();
  ML.on = true; ML.pausa = true; ML.intro = true;
  ML.msg = pri ? (pri === lista.find(e => e.id) ? '' : 'Empiezo por la primera pregunta sin contestar.') : 'Ya están todas contestadas: empiezo por la primera para repasarlas.';
  if (NAT()) { try { const d = JSON.parse(AndroidApp.vozDisponible() || '{}'); if (d.stt === false) ML.msg = 'Este móvil no tiene activado el reconocimiento de voz (app de Google). Te leeré las preguntas y contestas con los botones.'; } catch (e) {} }
  $('#ml').hidden = false; document.body.classList.add('ml-on');
  pantallaEncendida(true);
  pinta();
  setTimeout(() => { const b = $('#ml-go'); if (b) b.focus(); }, 30);
}
function cerrar(msg) {
  ML.on = false; ML.pausa = true; ML.gen++; parar();
  pantallaEncendida(false);
  const m = $('#ml'); if (m) m.hidden = true; document.body.classList.remove('ml-on');
  const e = entradas().find(x => x.k === ML.cur);
  if (e) {
    if (paso !== e.paso) setStep(e.paso, {scroll:false});
    setTimeout(() => { e.el.scrollIntoView({block:'center'}); e.el.classList.remove('siguiente'); void e.el.offsetWidth; e.el.classList.add('siguiente'); }, 80);
  }
  const b = $('#ml-mic'); if (b) b.focus({preventScroll:true});
  if (typeof msg === 'string' && msg) toast(msg);
}

/* ---------- avisos del móvil ---------- */
function nativo(k, ok, info) {
  if (k === 'hablado') { if (pend.h && pend.h.id === info) { const p = pend.h; pend.h = null; p.res(!!ok); } return; }
  if (k === 'listo') { if (pend.o) estado('oye'); return; }
  if (k === 'oido') {
    if (!pend.o) return;
    const p = pend.o; pend.o = null;
    if (ok) { let a = []; try { a = JSON.parse(info); } catch (e) { a = [String(info || '')]; } p.res({ok:true, alts:a}); }
    else p.res({ok:false, error:info || 'error'});
  }
}
function alSalir() { if (!ML.on || ML.fuera) return; ML.fuera = true; ML.gen++; parar(); }
function alVolver() {
  if (!ML.on || !ML.fuera) return;
  ML.fuera = false;
  setTimeout(() => {
    if (!ML.on) return;
    const id = ML.fotoDe; ML.fotoDe = null;
    if (id && ML.cur === id && !faltaFoto(id)) { ML.prefijo = 'Foto guardada. '; mover(1); }
    else if (id && ML.cur === id) ML.fase = 'tras';
    if (ML.pausa || ML.intro) { pinta(); return; }
    reiniciar(0);
  }, 900);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) alSalir(); else alVolver(); });
addEventListener('focus', () => { if (ML.fuera && !document.hidden) alVolver(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && ML.on && $('#ml') && !$('#ml').hidden) { e.preventDefault(); cerrar(); } });

/* ---------- el botón del micrófono, en la barra de pasos ---------- */
function initManos() {
  const prev = $('#wiz-prev'); if (!prev || $('#ml-mic')) return;
  prev.insertAdjacentHTML('afterend', `<button type="button" class="ml-mic" id="ml-mic" aria-label="Visita manos libres: te leo las preguntas y contestas hablando" title="Visita manos libres">${MIC}</button>`);
  const wi = prev.closest('.wiz-in'); if (wi) wi.classList.add('con-ml');
  const b = $('#ml-mic'); b.hidden = !puede(); if (b.hidden && wi) wi.classList.remove('con-ml');
  b.addEventListener('click', abrir);
}
initManos();
window.MANOS_API = {nativo, alSalir, alVolver, abrir, cerrar, interpretar, ir:k => { ML.cur = k; ML.fase = 'pregunta'; pinta(); }, entradas:() => entradas().map(e => e.k), estado:() => ({on:ML.on, pausa:ML.pausa, cur:ML.cur, fase:ML.fase, intro:ML.intro, oido:ML.oido, msg:ML.msg})};
})();
