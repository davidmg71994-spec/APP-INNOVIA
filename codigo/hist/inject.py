# Inyecta «Historial ordenado por meses» (1.29.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, hist, tareas, ult, panel, aspecto y, siempre el último, seg (pone la CSP).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/hist/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

h = re.sub(r'\n?/\*HIST-CSS-START\*/.*?/\*HIST-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*HIST-JS-START\*/.*?/\*HIST-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'hist.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*HIST-CSS-START*/\n' + css + '/*HIST-CSS-END*/\n' + h[i:]
js = open(D + 'hist.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*HIST-JS-START*/\n' + js + '\n/*HIST-JS-END*/\ninitSen();\ninitInstall();\n})();')

# cabecera: filtro «Con incidencias» y total
if 'id="hx-inc"' not in h:
    rep('''    <input type="search" id="h-q" placeholder="Buscar por nº, obra, fecha o técnico" aria-label="Buscar en el historial">
''', '''    <input type="search" id="h-q" placeholder="Buscar por obra, fecha, mes, nº o técnico" aria-label="Buscar en el historial">
    <div class="hx-bar"><button type="button" class="chip" id="hx-inc" aria-pressed="false">Con incidencias</button><span class="hx-tot" id="hx-tot" aria-live="polite"></span></div>
''')

# renderHist: filtro, búsqueda por mes y lista agrupada
if 'box.innerHTML = histAgrupado(list, cf, q);' not in h:
    rep("  const q = ($('#h-q').value || '').trim().toLowerCase();\n  if (window.INI_API) INI_API.chipsHist();",
        "  const q = ($('#h-q').value || '').trim().toLowerCase();\n  { const t = $('#hx-tot'); if (t) t.textContent = ''; }\n  if (window.INI_API) INI_API.chipsHist();")
    rep("  const list = base.filter(r => !q || [r.codigo, r.rp?.ubicacion, r.rp?.nombre, fmtDate(r.rp?.fecha), r.rp?.fecha, r.contrato?.nombre].join(' ').toLowerCase().includes(q));",
        "  const list = base.filter(r => !q || [r.codigo, r.rp?.ubicacion, r.rp?.nombre, fmtDate(r.rp?.fecha), r.rp?.fecha, r.contrato?.nombre, hxMesTxt(r)].join(' ').toLowerCase().includes(q)).filter(r => !HX_INC || ((r.resumen || {}).inc > 0));")
    rep("  if (!list.length) { box.innerHTML = '<div class=\"empty\"><b>Sin resultados</b><span>Ningún registro coincide con la búsqueda.</span></div>'; return; }",
        "  if (!list.length) { box.innerHTML = `<div class=\"empty\"><b>Sin resultados</b><span>${HX_INC ? 'Ninguna visita con incidencias' + (q ? ' coincide con la búsqueda' : '') + '.' : 'Ningún registro coincide con la búsqueda.'}</span></div>`; return; }")
    i = h.index('  box.innerHTML = list.map(r => {\n    const s = r.resumen || {}, nInc = s.inc || 0;')
    j = h.index("  }).join('');\n}", i)
    h = h[:i] + '  box.innerHTML = histAgrupado(list, cf, q);   /* 1.29.0: por años y meses */\n}' + h[j + len("  }).join('');\n}"):]

if "{v:'1.29.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.29.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.29.0', fecha:'12/11/2026', items:[
    '<b>Historial más ordenado</b>: las visitas se agrupan por año y mes. Cada mes es un desplegable con cuántas visitas tiene y cuántas con incidencias; el más reciente sale abierto.',
    'Cada visita ocupa una línea: el día, la obra y su estado. Tócala para ver sus datos y los botones (Abrir, PDF, Duplicar, Eliminar). En el ordenador, el detalle sale a la derecha.',
    'Nuevo filtro <b>«Con incidencias»</b>, y el buscador encuentra también por mes (por ejemplo, «octubre»).'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.29.0 · 12/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('hist ok', len(h))
