/** Tudo sob .vl-root: escuro, com o vermelho W-Tech, e legível de longe em uma TV. */
export const VL_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';

export const VL_CSS = `
.vl-root {
  --vl-bg: #0a0a0d;
  --vl-card: #141418;
  --vl-card-2: #1b1b21;
  --vl-line: #27272f;
  --vl-text: #f6f6f8;
  --vl-mute: #a3a3af;
  --vl-red: #ff1a10;
  --vl-red-deep: #d40000;
  --vl-green: #25d07d;
  --vl-amber: #ffb82e;
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: .9em;
  min-height: 100%;
  padding: 1.1em 1.25em 1.4em;
  border-radius: 14px;
  background: radial-gradient(1200px 500px at 12% -10%, rgba(255, 26, 16, .13), transparent 60%), var(--vl-bg);
  color: var(--vl-text);
  font-family: Inter, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.3;
}
.vl-root *, .vl-root *::before, .vl-root *::after { box-sizing: border-box; }
.vl-root h1, .vl-root h2, .vl-root p, .vl-root ul, .vl-root ol { margin: 0; padding: 0; list-style: none; }
.vl-full { height: 100vh; overflow: auto; border-radius: 0; font-size: clamp(13px, .86vw, 26px); }
.vl-denied { display: grid; place-items: center; min-height: 340px; text-align: center; font-size: 1.1em; }

.vl-head { display: flex; flex-wrap: wrap; align-items: center; gap: .8em 1.2em; }
.vl-brand { display: flex; align-items: center; gap: .85em; margin-right: auto; }
.vl-logo { padding: .32em .6em .28em; background: var(--vl-red-deep); font-family: 'Barlow Condensed', sans-serif; font-size: 1.35em; font-style: italic; font-weight: 800; letter-spacing: .01em; clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
.vl-brand h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.9em; font-weight: 800; line-height: 1; text-transform: uppercase; }
.vl-brand p { margin-top: .15em; color: var(--vl-mute); font-size: .88em; }
.vl-live { display: inline-flex; align-items: center; gap: .45em; padding: .4em .8em; border-radius: 999px; background: rgba(37, 208, 125, .12); color: var(--vl-green); font-size: .88em; font-weight: 700; }
.vl-live svg { animation: vl-beat 1.5s ease-in-out infinite; }
.vl-live-off { background: rgba(255, 26, 16, .16); color: #ff8a84; }
.vl-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .45em; }
.vl-icon { display: inline-flex; align-items: center; gap: .45em; min-height: 40px; padding: .4em .8em; border: 1px solid var(--vl-line); border-radius: 9px; background: var(--vl-card); color: var(--vl-text); font: inherit; font-size: .86em; font-weight: 600; cursor: pointer; }
.vl-icon:hover { border-color: #4b4b57; background: var(--vl-card-2); }
.vl-root button:focus-visible, .vl-root input:focus-visible { outline: 2px solid var(--vl-red); outline-offset: 2px; }
.vl-attention { border-color: var(--vl-red); animation: vl-ring 1.6s ease-out infinite; }
.vl-seg { display: inline-flex; padding: 3px; border: 1px solid var(--vl-line); border-radius: 9px; background: var(--vl-card); }
.vl-seg button { min-height: 34px; padding: .2em .8em; border: 0; border-radius: 6px; background: transparent; color: var(--vl-mute); font: inherit; font-size: .86em; font-weight: 600; cursor: pointer; }
.vl-seg button[aria-pressed="true"] { background: var(--vl-red-deep); color: #fff; }

.vl-grid { flex: 1; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: auto; gap: .8em; }
.vl-full .vl-grid { min-height: 0; grid-template-rows: auto auto minmax(0, 1.2fr) minmax(0, 1fr) auto; }
.vl-full .vl-card { min-height: 0; overflow: hidden; }
.vl-full .vl-chart-box { min-height: 0; }
.vl-full .vl-sound-bar { position: absolute; left: 1.25em; right: 1.25em; bottom: 1em; width: auto; }
.vl-card { min-width: 0; padding: .95em 1.1em; border: 1px solid var(--vl-line); border-radius: 12px; background: var(--vl-card); grid-column: span 3; display: flex; flex-direction: column; gap: .5em; }
.vl-label { display: flex; align-items: center; gap: .4em; color: var(--vl-mute); font-family: Inter, sans-serif; font-size: .8em; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
.vl-sub { margin-top: auto !important; color: var(--vl-mute); font-size: .86em; }
.vl-big { font-family: 'Barlow Condensed', sans-serif; font-size: 3.5em; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.vl-big small { color: var(--vl-mute); font-size: .46em; font-weight: 700; }
.vl-green { color: var(--vl-green); }

.vl-mylink { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto; align-items: center; gap: .6em 1.2em; border-color: rgba(37, 208, 125, .45); }
.vl-mylink .vl-sub { margin-top: .2em !important; }
.vl-mylink-box { display: flex; flex-wrap: wrap; gap: .45em; min-width: 0; }
.vl-mylink-box input { flex: 1 1 15em; min-width: 0; min-height: 44px; padding: .4em .7em; border: 1px solid #3a3a45; border-radius: 8px; background: #0e0e12; color: #fff; font: inherit; font-size: .88em; }
.vl-mylink-btn { display: inline-flex; align-items: center; justify-content: center; gap: .45em; min-height: 44px; padding: .4em .9em; font-size: .88em; text-decoration: none; white-space: nowrap; }
.vl-mylink-stats { display: flex; flex-wrap: wrap; gap: .3em 1em; color: var(--vl-mute); font-size: .88em; }
.vl-mylink-stats b { color: var(--vl-green); font-family: 'Barlow Condensed', sans-serif; font-size: 1.5em; font-weight: 800; }
.vl-goal { grid-column: span 5; border-color: rgba(255, 26, 16, .4); background: linear-gradient(140deg, rgba(212, 0, 0, .3), rgba(20, 20, 24, .6) 58%), var(--vl-card); padding-bottom: 2.2em; }
.vl-goal-count { display: flex; align-items: baseline; gap: .35em; font-family: 'Barlow Condensed', sans-serif; font-variant-numeric: tabular-nums; }
.vl-goal-count b { font-size: 6.2em; font-weight: 800; line-height: .85; }
.vl-goal-count span { font-size: 2.1em; font-weight: 700; color: #d7d7df; }
.vl-goal-count em { margin-left: auto; color: #fff; font-size: 1.7em; font-style: normal; font-weight: 700; }
.vl-track { position: relative; height: 1.15em; margin-top: .25em; border-radius: 999px; background: rgba(255, 255, 255, .1); }
.vl-fill { position: absolute; inset: 0 auto 0 0; min-width: 0; border-radius: 999px; background: linear-gradient(90deg, #d40000, #ff3b2f 70%, #ffb82e); box-shadow: 0 0 22px rgba(255, 60, 40, .55); transition: width 1s cubic-bezier(.2,.8,.2,1); }
.vl-mark { position: absolute; top: -.2em; bottom: -.2em; width: 2px; background: #fff; }
.vl-mark small { position: absolute; top: 100%; left: 50%; margin-top: .2em; transform: translateX(-50%); color: #e7e7ec; font-size: .78em; font-style: normal; font-weight: 600; white-space: nowrap; }
.vl-mark-end { left: 100%; margin-left: -2px; background: rgba(255,255,255,.45); }
.vl-mark-end small { left: auto; right: 0; transform: none; }
.vl-money { grid-column: span 3; }
.vl-mini-track { height: .55em; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.vl-mini-track span { display: block; height: 100%; border-radius: 999px; background: var(--vl-green); transition: width 1s ease; }
.vl-today { grid-column: span 2; }
.vl-clock { grid-column: span 2; }
.vl-timer { display: flex; flex-wrap: wrap; gap: .35em; font-family: 'Barlow Condensed', sans-serif; font-variant-numeric: tabular-nums; }
.vl-timer span { display: inline-flex; align-items: baseline; gap: .05em; }
.vl-timer b { font-size: 2.45em; font-weight: 800; line-height: 1; }
.vl-timer small { color: var(--vl-mute); font-size: 1em; font-weight: 700; }

.vl-kpis { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .8em; }
.vl-kpi { display: flex; flex-direction: column; gap: .1em; padding: .7em 1em; border: 1px solid var(--vl-line); border-radius: 12px; background: var(--vl-card); min-width: 0; }
.vl-kpi span { color: var(--vl-mute); font-size: .8em; font-weight: 600; }
.vl-kpi b { display: flex; align-items: center; gap: .25em; font-family: 'Barlow Condensed', sans-serif; font-size: 2.55em; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.02; }
.vl-kpi small { color: #8b8b97; font-size: .76em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vl-kpi-live { border-color: rgba(37, 208, 125, .45); }
.vl-dot { display: inline-block; width: .3em; height: .3em; border-radius: 50%; background: var(--vl-green); animation: vl-dot 1.5s ease-out infinite; }

.vl-chart { grid-column: span 5; position: relative; min-height: 250px; }
.vl-legend { position: absolute; top: .95em; right: 1.1em; display: flex; gap: 1em; color: var(--vl-mute); font-size: .8em; font-weight: 600; }
.vl-legend span::before { content: ''; display: inline-block; width: .7em; height: .7em; margin-right: .35em; border-radius: 3px; background: var(--vl-red); }
.vl-legend .vl-key-green::before { background: var(--vl-green); }
.vl-chart-box { flex: 1; min-height: 190px; }
.vl-funnel { grid-column: span 3; }
.vl-checkout { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: .55em 1.4em; align-items: start; }
.vl-checkout-alert { border-color: rgba(230, 40, 40, .7); }
.vl-checkout .vl-label { grid-column: 1 / -1; flex-wrap: wrap; }
.vl-checkout-since { color: #8b8b97; font-size: .9em; font-weight: 500; letter-spacing: 0; text-transform: none; }
.vl-steps { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .4em; margin: 0; padding: 0; list-style: none; }
.vl-steps li { display: flex; flex-direction: column; min-width: 0; padding: .42em .55em; border-radius: 9px; background: var(--vl-card-2); }
.vl-steps b { font-family: 'Barlow Condensed', sans-serif; font-size: 2.05em; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.vl-steps span { font-size: .76em; font-weight: 600; line-height: 1.15; }
.vl-steps small { margin-top: .15em; color: var(--vl-mute); font-size: .7em; }
.vl-problems-alert { margin: 0 0 .3em; color: #ff6b6b; font-size: .86em; font-weight: 700; }
.vl-problems ul { display: flex; flex-direction: column; gap: .22em; margin: 0; padding: 0; list-style: none; }
.vl-problems li { display: flex; align-items: baseline; gap: .5em; font-size: .86em; }
.vl-problems li b { min-width: 1.5em; color: var(--vl-amber); font-variant-numeric: tabular-nums; text-align: right; }
.vl-problems li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vl-problems li small { flex-shrink: 0; color: var(--vl-mute); font-size: .86em; }
.vl-problem-tech b, .vl-problem-tech span { color: #ff6b6b; }
.vl-problems-recent { grid-column: 1 / -1; display: flex; flex-direction: column; gap: .2em; margin: .2em 0 0; padding: .5em 0 0; border-top: 1px solid var(--vl-line); list-style: none; font-size: .8em; }
.vl-problems-recent time { color: var(--vl-mute); font-variant-numeric: tabular-nums; }
.vl-problems-recent em { color: var(--vl-amber); font-style: normal; }
.vl-problems-recent small { color: var(--vl-mute); }
.vl-full .vl-problems-recent { display: none; }
.vl-exits { grid-column: 1 / -1; margin-top: .2em; padding-top: .5em; border-top: 1px solid var(--vl-line); }
.vl-exits h3 { margin: 0 0 .3em; font-size: .86em; font-weight: 700; }
.vl-exits > ul:first-of-type { display: flex; flex-direction: column; gap: .22em; margin: 0; padding: 0; list-style: none; }
.vl-exits > ul:first-of-type li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 .5em; font-size: .86em; }
.vl-exits > ul:first-of-type b { min-width: 1.5em; color: var(--vl-amber); font-variant-numeric: tabular-nums; text-align: right; }
.vl-exits > ul:first-of-type span { font-weight: 600; }
.vl-exits > ul:first-of-type small { color: var(--vl-mute); font-size: .92em; }
.vl-exits .vl-problems-recent { margin-top: .3em; padding-top: .3em; border-top: 0; }
.vl-full .vl-exits { display: none; }
.vl-full .vl-problems li:nth-child(n+4) { display: none; }
.vl-feed { grid-column: span 4; overflow: hidden; }

.vl-rows { display: flex; flex-direction: column; gap: .6em; }
.vl-rows-tight { gap: .42em; }
.vl-row-text { display: flex; justify-content: space-between; gap: .6em; font-size: .9em; }
.vl-row-text span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d6d6dd; }
.vl-row-text b { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.vl-row-track { height: .5em; margin-top: .22em; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
.vl-row-fill { display: block; height: 100%; border-radius: 999px; transition: width .9s cubic-bezier(.2,.8,.2,1); }
.vl-tone-red { background: var(--vl-red); }
.vl-tone-green { background: var(--vl-green); }
.vl-tone-amber { background: var(--vl-amber); }
.vl-tone-mute { background: #7b7b89; }

.vl-sales { display: flex; flex-direction: column; gap: .3em; overflow: hidden; }
.vl-sale { display: flex; align-items: center; gap: .7em; padding: .42em .55em; border-radius: 9px; background: var(--vl-card-2); animation: vl-slide .55s ease-out; }
.vl-sale:first-child { background: rgba(37, 208, 125, .13); }
.vl-sale-n { flex-shrink: 0; display: grid; place-items: center; width: 2em; height: 2em; border-radius: 8px; background: var(--vl-red-deep); font-family: 'Barlow Condensed', sans-serif; font-size: 1.05em; font-weight: 800; }
.vl-sale-who { min-width: 0; flex: 1; }
.vl-sale-who b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .94em; }
.vl-sale-who small { display: block; color: var(--vl-mute); font-size: .78em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vl-sale-value { flex-shrink: 0; color: var(--vl-green); font-family: 'Barlow Condensed', sans-serif; font-size: 1.4em; font-weight: 800; font-variant-numeric: tabular-nums; }
.vl-empty { margin: auto !important; padding: 1em; color: var(--vl-mute); text-align: center; font-size: .92em; }

.vl-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55em; }
.vl-tiles li { display: flex; flex-direction: column; padding: .55em .7em; border-radius: 9px; background: var(--vl-card-2); min-width: 0; }
.vl-tiles b { font-family: 'Barlow Condensed', sans-serif; font-size: 2.5em; font-weight: 800; line-height: 1; }
.vl-tiles span { font-size: .84em; font-weight: 600; line-height: 1.2; }
.vl-tiles small { color: var(--vl-mute); font-size: .8em; }

.vl-open-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55em; }
.vl-open-list li { display: flex; align-items: center; gap: .55em; padding: .5em .65em; border-radius: 9px; background: var(--vl-card-2); min-width: 0; }
.vl-open-list b { color: var(--vl-amber); font-family: 'Barlow Condensed', sans-serif; font-size: 2.1em; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.vl-open-list span { min-width: 0; font-size: .8em; font-weight: 600; line-height: 1.2; }
.vl-open-list small { display: block; color: var(--vl-mute); font-weight: 500; }

.vl-sound-bar { position: sticky; bottom: .6em; display: flex; align-items: center; justify-content: center; gap: .5em; width: 100%; min-height: 46px; padding: .5em 1em; border: 0; border-radius: 10px; background: var(--vl-red-deep); color: #fff; font: inherit; font-weight: 700; cursor: pointer; animation: vl-ring 1.6s ease-out infinite; z-index: 5; }

.vl-modal { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 1em; background: rgba(0, 0, 0, .72); }
.vl-modal-card { position: relative; display: flex; flex-direction: column; gap: .85em; width: min(420px, 100%); padding: 1.4em; border: 1px solid var(--vl-line); border-radius: 14px; background: var(--vl-card); }
.vl-modal-card h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 2em; font-weight: 800; text-transform: uppercase; }
.vl-modal-close { position: absolute; top: .7em; right: .7em; padding: .3em .5em; min-height: 36px; }
.vl-field { display: flex; flex-direction: column; gap: .25em; font-size: .92em; font-weight: 600; }
.vl-field input { min-height: 44px; padding: .4em .7em; border: 1px solid #3a3a45; border-radius: 8px; background: #0e0e12; color: #fff; font: inherit; font-size: 1.1em; }
.vl-field small { color: var(--vl-mute); font-weight: 400; }
.vl-primary { min-height: 48px; border: 0; border-radius: 9px; background: var(--vl-red-deep); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.vl-primary:disabled { opacity: .6; cursor: wait; }
.vl-error { color: #ff8a84; font-size: .9em; }

.vl-alert { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 1em; overflow: hidden; background: radial-gradient(circle at 50% 45%, #e60000 0%, #8c0000 45%, #1a0000 100%); cursor: pointer; animation: vl-flash .7s ease-out; }
.vl-alert::before { content: ''; position: absolute; left: 50%; top: 50%; width: 170vmax; height: 170vmax; margin: -85vmax 0 0 -85vmax; background: repeating-conic-gradient(rgba(255,255,255,.07) 0 11deg, transparent 11deg 22deg); animation: vl-spin 16s linear infinite; }
.vl-alert-big { background: radial-gradient(circle at 50% 45%, #ffb82e 0%, #d43a00 40%, #260600 100%); }
.vl-alert-confetti { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }
.vl-alert-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: .15em; text-align: center; color: #fff; animation: vl-pop .75s cubic-bezier(.17,1.3,.4,1); }
.vl-alert-test { padding: .25em .9em; border-radius: 999px; background: #fff; color: #b00000; font-size: clamp(1rem, 1.6vw, 1.6rem); font-weight: 800; text-transform: uppercase; }
.vl-alert-kick { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(2rem, 4.4vw, 5rem); font-weight: 700; text-transform: uppercase; }
.vl-alert-title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(6rem, 21vw, 24rem); font-weight: 800; font-style: italic; line-height: .9; text-transform: uppercase; text-shadow: 0 .05em 0 rgba(0,0,0,.25), 0 0 .45em rgba(255,255,255,.35); animation: vl-pulse 1.1s ease-in-out infinite; }
.vl-alert-big .vl-alert-title { font-size: clamp(4.4rem, 15vw, 18rem); }
.vl-alert-who { margin-top: .2em !important; font-size: clamp(1.5rem, 3.2vw, 3.8rem); font-weight: 700; }
.vl-alert-value { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(3rem, 7.5vw, 8.5rem); font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; }
.vl-alert-items { display: flex; flex-wrap: wrap; justify-content: center; gap: .4em; font-size: clamp(1rem, 1.9vw, 2.2rem); font-weight: 700; }
.vl-alert-items span { padding: .15em .7em; border-radius: 999px; background: rgba(255,255,255,.2); }
.vl-alert-seller { font-size: clamp(1rem, 1.8vw, 2rem); font-weight: 600; }
.vl-alert-goal { margin-top: .5em !important; padding: .3em 1em; border-radius: 999px; background: rgba(0,0,0,.34); font-size: clamp(1.1rem, 2.1vw, 2.5rem); font-weight: 700; }

@keyframes vl-beat { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@keyframes vl-dot { 0% { box-shadow: 0 0 0 0 rgba(37, 208, 125, .7); } 100% { box-shadow: 0 0 0 .4em rgba(37, 208, 125, 0); } }
@keyframes vl-ring { 0% { box-shadow: 0 0 0 0 rgba(255, 26, 16, .6); } 100% { box-shadow: 0 0 0 12px rgba(255, 26, 16, 0); } }
@keyframes vl-slide { from { opacity: 0; transform: translateY(-.6em); } }
@keyframes vl-flash { 0% { filter: brightness(3); } 100% { filter: brightness(1); } }
@keyframes vl-pop { from { opacity: 0; transform: scale(.4); } }
@keyframes vl-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes vl-spin { to { transform: rotate(360deg); } }

@media (max-width: 1200px) {
  .vl-mylink { grid-template-columns: 1fr; }
  .vl-checkout { grid-template-columns: 1fr; }
  .vl-steps { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .vl-goal, .vl-money, .vl-chart, .vl-funnel, .vl-feed { grid-column: span 6; }
  .vl-today, .vl-clock, .vl-card { grid-column: span 6; }
  .vl-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .vl-root { padding: .8em; }
  .vl-goal, .vl-money, .vl-chart, .vl-funnel, .vl-feed, .vl-today, .vl-clock, .vl-card { grid-column: 1 / -1; }
  .vl-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vl-goal-count b { font-size: 4.6em; }
  .vl-goal-count em { font-size: 1.2em; }
}
@media (prefers-reduced-motion: reduce) {
  .vl-root *, .vl-root *::before { animation: none !important; transition: none !important; }
}
`;
