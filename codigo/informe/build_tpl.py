import re, json, zipfile, copy
exec(open('common.py').read())
out={}
def xml(el):
    s=etree.tostring(el).decode()
    return re.sub(r' xmlns:\w+="[^"]+"','',s)
# --- comprobaciones
cell23=resolve('t23.r0.c0'); print('t23 cell children',len(cell23),[etree.QName(x).localname for x in cell23][:5], 'sectPr in 78+:',sum(1 for e in list(body)[78:] if e.find('.//w:sectPr',ns) is not None), 'tbl in 78+',sum(1 for e in list(body)[78:] if e.tag==q('tbl')))
print([etree.QName(x).localname for x in body][-4:])
protos={
 'fase':xml(resolve('t3.r0.c0.p1')), 'act':xml(resolve('t6.r0.c0.p2')),
 'vtitle':xml(resolve('t23.r0.c0.p2')),'vbody':xml(resolve('t23.r0.c0.p3')),'vobs':xml(resolve('t23.r0.c0.p8')),'vblank':xml(resolve('t23.r0.c0.p9')),
 'ftitle':xml(body[79]),'fgap':xml(body[80]),'fpar':xml(body[81]),
}
# dibujo base (primera imagen)
dr=body[81].find('.//w:drawing',ns); protos['fdraw']=xml(dr)
json.dump(protos,open('protos.json','w'),ensure_ascii=False)
# --- limpiar plantilla
for c in cbs:
    for ch in c.findall('w:checked',ns): c.remove(ch)
    d=c.find('w:default',ns)
    if d is not None: d.set(q('val'),'0')
def keep_first(cell,keep_idx):  # deja tcPr + hijos con índice en keep_idx
    for i,ch in reversed(list(enumerate(list(cell)))):
        if ch.tag==q('tcPr'): continue
        if i not in keep_idx: cell.remove(ch)
keep_first(resolve('t3.r0.c0'),{1})
keep_first(resolve('t6.r0.c0'),{1,2})
keep_first(resolve('t23.r0.c0'),{1,2})
# vaciar los párrafos marcador (conservan pPr)
for p in (resolve('t3.r0.c0.p1'),resolve('t23.r0.c0.p2')):
    for r in p.findall('w:r',ns): p.remove(r)
for r in resolve('t6.r0.c0.p2').findall('w:r',ns): resolve('t6.r0.c0.p2').remove(r)
# reportaje fotográfico: quitar todo entre el título (77) y sectPr final
kids=list(body)
for e in kids[78:-1]: body.remove(e)
# tras el título, un marcador (párrafo vacío)
marker=etree.fromstring('<w:p xmlns:w="%s"/>'%W); body.insert(78,marker)
newdoc=etree.tostring(doc,xml_declaration=True,encoding='UTF-8',standalone=True)
# rels sin imágenes de fotos
rels=z.read('word/_rels/document.xml.rels').decode()
rels=re.sub(r'<Relationship [^>]*Target="media/image(?:[1-9]|1[0-5])\.png"[^>]*/>','',rels)
zo=zipfile.ZipFile('plantilla.docx','w',zipfile.ZIP_DEFLATED)
for n in z.namelist():
    if re.match(r'word/media/image(?:[1-9]|1[0-5])\.png$',n): continue
    data=z.read(n)
    if n=='word/document.xml': data=newdoc
    elif n=='word/_rels/document.xml.rels': data=rels.encode()
    zo.writestr(n,data)
zo.close()
import os; print('plantilla.docx',os.path.getsize('plantilla.docx')//1024,'KB')
