# Inyecta «Ordenador: pantalla a dos columnas» (1.19.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, tareas, panel, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/esc/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)
def once(marker, a, b):
    if marker not in h: rep(a, b)

h = re.sub(r'\n?/\*ESC-CSS-START\*/.*?/\*ESC-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*ESC-JS-START\*/.*?/\*ESC-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'esc.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*ESC-CSS-START*/\n' + css + '/*ESC-CSS-END*/\n' + h[i:]
js = open(D + 'esc.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*ESC-JS-START*/\n' + js + '\n/*ESC-JS-END*/\ninitSen();\ninitInstall();\n})();')
once("ESC_API.onTab(t)",
     "  if (window.PSS_API) PSS_API.onTab(t);\n",
     "  if (window.PSS_API) PSS_API.onTab(t);\n  if (window.ESC_API) ESC_API.onTab(t);\n")

if "{v:'1.19.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.19.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.19.0', fecha:'09/11/2026', items:[
    '<b>En el ordenador, a lo ancho</b>: el menú pasa a una barra a la izquierda y la app aprovecha toda la pantalla. Inicio y Perfil se ven en dos columnas.',
    '<b>Visita con su resumen al lado</b>: mientras rellenas, a la derecha ves los pasos, las respuestas, las incidencias y los botones de guardar y PDF.',
    '<b>Historial con el detalle al lado</b>: al pulsar un registro ves sus incidencias, fotos, trabajadores y firmas sin abrirlo.',
    'En el móvil todo sigue igual.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.19.0 · 09/11/2026", h, count=1)
if "{v:'1.19.1'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.19.1';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.19.1', fecha:'09/11/2026', items:[
    '<b>Apartados con su nombre completo</b> en Inicio: Visitas a obra, Informe cuatrimestral, Planificación preventiva, Evaluación de riesgos laborales, Revisiones de instalaciones, Señalización (manual de obras fijas) y Normativa legal.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.19.1 · 09/11/2026", h, count=1)
if "{v:'1.20.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.20.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.20.0', fecha:'09/11/2026', items:[
    '<b>Buscador de toda la app</b> en el ordenador: pulsa <b>Ctrl + K</b> (o «Buscar» en la barra de la izquierda) y escribe: visitas, preguntas, normativa, láminas de señalización, revisiones y apartados del PSS/DGP.',
    '<b>Responder con el teclado</b>: <b>S</b> Sí, <b>N</b> No, <b>A</b> N.A.; las flechas ↑ ↓ cambian de pregunta, <b>Intro</b> pasa a la siguiente y ← → cambian de paso. Con «No» se abre la observación para escribir la deficiencia.',
    '<b>Arrastrar y soltar</b>: una foto encima de la pregunta, un PDF a la carpeta PSS/DGP (o al certificado de la revisión abierta) y una copia de seguridad para importarla.',
    'En el ordenador, las pestañas de arriba y los pasos de la visita llevan su nombre completo.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.20.0 · 09/11/2026", h, count=1)
open(IDX, 'w', encoding='utf-8').write(h)
print('ok', len(h))
