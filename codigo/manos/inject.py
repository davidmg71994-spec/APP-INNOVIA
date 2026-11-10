# Inyecta «Visita manos libres» (1.22.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, sync, tareas, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/manos/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

h = re.sub(r'\n?/\*MANOS-CSS-START\*/.*?/\*MANOS-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*MANOS-JS-START\*/.*?/\*MANOS-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'manos.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*MANOS-CSS-START*/\n' + css + '/*MANOS-CSS-END*/\n' + h[i:]
js = open(D + 'manos.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*MANOS-JS-START*/\n' + js + '\n/*MANOS-JS-END*/\ninitSen();\ninitInstall();\n})();')

if "{v:'1.22.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.22.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.22.0', fecha:'10/11/2026', items:[
    '<b>Visita manos libres</b>: pulsa el micrófono de la barra de abajo de la visita. La app te lee cada pregunta y contestas hablando: «sí», «no, falta valla en el lado derecho» o «no aplica».',
    'También entiende «repite», «atrás», «siguiente», «pausa» y «salir». Si dices «no», te pregunta qué deficiencia apunta y te deja hacer la foto.',
    'Es una opción: los botones y escribir siguen igual, y todo lo dicho se puede corregir a mano.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.22.0 · 10/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('manos ok', len(h))
