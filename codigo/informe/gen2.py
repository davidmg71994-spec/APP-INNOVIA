import re, json, zipfile, copy
exec(open('common.py').read())

SECS=[(2,'s1','1. Fase de la obra / servicio / mantenimiento'),(4,'s2','2. Seguimiento del plan de control'),
 (5,'s2a','2.1 Cumplimiento de DGP / ERL / PSS, planes y acta de lanzamiento'),(7,'s2b','2.2 Cumplimentación de impresos (Calidad y Medioambiente)'),
 (9,'s2c','2.3 Necesidad de nuevos anexos, revisiones, documentos o procedimientos'),(11,'s2d','2.4 Documentación del DROPBOX del contrato'),
 (13,'s2e','2.5 Resultado de ensayos (legionela…)'),(15,'s2f','2.6 Aprobación del Plan de Gestión de Residuos'),
 (17,'s2g','2.7 Seguimiento de indicadores'),(20,'s3','3. Seguimiento de la obra / servicio / mantenimiento'),
 (24,'s3b','3.2 Estado general de la obra. Orden y limpieza'),(26,'s3c','3.3 Control de PPI y check-list de PRL'),
 (28,'s3d','3.4 Requisitos legales, permisos y comunicaciones externas'),(30,'s3e','3.5 Notificaciones previas de residuos'),
 (32,'s3f','3.6 Nuevos riesgos no evaluados'),(34,'s3g','3.7 Planes de emergencia y simulacros'),
 (36,'s4','4. Personal y equipos de trabajo (PRL)'),(37,'s4a','4.1 Control del personal'),
 (42,'s4b','4.2 Control de maquinaria, pequeña maquinaria y vehículos'),(44,'s4c','4.3 Eficacia de la formación'),
 (51,'s5','5. Seguridad vial'),(53,'s6','6. Subcontratas'),(54,'s6a','6.1 Control de las obligaciones (Seguridad y Salud)'),
 (56,'s6b','6.2 Control de comportamiento ambiental'),(59,'s7','7. No conformidades abiertas y acciones correctivas'),
 (61,'s8','8. Puntos fuertes'),(63,'s9','9. Otros comentarios'),(65,'s10','10. Seguimiento de informes'),
 (77,'s11','Reportaje fotográfico')]
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
tbl_skip={'t3','t18.r1.c0.t3','t25.r0.c0.t5'}
state={'lastBody':''}
ENC={'t38':(155,6,15),'t43':(183,8,22)}  # primer cb del bloque A, filas del bloque, fila total

def add_cb_par(p, ctxq, rel=None, base=None):
    out=[]
    for g in parse_cb_par(p):
        first=g['opts'][0]['cb']
        qq=g['q'] or ctxq
        it={'k':'yn','id':uid(f'y{first}'),'q':qq,'multi':g['multi']}
        if rel is None:
            it['opts']=g['opts']; it['p']=pathof(p)
        else:
            it['opts']=[{'l':o['l'],'lc':o['cb']-base} for o in g['opts']]; it['id']=f'y{first-base}'
            it['p']=rel
        out.append(it)
    return out

def walk_cell(cell, items, rel_prefix=None, base=None, ctx0=''):
    last=ctx0
    for c in cell:
        t=etree.QName(c).localname
        if t=='p':
            txt=ptxt(c); has=tokens_has_cb(c)
            if has:
                items.extend(add_cb_par(c,last,None if rel_prefix is None else rel_prefix(c),base)); 
            elif COMMENT.match(txt):
                ps=[x for x in cell if x.tag==q('p')]; i=ps.index(c)
                cont=[x for x in ps[i+1:] if not tokens_has_cb(x)]
                m=COMMENT.match(txt); sample=txt[m.end():].strip()
                rest='\n'.join(ptxt(x).strip() for x in cont if ptxt(x).strip())
                p_=pathof(c) if rel_prefix is None else rel_prefix(c)
                items.append({'k':'tx','id':uid('c'+p_.replace('.','_')),'l':'Comentarios','p':p_,'lab':'^\\s*(Comentarios?|Cometarios?)\\s*:\\s*',
                  'cont':[pathof(x) if rel_prefix is None else rel_prefix(x) for x in cont],'sample':(sample+('\n'+rest if rest else '')).strip()})
            if txt.strip() and not has: last=txt.strip()
        elif t=='tbl':
            pth=pathof(c)
            if pth in tbl_skip or pth in ENC: continue
            for tr in c.findall('w:tr',ns):
                for tc in tr.findall('w:tc',ns): walk_cell(tc,items,rel_prefix,base,last)

