# Inyecta «Últimas fechas» (1.30.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, hist, tareas, ult, panel, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/ult/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)
def once(marker, a, b):
    if marker not in h: rep(a, b)

h = re.sub(r'\n?/\*ULT-CSS-START\*/.*?/\*ULT-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*ULT-JS-START\*/.*?/\*ULT-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'ult.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*ULT-CSS-START*/\n' + css + '/*ULT-CSS-END*/\n' + h[i:]
js = open(D + 'ult.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*ULT-JS-START*/\n' + js + '\n/*ULT-JS-END*/\ninitSen();\ninitInstall();\n})();')
# navegación
once("['ult', '#view-ult', '#tab-ult']",
     "['tar', '#view-tar', '#tab-tar']",
     "['tar', '#view-tar', '#tab-tar'], ['ult', '#view-ult', '#tab-ult']")
once("ULT_API.onTab(t)",
     "  if (window.TAREAS_API) TAREAS_API.onTab(t);\n",
     "  if (window.TAREAS_API) TAREAS_API.onTab(t);\n  if (window.ULT_API) ULT_API.onTab(t);\n")
once("ULT_API.atras()",
     "  if (window.CAL_API && CAL_API.atras()) return true;\n",
     "  if (window.CAL_API && CAL_API.atras()) return true;\n  if (window.ULT_API && ULT_API.atras()) return true;\n")
# copia de seguridad
once("actividades:window.ULT_API",
     "calendario:window.CAL_API ? CAL_API.lista() : [], revisiones:",
     "calendario:window.CAL_API ? CAL_API.lista() : [], actividades:window.ULT_API ? ULT_API.lista() : [], revisiones:")
once("!(window.ULT_API && ULT_API.lista().length)",
     "!(window.PSS_API && PSS_API.lista().length)) { toast('No hay registros que exportar.'); return; }",
     "!(window.PSS_API && PSS_API.lista().length) && !(window.ULT_API && ULT_API.lista().length)) { toast('No hay registros que exportar.'); return; }")
once("ultImp = 0",
     "  let malos = 0, planesImp = 0, calImp = 0, revImp = 0, evrlImp = 0, pssImp = 0, segMal = 0;",
     "  let malos = 0, planesImp = 0, calImp = 0, revImp = 0, evrlImp = 0, pssImp = 0, segMal = 0, ultImp = 0;")
once("ULT_API.importar(j.actividades)",
     "      if (!Array.isArray(j) && Array.isArray(j.pss) && j.pss.length && window.PSS_API) pssImp += await PSS_API.importar(j.pss);\n",
     "      if (!Array.isArray(j) && Array.isArray(j.pss) && j.pss.length && window.PSS_API) pssImp += await PSS_API.importar(j.pss);\n      if (!Array.isArray(j) && Array.isArray(j.actividades) && j.actividades.length && window.ULT_API) ultImp += await ULT_API.importar(j.actividades);\n")
once("!(j.actividades || []).length) throw",
     "!(j.evrl || []).length && !(j.pss || []).length) throw new Error('vacío');",
     "!(j.evrl || []).length && !(j.pss || []).length && !(j.actividades || []).length) throw new Error('vacío');")
once("ultImp && plural",
     "calImp && plural(calImp, 'tarea del calendario', 'tareas del calendario'), ",
     "calImp && plural(calImp, 'tarea del calendario', 'tareas del calendario'), ultImp && plural(ultImp, 'fecha anotada', 'fechas anotadas'), ")

if "{v:'1.30.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.30.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.30.0', fecha:'12/11/2026', items:[
    '<b>Últimas fechas</b>, junto al Calendario: anota cada <b>charla de sensibilización</b>, <b>formación periódica</b>, <b>simulacro</b> y <b>comité o comisión</b> (fecha, tema, contrato, asistentes y notas). Cada uno dice la última vez y cuánto hace.',
    'Con «Avisar» eliges cada cuánto toca (de serie: simulacros cada año y comités cada 3 meses) y te dice cuándo toca el siguiente; si se pasa, sale en rojo y en Inicio.',
    'Va en la copia de seguridad. Se abre desde Inicio › Apartados y desde el Calendario.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.30.0 · 12/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('ult ok', len(h))
