# Plantilla en blanco de la planificación preventiva a partir del Excel de Innovia.
# Filas 4-8: un prototipo de estilo por origen (naranja, verde, azul, rojo, blanco); filas 10-15: leyenda.
import openpyxl, copy, sys
from openpyxl.styles import PatternFill, Border, Side, Alignment, Font
SRC=sys.argv[1]; OUT='plantilla.xlsx'
wb=openpyxl.load_workbook(SRC); ws=wb.worksheets[0]
for m in list(ws.merged_cells.ranges):
    if m.min_row>3: ws.unmerge_cells(str(m))
ws.delete_rows(4, ws.max_row)
th=Side(style='thin'); md=Side(style='medium')
font=copy.copy(ws['A4'].font) if ws['A4'].font else Font(name='Arial', sz=10)
font=Font(name='Arial', sz=10, color=copy.copy(ws['A3'].font.color))
CATS=[('prl','F7CAAC','Actividades Preventivas Periódicas cuyo origen NO es una deficiencia en Seguridad / PRL'),
      ('ma','E2EFD9','Actividades Preventivas Periódicas cuyo origen NO es una deficiencia en CA - MA'),
      ('spp','DEEAF6','Observaciones / NC / Oportunidades de mejora detectadas a través de visita al servicio del Responsable SPP / MA'),
      ('aud','EA9999','Observaciones / NC / Oportunidades de mejora detectadas de Auditorías Internas y Externas'),
      ('def','FFFFFF','Deficiencias detectadas en PRL - CA - MA durante visitas al servicio por el TPCMA')]
for i,(k,col,_) in enumerate(CATS):
    r=4+i
    for c in range(1,11):
        cell=ws.cell(r,c); cell.value='x'
        cell.font=font; cell.fill=PatternFill('solid', fgColor='FF'+col)
        cell.alignment=Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border=Border(left=th,right=th,top=th,bottom=th)
    ws.row_dimensions[r].height=31.5
# leyenda
L=10
ws.merge_cells(start_row=L,start_column=1,end_row=L,end_column=5)
c=ws.cell(L,1); c.value='LEYENDA'; c.font=Font(name='Arial', sz=10, b=True, color=copy.copy(ws['A3'].font.color)); c.alignment=Alignment(horizontal='center', vertical='center', wrap_text=True)
for cc in range(1,6): ws.cell(L,cc).border=Border(left=md if cc==1 else None, right=md if cc==5 else None, top=md, bottom=md)
ws.row_dimensions[L].height=36.75
for i,(k,col,txt) in enumerate(CATS):
    r=L+1+i; last=i==len(CATS)-1
    ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=5)
    a=ws.cell(r,1); a.fill=PatternFill('solid', fgColor='FF'+col)
    a.border=Border(left=md, right=md, top=th, bottom=md if last else th)
    b=ws.cell(r,2); b.value=txt; b.font=Font(name='Arial', sz=10, color=copy.copy(ws['A3'].font.color)); b.alignment=Alignment(horizontal='left', vertical='center', wrap_text=True, indent=1)
    for cc in range(2,6): ws.cell(r,cc).border=Border(right=md if cc==5 else None, top=th, bottom=md if last else th)
    ws.row_dimensions[r].height=36.75
ws['A2']='TABLA SEGUIMIENTO DE MEDIDAS CORRECTORAS (planificación preventiva O/S/M) PRL'
ws.title='Planificación'
wb.save(OUT)
print('ok')
