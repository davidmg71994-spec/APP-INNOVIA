# Inyecta «Privacidad y seguridad» (1.18.0) en index.html. Se puede repetir.
# Ejecutar el ÚLTIMO: informe, inicio, plan, cal, rev, norma, evrl, pss y seg.
# Al final pone la política de seguridad del contenido (CSP) con la huella de cada script.
import re, base64, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csp

IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/seg/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)
def once(marker, a, b):
    if marker not in h: rep(a, b)

# --- limpiar lo de una pasada anterior ---
h = re.sub(r'\n?/\*SEG-CSS-START\*/.*?/\*SEG-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*SEG-JS-START\*/.*?/\*SEG-JS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'/\*SEG-FONTS-START\*/.*?/\*SEG-FONTS-END\*/\n?', '', h, flags=re.S)
h = re.sub(r'<script>/\*SEG-HEAD\*/.*?</script>\n', '', h, flags=re.S)

# --- 1. letras dentro de la app (sin Google Fonts) ---
h = re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n', '', h)
h = re.sub(r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n', '', h)
h = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2[^"]*">\n', '', h)
def ff(fam, peso, archivo):
    d = base64.b64encode(open(D + 'fonts/' + archivo, 'rb').read()).decode()
    return '@font-face{font-family:"%s";font-style:normal;font-weight:%s;font-display:swap;src:url(data:font/woff;base64,%s) format("woff")}\n' % (fam, peso, d)
fuentes = ('/*SEG-FONTS-START*/\n/* Montserrat, Source Sans 3 e IBM Plex Mono (SIL Open Font License 1.1), dentro de la app: no se cargan de internet */\n'
           + ff('Montserrat', '500 700', 'montserrat.woff') + ff('Source Sans 3', '400 700', 'sourcesans3.woff')
           + ff('IBM Plex Mono', '400', 'plexmono-400.woff') + ff('IBM Plex Mono', '500', 'plexmono-500.woff') + '/*SEG-FONTS-END*/\n')
i = h.find('<style>') + len('<style>\n')
h = h[:i] + fuentes + h[i:]

# --- 2. cabecera: sin referer y bloqueo antes de pintar nada ---
once('<meta name="referrer"', '<meta name="viewport"', '<meta name="referrer" content="no-referrer">\n<meta name="viewport"')
cab = "<script>/*SEG-HEAD*/try{var c=JSON.parse(localStorage.getItem('seg-cfg')||'null');if((!c||c.lock!==false)&&(window.AndroidApp||localStorage.getItem('seg-pin')))document.documentElement.classList.add('seg-lk')}catch(e){}</script>\n"
i = h.find('<style>')
h = h[:i] + cab + h[i:]

# --- 3. CSS y JS del módulo ---
css = open(D + 'seg.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*SEG-CSS-START*/\n' + css + '/*SEG-CSS-END*/\n' + h[i:]
js = open(D + 'seg.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*SEG-JS-START*/\n' + js + '\n/*SEG-JS-END*/\ninitSen();\ninitInstall();\n})();')

# --- 4. navegación ---
once("['seg', '#view-seg', '#tab-seg']",
     "['pss', '#view-pss', '#tab-pss']].forEach(",
     "['pss', '#view-pss', '#tab-pss'], ['seg', '#view-seg', '#tab-seg']].forEach(")
once("SEG_API.onTab(t)",
     "  if (window.PSS_API) PSS_API.onTab(t);\n",
     "  if (window.PSS_API) PSS_API.onTab(t);\n  if (window.SEG_API) SEG_API.onTab(t);\n")
once("SEG_API.bloqueada()",
     "window.appBack = () => {\n",
     "window.appBack = () => {\n  if (window.SEG_API && SEG_API.bloqueada()) return false;\n")
once("SEG_API.atras()",
     "  if (window.PSS_API && PSS_API.atras()) return true;\n",
     "  if (window.SEG_API && SEG_API.atras()) return true;\n  if (window.PSS_API && PSS_API.atras()) return true;\n")

# --- 5. código de verificación al guardar, en el Historial y en el PDF ---
once("SEG_API.sellar(rec",
     "    const rec = toLocal(S); rec.id = id;\n    await hdb.put(rec);",
     "    const rec = toLocal(S); rec.id = id;\n    if (window.SEG_API) await SEG_API.sellar(rec, HIST.find(x => x.id === id));\n    await hdb.put(rec);")
once("const copia = await copiaAutomatica(rec);",
     "    const copia = copiaAutomatica(rec);",
     "    const copia = await copiaAutomatica(rec);")
once("SEG_API.histLinea(r)",
     '      <div class="hbtns">\n        <button type="button" class="mini" data-hact="open"',
     '      ${window.SEG_API ? SEG_API.histLinea(r) : \'\'}<div class="hbtns">\n        <button type="button" class="mini" data-hact="open"')
once("const segCod",
     "  const foot = wrap(`Obra / tajo: ${r.rp.ubicacion || '-'}`",
     "  const segCod = pdfSafe(window.SEG_API ? SEG_API.codigoPdf(r) : '');\n  const foot = wrap(`Obra / tajo: ${r.rp.ubicacion || '-'}`")
once("if (segCod) p.drawText",
     "    p.drawText(gen, {x:W - M - F.widthOfTextAtSize(gen, 7.5), y:22, size:7.5, font:F, color:C.muted});\n",
     "    p.drawText(gen, {x:W - M - F.widthOfTextAtSize(gen, 7.5), y:22, size:7.5, font:F, color:C.muted});\n    if (segCod) p.drawText(segCod, {x:M, y:12, size:6.5, font:F, color:C.muted});\n")
once("SEG_API.clausula()",
     "  // annex: láminas of the applicable signage examples\n",
     "  { const cl = window.SEG_API ? SEG_API.clausula() : '';\n    if (cl) { const ls = wrap(cl, F, 7, CW); ensure(ls.length * 8.6 + 30); y -= 16; page.drawText('Protección de datos', {x:M, y:y - 8, size:7.5, font:B, color:C.muted}); y -= 12; ls.forEach(l => { page.drawText(l, {x:M, y:y - 7, size:7, font:F, color:C.muted}); y -= 8.6; }); } }\n  // annex: láminas of the applicable signage examples\n")

# --- 6. copias cifradas ---
once("SEG_API.cifrarAuto",
     "function copiaAutomatica(rec, silencio) {\n  if (!copiaAutoDisponible() || !rec) return null;\n  let ok = false;\n  try { ok = !!window.AndroidApp.copiaAuto(nombreCopia(rec), JSON.stringify({app:'registro-rp', version:1, exportado:new Date().toISOString(), registros:[rec]})); } catch (e) { ok = false; }",
     "async function copiaAutomatica(rec, silencio) {\n  if (!copiaAutoDisponible() || !rec) return null;\n  let ok = false;\n  try { let t = JSON.stringify({app:'registro-rp', version:1, exportado:new Date().toISOString(), registros:[rec]}); if (window.SEG_API) t = await SEG_API.cifrarAuto(t); ok = !!window.AndroidApp.copiaAuto(nombreCopia(rec), t); } catch (e) { ok = false; }")
once("if (!(await copiaAutomatica(r, true))) fallos++;",
     "  for (const r of HIST) { if (!copiaAutomatica(r, true)) fallos++;",
     "  for (const r of HIST) { if (!(await copiaAutomatica(r, true))) fallos++;")
once("for (const r of aImportar) await copiaAutomatica(r, true);",
     "    aImportar.forEach(r => copiaAutomatica(r, true));\n",
     "    for (const r of aImportar) await copiaAutomatica(r, true);\n")
once("SEG_API.notaCopias(el)",
     "  else { el.className = 'copia-est ok'; el.textContent = 'Copia automática activada · se hará al guardar el primer registro.'; }\n}",
     "  else { el.className = 'copia-est ok'; el.textContent = 'Copia automática activada · se hará al guardar el primer registro.'; }\n  if (window.SEG_API) SEG_API.notaCopias(el);\n}")
once("SEG_API.prepararCopia(data)",
     "  await entregar(new Blob([data], {type:'application/json'}), `RegistroRP_copia_${isoDate(new Date())}.json`, 'Copia de seguridad', msg);",
     "  const salida = window.SEG_API ? await SEG_API.prepararCopia(data) : data;\n  if (salida == null) return;\n  await entregar(new Blob([salida], {type:'application/json'}), `RegistroRP_copia_${isoDate(new Date())}.json`, 'Copia de seguridad', salida === data ? msg : msg.replace('Para recuperarla:', 'Va cifrada: hace falta la contraseña de las copias. Para recuperarla:'));")
once("SEG_API.entregarCopia",
     "  await entregar(new Blob([salida], {type:'application/json'}), `RegistroRP_copia_${isoDate(new Date())}.json`, 'Copia de seguridad', salida === data ? msg : msg.replace('Para recuperarla:', 'Va cifrada: hace falta la contraseña de las copias. Para recuperarla:'));",
     "  const copiaBlob = new Blob([salida], {type:'application/json'}), copiaNom = `RegistroRP_copia_${isoDate(new Date())}.json`, copiaMsg = salida === data ? msg : msg.replace('Para recuperarla:', 'Va cifrada: hace falta la contraseña de las copias. Para recuperarla:');\n  if (window.SEG_API && SEG_API.entregarCopia) await SEG_API.entregarCopia(copiaBlob, copiaNom, copiaMsg);\n  else await entregar(copiaBlob, copiaNom, 'Copia de seguridad', copiaMsg);")
once("SEG_API.descifrarCopia(j",
     "      const j = JSON.parse(await f.text());\n",
     "      let j = JSON.parse(await f.text());\n      if (j && !Array.isArray(j) && j.cifrado && window.SEG_API) j = await SEG_API.descifrarCopia(j, f.name);\n")
once("segMal = 0",
     "pssImp = 0;\n",
     "pssImp = 0, segMal = 0;\n")
once("if (err && err.seg) segMal++;",
     "    } catch(err) { malos++; }\n  }\n  if (!porId.size && !infPorId.size && !malos)",
     "    } catch(err) { malos++; if (err && err.seg) segMal++; }\n  }\n  if (!porId.size && !infPorId.size && !malos)")
once("segMal === malos",
     "  if (!porId.size) { toast(files.length === 1 ? 'El archivo no es una copia válida de Registro RP.'",
     "  if (!porId.size && segMal && segMal === malos) { toast('No se abrió la copia cifrada: la contraseña no es correcta o se saltó.'); return; }\n  if (!porId.size) { toast(files.length === 1 ? 'El archivo no es una copia válida de Registro RP.'")
once("SEG_API.sellarImport(r)",
     "    for (const r of aImportar) await hdb.put(r);\n",
     "    for (const r of aImportar) { if (window.SEG_API) await SEG_API.sellarImport(r); await hdb.put(r); }\n")

once("getHIST: () => HIST, buildPdf", "getHIST: () => HIST}", "getHIST: () => HIST, buildPdf}")

# --- 7. novedades y versión ---
if "{v:'1.18.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.18.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.18.0', fecha:'08/11/2026', items:[
    '<b>Bloqueo de la app</b>: se abre con la huella, la cara o el PIN del móvil, y se vuelve a bloquear tras unos minutos fuera. En el ordenador, con un PIN de la app.',
    '<b>Copias cifradas</b>: «Exportar copia» y las copias automáticas de Descargas van cifradas con tu contraseña (AES-256). Sin ella nadie puede abrirlas.',
    '<b>Código de verificación</b> en cada registro, en el Historial y al pie del PDF. Si alguien cambia el registro, queda como una versión nueva.',
    '<b>Privacidad y seguridad</b>, en tu Perfil: el estado de todo, comprobar un código, el texto de protección de datos para los PDF y borrar datos antiguos o todo el móvil.',
    '<b>Más blindaje</b>: la app no se conecta a nada de fuera (las letras ya van dentro) y solo ejecuta su propio código.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.18.0 · 08/11/2026", h, count=1)
if "{v:'1.18.1'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.18.1';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.18.1', fecha:'09/11/2026', items:[
    '<b>Copia fuera del móvil</b>: Inicio te recuerda cada 7 días (lo cambias en Privacidad y seguridad) guardar una copia en OneDrive, SharePoint o el correo de la empresa. Al exportar, «Compartir» y eliges OneDrive; en el ordenador, «Guardar en…» y tu carpeta de OneDrive.',
    '<b>Contraseña de las copias desde el principio</b>: en el móvil la app la pide al abrirse si aún no la tienes, para que ninguna copia quede sin cifrar.',
    '<b>Misma contraseña en el ordenador</b>: al importar una copia cifrada en un dispositivo sin contraseña, se queda la de esa copia.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.18.1 · 09/11/2026", h, count=1)

# --- 8. política de seguridad del contenido ---
sys.path.insert(0, '/home/claude/pwa/aspecto'); import letra
h = letra.escalar_html(h)   # 1.23.0: letra ajustable también en el CSS de este módulo
h = csp.aplicar(h)
open(IDX, 'w', encoding='utf-8').write(h)
print('ok', len(h))
