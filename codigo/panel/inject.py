# Inyecta «Panel con gráficos en Inicio» (1.25.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, hist, tareas, panel, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/panel/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

h = re.sub(r'\n?/\*PANEL-CSS-START\*/.*?/\*PANEL-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*PANEL-JS-START\*/.*?/\*PANEL-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'panel.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*PANEL-CSS-START*/\n' + css + '/*PANEL-CSS-END*/\n' + h[i:]
js = open(D + 'panel.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*PANEL-JS-START*/\n' + js + '\n/*PANEL-JS-END*/\ninitSen();\ninitInstall();\n})();')

if "{v:'1.25.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.25.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.25.0', fecha:'10/11/2026', items:[
    '<b>Panel con gráficos en Inicio</b>: visitas de cada mes del año, en qué bloques aparecen las deficiencias, cómo va la planificación preventiva, las revisiones (al día, vencen pronto, vencidas) y las tareas del mes.',
    'Toca una barra para ver su número exacto, o abre «Ver los datos en tabla». Sigue al contrato activo.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.25.0 · 10/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('panel ok', len(h))
