# Inyecta la Planificación preventiva en index.html. Se puede repetir. Ejecutar DESPUÉS de informe/inject.py e inicio/inject.py.
import re, base64
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/plan/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*PLAN-CSS-START\*/.*?/\*PLAN-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*PLAN-JS-START\*/.*?/\*PLAN-JS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?<!--PLAN-TPL-START-->.*?<!--PLAN-TPL-END-->\n?','\n',h,flags=re.S)
css=open(D+'plan.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*PLAN-CSS-START*/\n'+css+'/*PLAN-CSS-END*/\n'+h[i:]
tpl=base64.b64encode(open(D+'plantilla.xlsx','rb').read()).decode()
rep('<!--INF-JS-END-->\n','<!--INF-JS-END-->\n<!--PLAN-TPL-START-->\n<script>const PLAN_TPL="'+tpl+'";</script>\n<!--PLAN-TPL-END-->\n')
js=open(D+'plan.js',encoding='utf-8').read().replace('</script','<\\/script')
rep('initSen();\ninitInstall();\n})();','/*PLAN-JS-START*/\n'+js+'\n/*PLAN-JS-END*/\ninitSen();\ninitInstall();\n})();')
# navegación
once("['plan', '#view-plan', '#tab-plan']",
"['inf', '#view-inf', '#tab-inf']].forEach(",
"['inf', '#view-inf', '#tab-inf'], ['plan', '#view-plan', '#tab-plan']].forEach(")
once("PLAN_API.onTab(t)",
"  if (window.INI_API) INI_API.onTab(t);\n",
"  if (window.INI_API) INI_API.onTab(t);\n  if (window.PLAN_API) PLAN_API.onTab(t);\n")
once("PLAN_API.atras()",
"  if (window.INI_API && INI_API.atras()) return true;\n",
"  if (window.INI_API && INI_API.atras()) return true;\n  if (window.PLAN_API && PLAN_API.atras()) return true;\n")
# el Excel también se puede abrir al guardarlo en el móvil
once("spreadsheetml/.test(",
"const esPdf = (blob.type || '') === 'application/pdf' || /wordprocessingml/.test(blob.type || '');",
"const esPdf = (blob.type || '') === 'application/pdf' || /wordprocessingml|spreadsheetml/.test(blob.type || '');")
# copia de seguridad
once("planes:window.PLAN_API",
"registros:HIST, informes:infs, perfil:",
"registros:HIST, informes:infs, planes:window.PLAN_API ? PLAN_API.lista() : [], perfil:")
once("const planesC = ",
"  const infs = window.INF_API ? INF_API.lista() : [];\n  if (!HIST.length && !infs.length) { toast('No hay registros que exportar.'); return; }",
"  const infs = window.INF_API ? INF_API.lista() : [];\n  const planesC = window.PLAN_API ? PLAN_API.lista() : [];\n  if (!HIST.length && !infs.length && !planesC.length) { toast('No hay registros que exportar.'); return; }")
once("planesImp",
"  const porId = new Map(), infPorId = new Map();\n  let malos = 0;",
"  const porId = new Map(), infPorId = new Map();\n  let malos = 0, planesImp = 0;")
once("PLAN_API.importar(j.planes)",
"      if (!valid.length && !infs.length) throw new Error('vacío');",
"      if (!Array.isArray(j) && Array.isArray(j.planes) && j.planes.length && window.PLAN_API) planesImp += await PLAN_API.importar(j.planes);\n      if (!valid.length && !infs.length && !(j.planes || []).length) throw new Error('vacío');")
once("if (!porId.size && !infPorId.size && !malos)",
"  if (!porId.size && infPorId.size) {",
"  if (!porId.size && !infPorId.size && !malos) { toast(planesImp ? `Importadas ${plural(planesImp, 'planificación', 'planificaciones')}.` : 'Las planificaciones de la copia ya están al día.'); return; }\n  if (!porId.size && infPorId.size) {")
# versión
if "{v:'1.9.0'" not in h:
    rep("const APP_VER = '1.8.0';","const APP_VER = '1.9.0';")
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.9.0', fecha:'06/11/2026', items:[
    '<b>Planificación preventiva</b>: desde Inicio, la tabla de seguimiento de medidas correctoras de cada contrato y año. Empieza en blanco y vas añadiendo medidas con las 10 columnas de siempre.',
    '<b>Cada medida con su origen</b>: al añadirla eliges de dónde viene, con los colores de la leyenda: actividad periódica PRL o CA-MA, visita del Responsable SPP/MA, auditoría o deficiencia de una visita.',
    '<b>Plazos a la vista</b>: la app calcula cuándo vence cada medida y marca las vencidas; al poner la fecha de aplicación queda como aplicada.',
    '<b>Deficiencias de tus visitas</b>: con un toque pasan a la tabla como filas blancas.',
    '<b>Sale en Excel</b>: con el formato de Innovia, cada fila con el color de su origen y la leyenda debajo.'
  ]},
""")
    rep("Versión de la app: 1.8.0 · 06/11/2026","Versión de la app: 1.9.0 · 06/11/2026")
if "{v:'1.10.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.10.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.10.0', fecha:'06/11/2026', items:[
    '<b>Nueva barra de abajo</b>: Inicio, Visitas, Documentos, Consulta y Perfil. Dentro de cada sección, arriba, eliges el apartado: Registro o Historial; Informe o Planificación; Señalización.',
    '<b>Perfil a un toque</b>: tus datos y tus contratos tienen su propio botón abajo.',
    '<b>Primera vez</b>: quien instala la app la configura en 3 pasos (su nombre, su contrato y su primera visita). También se abre desde Inicio › Configurar mi perfil.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.10.0 · 06/11/2026",h,count=1)
if "{v:'1.11.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.11.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.11.0', fecha:'06/11/2026', items:[
    '<b>«✓ Aplicada» en cada medida</b>: en la planificación marcas una medida como aplicada (con la fecha de hoy) sin entrar en ella. Si te equivocas, «Deshacer».',
    '<b>Las vencidas, arriba</b>: la lista se ordena en Vencidas, Pendientes (por fecha de vencimiento) y Aplicadas.',
    '<b>Vista por meses</b>: con «Por meses» ves qué vence cada mes del año, con una tira de los 12 meses en colores (rojo con vencidas, naranja pendientes, verde todo aplicado).'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.11.0 · 06/11/2026",h,count=1)
if "{v:'1.11.1'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.11.1';",h,count=1)
    rep("const NOVEDADES = [\n","const NOVEDADES = [\n  {v:'1.11.1', fecha:'06/11/2026', items:[\n    '<b>Limpieza interna</b>: la plantilla del informe de seguimiento ya no guarda datos del informe que se usó de modelo. El Word que sale es el mismo.'\n  ]},\n")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.11.1 · 06/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
