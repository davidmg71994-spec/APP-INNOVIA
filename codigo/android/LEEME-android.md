# Visitas PRL · app de Android

La app de registro de visitas va entera dentro del archivo **VisitasPRL.apk**. No necesita ninguna página web: funciona sin cobertura y los registros se guardan en el móvil.

## Instalarla en un móvil
1. Pasa **VisitasPRL.apk** al móvil: por WhatsApp, correo, cable USB o descargándolo desde la conversación de Claude.
2. Ábrelo desde WhatsApp, Gmail o la app Archivos. Android pedirá permiso para **instalar apps de origen desconocido** desde esa app: pulsa Ajustes y actívalo.
3. Si aparece un aviso de **Play Protect** («app desconocida»), pulsa **Más detalles › Instalar de todas formas**.
4. Abre **Visitas PRL** desde el escritorio del móvil.

## Pasar los registros que ya tenías en la app web
1. En la app web (la de antes): **Historial › Exportar copia** y guárdala en el móvil.
2. En la app de Android: **Historial › Importar copia** y elige ese archivo.

## Copia automática (desde la versión 1.3)
- Cada vez que se guarda un registro, la app escribe una copia en **Descargas › Visitas PRL › Copias**, un archivo por registro con su número (`RP-2026-DM-014.json`). Si se vuelve a guardar, se actualiza el mismo archivo.
- Esos archivos **no se borran al desinstalar la app**. Para recuperar los registros: Historial › **Importar copia** y elegir todos los archivos de la carpeta Copias. Nunca se sustituye un registro por una versión más antigua.
- Al instalar la 1.3 se copian también los registros que ya había en el móvil.
- Protege si se borra la app o sus datos, no si se pierde el móvil: para cambiar de teléfono, Historial › Exportar copia y pasarla al nuevo.
- Borrar un registro en la app no borra su copia: si se importa la carpeta entera, vuelve.
- Necesita Android 10 o posterior. En móviles más antiguos, Historial lo indica y hay que exportar la copia a mano.

## Actualizar
- Cuando haya una versión nueva, instala el APK nuevo **encima** del anterior. Los registros se mantienen.
- **No la desinstales**: desinstalar borra los registros del móvil. Si hay que hacerlo, antes Historial › Exportar copia.
- La versión instalada se ve en Historial (abajo): «Versión de la app: … · app Android».
- Al abrir una versión nueva por primera vez sale la pantalla **Novedades** con lo que ha cambiado. Se puede volver a ver en Historial › «Ver novedades».
- Quien instala la app por primera vez (sin registros ni borrador) ve la **Guía rápida** (4 pantallas) en lugar de las novedades. Se puede volver a ver en Historial › «Ver guía».

