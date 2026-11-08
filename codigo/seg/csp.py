# Política de seguridad del contenido (CSP) de Visitas PRL.
# Solo se ejecutan los scripts de la propia app: los <script> en línea van autorizados por su huella SHA-256,
# así que cualquier script añadido o modificado sin pasar por aquí no se ejecuta.
# connect-src 'self': la app no puede enviar datos a ningún servidor de fuera.
# Se llama al final de seg/inject.py y de build_single.py (la web de un solo archivo).
import re, hashlib, base64

INICIO = '<meta http-equiv="Content-Security-Policy" content="'

def _hashes(h):
    out = []
    for m in re.finditer(r'<script(\s[^>]*)?>(.*?)</script>', h, re.S):
        attrs = m.group(1) or ''
        if 'src=' in attrs:
            continue
        t = re.search(r'type="([^"]+)"', attrs)
        if t and t.group(1) not in ('text/javascript', 'module', 'application/javascript'):
            continue
        d = base64.b64encode(hashlib.sha256(m.group(2).encode('utf-8')).digest()).decode()
        out.append("'sha256-%s'" % d)
    return out

def politica(h):
    return '; '.join([
        "default-src 'self'",
        "script-src 'self' blob: 'wasm-unsafe-eval' " + ' '.join(_hashes(h)),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "media-src 'self' data: blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
    ])

def aplicar(h):
    """Quita la CSP anterior (si la hay) y pone la nueva justo después de <meta charset>."""
    h = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">\n?', '', h)
    meta = INICIO + politica(h) + '">\n'
    i = h.find('<meta charset="utf-8">')
    assert i >= 0, 'sin meta charset'
    i += len('<meta charset="utf-8">\n')
    return h[:i] + meta + h[i:]