def tbl_rows(tbl,a,b):
    rows=tbl.findall('w:tr',ns)[a:b]; return rows

for i,c in enumerate(body):
    if i in sec_at: newsec(*sec_at[i])
    t=etree.QName(c).localname
    if i>=66 and i<77: continue
    if i>=77: break
    if t=='p':
        txt=ptxt(c)
        if tokens_has_cb(c): cur['items'].extend(add_cb_par(c,state['lastBody']))
        if txt.strip() and not tokens_has_cb(c): state['lastBody']=txt.strip()
        continue
    if t=='tbl':
        pth=pathof(c)
        if pth in tbl_skip: continue
        if pth in ENC:
            base,nrows,tot=ENC[pth]; rows=c.findall('w:tr',ns)
            blk=rows[:nrows]
            # bloque duplicable
            def rel(p, tbl=c):
                # ruta relativa: rN.cM.pK
                tc=p.getparent(); tr=tc.getparent()
                return f'r{tr.getparent().findall("w:tr",ns).index(tr)}.c{tr.findall("w:tc",ns).index(tc)}.p{list(tc).index(p)}'
            items=[]
            for r in blk:
                for tc in r.findall('w:tc',ns): walk_cell(tc,items,rel,base)
            # nombre (fila 0)
            nm=ptxt(blk[0].find('w:tc',ns).findall('w:p',ns)[0])
            dup={'k':'dup','id':'trab' if pth=='t38' else 'eq','nrows':nrows,'tbl':pth,'items':items,
                 'name':{'p':'r0.c0.p1','re':('trabajador/a\\s+(.*?)\\s*$' if pth=='t38' else 'documentación del\\s+(.*?):?\\s*$'),'l':'Nombre y apellidos' if pth=='t38' else 'Matrícula o equipo','ph':'Nombre y apellidos' if pth=='t38' else 'Ej.: 0386-LZG'}}
            cur['items'].append(dup)
            # filas generales (tras los 2 bloques)
            gen=[]
            start = 12 if pth=='t38' else 16
            end = 15 if pth=='t38' else 21
            for r in rows[start:end]:
                for tc in r.findall('w:tc',ns): walk_cell(tc,gen)
            cur['items'].extend(gen)
            continue
        for tr in c.findall('w:tr',ns):
            for tc in tr.findall('w:tc',ns): walk_cell(tc,cur['items'],None,None,state['lastBody'])

S={s['id']:s for s in sections}
def put(sec,item,after=None,first=False):
    L=S[sec]['items']
    if first: L.insert(0,item); return
    if after is None: L.append(item); return
    for i,x in enumerate(L):
        if x['id']==after: L.insert(i+1,item); return
    raise Exception('no '+after)
def inline(sec,id_,l,p,rx,ph='',after=None,first=False):
    put(sec,{'k':'in','id':id_,'l':l,'p':p,'re':rx,'ph':ph},after,first)

# cabecera
inline('s0','f_fecha','Fecha del informe','t0.r0.c1.p1',r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})','10.09.2026',first=True)
put('s1',{'k':'auto','id':'fase','l':'Se rellena sola con las visitas que elijas (fecha y actividad de cada una).'})
put('s2a',{'k':'auto','id':'act','l':'Actividades visitadas con su apartado del PSS/DGP: se rellena sola con las visitas.'},first=True)
put('s2c',{'k':'tx','id':'x_anexos','l':'¿Hace falta algún anexo, revisión, documento o procedimiento?','p':'t10.r0.c0.p1','lab':'','sample':'No','def':'No'})
put('s2e',{'k':'obs','id':'x_ensayos','l':'Observaciones sobre ensayos (una por línea). Se numeran como OBS y continúan en las visitas.','p':'t14.r0.c0.p1'})
# indicadores
rows_ind=['Índice de Frecuencia (IG)','Índice de Gravedad (II)','Índice de Incidencia (IF)']
cells=[]
for r in (1,2,3):
    for c in (1,2,3,4,5): cells.append(f't18.r1.c0.t3.r{r}.c{c}.p1')