## Versiones
| Versión | versionCode | Fecha | Cambios |
|---|---|---|---|
| 1.0 | 1 | 29/10/2026 | Primera versión de la app de Android. |
| 1.1 | 2 | 29/10/2026 | Pantalla de novedades. |
| 1.2 | 3 | 29/10/2026 | Guía rápida la primera vez que se abre la app; mensaje ya escrito al compartir el PDF o la copia. |
| 1.3 | 4 | 29/10/2026 | Copia automática en Descargas › Visitas PRL › Copias; importar varios archivos a la vez; «Guardar y abrir» el PDF. |
| 1.4 | 5 | 29/10/2026 | Los 10 pasos de un vistazo arriba; la fila del logo se recoge al bajar y muestra la obra; «Guardar» / «PDF» abajo a la derecha en el Cierre. |
| 1.5 | 6 | 29/10/2026 | Vibración al responder (se quita en Historial); estado de guardado siempre visible en la barra de abajo. |
| 1.6 | 7 | 29/10/2026 | Preguntas más limpias: foto y observación solo al marcar No (botón grande «Hacer foto»); «+» para añadirlas en cualquier pregunta. |
| 1.6.1 | 8 | 29/10/2026 | «PSS» pasa a «PSS/DGP» en pantallas, informe y PDF. |
| 1.6.2 | 9 | 29/10/2026 | Corrección del mensaje al compartir con una sola deficiencia («Se ha detectado… la tienes detallada»). |
| 1.7.0 | 10 | 05/11/2026 | Nueva pestaña «Informe»: informe de seguimiento cuatrimestral rellenable por apartados, enlazado a las visitas guardadas, que se descarga como Word (.docx). Entra también en la copia de seguridad. |
| 1.8.0 | 11 | 06/11/2026 | Pantalla de Inicio corporativa de Innovia, perfil del técnico (nombre, cargo, teléfono, correo) y varios contratos: cada visita e informe guarda su contrato, el Historial se filtra por contrato y el Word del informe lleva el Nº SIE y el objeto del contrato. Planificación, EVRL, revisiones y normativa aparecen como «Próximamente». |
| 1.9.0 | 12 | 06/11/2026 | Planificación preventiva (tabla de seguimiento de medidas correctoras) por contrato y año: empieza en blanco, cada medida con su origen según la leyenda (periódica PRL, periódica CA-MA, visita del Responsable SPP/MA, auditoría, deficiencia en visita del técnico), vencimientos calculados, deficiencias de las visitas con un toque y Excel con el formato de Innovia. |
| 1.10.0 | 13 | 06/11/2026 | Barra de abajo por secciones (Inicio, Visitas, Documentos, Consulta, Perfil) con subpestañas arriba (Registro/Historial, Informe/Planificación/EVRL, Señalización/Normativa) y recorrido de primera vez en 3 pasos (perfil, contrato, primera visita). |
| 1.11.0 | 14 | 06/11/2026 | Planificación: botón «✓ Aplicada» en cada medida (y «Deshacer»), lista con las vencidas arriba (Vencidas, Pendientes, Aplicadas) y vista «Por meses» con la tira de los 12 meses. El vencimiento cuenta hasta el último día del mes. |
| 1.11.1 | 15 | 06/11/2026 | La plantilla del informe ya no guarda datos del informe que se usó de modelo (nombres, comentarios, cifras); el Word que sale es idéntico. Versión publicada también en GitHub. |
| 1.12.0 | 16 | 06/11/2026 | Calendario PRL desde Inicio: empieza en blanco y cada técnico añade sus tareas (sueltas o que se repiten cada semana, mes, 3, 4 o 6 meses o año), con contrato y tipo; agenda con vencidas, hoy, 7 días y 30 días; vista de mes; marcar hechas; ideas rápidas; entra en la copia de seguridad. |
| 1.13.0 | 17 | 06/11/2026 | Revisiones de instalaciones y equipos desde Inicio: editables, con periodicidad, vencimiento, aviso y estado; certificados en PDF o foto; «Revisión hecha» con historial; lista o tabla; «Rellenar con mis revisiones» en el apartado 9 del informe cuatrimestral; entran en la copia de seguridad. |
| 1.14.0 | 18 | 06/11/2026 | Normativa PRL: 33 fichas por norma (qué regula, para qué sirve en obra, lo más importante), sin cobertura, con enlace al texto consolidado del BOE; buscador, bloques y favoritas; enlazada con Revisiones y con las láminas de señalización. |
| 1.14.1 | 19 | 06/11/2026 | Revisiones: pestaña «+ Añadir» junto a Lista y Tabla para dar de alta una detrás de otra («Añadir y seguir», mismo contrato y centro, lista de añadidas y borrador si cambias de pestaña). |
| 1.15.0 | 20 | 06/11/2026 | EVRL con el modelo INNOVIA (I-CORP 20A-3): 41 riesgos, plantillas de puesto, valoración antes y después, medidas del modelo y propias, riesgos añadidos, varias EVRL por contrato y Word con el formato del modelo; abre los proyectos de la herramienta EVRL INNOVIA. |
| 1.16.0 | 21 | 07/11/2026 | Inicio nuevo: anillos de visitas del mes, medidas aplicadas y revisiones al día; «Hoy y vencidas» con el calendario, las revisiones y la planificación (al tocar se abre la ficha); gráfico de deficiencias por mes del contrato activo con tendencia y la más repetida; los nueve apartados en cuadrícula con su color y aviso rojo. |
| 1.17.0 | 22 | 08/11/2026 | Carpeta PSS/DGP por contrato (en Inicio y en Consulta): guarda el PDF del PSS/DGP y sus anexos, lee el índice (marcadores, índice impreso o títulos), visor de apartados dentro de la app y búsqueda inteligente (número, título y texto, con sinónimos PRL y resaltado en la página). En la visita, «Apartado del PSS/DGP» con desplegable del índice del contrato, sugerencias y aviso de si el número está en el índice. |
| 1.17.1 | 23 | 08/11/2026 | Una carpeta PSS/DGP por obra: lista de obras en Consulta › PSS/DGP con su botón «Añadir el PSS/DGP» / «Abrir la carpeta» y buscador en todas; botón del PSS/DGP en cada contrato de Perfil › Mis contratos; «Pasarlo a otra obra». |
| 1.18.0 | 24 | 08/11/2026 | Privacidad y seguridad: bloqueo con la huella o el PIN del móvil, copias de seguridad cifradas (AES-256) con contraseña, código de verificación SHA-256 en cada registro (Historial y pie del PDF) con versiones, letras dentro de la app, política de contenido que solo deja ejecutar el código de la app y corta las conexiones a fuera, bloqueo de peticiones externas en el APK, opción de impedir capturas, borrar registros antiguos o todo el móvil, texto de protección de datos en los PDF. |
| 1.18.1 | 25 | 09/11/2026 | Aviso en Inicio para guardar una copia fuera del móvil (OneDrive, SharePoint o correo de la empresa) cada 7 días, ajustable; entrega guiada de la copia; contraseña de las copias obligatoria al abrir la app en el móvil; al importar una copia cifrada en un dispositivo sin contraseña se queda la misma. |

