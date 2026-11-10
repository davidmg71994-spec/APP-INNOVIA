# Inyecta el Calendario PRL en index.html. Se puede repetir. Ejecutar DESPUÉS de informe, inicio y plan (inject.py de cada uno).
import re
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/cal/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*CAL-CSS-START\*/.*?/\*CAL-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*CAL-JS-START\*/.*?/\*CAL-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'cal.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*CAL-CSS-START*/\n'+css+'/*CAL-CSS-END*/\n'+h[i:]
js=open(D+'cal.js',encoding='utf-8').read().replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*CAL-JS-START*/\n'+js+'\n/*CAL-JS-END*/\ninitSen();\ninitInstall();\n})();')
# navegación
once("['cal', '#view-cal', '#tab-cal']",
"['plan', '#view-plan', '#tab-plan']].forEach(",
"['plan', '#view-plan', '#tab-plan'], ['cal', '#view-cal', '#tab-cal']].forEach(")
once("CAL_API.onTab(t)",
"  if (window.PLAN_API) PLAN_API.onTab(t);\n",
"  if (window.PLAN_API) PLAN_API.onTab(t);\n  if (window.CAL_API) CAL_API.onTab(t);\n")
once("CAL_API.atras()",
"  if (window.PLAN_API && PLAN_API.atras()) return true;\n",
"  if (window.PLAN_API && PLAN_API.atras()) return true;\n  if (window.CAL_API && CAL_API.atras()) return true;\n")
# copia de seguridad
once("calendario:window.CAL_API",
"planes:window.PLAN_API ? PLAN_API.lista() : [], perfil:",
"planes:window.PLAN_API ? PLAN_API.lista() : [], calendario:window.CAL_API ? CAL_API.lista() : [], perfil:")
once("const calC = ",
"  const planesC = window.PLAN_API ? PLAN_API.lista() : [];\n  if (!HIST.length && !infs.length && !planesC.length) { toast('No hay registros que exportar.'); return; }",
"  const planesC = window.PLAN_API ? PLAN_API.lista() : [];\n  const calC = window.CAL_API ? CAL_API.lista() : [];\n  if (!HIST.length && !infs.length && !planesC.length && !calC.length) { toast('No hay registros que exportar.'); return; }")
once("calImp = 0",
"  let malos = 0, planesImp = 0;",
"  let malos = 0, planesImp = 0, calImp = 0;")
once("CAL_API.importar(j.calendario)",
"      if (!valid.length && !infs.length && !(j.planes || []).length) throw new Error('vacío');",
"      if (!Array.isArray(j) && Array.isArray(j.calendario) && j.calendario.length && window.CAL_API) calImp += await CAL_API.importar(j.calendario);\n      if (!valid.length && !infs.length && !(j.planes || []).length && !(j.calendario || []).length) throw new Error('vacío');")
once("calImp && plural",
"  if (!porId.size && !infPorId.size && !malos) { toast(planesImp ? `Importadas ${plural(planesImp, 'planificación', 'planificaciones')}.` : 'Las planificaciones de la copia ya están al día.'); return; }",
"  if (!porId.size && !infPorId.size && !malos) { const tx = [planesImp && plural(planesImp, 'planificación', 'planificaciones'), calImp && plural(calImp, 'tarea del calendario', 'tareas del calendario')].filter(Boolean); toast(tx.length ? `Importadas: ${tx.join(' y ')}.` : 'La copia ya está al día en este móvil.'); return; }")
# versión
if "{v:'1.12.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.12.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.12.0', fecha:'06/11/2026', items:[
    '<b>Calendario PRL</b>: desde Inicio, tu propio calendario de tareas. Empieza en blanco y añades las tuyas, cada una con su contrato y su tipo.',
    '<b>Tareas que se repiten</b>: además de las sueltas, las que tocan cada semana, mes, 3 meses, 4 meses, 6 meses o año. Las ideas rápidas te rellenan las habituales (visitas a tajo, índices, revisiones, comités…) y tú decides la fecha.',
    '<b>Agenda</b>: vencidas arriba en rojo, lo de hoy, los próximos 7 días y lo que viene hasta 30 días. Con ✓ la marcas como hecha.',
    '<b>Vista de mes</b>: un punto de color por tarea en cada día; pulsa un día para ver y marcar sus tareas.',
    '<b>Copia de seguridad</b>: el calendario entra en la copia y se recupera al importarla.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.12.0 · 06/11/2026",h,count=1)
# 1.26.0 · calendario más sencillo (se añade aquí porque el código es del calendario; las versiones anteriores ya están dentro)
if "{v:'1.26.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.26.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.26.0', fecha:'10/11/2026', items:[
    '<b>Calendario más sencillo</b>: arriba un resumen corto (vencidas, hoy y esta semana) y tres pestañas: <b>Pendientes</b>, <b>Mes</b> y <b>Mis tareas</b>.',
    '<b>Mis tareas</b>: todas tus tareas en una lista, con «Añadir tarea» arriba y «Quitar» en cada una.',
    'Menos ruido: sin bandas de colores ni leyenda; en el mes, cada día dice cuántas tareas le quedan (en rojo si se pasó la fecha).',
    'Añadir una tarea es más corto: qué, cuándo y si se repite. El tipo, «hasta» y las notas quedan en «Más opciones».'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.26.0 · 10/11/2026",h,count=1)
if "{v:'1.26.1'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.26.1';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.26.1', fecha:'10/11/2026', items:[
    '<b>Calendario › Mes</b>: en el ordenador (y en pantallas anchas) cada día enseña en pequeño lo que toca, hasta 3 tareas y «+N más». Lo vencido en rojo y lo hecho tachado. En el móvil sigue el número de tareas del día.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.26.1 · 10/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
