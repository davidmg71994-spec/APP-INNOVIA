# Inyecta «Pasar visitas al ordenador, a mano» (1.28.0) en index.html y QUITA la sincronización automática. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, tareas, panel, aspecto y, siempre el último, seg (pone la CSP).
# (sync/inject.py ya no se ejecuta: su código se queda en sync/ como archivo.)
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/pasar/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

# 1. fuera la sincronización automática
h = re.sub(r'\n?/\*SYNC-CSS-START\*/.*?/\*SYNC-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*SYNC-JS-START\*/.*?/\*SYNC-JS-END\*/\n?', '\n', h, flags=re.S)

# 2. código y estilos
h = re.sub(r'\n?/\*PASAR-CSS-START\*/.*?/\*PASAR-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*PASAR-JS-START\*/.*?/\*PASAR-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'pasar.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*PASAR-CSS-START*/\n' + css + '/*PASAR-CSS-END*/\n' + h[i:]
js = open(D + 'pasar.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*PASAR-JS-START*/\n' + js + '\n/*PASAR-JS-END*/\ninitSen();\ninitInstall();\n})();')

# 3. en el Historial, debajo de la copia de seguridad
h = re.sub(r'\n?<!--PASAR-START-->.*?<!--PASAR-END-->', '', h, flags=re.S)
rep('''    <input type="file" id="imp-file" accept="application/json,.json" multiple hidden>
  </section>
''', '''    <input type="file" id="imp-file" accept="application/json,.json" multiple hidden>
  </section>
<!--PASAR-START-->
  <section class="backup xv-sec" id="xv-sec">
    <div><b>Pasar visitas al ordenador</b><span>Solo viajan las visitas, y solo cuando tú lo haces. Del ordenador no llega nada al móvil.</span>
      <ol class="xv-pasos"><li>En el móvil: <b>Exportar visitas</b> y guarda el archivo en tu carpeta de Dropbox (u OneDrive).</li><li>En el ordenador: <b>Importar visitas</b> y elige ese archivo. Las que ya tengas no se duplican.</li></ol></div>
    <div class="backup-b"><button type="button" class="mini" data-xv="export">Exportar visitas</button><button type="button" class="mini" data-hact="import">Importar visitas</button></div>
  </section>
<!--PASAR-END-->
''')

# 4. lo que se borra aquí queda apuntado (para que no vuelva al importar)
a = "    async del(id) { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('registros', 'readwrite'); t.objectStore('registros').delete(id);"
if "async del(id) { visMarcarBorrada(id); const d = await open(); return new Promise((res, rej) => { const t = d.transaction('registros', 'readwrite');" not in h:
    rep(a, a.replace('async del(id) { const d', 'async del(id) { visMarcarBorrada(id); const d'))

# 5. al importar: las borradas aquí no vuelven (salvo que se marque)
if 'const borradas = [...porId.values()]' not in h:
    rep("  const todos = [...porId.values()];\n",
        "  const borradas = [...porId.values()].filter(r => !actual.has(r.id) && visBorrada(r));\n  const todos = [...porId.values()].filter(r => !borradas.includes(r));\n")
    rep("""  if (!aImportar.length) { await ask({title:'Nada que importar', body, yes:'Entendido', single:true}); return; }
  if (!(await ask({title:'¿Importar la copia?', body, yes:'Importar'}))) return;
""", """  /* 1.28.0: lo borrado en este equipo no vuelve, salvo que se marque */
  const bodyB = borradas.length ? `<p>${borradas.length === 1 ? '1 visita la borraste' : borradas.length + ' visitas las borraste'} en este equipo: no ${borradas.length === 1 ? 'se vuelve' : 'se vuelven'} a importar.</p><label class="xv-chk"><input type="checkbox" id="xv-borradas"> Importar${borradas.length === 1 ? 'la' : 'las'} también</label>` : '';
  if (!aImportar.length && !borradas.length) { await ask({title:'Nada que importar', body, yes:'Entendido', single:true}); return; }
  XV_TAMBIEN = false;
  if (!(await ask({title:aImportar.length ? '¿Importar la copia?' : 'Nada nuevo que importar', body:body + bodyB, yes:aImportar.length ? 'Importar' : 'Aceptar', no:'Cancelar'}))) return;
  if (XV_TAMBIEN) { borradas.forEach(r => { visDesmarcar(r.id); aImportar.push(r); }); }
  if (!aImportar.length) return;
""")

# 5a. (1.28.1) un archivo vacío (descarga a medias) se explica en vez de «no es una copia válida»
if 'let xvVacios = 0;' not in h:
    rep("""  for (const f of files) {
    try {
      let j = JSON.parse(await f.text());""", """  let xvVacios = 0;
  for (const f of files) {
    if (!f.size) { xvVacios++; malos++; continue; }
    try {
      let j = JSON.parse(await f.text());""")
    rep("""  if (!porId.size) { toast(files.length === 1 ? 'El archivo no es una copia válida de Registro RP.' : 'Ninguno de los archivos es una copia válida de Registro RP.'); return; }""",
        """  if (!porId.size && xvVacios === files.length) { await ask({title:files.length === 1 ? 'El archivo está vacío' : 'Los archivos están vacíos', single:true, yes:'Entendido', body:`<p>${files.length === 1 ? esc(files[0].name) + ' tiene 0 bytes' : 'Todos tienen 0 bytes'}: no se terminó de descargar (o de subir a Dropbox desde el móvil).</p><p>Vuelve a descargarlo y elige el que pese algo (en Descargas puede llamarse igual con «(1)» al final).</p>`}); return; }
  if (!porId.size) { toast(files.length === 1 ? 'El archivo no es una copia válida de Visitas PRL.' : 'Ninguno de los archivos es una copia válida de Visitas PRL.'); return; }""")

# 5b. textos: la copia de seguridad ya no es la forma de pasar visitas al ordenador
h = h.replace("Exporta una copia de vez en cuando y antes de cambiar de teléfono. También sirve para pasar registros a otro dispositivo.</span>",
              "Exporta una copia de vez en cuando y antes de cambiar de teléfono.</span>")

# 6. novedades
if "{v:'1.28.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.28.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.28.0', fecha:'11/11/2026', items:[
    '<b>Pasar visitas al ordenador, a mano</b>: en Visitas › Historial, en el móvil pulsa <b>«Exportar visitas»</b> y guarda el archivo en Dropbox (u OneDrive); en el ordenador pulsa <b>«Importar visitas»</b> y elige ese archivo. Solo viajan las visitas y del ordenador no llega nada al móvil.',
    'Se quita la sincronización automática: ya nada se pasa solo entre el móvil y el ordenador.',
    'Las visitas que borres en el ordenador no vuelven a aparecer al importar (si quieres recuperarlas, márcalo al importar).'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.28.0 · 11/11/2026", h, count=1)

if "{v:'1.28.1'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.28.1';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.28.1', fecha:'11/11/2026', items:[
    'Al importar, si el archivo está vacío (0 bytes, una descarga a medias) la app te lo dice y te explica qué hacer, en vez de «no es una copia válida».'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.28.1 · 11/11/2026", h, count=1)
open(IDX, 'w', encoding='utf-8').write(h)
print('pasar ok', len(h))