## Cómo funciona en el móvil
- **PDF y copias de seguridad**: «Compartir» los envía por WhatsApp, correo, Drive…; «Guardar» los deja en **Descargas › Visitas PRL**. Con el PDF el botón es **«Guardar y abrir»**: lo guarda y lo abre con el visor del móvil para revisarlo.
- **Mensaje al compartir**: el PDF va con un mensaje ya escrito (obra, fecha, nº de registro y deficiencias encontradas) que se puede cambiar antes de enviarlo. El correo lo pone en el cuerpo y WhatsApp como texto del documento; además queda copiado, por si alguna app no lo pone (mantener pulsado › Pegar).
- **Fotos**: «Cámara» abre la cámara del móvil; «Galería» deja elegir fotos ya hechas.
- **Botón atrás del móvil**: cierra la ventana abierta o vuelve al paso anterior.
- **Vibración**: un toque al responder Sí o N.A. y dos si es una deficiencia (permiso VIBRATE, `AndroidApp.vibrar`). Se quita en Historial › Vibrar al responder.
- **Estado de guardado**: en el centro de la barra de abajo, «Borrador», «Cambios sin guardar» o «Guardado · hora».
- Solo funciona en **Android** (no en iPhone).

## Clave de firma (carpeta `firma`)
- `visitasprl.jks` y `clave.txt` son la firma de la app. Cada versión nueva tiene que firmarse con esta misma clave para poder instalarse encima de la anterior.
- **Guarda una copia en un sitio seguro** y no la compartas. Si se pierde, para actualizar habría que desinstalar la app (y perder los registros que no se hayan exportado).

