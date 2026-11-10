# Inyecta «Tareas del técnico de PRL» (1.24.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, sync, tareas, panel, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/tareas/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)
def once(marker, a, b):
    if marker not in h: rep(a, b)

h = re.sub(r'\n?/\*TAR-CSS-START\*/.*?/\*TAR-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*TAR-JS-START\*/.*?/\*TAR-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'tareas.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*TAR-CSS-START*/\n' + css + '/*TAR-CSS-END*/\n' + h[i:]
js = open(D + 'tareas.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*TAR-JS-START*/\n' + js + '\n/*TAR-JS-END*/\ninitSen();\ninitInstall();\n})();')
once("['tar', '#view-tar', '#tab-tar']",
     "['norma', '#view-norma', '#tab-norma']",
     "['norma', '#view-norma', '#tab-norma'], ['tar', '#view-tar', '#tab-tar']")
once("TAREAS_API.onTab(t)",
     "  if (window.NORMA_API) NORMA_API.onTab(t);\n",
     "  if (window.NORMA_API) NORMA_API.onTab(t);\n  if (window.TAREAS_API) TAREAS_API.onTab(t);\n")

if "{v:'1.24.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.24.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.24.0', fecha:'10/11/2026', items:[
    '<b>Tareas del técnico de PRL</b>: en Consulta y en Inicio, lo que hay que hacer cada mes, cada trimestre y cada año (revisiones, WINSIE, índices, gastos, consumos y residuos, comités, simulacros, formación…), en cada contrato y cuando pasa algo.',
    '<b>Al calendario de un toque</b>: «Añadir las que faltan» mete todas las de fecha fija (último día de mes, día 5, mitad de mes, el mes siguiente al trimestre…) y te salen en Inicio cuando tocan.',
    'Las revisiones anuales con certificado se dan de alta en Revisiones de instalaciones, y las de cada contrato (ergonomía, ruido y vibraciones, PVD, fichas de químicos) se marcan como hechas en cada uno.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.24.0 · 10/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('tareas ok', len(h))
