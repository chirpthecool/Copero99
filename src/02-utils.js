    // ========================================================================
    // Small helpers used everywhere: numbers, seeded random numbers, DOM bits
    // ========================================================================

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    // A market value rounded the way the game rounds them
    const roundValue = (n) => (n >= 1e7 ? Math.round(n / 1e6) * 1e6 : n >= 1e6 ? Math.round(n / 1e5) * 1e5 : Math.round(n / 1e4) * 1e4);
    // A normal random number (mean 0, spread 1) from a seeded generator
    const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    // FNV-1a: the same text always gives the same number, so "random" picks stay the same on every pass
    function hashText(text) {
        let h = 2166136261;
        for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
        return h >>> 0;
    }
    // A repeatable random number generator (0 to 1) for one piece of text
    function seeded(text) {
        let h = hashText(text) || 1;
        return () => {
            h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
            return (h >>> 0) / 4294967296;
        };
    }
    // `count` items of a list in a repeatable random order for `key` (sorting by hashText(key + item) clumped: one
    // career got the same club in half its transfer windows)
    function seededPicks(list, key, count) {
        const rng = seeded(key);
        return list.map(item => [rng(), item]).sort((a, b) => a[0] - b[0]).slice(0, count).map(pair => pair[1]);
    }
    const signed = (n) => (n > 0 ? '+' : '') + n;
    // A random key, each as likely as its weight (a seeded rng makes it repeatable)
    function weightedPick(keys, weightOf, rng) {
        let pick = (rng || Math.random)() * keys.reduce((sum, key) => sum + weightOf(key), 0);
        return keys.find(key => (pick -= weightOf(key)) < 0) || keys[0];
    }
    // A whole number from lo to hi, most often near mode (a triangle)
    function triangle([lo, mode, hi]) {
        const u = Math.random();
        const x = u < (mode - lo) / (hi - lo) ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
        return Math.round(x);
    }
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    // Sets a property (hidden, disabled…) only when it changes: setting the same value again still counts as a change for
    // the browser, which then restyles around it
    function put(node, key, value) {
        if (node && node[key] !== value) node[key] = value;
    }
    // Writes a text only when it changes (writing the same text still replaces the node: a page change and a new layout)
    function setText(node, text) {
        if (node && node.textContent !== text) node.textContent = text;
    }