## Para Claude (actualizar la app)
- Código fuente en `proyecto-android.zip` (manifiesto, Java, recursos y `build.sh`). La app web va en `assets/www` y se copia de la carpeta `registro-rp`.
- Construcción sin Gradle: aapt2 + javac + d8 (build-tools 36) + apksigner, plataforma android-34. Dominios necesarios: dl.google.com.
- En cada versión nueva hay que subir el `versionCode` (`./build.sh <versionCode> "<versionName>"`) y firmar con la clave de `firma/`.
- Copia automática: `copiaAutomatica(rec)` en `index.html` → `AndroidApp.copiaAuto(nombre, json)` (MediaStore Downloads, `Download/Visitas PRL/Copias/`, busca el archivo propio y lo sobrescribe con modo `wt`). Primera copia de lo que ya había: `copiaInicial()` (marca `copia-inicial`). Abrir el PDF: `AndroidApp.abrirUltimo(tipo)` tras `guardar`.
- La guía rápida está en `GUIA` (`index.html`): título, texto y dibujo de cada pantalla. El mensaje al compartir sale de `mensajeRegistro(r)`; en Android lo envía `AndroidApp.compartirTexto` (EXTRA_TEXT + portapapeles).
- Antes de construir, en `index.html`: subir `APP_VER` (igual que el versionName), añadir la versión nueva **al principio** de `NOVEDADES` (frases cortas, en lenguaje de técnico) y cambiar el texto de `#ver-t`. Quien venga de varias versiones atrás ve todas las novedades que se ha saltado.
- Huella SHA-256 del certificado de firma: `E0:BD:5C:46:0B:79:47:94:C5:77:16:25:50:2B:42:CD:0D:D2:03:C9:C1:C6:A6:96:9D:9B:E2:93:04:66:79:CA` (comprobar con `apksigner verify --print-certs`).

## Calendario PRL (versión 1.12.0)
- Se entra desde Inicio (tarjeta «Calendario PRL», que enseña lo de hoy, lo de 7 días y las vencidas). En la barra de abajo cuenta como Inicio. Empieza **en blanco**: cada técnico añade sus tareas.
- Tarea (IndexedDB `registro-rp-cal`, almacén `tareas`): `{id, t, k, ctr:{id,nombre,sie}|null, f (AAAA-MM-DD), rep, hasta, notas, hechas:{fecha: marca}, desde, creado, guardado}`. `k` = tipo con los colores del Calendario PRL: `vis` visitas y planificación, `inst` instalaciones, `veh` vehículos y maquinaria, `reg` índices y registros, `ma` medio ambiente, `hito` comités/informes/simulacros, `otr` otros.
- `rep`: `''` (una vez), `sem`, `mes`, `tri`, `cua`, `semes`, `anu`. Mensuales y demás caen el mismo día del mes (o el último si el mes es más corto). Las repeticiones anteriores a `desde` (el día en que se dio de alta) no cuentan, para no llenar de vencidas. Cada repetición se marca hecha por su fecha en `hechas`.
- Agenda: Vencidas (hasta 400 días atrás), Hoy, Próximos 7 días y Más adelante (hasta 30 días, solo la siguiente vez de cada tarea). Vista «Mes» (`localStorage['cal-modo']`): rejilla con un punto por tarea; al pulsar un día salen sus tareas. Filtro por contrato. «Ideas rápidas» al crear: rellenan título, tipo y repetición de las tareas habituales (no se crean solas).
- Va en la copia de seguridad (`calendario`). Código: `/home/claude/pwa/cal/` (`cal.js`, `cal.css`, `inject.py`, que va después de `plan/inject.py`). Prueba: `test-cal.js`.

