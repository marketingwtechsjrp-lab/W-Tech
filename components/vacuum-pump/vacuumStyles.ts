/**
 * Identidade da campanha, tirada do painel da própria máquina: grafite, vermelho W-Tech
 * e cantos chanfrados, sobre a vitrine clara que o cliente conhece das grandes lojas.
 * Tudo sob .vp-root para não vazar para o resto do site.
 */
export const VP_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap';
export const VP_PAGE_BG = '#f2f3f5';

export const VP_CSS = `
.vp-root {
  --vp-bg: ${VP_PAGE_BG};
  --vp-plate: #ffffff;
  --vp-plate-2: #f7f7f9;
  --vp-line: #dfe0e6;
  --vp-ink: #141418;
  --vp-red: #e60000;
  --vp-red-hot: #c40000;
  --vp-green: #0a7a43;
  --vp-green-bg: #e5f5ec;
  --vp-text: #17171b;
  --vp-muted: #5a5b65;
  --vp-cut: 14px;
  background: var(--vp-bg);
  color: var(--vp-text);
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  color-scheme: light;
}
.vp-dark { --vp-text: #ffffff; --vp-muted: #b9b9c1; --vp-line: rgba(255,255,255,.2); --vp-plate: #1d1d22; --vp-plate-2: #27272d; --vp-red-hot: #ff4438;
  background: var(--vp-ink); color: var(--vp-text); }
.vp-display {
  font-family: 'Barlow Condensed', Rajdhani, sans-serif;
  font-weight: 800;
  line-height: .95;
  letter-spacing: -.005em;
  text-transform: uppercase;
}
.vp-label {
  font-family: Rajdhani, sans-serif;
  font-weight: 700;
  font-size: .8rem;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.vp-num { font-variant-numeric: tabular-nums; }
.vp-muted { color: var(--vp-muted); }
.vp-red { color: var(--vp-red-hot); }
.vp-green { color: var(--vp-green); }

/* Silhueta do gabinete: os dois cantos de cima chanfrados */
.vp-plate { position: relative; isolation: isolate; background: var(--vp-line);
  clip-path: polygon(var(--vp-cut) 0, calc(100% - var(--vp-cut)) 0, 100% var(--vp-cut), 100% 100%, 0 100%, 0 var(--vp-cut)); }
.vp-plate::before { content: ''; position: absolute; inset: 1px; z-index: -1; background: var(--vp-plate);
  clip-path: polygon(var(--vp-cut) 0, calc(100% - var(--vp-cut)) 0, 100% var(--vp-cut), 100% 100%, 0 100%, 0 var(--vp-cut)); }
.vp-plate-alt::before { background: var(--vp-plate-2); }

.vp-btn { display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
  min-height: 58px; padding: .85rem 1.6rem; cursor: pointer; border: 0;
  background: var(--vp-red); color: #fff; font-family: 'Barlow Condensed', Rajdhani, sans-serif; font-weight: 800;
  font-size: 1.32rem; line-height: 1.05; letter-spacing: .015em; text-transform: uppercase; text-align: center;
  clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);
  transition: background .15s ease; }
.vp-btn:hover:not(:disabled) { background: #c40000; }
.vp-btn:disabled { background: #c9cad1; color: #6c6d76; cursor: not-allowed; }
.vp-btn:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
.vp-btn-ghost { background: transparent; color: var(--vp-text); box-shadow: inset 0 0 0 1px var(--vp-line); clip-path: none; font-size: 1.1rem; min-height: 50px; }
.vp-btn-ghost:hover:not(:disabled) { background: rgba(0,0,0,.05); }
.vp-dark .vp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.1); }

.vp-link { color: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; background: none; border: 0; padding: 0; cursor: pointer; }
.vp-link:hover { color: var(--vp-red-hot); }

/* Preço: o de e o por vêm antes de tudo */
.vp-off { display: inline-block; padding: .12rem .45rem; background: var(--vp-green); color: #fff; font-size: .85rem; font-weight: 700; }
.vp-price-x { color: var(--vp-red-hot); font-size: clamp(1.8rem, 6vw, 2.3rem); line-height: 1; }
.vp-price-now { color: var(--vp-red-hot); font-size: clamp(4rem, 13vw, 5.4rem); line-height: .86; }
.vp-price-now small { font-size: .46em; }
.vp-save { display: inline-block; padding: .2rem .55rem; background: var(--vp-green-bg); color: var(--vp-green); font-weight: 700; }
.vp-pay-line { display: flex; align-items: flex-start; gap: .6rem; }


/* Galeria */
.vp-thumb { position: relative; display: grid; place-items: center; width: 58px; height: 58px; padding: 4px; border: 0; background: var(--vp-plate);
  box-shadow: inset 0 0 0 1px var(--vp-line); cursor: pointer; color: var(--vp-text); }
.vp-thumb:hover { box-shadow: inset 0 0 0 1px var(--vp-ink); }
.vp-thumb[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--vp-red); }
.vp-thumb img { width: 100%; height: 100%; object-fit: cover; }
.vp-thumb:focus-visible { outline: 2px solid var(--vp-ink); outline-offset: 2px; }


.vp-input { width: 100%; height: 50px; padding: 0 .9rem; color: var(--vp-text); background: #fff; font-size: 1rem;
  border: 1px solid #c6c7cf; border-radius: 2px; transition: border-color .15s ease, box-shadow .15s ease; }
.vp-input::placeholder { color: #8b8c95; }
.vp-input:focus { outline: none; border-color: var(--vp-ink); box-shadow: 0 0 0 1px var(--vp-ink); }
.vp-input[aria-invalid="true"] { border-color: var(--vp-red); box-shadow: 0 0 0 1px var(--vp-red); }
.vp-field-label { display: block; margin-bottom: .35rem; font-size: .84rem; font-weight: 600; }

.vp-range { width: 100%; appearance: none; height: 6px; background: var(--vp-line); border-radius: 3px; outline-offset: 6px; }
.vp-range::-webkit-slider-thumb { appearance: none; width: 28px; height: 28px; border-radius: 50%; background: var(--vp-red); border: 3px solid #fff; box-shadow: 0 0 0 1px var(--vp-line); cursor: pointer; }
.vp-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--vp-red); border: 3px solid #fff; cursor: pointer; }

.vp-bubble { position: absolute; bottom: 8%; border-radius: 50%; border: 1.5px solid rgba(20,20,24,.55); animation: vp-rise 3.4s ease-in infinite; }
@keyframes vp-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-170px) scale(1.15); opacity: 0; } }

.vp-faq summary { cursor: pointer; list-style: none; }
.vp-faq summary::-webkit-details-marker { display: none; }
.vp-faq[open] .vp-faq-icon { transform: rotate(180deg); }
.vp-faq-icon { transition: transform .15s ease; }

/* Carrinho: etapas e opções */
.vp-steps { display: flex; align-items: center; justify-content: center; gap: .35rem; }
.vp-step { display: inline-flex; align-items: center; gap: .4rem; padding: 0; border: 0; background: none; color: var(--vp-muted); font-size: .86rem; font-weight: 600; white-space: nowrap; }
.vp-step-on { color: var(--vp-text); }
.vp-step-done { color: var(--vp-text); cursor: pointer; }
.vp-step-done:hover { text-decoration: underline; }
.vp-step-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,.12); color: inherit; }
.vp-step-on .vp-step-dot, .vp-step-done .vp-step-dot { background: var(--vp-red); color: #fff; }
.vp-step-line { flex: 0 1 34px; min-width: 8px; height: 2px; background: var(--vp-line); }
.vp-step-line-on { background: var(--vp-red); }

.vp-option { display: flex; align-items: center; gap: .8rem; padding: .85rem 1rem; background: var(--vp-plate); box-shadow: inset 0 0 0 1px var(--vp-line); cursor: pointer; transition: box-shadow .15s ease, background .15s ease; }
.vp-option:hover { box-shadow: inset 0 0 0 1px var(--vp-ink); }
.vp-option-on, .vp-option-on:hover { box-shadow: inset 0 0 0 2px var(--vp-red); background: #fff7f6; }

.vp-combo { display: flex; align-items: center; justify-content: center; gap: .4rem; padding: .55rem; background: var(--vp-plate-2); }
.vp-combo-item { position: relative; display: grid; place-items: center; flex: 1 1 0; min-width: 0; max-width: 150px; aspect-ratio: 1 / 1; background: #fff; box-shadow: inset 0 0 0 1px var(--vp-line); overflow: hidden; color: var(--vp-text); }
.vp-combo-item img { width: 100%; height: 100%; padding: 4px; object-fit: contain; }
.vp-combo-photo img { padding: 0; object-fit: cover; }
.vp-combo-plus { flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: var(--vp-red); color: #fff; }
.vp-combo-sm .vp-combo-item { max-width: 86px; }
.vp-combo-sm .vp-combo-plus { width: 22px; height: 22px; }

.vp-bump { display: grid; grid-template-columns: 1fr; align-items: start; gap: .75rem; padding: .9rem; background: var(--vp-plate); box-shadow: inset 0 0 0 1px var(--vp-line); cursor: pointer; transition: box-shadow .15s ease, background .15s ease; }
.vp-bump:hover { box-shadow: inset 0 0 0 1px var(--vp-ink); }
.vp-bump-on, .vp-bump-on:hover { box-shadow: inset 0 0 0 2px var(--vp-red); background: #fff7f6; }
.vp-bump:focus-within { outline: 2px solid var(--vp-ink); outline-offset: 2px; }
.vp-bump-toggle { display: inline-flex; align-items: center; gap: .4rem; padding: .4rem .75rem; background: var(--vp-ink); color: #fff; font-size: .84rem; font-weight: 700; }
.vp-bump-on .vp-bump-toggle { background: var(--vp-green); }
@media (min-width: 640px) { .vp-bump { grid-template-columns: 210px 1fr; } }

/* Vídeo: o mesmo elemento fica no bloco ou vira mini player, sem recarregar */
.vp-video-box { position: relative; aspect-ratio: 16 / 9; border-radius: 22px; background: #000; }
.vp-video-frame { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; background: #000; box-shadow: 0 22px 60px rgba(20,20,24,.3); }
.vp-video-frame video { display: block; width: 100%; height: 100%; object-fit: cover; }
.vp-video-docked { position: fixed; inset: auto 18px 18px auto; z-index: 45; width: 360px; aspect-ratio: 16 / 9; border-radius: 16px; box-shadow: 0 18px 44px rgba(0,0,0,.5); animation: vp-dock .28s ease-out; }
@keyframes vp-dock { from { opacity: 0; transform: translateY(14px) scale(.96); } }
.vp-video-start { position: absolute; inset: 0; display: grid; place-items: center; width: 100%; border: 0; background: rgba(0,0,0,.18); cursor: pointer; }
.vp-video-start-icon { display: grid; place-items: center; width: 76px; height: 76px; padding-left: 4px; border-radius: 999px; background: var(--vp-red); color: #fff; box-shadow: 0 10px 30px rgba(230,0,0,.45); transition: transform .15s ease; }
.vp-video-start:hover .vp-video-start-icon { transform: scale(1.07); }
.vp-video-sound { position: absolute; right: 14px; top: 14px; display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.15rem; border: 0; border-radius: 999px; background: var(--vp-red); color: #fff; font-size: 1rem; font-weight: 700; white-space: nowrap; cursor: pointer; animation: vp-pulse 1.8s ease-out infinite; }
@keyframes vp-pulse { 0% { box-shadow: 0 0 0 0 rgba(230,0,0,.55); } 75%, 100% { box-shadow: 0 0 0 18px rgba(230,0,0,0); } }
.vp-video-docked .vp-video-sound { left: 8px; right: auto; top: auto; bottom: 8px; padding: .32rem .62rem; font-size: .76rem; animation: none; }
.vp-video-mini { position: absolute; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 999px; background: rgba(0,0,0,.74); color: #fff; cursor: pointer; }
.vp-video-mini:hover { background: var(--vp-red); }
.vp-video-mini-open { left: 7px; top: 7px; }
.vp-video-mini-close { right: 7px; top: 7px; }
.vp-video-mini-mute { left: 7px; bottom: 7px; }
.vp-video-end { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: .7rem; background: rgba(0,0,0,.74); color: #fff; }
@media (max-width: 767px) {
  .vp-video-box, .vp-video-frame { border-radius: 16px; }
  .vp-video-docked { right: 10px; bottom: 102px; width: min(48vw, 200px); border-radius: 12px; }
  .vp-video-docked .vp-video-sound { left: 6px; bottom: 6px; padding: .26rem .5rem; font-size: .68rem; }
  .vp-video-start-icon { width: 60px; height: 60px; }
}

/* Foto de ponta a ponta */
.vp-band { position: relative; display: flex; align-items: center; min-height: min(41.67vw, 800px); overflow: hidden; background: #0f0f12; }
.vp-band-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: right center; }
.vp-band-text { position: relative; z-index: 1; width: 100%; padding-top: 3rem; padding-bottom: 3rem; }
@media (max-width: 767px) {
  /* A arte vertical tem a máquina em cima e o espaço do texto embaixo. */
  .vp-band { display: block; min-height: 0; }
  .vp-band-img { inset: 0 0 auto 0; height: auto; aspect-ratio: 4 / 5; object-fit: contain; object-position: top center; }
  .vp-band-text { padding-top: 68vw; padding-bottom: 2.5rem; }
}

/* Closes das fotos reais */
.vp-tiles { display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 180px; gap: .6rem; }
.vp-tile { position: relative; margin: 0; overflow: hidden; border-radius: 16px; background: var(--vp-ink); }
.vp-tile-tall { grid-row: span 2; }
.vp-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.2,.7,.2,1); }
.vp-tile:hover img { transform: scale(1.06); }
.vp-tile figcaption { position: absolute; inset: auto 0 0 0; display: grid; gap: .1rem; padding: 2.2rem .8rem .7rem; background: linear-gradient(180deg, rgba(10,10,12,0) 0%, rgba(10,10,12,.9) 62%); color: #fff; font-size: .78rem; line-height: 1.3; }
.vp-tile figcaption b { font-size: .92rem; }
.vp-tile figcaption span { color: #d5d5db; }
@media (min-width: 768px) {
  .vp-tiles { grid-template-columns: repeat(4, 1fr); grid-auto-rows: 250px; gap: .8rem; }
  .vp-tile figcaption { font-size: .85rem; padding: 2.6rem 1rem .9rem; }
  .vp-tile figcaption b { font-size: 1.02rem; }
}

/* Entrada na rolagem e zoom da galeria */
[data-reveal] { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1); }
[data-reveal].vp-in { opacity: 1; transform: none; }
.vp-zoom { overflow: hidden; cursor: zoom-in; border-radius: 6px; }
.vp-zoom img { transition: transform .18s ease-out; }

/* Experiência 3D: o pôster fica no lugar até o modelo chegar, sem pular o layout */
.vp-3d-stage { --vp-cut: 18px; aspect-ratio: 1 / 1; overflow: hidden; }
.vp-3d-stage::before { background: radial-gradient(circle at 50% 42%, #ffffff 0%, #eef0f3 62%, #dfe1e6 100%); }
.vp-3d-poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 7%; transition: opacity .5s ease; }
.vp-3d-poster-off { opacity: 0; pointer-events: none; }
.vp-3d-canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; opacity: 0; cursor: grab; transition: opacity .6s ease; }
.vp-3d-canvas:active { cursor: grabbing; }
.vp-3d-canvas-on { opacity: 1; }
.vp-3d-marker { position: absolute; left: 0; top: 0; display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0;
  border-radius: 999px; background: var(--vp-ink); color: #fff; font-family: Rajdhani, sans-serif; font-weight: 700; font-size: .95rem;
  box-shadow: 0 0 0 2px rgba(255,255,255,.85); cursor: pointer; opacity: 0; will-change: transform; transition: opacity .2s ease, background .2s ease; }
.vp-3d-marker[data-show] { opacity: .62; }
.vp-3d-marker[data-show]:hover, .vp-3d-marker-on[data-show] { opacity: 1; }
.vp-3d-marker:hover { background: var(--vp-red); }
.vp-3d-marker-on { background: var(--vp-red); box-shadow: 0 0 0 2px #fff, 0 0 0 7px rgba(230,0,0,.3); }
.vp-3d-leader { position: absolute; left: 50%; top: 50%; height: 1.5px; background: var(--vp-red); transform-origin: 0 50%; pointer-events: none; }
.vp-3d-leader::after { content: ''; position: absolute; right: -3px; top: -2.25px; width: 6px; height: 6px; border-radius: 999px; background: var(--vp-red); }
.vp-offer-kick { color: #ff4438; }
.vp-offer-de, .vp-offer-x, .vp-offer-por { display: block; }
.vp-offer-de { font-size: clamp(1.2rem, 3vw, 1.5rem); line-height: 1; color: #b9b9c1; }
.vp-offer-de s { text-decoration: line-through; text-decoration-color: var(--vp-red); text-decoration-thickness: .09em; }
.vp-offer-x { margin-top: .35rem; font-size: clamp(2.2rem, 6.5vw, 3.4rem); line-height: 1; color: #fff; }
.vp-offer-por { font-size: clamp(6rem, 22vw, 11rem); line-height: .95; color: #ff1a10; }
.vp-offer-mes { font-size: clamp(1.7rem, 4.5vw, 2.4rem); line-height: 1; color: #fff; }
.vp-offer-chip { display: inline-block; padding: .4rem 1rem; background: var(--vp-red); color: #fff; font-size: clamp(1rem, 2.6vw, 1.25rem); line-height: 1.1;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }
.vp-offer-chip-eco { background: #fff; color: #c80000; }
.vp-3d-progress { position: absolute; left: 10%; right: 10%; bottom: 16px; height: 3px; background: var(--vp-line); }
.vp-3d-progress span { display: block; height: 100%; background: var(--vp-red); transition: width .2s ease; }
.vp-3d-hint { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: .4rem;
  padding: .3rem .75rem; border-radius: 999px; background: rgba(20,20,24,.78); color: #fff; font-size: .8rem; white-space: nowrap; pointer-events: none; }
.vp-3d-tool { position: relative; display: inline-flex; align-items: center; gap: .45rem; min-height: 44px; padding: .45rem .85rem; border: 0;
  background: var(--vp-ink); color: #fff; font-size: .88rem; font-weight: 600; cursor: pointer; transition: background .15s ease; }
.vp-3d-tool:hover, .vp-3d-tool[aria-pressed="true"] { background: var(--vp-red); }
.vp-3d-tool:focus-visible, .vp-3d-stop:focus-visible { outline: 2px solid var(--vp-ink); outline-offset: 2px; }
.vp-3d-tour { display: flex; gap: .6rem; margin: 0 -1rem; padding: 0 1rem .5rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.vp-3d-tour::-webkit-scrollbar { display: none; }
.vp-3d-stop { flex: 0 0 min(78vw, 320px); display: flex; gap: .75rem; padding: .85rem 1rem; border: 0; scroll-snap-align: center; text-align: left; color: inherit;
  background: var(--vp-plate); box-shadow: inset 0 0 0 1px var(--vp-line); cursor: pointer; transition: background .15s ease, box-shadow .15s ease; }
.vp-3d-stop:hover:not(:disabled) { box-shadow: inset 0 0 0 1px var(--vp-ink); }
.vp-3d-stop:disabled { cursor: default; opacity: .72; }
.vp-3d-stop-on, .vp-3d-stop-on:hover:not(:disabled) { background: #fff7f6; box-shadow: inset 0 0 0 2px var(--vp-red); }
.vp-3d-stop-n { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: var(--vp-ink); color: #fff;
  font-family: Rajdhani, sans-serif; font-weight: 700; }
.vp-3d-stop-on .vp-3d-stop-n { background: var(--vp-red); }
@media (min-width: 1024px) {
  .vp-3d-tour { display: grid; gap: .4rem; margin: 0; padding: 0; overflow: visible; }
  .vp-3d-stop { width: 100%; padding: .6rem .85rem; }
}

@media (prefers-reduced-motion: reduce) {
  .vp-bubble, .vp-video-sound { animation: none; }
  [data-reveal] { opacity: 1; transform: none; transition: none; }
  .vp-tile img, .vp-zoom img { transition: none; }
  .vp-btn, .vp-3d-poster, .vp-3d-canvas { transition: none; }
}
`;
