/**
 * Identidade da campanha, tirada do painel da própria máquina: grafite, vermelho
 * W-Tech, cantos chanfrados e traço técnico fino. Tudo sob .vp-root para não vazar
 * para o resto do site.
 */
export const VP_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap';

export const VP_CSS = `
.vp-root {
  --vp-bg: #0a0a0c;
  --vp-plate: #17171b;
  --vp-plate-2: #212126;
  --vp-line: rgba(255, 255, 255, .15);
  --vp-red: #e60000;
  --vp-red-hot: #ff2a1f;
  --vp-text: #f4f4f5;
  --vp-muted: #a8a8b0;
  --vp-cut: 16px;
  background: var(--vp-bg);
  color: var(--vp-text);
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  color-scheme: dark;
}
.vp-display {
  font-family: 'Barlow Condensed', Rajdhani, sans-serif;
  font-weight: 800;
  line-height: .92;
  letter-spacing: -.005em;
  text-transform: uppercase;
}
.vp-label {
  font-family: Rajdhani, sans-serif;
  font-weight: 700;
  font-size: .8rem;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.vp-num { font-variant-numeric: tabular-nums; }
.vp-muted { color: var(--vp-muted); }
.vp-red { color: var(--vp-red-hot); }

/* Silhueta do gabinete: os dois cantos de cima chanfrados */
.vp-plate { position: relative; isolation: isolate; background: var(--vp-line);
  clip-path: polygon(var(--vp-cut) 0, calc(100% - var(--vp-cut)) 0, 100% var(--vp-cut), 100% 100%, 0 100%, 0 var(--vp-cut)); }
.vp-plate::before { content: ''; position: absolute; inset: 1px; z-index: -1; background: var(--vp-plate);
  clip-path: polygon(var(--vp-cut) 0, calc(100% - var(--vp-cut)) 0, 100% var(--vp-cut), 100% 100%, 0 100%, 0 var(--vp-cut)); }
.vp-plate-alt::before { background: var(--vp-plate-2); }
.vp-plate-red { background: var(--vp-red); }
.vp-plate-red::before { background: #1b0c0d; }

.vp-btn { display: inline-flex; align-items: center; justify-content: center; gap: .6rem;
  min-height: 60px; padding: .9rem 1.7rem; cursor: pointer; border: 0;
  background: var(--vp-red); color: #fff; font-family: 'Barlow Condensed', Rajdhani, sans-serif; font-weight: 800;
  font-size: 1.32rem; line-height: 1.05; letter-spacing: .015em; text-transform: uppercase; text-align: center;
  clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);
  transition: background .15s ease, transform .15s ease; }
.vp-btn:hover:not(:disabled) { background: var(--vp-red-hot); transform: translateY(-1px); }
.vp-btn:active:not(:disabled) { transform: translateY(0); }
.vp-btn:disabled { background: #3a3a40; color: #9a9aa2; cursor: not-allowed; }
.vp-btn:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
.vp-btn-ghost { background: transparent; color: var(--vp-text); box-shadow: inset 0 0 0 1px var(--vp-line); clip-path: none; font-size: 1.1rem; min-height: 52px; }
.vp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.07); }

.vp-grid-bg { background-image:
  linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 26px 26px; }

.vp-ticker { overflow: hidden; background: var(--vp-red); color: #fff; white-space: nowrap; }
.vp-ticker-track { display: inline-flex; animation: vp-ticker 34s linear infinite; }
@keyframes vp-ticker { to { transform: translateX(-50%); } }

/* Tubo de nível do lote: o mesmo visor MAX/MIN do painel da máquina */
.vp-tube { position: relative; width: 26px; border-radius: 13px; background: #050506;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 0 0 5px #1c1c20, 0 0 0 6px rgba(255,255,255,.1); overflow: hidden; }
.vp-tube-fill { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, var(--vp-red-hot), #9c0000); transition: height .8s ease; }
.vp-tube-fill::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: rgba(255,255,255,.65); }

.vp-marker { position: absolute; display: grid; place-items: center; width: 34px; height: 34px; transform: translate(-50%, -50%);
  border-radius: 999px; background: var(--vp-red); color: #fff; font-family: Rajdhani, sans-serif; font-weight: 700; font-size: 1rem;
  box-shadow: 0 0 0 5px rgba(230,0,0,.28); }

.vp-input { width: 100%; height: 52px; padding: 0 .95rem; color: var(--vp-text); background: #0d0d10; font-size: 1rem;
  border: 1px solid var(--vp-line); border-radius: 2px; transition: border-color .15s ease; }
.vp-input::placeholder { color: #6e6e76; }
.vp-input:focus { outline: none; border-color: #fff; }
.vp-input[aria-invalid="true"] { border-color: var(--vp-red-hot); }
.vp-field-label { display: block; margin-bottom: .35rem; font-size: .84rem; font-weight: 600; color: #d4d4d8; }

.vp-range { width: 100%; appearance: none; height: 6px; background: var(--vp-line); border-radius: 3px; outline-offset: 6px; }
.vp-range::-webkit-slider-thumb { appearance: none; width: 28px; height: 28px; border-radius: 50%; background: var(--vp-red); border: 3px solid #fff; cursor: pointer; }
.vp-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--vp-red); border: 3px solid #fff; cursor: pointer; }

.vp-bubble { position: absolute; bottom: 8%; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.75); animation: vp-rise 3.4s ease-in infinite; }
@keyframes vp-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-170px) scale(1.15); opacity: 0; } }

.vp-faq summary { cursor: pointer; list-style: none; }
.vp-faq summary::-webkit-details-marker { display: none; }
.vp-faq[open] .vp-faq-icon { transform: rotate(45deg); }
.vp-faq-icon { transition: transform .15s ease; }

@media (prefers-reduced-motion: reduce) {
  .vp-ticker-track, .vp-bubble { animation: none; }
  .vp-btn, .vp-tube-fill { transition: none; }
}
`;
