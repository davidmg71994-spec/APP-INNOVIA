# Inyecta la carpeta PSS/DGP en index.html. Se puede repetir. Ejecutar DESPUÉS de informe, inicio, plan, cal, rev, norma y evrl.
import re
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/pss/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*PSS-CSS-START\*/.*?/\*PSS-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*PSS-JS-START\*/.*?/\*PSS-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'pss.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*PSS-CSS-START*/\n'+css+'/*PSS-CSS-END*/\n'+h[i:]
js=open(D+'pss.js',encoding='utf-8').read().replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*PSS-JS-START*/\n'+js+'\n/*PSS-JS-END*/\ninitSen();\ninitInstall();\n})();')
once("['pss', '#view-pss', '#tab-pss']",
"['evrl', '#view-evrl', '#tab-evrl']].forEach(",
"['evrl', '#view-evrl', '#tab-evrl'], ['pss', '#view-pss', '#tab-pss']].forEach(")
once("PSS_API.onTab(t)",
"  if (window.EVRL_API) EVRL_API.onTab(t);\n",
"  if (window.EVRL_API) EVRL_API.onTab(t);\n  if (window.PSS_API) PSS_API.onTab(t);\n")
once("PSS_API.atras()",
"  if (window.INF_API && INF_API.atras()) return true;\n",
"  if (window.PSS_API && PSS_API.atras()) return true;\n  if (window.INF_API && INF_API.atras()) return true;\n")
once("PSS_API.formPss();\n  sig.load",
"  if (window.INI_API) INI_API.formContrato();\n",
"  if (window.INI_API) INI_API.formContrato();\n  if (window.PSS_API) PSS_API.formPss();\n")
# copia de seguridad: va el índice, no el PDF
once("pss:window.PSS_API",
"evrl:window.EVRL_API ? EVRL_API.lista() : [], perfil:",
"evrl:window.EVRL_API ? EVRL_API.lista() : [], pss:window.PSS_API ? PSS_API.exportar() : [], perfil:")
once("PSS_API.lista().length)",
"&& !(window.EVRL_API && EVRL_API.lista().length)) {",
"&& !(window.EVRL_API && EVRL_API.lista().length) && !(window.PSS_API && PSS_API.lista().length)) {")
once("pssImp = 0",
"  let malos = 0, planesImp = 0, calImp = 0, revImp = 0, evrlImp = 0;",
"  let malos = 0, planesImp = 0, calImp = 0, revImp = 0, evrlImp = 0, pssImp = 0;")
once("PSS_API.importar(j.pss)",
"      if (!Array.isArray(j) && Array.isArray(j.evrl) && j.evrl.length && window.EVRL_API) evrlImp += await EVRL_API.importar(j.evrl);\n",
"      if (!Array.isArray(j) && Array.isArray(j.evrl) && j.evrl.length && window.EVRL_API) evrlImp += await EVRL_API.importar(j.evrl);\n      if (!Array.isArray(j) && Array.isArray(j.pss) && j.pss.length && window.PSS_API) pssImp += await PSS_API.importar(j.pss);\n")
once("!(j.pss || []).length",
"&& !(j.evrl || []).length) throw new Error('vacío');",
"&& !(j.evrl || []).length && !(j.pss || []).length) throw new Error('vacío');")
once("pssImp && plural",
"evrlImp && plural(evrlImp, 'evaluación de riesgos', 'evaluaciones de riesgos')].filter(Boolean)",
"evrlImp && plural(evrlImp, 'evaluación de riesgos', 'evaluaciones de riesgos'), pssImp && plural(pssImp, 'índice del PSS/DGP', 'índices del PSS/DGP')].filter(Boolean)")
if "{v:'1.17.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.17.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.17.0', fecha:'08/11/2026', items:[
    '<b>Carpeta PSS/DGP</b> en Inicio y en Consulta: guarda el PDF del PSS/DGP de cada contrato (y sus anexos). La app lee su índice y puedes ver cada apartado dentro de la app, sin cobertura.',
    '<b>Búsqueda inteligente</b>: escribe un número («6.1.9»), una actividad («malla») o lo que buscas («trabajos en altura») y te lleva al apartado. Busca también dentro del texto, entiende palabras parecidas (EPI, caída en altura, camión pluma…) y te marca en amarillo dónde sale en la página.',
    '<b>En la visita</b>: el «Apartado del PSS/DGP» tiene un desplegable con el índice del PSS/DGP del contrato. Al elegir uno se ponen el número y la actividad, y debajo ves si el número que has escrito está en el índice.',
    'Desde cada apartado, «Usar en la visita» lo pone en la visita que estás rellenando.',
    'La copia de seguridad guarda el índice; el PDF no viaja en la copia porque pesa mucho.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.17.0 · 08/11/2026",h,count=1)
if "{v:'1.17.1'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.17.1';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.17.1', fecha:'08/11/2026', items:[
    '<b>Una carpeta PSS/DGP por obra</b>: en Consulta › PSS/DGP ves todas tus obras, cada una con su botón «Añadir el PSS/DGP» o «Abrir la carpeta», y un buscador que mira en todas a la vez.',
    'También en <b>Perfil › Mis contratos</b>: cada obra tiene su botón para añadir o ver su PSS/DGP.',
    'Si un PDF está en la obra que no es, «Pasarlo a otra obra» lo cambia de carpeta.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.17.1 · 08/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
