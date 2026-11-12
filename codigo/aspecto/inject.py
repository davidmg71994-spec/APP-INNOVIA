# Inyecta «Aspecto: tema y tamaño de la letra» (1.23.0) en index.html. Se puede repetir.
# Orden: informe, inicio, plan, cal, rev, norma, evrl, pss, esc, manos, pasar, hist, tareas, ult, panel, aspecto y, siempre el último, seg (pone la CSP).
# Va casi al final porque pasa los tamaños de letra de TODO el CSS de la página a calc(Npx*var(--fz,1)):
# si después se vuelve a inyectar otro módulo, hay que volver a pasar este (es idempotente).
import re
IDX = '/home/claude/pwa/registro-rp/index.html'
D = '/home/claude/pwa/aspecto/'
h = open(IDX, encoding='utf-8').read()

def rep(a, b, count=1):
    global h
    if a not in h: raise SystemExit('NO ENCONTRADO: ' + a[:100])
    assert h.count(a) == count, (a[:70], h.count(a))
    h = h.replace(a, b)

# 1. CSS y JS del módulo
h = re.sub(r'\n?/\*ASP-CSS-START\*/.*?/\*ASP-CSS-END\*/\n?', '\n', h, flags=re.S)
h = re.sub(r'\n?/\*ASP-JS-START\*/.*?/\*ASP-JS-END\*/\n?', '\n', h, flags=re.S)
css = open(D + 'aspecto.css', encoding='utf-8').read()
i = h.rfind('</style>'); h = h[:i] + '/*ASP-CSS-START*/\n' + css + '/*ASP-CSS-END*/\n' + h[i:]
js = open(D + 'aspecto.js', encoding='utf-8').read().replace('</script', '<\\/script')
rep('initSen();\ninitInstall();\n})();', '/*ASP-JS-START*/\n' + js + '\n/*ASP-JS-END*/\ninitSen();\ninitInstall();\n})();')

# 2. antes de pintar: tema y letra guardados (sin parpadeo)
HEAD = "<script>/*ASP-HEAD*/try{var t=localStorage.getItem('tema'),l=localStorage.getItem('letra'),r=document.documentElement;if(t==='light'||t==='dark')r.setAttribute('data-theme',t);if(l==='0.9'||l==='1.15'||l==='1.3')r.setAttribute('data-letra',l)}catch(e){}</script>\n"
h = re.sub(r'<script>/\*ASP-HEAD\*/.*?</script>\n', '', h, flags=re.S)
m = re.search(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n', h)
pos = m.end() if m else h.index('<meta name="referrer"')
h = h[:pos] + HEAD + h[pos:]

# 3. tamaños de letra del CSS de la página → calc(Npx*var(--fz,1)) (letra.py; seg/inject.py lo vuelve a pasar)
import sys; sys.path.insert(0, D); import letra
h = letra.escalar_html(h)

# 4. el apartado en Perfil
if 'ASPECTO_API.perfilHtml()' not in h:
    rep("    ${window.SYNC_API ? SYNC_API.perfilHtml() : ''}\n  </div>`;", "    ${window.SYNC_API ? SYNC_API.perfilHtml() : ''}\n    ${window.ASPECTO_API ? ASPECTO_API.perfilHtml() : ''}\n  </div>`;")

if "{v:'1.23.0'" not in h:
    h = re.sub(r"const APP_VER = '[^']+';", "const APP_VER = '1.23.0';", h, count=1)
    rep("const NOVEDADES = [\n", """const NOVEDADES = [
  {v:'1.23.0', fecha:'10/11/2026', items:[
    '<b>Tema claro, oscuro o automático</b>: en Perfil › Aspecto. Automático sigue al móvil u ordenador.',
    '<b>Tamaño de la letra</b>: pequeña, normal, grande o muy grande, en Perfil › Aspecto. Los PDF y los Word no cambian.'
  ]},
""")
    h = re.sub(r"Versión de la app: [0-9.]+ · [0-9/]+", "Versión de la app: 1.23.0 · 10/11/2026", h, count=1)

open(IDX, 'w', encoding='utf-8').write(h)
print('aspecto ok', len(h))