## Revisiones de instalaciones y equipos (versión 1.13.0)
- Se entra desde Inicio (tarjeta «Revisiones», con vencidas y las que vencen ya). En la barra de abajo cuenta como Inicio. Empieza en blanco.
- IndexedDB `registro-rp-rev`: almacén `revs` `{id, nombre, ident, ctr, centro, empresa, cada (meses: 1,3,4,6,12,24,36,60), ultima (AAAA-MM-DD o AAAA-MM si solo se sabe el mes), aviso (días: 0,7,15; 30 y 60 = 1 y 2 meses de calendario), inf:[casillas del informe], notas, hist:[fechas anteriores]}` y almacén `docs` `{id, rev, fecha (la revisión que certifica), nombre, tipo, tam, blob}` con el PDF o la foto (las fotos de más de 1,2 MB se reducen a 2200 px).
- Vence = última + periodicidad (mismo día; si solo hay mes, el último día del mes). Estado: vencida; «vence ya» (pasado el aviso o a 30 días o menos); «en 60 días»; vigente. «Revisión hecha» pasa la última al historial. Falta certificado = no hay archivo con la fecha de la última.
- Informe cuatrimestral, apartado 9 (`extraSec` en `informe.js`): «Rellenar con mis revisiones» llama a `REV_API.paraInforme(INF)`. Cogen las revisiones del contrato del informe y las sin contrato, con la última fecha hecha antes de «Hasta» del informe. Casillas: `tierra` y310/f_rev_tierra, `pci` y313/f_rev_pci, `aire` y316/f_rev_aire, `bt` y319/f_rev_bt, `elev` y322/f_rev_elev (todas las fechas), `otros` y325/f_rev_otros + f_rev_otros_f, `legio` y327/f_legio (+ y330 si es el PPCL); y308 = SÍ. SÍ si está vigente a esa fecha, NO si vencida (y lo apunta en Comentarios si está vacío). Fechas dd/mm/aa (legionela dd/mm/aaaa).
- Copia de seguridad: `revisiones:{revs, docs}` con los archivos en base64. `Revisiones_V1_Teruel.json` (fuera del repositorio) es la tabla de David lista para importar con Historial › Importar copia.
- Código: `/home/claude/pwa/rev/` (`rev.js`, `rev.css`, `inject.py`, después de `cal/inject.py`). Prueba: `test-rev.js`.

## Normativa PRL (versión 1.14.0)
- En Consulta › Normativa y en la tarjeta «Normativa PRL» de Inicio (`GRUPO.norma = 'con'`). 33 fichas en `norma/datos.js` (`NORMAS`, revisadas con el BOE el 06/11/2026): `{id, b (bloque), c (código), n (nombre), f (título oficial), u (enlace), est ('nueva'|'futuro'|'cambia'|'tram'), nota, q (qué regula), o (para qué sirve en obra), a ([referencia, resumen]), rel ({rev:[casillas], lam}), k (palabras de búsqueda)}`.
- Enlaces: BOE por ELI al texto consolidado (`https://www.boe.es/eli/es/<tipo>/<aaaa>/<mm>/<dd>/<número>/con`), la 8.3-IC por su ELI (BOE-A-1987-21608) y los reglamentos UE por EUR-Lex. En Android los abre el navegador (`shouldOverrideUrlLoading`).
- Buscador sin acentos, filtro por bloque, favoritas en `localStorage['norma-fav']`. `NORMA_REV_MAP` une las casillas de Revisiones con su norma (pci→RIPCI, tierra/bt→REBT, aire→RITE, legio→RD 487/2022, elev→RD 1215/1997 y ITC AEM-4, otros→RD 1215/1997); cualquier `[data-norma]` abre la ficha.
- Al actualizar: revisar el código electrónico «Prevención de riesgos laborales» del BOE y cambiar `NORMA_REV`. Incluye el RD 847/2026 de amianto (en vigor el 24/10/2026, deroga el RD 396/2006) y el Reglamento (UE) 2023/1230 (desde el 20/01/2027). Ojo: los camiones grúa no están en la ITC AEM-4.
- Código: `/home/claude/pwa/norma/` (`datos.js`, `norma.js`, `norma.css`, `inject.py`, después de `rev/inject.py`). Prueba: `test-norma.js`.
- GitHub Pages publica desde la carpeta `docs/` (la web: `docs/VisitasPRL.html`, `docs/index.html`, `docs/sw.js`); la raíz redirige a `docs/`.

## Revisiones › + Añadir (versión 1.14.1)
- Tercera pestaña en Revisiones (`modo = 'nueva'`, no se recuerda entre sesiones): el formulario de alta va dentro de la pantalla, bajo la cabecera. «Añadir y seguir» guarda y abre otro en blanco con el mismo contrato y centro (`enBlanco(r)`); debajo, «Añadidas ahora» (`recientes`). Al cambiar de pestaña, filtro o salir, lo escrito se guarda en `borrador` (`aparcar()`). «Vaciar el formulario» borra también los certificados subidos sin guardar. El botón de abajo «+ Nueva revisión» abre esta pestaña. Atrás de Android: vuelve a Lista o Tabla.

