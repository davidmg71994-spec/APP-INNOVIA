# Limpia la plantilla del informe: quita los comentarios, nombres, matrículas y cifras del informe real
# que sirvió de modelo. El generador los sustituye siempre, así que el Word que sale es el mismo.
import zipfile, re, sys, shutil
from lxml import etree
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS={'w':W}
src=sys.argv[1]; dst=sys.argv[2]
zin=zipfile.ZipFile(src)
doc=etree.fromstring(zin.read('word/document.xml'))
def tnodes(p): return p.findall('.//w:t', NS)
def ptext(p): return ''.join(t.text or '' for t in tnodes(p))
def set_range(p, a, b, new):
    pos=0; done=False
    for t in tnodes(p):
        s=t.text or ''; L=len(s); s0, s1 = pos, pos+L
        if s1 <= a or s0 >= b: pos=s1; continue
        i=max(a,s0)-s0; j=min(b,s1)-s0
        t.text = s[:i] + ('' if done else new) + s[j:]
        if not done: t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
        done=True; pos=s1
CONT=('Cabe señalar que','Esta evolución supone','La comparativa entre ambos','En el contrato se están realizando','A partir de los análisis','Los riesgos y oportunidades, tanto','Recurso preventivo, delegado')
n=0
for p in doc.iter('{%s}p'%W):
    t=ptext(p); s=t.strip()
    if not s: continue
    m=re.match(r'\s*Comentarios:\s*', t)
    if m and len(t)>m.end(): set_range(p, m.end(), len(t), ''); n+=1; continue
    if s.startswith(CONT): set_range(p, 0, len(t), ''); n+=1; continue
    m=re.match(r'\s*Formación (?:interna|externa):\s*', t)
    if m and len(t)>m.end(): set_range(p, m.end(), len(t), ''); n+=1; continue
    m=re.match(r'\s*OBS\. 1\s*', t)
    if m and len(t)>m.end(): set_range(p, m.end(), len(t), ''); n+=1; continue
    m=re.search(r'trabajador/a\s+(.+)$', t)
    if m: set_range(p, m.start(1), m.end(1), 'NOMBRE Y APELLIDOS'); n+=1; continue
    m=re.search(r'documentación del\s+(\S+?)(:)\s*$', t)
    if m: set_range(p, m.start(1), m.end(1), ''); n+=1; continue
    m=re.search(r'subcontrata\s+(\S.*?)\s*\.?,\s*¿Est', t)
    if m: set_range(p, m.start(1), m.end(1), ''); n+=1; continue
    if re.fullmatch(r'[\d.,/ ]+', s) and re.search(r'\d', s): set_range(p, 0, len(t), ''); n+=1; continue
print('párrafos limpiados', n)
zout=zipfile.ZipFile(dst+'.tmp','w',zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    data=zin.read(it.filename)
    if it.filename=='word/document.xml': data=etree.tostring(doc, xml_declaration=True, encoding='UTF-8', standalone=True)
    elif it.filename=='docProps/core.xml':
        x=data.decode('utf-8'); x=re.sub(r'(<dc:creator>)[^<]*(</dc:creator>)', r'\1Innovia\2', x); x=re.sub(r'(<cp:lastModifiedBy>)[^<]*(</cp:lastModifiedBy>)', r'\1Innovia\2', x); data=x.encode('utf-8')
    zout.writestr(it, data)
zout.close(); shutil.move(dst+'.tmp', dst)
