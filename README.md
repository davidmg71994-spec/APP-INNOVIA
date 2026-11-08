# Visitas PRL · Innovia

App para los técnicos de PRL de Innovia: registro de comprobación del recurso preventivo en obra, informe de seguimiento cuatrimestral, planificación preventiva y evaluación de riesgos, con salida en PDF, Word y Excel, y el PSS/DGP de cada obra a mano.

**Versión 1.17.1 · 08/11/2026**

## Cómo usarla

| Dónde | Cómo |
|---|---|
| **Android** | Descarga [`VisitasPRL.apk`](VisitasPRL.apk) e instálala (si ya la tienes, se instala encima y no se pierde nada). |
| **iPhone, tablet u ordenador** | Abre **https://davidmg71994-spec.github.io/APP-INNOVIA/** en el navegador (funciona también sin conexión una vez abierta). |

Los datos (visitas, informes, planificaciones, evaluaciones de riesgos, calendario, revisiones con sus certificados, PSS/DGP y perfil) se guardan **solo en el móvil** de cada técnico. Para cambiar de móvil o pasar datos: *Visitas › Historial › Exportar copia* e *Importar copia*.

## Qué hace

- **Inicio**: tres anillos (visitas del mes, medidas aplicadas de la planificación y revisiones al día), una lista con lo vencido y lo de hoy, el gráfico de deficiencias de los últimos 6 meses, la carpeta del PSS/DGP de la obra activa y los nueve apartados en una cuadrícula de colores con aviso cuando hay algo vencido.
- **Perfil y contratos**: cada técnico pone sus datos y los contratos que lleva (nombre, Nº SIE, objeto). Todo se guarda ligado a su contrato.
- **Visitas**: registro de comprobación paso a paso, con fotos, firma y PDF; historial filtrado por contrato.
- **Documentos**
  - *Informe de seguimiento*: los apartados del informe cuatrimestral; las visitas entran solas y sale el Word con el formato de Innovia.
  - *Evaluación de riesgos (EVRL)*: el modelo de Innovia (I-CORP 20A-3) por puesto de trabajo, con los 41 riesgos, su valoración y sus medidas, y las plantillas de operarios, oficina, campo y jefes. Sale el Word con el formato del modelo.
  - *Planificación preventiva*: tabla de seguimiento de medidas correctoras por contrato y año, con el origen de cada medida según la leyenda (periódica PRL, periódica CA-MA, visita del Responsable SPP/MA, auditoría, deficiencia en visita), vencimientos, vista por meses y Excel con el formato de Innovia.
- **Calendario PRL**: cada técnico apunta sus tareas (sueltas o que se repiten cada semana, mes, trimestre o año), con contrato y tipo; agenda con vencidas, hoy y próximos días, vista de mes y marcar como hechas. Empieza en blanco.
- **Revisiones**: instalaciones y equipos (camión pluma, extintores, aire acondicionado, puesta a tierra, legionela…) con su última revisión, periodicidad, vencimiento y aviso; certificado de mantenimiento en PDF o foto; las fechas pasan al apartado 9 del informe cuatrimestral.
- **Consulta**: láminas de señalización de obras fijas (Norma 8.3-IC) y **Normativa PRL**: 33 fichas (qué regula, para qué sirve en obra y lo más importante) que se consultan sin cobertura, con enlace al texto consolidado del BOE, buscador y favoritas.
- **PSS/DGP**: una carpeta por obra con el PDF del plan de seguridad (o la DGP). La app saca el índice, busca por apartado o por palabras en todas las obras, abre la página exacta con el texto resaltado y, en la visita, el campo del apartado del PSS tiene un desplegable con ese índice.
- **Primera vez**: configuración en 3 pasos (perfil, contrato y primera visita).

## Contenido del repositorio

| Ruta | Qué es |
|---|---|
| `docs/` | La web que publica GitHub Pages: `VisitasPRL.html` (la app en un solo archivo), `index.html` (entrada) y `sw.js` (caché sin conexión). |
| `VisitasPRL.apk` | La app de Android firmada. |
| `codigo/app-web/` | Código fuente de la app web (`index.html` con todos los módulos ya integrados). |
| `codigo/informe/`, `codigo/inicio/`, `codigo/plan/`, `codigo/cal/`, `codigo/rev/`, `codigo/norma/`, `codigo/evrl/`, `codigo/pss/` | Fuentes de cada módulo y sus scripts `inject.py` (se ejecutan en ese orden: informe, inicio, plan, cal, rev, norma, evrl, pss). |
| `codigo/app-web/pdfjs/` | pdf.js 6.2.108 de Mozilla (licencia Apache 2.0), para leer los PDF del PSS/DGP. |
| `codigo/android/` | Proyecto Android (sin la clave de firma). |
| `codigo/LEEME.md` | Notas técnicas de cada versión. |

La **clave de firma** del APK (`firma/visitasprl.jks` y `clave.txt`) no está en el repositorio a propósito: guárdala aparte. Sin ella no se pueden publicar actualizaciones que se instalen encima.
