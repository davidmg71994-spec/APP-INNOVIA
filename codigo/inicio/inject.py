# Inyecta el Inicio de Innovia (perfil del técnico y contratos) en index.html. Se puede repetir.
# Ejecutar DESPUÉS de informe/inject.py.
import re
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/inicio/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
# ---- bloques
h=re.sub(r'\n?/\*INI-CSS-START\*/.*?/\*INI-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*INI-JS-START\*/.*?/\*INI-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'inicio.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*INI-CSS-START*/\n'+css+'/*INI-CSS-END*/\n'+h[i:]
js=open(D+'inicio.js',encoding='utf-8').read().replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*INI-JS-START*/\n'+js+'\n/*INI-JS-END*/\ninitSen();\ninitInstall();\n})();')
# ---- perfil y contratos (funciones comunes)
once('function perfilGet()',
"const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch(e) {} };\n",
"""const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch(e) {} };
/* perfil del técnico y sus contratos: solo en este móvil (entra en la copia de seguridad) */
function perfilGet() { let p = null; try { p = JSON.parse(lsGet('perfil') || 'null'); } catch(e) {} p = (p && typeof p === 'object') ? p : {}; if (!Array.isArray(p.contratos)) p.contratos = []; return p; }
function perfilSet(p) { lsSet('perfil', JSON.stringify(p)); }
function contratoPorId(id) { return id ? perfilGet().contratos.find(c => c.id === id) || null : null; }
function snapContrato(c) { if (!c) { const p = perfilGet(); c = p.contratos.find(x => x.id === p.activo) || p.contratos[0]; } return c ? {id:c.id, nombre:c.nombre || '', sie:c.sie || ''} : null; }
function nombreContrato(c) { return c ? [c.sie && 'SIE ' + c.sie, c.nombre].filter(Boolean).join(' · ') : ''; }
""")
# registro: guarda su contrato
once('r.contrato = from && from.contrato',
"""    resp:{}, acciones:'', firma:null, informe:null, epis:[], subcon:{}, otrasObs:'', otrasMejoras:'', senEj:[], maqFotos:{}};
  if (from) {""",
"""    resp:{}, acciones:'', firma:null, informe:null, epis:[], subcon:{}, otrasObs:'', otrasMejoras:'', senEj:[], maqFotos:{}, contrato:null};
  r.contrato = from && from.contrato && from.contrato.id ? {...from.contrato} : snapContrato();
  if (from) {""")
once("o.contrato = r.contrato && r.contrato.id",
"  o.maqFotos = (r.maqFotos && typeof r.maqFotos === 'object') ? clone(r.maqFotos) : {};\n",
"  o.maqFotos = (r.maqFotos && typeof r.maqFotos === 'object') ? clone(r.maqFotos) : {};\n  o.contrato = r.contrato && r.contrato.id ? {...r.contrato} : null;\n")
once("contrato:r.contrato || null,",
"  return {v:1, rp:{...r.rp},\n",
"  return {v:1, rp:{...r.rp}, contrato:r.contrato || null,\n")
# paso Datos: selector de contrato
once('id="f-contrato"',
"""      <div class="field span2"><label for="rp-nombre">Nombre y apellidos del técnico de prevención</label>""",
"""      <div class="field span2" id="f-contrato" hidden><label for="rp-contrato">Contrato</label><select id="rp-contrato"></select></div>
      <div class="field span2"><label for="rp-nombre">Nombre y apellidos del técnico de prevención</label>""")
once('INI_API.formContrato()',
"  ITEMS.forEach(it => applyItem(it.id));\n  renderSenEj();\n",
"  ITEMS.forEach(it => applyItem(it.id));\n  renderSenEj();\n  if (window.INI_API) INI_API.formContrato();\n")
# PDF: fila del contrato
once("t:'Contrato', font:B",
"  row([{w:150, t:'Técnico de prevención', font:B, fill:C.head}, {w:CW - 150, t:r.rp.nombre}], {minH:20});\n",
"  row([{w:150, t:'Técnico de prevención', font:B, fill:C.head}, {w:CW - 150, t:r.rp.nombre}], {minH:20});\n  if (r.contrato && (r.contrato.nombre || r.contrato.sie)) row([{w:150, t:'Contrato', font:B, fill:C.head}, {w:CW - 150, t:nombreContrato(r.contrato)}], {minH:20});\n")
# Historial: chips por contrato
once('id="h-ctr"',
"""<button type="button" class="chip" data-hf="mine" aria-pressed="false">Solo los míos</button></div>""",
"""<button type="button" class="chip" data-hf="mine" aria-pressed="false">Solo los míos</button></div>
    <div class="chips" id="h-ctr" hidden aria-label="Contrato"></div>""")
