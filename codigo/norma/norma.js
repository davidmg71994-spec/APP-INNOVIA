/* ================= Normativa PRL: una ficha por norma, sin cobertura, con enlace al BOE ================= */
(() => {
/*NORMA-DATOS*/
const BL = Object.fromEntries(NORMA_BLOQUES);
const POR_ID = new Map(NORMAS.map(n => [n.id, n]));
let filtro = '', busca = '', ficha = null;
const favs = () => { try { const a = JSON.parse(lsGet('norma-fav') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const setFavs = a => lsSet('norma-fav', JSON.stringify(a));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const IDX = new Map(NORMAS.map(n => [n.id, norm([n.c, n.n, n.f, n.q, n.k, (n.o || []).join(' '), (n.a || []).map(x => x.join(' ')).join(' ')].join(' '))]));
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';
const EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
function pill(n) {
  if (n.est === 'nueva') return '<span class="nm-pill nueva">Nueva</span>';
  if (n.est === 'tram') return '<span class="nm-pill tram">En tramitación</span>';
  if (n.est === 'futuro') return '<span class="nm-pill fut">Desde 20/01/2027</span>';
  if (n.est === 'cambia') return '<span class="nm-pill fut">Cambia en 2027</span>';
  return '';
}
function encontrar() {
  const f = favs(), q = norm(busca).split(/\s+/).filter(Boolean);
  return NORMAS.filter(n => (filtro === 'fav' ? f.includes(n.id) : !filtro || n.b === filtro) && q.every(w => IDX.get(n.id).includes(w)));
}
function fila(n) {
  const fav = favs().includes(n.id);
  return `<div class="nm-item"><button type="button" class="nm-row" data-ver="${n.id}"><span class="nm-c">${esc(n.c)}</span><b>${esc(n.n)}</b><span class="nm-q">${esc(n.q)}</span>${pill(n)}</button><button type="button" class="nm-star" data-fav="${n.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritas' : 'Añadir a favoritas'}: ${esc(n.c)}">${STAR}</button></div>`;
}
function resultados() {
  const l = encontrar();
  if (!l.length) return filtro === 'fav' && !busca ? '<div class="empty"><b>Aún no tienes favoritas</b><span>Pulsa la estrella de una norma para tenerla aquí a mano.</span></div>' : `<div class="empty"><b>Nada con «${esc(busca)}»</b><span>Prueba con otra palabra: «andamio», «extintores», «amianto», «recurso preventivo»…</span></div>`;
  if (busca || filtro) return `<p class="nm-n">${plural(l.length, 'norma', 'normas')}</p><div class="nm-list">${l.map(fila).join('')}</div>`;
  return NORMA_BLOQUES.map(([b, t]) => { const g = l.filter(n => n.b === b); return g.length ? `<h3 class="nm-gh">${esc(t)}<i>${g.length}</i></h3><div class="nm-list">${g.map(fila).join('')}</div>` : ''; }).join('');
}
function renderMain() {
  const M = $('#nm-main'); if (!M) return;
  const nf = favs().length;
  M.innerHTML = `<section class="pl-hero nm-hero">
      <p class="pl-eb">Consulta</p>
      <h2>Normativa PRL</h2>
      <p class="pl-ctr">${NORMAS.length} normas · revisadas con el BOE el ${esc(NORMA_REV)}</p>
    </section>
    <div class="nm-buscar"><label for="nm-q" class="vh">Buscar en la normativa</label><input id="nm-q" type="search" placeholder="Buscar: andamio, extintores, recurso preventivo…" value="${esc(busca)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="chips nm-filtros" role="group" aria-label="Filtrar normas">
      <button type="button" class="chip" data-filtro="" aria-pressed="${!filtro}">Todas</button>
      <button type="button" class="chip" data-filtro="fav" aria-pressed="${filtro === 'fav'}">★ Favoritas${nf ? ` (${nf})` : ''}</button>
      ${NORMA_BLOQUES.map(([b, t]) => `<button type="button" class="chip" data-filtro="${b}" aria-pressed="${filtro === b}">${esc(t)}</button>`).join('')}
    </div>
    <div id="nm-res">${resultados()}</div>
    <p class="help nm-aviso">Resúmenes orientativos para consultar en obra. Lo que vale es el texto publicado en el BOE: cada ficha tiene el enlace.</p>`;
  vista('main');
}
function renderFicha(id) {
  const n = POR_ID.get(id), F = $('#nm-ficha'); if (!n || !F) return;
  const fav = favs().includes(n.id);
  const rel = [];
  if (n.rel && n.rel.rev && window.REV_API) rel.push('<button type="button" class="btn" data-nma="rev">Ver mis revisiones</button>');
  if (n.rel && n.rel.lam) rel.push('<button type="button" class="btn" data-nma="lam">Ver láminas de señalización</button>');
  const eur = /eur-lex/.test(n.u);
  F.innerHTML = `<div class="ihead"><button type="button" class="linkbtn" data-nma="volver">‹ Normativa</button><button type="button" class="nm-star big" data-fav="${n.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritas' : 'Añadir a favoritas'}">${STAR}</button></div>
    <section class="nm-head">
      <p class="nm-c">${esc(n.c)} · ${esc(BL[n.b])}</p>
      <h2>${esc(n.n)}</h2>
      ${pill(n)}
      <p class="nm-f">${esc(n.f)}</p>
      ${n.nota ? `<p class="nm-nota">${esc(n.nota)}</p>` : ''}
    </section>
    <section class="block nm-sec"><div class="bb"><h3>Qué regula</h3><p>${esc(n.q)}</p></div></section>
    ${n.o && n.o.length ? `<section class="block nm-sec"><div class="bb"><h3>Para qué te sirve en obra</h3><ul>${n.o.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>` : ''}
    ${n.a && n.a.length ? `<section class="block nm-sec"><div class="bb"><h3>Lo más importante</h3><dl class="nm-art">${n.a.map(([r, t]) => `<div><dt>${esc(r)}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl></div></section>` : ''}
    <div class="nm-acts">
      <a class="btn primary nm-boe" href="${esc(n.u)}" target="_blank" rel="noopener">${EXT}${esc(n.ul || (eur ? 'Abrir el texto en EUR-Lex' : 'Abrir el texto consolidado en el BOE'))}</a>
      ${rel.join('')}
    </div>
    <p class="help nm-aviso">Necesita conexión para abrir el ${eur ? 'texto oficial' : 'BOE'}. El resumen de esta ficha se puede consultar sin cobertura y es orientativo: lo que vale es el texto oficial.</p>`;
  vista('ficha'); window.scrollTo({top:0});
}
function vista(q) { const m = $('#nm-main'), f = $('#nm-ficha'); if (m) m.hidden = q !== 'main'; if (f) f.hidden = q !== 'ficha'; }
function toggleFav(id) {
  const a = favs(), i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); setFavs(a);
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', i < 0); b.setAttribute('aria-label', (i < 0 ? 'Quitar de favoritas' : 'Añadir a favoritas') + (b.classList.contains('big') ? '' : ': ' + POR_ID.get(id).c)); });
  const fb = document.querySelector('[data-filtro="fav"]'); if (fb) fb.textContent = '★ Favoritas' + (a.length ? ` (${a.length})` : '');
  if (filtro === 'fav' && !ficha) { const r = $('#nm-res'); if (r) r.innerHTML = resultados(); }
  toast(i < 0 ? 'Añadida a favoritas.' : 'Quitada de favoritas.');
}
function onClick(e) {
  const fv = e.target.closest('[data-fav]'); if (fv) { toggleFav(fv.dataset.fav); return; }
  const v = e.target.closest('[data-ver]'); if (v) { ficha = v.dataset.ver; renderFicha(ficha); return; }
  const fl = e.target.closest('[data-filtro]'); if (fl) { filtro = fl.dataset.filtro; document.querySelectorAll('[data-filtro]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filtro === filtro)); $('#nm-res').innerHTML = resultados(); return; }
  const a = e.target.closest('[data-nma]'); if (!a) return;
  const k = a.dataset.nma;
  if (k === 'volver') { ficha = null; renderMain(); return; }
  if (k === 'lam') { const b = $('#tab-sen'); if (b) b.click(); return; }
  if (k === 'rev') { if (window.REV_API) REV_API.abrir(); return; }
}
function montar() {
  const main = document.createElement('main');
  main.id = 'view-norma'; main.setAttribute('role', 'tabpanel'); main.hidden = true;
  main.innerHTML = '<div id="nm-main"></div><div id="nm-ficha" hidden></div>';
  const hist = $('#view-hist'); hist.parentNode.insertBefore(main, hist);
  main.addEventListener('click', onClick);
  main.addEventListener('input', e => { if (e.target.id === 'nm-q') { busca = e.target.value; $('#nm-res').innerHTML = resultados(); } });
  main.addEventListener('keydown', e => { if (e.target.id === 'nm-q' && e.key === 'Enter') e.target.blur(); });
  /* enlaces a una norma desde otros apartados (Revisiones, señalización) */
  document.addEventListener('click', e => { const b = e.target.closest('[data-norma]'); if (b && window.NORMA_API) { e.preventDefault(); NORMA_API.abrir(b.dataset.norma); } });
  renderMain();
}
window.NORMA_API = {
  lista: () => NORMAS,
  abrir(id) { showTab('norma'); if (id && POR_ID.has(id)) { ficha = id; renderFicha(id); } else { ficha = null; renderMain(); } },
  /* botones a las normas de las casillas marcadas en una revisión */
  enlacesRev(cats) {
    const ids = [...new Set((cats || []).flatMap(c => NORMA_REV_MAP[c] || []))];
    return ids.length ? `<p class="nm-rel">Normativa: ${ids.map(id => `<button type="button" class="linkbtn" data-norma="${id}">${esc(POR_ID.get(id).c)} · ${esc(POR_ID.get(id).n)}</button>`).join('')}</p>` : '';
  },
  atras() { const v = $('#view-norma'); if (!v || v.hidden || !ficha) return false; ficha = null; renderMain(); return true; },
  onTab(t) { if (t === 'norma' && !ficha) { const r = $('#nm-res'); if (r) r.innerHTML = resultados(); } }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