## Evaluación de riesgos (EVRL) (versión 1.15.0)
- Documentos › EVRL y la tarjeta de Inicio (`GRUPO.evrl = 'doc'`). Es la herramienta «EVRL INNOVIA» (modelo I-CORP 20A-3) pasada a la app: `evrl/datos.json` (41 tipos de riesgo con sus textos y medidas por puesto de origen, 4 plantillas de puesto, notas, trozos del Word y numeraciones) y `evrl/plantilla.docx` (la plantilla del modelo, con autor «Innovia»). `inject.py` los mete como `DATA` y `TPL_B64` dentro del módulo.
- Estado de cada EVRL igual que en la herramienta (`{v, doc:{contrato, anexo, tipo, pg, toc}, puestos:[{id, name, base, maq, notes, risks:{clave:{on, vi, esp, v:[P,S,R,P2,R2], off, custom}}, extra}], sel}`), así que sus proyectos .json se abren tal cual. En IndexedDB `registro-rp-evrl` (`docs`: `{id, ctr, S, creado, guardado}`), guardado automático a los 0,4 s.
- El Word se genera con el mismo código que la herramienta (`buildDocumentXml`, `remapNums`, `buildDocx` con JSZip): comprobado que `word/document.xml` y `word/numbering.xml` salen idénticos con el mismo proyecto. Se entrega con `entregar()`.
- Copia de seguridad: `evrl:[docs]`. Código: `/home/claude/pwa/evrl/` (`evrl.js`, `evrl.css`, `inject.py`, después de `norma/inject.py`). Prueba: `test-evrl.js`.

## Inicio visual (versión 1.16.0)
- Cabecera: fecha, saludo, contrato activo y tres anillos que llevan a su apartado: **Visitas del mes** (visitas guardadas del contrato este mes / visitas previstas en el Calendario: tareas de tipo «Visitas» con «visita» en el nombre; si no hay, 2), **Medidas aplicadas** (planificación del contrato y del año, `PLAN_API.resumenActivo()`) y **Revisiones al día** (las del contrato y las sin contrato que no están vencidas, `REV_API.alDia(id)`). Sin datos: «—».
- **Hoy y vencidas**: une `CAL_API.pendientes()` (una línea por tarea, con la fecha más antigua sin marcar), `REV_API.pendientes()` (vencidas y en aviso) y `PLAN_API.pendientes()` (medidas vencidas o que vencen en 30 días, planificaciones del año). Orden: vencidas, hoy y próximas. Muestra 5 y «Ver todo». Al tocar: `CAL_API.editar`, `REV_API.editar`, `PLAN_API.editarFila`.
- **Deficiencias por mes**: barras de los últimos 6 meses del contrato activo (`resumen.inc` de cada visita), tendencia (3 últimos meses contra los 3 anteriores) y la deficiencia más repetida (con `analyze()`, guardada en caché por registro).
- **Apartados**: cuadrícula de 3 con color por apartado (Historial naranja, Calendario morado, Informe y Planificación azul, EVRL azul pizarra, Revisiones verde, Señalización ocre, Normativa gris, Mi perfil turquesa) y aviso rojo con las vencidas. Modo oscuro con sus propios tonos de aviso.
- Código: `/home/claude/pwa/inicio/` (después reinyectar plan, cal, rev, norma y evrl). Prueba: `test-ini16.js`.

