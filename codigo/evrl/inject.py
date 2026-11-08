# Inyecta la EVRL (modelo INNOVIA) en index.html. Se puede repetir. Ejecutar DESPUÉS de informe, inicio, plan, cal, rev y norma.
import re, json, base64
IDX='/home/claude/pwa/registro-rp/index.html'
D='/home/claude/pwa/evrl/'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:90])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
def once(marker,a,b):
    if marker not in h: rep(a,b)
h=re.sub(r'\n?/\*EVRL-CSS-START\*/.*?/\*EVRL-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*EVRL-JS-START\*/.*?/\*EVRL-JS-END\*/\n?','\n',h,flags=re.S)
css=open(D+'evrl.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*EVRL-CSS-START*/\n'+css+'/*EVRL-CSS-END*/\n'+h[i:]
datos=json.load(open(D+'datos.json',encoding='utf-8'))
dj=json.dumps(datos,ensure_ascii=False,separators=(',',':')).replace('</','<\\/').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
tpl=base64.b64encode(open(D+'plantilla.docx','rb').read()).decode()
js=open(D+'evrl.js',encoding='utf-8').read().replace('</script','<\\/script')
js=js.replace('/*EVRL-DATOS*/','const DATA = '+dj+';\nconst TPL_B64 = \''+tpl+'\';')
rep('initSen();\ninitInstall();\n})();','/*EVRL-JS-START*/\n'+js+'\n/*EVRL-JS-END*/\ninitSen();\ninitInstall();\n})();')
once("['evrl', '#view-evrl', '#tab-evrl']",
"['norma', '#view-norma', '#tab-norma']].forEach(",
"['norma', '#view-norma', '#tab-norma'], ['evrl', '#view-evrl', '#tab-evrl']].forEach(")
once("EVRL_API.onTab(t)",
"  if (window.NORMA_API) NORMA_API.onTab(t);\n",
"  if (window.NORMA_API) NORMA_API.onTab(t);\n  if (window.EVRL_API) EVRL_API.onTab(t);\n")
once("EVRL_API.atras()",
"  if (window.NORMA_API && NORMA_API.atras()) return true;\n",
"  if (window.NORMA_API && NORMA_API.atras()) return true;\n  if (window.EVRL_API && EVRL_API.atras()) return true;\n")
# copia de seguridad
once("evrl:window.EVRL_API",
"revisiones:window.REV_API ? await REV_API.exportar() : null, perfil:",
"revisiones:window.REV_API ? await REV_API.exportar() : null, evrl:window.EVRL_API ? EVRL_API.lista() : [], perfil:")
once("EVRL_API.lista().length)",
"&& !(window.REV_API && REV_API.lista().length)) {",
"&& !(window.REV_API && REV_API.lista().length) && !(window.EVRL_API && EVRL_API.lista().length)) {")
once("evrlImp = 0",
"  let malos = 0, planesImp = 0, calImp = 0, revImp = 0;",
"  let malos = 0, planesImp = 0, calImp = 0, revImp = 0, evrlImp = 0;")
once("EVRL_API.importar(j.evrl)",
"      if (!Array.isArray(j) && j.revisiones && typeof j.revisiones === 'object' && window.REV_API) revImp += await REV_API.importar(j.revisiones);\n",
"      if (!Array.isArray(j) && j.revisiones && typeof j.revisiones === 'object' && window.REV_API) revImp += await REV_API.importar(j.revisiones);\n      if (!Array.isArray(j) && Array.isArray(j.evrl) && j.evrl.length && window.EVRL_API) evrlImp += await EVRL_API.importar(j.evrl);\n")
once("!(j.evrl || []).length",
"&& !(j.revisiones && (j.revisiones.revs || []).length)) throw new Error('vacío');",
"&& !(j.revisiones && (j.revisiones.revs || []).length) && !(j.evrl || []).length) throw new Error('vacío');")
once("evrlImp && plural",
"revImp && plural(revImp, 'revisión', 'revisiones')].filter(Boolean)",
"revImp && plural(revImp, 'revisión', 'revisiones'), evrlImp && plural(evrlImp, 'evaluación de riesgos', 'evaluaciones de riesgos')].filter(Boolean)")
if "{v:'1.15.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.15.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.15.0', fecha:'06/11/2026', items:[
    '<b>Evaluación de riesgos (EVRL)</b>: en Documentos › EVRL y en Inicio, el modelo INNOVIA (I-CORP 20A-3) por puesto de trabajo: 41 riesgos con su valoración y sus medidas, y las plantillas de operarios, oficina, campo y jefes.',
    '<b>Por puesto</b>: marcas los riesgos que aplican, ajustas posibilidad, severidad y riesgo antes y después de las medidas, eliges las medidas del modelo y añades las tuyas o riesgos que no estén en la lista.',
    '<b>Word con el formato del modelo</b>: portada, índice de puestos y una tabla por puesto, igual que la EVRL de INNOVIA.',
    '<b>Varias EVRL</b>, cada una con su contrato. Se guardan solas en el móvil, entran en la copia de seguridad y se pueden guardar o abrir como proyecto (.json), también los de la herramienta EVRL INNOVIA.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.15.0 · 06/11/2026",h,count=1)
if "{v:'1.16.0'" not in h:
    h=re.sub(r"const APP_VER = '[^']+';","const APP_VER = '1.16.0';",h,count=1)
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.16.0', fecha:'07/11/2026', items:[
    '<b>Inicio nuevo</b>: tres anillos con las visitas del mes, las medidas aplicadas de la planificación y las revisiones al día. Al tocar cada uno vas a su apartado.',
    '<b>Hoy y vencidas</b>: en una sola lista, lo vencido y lo de hoy del calendario, las revisiones que vencen y las medidas de la planificación que vencen en 30 días. Al tocar una línea se abre esa tarea, revisión o medida.',
    '<b>Deficiencias por mes</b>: gráfico de los últimos 6 meses del contrato activo, con la tendencia y la deficiencia que más se repite.',
    '<b>Apartados con color</b>: los nueve apartados en una cuadrícula, cada uno con su color y un aviso rojo cuando hay algo vencido.'
  ]},
""")
    h=re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+","Versión de la app: 1.16.0 · 07/11/2026",h,count=1)
open(IDX,'w',encoding='utf-8').write(h)
print('ok', len(h))
