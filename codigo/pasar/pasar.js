/* ================= Pasar visitas al ordenador, a mano (1.28.0) =================
   Sustituye a la sincronización automática (1.21.0–1.27.0): en el móvil, «Exportar visitas» crea un archivo
   cifrado SOLO con las visitas guardadas; en el ordenador, «Importar visitas» (la importación de copias de siempre)
   lo junta con lo que ya hay sin sustituir nada por una versión más antigua. Del ordenador no viaja nada al móvil.
   Lo que se borra en un equipo queda apuntado («vis-borradas») para que no vuelva al importar, salvo que se marque. */
let XV_TAMBIEN = false;
const XV_K = 'vis-borradas';
function xvLee() { try { const o = JSON.parse(lsGet(XV_K) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function xvGuarda(o) { try { const k = Object.keys(o); if (k.length > 5000) k.sort((a, b) => o[a] - o[b]).slice(0, k.length - 5000).forEach(x => delete o[x]); lsSet(XV_K, JSON.stringify(o)); } catch (e) {} }
function visMarcarBorrada(id) { if (!id) return; const o = xvLee(); o[id] = Date.now(); xvGuarda(o); }
function visDesmarcar(id) { const o = xvLee(); if (o[id]) { delete o[id]; xvGuarda(o); } }
/* borrada aquí y la de la copia no es más nueva que el borrado */
function visBorrada(r) { const t = xvLee()[r && r.id]; return !!t && ((r.guardado || r.creado || 0) <= t); }
document.addEventListener('change', e => { if (e.target && e.target.id === 'xv-borradas') XV_TAMBIEN = e.target.checked; });

async function exportarVisitas() {
  if (!HIST.length) { toast('Todavía no hay visitas guardadas que exportar.'); return; }
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  const data = JSON.stringify({app:'registro-rp', version:1, tipo:'visitas', exportado:d.toISOString(), registros:HIST});
  const salida = window.SEG_API ? await SEG_API.prepararCopia(data) : data;
  if (salida == null) return;
  const nombre = `VisitasPRL_visitas_${isoDate(d)}_${p2(d.getHours())}${p2(d.getMinutes())}.json`;
  const msg = `Visitas de Visitas PRL: ${plural(HIST.length, 'visita', 'visitas')}, del ${fmtDate(isoDate(d))}.${salida === data ? '' : ' Va cifrado con la contraseña de las copias.'}\nEn el ordenador: Visitas › Historial › Importar visitas.`;
  const blob = new Blob([salida], {type:'application/json'});
  if (window.SEG_API && SEG_API.entregarCopia) await SEG_API.entregarCopia(blob, nombre, msg, {tipo:'visitas', titulo:'Exportar visitas'});
  else await entregar(blob, nombre, 'Exportar visitas', msg);
}
document.addEventListener('click', e => { if (e.target.closest('[data-xv="export"]')) exportarVisitas(); });