## Carpeta PSS/DGP (versión 1.17.0)
- Inicio (tarjeta «Carpeta PSS/DGP» con buscador, y apartado PSS/DGP en la cuadrícula en lugar de «Mi perfil», que sigue en el avatar y en la barra) y Consulta › PSS/DGP (`GRUPO.pss = 'con'`).
- Por contrato: el contrato activo o el elegido arriba. Varios PDF por contrato (PSS/DGP, anexos, adendas). En IndexedDB `registro-rp-pss`: `docs` (`{id, ctr, nombre, titulo, tam, paginas, indice:[{n, t, p, l}], idx, fuente, escaneado, estado}`), `pdf` (el Blob) y `txt` (texto de cada página).
- Lector: pdf.js 6.2.108 (versión «legacy», Apache 2.0) en `registro-rp/pdfjs/` (`pdf.min.js`, `pdf.worker.min.js`, `wasm/` para imágenes JPX/JBIG2). Se carga al usarlo (`import()`). En la web de un solo archivo va dentro como `<script type="text/plain" id="pdfjs-src">` y `pdfjs-worker`, y se carga desde un Blob. La app Android sirve `.wasm` como `application/wasm` y el selector filtra PDF cuando el campo solo acepta PDF.
- Índice, por orden: marcadores del PDF (si tienen número), índice impreso (líneas con puntos y página; calcula el desfase entre la página impresa y la del PDF buscando cada título) o títulos numerados del texto (secuencia 1, 1.1, 1.2, 2…). Títulos en mayúsculas pasan a «Malla de cerramiento» (respeta EPI, PSS, BT…). Si es escaneado o no hay índice: «Pegar el índice a mano».
- Búsqueda (`buscar`): número («6.1.9» → ese apartado y los de dentro); título; texto de las páginas (todas las palabras en la misma página, raíces «andamios» = «andamio», «nocturna» = «nocturno», y sinónimos PRL: EPI, altura/caída/arnés, camión pluma/grúa, señalización/balizamiento…). Cada hallazgo se asigna al apartado según dónde empieza su título dentro de la página. Visor con lazy render (25 páginas de una vez) y palabras resaltadas en amarillo.
- Visita: el campo «Apartado del PSS/DGP» lleva el botón «Índice» (hoja con el árbol y buscador), sugerencias al escribir el número o la actividad y el aviso debajo (✓ está en el índice / ⚠ no está / sube el PSS). Elegir pone el número, la actividad (si estaba vacía o venía del índice) y «Sí» en «¿Está recogida…?». Desde un apartado, «Usar en la visita».
- Copia de seguridad: `pss:[…]` con el índice, sin el PDF (estado `sinpdf` al importar; «Añadir el PDF» lo vuelve a unir).
- Código: `/home/claude/pwa/pss/` (`pss.js`, `pss.css`, `inject.py`, el último inyector, después de `evrl/inject.py`). Pruebas: `test-pss.js` y los PDF de prueba que genera `scratchpad/pss/gen.py` y `gen2.py`.
- Una carpeta por obra (1.17.1): con 2 o más obras, Consulta › PSS/DGP y el apartado de la cuadrícula abren la lista de obras (`renderObras`), cada una con «Añadir el PSS/DGP» (`data-psa="addobra"`) o «Abrir la carpeta», y el buscador mira en todas. La tarjeta de Inicio abre directamente la carpeta de la obra activa. Dentro de una carpeta, «‹ Todas las obras» y el atrás de Android vuelven a la lista. En Perfil › Mis contratos, cada contrato tiene su botón (`data-ini="pssobra"`: ver si tiene PSS, añadir si no). En la visita salen los PDF de su obra y los que no tienen obra; los de obras que ya no están en el perfil van a «Sin obra asignada». Menú del PDF: «Pasarlo a otra obra».

