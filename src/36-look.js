    // ========================================================================
    // Themes, fonts and the side crest
    // ========================================================================

    // Look: themes and fonts for the whole Copero page

    // Each theme tints Copero's own colour variables (light and dark mode); "Your club" uses your club's colour
    const THEMES = {
        copero: { name: 'Copero' },
        club: { name: 'Your club' },
        midnight: { name: 'Midnight', hue: 222, sat: 45 },
        pitch: { name: 'Pitch', hue: 142, sat: 40 },
        ocean: { name: 'Ocean', hue: 190, sat: 50 },
        royal: { name: 'Royal', hue: 268, sat: 42 },
        ember: { name: 'Ember', hue: 12, sat: 50 },
        golden: { name: 'Golden', hue: 40, sat: 55 }
    };
    // Fonts from Google Fonts (Copero itself uses Inter and Poppins); weights are the ones each font has
    const FONTS = {
        copero: { name: 'Copero' },
        montserrat: { name: 'Montserrat', family: 'Montserrat', weights: '400..900' },
        rubik: { name: 'Rubik', family: 'Rubik', weights: '400..900' },
        spaceGrotesk: { name: 'Space Grotesk', family: 'Space Grotesk', weights: '400..700' },
        barlow: { name: 'Barlow', family: 'Barlow', weights: '400;500;600;700;800;900' },
        exo: { name: 'Exo 2', family: 'Exo 2', weights: '400..900' },
        nunito: { name: 'Nunito', family: 'Nunito', weights: '400..900' },
        oswald: { name: 'Oswald', family: 'Oswald', weights: '400..700' }
    };
    function loadFont(key) {
        const font = FONTS[key];
        if (!font || !font.family || document.getElementById('copero99-font-' + key)) return;
        const link = el('link');
        link.id = 'copero99-font-' + key;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=' + font.family.replace(/ /g, '+') + ':wght@' + font.weights + '&display=swap';
        document.head.appendChild(link);
    }
    // "#C8102E" -> [hue, saturation]; black, white and grey club colours give a grey theme
    function hexHue(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) return null;
        const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (d < 0.08) return [0, 0];
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [Math.round((h * 60 + 360) % 360), clamp(Math.round(d / (1 - Math.abs(max + min - 1)) * 60), 25, 60)];
    }
    // The club you play for, from the moment you choose a move (the season the game is animating towards)
    const playingFor = () => {
        const state = liveState || currentState;
        return state ? state.currentTeamId : null;
    };
    // The theme's colours: [hue, saturation], or null for Copero's own
    function themeColors(key) {
        if (key === 'club') {
            const team = gameData.teams[playingFor()];
            return team ? hexHue(team.color) : null;
        }
        const theme = THEMES[key];
        return theme && theme.hue !== undefined ? [theme.hue, theme.sat] : null;
    }
    // The same variables Copero sets for light (:root) and dark (.dark), tinted with one hue
    function themeCss(h, s) {
        const v = (light, sat) => h + ' ' + Math.round(sat === undefined ? s : sat) + '% ' + light + '%';
        // Copero's November 2026 look: lighter cards, borders and hovers in dark mode, a lighter border in light mode
        const dark = { background: v(5, s * 0.8), card: v(11, s * 0.7), surface: v(13, s * 0.6), popover: v(9, s * 0.7), secondary: v(15, s * 0.6),
            muted: v(11, s * 0.6), accent: v(13, s * 0.6), selected: v(16.5, s * 0.6), border: v(17, s * 0.6), input: v(19, s * 0.5),
            'secondary-foreground': v(68, 12), 'muted-foreground': v(52, 10) };
        const light = { background: v(94.5, s * 0.5), card: v(99, s * 0.4), surface: v(98, s * 0.4), popover: v(98, s * 0.4), secondary: v(93, s * 0.4),
            muted: v(90, s * 0.4), accent: v(96, s * 0.4), selected: v(94, s * 0.4), border: v(91, s * 0.4), input: v(82, s * 0.4),
            'muted-foreground': v(45, 10) };
        const vars = (set) => Object.keys(set).map(key => '--' + key + ':' + set[key]).join(';');
        return 'html[data-c99-theme]:not(.dark){' + vars(light) + '}html[data-c99-theme].dark{' + vars(dark) + '}';
    }
    let lookKey = '';
    // Applies the picked theme and font to the page (every pass, so "Your club" follows a move as soon as you choose it)
    function applyLook() {
        const colors = themeColors(ui.theme);
        const font = FONTS[ui.font] || FONTS.copero;
        // "Your club" also shows the club's crest, big and faded, in the empty space left of the game
        placeSideCrest(ui.theme === 'club' && currentState ? clubLogo(playingFor()) : null);
        placeClubWaves(ui.theme === 'club' && currentState ? playingFor() : null);
        const key = JSON.stringify([ui.theme, colors, ui.font]);
        if (key === lookKey) return;
        // A new club's colours fade in instead of flashing: one crossfade of the whole page, done by the graphics card
        // (Chirp: the site lagged; a colour transition on every element made the browser restyle the whole page
        // every frame for 0.6 s, right during Copero's own animation). Browsers without it change at once
        const fade = !!lookKey && typeof document.startViewTransition === 'function' && !document.hidden &&
            !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        lookKey = key;
        if (!fade) return setLook(colors, font);
        try {
            document.startViewTransition(() => setLook(colors, font));
        } catch (e) {
            setLook(colors, font);
        }
    }
    function setLook(colors, font) {
        let style = document.getElementById('copero99-theme-css');
        if (!style) {
            style = el('style');
            style.id = 'copero99-theme-css';
            document.head.appendChild(style);
        }
        const root = document.documentElement;
        if (colors) root.setAttribute('data-c99-theme', ui.theme);
        else root.removeAttribute('data-c99-theme');
        if (font.family) {
            loadFont(ui.font);
            root.setAttribute('data-c99-font', ui.font);
        } else {
            root.removeAttribute('data-c99-font');
        }
        style.textContent = (colors ? themeCss(colors[0], colors[1]) : '') +
            (font.family ? 'html[data-c99-font]{--font-sans:"' + font.family + '",ui-sans-serif,system-ui;--font-poppins:"' + font.family + '",sans-serif}' +
                // Copero's page also names Inter on <body> directly
                'html[data-c99-font] body{font-family:var(--font-sans)}' : '');
    }
    // The crest beside the game ("Your club" theme), fading in again for every new club
    function placeSideCrest(src) {
        let crest = document.getElementById('copero99-side-crest');
        if (!src) {
            if (crest) crest.remove();
            return;
        }
        if (!crest) {
            crest = el('div', 'c99-side-crest c99-own');
            crest.id = 'copero99-side-crest';
            crest.setAttribute('aria-hidden', 'true');
            // A picture rather than a background: it can be moved off the edge by a share of its own width (see the CSS)
            crest.appendChild(el('img')).alt = '';
            document.body.appendChild(crest);
        }
        // Level with the game card (the whole game area when there is no card)
        const section = document.querySelector('[data-career-phase] section');
        const area = (section && (section.firstElementChild || section)) || document.querySelector('[data-career-phase]');
        const box = area && area.getBoundingClientRect();
        if (box) {
            const top = Math.round(box.top + window.scrollY) + 'px';
            const height = Math.round(box.height) + 'px';
            if (crest.style.top !== top) crest.style.top = top;
            if (crest.style.height !== height) crest.style.height = height;
        }
        if (crest.dataset.src !== src) {
            crest.dataset.src = src;
            crest.firstChild.src = src;
            crest.classList.remove('c99-in');
            void crest.offsetWidth; // restarts the fade
            crest.classList.add('c99-in');
        }
    }
    // A small preview of a theme's colours
    function themeSwatch(key) {
        if (key === 'copero') return 'linear-gradient(135deg, hsl(240 10% 7%) 50%, hsl(38 12% 95%) 50%)';
        const colors = themeColors(key);
        if (!colors) return 'conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)';
        return 'linear-gradient(135deg, hsl(' + colors[0] + ' ' + colors[1] + '% 8%), hsl(' + colors[0] + ' ' + colors[1] + '% 38%))';
    }
    // Gear > Theme & font: swatches and font names, applied as you tap them
    function showLook() {
        const body = el('div', 'look');
        const group = (title, keys, build) => {
            body.appendChild(el('div', 'look-label', title));
            const grid = el('div', 'look-grid');
            for (const key of keys) {
                const btn = el('button', 'look-pick');
                btn.type = 'button';
                build(btn, key);
                grid.appendChild(btn);
            }
            body.appendChild(grid);
            return grid;
        };
        const mark = (grid, attr, value) => grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset[attr] === value));
        const themes = group('Theme', Object.keys(THEMES), (btn, key) => {
            btn.dataset.theme = key;
            const swatch = el('span', 'look-swatch');
            swatch.style.background = themeSwatch(key);
            btn.appendChild(swatch);
            btn.appendChild(el('span', '', THEMES[key].name));
            btn.addEventListener('click', () => {
                ui.theme = key;
                ui.themePicked = true;
                saveUi();
                applyLook();
                mark(themes, 'theme', key);
            });
        });
        const fonts = group('Font', Object.keys(FONTS), (btn, key) => {
            btn.dataset.font = key;
            loadFont(key);
            const sample = el('span', 'look-font', 'Aa');
            if (FONTS[key].family) sample.style.fontFamily = '"' + FONTS[key].family + '", sans-serif';
            btn.appendChild(sample);
            btn.appendChild(el('span', '', FONTS[key].name));
            btn.addEventListener('click', () => {
                ui.font = key;
                saveUi();
                applyLook();
                mark(fonts, 'font', key);
            });
        });
        mark(themes, 'theme', ui.theme);
        mark(fonts, 'font', ui.font);
        openModal('Theme & font', '', { body: body, note: 'For the whole Copero page, in light and dark mode. "Your club" (the default) follows the club you play for and shows its crest beside the game.' });
    }