once('INI_API.filtroHist()',
"""  const list = HIST.filter(r => !q || [r.codigo, r.rp?.ubicacion, r.rp?.nombre, fmtDate(r.rp?.fecha), r.rp?.fecha].join(' ').toLowerCase().includes(q));
  if (!HIST.length) {""",
"""  if (window.INI_API) INI_API.chipsHist();
  const cf = window.INI_API ? INI_API.filtroHist() : null;
  const base = !cf ? HIST : HIST.filter(r => cf === '-' ? !(r.contrato && r.contrato.id) : !!(r.contrato && r.contrato.id === cf));
  const list = base.filter(r => !q || [r.codigo, r.rp?.ubicacion, r.rp?.nombre, fmtDate(r.rp?.fecha), r.rp?.fecha, r.contrato?.nombre].join(' ').toLowerCase().includes(q));
  if (HIST.length && !base.length) { box.innerHTML = '<div class="empty"><b>Sin registros en este contrato</b><span>Pulsa «Todos» para ver los registros de los demás contratos.</span></div>'; return; }
  if (!HIST.length) {""")
once("!cf && r.contrato",
"""      <p class="hsub">${esc(r.rp?.nombre || '')} · ${nW}""",
"""      ${!cf && r.contrato && r.contrato.id ? `<p class="hsub hctr-t">${esc(nombreContrato(r.contrato))}</p>` : ''}<p class="hsub">${esc(r.rp?.nombre || '')} · ${nW}""")
# navegación: pestaña Inicio
once("['ini', '#view-ini', '#tab-ini']",
"  [['form', '#view-form', '#tab-form'],",
"  [['ini', '#view-ini', '#tab-ini'], ['form', '#view-form', '#tab-form'],")
once("INI_API.onTab(t)",
"  if (window.INF_API) INF_API.onTab(t);\n",
"  if (window.INF_API) INF_API.onTab(t);\n  if (window.INI_API) INI_API.onTab(t);\n")
# botón atrás: Inicio es la pantalla principal
once("INI_API.atras()",
"""  if (window.INF_API && INF_API.atras()) return true;
  if ($('#view-form').hidden) { showTab('form'); return true; }
  if (paso > 0) { setStep(paso - 1); return true; }
  return false;""",
"""  if (window.INF_API && INF_API.atras()) return true;
  if (window.INI_API && INI_API.atras()) return true;
  const ini = $('#view-ini');
  if (!$('#view-form').hidden && paso > 0) { setStep(paso - 1); return true; }
  if (ini && ini.hidden) { showTab('ini'); return true; }
  if (!ini && $('#view-form').hidden) { showTab('form'); return true; }
  return false;""")
# copia de seguridad: el perfil va dentro
once("perfil:{...perfilGet()",
"registros:HIST, informes:infs});",
"registros:HIST, informes:infs, perfil:{...perfilGet(), nombre:lsGet('rp-nombre') || ''}});")
once("INI_API.importarPerfil",
"      const infs = (!Array.isArray(j) && Array.isArray(j.informes)) ? j.informes.filter(x => x && x.id && x.v) : [];\n",
"      const infs = (!Array.isArray(j) && Array.isArray(j.informes)) ? j.informes.filter(x => x && x.id && x.v) : [];\n      if (!Array.isArray(j) && j.perfil && window.INI_API) { const nc = INI_API.importarPerfil(j.perfil); if (nc) toast(`Añadidos ${plural(nc, 'contrato', 'contratos')} de la copia a tu perfil.`); }\n")
# primera vez: al cerrar la guía rápida sigue el recorrido de perfil y contrato
once("INI_API.trasGuia()",
"  lsSet('guia-vista', '1'); lsSet('nov-vista', APP_VER);\n}",
"  lsSet('guia-vista', '1'); lsSet('nov-vista', APP_VER);\n  if (window.INI_API) INI_API.trasGuia();\n}")
# versión
if "{v:'1.8.0'" not in h:
    rep("const APP_VER = '1.7.0';","const APP_VER = '1.8.0';")
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.8.0', fecha:'06/11/2026', items:[
    '<b>Nueva pantalla de Inicio</b>: con tu saludo, tus cifras del mes (visitas, deficiencias e informes) y el acceso a cada parte de la app. Lo que está por llegar (planificación preventiva, EVRL, revisiones, normativa) aparece como «Próximamente».',
    '<b>Tu perfil</b>: pulsa tus iniciales arriba a la derecha para poner tu nombre, cargo, teléfono y correo.',
    '<b>Varios contratos</b>: da de alta los contratos que llevas (nombre, Nº SIE y objeto) y elige con cuál trabajas. Cada visita e informe se guarda con su contrato, y el Historial se puede ver por contrato.',
    '<b>El informe por contrato</b>: el informe de seguimiento solo recoge las visitas de su contrato y pone su Nº SIE y su objeto en la cabecera del Word.'
  ]},
""")
    rep("Versión de la app: 1.7.0 · 05/11/2026","Versión de la app: 1.8.0 · 06/11/2026")
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
