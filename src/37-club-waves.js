    // ========================================================================
    // Waves in the club's colours
    // ========================================================================

    // "Your club" waves: the club's colours drifting along the bottom of the page, behind Copero's page (it shows them in
    // the room beside and under the game). Copero names one colour per club, so the others are read from its crest

    // A colour as [hue 0-360, saturation 0-1, lightness 0-1]
    function rgbHsl(r, g, b) {
        const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min, l = (max + min) / 2;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        const h = d === 0 ? 0 : max === r / 255 ? ((g - b) / 255 / d) % 6 : max === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4;
        return [(h * 60 + 360) % 360, s, l];
    }
    const hexHsl = (hex) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        return m ? rgbHsl(...[0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))) : null;
    };
    const toHex = (r, g, b) => '#' + [r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    // The crest's main colours, most used first (null while it loads, or when it can't be read). Copero's media server
    // allows reading its pictures, so the crest file is fetched (a crest already on the page can't be read from there),
    // drawn small and its pixels counted by hue. Some crests have no size of their own, which a canvas needs: they get one
    const crestPalettes = {};
    function crestColors(src) {
        if (!src || crestPalettes[src] !== undefined || typeof fetch !== 'function') return src ? crestPalettes[src] || null : null;
        crestPalettes[src] = null;
        const sized = (svg) => svg.replace(/<svg\b([^>]*)>/i, (tag, attrs) => (/\swidth=/.test(attrs) && /\sheight=/.test(attrs) ? tag : '<svg width="96" height="96"' + attrs + '>'));
        // Not from the browser's cache: the copy saved when Copero drew the crest can't be read by a script
        fetch(src, { cache: 'no-store' })
            .then(r => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
            .then(blob => (/svg/.test(blob.type) ? blob.text().then(text => new Blob([sized(text)], { type: 'image/svg+xml' })) : blob))
            .then(blob => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('unreadable picture'));
                img.src = URL.createObjectURL(blob);
            }))
            .then(img => {
                const size = 48;
                const canvas = el('canvas');
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, size, size);
                URL.revokeObjectURL(img.src);
                crestPalettes[src] = paletteOf(ctx.getImageData(0, 0, size, size).data);
            })
            .catch(e => console.warn('[99] could not read the crest colours:', e));
        return null;
    }
    // Pixels (RGBA) -> { colors, light }: the hues that cover at least 6% of the picture as their average colour, most used
    // first (neighbouring hues within 40° count as one, e.g. Barcelona's red and claret), and the share of white
    function paletteOf(px) {
        const bins = Array.from({ length: 12 }, (_, i) => ({ hue: i * 30, n: 0, r: 0, g: 0, b: 0 }));
        let opaque = 0, light = 0;
        for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] < 160) continue;
            opaque++;
            const [h, s, l] = rgbHsl(px[i], px[i + 1], px[i + 2]);
            if (s < 0.35 || l < 0.12 || l > 0.9) {
                if (l > 0.8 && s < 0.35) light++;
                continue;
            }
            const bin = bins[Math.floor(((h + 15) % 360) / 30)];
            bin.n++;
            bin.r += px[i];
            bin.g += px[i + 1];
            bin.b += px[i + 2];
        }
        const groups = [];
        for (const bin of bins.filter(b => b.n).sort((a, b) => b.n - a.n)) {
            const near = groups.find(g => Math.min(Math.abs(g.hue - bin.hue), 360 - Math.abs(g.hue - bin.hue)) < 40);
            if (near) near.n += bin.n;
            else groups.push({ hue: bin.hue, n: bin.n, color: toHex(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n) });
        }
        return {
            colors: groups.filter(g => g.n >= opaque * 0.06).sort((a, b) => b.n - a.n).map(g => g.color),
            light: opaque ? light / opaque : 0
        };
    }
    // Two colours far enough apart to read as different waves (black, white and grey only differ by lightness)
    function colorsApart(a, b) {
        const [x, y] = [hexHsl(a), hexHsl(b)];
        if (!x || !y) return false;
        const grey = (c) => c[1] < 0.15 || c[2] > 0.92 || c[2] < 0.08;
        if (grey(x) || grey(y)) return grey(x) !== grey(y) || Math.abs(x[2] - y[2]) > 0.4;
        return Math.min(Math.abs(x[0] - y[0]), 360 - Math.abs(x[0] - y[0])) >= 40;
    }
    // The waves' colours for a club: Copero's own colour first, then the crest's other colours (up to 3), or white when it
    // only has one (grey for a white club); made light enough to show on the dark page and dark enough on the light one
    function waveColors(teamId) {
        const team = gameData.teams[teamId];
        if (!team) return null;
        const crest = crestColors(clubLogo(teamId, false));
        const picked = [];
        for (const color of [team.color].concat(crest ? crest.colors : [])) {
            if (color && picked.length < 3 && picked.every(p => colorsApart(p, color))) picked.push(color);
        }
        if (!picked.length) return null;
        if (picked.length < 2) picked.push(colorsApart(picked[0], '#ffffff') ? '#ffffff' : '#64748b');
        const dark = document.documentElement.classList.contains('dark');
        return picked.map(color => {
            const [h, s, l] = hexHsl(color);
            const lit = s < 0.15 ? (dark ? clamp(l, 0.55, 0.95) : clamp(l, 0.3, 0.6)) : (dark ? clamp(l, 0.45, 0.72) : clamp(l, 0.3, 0.55));
            return 'hsl(' + Math.round(h) + ' ' + Math.round(s * 100) + '% ' + Math.round(lit * 100) + '%)';
        });
    }
    // One wave across twice the screen's width (0-2400, so sliding it by half loops without a seam): two sines, one 3×
    // as fast, joined with smooth curves
    function wavePath(mid, big, small, phase) {
        const pts = [];
        for (let x = 0; x <= 2400; x += 50) {
            const t = x / 1200 * 2 * Math.PI;
            pts.push([x, mid + big * Math.sin(t + phase) + small * Math.sin(3 * t + phase * 1.7)]);
        }
        let d = 'M' + pts[0].join(',');
        for (let i = 0; i < pts.length - 1; i++) {
            const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
            d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
                (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0] + ',' + p2[1].toFixed(1);
        }
        return d;
    }
    // Two ribbons (a glow, a main line and two fine threads each) in the first two colours, and a fine accent line in the
    // third; each drifts sideways at its own pace (the second the other way) and bobs gently
    function wavesMarkup() {
        // (The sideways drift moves a div around the drawing: the browser's graphics card can slide a div by itself, but not
        // an <svg>, which it redrew every frame)
        const svg = (cls, paths) => '<div class="c99-wave-bob ' + cls + '"><div class="c99-wave"><svg viewBox="0 0 2400 200" preserveAspectRatio="none">' + paths + '</svg></div></div>';
        const line = (cls, d) => '<path class="' + cls + '" d="' + d + '" vector-effect="non-scaling-stroke"/>';
        const ribbon = (n, mid, big, small, phase) => line('glow w' + n, wavePath(mid, big, small, phase)) + line('main w' + n, wavePath(mid, big, small, phase)) +
            line('thread w' + n, wavePath(mid - 14, big * 1.1, small, phase + 0.35)) + line('thread w' + n, wavePath(mid + 12, big * 0.9, small * 1.2, phase - 0.3));
        return svg('r1', ribbon(1, 120, 26, 7, 0)) + svg('r2', ribbon(2, 138, 22, 9, 2.2)) + svg('r3', line('accent w3', wavePath(104, 30, 5, 4.1)));
    }
    function placeClubWaves(teamId) {
        let waves = document.getElementById('copero99-waves');
        const colors = teamId ? waveColors(teamId) : null;
        if (!colors) {
            if (waves) waves.remove();
            if (document.documentElement.hasAttribute('data-c99-waves')) document.documentElement.removeAttribute('data-c99-waves');
            return;
        }
        if (!waves) {
            waves = el('div', 'c99-waves c99-own');
            waves.id = 'copero99-waves';
            waves.setAttribute('aria-hidden', 'true');
            waves.innerHTML = wavesMarkup();
            document.body.appendChild(waves);
        }
        // Copero paints its page colour on two wrappers in front of anything behind them: those let the waves through
        // (the page keeps its colour from <body>). (Set once: setting it again restyled the whole page every pass)
        if (!document.documentElement.hasAttribute('data-c99-waves')) document.documentElement.setAttribute('data-c99-waves', '');
        const key = colors.concat(colors[2] ? [] : [colors[0]]).join('|');
        if (waves.dataset.colors !== key) {
            waves.dataset.colors = key;
            key.split('|').forEach((color, i) => waves.style.setProperty('--c99-w' + (i + 1), color));
        }
    }

