/* ================= Aspecto: tema y tamaño de la letra (1.23.0) =================
   Perfil › Aspecto. El tema se guarda en «tema» (auto | light | dark) y pone data-theme en <html>: todo el CSS de la app ya
   tiene sus colores para :root[data-theme="dark"] y respeta :root:not([data-theme="light"]) con el modo oscuro del sistema.
   La letra se guarda en «letra» (0.9 | 1 | 1.15 | 1.3) y pone data-letra en <html> → --fz; los tamaños de letra del CSS
   van como calc(Npx*var(--fz,1)) (lo hace aspecto/inject.py). Un script corto en <head> lo aplica antes de pintar. */
(() => {
const TEMAS = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']];
const LETRAS = [['0.9', 'A−', 'Pequeña'], ['1', 'A', 'Normal'], ['1.15', 'A+', 'Grande'], ['1.3', 'A++', 'Muy grande']];
const tema = () => { const t = lsGet('tema'); return t === 'light' || t === 'dark' ? t : 'auto'; };
const letra = () => { const l = lsGet('letra'); return LETRAS.some(x => x[0] === l) ? l : '1'; };
const mq = (() => { try { return matchMedia('(prefers-color-scheme: dark)'); } catch (e) { return null; } })();
const oscuro = () => tema() === 'dark' || (tema() === 'auto' && !!mq && mq.matches);
function aplicar() {
  const r = document.documentElement, t = tema(), l = letra();
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  if (l === '1') r.removeAttribute('data-letra'); else r.setAttribute('data-letra', l);
  const o = oscuro();
  $$('meta[name="theme-color"]').forEach(m => { m.content = t === 'auto' ? (/dark/.test(m.media || '') ? '#1D1C1B' : '#FFFFFF') : (o ? '#1D1C1B' : '#FFFFFF'); });
  try { if (window.AndroidApp && typeof AndroidApp.barras === 'function') AndroidApp.barras(t === 'auto' ? 'auto' : o ? 'oscuro' : 'claro'); } catch (e) {}
}
function perfilHtml() {
  const t = tema(), l = letra(), li = LETRAS.find(x => x[0] === l);
  return `<section class="block asp-card" id="asp-card">
    <header class="bh"><h2>Aspecto</h2></header>
    <div class="bb">
      <div class="field"><span class="lbl" id="asp-tl">Tema</span>
        <div class="asp-seg" role="radiogroup" aria-labelledby="asp-tl">${TEMAS.map(([k, n]) => `<button type="button" role="radio" aria-checked="${k === t}" data-asp-tema="${k}">${n}</button>`).join('')}</div>
        <p class="help">${t === 'auto' ? 'Sigue al móvil u ordenador: claro u oscuro según lo tengas puesto.' : t === 'dark' ? 'Siempre oscuro: cansa menos la vista de noche y gasta menos batería.' : 'Siempre claro: se lee mejor a pleno sol.'}</p>
      </div>
      <div class="field"><span class="lbl" id="asp-ll">Tamaño de la letra</span>
        <div class="asp-seg asp-letra" role="radiogroup" aria-labelledby="asp-ll">${LETRAS.map(([k, a, n]) => `<button type="button" role="radio" aria-checked="${k === l}" aria-label="${n}" title="${n}" data-asp-letra="${k}"><span class="asp-a asp-a${k.replace('.', '')}">${a}</span></button>`).join('')}</div>
        <p class="help">Letra ${li[2].toLowerCase()}${l === '1' ? '' : ' (' + Math.round(+l * 100) + ' %)'}. Se aplica a toda la app; los PDF y los Word no cambian.</p>
      </div>
    </div>
  </section>`;
}
function repinta() {
  const c = $('#asp-card'); if (!c) return;
  const foco = document.activeElement && document.activeElement.closest('#asp-card') ? (document.activeElement.dataset.aspTema ? '[data-asp-tema="' + tema() + '"]' : '[data-asp-letra="' + letra() + '"]') : null;
  c.outerHTML = perfilHtml();
  if (foco) { const b = $('#asp-card ' + foco); if (b) b.focus({preventScroll:true}); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-asp-tema],[data-asp-letra]'); if (!b) return;
  if (b.dataset.aspTema) lsSet('tema', b.dataset.aspTema);
  else lsSet('letra', b.dataset.aspLetra);
  aplicar(); repinta();
});
/* flechas dentro de cada grupo, como un radiogroup */
document.addEventListener('keydown', e => {
  const b = e.target.closest && e.target.closest('#asp-card [role="radio"]'); if (!b) return;
  if (!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(e.key)) return;
  const g = [...b.parentElement.querySelectorAll('[role="radio"]')], i = g.indexOf(b);
  const n = g[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : g.length - 1)) % g.length];
  e.preventDefault(); n.click(); const f = $('#asp-card [data-asp-' + (n.dataset.aspTema ? 'tema' : 'letra') + '="' + (n.dataset.aspTema || n.dataset.aspLetra) + '"]'); if (f) f.focus();
});
if (mq) { const f = () => { if (tema() === 'auto') aplicar(); }; if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f); }
aplicar();
window.ASPECTO_API = {perfilHtml, aplicar, tema, letra};
})();
