# Registros Visitas Técnicos PRL (Innovia)

> **Desde el 29/10/2026 solo se mantiene la app de Android «Visitas PRL»** (ver `app/android/LEEME-android.md`). La carpeta `registro-rp` sigue siendo el código de la app (va dentro del APK), pero la versión web en Netlify y el artefacto de Claude ya no se actualizan.

App web instalable (PWA) para el Registro de Comprobación del Recurso Preventivo. Funciona sin Claude y sin conexión.

## Archivos de la carpeta `registro-rp/`
- `index.html`: toda la app (formulario, checklist, firma, fotos, PDF, historial local y copia de seguridad).
- `sw.js`: permite que funcione sin conexión. Si se cambia algún archivo distinto de `index.html`, hay que subir la versión (`registro-rp-v1` → `v2`).
- `manifest.webmanifest`: nombre, colores e iconos de la app instalada.
- `pdf-lib.min.js`: librería pública pdf-lib 1.17.1 que genera el PDF (no hay que tocarla).
- `icons/`: iconos de la app y logo de Innovia (versión clara y oscura).
- Imagen: colores y logo de Innovia (naranja #E56F0B, gris #605F5D), tipografías Montserrat y Source Sans 3.

## Cómo publicar una nueva versión
1. Entrar en Netlify → el sitio de la app → pestaña **Deploys**.
2. Arrastrar la carpeta `registro-rp` actualizada al recuadro de esa pestaña. No usar la página de Drop: eso crearía otro sitio con otro enlace.
3. Los móviles se actualizan solos la próxima vez que abren la app con conexión. Los registros guardados en cada móvil se mantienen.

## Estructura del cuestionario
Cada tema se rellena en un único bloque, con sus datos y sus comprobaciones juntos (campo `home` de cada sección en `SECS`), en este orden:
Datos generales · Actividad y PSS (+ cumplimiento del PSS) · Trabajadores (empresa vacía = personal propio; si es subcontrata, «¿Aparece validado y en verde en NALANDA?» por trabajador) · EPI de los trabajadores (4 generales —«vestuario laboral de alta visibilidad en buen estado», sin indicar clase— + «EPI específicos según el trabajo»: una sola pregunta con botones; solo se abren, cuentan y salen en el PDF y en el informe los marcados, el resto queda como «No aplica»: «Trabajos en altura» — arnés anticaídas anclado, amarre con absorbedor o anticaídas, casco con barbuquejo, equipos anticaídas en buen estado y revisados, y andamios bien montados (antes estaba en maquinaria) — «Trabajos de poda y tala» — botas, guantes, pantalones y manguitos anticorte, protectores auditivos, casco forestal y espinilleras —, «Desbroce con desbrozadora» — pantalla facial de malla o gafas, protectores auditivos, perneras o polainas, guantes y botas —, «Corte con radial» — pantalla facial y gafas de montura integral a la vez, protectores auditivos, guantes y mascarilla FFP2/FFP3 — y «Trabajos de soldadura» — mandil, manguitos de protección, guantes de soldador y pantalla con gafas de soldadura. Son las secciones `ta`, `pt`, `de`, `ra` y `so` con `key` en `SECS`. Se quitó «En general… ¿utilizan correctamente los EPI?»; los registros antiguos pasan la respuesta del arnés a «Trabajos en altura».) · Vehículos (+ 4 comprobaciones y su orden y limpieza) · Seguridad y equipamiento (8: extintores, botiquín, accesos…) · Maquinaria y equipos (botones, incluido «Grupo de oxicorte»; foto opcional de cada equipo marcado; + 4 comprobaciones) · Productos químicos (botón «No hay productos químicos (N.A.)» que oculta el bloque; foto opcional de cada producto; + 1) · Comprobaciones generales de la obra: inspección visual (4) · Cierre (otras observaciones, otras mejoras, informe, firma).
En el PDF, el registro mantiene el orden del formulario original; la tabla de trabajadores lleva la columna NALANDA.

## Firmas de los trabajadores
- En el cierre, cada trabajador añadido tiene «Firmar»: abre un panel con su nombre y el texto «Firmo como conocedor de las observaciones de esta visita». La firma se guarda en el propio trabajador (`firma`).
- En el PDF salen en una cuadrícula («Enterado de los trabajadores») bajo la firma del técnico en la página 1, y otra vez al final del registro («Firmas de los trabajadores»). Los que no han firmado aparecen como «Sin firmar».

## Consulta: Señalización de obras fijas
- Pestaña «Señalización» con las 62 láminas del Manual de ejemplos de señalización de obras fijas (DGC, Ministerio de Fomento, 1997; Norma 8.3-IC) y 3 páginas de criterios generales.
- Imágenes en `senal/pNN.jpg` (NN = página del PDF original) y miniaturas en `senal/t/`. El índice (número de ejemplo, tipo de vía, zona de obra, figura) está en `SEN` dentro de `index.html`.
- Las láminas se guardan en el móvil al abrirlas o con «Descargar todas» (caché `registro-rp-senal`, que no se borra al actualizar la app).
- El botón «Ver ejemplos» está junto a «Ejemplo del manual que aplica», debajo de la pregunta de normativa de la señalización (iv4).
- En la pregunta iv4 («¿La señalización provisional de obra y su balizamiento cumplen con la normativa?») se elige el ejemplo del manual que aplica (hasta 3), con el desplegable o con «Usar en este registro» desde el visor. Se guarda en `senEj` (páginas). El informe redactado cita el ejemplo, la fila de iv4 del PDF lo indica y el PDF añade la lámina como anexo.

## Cabecera del PDF y numeración
- El logo de Innovia, el título del documento y el prefijo del número están al principio del script de `index.html`, en `EMPRESA`.
- Cada registro recibe un número al guardarlo o al sacar el PDF: `RP-AAAA-INICIALES-NNN` (ej. RP-2026-LGR-014). Las iniciales salen del nombre del Recurso Preventivo y el contador es de cada móvil.

## Informe redactado
- El PDF empieza con un «Informe de la visita» redactado al estilo de los informes de los técnicos: lugar y horario, actividad del PSS, «Referente a la señalización / al personal propio / a las subcontratas / a los vehículos…», y al final las listas numeradas de «Observaciones» y «Oportunidades de mejora».
- Datos que lo alimentan: horario, actividad y apartado del PSS, NALANDA de cada trabajador de subcontrata, preguntas de EPI, marca de «oportunidad de mejora» en cada «No», y «Otras observaciones / Otras oportunidades de mejora».
- Personal propio = trabajadores sin empresa subcontratada (o con «Innovia»).
- Si un «No» tiene observación escrita, en el informe se usa ese texto; si no, la frase de `NEG`.
- En el cierre del registro se ve la vista previa; «Editar texto» permite retocarlo y entonces deja de actualizarse solo.

## Datos
- Cada móvil guarda su historial (IndexedDB). No hay servidor ni historial común.
- Al cambiar la estructura de un registro hay que mantener la compatibilidad con los registros ya guardados y con las copias de seguridad (.json).

## Foto obligatoria en las deficiencias
- Desde la 1.6, los botones Observación / Cámara / Galería solo se ven al marcar una deficiencia, si la pregunta ya tiene foto u observación, o al pulsar «+» junto a Sí / No / N.A. (`openTools`). Si falta la foto obligatoria sale el botón rojo «Hacer foto de la deficiencia» (`#fr-<id>`, abre la cámara).
- Si una comprobación queda como deficiencia (No, o Sí en la pregunta invertida) y no está marcada como oportunidad de mejora, la app muestra «Foto obligatoria» y no deja guardar ni descargar el PDF hasta que tenga al menos una foto; al pulsar «Completar» lleva a la primera que falta. Función `sinFotoDe` en `index.html`.

## Seguridad y equipamiento
- «¿Las zonas de paso están libres de obstáculos?» (se9) sustituye a la antigua pregunta invertida de obstrucciones (se8; las respuestas antiguas se convierten al revés). Se quitó «¿Se han señalizado adecuadamente los accesos peligrosos?» (se7).

## Formulario por pasos
- El registro se rellena paso a paso (10 pasos: Datos, PSS, Trabajadores, EPI, Vehículos, Seguridad, Equipos, Químicos, Obra / tajo, Cierre). Solo se ve un bloque cada vez; abajo, la barra «‹ Anterior · Paso X de 10 · estado · Siguiente ›».
- Los tramos de arriba (numerados, de colores) llevan a cualquier paso. En Cierre, «Pasos sin completar» lista lo que falta y lleva a cada paso.
- El paso actual se recuerda en el móvil (`paso` en localStorage). Al empezar, abrir o duplicar un registro se vuelve al paso 1. Funciones `setStep`, `renderWiz`, `stepOf` en `index.html`.
- Al responder Sí o N.A., la pantalla baja sola a la siguiente pregunta sin responder del paso (`siguientePregunta`); al responder No se queda para añadir foto y observación. Cuando el paso está completo, el botón «Siguiente» se resalta.
- Desde la 1.4, arriba se ven los 10 pasos como tramos de colores (verde completo, rojo con deficiencias, gris pendiente); el actual es más ancho y lleva su nombre. La fila del logo se recoge al bajar (`top-min`) y vuelve al subir; arriba del todo muestra la obra (`renderCabecera`). En el Cierre, el botón de abajo a la derecha es «Guardar» y, una vez guardado sin cambios, «PDF».

## Alojamiento: Netlify (créditos) o Cloudflare Pages
- En el plan gratuito de Netlify cada publicación en producción gasta 15 de los 300 créditos mensuales (unas 20 publicaciones al mes). Si se acaban, el sitio se pausa hasta el siguiente ciclo.
- Desde la versión 29/10/2026 · 12:10, si el alojamiento responde con una página de error (sitio pausado, caído…), la app instalada se abre con la copia guardada en el móvil.
- Alternativa gratuita con el mismo «arrastrar y soltar»: Cloudflare Pages › Workers & Pages › Crear › Pages › Subir recursos (Upload assets). Se arrastra la carpeta `registro-rp` o el zip. Para actualizar: el proyecto › «Create a new deployment». Dirección: `<nombre-del-proyecto>.pages.dev`.
- Al cambiar de dirección, cada técnico debe exportar la copia de seguridad en la app antigua (Historial › Exportar copia) e importarla en la nueva.

## Guía rápida y novedades
- La primera vez que se abre la app (sin registros ni borrador) sale la «Guía rápida»: 4 pantallas (pasos, foto obligatoria, firma y envío, historial y copia). Está en `GUIA` en `index.html`; se vuelve a ver en Historial › «Ver guía».
- Si ya se usaba la app y la versión es nueva, sale «Novedades» (`NOVEDADES`, `APP_VER`). Ver `app/android/LEEME-android.md`.

## Mensaje al compartir
- Al compartir el PDF, la ventana muestra un mensaje ya escrito y editable: «Hola, te paso el registro de la visita a <obra> del <fecha> (nº <código>). Se han detectado N deficiencias y M oportunidades de mejora; las tienes detalladas en el PDF. Un saludo, <técnico>». Función `mensajeRegistro(r)`. La copia de seguridad lleva un mensaje con el número de registros y cómo recuperarla.

## Copia automática y abrir el PDF (versión 1.3, solo app de Android)
- Al guardar un registro se copia en Descargas › Visitas PRL › Copias › `<nº de registro>.json` (función `copiaAutomatica`). «Importar copia» admite varios archivos a la vez y no sustituye un registro por una versión más antigua.
- Al guardar el PDF («Guardar y abrir») se abre con el visor del móvil.

## Vibración y estado de guardado (versión 1.5)
- Al responder, `vibrar('ok' | 'mal' | 'quitar')` llama a `AndroidApp.vibrar` (un toque; dos si es deficiencia). Ajuste en Historial (`vibrar` en localStorage).
- En la barra de abajo, `estadoGuardado()`: «Borrador» (sin id), «Cambios sin guardar» (`dirty`) o «Guardado · hora».

## PSS/DGP (versión 1.6.1)
- En toda la app (paso 2, preguntas, informe redactado y PDF) se dice «PSS/DGP» en lugar de «PSS». Los nombres internos (`enPss`, `b-pss`) no cambian, así que los registros antiguos siguen valiendo.


## Informe de seguimiento (versión 1.7.0)
- Pestaña «Informe»: un formulario por apartados (calcado del Word `Informe_de_seguimiento`) que se guarda solo en IndexedDB `registro-rp-informes`. Las visitas del periodo (desde/hasta, con exclusiones) se leen de `registro-rp-historial` y rellenan el apartado de visitas, las observaciones y las fotos.
- Al terminar, «Generar el Word» rellena una plantilla .docx incrustada (base64, JSZip 3.10.1) tocando `word/document.xml`: casillas, textos, filas duplicadas (trabajadores/equipos), bloques de visita y fotos.
- Código fuente en `/home/claude/pwa/informe/`: `gen.py`/`gen2.py` (→ `schema.json`), `build_tpl.py` (→ `plantilla.docx`, `protos.json`), `informe.js`, `informe.css`, `inject.py` (mete todo en `index.html`; se puede repetir). Pruebas: `test-informe.js` y `test-informe2.js`.
- El informe entra en la copia de seguridad (`informes`).
- Pendiente de probar en Word real y en el móvil.

## Inicio y contratos (versión 1.8.0)
- La app abre en «Inicio» (pestaña nueva, la primera de abajo): cabecera azul de Innovia con el saludo, el contrato activo y las cifras del mes; accesos a Historial, Señalización e Informe; Planificación preventiva, EVRL, Hoy y vencidas, Revisiones y Normativa salen como «Próximamente».
- Perfil del técnico (pulsando sus iniciales): nombre (es el mismo `rp-nombre` de siempre), cargo, teléfono, correo y sus contratos. Se guarda en `localStorage['perfil']` = `{cargo, tel, email, activo, contratos:[{id, nombre, sie, cliente, osm}]}` y va dentro de la copia de seguridad (`perfil`); al importar se añaden los contratos que falten.
- Cada registro guarda `contrato: {id, nombre, sie}` (los antiguos, `null`; al crear el primer contrato la app ofrece asignárselos). El paso «Datos» tiene un selector de contrato, el PDF lleva una fila «Contrato» y el Historial tiene chips por contrato (por defecto, el activo).
- El informe de seguimiento guarda su contrato, solo recoge las visitas de ese contrato y en el Word cambia el Nº SIE de la cabecera y el objeto (O/S/M) por los del contrato.
- Código fuente en `/home/claude/pwa/inicio/`: `inicio.js`, `inicio.css` e `inject.py` (mete los bloques `INI-*` y aplica los parches del script principal; se puede repetir y va DESPUÉS de `informe/inject.py`). Prueba: `test-inicio.js` y `t-ini-ter.js`.
- `tutil.js` abre la pestaña Registro si hace falta, porque la app ya no arranca en el formulario.

## Planificación preventiva (versión 1.9.0)
- Se entra desde Inicio. Una planificación por contrato y año (IndexedDB `registro-rp-plan`, almacén `planes`): `{id, anio, contrato, filas:[{id, cat, tipo, riesgo, prio, medida, fdet (AAAA-MM), plazo, fapl (AAAA-MM-DD), coste, resp, reg, obs, origen}]}`. Empieza en blanco; si hay una del año anterior del mismo contrato, ofrece copiar las periódicas (naranja y verde).
- `cat` = origen según la leyenda del Excel: `prl` (naranja F7CAAC), `ma` (verde E2EFD9), `spp` (azul DEEAF6, visita del Responsable SPP/MA), `aud` (rojo EA9999, auditorías), `def` (blanco, deficiencias en visitas del técnico). En `spp`/`aud` (y en las oportunidades de mejora) `tipo` = obs / nc / om y en el Excel se añade «(Observación)», «(N.C)» u «(O.M)» al riesgo.
- Estado: aplicada si tiene fecha de aplicación; si no, vence = último día del mes (mes de detección + plazo; los plazos en días o semanas cuentan como el propio mes) (entiende «N MESES/SEMANAS/DÍAS/AÑOS», MENSUAL, TRIMESTRAL, CUATRIMESTRAL, SEMESTRAL, ANUAL, DIARIO); vencida si ya pasó.
- «Deficiencias en tus visitas»: las de `analyze()` de las visitas del año y del contrato que aún no están en la tabla; entran como filas blancas (las oportunidades de mejora, desmarcadas por defecto).
- Excel: plantilla `plan/plantilla.xlsx` hecha con `plan/build_tpl.py` a partir del Excel de Innovia (cabecera y anchos originales; filas 4-8 = un estilo por origen; filas 10-15 = leyenda). Al generar se borran esas filas, se escriben las medidas ordenadas por origen (texto en línea) y la leyenda va debajo. Nombre: «SIE - CONTRATO AÑO.xlsx».
- Va en la copia de seguridad (`planes`). Código: `/home/claude/pwa/plan/` (`plan.js`, `plan.css`, `build_tpl.py`, `inject.py`, que se ejecuta después de `informe/inject.py` e `inicio/inject.py`). Prueba: `test-plan.js`.

## Barra por secciones y primera vez (versión 1.10.0)
- Barra de abajo: `#tab-ini` (Inicio), `#nav-vis`, `#nav-doc`, `#nav-con`, `#nav-pf`. Las pestañas de siempre (`#tab-form`, `#tab-hist`, `#tab-inf`, `#tab-sen`) pasan a la fila `#subnav` (clase `stab`) dentro de la cabecera, junto con `#tab-plan` y las de «pronto» (`#tab-evrl`, `#tab-norma`). `navSync()` (en `inicio.js`) marca la sección y enseña solo sus subpestañas; cada sección recuerda su última subpestaña (`localStorage['sub-vis'|'sub-doc'|'sub-con']`).
- Primera vez (`#onb`, en `inicio.js`): 3 pasos (perfil, contrato, primera visita). Se abre solo tras cerrar la guía rápida si falta el nombre o el contrato y no hay `localStorage['onb-vista']`; también desde Inicio › «Configurar mi perfil». El botón atrás del móvil vuelve un paso.
- Pruebas: `test-nav-onb.js`. Como las subpestañas pueden estar ocultas, las pruebas las pulsan con `$eval(..., e => e.click())`; `tutil.js` marca `onb-vista`.

## Planificación: aplicar desde la tarjeta y vista por meses (versión 1.11.0)
- Cada tarjeta tiene «✓ Aplicada» (pone la fecha de hoy) o «Deshacer». La lista se agrupa en Vencidas, Pendientes (por vencimiento) y Aplicadas; el Excel sigue ordenado por origen.
- «Por meses» (`localStorage['pl-modo']`): tira de 12 meses con colores (rojo con vencidas, naranja pendientes, verde todo aplicado, marco azul = este mes) y una sección por mes con lo que vence; además «Antes de», «Después de» y «Sin fecha de vencimiento». Prueba: `test-plan2.js`.

## Plantilla limpia y GitHub (versión 1.11.1)
- `informe/scrub_tpl.py <original.docx> plantilla.docx` quita de la plantilla del informe los comentarios, nombres, matrículas, subcontrata y cifras del informe que sirvió de modelo (el generador siempre los sustituye; comprobado que el Word que sale es idéntico). `raw_schema.json` no se publica.
- Repositorio: `davidmg71994-spec/app-innovia` (público). Raíz: `VisitasPRL.html` (archivo único, se hace con `build_single.py`), `index.html`, `sw.js`, `VisitasPRL.apk`, `README.md`; fuentes en `codigo/`. La clave de firma no se sube nunca (`.gitignore`).

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
- Código: `/home/claude/pwa/pss/` (`pss.js`, `pss.css`, `inject.py`, después de `evrl/inject.py`; detrás va `seg/inject.py`). Pruebas: `test-pss.js` y los PDF de prueba que genera `scratchpad/pss/gen.py` y `gen2.py`.
- Una carpeta por obra (1.17.1): con 2 o más obras, Consulta › PSS/DGP y el apartado de la cuadrícula abren la lista de obras (`renderObras`), cada una con «Añadir el PSS/DGP» (`data-psa="addobra"`) o «Abrir la carpeta», y el buscador mira en todas. La tarjeta de Inicio abre directamente la carpeta de la obra activa. Dentro de una carpeta, «‹ Todas las obras» y el atrás de Android vuelven a la lista. En Perfil › Mis contratos, cada contrato tiene su botón (`data-ini="pssobra"`). En la visita salen los PDF de su obra y los que no tienen obra; los de obras que ya no están en el perfil van a «Sin obra asignada». Menú del PDF: «Pasarlo a otra obra».

## Privacidad y seguridad (versión 1.18.0)
- Perfil › Privacidad y seguridad (`#view-seg`, `GRUPO.seg = 'pf'`): estado con semáforo, bloqueo, copias cifradas, comprobar un código, texto de protección de datos para los PDF, qué guarda la app, borrar registros antiguos o todo, información técnica. Bloque resumen en Mi perfil (`SEG_API.perfilHtml()`).
- **Bloqueo**: en Android usa el bloqueo del móvil (`AndroidApp.bloqueoDisponible()`, `desbloquear()` → `SEG_API.resultado(ok, msg)`; BiometricPrompt en Android 10+ con BIOMETRIC_WEAK|DEVICE_CREDENTIAL, KeyguardManager en 7–9). Al volver de segundo plano la app nativa llama a `SEG_API.vuelve(ms)` (onStop/onStart). En la web, PIN propio (`seg-pin`: PBKDF2-SHA256 200 000, sal) con espera tras 5 fallos (`seg-int`) y bloqueo por inactividad. Ajustes en `seg-cfg` {lock, min, captura}. El `<script>/*SEG-HEAD*/` pone `html.seg-lk` antes de pintar. Con la app bloqueada, `appBack` devuelve false.
- **Copias cifradas**: AES-256-GCM, PBKDF2-SHA256 600 000, sal 16 B, IV 12 B, AAD `registro-rp`. Clave `CryptoKey` no extraíble en IndexedDB `registro-rp-seg` (store `k`, id `copias`, con `chk`). Formato: `{app, cifrado:{v,alg,kdf,it,sal,iv}, exportado, datos}`. `exportBackup` → `SEG_API.prepararCopia`; `importBackup` → `SEG_API.descifrarCopia` (pide la contraseña, guarda la clave por sal durante la sesión); `copiaAutomatica` es async y cifra con `SEG_API.cifrarAuto`. Al crear o cambiar la contraseña se reescriben las copias automáticas y `AndroidApp.copiasLimpiar(json)` borra las que no tienen registro.
- **Código de verificación**: `rec.integ = {h, v, f, trasFirma?, alterado?, ini?}` y `rec.cambios` (hasta 50 versiones). `h` = SHA-256 del JSON canónico (claves ordenadas) sin `guardado`, `integ`, `cambios`. Se sella en `guardar()`, al importar (`sellarImport`: si no coincide, versión nueva con `alterado`) y una vez los registros antiguos (`ini`). Sale en el Historial (`SEG_API.histLinea`) y al pie del PDF (`codigoPdf`: solo si el registro está guardado y sin cambios).
- **Política de contenido** (`seg/csp.py`): meta CSP con la huella SHA-256 de cada `<script>` en línea; `connect-src 'self' data: blob:`, `frame-src`/`object-src 'none'`, `form-action 'none'`, `base-uri 'none'`, `'wasm-unsafe-eval'` para pdf.js. **Cualquier cambio en `index.html` obliga a volver a ejecutar `seg/inject.py` (o `build_single.py` para la web de un archivo): si no, las huellas no coinciden y la app no arranca.** pdf.js con `isEvalSupported:false`.
- Letras dentro de la app (`seg/fonts/*.woff`, subconjunto latino, SIL OFL), sin Google Fonts. `<meta name="referrer" content="no-referrer">`.
- Android: `shouldInterceptRequest` responde 403 a toda petición http(s)/ws a otro host; WebView sin acceso a archivos ni geolocalización, Safe Browsing; `pantallaSegura(on)` = FLAG_SECURE; `dataExtractionRules` (`res/xml/extraccion.xml`) sin copia en la nube; `usesCleartextTraffic=false`.
- Código: `/home/claude/pwa/seg/` (`seg.js`, `seg.css`, `csp.py`, `fonts/`, `inject.py`, **el último inyector**, después de `pss/inject.py`). Prueba: `test-seg.js`. Dossier para Informática: documento «Visitas PRL · Dossier de seguridad para Informática».
