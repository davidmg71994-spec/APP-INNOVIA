# Tamaño de letra ajustable (1.23.0): pasa los tamaños de letra del CSS de la página a calc(Npx*var(--fz,1)).
# Solo en los <style> de la página (no dentro de los <script>). Idempotente. Lo usan aspecto/inject.py y seg/inject.py
# (seg va siempre el último y vuelve a meter su CSS, así que también lo pasa antes de calcular la CSP).
import re

def escala(css):
    css = re.sub(r'font-size:(\s*)([0-9.]+)px', lambda m: 'font-size:' + m.group(1) + 'calc(' + m.group(2) + 'px*var(--fz,1))', css)
    css = re.sub(r'line-height:(\s*)([0-9.]+)px', lambda m: 'line-height:' + m.group(1) + 'calc(' + m.group(2) + 'px*var(--fz,1))', css)
    def font(m):
        r = 'font:' + m.group(1) + 'calc(' + m.group(2) + 'px*var(--fz,1))'
        return r + ('/calc(' + m.group(3) + 'px*var(--fz,1))' if m.group(3) else '')
    css = re.sub(r'font:(\s*(?:(?:italic|normal|oblique|bold|bolder|lighter|small-caps|[1-9]00)\s+)*)([0-9.]+)px(?:/([0-9.]+)px)?', font, css)
    # clamp(22px,6vw,30px) en «font:»: cada medida en px también
    css = re.sub(r'font:(\s*(?:[1-9]00\s+)?)clamp\(([0-9.]+)px,([^,()]+),([0-9.]+)px\)', lambda m: 'font:' + m.group(1) + 'clamp(calc(' + m.group(2) + 'px*var(--fz,1)),calc(' + m.group(3) + '*var(--fz,1)),calc(' + m.group(4) + 'px*var(--fz,1)))', css)
    return css

def escalar_html(h):
    scripts = [(m.start(), m.end()) for m in re.finditer(r'<script\b[^>]*>.*?</script>', h, flags=re.S)]
    dentro = lambda p: any(a <= p < b for a, b in scripts)
    out, last = [], 0
    for m in re.finditer(r'(<style\b[^>]*>)(.*?)(</style>)', h, flags=re.S):
        if dentro(m.start()): continue
        out.append(h[last:m.start(2)]); out.append(escala(m.group(2))); last = m.end(2)
    out.append(h[last:])
    return ''.join(out)