put('s2g',{'k':'grid','id':'g_ind','l':'Índices de accidentabilidad','rows':rows_ind,'cols':['Dato de partida','1.er trimestre','2.º trimestre','3.er trimestre','4.º trimestre'],'cells':cells},after='y25')
inline('s2g','f_ult_acc','Fecha del último accidente de trabajo','t18.r5.c0.p1',r'accidente de trabajo:\s*(.*?)\.\s',  'dd.mm.aaaa',after='y29')
inline('s2g','f_rm_obs','Reconocimientos: en observación (nº)','t18.r9.c0.p1',r'En observación \(nº\)\s*(\S+?)\.',  '0',after='y38')
inline('s2g','f_rm_cond','Reconocimientos: condicionados (nº)','t18.r9.c0.p1',r'Condicionados \(nº\)\s*(\S+?)\.',  '0',after='f_rm_obs')
inline('s2g','f_nc','NC abiertas (nº)','t18.r13.c0.p1',r'\(nº\)\s*(_+|\d+)',  '0',after='y46')
inline('s2g','f_ac','AC abiertas (nº)','t18.r14.c0.p1',r'\(nº\)\s*(_+|\d+)',  '0',after='y48')
# estado general: puntuación
score_rows=[('Orden y limpieza en los vehículos',10),('Orden y limpieza en el tajo',10),('Orden y limpieza de la nave e instalaciones',10),('Señalización provisional, balizamiento y protecciones a terceros',15),('Conservación de señales y balizamiento',10),('Conservación de equipos de trabajo, maquinaria y vehículos',10),('Uso de EPI y protecciones colectivas',15),('Instalaciones de higiene y bienestar',10),('Punto limpio',10)]
put('s3b',{'k':'score','id':'sc','l':'Puntuación','rows':[{'l':a,'max':m,'p':f't25.r0.c0.t5.r{i+1}.c2.p1'} for i,(a,m) in enumerate(score_rows)],'tot':'t25.r0.c0.t5.r10.c2.p1'},after='y58')
inline('s3c','f_otros','Otros (indicar cuál)','t27.r5.c0.p1',r'-Otros:\s*(_+)', 'Ej.: Carretillas',after='y77')
inline('s3g','f_sim_fecha','Fecha del simulacro anual','t35.r6.c0.p1',r'Fecha:\s*(.*?)\s*NO\s*\(3\)','26/02/2025 (PRL) y 18/02/2025 (SV)',after='y132')
inline('s3g','f_sim_cuando','Simulacro planificado: ¿para cuándo?','t35.r8.c0.p1',r'¿Para cuándo\?\s*(.*?)\s*NO\s*$','Agosto 2026',after='y138')
# formación
put('s4c',{'k':'tx','id':'x_fint','l':'Formación interna realizada','p':'t50.r2.c0.p2','lab':'^Formación interna:\\s*','sample':''})
put('s4c',{'k':'tx','id':'x_fext','l':'Formación externa realizada','p':'t50.r2.c0.p4','lab':'^Formación externa:\\s*','sample':''})
put('s4c',{'k':'tx','id':'x_fprev','l':'Formación prevista durante el año','p':'t50.r3.c0.p2','lab':'','sample':''})
# seguridad vial
SV=[('Contexto / entorno','t52.r0.c0.p1'),('Partes interesadas','t52.r0.c0.p2'),('Vía','t52.r0.c0.p3'),('Humano','t52.r0.c0.p4'),('Vehículo','t52.r0.c0.p5'),('Climatología y horario de trabajo','t52.r0.c0.p6')]
for k,(l,p) in enumerate(SV):
    put('s5',{'k':'tx','id':f'x_sv{k}','l':'Factor: '+l,'p':p,'lab':'','sample':ptxt(resolve(p)).strip(),'def':ptxt(resolve(p)).strip(),'rows':5})
