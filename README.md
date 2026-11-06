# Visitas PRL · Innovia

App para los técnicos de PRL de Innovia: registro de comprobación del recurso preventivo en obra, informe de seguimiento cuatrimestral y planificación preventiva, con salida en PDF, Word y Excel.

**Versión 1.12.0 · 06/11/2026**

## Cómo usarla

| Dónde | Cómo |
|---|---|
| **Android** | Descarga [`VisitasPRL.apk`](VisitasPRL.apk) e instálala (si ya la tienes, se instala encima y no se pierde nada). |
| **iPhone, tablet u ordenador** | Abre [`VisitasPRL.html`](VisitasPRL.html) en el navegador. Con GitHub Pages activado, la dirección es `https://davidmg71994-spec.github.io/app-innovia/`. |

Los datos (visitas, informes, planificaciones, calendario y perfil) se guardan **solo en el móvil** de cada técnico. Para cambiar de móvil o pasar datos: *Visitas › Historial › Exportar copia* e *Importar copia*.

## Qué hace

- **Inicio**: saludo, contrato activo y cifras del mes (visitas, deficiencias, informes).
- **Perfil y contratos**: cada técnico pone sus datos y los contratos que lleva (nombre, Nº SIE, objeto). Todo se guarda ligado a su contrato.
- **Visitas**: registro de comprobación paso a paso, con fotos, firma y PDF; historial filtrado por contrato.
- **Documentos**
  - *Informe de seguimiento*: los apartados del informe cuatrimestral; las visitas entran solas y sale el Word con el formato de Innovia.
  - *Planificación preventiva*: tabla de seguimiento de medidas correctoras por contrato y año, con el origen de cada medida según la leyenda (periódica PRL, periódica CA-MA, visita del Responsable SPP/MA, auditoría, deficiencia en visita), vencimientos, vista por meses y Excel con el formato de Innovia.
- **Calendario PRL**: cada técnico apunta sus tareas (sueltas o que se repiten cada semana, mes, trimestre o año), con contrato y tipo; agenda con vencidas, hoy y próximos días, vista de mes y marcar como hechas. Empieza en blanco.
- **Consulta**: láminas de señalización de obras fijas (Norma 8.3-IC).
- **Primera vez**: configuración en 3 pasos (perfil, contrato y primera visita).

## Contenido del repositorio

| Ruta | Qué es |
|---|---|
| `VisitasPRL.html` | La app web en un solo archivo (funciona sin conexión). |
| `index.html`, `sw.js` | Entrada para GitHub Pages y caché sin conexión. |
| `VisitasPRL.apk` | La app de Android firmada. |
| `codigo/app-web/` | Código fuente de la app web (`index.html` con todos los módulos ya integrados). |
| `codigo/informe/`, `codigo/inicio/`, `codigo/plan/`, `codigo/cal/` | Fuentes de cada módulo y sus scripts `inject.py` (se ejecutan en ese orden: informe, inicio, plan, cal). |
| `codigo/android/` | Proyecto Android (sin la clave de firma). |
| `codigo/LEEME.md` | Notas técnicas de cada versión. |

La **clave de firma** del APK (`firma/visitasprl.jks` y `clave.txt`) no está en el repositorio a propósito: guárdala aparte. Sin ella no se pueden publicar actualizaciones que se instalen encima.
