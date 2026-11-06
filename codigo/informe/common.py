# Genera plantilla.docx (limpia) y schema.json a partir del informe de ejemplo.
import re, json, zipfile, shutil, copy, sys
from lxml import etree
SRC='/mnt/user-data/attachments/e05934e9-548d-524e-b754-7023b249d5e1/80272c20-Informe_de_seguimiento_10.09.2026.docx'
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ns={'w':W}; q=lambda t:'{%s}%s'%(W,t)
z=zipfile.ZipFile(SRC)
doc=etree.fromstring(z.read('word/document.xml'))
body=doc.find('w:body',ns)
cbs=doc.findall('.//w:checkBox',ns)
cbi={id(c):i for i,c in enumerate(cbs)}

def child(el,idx): return el[idx]
def resolve(path):
    el=body
    for part in path.split('.'):
        m=re.match(r'([a-z])(\d+)$',part); k=m.group(1); n=int(m.group(2))
        if k=='r': el=el.findall('w:tr',ns)[n]
        elif k=='c': el=el.findall('w:tc',ns)[n]
        else: el=el[n]
    return el
def pathof(el):
    parts=[]
    while el is not body:
        par=el.getparent(); i=list(par).index(el)
        t=etree.QName(el).localname
        k={'p':'p','tbl':'t','tr':'r','tc':'c','sdt':'s'}[t]
        if t=='tr': i=par.findall('w:tr',ns).index(el)
        if t=='tc': i=par.findall('w:tc',ns).index(el)
        parts.append(f'{k}{i}'); el=par
    return '.'.join(reversed(parts))
# (en tr/tc el índice es de fila/celda; en p/tbl, de hijo) -- igual que en el volcado
def tokens(p):
    out=[]
    for r in p.iter():
        if r.tag==q('t'): out.append(('t',r.text or ''))
        elif r.tag==q('checkBox'): out.append(('cb',cbi[id(r)]))
    return out
def ptxt(p): return ''.join(t[1] for t in tokens(p) if t[0]=='t')

OPT=re.compile(r'(?:^|[\s\)\]\.:,?])(S[ÍI]|NO|NP|Por el SPA|Sin baja \(S/B\)|Con baja \(C/B\)|INTERIOR|EXTERIOR)\s*[\*\(\)\d y]*$')
def norm_opt(s): return {'SI':'SÍ'}.get(s,s)
def parse_cb_par(p):
    """devuelve lista de grupos: {q, opts:[{l,cb}], multi}"""
    toks=tokens(p); groups=[]; cur=None; prev=''
    for kind,v in toks:
        if kind=='t': prev+=v; continue
        txt=prev; prev=''
        m=OPT.search(txt)
        if m:
            opt=norm_opt(m.group(1)); lead=txt[:m.start(1)].strip()
            if cur is None or any(o['l']==opt for o in cur['opts']) or cur.get('multi'):
                cur={'q':re.sub(r'\s+',' ',lead).strip(),'opts':[],'multi':False}; groups.append(cur)
            cur['opts'].append({'l':opt,'cb':v})
        else:
            lab=re.sub(r'\s+',' ',txt).strip()
            if cur is None or not cur.get('multi'):
                cur={'q':'','opts':[],'multi':True}; groups.append(cur)
            cur['opts'].append({'l':lab or '·','cb':v})
    return groups

def tokens_has_cb(p): return any(k=='cb' for k,_ in tokens(p))
