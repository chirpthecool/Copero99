    // ========================================================================
    // Boost rolls: levels, styles, perks, traits and the sealed report
    // ========================================================================

    // Marketable perk: 50% more
    const marketable = (value) => roundValue(value * 1.5);
    // Copero starts every career at this OVR (age 16)
    const GAME_START_OVR = 50;
    /**
     * Boost levels, weakest first. Each has its chance (weight, out of 100),
     * one of the game's OVR badge colours, and the ranges its numbers are
     * rolled from, [min, max]: start = OVR at 16, cap = potential, growth /
     * above in steps of 5; peakAge = [earliest, most likely, latest]
     * age to reach the potential (the best levels get there soonest). Simulated
     * on the game's development table (sim4.js): `peak` is the typical best OVR.
     * Durability (the share of drops felt) isn't part of the level: any roll
     * can be fragile or tough (DURABILITY).
     */
    const DURABILITY = [50, 95];
    // (twenty-second round, Chirp: the top rolls came up too often: 11 levels instead of 6, the top ones far rarer;
    // `rank` 0-5 places a level among the old six for its perks, its country tilt and its sealed hint)
    const BOOST_TIERS = {
        journeyman: { name: 'Journeyman', colour: 'iron', rank: 0, weight: 14, peak: 76, blurb: 'Lower leagues and long bus rides. You build this career one club at a time.',
            start: [48, 51], cap: [72, 77], growth: [100, 110], above: [15, 30], peakAge: [23, 26, 29] },
        hardWorker: { name: 'Hard worker', colour: 'bronze', rank: 0, weight: 21, peak: 82, blurb: 'A long climb to a solid career.',
            start: [50, 53], cap: [78, 83], growth: [100, 115], above: [20, 35], peakAge: [22, 26, 29] },
        teenSensation: { name: 'Teen sensation', colour: 'rose', rank: 1, weight: 6, peak: 81, blurb: 'The hype arrives at 17. Whether the career does is another story.',
            start: [62, 67], cap: [78, 83], growth: [100, 110], above: [15, 25], peakAge: [17, 19, 21] },
        steadyPro: { name: 'Steady pro', colour: 'silver', rank: 1, weight: 20, peak: 85, blurb: 'A step ahead of the pack. A good career, though the very top is a stretch.',
            start: [52, 57], cap: [82, 86], growth: [105, 125], above: [20, 30], peakAge: [21, 25, 28] },
        roughDiamond: { name: 'Diamond in the rough', colour: 'teal', rank: 2, weight: 6, peak: 87, blurb: 'Overlooked at 16, then a late rise into a star nobody saw coming.',
            start: [49, 53], cap: [84, 89], growth: [125, 145], above: [20, 30], peakAge: [24, 27, 29] },
        talented: { name: 'Talented', colour: 'gold', rank: 2, weight: 14, peak: 89, blurb: 'Grows faster than most and becomes a star, though 99 is rare.',
            start: [58, 64], cap: [86, 89], growth: [115, 135], above: [20, 30], peakAge: [20, 24, 28] },
        risingStar: { name: 'Rising star', colour: 'dawn', rank: 3, weight: 8, peak: 90, blurb: 'Climbing fast, with the big clubs already watching.',
            start: [60, 65], cap: [87, 91], growth: [120, 135], above: [20, 30], peakAge: [20, 24, 27] },
        wonderkid: { name: 'Wonderkid', colour: 'cyan', rank: 3, weight: 6, peak: 93, blurb: 'Ahead of everyone at 16 and climbing fast. A Ballon d’Or contender.',
            start: [64, 70], cap: [89, 92], growth: [120, 140], above: [20, 30], peakAge: [19, 23, 27], destiny: 0.05 },
        goldenBoy: { name: 'Golden boy', colour: 'aurum', rank: 4, weight: 3, peak: 94, blurb: 'The most talked-about teenager in the world, and everyone expects trophies.',
            start: [67, 72], cap: [90, 94], growth: [120, 140], above: [20, 30], peakAge: [19, 22, 26], destiny: 0.08 },
        generational: { name: 'Generational talent', colour: 'elite', rank: 4, weight: 1.5, peak: 96, blurb: 'A first-team player at 16 with a sky-high ceiling.',
            start: [70, 75], cap: [92, 95], growth: [125, 145], above: [20, 30], peakAge: [18, 22, 26], destiny: 0.15 },
        chosenOne: { name: 'The Chosen One', colour: 'special', rank: 5, weight: 0.5, peak: 99, blurb: 'A once-in-a-lifetime player: world class as a teenager, with 99 in sight.',
            start: [75, 80], cap: [96, 98], growth: [130, 150], above: [30, 45], peakAge: [17, 20, 24], destiny: 0.3 }
    };
    // A level's place among the old six (0 = Hard worker ... 5 = The Chosen One)
    const tierRank = (key) => (BOOST_TIERS[key] ? BOOST_TIERS[key].rank : 2);
    /**
     * Career styles a boost can roll: the shape of the career. [fromAge, value]
     * steps: growth scales the boosted gains, decline the drops felt, bonus
     * adds OVR per season played; start adds starting talent, retire moves the
     * age the body allows (see bodyAge), swing scales how hot or cold seasons
     * run, peakShift moves the rolled peak age (a Late Bloomer peaks later).
     */
    const BOOST_STYLES = {
        standard: { name: 'Standard', icon: '⚖️', weight: 20, blurb: 'Grows at the usual pace.' },
        prodigy: { name: 'Prodigy', icon: '⚡', weight: 12, peakShift: -2, start: 2, growth: [[16, 1.35], [20, 0.8], [22, 0.5]], decline: [[28, 1.2]], retire: -1,
            blurb: 'Fast rise and an early peak; fades a bit sooner.' },
        lateBloomer: { name: 'Late Bloomer', icon: '🌱', weight: 11, peakShift: 4, start: -3, growth: [[16, 0.6], [22, 1.2]], bonus: [[25, 1], [31, 0]], decline: [[16, 0.8]], retire: 1,
            blurb: 'Slow start, and a later peak than most.' },
        ironMan: { name: 'Iron Man', icon: '🛡️', weight: 10, growth: [[16, 0.95]], decline: [[16, 0.45]], retire: 2,
            blurb: 'Normal rise, then keeps their level deep into their 30s.' },
        shootingStar: { name: 'Shooting Star', icon: '☄️', weight: 8, peakShift: -3, start: 3, growth: [[16, 1.8], [19, 0.45], [21, 0.2]], decline: [[23, 1.5]], retire: -2,
            blurb: 'Explodes as a teenager, peaks early and burns out.' },
        bornReady: { name: 'Born Ready', icon: '💎', weight: 6, peakShift: -1, start: 8, growth: [[16, 0.55], [21, 0.8]], decline: [[30, 1.1]],
            blurb: 'Starts well ahead of their level, then grows slowly.' },
        rollercoaster: { name: 'Rollercoaster', icon: '🎢', weight: 8, swing: 2.5,
            blurb: 'Some seasons fly and some flop.' },
        secondWind: { name: 'Second Wind', icon: '🔁', weight: 7, peakShift: 1, decline: [[27, 1.4], [31, 0.4]], bonus: [[31, 3], [34, 0]], retire: 1,
            blurb: 'Dips in the late 20s, bounces back in the early 30s and lasts.' },
        workhorse: { name: 'Workhorse', icon: '🔨', weight: 10, peakShift: 1, growth: [[16, 0.8]], bonus: [[16, 1], [28, 0]], decline: [[16, 0.8]],
            blurb: 'A little better every season, with a later peak.' },
        metronome: { name: 'Metronome', icon: '⏱️', weight: 8, swing: 0.3, decline: [[16, 0.5], [33, 1.2]],
            blurb: 'Hardly a bad season: steady growth and a long, flat peak.' },
        glassCannon: { name: 'Glass Cannon', icon: '💥', weight: 6, growth: [[16, 1.25]], decline: [[16, 1.45]], retire: -1,
            blurb: 'Grows fast, but every setback hits twice as hard.' },
        phoenix: { name: 'Phoenix', icon: '🔥', weight: 6, peakShift: 2, growth: [[16, 1], [21, 0.4], [24, 1.4], [28, 1]], bonus: [[24, 1], [28, 0]],
            blurb: 'Stalls in the early 20s, then rises again stronger.' },
        slowBurner: { name: 'Slow Burner', icon: '🕯️', weight: 6, peakShift: 2, start: -2, growth: [[16, 0.75]], decline: [[16, 0.6]], retire: 1,
            blurb: 'Takes years to get going, then keeps it for longer.' },
        primeTime: { name: 'Prime Time', icon: '🌟', weight: 6, peakShift: 1, growth: [[16, 0.9], [23, 1.3], [27, 1]], bonus: [[24, 1], [27, 0]],
            blurb: 'Saves the best for the prime years: big seasons from 24 to 26.' }
    };
    // Most perks one roll brings
    const MAX_PERKS = 3;
    /**
     * Perks a roll can bring, with their chance by boost level (weakest level
     * first): the lower levels get more of the hard-working ones, the top ones
     * more of the glamour.
     */
    const PERKS = {
        bigClub: { name: 'Big-club interest', icon: '⭐', help: 'Your academy offer comes from three of the biggest clubs.', chance: [0, 0.05, 0.12, 0.3, 0.55, 0.8] },
        superAgent: { name: 'Super agent', icon: '💼', help: 'Your transfer offers come from clubs a level bigger.', chance: [0.1, 0.12, 0.14, 0.16, 0.18, 0.2] },
        extraOffer: { name: 'Extra club offer', icon: '🏟️', help: 'Every transfer window brings three clubs instead of two.', chance: [0.15, 0.15, 0.18, 0.22, 0.25, 0.3] },
        fastLearner: { name: 'Fast learner', icon: '📚', help: '+1 OVR every season until 21.', chance: [0.25, 0.18, 0.12, 0.08, 0.05, 0.04] },
        ironBody: { name: 'Iron body', icon: '🦾', help: 'Injuries cost you half as much OVR.', chance: [0.3, 0.2, 0.15, 0.12, 0.1, 0.1] },
        longCareer: { name: 'Long career', icon: '🧓', help: 'Your body lets you play two more years.', chance: [0.3, 0.2, 0.15, 0.12, 0.1, 0.1] },
        bigGame: { name: 'Big-game player', icon: '🎯', help: 'Ballon d’Or voters rate your seasons higher.', chance: [0.04, 0.06, 0.1, 0.15, 0.2, 0.25] },
        goldenGen: { name: 'Golden generation', icon: '🌍', help: 'Your country never misses a World Cup.', chance: [0.06, 0.06, 0.08, 0.1, 0.12, 0.14] },
        marketable: { name: 'Marketable', icon: '💰', help: 'Your market value is 50% higher.', chance: [0.15, 0.15, 0.15, 0.18, 0.2, 0.25] },
        talisman: { name: 'Talisman', icon: '🦸', help: 'You carry your club: while you’re 3+ above its level, it plays a level stronger at home and in Europe, so it wins more.', chance: [0.08, 0.08, 0.1, 0.12, 0.14, 0.16] },
        fanFavourite: { name: 'Fan favourite', icon: '🫶', help: 'A club you’ve played 3+ seasons for never lets you go (unless you’re banned).', chance: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12] },
        bornLeader: { name: 'Born leader', icon: '🎗️', help: 'You’re made captain sooner, at your clubs and for your country.', chance: [0.1, 0.1, 0.12, 0.12, 0.14, 0.16] },
        quickAdapter: { name: 'Quick adapter', icon: '🧭', help: 'You settle in at every new club: a move never turns out a bad fit.', chance: [0.15, 0.14, 0.12, 0.1, 0.1, 0.1] }
    };
    /**
     * Playing traits a roll can bring: more (or fewer) goals, assists or games
     * than Copero gives, each by its own rolled amount (%), so no two careers
     * are the same (config.boostGoals / boostAssists / boostApps). For each of
     * the three a roll has a 20% chance of the good one and 12% of the bad
     * one, at any level: [icon, name, [smallest, biggest] %]. A goalkeeper's
     * goals and assists traits are a keeper's own (`keeper`): clean sheets,
     * and goals conceded (the same roll: a good one means fewer).
     */
    const STAT_TRAITS = {
        boostGoals: { up: ['🥅', 'Natural finisher', [8, 30]], down: ['😬', 'Wasteful finisher', [8, 25]], keeper: { up: ['🧱', 'Brick wall'], down: ['🫠', 'Butterfingers'] } },
        boostAssists: { up: ['🪄', 'Visionary', [10, 35]], down: ['🙈', 'Tunnel vision', [10, 25]], keeper: { up: ['📣', 'Commanding presence'], down: ['🎲', 'Error-prone'] } },
        boostApps: { up: ['🔋', 'Ever-present', [5, 20]], down: ['🩹', 'Injury-prone', [8, 25]] }
    };
    const STAT_TRAIT_CHANCE = { up: 0.2, down: 0.12 };
    // A playing trait in words: [icon, name, what it does], or null for none; `keeper`: a goalkeeper's version
    function statTrait(key, value, keeper) {
        if (!STAT_TRAITS[key] || !value) return null;
        const side = value > 0 ? 'up' : 'down';
        const [icon, name] = keeper && STAT_TRAITS[key].keeper ? STAT_TRAITS[key].keeper[side] : STAT_TRAITS[key][side];
        const more = Math.abs(value) + '% ' + (value > 0 ? 'more ' : 'fewer ');
        const help = key === 'boostGoals' ? more + (keeper ? 'clean sheets' : 'goals') + ' than Copero gives you, every season'
            : key === 'boostAssists' ? (keeper ? Math.abs(value) + '% ' + (value > 0 ? 'fewer' : 'more') + ' goals conceded' : more + 'assists') + ' than Copero gives you, every season'
                : more + 'games every season' + (value > 0 ? ' (at most 50)' : '') + ', and the ' + (keeper ? 'clean sheets and goals conceded' : 'goals and assists') + ' that go with them';
        return [icon, name, help];
    }
    // The player on screen is a goalkeeper (the playing traits read for a keeper)
    const keeperOnScreen = () => !!currentState && !!currentState.player && playerRole(currentState.player) === 'goalkeeper';
    // The roll's playing traits that are on: [[key, value], ...]
    const statTraits = (cfg) => Object.keys(STAT_TRAITS).filter(key => (cfg || config)[key]).map(key => [key, (cfg || config)[key]]);
    const currentStyle = () => BOOST_STYLES[config.boostStyle] || BOOST_STYLES.standard;
    const currentTier = () => BOOST_TIERS[config.boostTier] || BOOST_TIERS.talented;
    const hasPerk = (key) => config.boostPerks.indexOf(key) >= 0;
    // Sandbox modifiers (Chirp: more of Boost's modifiers in Sandbox): the Boost perks that don't clash with
    // Sandbox's own switches (its club offers, Always qualify, the OVR it sets), picked by hand, and the playing and role traits
    const SANDBOX_PERKS = ['bigGame', 'marketable', 'talisman', 'fanFavourite', 'bornLeader'];
    // The career's perks: Boost's roll, or Sandbox's picks (none in Vanilla)
    const perkOn = (key) => {
        const mode = currentMode();
        return mode === 'boost' ? hasPerk(key) : !!mode && config.sandboxPerks.indexOf(key) >= 0;
    };
    // The career's playing and role traits, under Boost's names (statTraits, roleTraitStep): Boost's roll or Sandbox's picks
    const activeTraits = () => (currentMode() === 'boost' ? config
        : { boostGoals: config.sandboxGoals, boostAssists: config.sandboxAssists, boostApps: config.sandboxApps, boostRole: config.sandboxRole });
    // Talisman: the perk, or earned (Chirp: passive for really good players who already have good traits): 88+ OVR
    // and two good things among a playing trait above Copero's numbers, a role trait that lifts you and the perks
    const TALISMAN_EARNED = { ovr: 88, good: 2 };
    function talismanOn(state) {
        if (perkOn('talisman')) return true;
        const mode = currentMode();
        if (!mode || (Number(state && state.player && state.player.overall) || 0) < TALISMAN_EARNED.ovr) return false;
        const t = activeTraits();
        const role = ROLE_TRAITS[t.boostRole];
        const good = Object.keys(STAT_TRAITS).filter(key => t[key] > 0).length + (role && role.step > 0 ? 1 : 0) +
            (mode === 'boost' ? config.boostPerks.length : config.sandboxPerks.length);
        return good >= TALISMAN_EARNED.good;
    }
    // A rolled boost is a sealed scouting report until the career ends: the card shows one obscure line, not the level,
    // numbers, style, perks or traits. Opening Adjust this boost breaks the seal (and the Hall of Fame)
    const boostSealed = () => stats.picked === 'boost' && stats.rolled !== null && !stats.peeked && !(currentState && currentState.phase === 'summary');
    // The sealed report's line: about the level (each line is shared by two levels) or the career style, new every roll
    const SEALED_LEVEL_HINTS = [
        ['The scouts’ notes on you are short.', 'A name you will have to earn.', 'Nobody drove far to watch you play.'],
        ['One scout underlined your name twice.', 'Your file is thicker than most.', 'A few clubs asked for your video.'],
        ['The scouting office stopped arguing about you.', 'Someone there hasn’t slept since your trial.', 'Your file came with a second folder.']
    ];
    const SEALED_STYLE_HINTS = {
        standard: 'An ordinary page, for now.', prodigy: 'Something about you arrives early.', lateBloomer: 'Patience will be asked of you.',
        ironMan: 'Your body keeps a quiet promise.', shootingStar: 'Bright. Maybe too bright.', bornReady: 'A man at sixteen, they wrote.',
        rollercoaster: 'Expect weather.', secondWind: 'Don’t write off your thirties.', workhorse: 'Sweat is all over the file.',
        metronome: 'Tick, tock.', glassCannon: 'Handle with care.', phoenix: 'Something burns, then rises.', slowBurner: 'A long fuse.',
        primeTime: 'Saves the best for the middle.'
    };
    function sealedHint() {
        const rng = seeded(String((currentState || {}).seed) + ':sealed:' + [config.boostTier, config.boostStyle, config.boostPeak, config.boostStart].join(':'));
        const level = Math.floor(tierRank(config.boostTier) / 2);
        const lines = SEALED_LEVEL_HINTS[clamp(level, 0, 2)];
        const pick = lines[Math.floor(rng() * lines.length)];
        return rng() < 0.5 || !SEALED_STYLE_HINTS[config.boostStyle] ? pick : SEALED_STYLE_HINTS[config.boostStyle];
    }
    // Starting talent with the style's share (the OVR at 16 stays between 50 and 86)
    const startTalent = () => clamp(config.boostStart + (currentStyle().start || 0), -3, 36);
    // The value a style's [fromAge, value] steps give at an age (the last step reached)
    function styleStep(steps, age, base) {
        let value = base;
        for (const [from, v] of steps || []) {
            if (age >= from) value = v;
        }
        return value;
    }
    // Boost rerolls left before the first season: one free one, unlimited once Adjust this boost was opened (that career is out of the Hall of Fame anyway)
    const rerollsLeft = () => (stats.peeked ? Infinity : stats.rerolled ? 0 : 1);
    // The peak age for a level and style: the level's range, moved by the style (a Late Bloomer later, a Prodigy sooner)
    const rollPeak = (tierKey, styleKey) => clamp(triangle(BOOST_TIERS[tierKey].peakAge) + (BOOST_STYLES[styleKey].peakShift || 0), LIMITS.boostPeak[0], LIMITS.boostPeak[1]);
    // Where a player comes from tilts the roll a little: a big footballing country (Copero's world name for it, 0-5) makes
    // the best levels a little likelier and adds a point of starting OVR, a small one the other way. Never decisive: a
    // Chosen One from a small country still happens, a bit less often (world name 5: The Chosen One ×1.2, Hard worker ×0.8;
    // world name 0: ×0.87 and ×1.13). `start`: starting OVR by world name
    const NATION_EDGE = { tier: 0.08, start: { 0: -1, 4: 1, 5: 1 } };
    // A country we can't read (no nationality) counts as an average one: no tilt either way
    const nationFame = (nat) => { const rep = Number((nat || {}).international_reputation); return (nat && Number.isFinite(rep)) ? clamp(rep, 0, 5) : 2; };
    // A level's chance in a roll, tilted by the player's country (NATION_EDGE)
    const tierWeight = (key, nat) => BOOST_TIERS[key].weight * (1 + NATION_EDGE.tier * (nationFame(nat) - 2) / 3 * (tierRank(key) - 2.5));
    // A whole new boost: level first, then its numbers from the level's ranges, a career style, its peak age and perks.
    // `nat`: the player's country (Copero's record), which tilts the level and the start (NATION_EDGE)
    function rollBoost(nat) {
        const levels = Object.keys(BOOST_TIERS);
        config.boostTier = weightedPick(levels, key => tierWeight(key, nat));
        const tier = BOOST_TIERS[config.boostTier];
        const between = ([min, max], step) => min + step * Math.floor(Math.random() * ((max - min) / step + 1));
        config.boostStart = clamp(between(tier.start, 1) - GAME_START_OVR + (NATION_EDGE.start[nationFame(nat)] || 0), LIMITS.boostStart[0], LIMITS.boostStart[1]);
        // Now and then a career is destined for 99 (`destiny` of a level's rolls): potential 99, and the hard ceiling past
        // 94 (HIGH_OVR) doesn't hold it back
        config.boostCap = Math.random() < (tier.destiny || 0) ? 99 : between(tier.cap, 1);
        config.boostGrowth = between(tier.growth, 5);
        config.boostAbove = between(tier.above, 5);
        config.boostDecline = between(DURABILITY, 5);
        config.boostStyle = weightedPick(Object.keys(BOOST_STYLES), key => BOOST_STYLES[key].weight);
        config.boostPeak = Math.max(rollPeak(config.boostTier, config.boostStyle), soonestPeak());
        const level = tierRank(config.boostTier);
        const perks = Object.keys(PERKS).filter(key => Math.random() < PERKS[key].chance[level]);
        while (perks.length > MAX_PERKS) perks.splice(Math.floor(Math.random() * perks.length), 1);
        config.boostPerks = perks;
        // Playing traits: some careers score, create or play more (or less) than Copero would have them, each by its own amount
        for (const key of Object.keys(STAT_TRAITS)) {
            const roll = Math.random();
            const side = roll < STAT_TRAIT_CHANCE.up ? 'up' : roll < STAT_TRAIT_CHANCE.up + STAT_TRAIT_CHANCE.down ? 'down' : null;
            config[key] = side ? (side === 'up' ? 1 : -1) * between(STAT_TRAITS[key][side][2], 1) : 0;
        }
        // A role trait in about one roll in three (the good ones likelier)
        let role = Math.random();
        config.boostRole = Object.keys(ROLE_TRAITS).find(key => (role -= ROLE_TRAITS[key].chance) < 0) || '';
        saveConfig();
        // The Hall of Fame only takes careers whose boost is still the one rolled
        stats.rolled = boostSig();
        saveStats();
        if (menuElement) updateMenuUI();
    }
    // The boost's settings in one text, to tell whether they were changed by hand after the roll
    function boostSig(cfg) {
        const c = cfg || config;
        return ['v4', c.boostTier, c.boostGrowth, c.boostCap, c.boostAbove, c.boostDecline, c.boostStart, c.boostStyle, c.boostPerks.join('+'), c.boostSwing, c.boostPeak,
            c.boostGoals, c.boostAssists, c.boostApps, c.boostRole || ''].join('|');
    }
    // The boost defaults of versions before 1.0
    const LEGACY_BOOST = { boostGrowth: 125, boostCap: 90, boostAbove: 40, boostDecline: 70, boostStart: 3, boostStyle: 'standard', boostPerk: false, boostSwing: 15, boostExtra: false };
    // The boost as text the way versions before 1.0 wrote it (so an in-progress career stays "as rolled" across the update)
    const legacySig = (c) => [c.boostGrowth, c.boostCap, c.boostAbove, c.boostDecline, c.boostStart, c.boostStyle, !!c.boostPerk, c.boostSwing, !!c.boostExtra].join('|');
    // Before 1.0 the boost level was named from its numbers
    function legacyTier(c) {
        const score = (c.boostGrowth - 105) / 45 + (c.boostCap - 86) / 6 + (c.boostAbove - 20) / 30 + (90 - c.boostDecline) / 35 + c.boostStart / 6;
        return score >= 3.4 ? 'generational' : score >= 2.8 ? 'wonderkid' : score >= 2 ? 'talented' : 'steadyPro';
    }
    // "Rare · about 1 in 11 careers"
    function tierRarity(tier) {
        const word = tier.weight >= 18 ? 'Common' : tier.weight >= 10 ? 'Uncommon' : tier.weight >= 5 ? 'Rare' : tier.weight >= 2 ? 'Epic' : tier.weight >= 1 ? 'Legendary' : 'Mythic';
        return word + ' · about 1 in ' + Math.round(100 / tier.weight) + ' careers';
    }

