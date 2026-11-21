    // ========================================================================
    // Building the panel (with all its CSS)
    // ========================================================================

    function switchHtml(key) {
        return `<span class="switch"><input type="checkbox" data-key="${key}"><span></span></span>`;
    }
    function sliderRow([key, label, desc, , step]) {
        const extra = key === 'variance'
            ? '<button class="mini-btn" id="copero99-reroll" type="button" title="Pick a new random pattern">Shuffle</button>'
            : '';
        return `
            <div class="slider">
                <div class="slider-top"><span>${label}</span>${extra}<b data-out="${key}"></b></div>
                <div class="slider-desc">${desc}</div>
                <input type="range" data-key="${key}" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" step="${step || 1}">
            </div>`;
    }
    /**
     * Changes one number setting and keeps related ones consistent, so the
     * sliders always show what the formula really does (the decline never
     * starts before the peak, the floor is never above the best OVR).
     */
    function setNumberOption(key, value) {
        if (!Number.isFinite(value)) return;
        config[key] = clamp(Math.round(value), LIMITS[key][0], LIMITS[key][1]);
        if (key === 'peakAge' && config.declineStartAge < config.peakAge) {
            config.declineStartAge = clamp(config.peakAge, LIMITS.declineStartAge[0], LIMITS.declineStartAge[1]);
        }
        if (key === 'declineStartAge' && config.peakAge > config.declineStartAge) {
            config.peakAge = config.declineStartAge;
        }
        if (key === 'peakOverall' && config.minOverall > config.peakOverall) {
            config.minOverall = config.peakOverall;
        }
        if (key === 'minOverall' && config.peakOverall < config.minOverall) {
            config.peakOverall = config.minOverall;
        }
        // Only the curve's own numbers are part of a career style (not the boost or the offers)
        if (SLIDERS.some(([curveKey]) => curveKey === key)) config.preset = 'custom';
        // Only the numbers and chart are redrawn while dragging; saving waits for the release
        updateCurveControls();
    }
    function createMenu() {
        if (menuElement) return;

        const style = document.createElement('style');
        style.textContent = `
            /* Colours come from Copero's own theme variables, so the menu follows the site (and its light/dark mode) */
            #copero99-menu, #copero99-modal, #copero99-fab, #copero99-toasts, .c99-world, .c99-chart-below, .c99-flip {
                --c99-bg: hsl(var(--card, 240 10% 7%));
                --c99-card: hsl(var(--muted, 240 10% 10%));
                --c99-card-hover: hsl(var(--selected, 240 10% 13%));
                --c99-line: hsl(var(--border, 240 10% 12%));
                --c99-text: hsl(var(--foreground, 0 0% 98%));
                --c99-muted: hsl(var(--muted-foreground, 240 5% 55%));
                --c99-primary: hsl(var(--primary, 0 0% 98%));
                --c99-primary-text: hsl(var(--primary-foreground, 240 10% 4%));
                --c99-accent: hsl(var(--success, 142 70% 45%));
                --c99-accent-soft: hsl(var(--success, 142 70% 45%) / 0.14);
                --c99-warn: hsl(var(--warning, 48 96% 53%));
                --c99-off: hsl(var(--destructive, 0 72.8% 55%));
                font-family: inherit;
            }
            /* The site's dark-mode small-print grey is very dim; its lighter grey reads better here */
            .dark #copero99-menu, .dark #copero99-modal, .dark .c99-world, .dark .c99-chart-below { --c99-muted: hsl(var(--secondary-foreground)); }
            #copero99-menu *, #copero99-modal * { box-sizing: border-box; }
            #copero99-menu button, #copero99-modal button { font-family: inherit; color: inherit; }

            #copero99-menu, #copero99-modal { color: var(--c99-text); font-size: 14px; line-height: 1.45; }

            /* Side panel docked on the right; the page is pushed aside so the game stays usable (below the site's own pop-ups) */
            #copero99-menu {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                z-index: 450;
                width: 380px;
                display: none;
                flex-direction: column;
                background: var(--c99-bg);
                border-left: 1px solid var(--c99-line);
                box-shadow: -12px 0 32px rgb(0 0 0 / 0.25);
            }
            #copero99-menu.open { display: flex; }
            #copero99-menu .box { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
            /* Wide screens: floats in the free space beside the game card (placed by placePanel), the game stays centred */
            #copero99-menu.floating { position: absolute; bottom: auto; overflow: hidden; border: 1px solid var(--c99-line); border-radius: 1rem; box-shadow: 0 12px 40px rgb(0 0 0 / 0.35); }
            html.c99-docked body { margin-right: 380px; }
            html.c99-docked #copero99-fab { display: none; }
            /* Phones and small windows: no room beside the game (it needs ~800px), so the panel is a sheet along the bottom */
            @media (max-width: 1179px) {
                #copero99-menu { top: auto; left: 0; width: auto; height: 55vh; border-left: 0; border-top: 1px solid var(--c99-line); border-radius: 16px 16px 0 0; }
                html.c99-docked body { margin-right: 0; padding-bottom: 55vh; }
            }

            /* Smaller pop-up windows (Hall of Fame, history, save/load), built like the site's achievements window */
            #copero99-modal {
                position: fixed;
                inset: 0;
                z-index: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgb(0 0 0 / 0.6);
                backdrop-filter: blur(4px);
                /* A wheel over the title, the buttons or the backdrop used to scroll Copero's page behind, and a scroll that went on
                   stayed with that page, so the window seemed stuck: the page behind never scrolls now */
                overflow: hidden;
                overscroll-behavior: contain;
            }
            #copero99-modal .box {
                width: min(92vw, 44rem);
                max-height: 90vh;
                max-height: min(90svh, 46rem);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background: var(--c99-bg);
                color: var(--c99-text);
                border: 1px solid var(--c99-line);
                border-radius: 1rem;
                box-shadow: 0 24px 64px rgb(0 0 0 / 0.45);
            }

            /* Header: one row (logo, name and status, on/off, settings, close), so nothing can overlap at any width */
            #copero99-menu .head {
                position: relative;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 10px 10px 14px;
                border-bottom: 1px solid var(--c99-line);
            }
            #copero99-menu .head-text { flex: 1; min-width: 0; }
            #copero99-menu .title { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.2; }
            #copero99-menu .status-line { overflow: hidden; font-size: 12px; color: var(--c99-muted); text-overflow: ellipsis; white-space: nowrap; }
            #copero99-menu .icon-btn, #copero99-fab {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                padding: 0;
                border: 1px solid transparent;
                border-radius: 999px;
                background: none;
                color: var(--c99-muted);
                cursor: pointer;
            }
            #copero99-menu .icon-btn:hover { background: var(--c99-card); border-color: var(--c99-line); color: var(--c99-text); }
            #copero99-menu .icon-btn.danger:hover { color: var(--c99-off); }
            #copero99-menu .icon-btn.active { background: var(--c99-card); border-color: var(--c99-line); color: var(--c99-text); }
            /* Close: a red tile at the end of the header, built like the game's OVR badge */
            #copero99-menu .close-tile {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                padding: 0;
                border: 1px solid rgb(254 202 202 / 0.45);
                border-radius: 10px;
                background: linear-gradient(145deg, #f87171 0%, #dc2626 48%, #7f1d1d 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgb(220 38 38 / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.25);
                cursor: pointer;
                transition: transform 0.15s, filter 0.15s;
            }
            #copero99-menu .close-tile:hover { filter: brightness(1.12); transform: scale(1.06); }
            #copero99-menu .close-tile svg { width: 15px; height: 15px; stroke-width: 3; }
            /* Boost levels in the game's OVR badge colours, bronze to the special 99 */
            #copero99-menu .tier-text, #copero99-modal .tier-text { background-clip: text; -webkit-background-clip: text; color: transparent; font-weight: 800; }
            #copero99-menu .tier-text.bronze { background-image: linear-gradient(135deg, #fdba74, #b45309); }
            #copero99-menu .tier-text.special { background-image: linear-gradient(135deg, #e879f9, #a78bfa 45%, #f0abfc 60%, #7c3aed); }
            #copero99-menu .tier-text.silver { background-image: linear-gradient(135deg, #f1f5f9, #94a3b8); }
            #copero99-menu .tier-text.gold { background-image: linear-gradient(135deg, #fde68a, #f59e0b); }
            #copero99-menu .tier-text.cyan { background-image: linear-gradient(135deg, #cffafe, #38bdf8); }
            #copero99-menu .tier-text.elite { background-image: linear-gradient(135deg, #f0abfc, #a855f7 55%, #818cf8); }
            #copero99-menu .tier-text.iron { background-image: linear-gradient(135deg, #e7e5e4, #78716c); }
            #copero99-menu .tier-text.rose { background-image: linear-gradient(135deg, #fecdd3, #f43f5e); }
            #copero99-menu .tier-text.teal { background-image: linear-gradient(135deg, #ccfbf1, #14b8a6); }
            #copero99-menu .tier-text.dawn { background-image: linear-gradient(135deg, #fde68a, #60a5fa); }
            #copero99-menu .tier-text.aurum { background-image: linear-gradient(135deg, #fef08a, #eab308 45%, #c084fc); }
            #copero99-menu .sandbox-text { color: var(--c99-sandbox); font-weight: 700; }

            /* Settings drop-down under the header, as wide as the panel */
            #copero99-menu .settings-pop {
                position: absolute;
                top: calc(100% - 4px);
                left: 10px;
                right: 10px;
                max-height: calc(100vh - 140px);
                overflow-y: auto;
                z-index: 5;
                padding: 6px;
                background: hsl(var(--popover, 240 10% 8%));
                border: 1px solid var(--c99-line);
                border-radius: 14px;
                box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
                animation: c99-pop 0.16s ease-out;
            }
            @keyframes c99-pop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
            #copero99-menu .settings-pop[hidden] { display: none; }
            #copero99-menu .pop-title { padding: 6px 10px 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-menu .pop-item {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 8px 10px;
                border: 0;
                border-radius: 10px;
                background: none;
                text-align: left;
                cursor: pointer;
                transition: background 0.12s;
            }
            #copero99-menu .pop-item:hover { background: var(--c99-card); }
            #copero99-menu .pop-sep { height: 1px; margin: 4px 8px; background: var(--c99-line); }
            #copero99-menu .pop-item { padding: 6px 10px; }
            #copero99-menu .pop-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                width: 32px;
                height: 32px;
                border-radius: 9px;
                background: color-mix(in srgb, var(--tile) 16%, transparent);
                color: var(--tile);
            }
            #copero99-menu .pop-text { flex: 1; display: flex; flex-direction: column; }
            #copero99-menu .pop-text b { font-size: 13px; font-weight: 600; }
            #copero99-menu .pop-text small { font-size: 12px; color: var(--c99-muted); }
            #copero99-menu .pop-item > svg:last-child { color: var(--c99-muted); }
            #copero99-menu svg, #copero99-fab svg { flex: 0 0 auto; width: 16px; height: 16px; }
            #copero99-menu .title svg { width: 20px; height: 20px; }
            /* Logo: Copero's trophy tile, in the Diamond badge colours, with a glow and a shine */
            #copero99-menu .logo-tile {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                overflow: hidden;
                border-radius: 7px;
                background: linear-gradient(145deg, #ecfeff 0%, #a5f3fc 35%, #60a5fa 75%, #3b82f6 100%);
                color: #082f49;
                box-shadow: 0 0 12px rgb(96 165 250 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.7);
            }
            #copero99-menu .logo-tile svg { width: 15px; height: 15px; stroke-width: 2.4; }
            #copero99-menu .logo-tile::after {
                content: '';
                position: absolute;
                inset: -50%;
                background: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.85) 50%, transparent 60%);
                transform: translateX(-70%);
                animation: c99-shine 2.8s ease-in-out infinite;
            }

            /* On/off switch */
            #copero99-menu .switch { position: relative; flex: 0 0 auto; width: 38px; height: 22px; }
            #copero99-menu .switch input {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                opacity: 0;
                cursor: pointer;
                z-index: 1;
            }
            #copero99-menu .switch span {
                position: absolute;
                inset: 0;
                border-radius: 999px;
                background: var(--c99-card-hover);
                box-shadow: inset 0 0 0 1px var(--c99-line);
                transition: background 0.15s;
            }
            #copero99-menu .switch span::after {
                content: '';
                position: absolute;
                top: 3px;
                left: 3px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
                transition: transform 0.15s;
            }
            #copero99-menu .switch input:checked + span { background: var(--c99-accent); box-shadow: none; }
            #copero99-menu .switch input:checked + span::after { transform: translateX(16px); }
            #copero99-menu .switch input:focus-visible + span { outline: 2px solid var(--c99-text); outline-offset: 2px; }

            #copero99-menu .muted { color: var(--c99-muted); font-size: 12px; }

            /* Tabs, as the site's pill buttons */
            #copero99-menu .tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 14px 0; }
            #copero99-menu .tabs button {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                border: 0;
                border-radius: 999px;
                background: var(--c99-bg);
                color: var(--c99-muted);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: color 0.15s;
            }
            #copero99-menu .tabs button:hover { color: var(--c99-text); }
            #copero99-menu .tabs button.active { background: var(--c99-primary); color: var(--c99-bg); }
            #copero99-menu .tabs svg { width: 15px; height: 15px; }
            #copero99-menu .tabs [data-tab="ovr"] svg { color: #38bdf8; }
            #copero99-menu .tabs [data-tab="hof"] svg { color: #facc15; }
            #copero99-menu .tabs button.active[data-tab="ovr"] svg { color: #0284c7; }
            #copero99-menu .tabs button.active[data-tab="hof"] svg { color: #ca8a04; }
            /* Copero's achievements window: this career's progress under each achievement's description (decorateAchievements) */
            article.c99-ach-row { height: auto; min-height: 4rem; }
            @media (min-width: 1024px) { article.c99-ach-row { min-height: 5.5rem; } }
            .c99-ach { display: flex; flex-direction: column; gap: 4px; margin-top: 5px; }
            .c99-ach.out { opacity: 0.6; }
            .c99-ach-line { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 4px; }
            .c99-ach-line span { padding: 0 6px; border-radius: 999px; box-shadow: inset 0 0 0 1px hsl(var(--border)); color: hsl(var(--muted-foreground)); font-size: 10px; font-weight: 700; line-height: 16px; white-space: nowrap; }
            .c99-ach-line span.on { box-shadow: none; background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); }
            .c99-ach-line .c99-ach-status { box-shadow: none; background: hsl(var(--muted-foreground) / 0.16); color: hsl(var(--foreground)); font-weight: 800; }
            .c99-ach-line .c99-ach-status.win { background: linear-gradient(145deg, #fcd34d, #facc15 48%, #d97706); color: #451a03; }
            .c99-ach-line .c99-ach-status.deep { background: rgb(96 165 250 / 0.18); color: #60a5fa; }
            .c99-ach-line .c99-ach-status.out { background: transparent; box-shadow: inset 0 0 0 1px hsl(var(--border)); color: hsl(var(--muted-foreground)); }
            .c99-ach-bar { height: 4px; overflow: hidden; border-radius: 999px; background: hsl(var(--muted-foreground) / 0.18); }
            .c99-ach-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #fdba74, #f97316); }
            #copero99-menu .body { flex: 1; overflow-y: auto; padding: 12px 14px 16px; }
            #copero99-menu .panel { display: none; }
            #copero99-menu .panel.active { display: block; }

            #copero99-menu .label {
                margin: 14px 0 6px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--c99-muted);
            }
            #copero99-menu .panel > .label:first-child { margin-top: 0; }
            #copero99-menu .hint { margin-top: 6px; font-size: 12px; color: var(--c99-muted); }
            #copero99-menu .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); column-gap: 20px; }

            /* Mode buttons and style presets */
            #copero99-menu .seg { display: flex; gap: 6px; }
            #copero99-menu .seg button {
                flex: 1;
                padding: 10px 12px;
                border: 1px solid var(--c99-line);
                border-radius: 999px;
                background: var(--c99-card);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            }
            #copero99-menu .seg button:hover { background: var(--c99-card-hover); }
            #copero99-menu .chips { display: flex; flex-wrap: wrap; gap: 6px; }
            #copero99-menu .chip {
                padding: 5px 12px;
                border: 1px solid var(--c99-line);
                border-radius: 999px;
                background: var(--c99-card);
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            #copero99-menu .chip:hover { background: var(--c99-card-hover); }
            #copero99-menu .seg button.active,
            #copero99-menu .chip.active { border-color: var(--c99-primary); background: var(--c99-primary); color: var(--c99-primary-text); }

            /* Chart */
            #copero99-menu .chart { margin-top: 12px; padding: 10px 10px 8px; background: var(--c99-card); border-radius: 12px; }
            #copero99-menu .chart svg, .c99-chart-below .chart svg { display: block; width: 100%; max-width: 440px; height: auto; margin: 0 auto; }
            #copero99-menu .now, .c99-chart-below .now { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; }
            /* Wide screens: the chart's own box under the panel, beside the Living world box (placed by placePanel) */
            .c99-chart-below { --c99-accent: #f59e0b; --c99-accent-soft: rgb(245 158 11 / 0.14); position: absolute; z-index: 450; padding: 10px 12px 10px; border: 1px solid var(--c99-line); border-radius: 1rem; background: var(--c99-bg); box-shadow: 0 12px 40px rgb(0 0 0 / 0.35); color: var(--c99-text); font-size: 14px; line-height: 1.45; animation: c99-panel-in 0.2s ease-out; }
            .c99-chart-below[hidden] { display: none; }
            .c99-chart-below .label { margin-bottom: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-muted); }
            .c99-chart-below .chart svg { max-height: 150px; }
            #copero99-menu .curve-summary { margin: 8px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.55; color: var(--c99-muted); }
            #copero99-menu .curve-summary li::marker { color: var(--c99-sandbox); }
            #copero99-menu .curve-summary b { color: var(--c99-text); }
            #copero99-menu .now::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #facc15; }

            /* Sliders */
            #copero99-menu .slider { margin-bottom: 14px; }
            #copero99-menu .slider-top { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; font-size: 14px; font-weight: 500; }
            #copero99-menu .slider-top span { flex: 1; }
            #copero99-menu .slider-top b { min-width: 28px; text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
            #copero99-menu .slider-desc { margin-bottom: 6px; font-size: 11px; color: var(--c99-muted); }
            #copero99-menu .slider input[type="range"] { width: 100%; margin: 0; accent-color: var(--c99-primary); cursor: pointer; }
            #copero99-menu .mini-btn {
                padding: 2px 9px;
                border: 1px solid var(--c99-line);
                border-radius: 999px;
                background: var(--c99-card);
                font-size: 12px;
                cursor: pointer;
            }
            #copero99-menu .mini-btn:hover { background: var(--c99-card-hover); }

            /* Rows with a switch */
            #copero99-menu .row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
                padding: 10px 12px;
                border: 1px solid var(--c99-line);
                border-radius: 12px;
                background: var(--c99-card);
                cursor: pointer;
            }
            #copero99-menu .row:hover { background: var(--c99-card-hover); }
            #copero99-menu .row-text { flex: 1; }
            #copero99-menu .row-title { font-weight: 600; }
            #copero99-menu .fold-body .row { background: var(--c99-bg); }

            /* Fold-out sections */
            #copero99-menu details.fold { margin-top: 10px; border: 1px solid var(--c99-line); border-radius: 12px; background: var(--c99-card); }
            #copero99-menu details.fold > summary {
                padding: 10px 12px;
                font-weight: 600;
                list-style: none;
                cursor: pointer;
                user-select: none;
            }
            #copero99-menu details.fold > summary::-webkit-details-marker { display: none; }
            #copero99-menu details.fold > summary::before {
                content: '▸';
                display: inline-block;
                width: 16px;
                color: var(--c99-muted);
                transition: transform 0.15s;
            }
            #copero99-menu details.fold[open] > summary::before { transform: rotate(90deg); }
            #copero99-menu .fold-body { padding: 0 12px 12px; }
            #copero99-menu .fold-body .chart,
            #copero99-menu .fold-body details.fold,
            #copero99-menu .fold-body .chip:not(.active),
            #copero99-menu .fold-body .seg button:not(.active) { background: var(--c99-bg); }

            /* Text and number boxes */
            #copero99-menu .field {
                width: 100%;
                padding: 8px 10px;
                background: var(--c99-bg);
                color: var(--c99-text);
                border: 1px solid hsl(var(--input, 240 10% 16%));
                border-radius: 10px;
                font-family: inherit;
                font-size: 13px;
            }
            #copero99-menu .field:focus { outline: none; border-color: var(--c99-text); }

            /* Custom curve grid */
            #copero99-menu .curve-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 6px; margin: 8px 0 10px; }
            #copero99-menu .curve-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; color: var(--c99-muted); }
            #copero99-menu .curve-cell .field { padding: 4px 2px; text-align: center; }

            /* Big tool buttons */
            #copero99-menu .big-btns { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
            #copero99-menu .big-btn {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                padding: 12px 14px;
                border: 1px solid var(--c99-line);
                border-radius: 12px;
                background: var(--c99-card);
                text-align: left;
                cursor: pointer;
            }
            #copero99-menu .big-btn:hover { background: var(--c99-card-hover); }
            #copero99-menu .big-btn b { display: flex; align-items: center; gap: 8px; font-size: 14px; }
            #copero99-menu .big-btn span { font-size: 12px; color: var(--c99-muted); }

            /* Field locks */
            #copero99-menu .lock-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 6px;
                padding: 6px 4px 6px 12px;
                border: 1px solid var(--c99-line);
                background: var(--c99-bg);
                border-radius: 10px;
                font-size: 13px;
            }
            #copero99-menu .lock-label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
            #copero99-menu .lock-value { color: var(--c99-accent); font-weight: 600; }
            #copero99-menu .tips { margin: 6px 0 8px; padding-left: 20px; list-style: decimal; font-size: 13px; color: var(--c99-muted); }
            #copero99-menu .tips li { margin: 2px 0; }
            #copero99-menu #copero99-lock-quick { margin: 10px 0 8px; }
            #copero99-menu .lock-results { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; margin-top: 6px; }
            #copero99-menu .lock-result {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                padding: 8px 12px;
                border: 1px solid var(--c99-line);
                border-radius: 10px;
                background: var(--c99-bg);
                text-align: left;
                font-size: 13px;
                cursor: pointer;
            }
            #copero99-menu .lock-result:hover { border-color: var(--c99-text); }
            #copero99-menu .lock-result small { color: var(--c99-muted); white-space: nowrap; }
            #copero99-menu .lock-editor:not(:empty) {
                margin-top: 8px;
                padding: 12px;
                border: 1px solid var(--c99-text);
                border-radius: 12px;
                background: var(--c99-bg);
            }
            #copero99-menu .lock-editor-title { font-weight: 700; }
            #copero99-menu .lock-editor .btn { flex: 0 0 auto; }
            #copero99-menu .badge { padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
            #copero99-menu .badge.ok { background: var(--c99-accent-soft); color: var(--c99-accent); }
            #copero99-menu .badge.warn { background: hsl(var(--warning, 48 96% 53%) / 0.15); color: var(--c99-warn); }
            #copero99-menu .badge.wait { background: var(--c99-card); color: var(--c99-muted); }
            #copero99-menu .lock-form { display: flex; gap: 6px; margin-top: 6px; }
            #copero99-menu .money-steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 6px; }
            #copero99-menu .money-steps .mini-btn { padding: 3px 0; }

            /* Buttons, as the site's rounded ones */
            #copero99-menu .btn-row,
            #copero99-modal .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
            #copero99-menu .btn,
            #copero99-modal .btn {
                flex: 1;
                padding: 8px 16px;
                border: 1px solid var(--c99-line);
                border-radius: 999px;
                background: var(--c99-card);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }
            #copero99-menu .btn:hover,
            #copero99-modal .btn:hover { background: var(--c99-card-hover); }
            #copero99-menu .btn.primary,
            #copero99-modal .btn.primary { border-color: var(--c99-primary); background: var(--c99-primary); color: var(--c99-primary-text); }
            #copero99-menu .btn.primary:hover,
            #copero99-modal .btn.primary:hover { opacity: 0.9; }
            #copero99-menu .btn.danger:hover,
            #copero99-modal .btn.danger:hover { color: var(--c99-off); }
            #copero99-menu .btn.wide { width: 100%; }

            #copero99-menu .foot {
                display: flex;
                justify-content: space-between;
                padding: 8px 14px;
                border-top: 1px solid var(--c99-line);
                font-size: 12px;
                color: var(--c99-muted);
            }

            /* Launch buttons placed next to the site's achievements button */
            button.c99-launch { position: relative; }
            /* Only shown when the site has no achievements button to sit next to */
            #copero99-fab {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 400;
                width: 44px;
                height: 44px;
                border-color: var(--c99-line);
                background: var(--c99-bg);
                color: var(--c99-text);
                box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
            }
            #copero99-fab[hidden] { display: none; }

            /* Pop-ups: bottom-left (beside Copero's centred card on wide screens), with the diamond and a bar that shows how long they stay */
            #copero99-toasts {
                position: fixed;
                left: 16px;
                bottom: 16px;
                z-index: 700;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
                width: min(calc(100vw - 32px), 360px);
                pointer-events: none;
            }
            @media (max-width: 1179px) { html.c99-docked #copero99-toasts { bottom: calc(55vh + 12px); } }
            #copero99-toasts .toast {
                position: relative;
                display: flex;
                align-items: center;
                gap: 10px;
                overflow: hidden;
                padding: 9px 14px 10px 10px;
                background: var(--c99-bg);
                color: var(--c99-text);
                border: 1px solid rgb(96 165 250 / 0.4);
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.35;
                box-shadow: 0 12px 32px rgb(0 0 0 / 0.4), 0 0 18px rgb(96 165 250 / 0.18);
                animation: c99-toast-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
            }
            #copero99-toasts .toast .c99-gem { width: 22px; height: 22px; border-radius: 7px; }
            #copero99-toasts .toast .c99-gem svg { width: 14px; height: 14px; }
            #copero99-toasts .toast::after {
                content: '';
                position: absolute;
                left: 0;
                bottom: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, #a5f3fc, #3b82f6);
                transform-origin: left;
                animation: c99-toast-time var(--life, 6s) linear forwards;
            }
            #copero99-toasts .toast.leaving { animation: c99-toast-out 0.3s ease-in forwards; }
            @keyframes c99-toast-in { from { opacity: 0; transform: translateX(-16px) scale(0.97); } to { opacity: 1; transform: none; } }
            @keyframes c99-toast-out { to { opacity: 0; transform: translateX(-12px); } }
            @keyframes c99-toast-time { from { transform: scaleX(1); } to { transform: scaleX(0); } }

            /* Achievements + Copero99 as small round buttons in the career card's pill row (wide screens only, like the site's column they replace) */
            .c99-minis { display: none; align-items: center; gap: 4px; margin-left: 2px; }
            @media (min-width: 1024px) { .c99-minis { display: inline-flex; } }
            .c99-minis button {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                padding: 0;
                border: 1px solid rgb(255 255 255 / 0.18);
                border-radius: 999px;
                background: rgb(255 255 255 / 0.1);
                color: #fff;
                cursor: pointer;
            }
            .c99-minis button:hover { background: rgb(255 255 255 / 0.22); }
            .c99-minis svg { width: 11px; height: 11px; }
            /* Touch screens: the 18px tiles keep their look but take a 24px tap (an invisible area around them) */
            @media (pointer: coarse) { .c99-minis button::before { content: ''; position: absolute; inset: -3px; } }
            .c99-minis button.c99-launch, .c99-minis button.c99-tile { border: 0; background: none; }
            .c99-minis button.c99-tile:hover:not(:disabled) { background: none; filter: brightness(1.15); }
            .c99-minis button.c99-tile:disabled { opacity: 0.5; cursor: wait; }
            /* Sandbox's Retire button: silver, like the game's silver OVR badge */
            .c99-minis button.c99-retire { width: auto; padding: 0 8px; border: 1px solid rgb(51 65 85 / 0.38); background: linear-gradient(145deg, #f1f5f9 0%, #cbd5e1 48%, #94a3b8 100%); color: #0f172a; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.6); }
            .c99-minis button.c99-retire:hover { background: linear-gradient(145deg, #ffffff 0%, #e2e8f0 48%, #a8b4c4 100%); }
            .c99-minis button[hidden] { display: none; }
            .c99-minis button.c99-retire { gap: 3px; }
            .c99-minis button.c99-retire svg { width: 9px; height: 9px; stroke-width: 2.6; }
            .c99-minis button.c99-retire.c99-compact { width: 18px; padding: 0; }
            .c99-minis button.c99-retire.c99-compact span { display: none; }

            /* The launcher's diamond tile: the logo's trophy in the Diamond badge colours, with a glow and a shine */
            .c99-gem {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                width: 18px;
                height: 18px;
                overflow: hidden;
                border-radius: 6px;
                background: linear-gradient(145deg, #ecfeff 0%, #a5f3fc 35%, #60a5fa 75%, #3b82f6 100%);
                color: #082f49;
                box-shadow: 0 0 8px rgb(96 165 250 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.7);
            }
            .c99-gem svg, button.c99-launch .c99-gem svg { width: 12px; height: 12px; stroke-width: 2.4; }
            .c99-gem::after {
                content: '';
                position: absolute;
                inset: -50%;
                background: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.85) 50%, transparent 60%);
                transform: translateX(-70%);
                animation: c99-shine 2.8s ease-in-out infinite;
            }
            #copero99-fab .c99-gem { width: 28px; height: 28px; border-radius: 8px; }
            #copero99-fab .c99-gem svg { width: 17px; height: 17px; }
            /* The same glossy tile in gold (achievements) and red (going back) */
            .c99-gem.c99-gold { background: linear-gradient(145deg, #fffbeb 0%, #fde68a 35%, #f59e0b 75%, #b45309 100%); color: #451a03; box-shadow: 0 0 8px rgb(245 158 11 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.7); }
            .c99-gem.c99-red { background: linear-gradient(145deg, #fee2e2 0%, #fca5a5 30%, #ef4444 70%, #991b1b 100%); color: #fff; box-shadow: 0 0 8px rgb(239 68 68 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.6); }
            .c99-gem.c99-red svg { stroke-width: 2.8; filter: drop-shadow(0 1px 1px rgb(127 29 29 / 0.6)); }
            /* The Living world's globe: a teal tile (land and sea), a little bigger for the box head */
            .c99-gem.c99-globe { width: 22px; height: 22px; border-radius: 7px; background: linear-gradient(145deg, #f0fdfa 0%, #99f6e4 30%, #2dd4bf 62%, #0f766e 100%); color: #042f2e; box-shadow: 0 0 9px rgb(45 212 191 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.7); }
            .c99-gem.c99-globe svg { width: 15px; height: 15px; stroke-width: 2.1; }

            /* "Your club" theme: the club's crest, big and faded, in the empty space left of the game (only where there's room) */
            /* Level with the game card and as tall as it (placeSideCrest), so it scrolls with the card and never covers Copero's footer;
               big, running off the left edge and fading out to the right */
            .c99-side-crest { position: absolute; left: 0; z-index: 0; width: max(0px, calc((100vw - 67rem) / 2 - 24px)); container-type: size; overflow: hidden; opacity: 0.11; pointer-events: none; -webkit-mask-image: linear-gradient(to right, #000 45%, transparent); mask-image: linear-gradient(to right, #000 45%, transparent); }
            /* The crest at 96% of the card's height, a sixth of it off the left edge. Crests come from 0.4 (Tottenham) to 3.9 times
               as wide as tall, so the share off the edge is of the crest's own width (a fixed one hid half of Tottenham's) and a wide
               crest is at most 1.2 times as wide as tall (Brann's ran on for 2,500px) */
            .c99-side-crest img { position: absolute; top: 50%; left: 0; width: auto; height: 96%; max-width: 115cqh; object-fit: contain; object-position: left center; transform: translate(max(-17.6%, -16.9cqh), -50%); }
            html.c99-docked .c99-side-crest { width: max(0px, calc((100vw - 380px - 67rem) / 2 - 24px)); }
            @media (max-width: 1399px) { .c99-side-crest { display: none; } }
            @media (max-width: 1699px) { html.c99-docked .c99-side-crest { display: none; } }
            .c99-side-crest.c99-in { animation: c99-crest-in 1.2s ease-out; }
            @keyframes c99-crest-in { from { opacity: 0; transform: translateX(-24px); } to { opacity: 0.11; transform: none; } }
            /* The faded crests float: a slow bob with a little drift and tilt (the translate and rotate properties add to the
               crest's own transform). None with reduced motion */
            .c99-side-crest img { animation: c99-float 11s ease-in-out infinite; }
            @keyframes c99-float { 0%, 100% { translate: 0 0; rotate: -1deg; } 30% { translate: 5px -9px; rotate: 0.6deg; } 65% { translate: -3px -4px; rotate: 1.3deg; } }
            /* "Your club" waves: a band along the bottom of the screen behind Copero's page (z-index -1, under everything but the
               page colour), so they show in the room beside and under the game and never over a card, the panel or the footer.
               Slow and soft, fading out upward; still with reduced motion; only where the side crest has room too */
            .c99-waves { position: fixed; left: 0; right: 0; bottom: 0; z-index: -1; height: clamp(150px, 26vh, 260px); overflow: hidden; pointer-events: none; background: linear-gradient(to top, color-mix(in srgb, var(--c99-w1) 10%, transparent), transparent 70%); -webkit-mask-image: linear-gradient(to top, #000 40%, transparent); mask-image: linear-gradient(to top, #000 40%, transparent); animation: c99-waves-in 1.4s ease-out; }
            html[data-c99-waves] #root > div.min-h-screen, html[data-c99-waves] #root > div > main > div.min-h-screen { background-color: transparent !important; }
            .c99-wave-bob { position: absolute; inset: 0; animation: c99-wave-bob 9s ease-in-out infinite alternate; }
            .c99-wave-bob.r2 { animation-duration: 11s; animation-delay: -4s; }
            .c99-wave-bob.r3 { animation-duration: 13s; animation-delay: -7s; }
            .c99-wave { position: absolute; left: 0; bottom: 0; width: 200%; height: 100%; animation: c99-wave-x 70s linear infinite; will-change: transform; }
            .c99-wave svg { display: block; width: 100%; height: 100%; overflow: visible; }
            .c99-wave-bob.r2 .c99-wave { animation-duration: 90s; animation-direction: reverse; }
            .c99-wave-bob.r3 .c99-wave { animation-duration: 55s; }
            .c99-waves path { fill: none; stroke-linecap: round; transition: stroke 0.8s ease; }
            .c99-waves .w1 { stroke: var(--c99-w1); }
            .c99-waves .w2 { stroke: var(--c99-w2); }
            .c99-waves .w3 { stroke: var(--c99-w3); }
            .c99-waves .glow { stroke-width: 16px; opacity: 0.1; }
            .c99-waves .main { stroke-width: 4px; opacity: 0.55; }
            .c99-waves .thread { stroke-width: 1.2px; opacity: 0.35; }
            .c99-waves .accent { stroke-width: 1.5px; opacity: 0.45; }
            @keyframes c99-wave-x { to { transform: translate3d(-50%, 0, 0); } }
            @keyframes c99-wave-bob { from { transform: translateY(-6px); } to { transform: translateY(6px); } }
            @keyframes c99-waves-in { from { opacity: 0; transform: translateY(24px); } }
            @media (max-width: 1399px) { .c99-waves { display: none; } }
            @media (max-width: 1699px) { html.c99-docked .c99-waves { display: none; } }
            @media (prefers-reduced-motion: reduce) { .c99-waves, .c99-wave-bob, .c99-wave { animation: none; } }
            /* Copero's trophy celebration darkens only the card's strip of the page (its wrapper), so its edges showed: it covers the whole screen, the panel too */
            [data-career-phase] .career-trophy-celebration { position: fixed; z-index: 500; }
            .career-trophy-celebration-item:is([aria-label="Promoted"], [aria-label="Ascenso"], [aria-label="Acesso"]) { color: #dcfce7; filter: drop-shadow(0 10px 20px rgb(20 83 45 / 0.75)); }
            .career-trophy-celebration-item:is([aria-label="Promoted"], [aria-label="Ascenso"], [aria-label="Acesso"]) svg { transform: scaleY(-1); }
            .career-trophy-celebration-item:is([aria-label="Promoted"], [aria-label="Ascenso"], [aria-label="Acesso"]) circle { fill: #16a34a; }
            .career-trophy-celebration-item:is([aria-label="Promoted"], [aria-label="Ascenso"], [aria-label="Acesso"]) span { background: #16a34a; }
            .c99-up-mark { display: inline-block; flex-shrink: 0; width: 10px; height: 10px; margin-left: 2px; vertical-align: middle; }
            @media (min-width: 640px) { .c99-up-mark { width: 14px; height: 14px; } }
            /* Five decision cards (decorateCards): 3 + 2; or two / four cards and a Retire strip along the bottom, laid sideways */
            [data-career-phase] .c99-five:not(.c99-strip) > * { grid-column: span 4 / span 4 !important; grid-row: auto !important; }
            [data-career-phase] .c99-five:not(.c99-strip) > :nth-child(n+4) { grid-column: span 6 / span 6 !important; }
            [data-career-phase] .c99-strip > :last-child { grid-column: 1 / -1 !important; grid-row: auto !important; }
            @media (min-width: 1024px) {
                [data-career-phase] .c99-five:not(.c99-strip) { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; grid-template-rows: repeat(2, minmax(0, 1fr)) !important; }
                [data-career-phase] .c99-strip { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; grid-template-rows: minmax(0, 1fr) auto !important; }
                [data-career-phase] .c99-five.c99-strip { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto !important; }
                [data-career-phase] .c99-strip > * { grid-column: span 2 / span 2 !important; grid-row: auto !important; }
                [data-career-phase] .c99-strip > :last-child { grid-column: 1 / -1 !important; min-height: 0; }
                [data-career-phase] .c99-strip > :last-child > div { flex-direction: row; align-items: center; gap: 12px; }
                [data-career-phase] .c99-strip > :last-child > div > span:first-child { width: auto; flex: 0 0 auto; padding: 0 6px; }
                [data-career-phase] .c99-strip > :last-child > div > div:last-child { margin-top: 0; height: auto; min-height: 0 !important; flex: 1 1 auto; }
            }
            /* A new club's colours fade in over the whole page (applyLook: a view transition, the graphics card's crossfade) */
            ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 0.6s; }
            @media (prefers-reduced-motion: reduce) {
                .c99-side-crest.c99-in, .c99-side-crest img, #copero99-menu .panel-crest, #copero99-menu .box::before { animation: none !important; }
            }
            /* Random country, position and everything: dice buttons in Copero's own look. The country one sits inside the search field
               (gone while you type: its clear button is there), the position one in the pitch's empty bottom-right corner, styled
               like the pitch's position buttons, the one for everything left of Confirm identity like Copero's outline buttons.
               A click tumbles the dice and sends a ring out */
            .c99-random { position: absolute; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid hsl(var(--border)); border-radius: 9px; background: hsl(var(--card)); color: hsl(var(--foreground)); cursor: pointer; transition: background-color 0.15s, border-color 0.15s, color 0.15s; }
            .c99-random:hover { background: hsl(var(--accent)); border-color: hsl(var(--foreground) / 0.25); }
            .c99-random:focus-visible { outline: 2px solid hsl(var(--ring, var(--primary))); outline-offset: 1px; }
            .c99-random svg { width: 15px; height: 15px; }
            .c99-random.c99-roll { animation: c99-dice-ring 0.6s ease-out; }
            .c99-random.c99-roll svg { animation: c99-dice 0.6s cubic-bezier(0.3, 1.3, 0.5, 1); }
            @keyframes c99-dice { 0% { transform: none; } 40% { transform: rotate(-220deg) scale(1.45); } 75% { transform: rotate(-345deg) scale(0.9); } 100% { transform: rotate(-360deg); } }
            @keyframes c99-dice-ring { from { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 50%, transparent); } to { box-shadow: 0 0 0 9px color-mix(in srgb, currentColor 0%, transparent); } }
            .c99-random-country { top: 50%; right: 6px; transform: translateY(-50%); }
            input:not(:placeholder-shown) + .c99-random-country { display: none; }
            .c99-random-position { right: 6px; bottom: 6px; z-index: 1; width: 24px; height: 24px; border-color: #064e3b; border-radius: 999px; background: #022c22; color: #d1fae5; }
            .c99-random-position svg { width: 13px; height: 13px; }
            .c99-random-position:hover { border-color: #fff; background: #064e3b; color: #fff; }
            .c99-random-all { position: relative; flex: 0 0 auto; width: 40px; height: 40px; border-color: hsl(var(--foreground)); border-radius: 999px; background: transparent; }
            .c99-random-all:hover { border-color: hsl(var(--foreground)); }
            .c99-random-all svg { width: 18px; height: 18px; }
            @media (prefers-reduced-motion: reduce) { .c99-random.c99-roll, .c99-random.c99-roll svg { animation: none; } }
            /* Starting over: Copero's name screen is filled in and confirmed by the script, so it isn't shown in between */
            html.c99-restarting [data-career-phase="identity"] { visibility: hidden; }
            /* Hover info in Copero's style (its popover: small, bordered, an arrow), and the rest of a group fading like its trophy case */
            .c99-tip { position: fixed; top: 0; left: 0; z-index: 700; max-width: 14rem; padding: 6px 8px; border: 1px solid hsl(var(--border, 240 10% 16%)); border-radius: 6px; background: hsl(var(--popover, 240 10% 7%)); color: hsl(var(--popover-foreground, 0 0% 98%)); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); font-size: 11px; font-weight: 400; line-height: 1.4; text-align: center; white-space: pre-line; pointer-events: none; opacity: 0; transition: opacity 0.15s; }
            .c99-tip.show { opacity: 1; }
            .c99-tip::before { content: ''; position: absolute; top: -5px; left: var(--arrow, 50%); width: 8px; height: 8px; border-top: 1px solid hsl(var(--border, 240 10% 16%)); border-left: 1px solid hsl(var(--border, 240 10% 16%)); background: inherit; transform: translateX(-50%) rotate(45deg); }
            .c99-tip.above::before { top: auto; bottom: -5px; transform: translateX(-50%) rotate(225deg); }
            .c99-group > * { transition: opacity 0.3s, filter 0.3s; }
            .c99-group.c99-dim > :not(.c99-lit) { opacity: 0.3 !important; filter: grayscale(0.5); }
            @media (prefers-reduced-motion: reduce) { .c99-tip, .c99-group > * { transition: none; } }
            /* Soft see-through confetti when a mode is locked in */
            .c99-confetti { position: fixed; inset: 0; z-index: 650; overflow: hidden; pointer-events: none; }
            .c99-confetti i { position: absolute; width: 7px; height: 11px; border-radius: 2px; opacity: 0; animation: c99-confetti 1.5s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
            @keyframes c99-confetti {
                0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
                45% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(calc(var(--r) / 2)); opacity: 0.6; }
                100% { transform: translate(calc(-50% + var(--x) * 1.3), calc(-50% + var(--y) + 110px)) rotate(var(--r)); opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
                .c99-gem::after { animation: none; }
                .c99-confetti { display: none; }
                #copero99-toasts .toast, #copero99-toasts .toast.leaving { animation: none; }
            }

            /* Modes: Boost is emerald, Sandbox amber, Vanilla sky blue */
            #copero99-menu { --c99-boost: #10b981; --c99-sandbox: #f59e0b; --c99-vanilla: #38bdf8; }
            /* The mode picked for this career, as one badge (it can't change, so there's no second button) */
            #copero99-menu .mode-badge { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; color: #fff; font-size: 14px; font-weight: 700; }
            #copero99-menu .mode-badge svg { width: 17px; height: 17px; }
            #copero99-menu .mode-badge span { flex: 1; font-size: 12px; font-weight: 500; opacity: 0.85; }
            #copero99-menu .mode-badge.boost { background: linear-gradient(135deg, #10b981, #047857); box-shadow: 0 6px 18px rgb(16 185 129 / 0.22); }
            #copero99-menu .mode-badge.sandbox { background: linear-gradient(135deg, #f59e0b, #c2410c); box-shadow: 0 6px 18px rgb(245 158 11 / 0.22); }
            #copero99-menu .mode-badge.c99-lockin, #copero99-menu .late-card.c99-lockin { animation: c99-lockin 0.7s ease-out; }
            @keyframes c99-lockin {
                0% { transform: scale(0.96); }
                40% { transform: scale(1.03); box-shadow: 0 0 0 6px rgb(255 255 255 / 0.12), 0 6px 18px rgb(0 0 0 / 0.25); }
                100% { transform: none; }
            }
            /* Sandbox: everything inside goes amber (chart, selected buttons) */
            #copero99-menu #copero99-sandbox-box { --c99-accent: var(--c99-sandbox); --c99-accent-soft: rgb(245 158 11 / 0.14); }
            #copero99-menu #copero99-sandbox-box .seg button.active,
            #copero99-menu #copero99-sandbox-box .chip.active { border-color: var(--c99-sandbox); background: rgb(245 158 11 / 0.16); color: var(--c99-sandbox); }
            #copero99-menu #copero99-sandbox-box .slider input[type="range"] { accent-color: var(--c99-sandbox); }
            #copero99-menu #copero99-boost-box .slider input[type="range"] { accent-color: var(--c99-boost); }
            #copero99-menu #copero99-boost-box .chip.active { border-color: var(--c99-boost); background: rgb(16 185 129 / 0.18); color: var(--c99-text); }
            /* Level chips in their roll colours: the name in its gradient, the picked one framed in it */
            #copero99-menu .tier-chip { --edge: #d97706; }
            #copero99-menu .tier-chip.silver { --edge: #94a3b8; }
            #copero99-menu .tier-chip.gold { --edge: #f59e0b; }
            #copero99-menu .tier-chip.cyan { --edge: #38bdf8; }
            #copero99-menu .tier-chip.elite { --edge: #a855f7; }
            #copero99-menu .tier-chip.special { --edge: #c026d3; }
            #copero99-menu .tier-chip.iron { --edge: #78716c; }
            #copero99-menu .tier-chip.rose { --edge: #f43f5e; }
            #copero99-menu .tier-chip.teal { --edge: #14b8a6; }
            #copero99-menu .tier-chip.dawn { --edge: #60a5fa; }
            #copero99-menu .tier-chip.aurum { --edge: #eab308; }
            #copero99-menu .tier-chip:hover:not(:disabled) { border-color: color-mix(in srgb, var(--edge) 60%, transparent); }
            #copero99-menu #copero99-boost-box .tier-chip.active { border-color: var(--edge); background: color-mix(in srgb, var(--edge) 16%, transparent); box-shadow: inset 0 0 0 1px var(--edge); }

            /* Boost card, a scouting report: the level and how rare it is, three key numbers, three meters, the style, the perks */
            #copero99-menu .boost-card {
                margin-top: 10px;
                padding: 12px;
                border: 1px solid rgb(16 185 129 / 0.35);
                border-radius: 14px;
                background: linear-gradient(160deg, rgb(16 185 129 / 0.16), rgb(16 185 129 / 0.03) 60%), var(--c99-card);
            }
            #copero99-menu .boost-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
            #copero99-menu .boost-card small { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-boost); }
            #copero99-menu .boost-card .boost-name { display: block; font-size: 20px; font-weight: 900; letter-spacing: -0.3px; line-height: 1.15; }
            #copero99-menu .boost-rarity { font-size: 11px; font-weight: 600; color: var(--c99-muted); }
            #copero99-menu .boost-desc { margin-top: 6px; font-size: 12px; color: var(--c99-muted); }
            #copero99-menu .boost-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 10px; }
            #copero99-menu .boost-tiles div { display: flex; flex-direction: column; align-items: center; padding: 6px 4px; border-radius: 10px; background: rgb(0 0 0 / 0.18); }
            #copero99-menu .boost-tiles b { font-size: 18px; font-weight: 900; line-height: 1.1; font-variant-numeric: tabular-nums; }
            #copero99-menu .boost-tiles span { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-menu .boost-meters { display: grid; gap: 3px; margin-top: 10px; }
            #copero99-menu .boost-meter { display: grid; grid-template-columns: 112px auto 1fr; align-items: center; gap: 8px; font-size: 12px; }
            #copero99-menu .boost-meter > span:first-child { color: var(--c99-muted); }
            #copero99-menu .boost-meter .dots { display: inline-flex; gap: 3px; }
            #copero99-menu .boost-meter .dots i { width: 9px; height: 9px; border-radius: 50%; background: rgb(148 163 184 / 0.28); }
            #copero99-menu .boost-meter .dots i.on { background: linear-gradient(135deg, #6ee7b7, #10b981); }
            #copero99-menu .boost-meter em { font-style: normal; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
            #copero99-menu .boost-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
            #copero99-menu .boost-chips span { padding: 2px 8px; border-radius: 999px; background: rgb(250 204 21 / 0.14); box-shadow: inset 0 0 0 1px rgb(250 204 21 / 0.5); color: var(--c99-text); font-size: 12px; font-weight: 600; white-space: nowrap; }
            #copero99-menu .boost-chips span.bad { background: rgb(248 113 113 / 0.12); box-shadow: inset 0 0 0 1px rgb(248 113 113 / 0.5); }
            #copero99-menu .boost-last { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--c99-line); font-size: 12px; font-weight: 600; color: var(--c99-boost); }
            /* How the club suits you: a pill with a light glowing behind it (red: not clicking, green: thriving) */
            #copero99-menu .c99-fit { display: inline-block; padding: 0 7px; border-radius: 999px; font-weight: 800; animation: c99-fit-glow 2.6s ease-in-out infinite; }
            #copero99-menu .c99-fit.bad { color: #fecaca; background: rgb(220 38 38 / 0.32); box-shadow: 0 0 10px 1px rgb(239 68 68 / 0.6); --glow: rgb(239 68 68 / 0.9); }
            #copero99-menu .c99-fit.good { color: #bbf7d0; background: rgb(22 163 74 / 0.28); box-shadow: 0 0 8px rgb(34 197 94 / 0.45); --glow: rgb(34 197 94 / 0.75); }
            html:not(.dark) #copero99-menu .c99-fit.bad { color: #991b1b; }
            html:not(.dark) #copero99-menu .c99-fit.good { color: #166534; }
            @keyframes c99-fit-glow { 50% { box-shadow: 0 0 16px 3px var(--glow); } }
            @media (prefers-reduced-motion: reduce) { #copero99-menu .c99-fit { animation: none; } }
            #copero99-menu .boost-warn { margin-top: 6px; }
            /* Sealed: a closed report (diagonal paper grain, dashed edge), one line in quotes */
            #copero99-menu .boost-card [hidden] { display: none; }
            #copero99-menu .boost-card.sealed { border-style: dashed; background: radial-gradient(circle at 90% 0%, rgb(16 185 129 / 0.2), transparent 55%), repeating-linear-gradient(135deg, rgb(148 163 184 / 0.06) 0 6px, transparent 6px 12px), var(--c99-card); }
            #copero99-menu .boost-card .sealed-name { color: var(--c99-text); font-size: 18px; }
            #copero99-menu .boost-card.sealed .boost-desc { margin-top: 8px; font-size: 13px; font-style: italic; color: var(--c99-text); }
            #copero99-menu .reroll {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                flex: 0 0 auto;
                padding: 6px 12px;
                border: 1px solid rgb(16 185 129 / 0.5);
                border-radius: 999px;
                background: rgb(16 185 129 / 0.12);
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            #copero99-menu .reroll:hover { background: rgb(16 185 129 / 0.25); }
            #copero99-menu .reroll-dice { position: relative; display: inline-flex; }
            #copero99-menu .reroll-dice i { position: absolute; top: -6px; right: -8px; min-width: 13px; height: 13px; padding: 0 3px; border-radius: 999px; background: var(--c99-boost); color: #fff; font-size: 9px; font-style: normal; font-weight: 800; line-height: 13px; text-align: center; }
            #copero99-menu .row.compact { padding: 8px 12px; margin-top: 8px; }

            /* After the first season: locked reroll and boost settings */
            #copero99-menu .reroll:disabled,
            #copero99-menu .fold-body .chip:disabled,
            #copero99-menu .slider input[type="range"]:disabled { opacity: 0.45; cursor: not-allowed; }
            #copero99-menu .lock-note { display: flex; align-items: center; gap: 6px; }
            #copero99-menu .lock-note svg { width: 13px; height: 13px; }
            /* Picking the mode for a new career: three compact cards, then the picked one locks in */
            #copero99-menu .pick-cards { display: grid; gap: 8px; }
            #copero99-menu .pick-card {
                display: grid;
                grid-template-columns: auto 1fr;
                align-items: center;
                column-gap: 12px;
                row-gap: 1px;
                padding: 11px 14px;
                border: 1px solid var(--c99-line);
                border-radius: 14px;
                background: var(--c99-card);
                text-align: left;
                cursor: pointer;
                transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
            }
            #copero99-menu .pick-card svg { grid-row: span 2; width: 24px; height: 24px; }
            #copero99-menu .pick-card b { font-size: 15px; font-weight: 800; }
            #copero99-menu .pick-card span { font-size: 12px; line-height: 1.4; color: var(--c99-muted); }
            #copero99-menu .pick-card.boost svg { color: var(--c99-boost); }
            #copero99-menu .pick-card.sandbox svg { color: var(--c99-sandbox); }
            #copero99-menu .pick-card.vanilla svg { color: var(--c99-vanilla); }
            #copero99-menu .pick-card:hover { transform: translateY(-1px); }
            #copero99-menu .pick-card.boost:hover { border-color: rgb(16 185 129 / 0.6); background: linear-gradient(135deg, rgb(16 185 129 / 0.14), transparent 70%), var(--c99-card); }
            #copero99-menu .pick-card.sandbox:hover { border-color: rgb(245 158 11 / 0.6); background: linear-gradient(135deg, rgb(245 158 11 / 0.14), transparent 70%), var(--c99-card); }
            #copero99-menu .pick-card.vanilla:hover { border-color: rgb(56 189 248 / 0.6); background: linear-gradient(135deg, rgb(56 189 248 / 0.14), transparent 70%), var(--c99-card); }
            /* Career style line on the boost card */
            #copero99-menu .boost-style { margin-top: 8px; font-size: 12px; color: var(--c99-muted); }
            #copero99-menu .boost-style b { font-weight: 700; color: var(--c99-text); }
            #copero99-menu details.fold.freeze > summary { display: flex; align-items: center; gap: 10px; }
            #copero99-menu details.fold.freeze > summary > svg { width: 18px; height: 18px; color: #a78bfa; }
            #copero99-menu .chip-value { margin-left: 4px; color: var(--c99-muted); font-weight: 600; }
            #copero99-menu .summary-text { flex: 1; display: flex; flex-direction: column; }
            #copero99-menu .summary-text small { font-size: 12px; font-weight: 400; color: var(--c99-muted); }
            #copero99-menu .lock-help { margin-top: 6px; font-size: 12px; color: var(--c99-muted); }

            /* Planned curve chart docked at the bottom of the panel once it scrolls out of sight */
            #copero99-menu #copero99-chart-dock { --c99-accent: var(--c99-sandbox); --c99-accent-soft: rgb(245 158 11 / 0.14); position: sticky; bottom: -16px; z-index: 3; margin: 0 -14px -16px; padding: 10px 14px 14px; background: linear-gradient(transparent, var(--c99-bg) 14px); }
            #copero99-menu #copero99-chart-dock:empty { display: none; }
            #copero99-menu #copero99-chart-dock .chart { margin-top: 0; background: var(--c99-card); border: 1px solid rgb(245 158 11 / 0.45); box-shadow: 0 -8px 24px rgb(0 0 0 / 0.3); animation: c99-pop 0.18s ease-out; }
            #copero99-menu #copero99-chart-dock .chart svg { max-height: 120px; }
            /* Club offers fold */
            #copero99-menu details.fold.offers > summary > svg { color: #f59e0b; }
            #copero99-menu details.fold.offers .slider { margin: 12px 0; }
            /* Living world: a club with its three reputations as pips */
            .c99-world .rep-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; padding: 8px 10px; border: 1px solid var(--c99-line); border-radius: 12px; background: var(--c99-card); }
            .c99-world .rep-row img { width: 26px; height: 26px; object-fit: contain; }
            .c99-world .rep-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
            /* The name has the row's whole width and wraps between words (a word only breaks if it can't fit on a line at all) */
            .c99-world .rep-text b { display: -webkit-box; overflow: hidden; font-size: 13px; line-height: 1.2; overflow-wrap: break-word; hyphens: auto; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
            .c99-world .rep-text small { font-size: 11px; color: var(--c99-muted); }
            .c99-world .c99-manager { display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; font-size: 11px; line-height: 1.3; color: var(--c99-muted); }
            .c99-world .rep-row .c99-manager img, .c99-world .c99-manager img { width: 13px; height: 13px; border-radius: 50%; object-fit: cover; }
            .c99-world .c99-stars { color: #f59e0b; font-size: 9px; letter-spacing: 1px; }
            .c99-world .c99-stars.six { background: linear-gradient(135deg, #e879f9, #a855f7 55%, #818cf8); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 3px rgb(168 85 247 / 0.55)); }
            .c99-world .c99-armband { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; margin-left: 6px; border: 1px dashed var(--c99-line); border-radius: 4px; color: var(--c99-muted); font-size: 9px; font-weight: 900; line-height: 1; vertical-align: 1px; opacity: 0.7; }
            .c99-world .c99-armband::before { content: 'C'; }
            .c99-world .c99-armband.on { border: 0; background: linear-gradient(135deg, #fde68a, #f59e0b 60%, #d97706); color: #451a03; opacity: 1; box-shadow: 0 0 6px rgb(245 158 11 / 0.5); }
            .c99-world .rep-meters { display: flex; flex-wrap: wrap; gap: 2px 8px; }
            .c99-world .rep-meter { display: grid; grid-template-columns: auto 8px; align-items: center; column-gap: 2px; }
            .c99-world .rep-meter small { grid-column: 1 / -1; }
            .c99-world .rep-meter .pips i { width: 7px; }
            .c99-world .rep-meter small { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: var(--c99-muted); }
            /* Your country's meter sits in its row's small lines, which would make its label as big as them */
            .c99-world .c99-comp-text .rep-meters { margin-top: 2px; }
            .c99-world .c99-comp-text .rep-meter small { font-size: 9px; line-height: 1.2; }
            .c99-world .pips { display: inline-flex; gap: 2px; }
            .c99-world .pips i { width: 9px; height: 5px; border-radius: 2px; background: var(--c99-card-hover); }
            .c99-world .pips i.on { background: linear-gradient(90deg, #a5f3fc, #60a5fa); }
            .c99-world .rep-meter em { font-size: 9px; font-style: normal; }
            .c99-world .rep-meter em.up, .c99-world .world-news li.up b { color: #34d399; }
            .c99-world .rep-meter em.down, .c99-world .world-news li.down b { color: #f87171; }
            .c99-world .world-news { margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--c99-muted); }
            .c99-world .world-news li { padding: 4px 0; border-bottom: 1px solid var(--c99-line); }
            .c99-world .world-news li:last-child { border-bottom: 0; }
            /* Living world box under the game card, in Copero's card style */
            .c99-world { box-sizing: border-box; width: 100%; max-width: 67rem; margin: 12px auto 0; padding: 10px 14px 12px; border: 1px solid var(--c99-line); border-radius: 0.75rem; background: var(--c99-bg); color: var(--c99-text); font-size: 13px; line-height: 1.4; text-align: left; }
            .c99-world:empty { display: none; }
            .c99-world * { box-sizing: border-box; }
            .c99-world-head { display: flex; align-items: center; gap: 4px 10px; margin-bottom: 8px; }
            .c99-world-head b { flex: 0 0 auto; font-size: 14px; font-weight: 700; }
            .c99-world-head .c99-world-sub { flex: 1; min-width: 0; overflow: hidden; font-size: 12px; color: var(--c99-muted); text-overflow: ellipsis; white-space: nowrap; }
            /* Phones: only room for "Ev…", so the subtitle goes and the season picker keeps its place */
            @media (max-width: 639px) { .c99-world-head .c99-world-sub { visibility: hidden; } }
            .c99-world-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px 14px; align-items: start; }
            /* Latest moves: a strip of small cards under the columns */
            .c99-world .c99-world-moves { grid-column: 1 / -1; }
            .c99-world .c99-world-moves .world-news { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }
            .c99-world .c99-world-moves .world-news li { padding: 5px 10px; border: 1px solid var(--c99-line); border-radius: 10px; background: var(--c99-card); line-height: 1.35; }
            .c99-world .c99-world-moves .world-news li:last-child { border-bottom: 1px solid var(--c99-line); }
            .c99-world .world-news li span { white-space: nowrap; }
            .c99-world .world-news li b img { display: inline-block; width: 14px; height: 14px; margin-right: 4px; object-fit: contain; vertical-align: -2px; }
            .c99-world .world-news li b img.c99-flag { border-radius: 50%; object-fit: cover; }
            .c99-world .world-news li.mgr b { color: var(--c99-text); }
            .c99-world .c99-season-pick { appearance: none; -webkit-appearance: none; padding: 2px 20px 2px 9px; border: 1px solid var(--c99-line); border-radius: 999px;
                background: var(--c99-card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 6px center / 10px;
                color: var(--c99-text); font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; }
            .c99-world .c99-season-pick:hover { border-color: var(--c99-accent, #10b981); }
            .c99-world .c99-season-pick option { background: hsl(var(--card, 222 47% 7%)); color: hsl(var(--foreground, 210 40% 98%)); text-transform: none; }
            .c99-world-label { display: flex; align-items: center; gap: 5px; min-height: 18px; margin-bottom: 2px; overflow: hidden; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-muted); white-space: nowrap; }
            .c99-world-label img { width: 14px; height: 14px; object-fit: contain; }
            .c99-world-label .c99-res { margin-left: auto; letter-spacing: 0; text-transform: none; }
            .c99-world-hint { margin-top: 6px; font-size: 12px; color: var(--c99-muted); }
            .c99-world { animation: c99-fade 0.25s ease-out; }
            /* Season results: one row per competition, the result as a chip in the game's trophy colours */
            .c99-world .c99-season-nav { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; margin-left: auto; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--c99-text); }
            .c99-world .c99-world-step { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: 1px solid var(--c99-line); border-radius: 999px; background: var(--c99-card); color: var(--c99-text); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; transition: background-color 0.15s; }
            .c99-world .c99-world-step:hover:not(:disabled) { background: var(--c99-card-hover); }
            @media (pointer: coarse) { .c99-world .c99-world-step { position: relative; } .c99-world .c99-world-step::before { content: ''; position: absolute; inset: -4px; } }
            .c99-world .c99-world-step:disabled { opacity: 0.35; cursor: default; }
            /* A row: the trophy, the name across the whole row, and under it the small lines with the result chip beside them.
               Every row has the same shape (and at least the same height), whatever its column */
            .c99-world .c99-comp { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; grid-template-areas: 'pic name name' 'pic text res'; align-items: center; column-gap: 10px; row-gap: 2px; min-height: 52px; margin-top: 6px; padding: 6px 10px; border: 1px solid var(--c99-line); border-radius: 10px; background: var(--c99-card); }
            .c99-world .c99-comp-pic { grid-area: pic; display: flex; align-items: center; justify-content: center; height: 26px; }
            .c99-world .c99-comp-pic img { max-width: 26px; max-height: 26px; object-fit: contain; }
            .c99-world .c99-comp-name { grid-area: name; min-width: 0; font-size: 12px; line-height: 1.3; overflow-wrap: break-word; }
            /* Copero's club priority: a small tag after the name of the competition the club put first */
            .c99-world .c99-focus { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 999px; background: rgb(250 204 21 / 0.14); box-shadow: inset 0 0 0 1px rgb(250 204 21 / 0.45); color: #facc15; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; line-height: 15px; text-transform: uppercase; vertical-align: 1px; white-space: nowrap; }
            html:not(.dark) .c99-world .c99-focus { color: #a16207; }
            .c99-world .c99-focus.c99-surprise { background: rgb(52 211 153 / 0.14); box-shadow: inset 0 0 0 1px rgb(52 211 153 / 0.45); color: #34d399; }
            html:not(.dark) .c99-world .c99-focus.c99-surprise { color: #047857; }
            .c99-world .c99-focus.c99-elite { background: rgb(245 158 11 / 0.16); box-shadow: inset 0 0 0 1px rgb(245 158 11 / 0.55); color: #f59e0b; }
            html:not(.dark) .c99-world .c99-focus.c99-elite { color: #b45309; }
            .c99-world .c99-focus.c99-carried { background: rgb(96 165 250 / 0.14); box-shadow: inset 0 0 0 1px rgb(96 165 250 / 0.45); color: #60a5fa; }
            html:not(.dark) .c99-world .c99-focus.c99-carried { color: #1d4ed8; }
            .c99-world .c99-focus.c99-crisis { background: rgb(248 113 113 / 0.14); box-shadow: inset 0 0 0 1px rgb(248 113 113 / 0.45); color: #f87171; }
            html:not(.dark) .c99-world .c99-focus.c99-crisis { color: #b91c1c; }
            .c99-world .c99-focus.c99-rested { background: hsl(var(--muted-foreground, 0 0% 60%) / 0.12); box-shadow: inset 0 0 0 1px hsl(var(--muted-foreground, 0 0% 60%) / 0.45); color: hsl(var(--muted-foreground, 0 0% 60%)); }
            .c99-world .c99-comp-text { grid-area: text; display: flex; flex-direction: column; min-width: 0; }
            /* Small lines wrap between words rather than being cut short ("Manchest…") */
            .c99-world .c99-comp-text small { font-size: 11px; line-height: 1.3; color: var(--c99-muted); overflow-wrap: break-word; }
            .c99-world .c99-comp > .c99-res { grid-area: res; justify-self: end; }
            .c99-world .c99-won-lead { white-space: nowrap; }
            .c99-world .c99-who em { margin-left: 4px; font-style: normal; font-weight: 700; color: var(--c99-text); white-space: nowrap; }
            .c99-world .c99-comp.out .c99-comp-pic img { filter: grayscale(1); opacity: 0.55; }
            .c99-world .c99-res { padding: 2px 8px; border-radius: 999px; background: var(--c99-card-hover); font-size: 11px; font-weight: 800; white-space: nowrap; }
            .c99-world .c99-res.win { background: linear-gradient(145deg, #fcd34d, #facc15 48%, #d97706); color: #451a03; }
            .c99-world .c99-res.final { background: linear-gradient(145deg, #e2e8f0, #cbd5e1 48%, #94a3b8); color: #0f172a; }
            .c99-world .c99-res.deep { background: rgb(96 165 250 / 0.18); color: #60a5fa; }
            .c99-world .c99-res.out { background: transparent; box-shadow: inset 0 0 0 1px var(--c99-line); color: var(--c99-muted); }
            /* Your Ballon d'Or placing: a metal medal on a ribbon beside the row's two lines, coloured by placing (gold, silver, bronze,
               Copero's purple 95-98 badge for 4th-5th, its light blue 90+ badge to 10th, teal to 20th, quiet to 30th). When the season
               lands it swings in on its ribbon, the podium with a burst; the winner's has slowly turning rays behind it */
            .c99-world .c99-comp.c99-medal-row { grid-template-areas: 'pic name res' 'pic text res'; }
            /* League standing: a tile in its zone's colour beside both lines, and the table as a strip of cells */
            .c99-world .c99-comp.c99-standing-row { grid-template-areas: 'pic name res' 'pic text res'; }
            .c99-world .c99-res.c99-standing { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 44px; padding: 4px 6px 3px; border-radius: 10px; line-height: 1;
                --zone: 148 163 184; background: linear-gradient(160deg, rgb(var(--zone) / 0.28), rgb(var(--zone) / 0.08)); box-shadow: inset 0 0 0 1px rgb(var(--zone) / 0.55); color: rgb(var(--zone)); }
            .c99-world .c99-standing b { font-size: 19px; font-weight: 900; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
            .c99-world .c99-standing b small { margin-left: 1px; font-size: 10px; font-weight: 800; }
            .c99-world .c99-standing i { margin-top: 2px; font-size: 9px; font-style: normal; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c99-muted); }
            .c99-world .c99-standing.title { --zone: 250 204 21; background: linear-gradient(145deg, #fcd34d, #facc15 48%, #d97706); box-shadow: 0 2px 10px rgb(250 204 21 / 0.35); color: #451a03; }
            .c99-world .c99-standing.title i { color: rgb(69 26 3 / 0.7); }
            .c99-world .c99-standing.up { --zone: 52 211 153; }
            .c99-world .c99-standing.cl { --zone: 96 165 250; }
            .c99-world .c99-standing.el { --zone: 45 212 191; }
            .c99-world .c99-standing.rel { --zone: 248 113 113; }
            .c99-world .c99-standing.po { --zone: 163 230 53; }
            .c99-world .c99-standing.relpo { --zone: 251 146 60; }
            html:not(.dark) .c99-world .c99-standing:not(.title) { color: rgb(var(--zone)); filter: brightness(0.75) saturate(1.3); }
            .c99-world .c99-table-strip { display: flex; align-items: flex-end; gap: 1px; height: 9px; margin-top: 5px; }
            .c99-world .c99-table-strip i { flex: 1 1 0; max-width: 12px; height: 4px; border-radius: 1px; background: rgb(148 163 184 / 0.28); }
            .c99-world .c99-table-strip i.title, .c99-world .c99-table-strip i.up { background: #facc15; }
            .c99-world .c99-table-strip i.up { background: #34d399; }
            .c99-world .c99-table-strip i.cl { background: rgb(96 165 250 / 0.75); }
            .c99-world .c99-table-strip i.el { background: rgb(45 212 191 / 0.6); }
            .c99-world .c99-table-strip i.rel { background: rgb(248 113 113 / 0.7); }
            .c99-world .c99-table-strip i.po { background: rgb(163 230 53 / 0.6); }
            .c99-world .c99-table-strip i.relpo { background: rgb(251 146 60 / 0.7); }
            .c99-world .c99-table-strip i.me { height: 9px; border-radius: 2px; background: var(--c99-text); box-shadow: 0 0 0 1px var(--c99-card), 0 0 6px rgb(255 255 255 / 0.25); }
            .c99-world .c99-res.c99-medal { --m1: #fff7d1; --m2: #facc15; --m3: #a16207; --ink: #422006; --r1: #1e3a8a; --r2: #fde047;
                position: relative; z-index: 0; isolation: isolate; align-self: center; display: flex; flex-direction: column; align-items: center; padding: 0; border-radius: 0; background: none; box-shadow: none; transform-origin: 50% 0; }
            .c99-world .c99-medal.p2 { --m1: #ffffff; --m2: #cbd5e1; --m3: #64748b; --ink: #0f172a; --r1: #334155; --r2: #e2e8f0; }
            .c99-world .c99-medal.p3 { --m1: #fed7aa; --m2: #d97706; --m3: #7c2d12; --ink: #fff7ed; --r1: #7f1d1d; --r2: #fdba74; }
            .c99-world .c99-medal.top5 { --m1: #f5d0fe; --m2: #a855f7; --m3: #581c87; --ink: #ffffff; --r1: #4c1d95; --r2: #e9d5ff; }
            .c99-world .c99-medal.top10 { --m1: #e0f2fe; --m2: #60a5fa; --m3: #1e40af; --ink: #082f49; --r1: #1e3a8a; --r2: #bae6fd; }
            .c99-world .c99-medal.top20 { --m1: #ccfbf1; --m2: #2dd4bf; --m3: #115e59; --ink: #042f2e; --r1: #134e4a; --r2: #99f6e4; }
            .c99-world .c99-medal-ribbon { width: 18px; height: 9px; margin-bottom: -3px; background: linear-gradient(90deg, var(--r1) 0 28%, var(--r2) 28% 40%, var(--r1) 40% 60%, var(--r2) 60% 72%, var(--r1) 72%); clip-path: polygon(0 0, 100% 0, 76% 100%, 24% 100%); }
            .c99-world .c99-medal-disc { position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; color: var(--ink);
                background: radial-gradient(circle at 32% 26%, var(--m1) 0 14%, transparent 46%), conic-gradient(from 200deg, var(--m2), var(--m1) 16%, var(--m2) 34%, var(--m3) 55%, var(--m2) 74%, var(--m1) 88%, var(--m2));
                box-shadow: inset 0 -3px 5px rgb(0 0 0 / 0.28), inset 0 2px 2px rgb(255 255 255 / 0.4), 0 2px 6px rgb(0 0 0 / 0.35); }
            .c99-world .c99-medal-disc::before { content: ''; position: absolute; inset: 3px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.4); box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.14); pointer-events: none; }
            .c99-world .c99-medal-disc b { position: relative; font-size: 14px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; text-shadow: 0 1px 0 rgb(255 255 255 / 0.25); }
            .c99-world .c99-medal-disc small { position: relative; align-self: flex-start; margin: 8px 0 0 1px; font-size: 7px; font-weight: 800; letter-spacing: 0.02em; }
            .c99-world .c99-medal.p3 .c99-medal-disc b, .c99-world .c99-medal.top5 .c99-medal-disc b { text-shadow: 0 1px 1px rgb(0 0 0 / 0.35); }
            .c99-world .c99-medal-shine { position: absolute; inset: -40%; background: linear-gradient(115deg, transparent 42%, rgb(255 255 255 / 0.7) 50%, transparent 58%); transform: translateX(-70%); animation: c99-shine 3.2s ease-in-out 1.2s infinite; pointer-events: none; }
            .c99-world .c99-medal.top10 .c99-medal-shine { animation-duration: 5s; opacity: 0.6; }
            .c99-world .c99-medal.top20 .c99-medal-shine, .c99-world .c99-medal.top30 .c99-medal-shine { display: none; }
            .c99-world .c99-medal.top30 .c99-medal-ribbon { background: var(--c99-line); }
            .c99-world .c99-medal.top30 .c99-medal-disc { background: var(--c99-card-hover); color: var(--c99-text); box-shadow: inset 0 0 0 1px var(--c99-line); }
            .c99-world .c99-medal.top30 .c99-medal-disc::before { border-color: var(--c99-line); box-shadow: none; }
            .c99-world .c99-medal.top30 .c99-medal-disc small { color: var(--c99-muted); }
            .c99-world .c99-medal.p1 .c99-medal-disc { box-shadow: inset 0 -3px 5px rgb(0 0 0 / 0.28), inset 0 2px 2px rgb(255 255 255 / 0.5), 0 0 12px rgb(250 204 21 / 0.55); }
            .c99-world .c99-medal.p1::before { content: ''; position: absolute; z-index: -1; left: 50%; top: 22px; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; pointer-events: none;
                background: repeating-conic-gradient(rgb(250 204 21 / 0.45) 0 7deg, transparent 7deg 20deg); -webkit-mask: radial-gradient(circle, #000 28%, transparent 68%); mask: radial-gradient(circle, #000 28%, transparent 68%); animation: c99-rays 10s linear infinite; }
            .c99-world .c99-land .c99-res.c99-medal { animation: c99-medal-swing 1.1s cubic-bezier(0.3, 0.7, 0.4, 1) var(--delay) both; }
            .c99-world .c99-land .c99-medal:is(.p1, .p2, .p3)::after { content: ''; position: absolute; left: 50%; top: 22px; width: 32px; height: 32px; margin: -16px 0 0 -16px; border-radius: 50%; border: 2px dotted var(--m1); box-shadow: 0 0 10px 1px var(--m2); opacity: 0; pointer-events: none; animation: c99-medal-burst 0.9s ease-out calc(var(--delay) + 0.3s) both; }
            .c99-world .c99-land .c99-medal.p1 .c99-medal-disc { animation: c99-medal-glow 1.4s ease-out calc(var(--delay) + 0.5s); }
            @keyframes c99-medal-swing { 0% { opacity: 0; transform: translateY(-16px) rotate(-30deg); } 30% { opacity: 1; transform: translateY(0) rotate(18deg); } 50% { transform: rotate(-10deg); } 68% { transform: rotate(5deg); } 84% { transform: rotate(-2deg); } 100% { opacity: 1; transform: none; } }
            @keyframes c99-medal-burst { 0% { opacity: 0.95; transform: scale(0.85) rotate(0deg); } 100% { opacity: 0; transform: scale(2.2) rotate(40deg); } }
            @keyframes c99-medal-glow { 40% { box-shadow: inset 0 -3px 5px rgb(0 0 0 / 0.28), 0 0 0 5px rgb(250 204 21 / 0.3), 0 0 24px rgb(250 204 21 / 0.95); } }
            @keyframes c99-rays { to { transform: rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) { .c99-world .c99-medal-shine { display: none; } .c99-world .c99-medal.p1::before { animation: none; } }
            .c99-world .c99-nation { margin-top: 8px; }
            /* Flags are round, like the ones in Copero's own season table */
            .c99-world .c99-comp-pic img.c99-flag { width: 20px; height: 20px; object-fit: cover; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25); }
            /* "Won by" with the winner's crest or flag before its name */
            .c99-world .c99-won img { display: inline-block; width: 13px; height: 13px; margin-right: 3px; object-fit: contain; vertical-align: -2px; }
            .c99-world .c99-won img.c99-flag { object-fit: cover; border-radius: 50%; }
            .c99-world .c99-won img.c99-won-flag { width: 11px; height: 11px; margin-right: 2px; vertical-align: -1px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.3); }
            /* A season being played: a pulsing dot on chips that run through the rounds, then the results pop in one by one */
            .c99-world .c99-res.live { display: inline-flex; align-items: center; gap: 5px; background: var(--c99-card-hover); color: var(--c99-text); }
            .c99-world .c99-res.live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #f87171; animation: c99-live 0.9s ease-in-out infinite; }
            @keyframes c99-live { 50% { opacity: 0.2; } }
            .c99-world .c99-land > * { --delay: calc(var(--i, 0) * 70ms); }
            .c99-world .c99-land .c99-res { animation: c99-land 0.45s cubic-bezier(0.2, 1.5, 0.4, 1) var(--delay) both; }
            .c99-world .c99-land .c99-comp-text small { animation: c99-fade 0.4s ease-out var(--delay) both; }
            @keyframes c99-land { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: none; } }
            @media (prefers-reduced-motion: reduce) { .c99-world, .c99-world .c99-res.live::before, .c99-world .c99-land * { animation: none !important; } }
            /* Block injuries: Copero's injury card keeps its look, and its outcome pill turns into Copero's green "good" pill with a tick */
            [data-c99-blocked] { background-color: rgb(5 150 105 / 0.5) !important; color: #fff !important; }
            [data-c99-blocked] > div:first-child { position: relative; background-color: #10b981 !important; color: #fff !important; }
            [data-c99-blocked] > div:first-child svg { visibility: hidden; }
            [data-c99-blocked] > div:first-child::after { content: '✓'; position: absolute; inset: 0; display: grid; place-items: center; font-size: 9px; font-weight: 800; }
            @media (min-width: 1024px) {
                [data-c99-blocked] { background-color: rgb(16 185 129 / 0.1) !important; color: #065f46 !important; }
                html.dark [data-c99-blocked] { color: #34d399 !important; }
                html.dark [data-c99-blocked] > div:first-child { background-color: rgb(16 185 129 / 0.2) !important; color: #34d399 !important; }
            }
            /* Reputation pips under the league line on Copero's decision cards */
            .c99-card-rep { display: flex; flex-wrap: nowrap; justify-content: center; gap: 0 7px; margin-top: -2px; height: 7px; }
            /* From lg Copero's cards have a fixed height, so the row sits in the card's bottom padding and the crest keeps its size */
            @media (min-width: 1024px) { .c99-card-rep { position: absolute; left: 0; right: 0; bottom: -7px; margin: 0; } }
            /* The role chip on Copero's decision cards: what Copero plays you as there, a dot in the role's colour (the star in gold) */
            .c99-card-role { display: inline-flex; align-items: center; gap: 3px; margin-left: 3px; padding: 0 5px 0 4px; border-radius: 999px; background: hsl(var(--muted-foreground) / 0.14); color: hsl(var(--foreground)); font-size: 8px; font-weight: 800; letter-spacing: 0.02em; line-height: 12px; white-space: nowrap; }
            .relative.z-20 > .c99-card-role { margin: 3px auto 0; }
            .c99-card-role i { flex: 0 0 auto; width: 5px; height: 5px; border-radius: 50%; background: hsl(var(--muted-foreground)); }
            .c99-card-role b { font-size: 7px; font-weight: 800; }
            .c99-card-role.starter i { background: #10b981; }
            .c99-card-role.rotation i { background: #38bdf8; }
            .c99-card-role.squad i { background: #f59e0b; }
            .c99-card-role.bench i { background: #f87171; }
            .c99-card-role.star { background: linear-gradient(145deg, #fcd34d, #facc15 48%, #d97706); color: #451a03; }
            .c99-card-role.star i { background: #451a03; }
            .c99-card-role.c99-compact { gap: 2px; padding: 0 4px; font-size: 0; }
            @media (min-width: 1280px) { .c99-card-role { font-size: 9px; line-height: 13px; } }
            .c99-tag-host { position: relative; }
            .c99-tag-host > .c99-card-farewell { position: absolute; left: 50%; bottom: 2px; transform: translateX(-50%); margin: 0; z-index: 1; box-shadow: 0 1px 4px rgb(0 0 0 / 0.35); }
            .c99-card-farewell { display: inline-flex; margin: 3px auto 0; padding: 1px 7px; border-radius: 999px; background: linear-gradient(145deg, #fcd34d, #f59e0b); color: #451a03; font-size: 9px; font-weight: 800; line-height: 13px; white-space: nowrap; }
            /* Copero's season table: a row shows once its age is reached (fading in); past 39 the table scrolls */
            [data-career-phase] .career-history-row { transition: opacity 0.45s ease; }
            [data-career-phase] .career-history-row.c99-future { opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0s linear 0.2s; }
            /* Below lg the table is a tall box of its own, so a hidden row left a hole: there the coming rows stay as Copero's faint age slots */
            @media (max-width: 1023px) { [data-career-phase] .career-history-row.c99-future { opacity: 1; visibility: visible; } }
            [data-career-phase] .c99-scrolls { overflow-y: auto !important; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / 0.35) transparent; }
            [data-career-phase] .c99-row .c99-row-ask { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); font-size: 10px; font-weight: 800; }
            [data-career-phase] .c99-row .c99-row-trophy { display: inline-block; width: auto; height: 14px; max-width: 18px; object-fit: contain; }
            @media (min-width: 1024px) { [data-career-phase] .c99-row .c99-row-trophy { height: 18px; max-width: 22px; } [data-career-phase] .c99-row .c99-row-ask { width: 22px; height: 22px; } }
            @media (prefers-reduced-motion: reduce) { [data-career-phase] .career-history-row { transition: none; } }
            /* Copero's trophy case: the Golden Boot is its one wide picture, so in the same square box it looked twice the size of the cups */
            [data-career-phase] .select-none.flex-nowrap.pr-1 img[src*="/golden-boot.png"] { transform: scale(0.8); }
            .c99-card-rep span { display: inline-flex; align-items: center; height: 7px; font-size: 7px; line-height: 7px; font-weight: 700; letter-spacing: 0.04em; color: hsl(var(--muted-foreground)); }
            .c99-card-rep i { width: 5px; height: 4px; margin-left: 1px; border-radius: 1px; background: hsl(var(--muted-foreground) / 0.3); }
            .c99-card-rep i:first-of-type { margin-left: 3px; }
            .c99-card-rep i.on { background: linear-gradient(90deg, #a5f3fc, #60a5fa); }
            /* Phones: three cards in a row are ~100px wide, so the meters shrink to fit inside the card */
            @media (max-width: 639px) {
                .c99-card-rep { gap: 0 4px; max-width: 100%; }
                .c99-card-rep span { font-size: 6px; }
                .c99-card-rep i { width: 3px; height: 3px; }
                .c99-card-rep i:first-of-type { margin-left: 2px; }
            }
            .c99-card-rep i.six, .c99-world .pips i.six { background: linear-gradient(90deg, #fde68a, #f59e0b); box-shadow: 0 0 4px rgb(245 158 11 / 0.6); }            /* Hall of Fame: does this career count? */
            #copero99-menu .hof-check { margin: 8px 0 10px; padding: 8px 12px; border-radius: 10px; background: var(--c99-accent-soft); color: var(--c99-accent); font-size: 12px; font-weight: 600; }
            #copero99-menu .hof-check:empty { display: none; }
            #copero99-menu .hof-check.no { background: hsl(var(--destructive, 0 72.8% 55%) / 0.12); color: var(--c99-off); }
            /* Theme & font window */
            #copero99-modal .look-label { margin: 4px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-modal .look-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin-bottom: 16px; }
            #copero99-modal .look-pick { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--c99-line); border-radius: 12px; background: var(--c99-card); font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
            #copero99-modal .look-pick:hover { background: var(--c99-card-hover); }
            #copero99-modal .look-pick.active { border-color: var(--c99-text); box-shadow: inset 0 0 0 1px var(--c99-text); }
            #copero99-modal .look-swatch { flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.2); }
            #copero99-modal .look-font { flex: 0 0 auto; width: 26px; font-size: 18px; font-weight: 700; text-align: center; }

            /* Icon card (Hall of Fame): a FIFA-style card per career */
            #copero99-modal .icard-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
            #copero99-modal .icard {
                --club: #334155;
                position: relative;
                width: 270px;
                height: 420px;
                overflow: hidden;
                padding: 22px 22px 18px;
                clip-path: polygon(14% 0, 86% 0, 100% 7%, 100% 91%, 50% 100%, 0 91%, 0 7%);
                color: #2b1d02;
                font-family: inherit;
            }
            /* FIFA-style finishes: a metal gradient with a fine diagonal grain, darker at the bottom */
            #copero99-modal .icard { --grain: repeating-linear-gradient(118deg, rgb(255 255 255 / 0.07) 0 2px, transparent 2px 10px); box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25); }
            #copero99-modal .icard.bronze { background: var(--grain), linear-gradient(165deg, #f0c193 0%, #c8834a 30%, #9b5c2a 65%, #6e3c15 100%); color: #2c1405; }
            #copero99-modal .icard.silver { background: var(--grain), linear-gradient(165deg, #ffffff 0%, #dde2e8 30%, #aeb6c0 65%, #7d8692 100%); color: #1b2128; }
            #copero99-modal .icard.gold { background: var(--grain), linear-gradient(165deg, #fff6c4 0%, #f5d46c 28%, #ddb03a 62%, #a87a14 100%); color: #3a2902; }
            /* Hero: deep blue-violet with gold lettering */
            #copero99-modal .icard.hero { background: var(--grain), radial-gradient(circle at 30% 0%, #7b68e0 0%, #3a2a95 38%, #1b1260 70%, #0b0730 100%); color: #f6d887; }
            /* Icon: cream and gold */
            #copero99-modal .icard.icon { background: var(--grain), radial-gradient(circle at 30% 10%, #fffdf5 0%, #f6ecd2 35%, #e1c68f 70%, #b48a45 100%); color: #3b2a0a; box-shadow: inset 0 0 0 3px #d9b45f; }
            /* National Hero: the player's flag under a dark veil */
            #copero99-modal .icard.nation { background: linear-gradient(180deg, rgb(8 10 24 / 0.25) 0%, rgb(8 10 24 / 0.55) 45%, rgb(8 10 24 / 0.9) 100%), var(--flag, #1e293b) center / cover; color: #fff; text-shadow: 0 1px 3px rgb(0 0 0 / 0.6); box-shadow: inset 0 0 0 3px rgb(255 255 255 / 0.6); }
            #copero99-modal .icard.hero .icard-tier { background: #f6d887; color: #1b1260; }
            #copero99-modal .icard.icon .icard-tier { background: #3b2a0a; color: #f6e2a8; }
            #copero99-modal .icard.nation .icard-tier { background: #fff; color: #0b1220; text-shadow: none; }
            /* Light sweep */
            #copero99-modal .icard::after {
                content: '';
                position: absolute;
                inset: -40%;
                background: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.55) 50%, transparent 60%);
                transform: translateX(-60%);
                animation: c99-shine 3.2s ease-in-out 0.3s infinite;
                pointer-events: none;
            }
            @keyframes c99-shine { 0% { transform: translateX(-60%); } 45%, 100% { transform: translateX(60%); } }
            /* Club colour stripe at the bottom */
            #copero99-modal .icard::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 18%; pointer-events: none; background: linear-gradient(transparent, color-mix(in srgb, var(--club) 70%, transparent)); }
            #copero99-modal .icard-mark { position: absolute; right: -36px; top: 46px; width: 210px; height: 210px; object-fit: contain; opacity: 0.18; filter: saturate(0.6); }
            /* Copero's shirt where a FIFA card has the player: big, in the space right of the rating, its foot fading into the name */
            #copero99-modal .icard-kit { position: absolute; top: 40px; right: 6px; height: 176px; width: auto; filter: drop-shadow(0 10px 12px rgb(0 0 0 / 0.38)); pointer-events: none;
                -webkit-mask-image: linear-gradient(#000 74%, transparent 97%); mask-image: linear-gradient(#000 74%, transparent 97%); }
            #copero99-modal .icard-spot { position: absolute; top: 28px; right: -14px; width: 210px; height: 200px; border-radius: 50%; background: radial-gradient(closest-side, rgb(255 255 255 / 0.42), rgb(255 255 255 / 0.12) 55%, transparent); pointer-events: none; }
            #copero99-modal .icard.hero .icard-spot, #copero99-modal .icard.nation .icard-spot { background: radial-gradient(closest-side, rgb(255 255 255 / 0.22), rgb(255 255 255 / 0.06) 55%, transparent); }
            #copero99-modal .icard-side { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px; }
            #copero99-modal .icard-rating { font-size: 54px; font-weight: 900; line-height: 0.9; letter-spacing: -2px; }
            #copero99-modal .icard-pos { font-size: 18px; font-weight: 800; letter-spacing: 0.04em; }
            #copero99-modal .icard-side .icard-flag { width: 32px; height: 24px; object-fit: cover; border-radius: 6px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.35); }
            #copero99-modal .icard-side .icard-crest { width: 34px; height: 34px; object-fit: contain; }
            #copero99-modal .icard-tier { position: absolute; top: 26px; right: 26px; padding: 2px 8px; border-radius: 999px; background: rgb(0 0 0 / 0.75); color: #fde68a; font-size: 10px; font-weight: 900; letter-spacing: 0.14em; }
            #copero99-modal .icard-name { position: relative; margin-top: 16px; overflow: hidden; font-size: 26px; font-weight: 900; letter-spacing: 0.02em; line-height: 1.1; text-align: center; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
            #copero99-modal .icard-title { position: relative; margin-top: 2px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-align: center; text-transform: uppercase; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #copero99-modal .icard-stats {
                position: relative;
                display: grid;
                grid-template-columns: 1fr 1fr;
                column-gap: 18px;
                row-gap: 2px;
                margin: 10px 8px 0;
                padding-top: 8px;
                border-top: 1px solid currentColor;
                border-color: rgb(0 0 0 / 0.2);
            }
            #copero99-modal .icard.hero .icard-stats,
            #copero99-modal .icard.nation .icard-stats { border-color: rgb(255 255 255 / 0.3); }
            #copero99-modal .icard-stats div { cursor: default; }
            #copero99-modal .icard-stats span img { width: 20px; height: 16px; object-fit: contain; vertical-align: middle; }
            #copero99-modal .icard-stats span.icard-icon, #copero99-modal .icard-stats span:has(img) { font-size: 16px; line-height: 1; opacity: 1; }
            #copero99-modal .icard-stats span img.icard-flag-mini { width: 20px; height: 15px; object-fit: cover; border-radius: 4px; }
            #copero99-modal .icard-stats div { display: flex; align-items: baseline; gap: 6px; }
            #copero99-modal .icard-stats b { min-width: 34px; font-size: 18px; font-weight: 900; text-align: right; font-variant-numeric: tabular-nums; }
            #copero99-modal .icard-stats span { font-size: 12px; font-weight: 700; opacity: 0.75; }
            #copero99-modal .icard-traits { position: relative; display: flex; justify-content: center; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
            #copero99-modal .icard-traits span { padding: 1px 7px; border-radius: 999px; background: rgb(0 0 0 / 0.72); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; }
            #copero99-modal .icard-note { font-size: 12px; color: var(--c99-muted); text-align: center; }

            /* Smaller windows: Hall of Fame, history, inspector, save/load */
            #copero99-modal .box { padding: 20px; }
            #copero99-modal h4 { margin: 0 0 6px 0; font-size: 18px; font-weight: 600; }
            #copero99-modal .modal-body { min-height: 0; overflow-y: auto; font-size: 14px; line-height: 1.5; }
            #copero99-modal .muted { color: var(--c99-muted); font-size: 13px; }
            /* Hall of Fame: OVR badges in the game's tier colours (set per OVR by ovrBadge) */
            #copero99-menu .ovr, #copero99-modal .ovr {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                min-width: 34px;
                padding: 2px 6px;
                border: 1px solid var(--c99-line);
                border-radius: 7px;
                background: var(--c99-card);
                font-weight: 900;
                line-height: 1.1;
                font-variant-numeric: tabular-nums;
            }
            #copero99-menu .ovr.small, #copero99-modal .ovr.small { font-size: 13px; }
            #copero99-modal .ovr.big { width: 76px; height: 80px; border-radius: 16px; font-size: 36px; letter-spacing: -1px; }
            #copero99-modal .ovr small { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; opacity: 0.8; }
            #copero99-menu .hof-empty, #copero99-modal .hof-empty { padding: 20px; text-align: center; color: var(--c99-muted); }

            /* Hall of Fame tab: records and one row per career */
            #copero99-menu .hof-records { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
            #copero99-menu .hof-record {
                display: flex;
                flex-direction: column;
                min-width: 0;
                padding: 8px 10px;
                border: 1px solid var(--c99-line);
                border-radius: 12px;
                background: var(--c99-card);
            }
            #copero99-menu .hof-record small { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-menu .hof-record b { font-size: 20px; font-weight: 900; }
            #copero99-menu .hof-record span { overflow: hidden; font-size: 12px; color: var(--c99-muted); text-overflow: ellipsis; white-space: nowrap; }
            #copero99-menu .hof-row {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                margin-bottom: 6px;
                padding: 10px 12px;
                border: 1px solid var(--c99-line);
                border-radius: 12px;
                background: var(--c99-card);
                text-align: left;
                cursor: pointer;
            }
            #copero99-menu .hof-row:hover { background: var(--c99-card-hover); }
            /* Rows out of sight aren't laid out or painted (a long Hall of Fame stays light) */
            #copero99-menu .hof-row { content-visibility: auto; contain-intrinsic-size: auto 64px; }
            #copero99-menu .hof-row { position: relative; overflow: hidden; }
            #copero99-menu .hof-row > :not(.hof-flag) { position: relative; }
            /* The player's flag, fading in from the right */
            #copero99-menu .hof-flag {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 45%;
                background-position: center;
                background-size: cover;
                opacity: 0.35;
                -webkit-mask-image: linear-gradient(to left, #000 15%, transparent);
                mask-image: linear-gradient(to left, #000 15%, transparent);
                pointer-events: none;
            }
            #copero99-menu .hof-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
            #copero99-menu .hof-row-text small { font-size: 12px; color: var(--c99-muted); }
            /* Same height for every row: one line each, 4 crests; hover (or keyboard focus) shows everything */
            #copero99-menu .hof-row-text > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #copero99-menu .hof-crests { display: flex; flex: 0 0 108px; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
            #copero99-menu .hof-crests img { width: 22px; height: 22px; object-fit: contain; }
            #copero99-menu .hof-crests .hof-extra { display: none; }
            #copero99-menu .hof-more { min-width: 22px; height: 22px; padding: 0 4px; border-radius: 999px; background: var(--c99-bg); font-size: 11px; font-weight: 800; line-height: 22px; text-align: center; }
            #copero99-menu .hof-row:hover .hof-row-text > *, #copero99-menu .hof-row:focus-visible .hof-row-text > * { white-space: normal; }
            #copero99-menu .hof-row:hover .hof-extra, #copero99-menu .hof-row:focus-visible .hof-extra { display: block; }
            #copero99-menu .hof-row:hover .hof-more, #copero99-menu .hof-row:focus-visible .hof-more { display: none; }
            #copero99-modal .hof-confirm { display: flex; flex-direction: column; gap: 6px; }
            /* First line: flag, name · position, the best trophies' pictures */
            #copero99-menu .hof-row-text > .hof-row-top { display: flex; align-items: center; gap: 6px; }
            #copero99-menu .hof-row-top b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #copero99-menu .hof-mini-flag { flex: 0 0 auto; width: 18px; height: 13px; object-fit: cover; border-radius: 3px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25); }
            #copero99-menu .hof-trophies { display: flex; flex: 0 0 auto; flex-wrap: wrap; align-items: center; gap: 3px; }
            #copero99-menu .hof-trophies img { width: auto; max-width: 22px; height: 18px; object-fit: contain; }
            #copero99-menu .hof-trophies .hof-extra { display: none; }
            #copero99-menu .hof-row:hover .hof-row-top b, #copero99-menu .hof-row:focus-visible .hof-row-top b { white-space: normal; }
            #copero99-menu .hof-row:hover .hof-row-top, #copero99-menu .hof-row:focus-visible .hof-row-top { flex-wrap: wrap; }
            /* Locked Career tab and pick cards */
            #copero99-menu .row:has(input:disabled), #copero99-menu .pick-card:disabled { opacity: 0.5; cursor: not-allowed; }
            #copero99-menu .row:has(input:disabled) input { cursor: not-allowed; }
            #copero99-menu .pick-card:disabled:hover { transform: none; border-color: var(--c99-line); background: var(--c99-card); }
            /* A career that started without a mode: a calm card instead of greyed-out choices */
            #copero99-menu .late-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--c99-line); border-radius: 14px; background: linear-gradient(160deg, rgb(96 165 250 / 0.12), transparent 65%), var(--c99-card); }
            #copero99-menu .late-card b { font-size: 16px; font-weight: 800; }
            #copero99-menu .late-card span { font-size: 13px; }
            #copero99-menu .late-card small { margin-top: 4px; font-size: 12px; color: var(--c99-muted); }
            /* Vanilla: the club you play for, big and faded, in the empty space under the card */
            #copero99-menu .panel-crest { height: clamp(140px, 38vh, 340px); margin-top: 18px; background: no-repeat center / contain; opacity: 0.12; pointer-events: none; -webkit-mask-image: radial-gradient(closest-side, #000 60%, transparent); mask-image: radial-gradient(closest-side, #000 60%, transparent); }
            #copero99-menu .panel-crest[hidden] { display: none; }
            /* Boost and Sandbox: the crest behind the Career tab, fainter (z-index -1 puts it under the panel's content) */
            #copero99-menu.c99-crest-behind:has(.panel[data-panel="ovr"].active) .box::before { content: ''; position: absolute; right: -10%; bottom: -6%; z-index: -1; width: 78%; aspect-ratio: 1; background: var(--c99-crest) no-repeat center / contain; opacity: 0.06; pointer-events: none; }
            #copero99-menu .panel-crest { animation: c99-float 12s ease-in-out infinite; }
            #copero99-menu.c99-crest-behind:has(.panel[data-panel="ovr"].active) .box::before { animation: c99-float 14s ease-in-out -5s infinite; }
            #copero99-menu .panel-crest.c99-in { animation: c99-panel-crest-in 1.2s ease-out, c99-float 12s ease-in-out infinite; }
            @keyframes c99-panel-crest-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 0.12; transform: none; } }
            #copero99-menu details.fold.protect > summary > svg { color: #fb7185; }
            #copero99-menu details.fold.modifiers > summary > svg { color: #34d399; }
            /* Going back is the red tile in the card's pill row; below 1024px that row has no room, so this panel button does the same */
            #copero99-menu .rewind-btn { margin-top: 10px; }
            #copero99-menu .rewind-btn[hidden] { display: none; }
            #copero99-menu .rewind-btn:disabled { opacity: 0.5; cursor: wait; }
            @media (min-width: 1024px) { #copero99-menu .rewind-btn { display: none; } }
            #copero99-modal .rewind-pick { display: flex; flex-direction: column; gap: 10px; }
            /* The Retire card flipped over: how you want to go (flipRetireCard) */
            .c99-flip { position: absolute; z-index: 40; overflow: hidden; border: 1px solid var(--c99-line); background: var(--c99-bg); color: var(--c99-text); box-shadow: 0 10px 30px rgb(0 0 0 / 0.35); transform-origin: center; animation: c99-flip-in 0.4s cubic-bezier(0.2, 0.8, 0.3, 1); }
            @keyframes c99-flip-in { from { transform: perspective(900px) rotateY(-90deg); opacity: 0.3; } to { transform: perspective(900px) rotateY(0); opacity: 1; } }
            .c99-flip:focus { outline: none; }
            /* Tiles two by two, so four ways fit a 195 x 155 card at 1920 (one column scrolled) */
            .c99-flip-face { display: flex; flex-direction: column; gap: 4px; height: 100%; padding: 6px 7px 7px; scrollbar-width: thin; box-sizing: border-box; overflow-y: auto; }
            .c99-flip-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
            .c99-flip-title { grid-column: 2; font-family: poppins-semibold, var(--font-poppins, inherit); font-size: 13px; white-space: nowrap; }
            .c99-flip-back { grid-column: 1; justify-self: start; padding: 2px 6px; border: 0; border-radius: 999px; background: transparent; color: var(--c99-muted); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; }
            .c99-flip-back:hover, .c99-flip-back:focus-visible { color: var(--c99-text); background: var(--c99-card); outline: none; }
            .c99-flip-ways { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; flex: 1 1 auto; align-content: center; }
            .c99-flip-way { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 0; padding: 4px; border: 1px solid var(--c99-line); border-radius: 10px; background: var(--c99-card); color: inherit; font: inherit; font-size: 11.5px; font-weight: 700; line-height: 1.2; text-align: center; cursor: pointer; transition: background 0.15s, border-color 0.15s, transform 0.15s; }
            .c99-flip-way:last-child:nth-child(odd) { grid-column: 1 / -1; }
            .c99-flip-way:hover, .c99-flip-way:focus-visible { border-color: var(--c99-accent); background: var(--c99-card-hover); transform: translateY(-1px); outline: none; }
            .c99-flip-mark { font-size: 15px; line-height: 1.1; }
            .c99-flip-words { display: flex; flex-direction: column; align-items: center; min-width: 0; max-width: 100%; }
            .c99-flip-words b, .c99-flip-words small { max-width: 100%; }
            .c99-flip-words b { overflow: hidden; font-weight: inherit; text-overflow: ellipsis; white-space: nowrap; }
            .c99-flip-way { overflow: hidden; }
            .c99-flip.wide .c99-flip-words { flex: 1 1 auto; }
            .c99-flip.wide .c99-flip-ways.many .c99-flip-mark { display: none; }
            .c99-flip.wide .c99-flip-ways.many .c99-flip-way { padding: 4px; }
            .c99-flip-words small { max-width: 100%; overflow: hidden; color: var(--c99-muted); font-size: 10px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
            /* A Retire strip under four cards: the title on the left, the ways in a row */
            .c99-flip.wide .c99-flip-face { flex-direction: row; align-items: stretch; }
            .c99-flip.wide .c99-flip-head { display: flex; flex-direction: column-reverse; justify-content: center; gap: 4px; }
            .c99-flip.wide .c99-flip-back { justify-self: auto; align-self: center; }
            .c99-flip.wide .c99-flip-ways { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 1fr; flex: 1 1 auto; }
            .c99-flip.wide .c99-flip-way:last-child:nth-child(odd) { grid-column: auto; }
            .c99-flip.wide .c99-flip-way { flex-direction: row; gap: 6px; padding: 4px 6px; }
            .c99-flip.wide .c99-flip-words { align-items: flex-start; }
            @media (prefers-reduced-motion: reduce) { .c99-flip { animation: none; } .c99-flip-way { transition: none; } }
            #copero99-modal .rewind-pick select { padding: 8px 10px; border: 1px solid var(--c99-line); border-radius: 10px; background: var(--c99-card); color: var(--c99-text); font: inherit; font-size: 13px; }
            /* End-of-career screen: our button under View summary / Play again, in the game's outline style */
            .c99-summary-row { position: relative; z-index: 10; display: flex; justify-content: center; margin-top: 6px; }
            .c99-summary-row button { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; border: 1px solid hsl(var(--foreground)); border-radius: 999px; background: transparent; color: hsl(var(--foreground)); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: background-color 0.15s; }
            .c99-summary-row button:hover { background: hsl(var(--accent)); }
            #copero99-modal .btn.danger.solid { border-color: var(--c99-off); background: var(--c99-off); color: #fff; }
            #copero99-modal .btn.danger.solid:hover { opacity: 0.9; }

            /* Hall of Fame career card, laid out like the game's career screen */
            #copero99-modal .box.wide { width: min(96vw, 72rem); }
            #copero99-modal .hofc { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 20px; }
            /* One column: every row as tall as its content (the seasons box scrolls sideways, so as an auto row it shrank to nothing) */
            @media (max-width: 860px) { #copero99-modal .hofc { grid-template-columns: 1fr; grid-auto-rows: max-content; } }
            #copero99-modal .hofc-top { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 16px; background: var(--c99-card); }
            #copero99-modal .hofc-id { flex: 1; min-width: 0; }
            #copero99-modal .hofc-pills { display: flex; gap: 6px; }
            #copero99-modal .pill { padding: 1px 8px; border-radius: 6px; background: var(--c99-bg); font-size: 11px; font-weight: 800; }
            #copero99-modal .pill.red { background: #9f1239; color: #fff; }
            #copero99-modal .hofc-name { margin: 4px 0 2px; overflow-wrap: anywhere; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; }
            #copero99-modal .hofc-facts { display: flex; flex-direction: column; gap: 4px; text-align: right; }
            #copero99-modal .hofc-facts small,
            #copero99-modal .hofc-stats small,
            #copero99-modal .hofc-seasons th,
            #copero99-modal .hofc-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-modal .hofc-facts small { margin-right: 6px; }
            #copero99-modal .hofc-facts b { font-size: 18px; font-weight: 900; }
            #copero99-modal .hofc-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin: 12px 0 4px; text-align: center; }
            #copero99-modal .hofc-stats div { display: flex; flex-direction: column; }
            #copero99-modal .hofc-stats b { font-size: 18px; font-weight: 900; }
            #copero99-modal .hofc-label { margin: 16px 0 8px; text-align: center; }
            #copero99-modal .hofc-cabinet { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 6px; }
            #copero99-modal .hofc-trophy {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 8px 4px;
                border-radius: 12px;
                background: var(--c99-card);
                text-align: center;
            }
            #copero99-modal .hofc-trophy img { height: 46px; max-width: 100%; object-fit: contain; }
            #copero99-modal .hofc-trophy b { font-size: 14px; font-weight: 900; }
            #copero99-modal .hofc-trophy small { font-size: 11px; line-height: 1.2; color: var(--c99-muted); }
            /* Every trait as a chip (hovering one says what it means), listed by rarity: a row per rarity with its name in its colour */
            #copero99-modal .hofc-traits { display: flex; flex-direction: column; gap: 6px; }
            #copero99-modal .hofc-rarity { display: grid; grid-template-columns: 78px minmax(0, 1fr); align-items: center; gap: 8px; padding: 6px 10px; border-radius: 12px; background: var(--c99-card); }
            #copero99-modal .hofc-rarity > small { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c99-muted); }
            #copero99-modal .hofc-rarity.legendary { background: linear-gradient(90deg, rgb(245 158 11 / 0.18), transparent 75%), var(--c99-card); box-shadow: inset 0 0 0 1px rgb(245 158 11 / 0.4); }
            #copero99-modal .hofc-rarity.epic { background: linear-gradient(90deg, rgb(168 85 247 / 0.16), transparent 75%), var(--c99-card); }
            #copero99-modal .hofc-rarity.legendary > small { color: #f59e0b; }
            #copero99-modal .hofc-rarity.epic > small { color: #c084fc; }
            #copero99-modal .hofc-rarity.rare > small { color: #60a5fa; }
            #copero99-modal .hofc-rarity-chips { display: flex; flex-wrap: wrap; gap: 6px; }
            #copero99-modal .hofc-trait { display: inline-flex; }
            #copero99-modal .hofc-trait b { padding: 3px 9px; border-radius: 999px; background: rgb(0 0 0 / 0.72); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; }
            /* The rarer, the more it stands out (on the card and in the list): rare blue, epic purple with a glow, legendary gold with a light sweep */
            #copero99-modal .icard-traits span.rare, #copero99-modal .hofc-trait.rare b { background: linear-gradient(135deg, #1d4ed8, #3b82f6); box-shadow: inset 0 0 0 1px rgb(191 219 254 / 0.5); color: #fff; }
            #copero99-modal .icard-traits span.epic, #copero99-modal .hofc-trait.epic b { background: linear-gradient(135deg, #6d28d9, #c026d3); box-shadow: inset 0 0 0 1px rgb(240 171 252 / 0.6), 0 0 8px rgb(192 38 211 / 0.5); color: #fff; }
            #copero99-modal .icard-traits span.legendary, #copero99-modal .hofc-trait.legendary b { position: relative; overflow: hidden; background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #d97706); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.6), 0 0 10px rgb(245 158 11 / 0.65); color: #451a03; text-shadow: none; }
            #copero99-modal .icard-traits span.legendary::after, #copero99-modal .hofc-trait.legendary b::after { content: ''; position: absolute; inset: -50%; background: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.85) 50%, transparent 60%); transform: translateX(-60%); animation: c99-shine 2.6s ease-in-out infinite; }
            #copero99-modal .hofc-club { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; padding: 8px 10px; border-radius: 12px; background: var(--c99-card); }
            #copero99-modal .hofc-club img { width: 30px; height: 30px; object-fit: contain; }
            #copero99-modal .hofc-club-text { display: flex; flex-direction: column; min-width: 0; }
            #copero99-modal .hofc-club-text small { font-size: 12px; color: var(--c99-muted); }
            /* Clubs as cards, like Copero's end-of-career summary: the club's colour, its crest big and faded behind, games and trophies */
            #copero99-modal .hofc-clubs { display: flex; flex-direction: column; gap: 6px; }
            /* One row per club in its colours (like Copero's summary): crest, name, ages, trophies; games, goals and assists on the right */
            #copero99-modal .hofc-clubcard { --club: #334155; position: relative; display: flex; align-items: center; gap: 12px; overflow: hidden; padding: 10px 12px; border: 1px solid rgb(255 255 255 / 0.08); border-radius: 12px; background: linear-gradient(90deg, color-mix(in srgb, var(--club) 42%, #0b0b0f) 0%, color-mix(in srgb, var(--club) 14%, #0b0b0f) 100%); color: #fff; }
            #copero99-modal .hofc-clubcard > :not(.hofc-clubcard-mark) { position: relative; }
            #copero99-modal .hofc-clubcard-mark { position: absolute; top: 50%; left: 34%; width: auto; height: 260%; aspect-ratio: 1; object-fit: contain; opacity: 0.09; transform: translateY(-50%); pointer-events: none; }
            #copero99-modal .hofc-clubcard-crest { flex: 0 0 auto; width: 40px; height: 40px; object-fit: contain; filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.45)); }
            #copero99-modal .hofc-clubcard-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
            #copero99-modal .hofc-clubcard-text > b { overflow: hidden; font-size: 14px; font-weight: 800; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
            #copero99-modal .hofc-clubcard-text > small { font-size: 12px; color: rgb(255 255 255 / 0.65); }
            #copero99-modal .hofc-clubcard-stats { flex: 0 0 auto; display: grid; grid-template-columns: repeat(3, 44px); padding: 5px 0; border-radius: 8px; background: rgb(0 0 0 / 0.35); text-align: center; }
            #copero99-modal .hofc-clubcard-stats span { display: flex; flex-direction: column; }
            #copero99-modal .hofc-clubcard-stats span + span { border-left: 1px solid rgb(255 255 255 / 0.12); }
            #copero99-modal .hofc-clubcard-stats small { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: rgb(255 255 255 / 0.6); }
            #copero99-modal .hofc-clubcard-stats b { font-size: 14px; font-weight: 900; font-variant-numeric: tabular-nums; }
            #copero99-modal .hofc-clubcard-wins { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
            #copero99-modal .hofc-clubcard-wins > span { position: relative; display: inline-flex; }
            #copero99-modal .hofc-clubcard-wins img { height: 28px; max-width: 34px; object-fit: contain; filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.5)); }
            #copero99-modal .hofc-clubcard-wins .win-name { font-size: 11px; color: rgb(255 255 255 / 0.8); }
            #copero99-modal .hofc-clubcard-wins em { position: absolute; right: -9px; bottom: -2px; padding: 0 4px; border-radius: 999px; background: rgb(0 0 0 / 0.75); font-size: 10px; font-style: normal; font-weight: 800; }
            #copero99-modal .hofc-seasons { min-width: 0; overflow-x: auto; }
            #copero99-modal .modal-body { overscroll-behavior: contain; }
            /* Wide window: the card side and the seasons scroll on their own, so the seasons can be scrolled with the card in view */
            @media (min-width: 861px) {
                #copero99-modal .modal-body.hofc { overflow: hidden; grid-template-rows: minmax(0, 1fr); }
                #copero99-modal .hofc-side, #copero99-modal .hofc-seasons { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
                #copero99-modal .hofc-seasons th { position: sticky; top: 0; z-index: 1; background: var(--c99-bg); }
            }
            #copero99-modal .hofc-side:focus, #copero99-modal .hofc-seasons:focus { outline: none; }
            #copero99-modal .hofc-seasons table { width: 100%; border-collapse: separate; border-spacing: 0 4px; font-size: 13px; }
            #copero99-modal .hofc-seasons th { padding: 0 6px; text-align: left; }
            #copero99-modal .hofc-seasons td { padding: 5px 6px; background: var(--c99-card); vertical-align: middle; }
            #copero99-modal .hofc-seasons td:first-child { border-radius: 8px 0 0 8px; }
            #copero99-modal .hofc-seasons td:last-child { border-radius: 0 8px 8px 0; }
            #copero99-modal .hofc-seasons td.num { font-weight: 700; font-variant-numeric: tabular-nums; }
            #copero99-modal .age-box {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 7px;
                background: var(--c99-card-hover);
                color: #fff;
                font-weight: 800;
            }
            #copero99-modal .club-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; white-space: nowrap; }
            #copero99-modal .club-cell img { width: 20px; height: 20px; object-fit: contain; }
            #copero99-modal .wins { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
            #copero99-modal .wins img { height: 24px; max-width: 32px; object-fit: contain; }
            #copero99-modal .win-name { padding: 1px 6px; border-radius: 6px; background: var(--c99-bg); font-size: 11px; white-space: nowrap; }
            #copero99-modal .modal-note { margin-bottom: 12px; font-size: 13px; color: var(--c99-muted); }
            #copero99-modal textarea {
                width: 100%;
                height: 50vh;
                padding: 12px;
                background: var(--c99-card);
                color: var(--c99-text);
                border: 1px solid var(--c99-line);
                border-radius: 10px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 12px;
                resize: vertical;
            }

            /* Quiet motion like the site's own: the panel and pop-ups ease in, tabs fade, buttons change colour smoothly */
            #copero99-menu.open { animation: c99-panel-in 0.2s ease-out; }
            /* A new career: the panel opens by itself with a bigger entrance, the logo pops and a light sweeps across */
            #copero99-menu.open.c99-intro { animation: c99-intro 0.7s cubic-bezier(0.2, 0.9, 0.25, 1.15); }
            @keyframes c99-intro { 0% { opacity: 0; transform: translateX(40px) scale(0.94); filter: blur(6px); } 55% { opacity: 1; filter: blur(0); } 100% { transform: none; } }
            #copero99-menu.c99-intro .logo-tile { animation: c99-intro-gem 0.9s ease-out 0.25s backwards; }
            @keyframes c99-intro-gem { 0% { transform: scale(0.6) rotate(-20deg); } 60% { transform: scale(1.25) rotate(8deg); box-shadow: 0 0 26px rgb(96 165 250 / 0.95); } 100% { transform: none; } }
            #copero99-menu.c99-intro .box { overflow: hidden; }
            #copero99-menu.c99-intro .box::after { content: ''; position: absolute; inset: 0; z-index: 6; pointer-events: none; background: linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.14) 50%, transparent 65%); transform: translateX(-100%); animation: c99-intro-sweep 1s ease-out 0.3s forwards; }
            @keyframes c99-intro-sweep { to { transform: translateX(100%); } }
            @keyframes c99-panel-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
            #copero99-menu .panel.active { animation: c99-fade 0.18s ease-out; }
            @keyframes c99-fade { from { opacity: 0; } to { opacity: 1; } }
            #copero99-modal { animation: c99-fade 0.15s ease-out; }
            #copero99-modal .box { animation: c99-pop 0.18s ease-out; }
            #copero99-menu button, #copero99-menu .row, #copero99-modal button, .c99-minis button { transition: background-color 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s; }
            #copero99-menu .body, #copero99-modal .modal-body, #copero99-modal .hofc-side, #copero99-modal .hofc-seasons { scrollbar-width: thin; scrollbar-color: var(--c99-line) transparent; }
            #copero99-menu button:focus-visible, #copero99-modal button:focus-visible { outline: 2px solid var(--c99-text); outline-offset: 2px; }
            @media (prefers-reduced-motion: reduce) {
                #copero99-menu, #copero99-menu *, #copero99-menu *::after, #copero99-modal, #copero99-modal *, #copero99-modal *::after { animation: none !important; transition: none !important; }
            }
        `;
        document.head.appendChild(style);

        const presetChips = STYLE_PRESETS
            .map(key => `<button type="button" class="chip" data-preset="${key}">${PRESETS[key].name}</button>`)
            .join('');

        const styleChips = Object.keys(BOOST_STYLES)
            .map(key => `<button type="button" class="chip" data-style="${key}" title="${BOOST_STYLES[key].blurb}">${BOOST_STYLES[key].icon} ${BOOST_STYLES[key].name}</button>`)
            .join('');
        const tierChips = Object.keys(BOOST_TIERS)
            .map(key => `<button type="button" class="chip tier-chip ${BOOST_TIERS[key].colour}" data-tier="${key}" title="${BOOST_TIERS[key].blurb}"><span class="tier-text ${BOOST_TIERS[key].colour}">${BOOST_TIERS[key].name}</span></button>`)
            .join('');
        const perkChips = Object.keys(PERKS)
            .map(key => `<button type="button" class="chip" data-perk="${key}" title="${PERKS[key].help}">${PERKS[key].icon} ${PERKS[key].name}</button>`)
            .join('');
        const sandboxPerkChips = SANDBOX_PERKS
            .map(key => `<button type="button" class="chip" data-sperk="${key}" title="${PERKS[key].help}">${PERKS[key].icon} ${PERKS[key].name}</button>`)
            .join('');
        const sandboxRoleChips = '<button type="button" class="chip" data-srole="" title="Copero’s own role for your OVR at every club">None</button>' + Object.keys(ROLE_TRAITS)
            .map(key => `<button type="button" class="chip" data-srole="${key}" title="${ROLE_TRAITS[key].help}">${ROLE_TRAITS[key].icon} ${ROLE_TRAITS[key].name}</button>`)
            .join('');
        const roleChips = '<button type="button" class="chip" data-role="" title="Copero’s own role for your OVR at every club">None</button>' + Object.keys(ROLE_TRAITS)
            .map(key => `<button type="button" class="chip" data-role="${key}" title="${ROLE_TRAITS[key].help}">${ROLE_TRAITS[key].icon} ${ROLE_TRAITS[key].name}</button>`)
            .join('');

        const menu = document.createElement('div');
        menu.id = 'copero99-menu';
        menu.innerHTML = `
            <div class="box" role="complementary" aria-label="Copero99">
            <div class="head">
                <span class="logo-tile">${icon('trophy')}</span>
                <div class="head-text">
                    <h2 class="title poppins-semibold">Copero99</h2>
                    <div class="status-line"><span id="copero99-status">Waiting for a career…</span><span id="copero99-status-sub"></span></div>
                </div>
                <button class="icon-btn" id="copero99-gear" type="button" title="Settings" aria-label="Settings">${icon('settings')}</button>
                <button class="close-tile" id="copero99-hide" type="button" title="Close (Alt+Shift+C)" aria-label="Close">${icon('close')}</button>
                <div class="settings-pop" id="copero99-settings" hidden>
                    <div class="pop-title">Settings</div>
                    <button class="pop-item" id="copero99-look" type="button"><span class="pop-icon" style="--tile: #f472b6">${icon('palette')}</span><span class="pop-text"><b>Theme &amp; font</b><small>Colours and font for the whole page</small></span>${icon('chevron')}</button>
                    <button class="pop-item" id="copero99-history" type="button"><span class="pop-icon" style="--tile: #38bdf8">${icon('history')}</span><span class="pop-text"><b>Season history</b><small>Your OVR at every age</small></span>${icon('chevron')}</button>
                    <label class="pop-item"><span class="pop-icon" style="--tile: #facc15">${icon('bell')}</span><span class="pop-text"><b>Pop-up messages</b><small>Short notes in the bottom corner</small></span>${switchHtml('notifications')}</label>
                    <div class="pop-sep"></div>
                    <button class="pop-item" id="copero99-export" type="button"><span class="pop-icon" style="--tile: #34d399">${icon('save')}</span><span class="pop-text"><b>Save settings</b><small>Copy them as text, to back them up</small></span>${icon('chevron')}</button>
                    <button class="pop-item" id="copero99-import" type="button"><span class="pop-icon" style="--tile: #60a5fa">${icon('folder')}</span><span class="pop-text"><b>Load settings</b><small>Paste settings you saved</small></span>${icon('chevron')}</button>
                    <button class="pop-item" id="copero99-reset" type="button"><span class="pop-icon" style="--tile: #f87171">${icon('reset')}</span><span class="pop-text"><b>Reset settings</b><small>Back to the defaults</small></span>${icon('chevron')}</button>
                    <button class="pop-item" id="copero99-inspect" type="button"><span class="pop-icon" style="--tile: #a78bfa">${icon('search')}</span><span class="pop-text"><b>Inspect data</b><small>Raw career data, for troubleshooting</small></span>${icon('chevron')}</button>
                </div>
            </div>

            <div class="tabs">
                <button type="button" data-tab="ovr">${icon('gauge')}Career</button>
                <button type="button" data-tab="hof">${icon('trophy')}Hall of Fame</button>
            </div>

            <div class="body">
                <section class="panel" data-panel="ovr">
                    <div id="copero99-pick">
                        <div id="copero99-pick-choose">
                            <div class="label">Choose how this career plays</div>
                            <div class="pick-cards">
                                <button type="button" class="pick-card boost" data-pick="boost">${icon('rocket')}<b>Boost</b><span>Rolled talent: a level, a career style and perks. Copero plays it out. Counts for the Hall of Fame.</span></button>
                                <button type="button" class="pick-card sandbox" data-pick="sandbox">${icon('gamepad')}<b>Sandbox</b><span>Set your own OVR, club offers, protection and more. It’s just for fun, so it can’t go into the Hall of Fame.</span></button>
                                <button type="button" class="pick-card vanilla" data-pick="vanilla">${icon('leaf')}<b>Vanilla</b><span>Copero as it is, except that you can turn down a loan. Counts for the Hall of Fame.</span></button>
                            </div>
                            <div class="hint lock-note">${icon('lock')}Your choice holds for the whole career. No choice by the first season means Vanilla. Copero achievements only count in Vanilla careers.</div>
                        </div>
                        <div class="late-card" id="copero99-pick-late">
                            <b>Vanilla career</b>
                            <span>Copero decides everything in this career, and it can go into the Hall of Fame.</span>
                            <small>Want Boost or Sandbox? Choose one before your next career’s first season.</small>
                        </div>
                    </div>

                    <div id="copero99-mode-area">
                    <div class="mode-badge" id="copero99-mode-badge"></div>
                    <div class="hint" id="copero99-mode-hint"></div>

                    <div id="copero99-boost-box">
                        <div class="boost-card">
                            <div class="boost-card-top">
                                <div>
                                    <small id="copero99-boost-tag"></small>
                                    <b class="boost-name" id="copero99-boost-name"></b>
                                    <div class="boost-rarity" id="copero99-boost-rarity"></div>
                                </div>
                                <button class="reroll" id="copero99-reroll-boost" type="button"></button>
                            </div>
                            <div class="boost-desc" id="copero99-boost-desc"></div>
                            <div class="boost-tiles c99-group" id="copero99-boost-tiles"></div>
                            <div class="boost-meters c99-group" id="copero99-boost-meters"></div>
                            <div class="boost-style" id="copero99-boost-style"></div>
                            <div class="boost-chips c99-group" id="copero99-boost-chips"></div>
                            <div class="boost-last" id="copero99-boost-note"></div>
                        </div>
                        <div class="hint boost-warn" id="copero99-reroll-warn"></div>
                        <label class="row compact">
                            <div class="row-text">
                                <div class="row-title">New boost every career</div>
                                <div class="muted">Turn off to keep this boost for your next careers.</div>
                            </div>
                            ${switchHtml('boostRandom')}
                        </label>
                        <details class="fold" id="copero99-boost-adjust">
                            <summary>Adjust this boost</summary>
                            <div class="fold-body">
                                <div class="hint lock-note" id="copero99-adjust-lock" style="margin-top: 0;">${icon('lock')}Set for this career once its first season is played.</div>
                                <div class="hint" style="margin-top: 0;">Opening this shows your boost’s hidden numbers, so the career can’t go into the Hall of Fame.</div>
                                <div class="label" style="margin-top: 8px;">Level</div>
                                <div class="chips c99-group">${tierChips}</div>
                                <div class="label">Career style</div>
                                <div class="chips c99-group" id="copero99-style-chips">${styleChips}</div>
                                <div class="label">Perks</div>
                                <div class="chips c99-group">${perkChips}</div>
                                <div class="label">Role trait</div>
                                <div class="chips c99-group">${roleChips}</div>
                                <div class="label">Numbers</div>
                                <div class="grid-2">${BOOST_SLIDERS.map(sliderRow).join('')}</div>
                            </div>
                        </details>
                    </div>

                    <div id="copero99-sandbox-box">
                        <div class="label">Your OVR</div>
                        <div class="seg">
                            <button type="button" data-mode="age">Planned curve</button>
                            <button type="button" data-mode="max">Always 99</button>
                        </div>

                        <div id="copero99-age-box">
                            <div class="label">Career style</div>
                            <div class="chips">${presetChips}</div>
                            <div class="hint" id="copero99-preset-desc"></div>

                            <div id="copero99-chart-spot">
                                <div class="chart" id="copero99-chart">
                                    <div id="copero99-preview"></div>
                                    <div class="now" id="copero99-now"></div>
                                </div>
                            </div>
                            <div class="hint" id="copero99-summary"></div>

                            <div id="copero99-sliders">
                                <div class="label">Fine-tune</div>
                                <div class="grid-2">${SLIDERS.map(sliderRow).join('')}</div>
                            </div>
                            <div class="hint" id="copero99-curve-note">You're using your own numbers, so the sliders are hidden.</div>

                            <details class="fold" id="copero99-curve-box">
                                <summary>Set the OVR for each age</summary>
                                <div class="fold-body">
                                    <label class="row">
                                        <div class="row-text">
                                            <div class="row-title">Use my own numbers</div>
                                            <div class="muted">Type an OVR for every age, from 16 to 40.</div>
                                        </div>
                                        ${switchHtml('useCustomCurve')}
                                    </label>
                                    <div class="curve-grid" id="copero99-curve-grid"></div>
                                    <button class="btn wide" id="copero99-curve-fill" type="button">Copy from the sliders</button>
                                </div>
                            </details>
                        </div>

                        <details class="fold freeze protect" id="copero99-protect-box">
                            <summary>${icon('shirt')}<span class="summary-text">Protection<small>Skip injuries and bans, never miss a World Cup, and win every gamble.</small></span></summary>
                            <div class="fold-body">
                                <label class="row">
                                    <div class="row-text">
                                        <div class="row-title">Block injuries</div>
                                        <div class="muted">Injuries cost no OVR and no time on the bench.</div>
                                        <div class="muted" id="copero99-count-inj"></div>
                                    </div>
                                    ${switchHtml('preventInjuries')}
                                </label>
                                <label class="row" title="Not yet seen on a real ban">
                                    <div class="row-text">
                                        <div class="row-title">Block suspensions</div>
                                        <div class="muted">Bans are lifted, so you never sit out.</div>
                                        <div class="muted" id="copero99-count-sus"></div>
                                    </div>
                                    ${switchHtml('preventSuspensions')}
                                </label>
                                <label class="row">
                                    <div class="row-text">
                                        <div class="row-title">Always qualify</div>
                                        <div class="muted">Your country never misses a World Cup. You still need the OVR for a call-up.</div>
                                    </div>
                                    ${switchHtml('forceQualify')}
                                </label>
                                <label class="row">
                                    <div class="row-text">
                                        <div class="row-title">Lucky events</div>
                                        <div class="muted">Every risky choice in Copero’s events turns out well: the extra training pays off, the penalty goes in.</div>
                                    </div>
                                    ${switchHtml('luckyEvents')}
                                </label>
                            </div>
                        </details>

                        <details class="fold freeze offers" id="copero99-offers-box">
                            <summary>${icon('building')}<span class="summary-text">Club offers<small>More clubs, and bigger (or smaller) ones, academy included.</small></span></summary>
                            <div class="fold-body">
                                <label class="row">
                                    <div class="row-text">
                                        <div class="row-title">4 club offers</div>
                                        <div class="muted">One more club in every transfer window, and in the academy.</div>
                                    </div>
                                    ${switchHtml('extraOffer')}
                                </label>
                                ${OFFER_SLIDERS.map(sliderRow).join('')}
                                <label class="row">
                                    <div class="row-text">
                                        <div class="row-title">Realistic retirement</div>
                                        <div class="muted">Retire the way Boost players do. From your 30s a Retire card lets you go with a farewell, a last dance or a homecoming. Once you’re past your body’s age, playing on costs OVR, games and offers, and the career only ends by itself after a big fall from your best.</div>
                                    </div>
                                    ${switchHtml('realRetire')}
                                </label>
                                <div class="hint">Changes show on the cards right away. Ready to stop? Press the silver <b>Retire</b> button beside your shirt number.</div>
                            </div>
                        </details>

                        <details class="fold freeze modifiers" id="copero99-mods-box">
                            <summary>${icon('rocket')}<span class="summary-text">Boost modifiers<small>Perks and traits from Boost, picked by hand.</small></span></summary>
                            <div class="fold-body">
                                <div class="label" style="margin-top: 0;">Perks</div>
                                <div class="chips c99-group">${sandboxPerkChips}</div>
                                <div class="label">Role trait</div>
                                <div class="chips c99-group">${sandboxRoleChips}</div>
                                <div class="label">Playing traits</div>
                                <div class="grid-2">${SANDBOX_SLIDERS.map(sliderRow).join('')}</div>
                                <div class="hint">Talisman also comes by itself to an 88+ player with two good traits or perks, in Boost too.</div>
                            </div>
                        </details>

                        <details class="fold freeze" id="copero99-locks-box">
                            <summary>${icon('swap')}<span class="summary-text">Switch values<small>Change your market value, shirt number, name and more.</small></span></summary>
                            <div class="fold-body">
                                <ol class="tips">
                                    <li>Tap a quick pick, or search for any value.</li>
                                    <li>Pick the new value and press <b>Switch</b>.</li>
                                </ol>
                                <div id="copero99-locks-list"></div>
                                <div class="chips" id="copero99-lock-quick"></div>
                                <input type="text" class="field" id="copero99-lock-search" placeholder="Search any value, e.g. goals or value" spellcheck="false" autocomplete="off">
                                <div class="lock-results" id="copero99-lock-results"></div>
                                <div class="lock-editor" id="copero99-lock-editor"></div>
                                <div class="hint">Your OVR is set above, so it isn't listed. A switch holds until you remove it with ✕.</div>
                            </div>
                        </details>
                    </div>
                    </div>

                    <button class="btn wide rewind-btn c99-rewind" id="copero99-rewind" type="button" hidden></button>
                    <div class="panel-crest" id="copero99-panel-crest" aria-hidden="true"></div>
                </section>

                <section class="panel" data-panel="hof">
                    <div class="hint" style="margin-top: 0;">Your finished careers. When you retire, a <b>Vanilla career</b> or a <b>Copero99 career</b> (Boost as rolled, one free reroll allowed) can be saved here; Sandbox careers can't. Tap a career to open it.</div>
                    <div class="hof-check" id="copero99-hof-check"></div>
                    <button class="btn primary wide" id="copero99-hof-save" type="button" hidden>Save this career to the Hall of Fame</button>
                    <div id="copero99-hof-list"></div>
                    <button class="btn danger wide" id="copero99-hof-clear" type="button">Clear Hall of Fame</button>
                </section>
                <div id="copero99-chart-dock"></div>
            </div>

            <div class="foot"><span>v${VERSION} · by Chirp</span><span>Alt+Shift+C shows or hides</span></div>
            </div>
        `;

        // Custom curve inputs (one per age)
        let cells = '';
        for (let i = 0; i < CURVE_AGES; i++) {
            cells += `<label class="curve-cell"><span>${CURVE_MIN_AGE + i}</span><input type="number" class="field" data-curve="${i}" min="${CURVE_MIN_OVR}" max="${CURVE_MAX_OVR}"></label>`;
        }
        menu.querySelector('#copero99-curve-grid').innerHTML = cells;

        document.body.appendChild(menu);
        menuElement = menu;

        // Wide screens: the Planned curve chart moves into this box under the panel (dockChart, placed by placePanel)
        const below = el('div', 'c99-chart-below c99-own');
        below.id = 'copero99-chart-below';
        below.hidden = true;
        below.appendChild(el('div', 'label', 'Planned curve'));
        document.body.appendChild(below);

        const fab = document.createElement('button');
        fab.id = 'copero99-fab';
        fab.type = 'button';
        fab.className = 'c99-launch';
        fab.innerHTML = gemIcon();
        fab.title = 'Copero99 (Alt+Shift+C)';
        fab.setAttribute('aria-label', 'Copero99');
        fab.hidden = true;
        fab.addEventListener('click', toggleMenu);
        document.body.appendChild(fab);
        fabElement = fab;

        // Gear: a small settings menu that closes when you click anywhere else (or press Esc, or close the panel)
        const gear = menu.querySelector('#copero99-gear');
        const settings = menu.querySelector('#copero99-settings');
        const showSettings = (show) => {
            settings.hidden = !show;
            gear.classList.toggle('active', show);
        };
        menu.querySelector('#copero99-hide').addEventListener('click', () => {
            showSettings(false);
            setMenuVisible(false);
        });
        gear.addEventListener('click', () => showSettings(settings.hidden));
        document.addEventListener('mousedown', (e) => {
            if (!settings.hidden && !settings.contains(e.target) && !gear.contains(e.target)) showSettings(false);
        });
        window.addEventListener('resize', placePanel);
        window.addEventListener('resize', placeFlip);
        menu.querySelector('.body').addEventListener('scroll', dockChart, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalElement) {
                closeModal();
                return;
            }
            if (e.key === 'Escape' && flip) {
                closeFlip();
                return;
            }
            if (e.key === 'Escape' && !settings.hidden) {
                showSettings(false);
                return;
            }
            if (e.altKey && e.shiftKey && e.code === 'KeyC') {
                e.preventDefault();
                toggleMenu();
            }
        });

        menu.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                ui.tab = btn.dataset.tab;
                saveUi();
                updateMenuUI();
            });
        });

        // The two big cards: pick Boost or Sandbox for this career
        menu.querySelectorAll('[data-pick]').forEach(btn => {
            btn.addEventListener('click', () => pickMode(btn.dataset.pick));
        });

        // Boost and Sandbox are locked in by the pick; inside Sandbox, Planned curve and Always 99 can swap
        menu.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (stats.picked !== 'sandbox' || (mode !== 'age' && mode !== 'max')) return;
                config.boostedOVR = false;
                config.forceOVR99 = mode === 'max';
                config.ageBasedOVR = mode === 'age';
                saveConfig();
                // Show the new cheat's OVR on the page now, not half a second later
                mainLoop();
                updateMenuUI();
            });
        });

        menu.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = e.target.checked;
                // Settings that aren't part of a career style keep the preset as is
                if (META_KEYS.indexOf(key) === -1) config.preset = 'custom';
                saveConfig();
                updateMenuUI();
            });
        });

        // Sliders update while being dragged and save when let go
        menu.querySelectorAll('input[type="range"][data-key]').forEach(input => {
            input.addEventListener('input', (e) => {
                if (e.target.dataset.key === 'offerQuality') offerRoll++;
                setNumberOption(e.target.dataset.key, parseInt(e.target.value, 10));
            });
            input.addEventListener('change', () => {
                saveConfig();
                updateMenuUI();
            });
        });

        menu.querySelectorAll('input[data-curve]').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.curve, 10);
                let value = parseInt(e.target.value, 10);
                if (!Number.isFinite(value)) value = config.customCurve[index];
                config.customCurve[index] = clamp(value, CURVE_MIN_OVR, CURVE_MAX_OVR);
                config.preset = 'custom';
                saveConfig();
                updateMenuUI();
            });
        });

        menu.querySelector('#copero99-curve-fill').addEventListener('click', () => {
            config.customCurve = buildCurve(config);
            saveConfig();
            updateMenuUI();
            toast('Copied the sliders into your table', true);
        });

        // Reroll the boost, only before the first season (once for free; as often as you like after opening Adjust this
        // boost); the pass right after moves the starting OVR and the academy clubs with it. The card shows the new roll
        menu.querySelector('#copero99-reroll-boost').addEventListener('click', () => {
            if (careerStarted() || !rerollsLeft()) return;
            const state = liveState || currentState;
            rollBoost(state && state.player && state.player.nationality);
            if (stats.picked === 'boost') {
                stats.rerolled = true;
                saveStats();
            }
            mainLoop();
            updateMenuUI();
        });

        // Adjust this boost, only before the first season: level (its middle numbers), career style, perks
        const adjust = (change) => {
            if (careerStarted()) return;
            change();
            saveConfig();
            mainLoop();
            updateMenuUI();
        };
        menu.querySelectorAll('[data-tier]').forEach(btn => {
            btn.addEventListener('click', () => adjust(() => {
                const tier = BOOST_TIERS[btn.dataset.tier];
                const middle = ([min, max], step) => min + step * Math.round((max - min) / step / 2);
                config.boostTier = btn.dataset.tier;
                config.boostStart = middle(tier.start, 1) - GAME_START_OVR;
                config.boostCap = middle(tier.cap, 1);
                config.boostGrowth = middle(tier.growth, 5);
                config.boostAbove = middle(tier.above, 5);
                config.boostPeak = clamp(Math.max(tier.peakAge[1] + (currentStyle().peakShift || 0), soonestPeak()), LIMITS.boostPeak[0], LIMITS.boostPeak[1]);
            }));
        });
        menu.querySelectorAll('[data-style]').forEach(btn => {
            btn.addEventListener('click', () => adjust(() => {
                // The peak age moves with the style (a Late Bloomer peaks later)
                const shift = (BOOST_STYLES[btn.dataset.style].peakShift || 0) - (currentStyle().peakShift || 0);
                config.boostPeak = clamp(config.boostPeak + shift, LIMITS.boostPeak[0], LIMITS.boostPeak[1]);
                config.boostStyle = btn.dataset.style;
            }));
        });
        menu.querySelectorAll('[data-role]').forEach(btn => {
            btn.addEventListener('click', () => adjust(() => {
                config.boostRole = btn.dataset.role;
            }));
        });
        // Sandbox modifiers: any time (a Sandbox career never goes into the Hall of Fame)
        const modify = (change) => {
            change();
            saveConfig();
            mainLoop();
            updateMenuUI();
        };
        menu.querySelectorAll('[data-sperk]').forEach(btn => {
            btn.addEventListener('click', () => modify(() => {
                const key = btn.dataset.sperk;
                const on = config.sandboxPerks.indexOf(key) >= 0;
                config.sandboxPerks = SANDBOX_PERKS.filter(p => (p === key ? !on : config.sandboxPerks.indexOf(p) >= 0));
            }));
        });
        menu.querySelectorAll('[data-srole]').forEach(btn => {
            btn.addEventListener('click', () => modify(() => {
                config.sandboxRole = btn.dataset.srole;
            }));
        });
        menu.querySelectorAll('[data-perk]').forEach(btn => {
            btn.addEventListener('click', () => adjust(() => {
                const key = btn.dataset.perk;
                const perks = hasPerk(key) ? config.boostPerks.filter(p => p !== key) : config.boostPerks.concat(key);
                config.boostPerks = Object.keys(PERKS).filter(p => perks.indexOf(p) >= 0);
            }));
        });

        // Adjust this boost shows the hidden numbers (the exact potential, the peak age), so opening it asks first and takes
        // the career out of the Hall of Fame (once looked at, it opens freely)
        const adjustFold = menu.querySelector('#copero99-boost-adjust');
        adjustFold.querySelector('summary').addEventListener('click', (e) => {
            if (adjustFold.open || stats.picked !== 'boost' || stats.peeked) return;
            e.preventDefault();
            const open = () => {
                stats.peeked = true;
                saveStats();
                adjustFold.open = true;
                updateMenuUI();
            };
            // Already out of the Hall of Fame (your own boost, a reroll): nothing to lose, so no question
            if (hofBlockers().length) open();
            else confirmModal('Open Adjust this boost?', 'It breaks the seal on your scouting report and shows the hidden numbers, like your exact potential and the age you peak, and lets you reroll as often as you like. Once you look, this career can’t go into the Hall of Fame.', 'Open it', open, true);
        });

        menu.querySelector('#copero99-reroll').addEventListener('click', () => {
            config.varianceSeed = Math.floor(Math.random() * SEED_MAX);
            saveConfig();
            updateMenuUI();
        });

        menu.querySelector('#copero99-inspect').addEventListener('click', () => {
            showSettings(false);
            inspectState();
        });
        menu.querySelector('#copero99-look').addEventListener('click', () => {
            showSettings(false);
            showLook();
        });
        menu.querySelector('#copero99-history').addEventListener('click', () => {
            showSettings(false);
            showHistory();
        });
        menu.querySelector('#copero99-hof-save').addEventListener('click', () => {
            if (hofSavable(currentState)) addToHof(buildHofEntry(currentState));
        });
        menu.querySelector('#copero99-hof-clear').addEventListener('click', () => {
            confirmModal('Clear the Hall of Fame?', 'Every saved career will be deleted for good. This can’t be undone.', 'Delete every career', () => {
                hof = [];
                saveHof();
                renderHofList();
                toast('Hall of Fame cleared', true);
            }, true);
        });

        // Field locks: quick picks and a search box both open the value editor
        const quick = menu.querySelector('#copero99-lock-quick');
        for (const [path, emoji, name] of QUICK_LOCKS) {
            const chip = el('button', 'chip', emoji + ' ' + name);
            chip.type = 'button';
            chip.dataset.path = path;
            chip.appendChild(el('small', 'chip-value'));
            chip.addEventListener('click', () => selectLockField(path));
            quick.appendChild(chip);
        }
        const search = menu.querySelector('#copero99-lock-search');
        search.addEventListener('input', () => renderLockResults(search.value));

        menu.querySelector('#copero99-export').addEventListener('click', () => {
            showSettings(false);
            openModal('Save settings', JSON.stringify(config), {
                note: 'Copy this text to back up your settings.'
            });
        });

        menu.querySelector('#copero99-import').addEventListener('click', () => {
            showSettings(false);
            openModal('Load settings', '', {
                note: 'Paste saved settings text, then press Load.',
                placeholder: '{"preset": ... }',
                applyLabel: 'Load',
                onApply: (text) => {
                    try {
                        const parsed = JSON.parse(text);
                        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
                        config = sanitizeConfig(keepLocked(parsed));
                        saveConfig();
                        updateMenuUI();
                        closeModal();
                        toast('Settings loaded', true);
                    } catch (err) {
                        toast("That text isn't valid settings", true);
                    }
                }
            });
        });

        menu.querySelector('#copero99-reset').addEventListener('click', () => {
            showSettings(false);
            confirmModal('Reset all settings?', 'Everything goes back to the defaults, and your switched values are removed. The mode and boost of the career in progress stay.', 'Reset', () => {
                config = sanitizeConfig(keepLocked(DEFAULT_CONFIG));
                saveConfig();
                updateMenuUI();
                toast('Settings reset', true);
            }, true);
        });

        refreshPanel();
        updateMenuUI();
    }

