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
- Huella SHA-256 del certificado de firma: `e0bd5c46…046679ca` (comprobar con `apksigner verify --print-certs`).

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