## Privacidad y seguridad (versión 1.18.0)
- Perfil › Privacidad y seguridad (`#view-seg`, `GRUPO.seg = 'pf'`): estado con semáforo, bloqueo, copias cifradas, comprobar un código, texto de protección de datos para los PDF, qué guarda la app, borrar registros antiguos o todo, información técnica. Bloque resumen en Mi perfil (`SEG_API.perfilHtml()`).
- **Bloqueo**: en Android usa el bloqueo del móvil (`AndroidApp.bloqueoDisponible()`, `desbloquear()` → `SEG_API.resultado(ok, msg)`; BiometricPrompt en Android 10+ con BIOMETRIC_WEAK|DEVICE_CREDENTIAL, KeyguardManager en 7–9). Al volver de segundo plano la app nativa llama a `SEG_API.vuelve(ms)` (onStop/onStart). En la web, PIN propio (`seg-pin`: PBKDF2-SHA256 200 000, sal) con espera tras 5 fallos (`seg-int`) y bloqueo por inactividad. Ajustes en `seg-cfg` {lock, min, captura}. El `<script>/*SEG-HEAD*/` pone `html.seg-lk` antes de pintar. Con la app bloqueada, `appBack` devuelve false.
- **Copias cifradas**: AES-256-GCM, PBKDF2-SHA256 600 000, sal 16 B, IV 12 B, AAD `registro-rp`. Clave `CryptoKey` no extraíble en IndexedDB `registro-rp-seg` (store `k`, id `copias`, con `chk`). Formato: `{app, cifrado:{v,alg,kdf,it,sal,iv}, exportado, datos}`. `exportBackup` → `SEG_API.prepararCopia`; `importBackup` → `SEG_API.descifrarCopia` (pide la contraseña, guarda la clave por sal durante la sesión); `copiaAutomatica` es async y cifra con `SEG_API.cifrarAuto`. Al crear o cambiar la contraseña se reescriben las copias automáticas y `AndroidApp.copiasLimpiar(json)` borra las que no tienen registro.
- **Código de verificación**: `rec.integ = {h, v, f, trasFirma?, alterado?, ini?}` y `rec.cambios` (hasta 50 versiones). `h` = SHA-256 del JSON canónico (claves ordenadas) sin `guardado`, `integ`, `cambios`. Se sella en `guardar()`, al importar (`sellarImport`: si no coincide, versión nueva con `alterado`) y una vez los registros antiguos (`ini`). Sale en el Historial (`SEG_API.histLinea`) y al pie del PDF (`codigoPdf`: solo si el registro está guardado y sin cambios).
- **Política de contenido** (`seg/csp.py`): meta CSP con la huella SHA-256 de cada `<script>` en línea; `connect-src 'self' data: blob:`, `frame-src`/`object-src 'none'`, `form-action 'none'`, `base-uri 'none'`, `'wasm-unsafe-eval'` para pdf.js. **Cualquier cambio en `index.html` obliga a volver a ejecutar `seg/inject.py` (o `build_single.py` para la web de un archivo): si no, las huellas no coinciden y la app no arranca.** pdf.js con `isEvalSupported:false`.
- Letras dentro de la app (`seg/fonts/*.woff`, subconjunto latino, SIL OFL), sin Google Fonts. `<meta name="referrer" content="no-referrer">`.
- Android: `shouldInterceptRequest` responde 403 a toda petición http(s)/ws a otro host; WebView sin acceso a archivos ni geolocalización, Safe Browsing; `pantallaSegura(on)` = FLAG_SECURE; `dataExtractionRules` (`res/xml/extraccion.xml`) sin copia en la nube; `usesCleartextTraffic=false`.
- Código: `/home/claude/pwa/seg/` (`seg.js`, `seg.css`, `csp.py`, `fonts/`, `inject.py`, **el último inyector**, después de `pss/inject.py`). Prueba: `test-seg.js`. Dossier para Informática: documento «Visitas PRL · Dossier de seguridad para Informática».
- **1.18.1 · Copia fuera del dispositivo y contraseña obligatoria**: `seg-copia-fuera` guarda cuándo se compartió o guardó fuera la última copia; `SEG_API.pendiente()` añade la tarea «Guardar una copia fuera del móvil» a «Hoy y vencidas» de Inicio (`MOD.seg`, icono `IC.copia`) cuando pasan `cfg().aviso` días (3, 7 por defecto, 15 o 30). `exportBackup` entrega con `SEG_API.entregarCopia`: en Android «Compartir» (OneDrive, Teams, correo) cuenta como copia fuera y «Guardar en el móvil» no; en el ordenador, `showSaveFilePicker` con `id:'copias-visitas-prl'` (recuerda la carpeta de OneDrive) o descarga. En Android, si no hay contraseña de copias, al abrir (después del desbloqueo) sale la pantalla «Protege tus copias», que no se puede saltar (`exigirClave`; en las pruebas con `?test` solo sale si se añade `&segclave`). Al importar una copia cifrada en un dispositivo sin contraseña, se queda la de la copia. Prueba: `test-seg2.js`.
