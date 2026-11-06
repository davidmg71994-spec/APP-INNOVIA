# Inyecta la Normativa PRL en index.html. Se puede repetir. Ejecutar DESPUÉS de informe, inicio, plan, cal y rev (inject.py de cada uno).
import re
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/norma/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*NORMA-CSS-START\*/.*?/\*NORMA-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*NORMA-JS-START\*/.*?/\*NORMA-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'norma.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*NORMA-CSS-START*/\n'+css+'/*NORMA-CSS-END*/\n'+h[i:]
datos=open(D+'datos.js',encoding='utf-8').read()
js=open(D+'norma.js',encoding='utf-8').read().replace('/*NORMA-DATOS*/',datos).replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*NORMA-JS-START*/\n'+js+'\n/*NORMA-JS-END*/\ninitSen();\ninitInstall();\n})();')
once("['norma', '#view-norma', '#tab-norma']",
"['rev', '#view-rev', '#tab-rev']].forEach(",
"['rev', '#view-rev', '#tab-rev'], ['norma', '#view-norma', '#tab-norma']].forEach(")
once("NORMA_API.onTab(t)",
"  if (window.REV_API) REV_API.onTab(t);\n",
"  if (window.REV_API) REV_API.onTab(t);\n  if (window.NORMA_API) NORMA_API.onTab(t);\n")
once("NORMA_API.atras()",
"  if (window.REV_API && REV_API.atras()) return true;\n",
"  if (window.REV_API && REV_API.atras()) return true;\n  if (window.NORMA_API && NORMA_API.atras()) return true;\n")
if "{v:'1.14.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.14.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.14.0', fecha:'06/11/2026', items:[
    '<b>Normativa PRL</b>: en Consulta y en Inicio, una ficha por norma (33): qué regula, para qué te sirve en obra y lo más importante, artículo por artículo. Se consulta sin cobertura.',
    '<b>Enlace al BOE</b>: cada ficha abre el texto consolidado oficial (necesita conexión). Revisadas con el BOE el 06/11/2026.',
    '<b>Buscador y favoritas</b>: busca por palabra («andamio», «extintores», «amianto»…), filtra por bloque y marca con la estrella las que más usas.',
    '<b>Novedades incluidas</b>: el nuevo real decreto del amianto (RD 847/2026, en vigor desde el 24/10/2026), el reglamento de máquinas que se aplica desde enero de 2027 y la reforma de la ley de prevención en tramitación.',
    '<b>Enlazada con la app</b>: desde cada revisión vas a su norma (RIPCI, REBT, RITE, legionela…) y desde la Norma 8.3-IC a las láminas de señalización.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.14.0 · 06/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
