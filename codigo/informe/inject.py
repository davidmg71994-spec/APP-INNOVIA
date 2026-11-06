import re, json, base64, sys
IDX='/home/claude/pwa/registro-rp/index.html'
h=open(IDX,encoding='utf-8').read()
def rep(a,b,count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: '+a[:80])
    assert h.count(a)==count,(a[:60],h.count(a))
    h=h.replace(a,b)
# ---- bloques inyectados (idempotente)
h=re.sub(r'\n?/\*INF-CSS-START\*/.*?/\*INF-CSS-END\*/\n?','\n',h,flags=re.S)
h=re.sub(r'\n?<!--INF-JS-START-->.*?<!--INF-JS-END-->\n?','\n',h,flags=re.S)
h=re.sub(r'\n?/\*INF-JS-START\*/.*?/\*INF-JS-END\*/\n?','\n',h,flags=re.S)
css=open('informe.css',encoding='utf-8').read()
i=h.rfind('</style>'); h=h[:i]+'/*INF-CSS-START*/\n'+css+'/*INF-CSS-END*/\n'+h[i:]
schema=open('schema.json',encoding='utf-8').read(); protos=open('protos.json',encoding='utf-8').read()
tpl=base64.b64encode(open('plantilla.docx','rb').read()).decode()
jszip=open('jszip.min.js',encoding='utf-8').read().replace('</script','<\\/script')
js=open('informe.js',encoding='utf-8').read()
lib=('<!--INF-JS-START-->\n<script>'+jszip+'</script>\n<script>const INF_SCHEMA='+schema.replace('</','<\\/')+';const INF_PROTOS='+protos.replace('</','<\\/')+';const INF_TPL="'+tpl+'";</script>\n<!--INF-JS-END-->\n')
rep('<script src="pdf-lib.min.js"></script>\n','<script src="pdf-lib.min.js"></script>\n'+lib)
code='/*INF-JS-START*/\n'+js.replace('</script','<\\/script')+'\n/*INF-JS-END*/\n'
rep('initSen();\ninitInstall();\n})();','\n'+code+'initSen();\ninitInstall();\n})();')
# ---- parches en el script principal (una sola vez)
if "['inf', '#view-inf', '#tab-inf']" not in h:
    rep("[['form', '#view-form', '#tab-form'], ['hist', '#view-hist', '#tab-hist'], ['sen', '#view-sen', '#tab-sen']].forEach(([k, v, b]) => { $(v).hidden = t !== k; $(b).setAttribute('aria-selected', t === k); });",
        "[['form', '#view-form', '#tab-form'], ['hist', '#view-hist', '#tab-hist'], ['sen', '#view-sen', '#tab-sen'], ['inf', '#view-inf', '#tab-inf']].forEach(([k, v, b]) => { const ev = $(v), eb = $(b); if (ev) ev.hidden = t !== k; if (eb) eb.setAttribute('aria-selected', t === k); });\n  if (window.INF_API) INF_API.onTab(t);")
if "{v:'1.7.0'" not in h:
    rep("const APP_VER = '1.6.2';","const APP_VER = '1.7.0';")
    rep("const NOVEDADES = [\n","""const NOVEDADES = [
  {v:'1.7.0', fecha:'05/11/2026', items:[
    '<b>Informe de seguimiento</b>: nueva pestaña «Informe» con todos los apartados del informe cuatrimestral de Innovia para ir rellenándolo poco a poco. Se guarda solo.',
    '<b>Las visitas entran solas</b>: eliges las fechas y las visitas del Historial pasan a la fase de la obra, las actividades, el texto de cada visita (con las OBS numeradas), el resumen de hallazgos y el reportaje fotográfico.',
    '<b>Sale en Word</b>: con «Generar el Word» obtienes el informe con el mismo formato que el tuyo, con las casillas SÍ / NO ya marcadas, listo para compartir o guardar.',
    '<b>Informe nuevo a partir del anterior</b>: al crear uno puedes copiar las respuestas del anterior y cambiar solo lo que haya cambiado.'
  ]},
""")
    rep("Versión de la app: 1.6.2 · 29/10/2026","Versión de la app: 1.7.0 · 05/11/2026")
if "wordprocessingml" not in h:
    rep("const esPdf = (blob.type || '') === 'application/pdf';","const esPdf = (blob.type || '') === 'application/pdf' || /wordprocessingml/.test(blob.type || '');")
    rep("Abriendo el PDF…","Abriendo el archivo…")
if 'INF_API.atras' not in h:
    rep("  if ($('#view-form').hidden) { showTab('form'); return true; }","  if (window.INF_API && INF_API.atras()) return true;\n  if ($('#view-form').hidden) { showTab('form'); return true; }")
# copia de seguridad: incluir informes
if 'informes:' not in h.split('async function importBackup')[0].split('async function exportBackup')[1]:
    rep("""  if (!HIST.length) { toast('No hay registros que exportar.'); return; }
  const data = JSON.stringify({app:'registro-rp', version:1, exportado:new Date().toISOString(), registros:HIST});
  const msg = `Copia de seguridad de Visitas PRL con ${plural(HIST.length, 'registro', 'registros')}, del ${fmtDate(isoDate(new Date()))}.\\nPara recuperarla: Historial › Importar copia.`;""",
"""  const infs = window.INF_API ? INF_API.lista() : [];
  if (!HIST.length && !infs.length) { toast('No hay registros que exportar.'); return; }
  const data = JSON.stringify({app:'registro-rp', version:1, exportado:new Date().toISOString(), registros:HIST, informes:infs});
  const msg = `Copia de seguridad de Visitas PRL con ${plural(HIST.length, 'registro', 'registros')}${infs.length ? ' y ' + plural(infs.length, 'informe', 'informes') : ''}, del ${fmtDate(isoDate(new Date()))}.\\nPara recuperarla: Historial › Importar copia.`;""")
    rep("""  const porId = new Map();
  let malos = 0;""","""  const porId = new Map(), infPorId = new Map();
  let malos = 0;""")
    rep("""      const regs = Array.isArray(j) ? j : j.registros;
      if (!Array.isArray(regs)) throw new Error('formato');
      const valid = regs.filter(r => r && typeof r === 'object' && r.id && r.rp && r.resp);
      if (!valid.length) throw new Error('vacío');""","""      const regs = Array.isArray(j) ? j : (j.registros || []);
      if (!Array.isArray(regs)) throw new Error('formato');
      const valid = regs.filter(r => r && typeof r === 'object' && r.id && r.rp && r.resp);
      const infs = (!Array.isArray(j) && Array.isArray(j.informes)) ? j.informes.filter(x => x && x.id && x.v) : [];
      if (!valid.length && !infs.length) throw new Error('vacío');
      infs.forEach(x => { const o = infPorId.get(x.id); if (!o || (x.guardado || 0) > (o.guardado || 0)) infPorId.set(x.id, x); });""")
    rep("""  if (!porId.size) { toast(files.length === 1 ?""","""  if (!porId.size && infPorId.size) {
    const act = new Map((window.INF_API ? INF_API.lista() : []).map(x => [x.id, x]));
    const nuevosI = [...infPorId.values()].filter(x => !act.has(x.id) || (x.guardado || 0) > (act.get(x.id).guardado || 0));
    if (!nuevosI.length) { await ask({title:'Nada que importar', body:'<p>Los informes de la copia ya están al día en este móvil.</p>', yes:'Entendido', single:true}); return; }
    if (!(await ask({title:'¿Importar la copia?', body:`<p>${plural(nuevosI.length, 'informe', 'informes')} de seguimiento.</p>`, yes:'Importar'}))) return;
    await INF_API.importar(nuevosI); toast(`Importados ${plural(nuevosI.length, 'informe', 'informes')}.`); return;
  }
  if (!porId.size) { toast(files.length === 1 ?""")
    rep("""    for (const r of aImportar) await hdb.put(r);
    await loadHist();""","""    for (const r of aImportar) await hdb.put(r);
    if (infPorId.size && window.INF_API) { const act = new Map(INF_API.lista().map(x => [x.id, x])); await INF_API.importar([...infPorId.values()].filter(x => !act.has(x.id) || (x.guardado || 0) > (act.get(x.id).guardado || 0))); }
    await loadHist();""")
open(IDX,'w',encoding='utf-8').write(h)
print('ok',len(h)//1024,'KB')
