    // ========================================================================
    // Settings, their limits and saving them (Tampermonkey storage)
    // ========================================================================

    const DEFAULT_CONFIG = {
        preset: 'realistic',      // 'god' | 'realistic' | 'prodigy' | 'lateBloomer' | 'ironman' | 'custom'

        notifications: true,      // Small popups (injury blocked, new season OVR, ...)

        // Boost (default): the game still rolls OVR, the script scales its changes
        boostedOVR: true,         // Boost mode (when off, a Sandbox OVR cheat below is on)
        boostRandom: true,        // Roll a new boost (tier, numbers, style, perks) at every new career
        boostTier: 'talented',    // Boost level (BOOST_TIERS): sets the ranges the numbers below are rolled from
        boostGrowth: 125,         // Game's OVR gains are multiplied by this % (100 = normal)
        boostDecline: 75,         // % of the game's OVR drops you still take (100 = normal)
        boostStart: 11,           // One-time OVR bonus when a new career starts (the game starts everyone at 50)
        boostCap: 89,             // Potential: gains are boosted up to this OVR...
        boostAbove: 25,           // ...and only this % of the game's gain counts past it (until the peak age)
        boostPeak: 23,            // Peak age: the boost steers the OVR to the potential by this age, then growth stops at the potential
        boostStyle: 'standard',   // Career style rolled with the boost (BOOST_STYLES): at which ages the boost helps most
        boostPerks: [],           // Perks rolled with the boost (PERKS), e.g. 'bigClub' (the academy offer comes from three of the biggest clubs)
        boostSwing: 15,           // Each season the growth boost (and the share of drops taken) swings up to this % either way (no slider)
        boostGoals: 0,            // Playing traits (STAT_TRAITS): % more (or fewer, below 0) goals than Copero gives each season...
        boostAssists: 0,          // ...assists...
        boostApps: 0,             // ...and games (goals and assists follow the games); 0 = none
        boostRole: '',            // Role trait (ROLE_TRAITS): one step up or down the squad at a new club or a settled one; '' = none

        // Sandbox
        ageBasedOVR: false,       // Planned curve: OVR follows the age formula below
        forceOVR99: false,        // God Mode: OVR is always forced to 99
        peakOverall: 99,          // Maximum OVR at career peak
        peakAge: 28,              // Peak age
        growthPerYear: 4,         // Points gained per year on the way up to the peak
        declineStartAge: 31,      // Age at which decline begins
        declinePerYear: 2,        // Points lost per year after the decline starts
        minOverall: 40,           // OVR never drops below this (floor)
        variance: 0,              // Random +/- swing per season (0 = off)
        varianceSeed: 1,          // Changes the variance pattern ("reroll")
        useCustomCurve: false,    // Use the hand-made age -> OVR table instead of the formula
        customCurve: null,        // 25 values (ages 16..40); filled automatically when null
        preventInjuries: false,   // Cancel injuries (off by default: it keeps a career out of the Hall of Fame)
        preventSuspensions: false,// Cancel suspensions
        forceQualify: false,      // Your country always qualifies for national tournaments
        luckyEvents: false,       // Sandbox: every risky choice in Copero's events turns out well
        extraOffer: false,        // Sandbox: a third club offer at transfer time (4 cards with Stay)
        offerQuality: 0,          // Sandbox: -2..+2 levels of club reputation for your offers (0 = the game's own)
        realRetire: false,        // Sandbox: Boost's end of a career (playing on past your body costs, the end only forced in extremes)
        sandboxPerks: [],         // Sandbox modifiers: Boost perks picked by hand (SANDBOX_PERKS)...
        sandboxGoals: 0,          // ...playing traits (as boostGoals / boostAssists / boostApps)...
        sandboxAssists: 0,
        sandboxApps: 0,
        sandboxRole: '',          // ...and a role trait (ROLE_TRAITS)
        configVersion: 6,         // 2 = Surprise boost is the default, 3 = gentler boost defaults, 4 = "Game decides" removed, 5 = Block injuries off, 6 = boost tiers and perks (older saves are updated once)
        locks: []             // Switch values: [{ path, value }] kept fixed while Sandbox is on
    };
    // Allowed ranges for the numeric options [min, max]
    const LIMITS = {
        peakOverall: [40, 99],
        peakAge: [16, 40],
        growthPerYear: [1, 10],
        declineStartAge: [25, 40],
        declinePerYear: [1, 10],
        minOverall: [40, 99],
        variance: [0, 5],
        boostGrowth: [100, 300],
        boostDecline: [0, 100],
        boostStart: [-3, 35],
        boostCap: [75, 99],
        boostAbove: [0, 100],
        // 16 is the first season, so the earliest a player can reach their best is 17
        boostPeak: [17, 29],
        boostSwing: [0, 30],
        boostGoals: [-30, 40],
        boostAssists: [-30, 40],
        boostApps: [-30, 25],
        sandboxGoals: [-30, 40],
        sandboxAssists: [-30, 40],
        sandboxApps: [-30, 25],
        offerQuality: [-2, 2]
    };
    const SEED_MAX = 1000000000;
    const CURVE_MIN_AGE = 16;
    const CURVE_MAX_AGE = 40;
    const CURVE_AGES = CURVE_MAX_AGE - CURVE_MIN_AGE + 1; // 25
    const CURVE_MIN_OVR = 40;
    const CURVE_MAX_OVR = 99;
    const MAX_HISTORY = 100;
    const MAX_LOCKS = 20;
    const FORBIDDEN_SEGMENTS = ['__proto__', 'constructor', 'prototype'];
    const MAX_HOF = 50;
    const BOOLEAN_KEYS = ['notifications', 'boostedOVR', 'boostRandom', 'ageBasedOVR', 'forceOVR99', 'useCustomCurve', 'preventInjuries', 'preventSuspensions', 'forceQualify',
        'luckyEvents', 'extraOffer', 'realRetire'];
    // Settings that are not part of a career style (changing them keeps the preset as is)
    const META_KEYS = ['notifications', 'boostedOVR', 'boostRandom', 'forceOVR99', 'ageBasedOVR', 'preventInjuries', 'preventSuspensions', 'forceQualify',
        'luckyEvents', 'extraOffer', 'realRetire'];
    let config = { ...DEFAULT_CONFIG };
    // The career on screen: its counters (they start over with every career) and the mode picked for it (null until
    // you pick Boost, Sandbox or Vanilla; then it's locked in for that career). For the Hall of Fame: `cheats`
    // lists the cheats used in it, `rolled` is the boost as rolled (a changed boost doesn't count), `rerolled` is set
    // by the one free Reroll, `peeked` by opening Adjust this boost (it shows the hidden potential and peak age; from then on
    // rerolls are unlimited). `seasonsSeen`: seasons already looked at for the Ballon d'Or and season OVRs (each is handled
    // once); `banSeen`: the last suspension the club has decided about (see banRelease); `loanGrew`: the stay (1 = the first)
    // whose gamble grew the potential, so the club doesn't let you go at the next loan offer (see releaseReason)
    const stats = { seed: '', picked: null, injuries: 0, suspensions: 0, loans: 0, cheats: [], rolled: null, rerolled: false, peeked: false, seasonsSeen: 0, retireTold: 0, banSeen: '', loanGrew: 0, farewell: 0, farewellWay: '', offered: {}, renewal: null };
    // The ways a career can be played: Boost (rolled talent), Sandbox, Vanilla (Copero exactly as it is)
    const PICKS = ['boost', 'sandbox', 'vanilla'];
    // Season history: [{ age, gameOvr, ovr }]
    let history = [];
    // Finished careers, oldest first (see buildHofEntry)
    let hof = [];
    // Surprise boost memory: the OVR the script last left in this career ({ seed, ovr })
    let boostMemo = null;
    // UI state remembered between sessions (not whether the panel is open), plus the page's theme and font
    let ui = { tab: 'ovr', open: false, theme: 'club', themePicked: false, font: 'copero' };
    // Field lock helpers

    /**
     * A lock path is dot-separated names/indexes, e.g. "player.marketValue"
     * or "seasons.0.overall". Prototype-related names are never allowed.
     */
    function isValidPath(path) {
        if (typeof path !== 'string' || path.length === 0 || path.length > 120) return false;
        if (!/^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(path)) return false;
        return path.split('.').every(segment => FORBIDDEN_SEGMENTS.indexOf(segment) === -1);
    }
    // The player's OVR is set by the OVR modes (Boost / Sandbox), so it can't be switched
    const canSwitch = (path) => path !== 'player.overall';
    function sanitizeLocks(raw) {
        const out = [];
        if (!Array.isArray(raw)) return out;
        const seen = new Set();
        for (const item of raw) {
            if (!item || typeof item !== 'object') continue;
            const path = typeof item.path === 'string' ? item.path.trim() : '';
            if (!isValidPath(path) || !canSwitch(path) || seen.has(path)) continue;
            const value = item.value;
            const type = typeof value;
            if (type === 'number' && !Number.isFinite(value)) continue;
            if (type === 'string' && value.length > 200) continue;
            if (type !== 'number' && type !== 'boolean' && type !== 'string') continue;
            seen.add(path);
            out.push({ path: path, value: value });
            if (out.length >= MAX_LOCKS) break;
        }
        return out;
    }
    // Storage helpers (Tampermonkey storage, falling back to localStorage)

    function storeGet(key) {
        try {
            let value;
            if (typeof GM_getValue === 'function') {
                value = GM_getValue(key);
            } else {
                const raw = localStorage.getItem(key);
                value = raw ? JSON.parse(raw) : null;
            }
            if (typeof value === 'string') value = JSON.parse(value);
            return value === undefined ? null : value;
        } catch (e) {
            console.warn('[99] error reading "' + key + '":', e);
            return null;
        }
    }
    // What each key last held when written, so a save that changes nothing isn't sent (Chirp: the site got laggier
    // with many careers in the Hall of Fame: a userscript manager keeps all of a script's values together, so every save
    // costs more the bigger they are, and many saves changed nothing)
    const stored = {};
    function storeSet(key, value) {
        try {
            const text = JSON.stringify(value);
            if (stored[key] === text) return;
            stored[key] = text;
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (e) {
            console.warn('[99] error saving "' + key + '":', e);
        }
    }
    /**
     * Takes any (possibly broken or outdated) config object and returns a
     * valid one: unknown keys dropped, missing keys defaulted, numbers clamped.
     */
    function sanitizeConfig(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        const out = {};
        for (const key of Object.keys(DEFAULT_CONFIG)) {
            out[key] = key in src ? src[key] : DEFAULT_CONFIG[key];
        }
        for (const key of Object.keys(LIMITS)) {
            let value = Number(out[key]);
            if (!Number.isFinite(value)) value = DEFAULT_CONFIG[key];
            out[key] = clamp(Math.round(value), LIMITS[key][0], LIMITS[key][1]);
        }
        let seed = Number(out.varianceSeed);
        if (!Number.isFinite(seed)) seed = DEFAULT_CONFIG.varianceSeed;
        out.varianceSeed = clamp(Math.floor(seed), 0, SEED_MAX);

        for (const key of BOOLEAN_KEYS) {
            out[key] = !!out[key];
        }
        // Custom curve: 25 numbers; anything invalid falls back to the formula
        const formula = buildCurve(out);
        if (Array.isArray(out.customCurve) && out.customCurve.length === CURVE_AGES) {
            out.customCurve = out.customCurve.map((v, i) => {
                const n = Number(v);
                return Number.isFinite(n) ? clamp(Math.round(n), CURVE_MIN_OVR, CURVE_MAX_OVR) : formula[i];
            });
        } else {
            out.customCurve = formula;
        }

        out.locks = sanitizeLocks(out.locks);
        if (!Object.prototype.hasOwnProperty.call(BOOST_STYLES, out.boostStyle)) out.boostStyle = 'standard';
        if (!Object.prototype.hasOwnProperty.call(BOOST_TIERS, out.boostTier)) out.boostTier = DEFAULT_CONFIG.boostTier;
        if (!Object.prototype.hasOwnProperty.call(ROLE_TRAITS, out.boostRole)) out.boostRole = '';
        if (!Object.prototype.hasOwnProperty.call(ROLE_TRAITS, out.sandboxRole)) out.sandboxRole = '';
        const picks = Array.isArray(out.sandboxPerks) ? out.sandboxPerks : [];
        out.sandboxPerks = SANDBOX_PERKS.filter(key => picks.indexOf(key) >= 0);
        // Known perks only, each once, in the list's order
        const perks = Array.isArray(out.boostPerks) ? out.boostPerks : [];
        out.boostPerks = Object.keys(PERKS).filter(key => perks.indexOf(key) >= 0);
        out.configVersion = Number(out.configVersion) || DEFAULT_CONFIG.configVersion;

        if (!Object.prototype.hasOwnProperty.call(PRESETS, out.preset)) {
            out.preset = 'custom';
        }
        return out;
    }
    // The settings as saved, before any upgrade below (loadStats compares a boost rolled by an older version with them)
    let savedConfig = null;
    function loadConfig() {
        const saved = storeGet('copero99_config');
        savedConfig = saved && typeof saved === 'object' ? saved : null;
        config = sanitizeConfig(saved);
        // An older version made Surprise boost the default: move those saves to it once (curve values are kept)
        const version = saved && typeof saved === 'object' ? Number(saved.configVersion) || 0 : null;
        if (version !== null && version < 2) {
            config.boostedOVR = true;
            config.ageBasedOVR = false;
            config.forceOVR99 = false;
        }
        // Older saves: the first boost defaults (×1.5, 50%, +5) made 99 OVR too easy; untouched values get the new ones
        if (version !== null && version < 3) {
            if (saved.boostGrowth === undefined || saved.boostGrowth === 150) config.boostGrowth = DEFAULT_CONFIG.boostGrowth;
            if (saved.boostDecline === undefined || saved.boostDecline === 50) config.boostDecline = DEFAULT_CONFIG.boostDecline;
            if (saved.boostStart === undefined || saved.boostStart === 5) config.boostStart = DEFAULT_CONFIG.boostStart;
        }
        // Older saves: "Game decides" is gone (switch the menu off instead), so saves that used it go to Boost
        if (version !== null && version < 4 && !config.boostedOVR && !config.ageBasedOVR && !config.forceOVR99) {
            config.boostedOVR = true;
        }
        // Older saves: Block injuries keeps a career out of the Hall of Fame, so it starts off (switch it back on in the Career tab)
        if (version !== null && version < 5) {
            config.preventInjuries = false;
        }
        // 1.0: the two perk switches became a list, and the boost level is rolled (it used to be named from the numbers)
        if (version !== null && version < 6) {
            config.boostPerks = Object.keys(PERKS).filter(key => (key === 'bigClub' && saved.boostPerk) || (key === 'extraOffer' && saved.boostExtra));
            config.boostTier = legacyTier(config);
        }
        if (version !== null && version < DEFAULT_CONFIG.configVersion) {
            config.configVersion = DEFAULT_CONFIG.configVersion;
            saveConfig();
        }
    }
    function saveConfig() {
        storeSet('copero99_config', config);
    }
    function loadStats() {
        const saved = storeGet('copero99_stats');
        if (saved && typeof saved === 'object') {
            stats.seed = typeof saved.seed === 'string' ? saved.seed : '';
            // Saved before picking existed: the career in progress keeps the mode it was using
            const group = config.forceOVR99 || config.ageBasedOVR ? 'sandbox' : 'boost';
            // Sandbox was called Classic cheats before
            const picked = saved.picked === 'classic' ? 'sandbox' : saved.picked;
            stats.picked = 'picked' in saved ? (PICKS.indexOf(picked) >= 0 ? picked : null) : group;
            stats.injuries = Math.max(0, Math.floor(Number(saved.injuries)) || 0);
            stats.suspensions = Math.max(0, Math.floor(Number(saved.suspensions)) || 0);
            stats.loans = Math.max(0, Math.floor(Number(saved.loans)) || 0);
            stats.cheats = Array.isArray(saved.cheats) ? saved.cheats.filter(name => typeof name === 'string') : [];
            stats.rerolled = !!saved.rerolled;
            stats.peeked = !!saved.peeked;
            // (the end-of-career stage already told, 0-3; it was a yes/no before the twenty-second round)
            stats.retireTold = saved.retireTold === true ? 2 : clamp(Math.floor(Number(saved.retireTold)) || 0, 0, 3);
            stats.farewell = Math.max(0, Math.floor(Number(saved.farewell)) || 0);
            stats.farewellWay = ['last', 'farewell', 'home'].indexOf(saved.farewellWay) >= 0 ? saved.farewellWay : '';
            stats.banSeen = typeof saved.banSeen === 'string' ? saved.banSeen : '';
            stats.loanGrew = Math.max(0, Math.floor(Number(saved.loanGrew)) || 0);
            // A new contract signed by turning a release clause down: { club, age, years }
            stats.renewal = saved.renewal && typeof saved.renewal === 'object' && saved.renewal.club
                ? { club: String(saved.renewal.club), age: Number(saved.renewal.age) || 0, years: Number(saved.renewal.years) || 0 } : null;
            // The clubs offered in each window ({ club: [steps] }), for fewer repeats and earned suitors
            stats.offered = {};
            if (saved.offered && typeof saved.offered === 'object') {
                for (const id of Object.keys(saved.offered)) {
                    if (Array.isArray(saved.offered[id])) stats.offered[id] = saved.offered[id].filter(Number.isFinite).slice(-4);
                }
            }
            // Saved before 1.0 (-1): trackCareer counts every season played so far as seen, so the Ballon d'Ors already won stay
            stats.seasonsSeen = Number.isFinite(saved.seasonsSeen) ? Math.max(0, saved.seasonsSeen) : -1;
            // A career saved before this was tracked gets the benefit of the doubt: its boost counts as rolled
            stats.rolled = 'rolled' in saved ? (typeof saved.rolled === 'string' ? saved.rolled : null) : boostSig();
            // Rolled by an older version (its own list of values; the oldest without the extra club): still as rolled if
            // the boost hasn't changed since (settings it never saved had the old defaults)
            if (stats.rolled && stats.rolled.split('|').length !== boostSig().split('|').length) {
                const old = stats.rolled.split('|').length === 8 ? stats.rolled + '|false' : stats.rolled;
                // (v3: before role traits, so the same boost with none)
                const v3 = 'v3|' + boostSig().split('|').slice(1, -1).join('|');
                // (kept as it was otherwise, so the Hall of Fame says it was changed by hand)
                stats.rolled = old === v3 || old === legacySig({ ...LEGACY_BOOST, ...(savedConfig || {}) }) ? boostSig() : 'old:' + old;
            }
        }
    }
    function saveStats() {
        storeSet('copero99_stats', stats);
    }
    function loadHistory() {
        const saved = storeGet('copero99_history');
        history = [];
        if (Array.isArray(saved)) {
            for (const item of saved) {
                if (!item || typeof item !== 'object') continue;
                const age = Number(item.age);
                if (!Number.isFinite(age)) continue;
                const gameOvr = Number(item.gameOvr);
                const ovr = Number(item.ovr);
                history.push({
                    age: age,
                    gameOvr: Number.isFinite(gameOvr) ? gameOvr : null,
                    ovr: Number.isFinite(ovr) ? ovr : null
                });
            }
            history = history.slice(-MAX_HISTORY);
        }
    }
    function saveHistory() {
        storeSet('copero99_history', history);
    }
    function loadHof() {
        const saved = storeGet('copero99_hof');
        hof = Array.isArray(saved) ? saved.filter(e => e && typeof e === 'object' && typeof e.seed === 'string').slice(-MAX_HOF) : [];
    }
    // Bumped whenever the Hall of Fame changes, so its list is only rebuilt then (renderHofList)
    let hofVersion = 0;
    function saveHof() {
        hofVersion++;
        storeSet('copero99_hof', hof);
    }
    function loadBoost() {
        const saved = storeGet('copero99_boost');
        boostMemo = saved && typeof saved.seed === 'string' && Number.isFinite(saved.ovr) ? saved : null;
    }
    function loadUi() {
        const saved = storeGet('copero99_ui');
        if (saved && typeof saved === 'object') {
            // Only the tab is remembered: after a reload the panel stays closed until you open it
            if (TABS.indexOf(saved.tab) >= 0) ui.tab = saved.tab;
            // "Your club" unless a theme was picked in Theme & font (older saves always named one, so they start on Your club)
            if (saved.themePicked && Object.prototype.hasOwnProperty.call(THEMES, saved.theme)) {
                ui.theme = saved.theme;
                ui.themePicked = true;
            }
            if (Object.prototype.hasOwnProperty.call(FONTS, saved.font)) ui.font = saved.font;
        }
    }
    function saveUi() {
        storeSet('copero99_ui', { tab: ui.tab, theme: ui.theme, themePicked: ui.themePicked, font: ui.font });
    }
    // A picked mode, and after the first season the boost, stay as they are, also through Load settings and Reset
    function keepLocked(next) {
        const keys = (stats.picked ? ['boostedOVR', 'ageBasedOVR', 'forceOVR99'] : [])
            .concat(careerStarted() ? ['boostTier', 'boostGrowth', 'boostCap', 'boostAbove', 'boostDecline', 'boostStart', 'boostStyle', 'boostPerks', 'boostSwing', 'boostPeak',
                'boostGoals', 'boostAssists', 'boostApps', 'boostRole'] : []);
        const kept = {};
        for (const key of keys) kept[key] = config[key];
        return { ...next, ...kept };
    }

