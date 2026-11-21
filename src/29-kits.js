    // ========================================================================
    // Copero's shirt, drawn for the card
    // ========================================================================

    // Copero's shirt (its name screen's kit: ep() and op() in the game file): colours by Copero's own rules, near-white and
    // near-black evened out, the name over the shoulders and the number big, in the third colour
    const KIT = { white: '#E9E9E9', dark: '#2B2B2B', ink: '#000000', file: '/career-simulator/kit-v2.svg#' };
    const kitHex = (value) => {
        const raw = String(value || '').trim().replace(/^#/, '');
        return /^[0-9a-fA-F]{3,6}$/.test(raw) ? '#' + (raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw).toUpperCase() : null;
    };
    const kitLight = (hex) => {
        const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        return [(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255, Math.max(...rgb) - Math.min(...rgb) <= 20];
    };
    const kitColor = (value, fallback) => {
        const hex = kitHex(value);
        if (!hex) return fallback;
        const [light, grey] = kitLight(hex);
        return grey && light >= 0.93 ? KIT.white : grey && light <= 0.18 ? KIT.dark : hex;
    };
    // The shirt's colours for a country (its own kit) or a club (its colour, the ink white on a dark one)
    function kitColors(entity) {
        if (entity && 'kit_primary_color' in entity) {
            const second = kitColor(entity.kit_secondary_color, null);
            const pattern = second && ['vertical_stripes', 'checkerboard', 'diagonal_sash'].indexOf(entity.kit_type) >= 0 ? entity.kit_type : null;
            return { fabric: kitColor(entity.kit_primary_color, kitColor(entity.primary_color, KIT.white)), second: second, ink: kitColor(entity.kit_tertiary_color, KIT.ink), pattern: pattern };
        }
        const fabric = kitColor(entity && entity.primary_color, KIT.white);
        const [light, grey] = kitLight(fabric);
        return { fabric: fabric, second: null, ink: fabric !== KIT.white && ((grey && light <= 0.18) || light < 0.5) ? '#FFFFFF' : KIT.ink, pattern: null };
    }
    let kitCount = 0;
    function kitSvg(entity, name, number) {
        const { fabric, second, ink, pattern } = kitColors(entity);
        const id = 'c99-kit-' + (++kitCount);
        const node = (tag, attrs, parent) => {
            const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
            for (const key of Object.keys(attrs)) n.setAttribute(key, attrs[key]);
            if (parent) parent.appendChild(n);
            return n;
        };
        const svg = node('svg', { viewBox: '-10 0 1060 1140', class: 'icard-kit', 'aria-hidden': 'true' });
        node('use', { href: KIT.file + 'path2', fill: pattern ? 'url(#' + id + ')' : fabric }, svg);
        // Light from the top left over the fabric, the sides falling into shadow, so the shirt has a body
        node('use', { href: KIT.file + 'path2', fill: 'url(#' + id + '-side)' }, svg);
        node('use', { href: KIT.file + 'path2', fill: 'url(#' + id + '-top)' }, svg);
        node('use', { href: KIT.file + 'path4', fill: pattern ? ink : second || ink }, svg);
        node('use', { href: KIT.file + 'path16' }, svg);
        const defs = node('defs', {}, svg);
        for (const [key, attrs, stops] of [
            ['side', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#000', 0.22], [0.2, '#fff', 0.12], [0.45, '#fff', 0.04], [0.75, '#000', 0.06], [1, '#000', 0.3]]],
            ['top', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#fff', 0.18], [0.35, '#fff', 0], [0.8, '#000', 0], [1, '#000', 0.22]]]]) {
            const gradient = node('linearGradient', { id: id + '-' + key, ...attrs }, defs);
            for (const [offset, color, opacity] of stops) node('stop', { offset: offset, 'stop-color': color, 'stop-opacity': opacity }, gradient);
        }
        if (pattern) {
            const size = pattern === 'checkerboard' ? [260, 260] : [1040, 1140];
            const tile = node('pattern', { id: id, patternUnits: 'userSpaceOnUse', x: 0, y: 0, width: size[0], height: size[1] }, defs);
            node('rect', { width: size[0], height: size[1], fill: fabric }, tile);
            if (pattern === 'vertical_stripes') for (const x of [220, 455, 690]) node('rect', { x: x, width: 130, height: 1140, fill: second }, tile);
            else node('path', { fill: second, d: pattern === 'checkerboard' ? 'M0 0h130v130H0zM130 130h130v130H130z' : 'M100 0H260L1000 1140H840Z' }, tile);
        }
        node('path', { id: id + '-name', d: 'M180 330 Q519 250 858 330', fill: 'transparent' }, defs);
        // The name and number with a fine edge, as printed on a real shirt
        const style = 'fill: ' + ink + '; font-family: var(--font-sans); font-weight: 900; paint-order: stroke fill; stroke-width: 6px; stroke: ' +
            (kitLight(kitHex(ink) || '#FFFFFF')[0] > 0.5 ? 'rgb(0 0 0 / 0.22)' : 'rgb(255 255 255 / 0.28)') + ';';
        const label = node('text', { style: style, 'font-size': 78, 'letter-spacing': 4 }, svg);
        node('textPath', { href: '#' + id + '-name', startOffset: '50%', 'text-anchor': 'middle' }, label).textContent = String(name || '').toUpperCase();
        node('text', { style: style, x: 519, y: 650, 'font-size': 365, 'text-anchor': 'middle' }, svg).textContent = String(number || 10);
        return svg;
    }

