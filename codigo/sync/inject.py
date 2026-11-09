# Inyecta «Sincronizar con OneDrive» (1.21.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, sync y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/sync/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

h = re.sub(r'\n?/\*SYNC-CSS-START\*/.*?/\*SYNC-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*SYNC-JS-START\*/.*?/\*SYNC-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'sync.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*SYNC-CSS-START*/\n' + css + '/*SYNC-CSS-END*/\n' + h[i:]
js = open(D + 'sync.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*SYNC-JS-START*/\n' + js + '\n/*SYNC-JS-END*/\ninitSen();\ninitInstall();\n})();')

if "{v:'1.21.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.21.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.21.0', fecha:'09/11/2026', items:[
    '<b>Móvil y ordenador sincronizados por OneDrive</b>: actívalo en Perfil › Sincronizar con OneDrive, primero en el ordenador y luego en el móvil. Lo que guardas en uno aparece en el otro: visitas, informes, planificaciones, calendario, revisiones, evaluaciones de riesgos y contratos.',
    'Sin servidores: cada dispositivo deja su archivo <b>cifrado</b> en tu carpeta de OneDrive y lee el del otro al abrir la app, al volver a ella y cada pocos minutos.',
    'Si borras algo en uno, se borra en el otro (si son muchos de golpe, te lo pregunta antes).'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.21.0 · 09/11/2026", h, count=1)
if "{v:'1.21.1'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.21.1';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.21.1', fecha:'09/11/2026', items:[
    '<b>Sincronizar sin OneDrive</b>: si el ordenador ve tu móvil con <b>Enlace Móvil</b>, la carpeta compartida puede ser <b>Descargas › Visitas PRL</b> del propio móvil. Sirve con el móvil personal.',
    'En el móvil, el archivo de sincronización se guarda con permiso permanente y, si Android lo pierde, la app lo avisa en Perfil.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.21.1 · 09/11/2026", h, count=1)
open(IDX, 'w', encoding='utf-8').write(h)
print('ok', len(h))
