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

# ---- estructura por secciones ----
SECS=[ # (índice hijo del body del título, id, título)
 (2,'s1','1. Fase de la obra / servicio / mantenimiento'),
 (4,'s2','2. Seguimiento del plan de control'),
 (5,'s2a','2.1 Cumplimiento de DGP / ERL / PSS, planes y acta de lanzamiento'),
 (7,'s2b','2.2 Cumplimentación de impresos (Calidad y Medioambiente)'),
 (9,'s2c','2.3 Necesidad de nuevos anexos, revisiones, documentos o procedimientos'),
 (11,'s2d','2.4 Documentación del DROPBOX del contrato'),
 (13,'s2e','2.5 Resultado de ensayos (legionela…)'),
 (15,'s2f','2.6 Aprobación del Plan de Gestión de Residuos'),
 (17,'s2g','2.7 Seguimiento de indicadores'),
 (20,'s3','3. Seguimiento de la obra / servicio / mantenimiento'),
 (24,'s3b','3.2 Estado general de la obra. Orden y limpieza'),
 (26,'s3c','3.3 Control de PPI y check-list de PRL'),
 (28,'s3d','3.4 Requisitos legales, permisos y comunicaciones externas'),
 (30,'s3e','3.5 Notificaciones previas de residuos'),
 (32,'s3f','3.6 Nuevos riesgos no evaluados'),
 (34,'s3g','3.7 Planes de emergencia y simulacros'),
 (36,'s4','4. Personal y equipos de trabajo (PRL)'),
 (37,'s4a','4.1 Control del personal'),
 (42,'s4b','4.2 Control de maquinaria, pequeña maquinaria y vehículos'),
 (44,'s4c','4.3 Eficacia de la formación'),
 (51,'s5','5. Seguridad vial'),
 (53,'s6','6. Subcontratas'),
 (54,'s6a','6.1 Control de las obligaciones (Seguridad y Salud)'),
 (56,'s6b','6.2 Control de comportamiento ambiental'),
 (59,'s7','7. No conformidades abiertas y acciones correctivas'),
 (61,'s8','8. Puntos fuertes'),
 (63,'s9','9. Otros comentarios'),
 (65,'s10','10. Seguimiento de informes'),
]
sec_at={b:(i,t) for b,i,t in SECS}
sections=[]; cur=None
def newsec(i,t):
    global cur; cur={'id':i,'t':t,'items':[]}; sections.append(cur)
newsec('s0','Cabecera')
iid={}
def uid(base):
    n=iid.get(base,0); iid[base]=n+1
    return base if n==0 else f'{base}_{n}'

COMMENT=re.compile(r'^\s*(Comentarios?|Cometarios?)\s*:',re.I)
SKIP_TABLES={'t3','t18.r1.c0.t3','t25.r0.c0.t5','t38','t43'}  # tratadas aparte
specials={}  # path -> handled
def comment_item(p, cell):
    ps=[c for c in cell if c.tag==q('p')]
    i=ps.index(p)
    cont=[pathof(x) for x in ps[i+1:] if not tokens_has_cb(x)]
    return cont
def tokens_has_cb(p): return any(k=='cb' for k,_ in tokens(p))

def walk_cell(cell, secid, extra_skip=()):
    for c in cell:
        t=etree.QName(c).localname
        if t=='p':
            txt=ptxt(c)
            if tokens_has_cb(c):
                for g in parse_cb_par(c):
                    first=g['opts'][0]['cb']
                    cur['items'].append({'k':'yn','id':uid(f'y{first}'),'q':g['q'],'opts':g['opts'],'multi':g['multi'],'p':pathof(c)})
            elif COMMENT.match(txt):
                cont=comment_item(c,cell)
                m=COMMENT.match(txt); sample=txt[m.end():].strip()
                rest='\n'.join(ptxt(resolve(x)).strip() for x in cont if ptxt(resolve(x)).strip())
                cur['items'].append({'k':'tx','id':uid('c'+pathof(c).replace('.','_')),'l':'Comentarios','p':pathof(c),'cont':cont,'sample':(sample+('\n'+rest if rest else '')).strip()})
        elif t=='tbl':
            pth=pathof(c)
            if pth in SKIP_TABLES or any(pth.endswith(s) for s in SKIP_TABLES): continue
            for tr in c.findall('w:tr',ns):
                for tc in tr.findall('w:tc',ns): walk_cell(tc,secid)

for i,c in enumerate(body):
    if i in sec_at: newsec(*sec_at[i])
    t=etree.QName(c).localname
    if t=='p':
        continue
    if t=='tbl':
        pth=pathof(c)
        if pth in SKIP_TABLES: continue
        for tr in c.findall('w:tr',ns):
            for tc in tr.findall('w:tc',ns): walk_cell(tc,cur['id'])
    if i>=66: break

json.dump({'sections':sections},open('raw_schema.json','w'),ensure_ascii=False,indent=1)
print(sum(len(s['items']) for s in sections),'items')
for s in sections: print(s['id'],len(s['items']))