# subcontratas
inline('s6a','f_nalanda','Subcontrata revisada en NALANDA','t55.r3.c0.p1',r'subcontrata\s+(.*?)\s*\.?,\s*¿Est','Nombre de la subcontrata',after='y270')
# puntos fuertes
put('s8',{'k':'lines','id':'x_fuertes','l':'Puntos fuertes (uno por línea)','p':'t62.r0.c0.p1','pref':'- '})
# otros comentarios
inline('s9','f_rev_tierra','Fecha revisión puesta a tierra','t64.r5.c0.p1',r'\((\d\d/\d\d/\d\d)\)','15/05/26',after='y310')
inline('s9','f_rev_pci','Fecha revisión protección contra incendios','t64.r5.c1.p1',r'\((\d\d/\d\d/\d\d)\)','06/06/26',after='y313')
inline('s9','f_rev_aire','Fecha revisión aire acondicionado','t64.r6.c0.p1',r'\((\d\d/\d\d/\d\d)\)','12/12/25',after='y316')
inline('s9','f_rev_bt','Fecha revisión instalación eléctrica BT','t64.r6.c1.p1',r'\((\d\d/\d\d/\d\d)\)','15/05/26',after='y319')
inline('s9','f_rev_elev','Fechas revisión aparatos elevadores','t64.r7.c0.p1',r'NP\s*(\(.*)$','23/10/25; 29/10/25 y 10/12/25',after='y322')
S['s9']['items'][[x['id'] for x in S['s9']['items']].index('f_rev_elev')]['wrap']=True
inline('s9','f_rev_otros','Otros elementos revisados (cuáles)','t64.r8.c0.p1',r'portones, …\)\s*(_+)','Ej.: Grupos electrógenos',after='y325')
inline('s9','f_rev_otros_f','Fecha revisión de otros elementos','t64.r8.c0.p1',r'\((\d\d/\d\d/\d\d)\)\s*$','25/11/25',after='f_rev_otros')
inline('s9','f_legio','Fecha analítica de legionela','t64.r9.c0.p1',r'\((\d\d/\d\d/\d{4})\)','20/08/2026',after='y327')
inline('s9','f_comision','Fecha de la Comisión de Seguridad y Salud','t64.r13.c0.p1',r'Fecha:\s*(.*?)\.\s*NO','09/04/26',after='y348')
inline('s9','f_comision_cuando','Comisión planificada: ¿para cuándo?','t64.r14.c0.p1',r'¿Para cuándo\?\s*(.*)$','Son trimestrales.',after='y350')
put('s9',{'k':'lines','id':'x_acciones','l':'Seguimiento de acciones del Informe Anual de Revisión por Dirección (una por línea)','p':'t64.r28.c0.p3','last':'t64.r28.c0.p14','def':'\n'.join(ptxt(resolve(f't64.r28.c0.p{n}')).strip() for n in range(3,15)),'pref':''})
put('s9',{'k':'hallazgos','id':'x_hall','l':'Resumen de hallazgos','p':'t64.r29.c0.p1'})
# seguimiento de informes
inline('s10','f_ant_fecha','Fecha del informe anterior','p66',r'de fecha\s*(\S+?),', '08/05/2026')
inline('s10','f_ant_cierre','Fecha en que se cerró el informe anterior','p66',r'cerrado el\s*(\S+?)\.','15/07/2026')
put('s11',{'k':'auto','id':'fotos','l':'Reportaje fotográfico: se rellena solo con las fotos de las visitas elegidas.'})
put('s3',{'k':'auto','id':'visitas','l':'Texto de cada visita: se rellena solo con el informe redactado de cada visita elegida.'})

# etiquetas de grupos sin pregunta
for s_ in sections:
    for it in s_['items']:
        if it['k']=='yn' and it.get('multi') and not it['q']:
            it['q']={'y0':'Áreas a las que corresponde el informe','y72':'Controles trimestrales realizados (marca los que apliquen)','y74':'Controles trimestrales realizados (continuación)','y142':'Formación interna en emergencias recibida'}.get(it['id'],'')
# sample/def: borra textos de ejemplo salvo los 'def'
for s in sections:
    for it in s['items']:
        if it['k']=='tx' and 'def' not in it: it.pop('sample',None)
sections=[s for s in sections if s['items'] or s['id'] in ('s0',)]
# secciones sin items propios se descartan (títulos de nivel superior)
json.dump({'sections':sections},open('schema.json','w'),ensure_ascii=False)
print(len(json.dumps({'sections':sections},ensure_ascii=False))//1024,'KB')
for s in sections: print(s['id'],len(s['items']),s['t'])
