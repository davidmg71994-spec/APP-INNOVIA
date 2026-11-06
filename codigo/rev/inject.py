# Inyecta las Revisiones en index.html. Se puede repetir. Ejecutar DESPUÉS de informe, inicio, plan y cal (inject.py de cada uno).
import re
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/rev/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*REV-CSS-START\*/.*?/\*REV-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*REV-JS-START\*/.*?/\*REV-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'rev.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*REV-CSS-START*/\n'+css+'/*REV-CSS-END*/\n'+h[i:]
js=open(D+'rev.js',encoding='utf-8').read().replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*REV-JS-START*/\n'+js+'\n/*REV-JS-END*/\ninitSen();\ninitInstall();\n})();')
# navegación
once("['rev', '#view-rev', '#tab-rev']",
"['cal', '#view-cal', '#tab-cal']].forEach(",
"['cal', '#view-cal', '#tab-cal'], ['rev', '#view-rev', '#tab-rev']].forEach(")
once("REV_API.onTab(t)",
"  if (window.CAL_API) CAL_API.onTab(t);\n",
"  if (window.CAL_API) CAL_API.onTab(t);\n  if (window.REV_API) REV_API.onTab(t);\n")
once("REV_API.atras()",
"  if (window.CAL_API && CAL_API.atras()) return true;\n",
"  if (window.CAL_API && CAL_API.atras()) return true;\n  if (window.REV_API && REV_API.atras()) return true;\n")
# copia de seguridad (con los certificados)
once("REV_API.lista().length)",
"if (!HIST.length && !infs.length && !planesC.length && !calC.length) {",
"if (!HIST.length && !infs.length && !planesC.length && !calC.length && !(window.REV_API && REV_API.lista().length)) {")
once("REV_API.exportar()",
"calendario:window.CAL_API ? CAL_API.lista() : [], perfil:",
"calendario:window.CAL_API ? CAL_API.lista() : [], revisiones:window.REV_API ? await REV_API.exportar() : null, perfil:")
once("revImp = 0",
"  let malos = 0, planesImp = 0, calImp = 0;",
"  let malos = 0, planesImp = 0, calImp = 0, revImp = 0;")
once("REV_API.importar(j.revisiones)",
"      if (!valid.length && !infs.length && !(j.planes || []).length && !(j.calendario || []).length) throw new Error('vacío');",
"      if (!Array.isArray(j) && j.revisiones && typeof j.revisiones === 'object' && window.REV_API) revImp += await REV_API.importar(j.revisiones);\n      if (!valid.length && !infs.length && !(j.planes || []).length && !(j.calendario || []).length && !(j.revisiones && (j.revisiones.revs || []).length)) throw new Error('vacío');")
once("revImp && plural",
"calImp && plural(calImp, 'tarea del calendario', 'tareas del calendario')].filter(Boolean)",
"calImp && plural(calImp, 'tarea del calendario', 'tareas del calendario'), revImp && plural(revImp, 'revisión', 'revisiones')].filter(Boolean)")
# versión
if "{v:'1.13.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.13.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.13.0', fecha:'06/11/2026', items:[
    '<b>Revisiones</b>: desde Inicio, las revisiones de instalaciones y equipos (camión pluma, extintores, aire acondicionado, puesta a tierra, legionela…). De cada una pones la última revisión y cada cuánto toca, y la app calcula cuándo vence y te avisa antes. Todo se puede cambiar.',
    '<b>Certificados</b>: sube el certificado de mantenimiento en PDF o hazle una foto. Queda guardado con su revisión y lo abres o lo envías cuando quieras. Si falta, la app lo marca.',
    '<b>Revisión hecha</b>: con un toque registras la nueva fecha; la anterior queda en el historial con su certificado.',
    '<b>Lista o tabla</b>: tarjetas con el estado de cada una (vencida, vence ya, en 60 días, vigente) o la tabla de siempre.',
    '<b>Pasa al informe cuatrimestral</b>: en el apartado 9, «Rellenar con mis revisiones» pone el SÍ/NO y las fechas de puesta a tierra, PCI, aire acondicionado, BT, aparatos elevadores, otros elementos y legionela.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.13.0 · 06/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
