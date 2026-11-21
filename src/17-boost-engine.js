    // ========================================================================
    // Boost season by season: the planned path, form, ageing and applying it
    // ========================================================================

    // How one season went for the boost: up to boostSwing % (times the style's swing) better or worse, repeatable per season
    function seasonForm(seed, index) {
        const swing = Math.min(0.6, config.boostSwing / 100 * (currentStyle().swing || 1));
        return 1 + swing * (2 * seeded(seed + ':form:' + index)() - 1);
    }
    // How front-loaded the planned path is (1 = straight line; it was 1.5, which got too many careers near their best by 19-21)
    const PLAN_BEND = 1.15;
    // Boost: where the OVR should be at an age, from the start at 16 up to the potential at the peak age (a little quicker at first)
    function plannedOvr(age) {
        const start = GAME_START_OVR + startTalent();
        const t = clamp((age - CURVE_MIN_AGE) / Math.max(1, config.boostPeak - CURVE_MIN_AGE), 0, 1);
        return start + (config.boostCap - start) * (1 - Math.pow(1 - t, PLAN_BEND));
    }
    // Share of the gap to the planned OVR a season before the peak age closes (the last season before it closes more)
    const PEAK_PULL = 0.5;
    const PEAK_PULL_LAST = 0.8;
    // Before the peak age, OVR more than AHEAD_SLACK above the planned path keeps only AHEAD_KEEP of what's above it
    const AHEAD_SLACK = 2;
    const AHEAD_KEEP = 0.5;
    // Most OVR the boost lets a season add (Copero's events come on top): an early peak age used to pull a wonderkid up 15
    // in one season (66 at 16, 81 at 17), real ones rise a few points a year
    const MAX_SEASON_GAIN = 7;
    // The soonest peak age a roll can have: the start has to grow into the potential at no more than MAX_SEASON_GAIN a season
    const soonestPeak = () => clamp(CURVE_MIN_AGE + Math.ceil((config.boostCap - GAME_START_OVR - startTalent()) / MAX_SEASON_GAIN), LIMITS.boostPeak[0], LIMITS.boostPeak[1]);
    // Growth past the potential after the peak age goes a little slower (the brake before the peak age keeps most careers
    // from passing their potential early, so this gives some of that back: sim8, Generational talent 99 in 4% of careers)
    const ABOVE_AFTER_PEAK = 0.8;
    // 95 and up is for the very few: past `from` only `keep` of a season's growth counts (boostStep)
    const HIGH_OVR = { from: 94, keep: 0.2 };
    // The air is thin at the top (twenty-second round, Chirp: 94+ seasons lasted too long; staying there should be rare,
    // mostly up to events and hot spells): a season that ends above `line` loses part of what's above it, more for every
    // season already played at `at`+ (pressure, niggles, a dressing room that expects it every week), at most `max`. A
    // first spell up there is cheap; a long reign is not. Careers destined for 99 feel only `destined` of it
    // (sim9.js: see the CLAUDE.md twenty-second round)
    const THIN_AIR = { at: 94, line: 92, base: 0.1, per: 0.12, max: 0.7, destined: 0.35 };
    const eliteSeasons = (seasons, upto) => seasons.slice(0, upto).filter(s => s && Number(s.overall) >= THIN_AIR.at).length;
    /**
     * One season of the boost: from an OVR (unrounded) and the game's change
     * that season (its own development, without Copero's events), the boosted
     * OVR. Gains are multiplied up to the potential and slowed past it (from
     * the peak age on half as fast); drops are softened below it and felt
     * in full at or above it; the style scales both by age. Before the peak
     * age a season that falls behind the planned path is pulled toward it, so
     * the player reaches the potential around that age. `worn`: playing on
     * past the age the body allows (growth mostly stops, drops hurt more).
     * `fade`: drops hurt this much more (a career ageing badly, MILK).
     */
    function boostStep(from, change, age, form, worn, fade, elite) {
        const style = currentStyle();
        const styleGrowth = styleStep(style.growth, age, 1) * (worn ? 0.25 : 1);
        const rising = !worn && age < config.boostPeak;
        let to;
        if (change > 0) {
            const growth = config.boostGrowth / 100 * form * styleGrowth;
            const room = Math.max(0, config.boostCap - from);
            to = change * growth <= room ? from + change * growth
                : from + room + (change - room / growth) * config.boostAbove * (rising ? 1 : ABOVE_AFTER_PEAK) / 100 * styleGrowth;
        } else {
            const taken = (from < config.boostCap ? config.boostDecline / 100 * (2 - form) : 1) * styleStep(style.decline, age, 1) * (fade || 1);
            to = from + change * taken;
        }
        const plan = plannedOvr(age + 1);
        if (rising && to < plan) to += (plan - to) * (age + 1 >= config.boostPeak ? PEAK_PULL_LAST : PEAK_PULL);
        // Running well ahead of the plan before the peak age: only part of the lead (up to the potential) is kept, so a big
        // early jump still shows but most careers reach their best near their peak age, not at 19
        else if (rising && change > 0) {
            const ahead = Math.min(to, config.boostCap) - plan - AHEAD_SLACK;
            if (ahead > 0) to = Math.max(from, to - ahead * (1 - AHEAD_KEEP));
        }
        // Past HIGH_OVR.from every point comes hard: only `keep` of a season's growth above it counts
        const hard = Math.max(from, HIGH_OVR.from);
        if (to > hard && config.boostCap < 99) to = hard + (to - hard) * HIGH_OVR.keep;
        // Thin air (THIN_AIR): the more seasons already at the top, the harder the next one is to hold
        if (elite && to > THIN_AIR.line) to -= (to - THIN_AIR.line) * Math.min(THIN_AIR.max, THIN_AIR.base + THIN_AIR.per * elite) * (config.boostCap >= 99 ? THIN_AIR.destined : 1);
        // Never more than MAX_SEASON_GAIN a season (or Copero's own gain, if that was bigger)
        return Math.min(to, from + Math.max(change, MAX_SEASON_GAIN));
    }
    /**
     * Form (Boost): how a season went, as -2..+2 OVR for the season after it
     * (a ban season -2). It never adds up: each season's form replaces the one
     * before. Worked out once, when the season is first seen (recordSeasons).
     */
    function seasonPerf(seasons, index) {
        const season = seasons[index];
        if (!season) return 0;
        return season.suspended ? -2 : Number(season.c99Form) || 0;
    }
    /**
     * A season's form from Copero's own numbers, before the script changes
     * them: only the luck in it. Copero picks the games from the role's range
     * (the role comes from your OVR against the club's level, or from an
     * event) and the goals and assists a game from the role, that gap and the
     * club, give or take 10%. So a move to a bigger club, an event that benches
     * you (finishing school, choosing your country over your club, an injury)
     * or a playing trait is no form at all; only where the season fell in
     * those ranges is. `lift`: the club's home and continental strength was
     * that much higher during the click (Talisman). 0 when it can't be read.
     */
    function formOf(season, role, lift) {
        const s = season.stats || {};
        const apps = Number(s.appearances) || 0;
        if (!apps || !gameData.teams[season.teamId]) return 0;
        const keeper = role === 'goalkeeper';
        const rep = repOf(season.teamId);
        const domestic = clamp(rep[0] + ((lift && lift[0]) || 0), 0, 5);
        const continental = rep[1] + ((lift && lift[1]) || 0);
        const factor = domestic === 0 ? 0.7 : domestic === 1 ? 0.8 : continental === 0 ? 0.9 : 1;
        // Copero's ranges follow on from each other (5-14, 15-24, 25-39, 40-50), so the games say the role and the luck in it
        const raw = apps / factor;
        const range = Object.values(keeper ? KEEPER_GAMES : ROLE_GAMES).find(([lo, hi]) => raw >= lo - 0.75 && raw <= hi + 0.75);
        const games = range && range[1] > range[0] ? clamp((raw - range[0]) / (range[1] - range[0]) * 2 - 1, -1, 1) : 0;
        // Goals and assists (a goalkeeper's goals conceded) against what Copero gives that role, gap and club before its ±10%
        const ovr = Number(season.overall) || 0;
        const gap = ovr - CLUB_LEVEL[clamp(rep[2], -1, 5)];
        let rate = 0;
        if (keeper) {
            const expected = apps * KEEPER_CONCEDED[domestic] * keeperGapFactor(gap);
            if (expected >= 4) rate = clamp((expected - (Number(s.goalsConceded) || 0)) / (0.1 * expected), -1, 1);
        } else if (GOAL_RATES[role]) {
            const band = gapBand(gap);
            const expected = apps * HOME_SCORING[domestic] * ovrScoring(ovr) * (GOAL_RATES[role][band] + 0.6 * ASSIST_RATES[role][band]);
            if (expected >= 4) rate = clamp(((Number(s.goals) || 0) + 0.6 * (Number(s.assists) || 0) - expected) / (0.1 * expected), -1, 1);
        }
        // About 1 season in 4 is ±1, 1 in 40 ±2
        const score = games + rate;
        return Math.sign(score) * (Math.abs(score) >= 1.7 ? 2 : Math.abs(score) >= 1 ? 1 : 0);
    }
    let lastBoostSeasons = 0;  // How many seasons the last boost note covers
    // Boost: about 1 career in 5 ages like milk after its prime (hidden, like the retirement age): from three seasons past
    // the peak age (28 at the earliest) drops hurt 60% more and a point goes every season on top. Never with a style that
    // promises a long peak (Iron Man, Metronome, Second Wind)
    // Boost from 30 (Chirp: big drops only from injuries or wear, not because of the age): Copero's own
    // drop for a season counts at most `cap` at 70 OVR, `per` more for each OVR above it (`min`-`max`): an 88 drifts at
    // most about 2 a season, a 70 at most 1 (Copero's table reaches -5 a season at 38)
    const AGE_DRIFT = { from: 30, cap: 1, per: 0.06, min: 0.75, max: 2 };
    const ageDrift = (own, age, ovr) => (age >= AGE_DRIFT.from && own < 0 ? Math.max(own, -clamp(AGE_DRIFT.cap + AGE_DRIFT.per * (ovr - 70), AGE_DRIFT.min, AGE_DRIFT.max)) : own);
    const MILK = { chance: 0.22, after: 3, from: 28, decline: 1.6, toll: 1, never: ['ironMan', 'metronome', 'secondWind'] };
    const agesBadly = (seed) => MILK.never.indexOf(config.boostStyle) < 0 && hashText(String(seed) + ':milk') % 1000 < MILK.chance * 1000;
    const milkAge = () => Math.max(MILK.from, config.boostPeak + MILK.after);
    // Copero's development curve for a rolled peak age (its early developers level off around 24, normal ones 26, late ones
    // 29; it rolls them 10 / 80 / 10%): with the curve that fits, Copero's own growth comes when the boost wants it, so
    // careers peak near their age more often (sim7.js: 82% → 89% within 2 years; peaks, 99s and Ballon d'Ors the same)
    const devProfile = (peak) => (peak <= 20 ? 'early' : peak >= 26 ? 'late' : 'normal');
    // Before the first season (every two-year cycle Copero rolls reads it); goalkeepers have Copero's one keeper curve
    function setDevProfile(state, player) {
        if (state.seasons.length || playerRole(player) === 'goalkeeper') return;
        const profile = devProfile(config.boostPeak);
        if (player.developmentProfile !== profile) {
            player.developmentProfile = profile;
            changed = true;
        }
    }
    /**
     * Boost: the game still rolls every OVR change; the script boosts it
     * season by season (boostStep), so the seasons inside a decision show the
     * boosted OVR too (the game records each season's OVR before the script
     * sets the new one). `boostMemo` remembers the OVR the script last left and
     * what it has seen, so each change is boosted once (also across reloads).
     */
    function applyBoost(state, player) {
        const ovr = Number(player.overall);
        if (!Number.isFinite(ovr)) return;
        const seed = String(state.seed);
        setDevProfile(state, player);

        // The memo keeps the seed as text, so compare as text (otherwise a number seed would look like a new career every pass)
        if (!boostMemo || boostMemo.seed !== seed) {
            // First look at this career: only a brand-new one gets a new roll and the starting talent
            lastBoostNote = '';
            const isNew = state.seasons.length === 0;
            if (isNew && config.boostRandom) rollBoost(player.nationality);
            setDevProfile(state, player);
            const talent = isNew ? startTalent() : 0;
            setBoostedOVR(state, player, clamp(ovr + talent, CURVE_MIN_OVR, CURVE_MAX_OVR), talent, 0);
            return;
        }

        // Before the first season the starting talent can still change (reroll, style, slider): the OVR moves with it
        const talent = startTalent();
        if (state.seasons.length === 0 && ovr === boostMemo.ovr && Number.isFinite(boostMemo.start) && boostMemo.start !== talent) {
            setBoostedOVR(state, player, clamp(ovr + talent - boostMemo.start, CURVE_MIN_OVR, CURVE_MAX_OVR), talent, 0);
            return;
        }

        const seen = Number.isFinite(boostMemo.seasons) ? Math.min(boostMemo.seasons, state.seasons.length) : state.seasons.length;
        const fresh = state.seasons.slice(seen);
        const events = decisionEvents(state);
        if (!fresh.length && !events.length && ovr === boostMemo.ovr) return;

        const from = boostMemo.ovr;
        const style = currentStyle();
        // Copero's own events (training, injuries, ...) count exactly as the game says, unboosted (Iron body: injuries half)
        let rawNow = 0, now = 0, later = 0, after = null;
        for (const effect of events) {
            rawNow += effect.now;
            now += effect.injury && hasPerk('ironBody') ? Math.trunc(effect.now / 2) : effect.now;
            later += effect.later;
            if (effect.later && effect.after) after = effect.after;
        }
        // The game's own OVR at the start of each season, and at the end (a season without one counts as unchanged)
        const raws = [];
        for (const season of fresh) {
            const value = Number(season.overall);
            raws.push(Number.isFinite(value) ? value : raws.length ? raws[raws.length - 1] : clamp(from + rawNow, CURVE_MIN_OVR, CURVE_MAX_OVR));
        }
        raws.push(ovr);
        // A season's age (one without it is taken as the seasons just before the player's age now)
        const ageOf = (k) => Number(fresh[k].age) || Math.max(CURVE_MIN_AGE, (Number(player.age) || CURVE_MIN_AGE) - (fresh.length - k));
        // Playing on near the end (twilight stage 2+), judged on the decision as it was when chosen; a farewell (or a last
        // dance) is free, and so is a stretch a career event decided (Chirp: an event's OVR should stay yours: the
        // cost is for choosing to play on at a club decision)
        const farewell = !!stats.farewell && Number(state.step) === stats.farewell;
        const eventStretch = (Array.isArray(state.log) ? state.log : []).slice(Number(boostMemo.log) || 0).some(e => e && e.type === 'career_event_selected');
        // (twilightSeasons already judged the new seasons' stretch: c99Wear)
        const judged = fresh.length && Number.isFinite(fresh[0].c99Wear) ? fresh[0].c99Wear : null;
        const worn = farewell || eventStretch ? 0 : judged !== null ? judged : twilight(state, fresh.length ? ageOf(0) : Number(player.age) || CURVE_MIN_AGE, from, seen).wear;
        // Unrounded, so small changes add up; what's left over after rounding is kept for next time. The OVR on screen
        // carries the last season's form, which the boost itself doesn't build on
        const lastForm = Number(boostMemo.perf) || 0;
        const milk = agesBadly(seed);
        let faded = false;
        const perfOf = (index) => seasonPerf(state.seasons, index);
        let path = from - lastForm + (Number(boostMemo.frac) || 0) + now;
        let forms = 0;
        if (fresh.length) {
            setSeasonOvr(fresh[0], clamp(from + now, CURVE_MIN_OVR, CURVE_MAX_OVR));
        } else {
            // No season played (the game changed the OVR between seasons): the change counts as one season now
            const age = Number(player.age) || CURVE_MIN_AGE;
            const change = ovr - from - rawNow - later;
            forms = change ? seasonForm(seed, state.seasons.length) : 1;
            path = clamp((change ? boostStep(path, change, age, forms, worn) : path) + later, CURVE_MIN_OVR, CURVE_MAX_OVR);
        }
        let rusted = 0, knocked = 0;
        for (let k = 0; k < fresh.length; k++) {
            const age = ageOf(k);
            // A temporary setback is given back after its seasons (or at the end of the stretch)
            const back = later && (after ? after === k + 1 : k === fresh.length - 1) ? later : 0;
            // The game's change that season, without its events; some styles and perks add a little each season
            const fading = milk && !worn && age >= milkAge();
            faded = faded || fading;
            const change = ageDrift(raws[k + 1] - raws[k] - back, age, path) +
                styleStep(style.bonus, age, 0) + (hasPerk('fastLearner') && age < 21 ? 1 : 0) - (fading ? MILK.toll : 0);
            const form = seasonForm(seed, seen + k);
            forms += form;
            // A ban costs OVR to rust (banFallout), felt in full at its first season
            const rust = fresh[k].suspended && banStart(state.seasons, seen + k) === seen + k ? banFallout(state, seen + k).rust : 0;
            rusted += rust;
            // A knock while playing on past your body (twilightSeasons)
            const knock = Number(fresh[k].c99Knock) || 0;
            knocked += knock;
            // How the stint at the club is going (clubFit), felt in full like the rust
            path = clamp(boostStep(path, change, age, form, worn, fading ? MILK.decline : 1, eliteSeasons(state.seasons, seen + k + 1)) + back - rust - knock - wearCost(worn) + clubFit(state, seen + k) + fitRegain(state, seen + k), CURVE_MIN_OVR, CURVE_MAX_OVR);
            if (k + 1 < fresh.length) setSeasonOvr(fresh[k + 1], clamp(Math.round(path + perfOf(seen + k)), CURVE_MIN_OVR, CURVE_MAX_OVR));
        }
        const perf = fresh.length ? perfOf(seen + fresh.length - 1) : lastForm;
        const next = clamp(Math.round(path + perf), CURVE_MIN_OVR, CURVE_MAX_OVR);
        // What the player needs: the OVR change, and whether it was a hot or cold stretch (or the toll of playing on)
        const average = forms / Math.max(1, fresh.length);
        const span = fresh.length > 1 ? 'stretch' : 'season';
        const mood = farewell ? ({ last: ' · last dance', home: ' · back home' }[stats.farewellWay] || ' · farewell season') : worn ? ' · playing on near the end' : faded ? ' · age is catching up' : average >= 1.07 ? ' · hot ' + span : average <= 0.93 ? ' · cold ' + span : '';
        const formNote = fresh.length && perf ? (perf > 0 ? ' · in form (' : ' · out of form (') + signed(perf) + ')' : '';
        const fit = fresh.length ? clubFit(state, seen + fresh.length - 1) : 0;
        const club = fit ? clubName(fresh[fresh.length - 1].teamId, true) : '';
        const regained = fresh.length ? fitRegain(state, seen + fresh.length - 1) : 0;
        const fitNote = (!club ? '' : fit > 0 ? ' · thriving at ' + club : ' · not clicking at ' + club) + (regained ? ' · finding your best again' : '');
        lastBoostNote = (next === from ? 'No change' : signed(next - from) + ' OVR') + mood + formNote + fitNote + (rusted ? ' · rusty after the ban (' + signed(-rusted) + ')' : '') +
            (knocked ? ' · a knock (' + signed(-knocked) + ')' : '');
        lastBoostSeasons = fresh.length;
        setBoostedOVR(state, player, next, undefined, path + perf - next, perf);
    }
    function setSeasonOvr(season, ovr) {
        if (season.overall !== ovr) {
            season.overall = ovr;
            changed = true;
        }
    }
    // Copero's events since the boost last looked (normally the one chosen at this decision)
    function decisionEvents(state) {
        const log = Array.isArray(state.log) ? state.log : [];
        if (Number.isFinite(boostMemo.log)) return log.slice(boostMemo.log).map(eventEffect).filter(Boolean);
        // Remembered by an older version, which only kept the total
        const total = Number.isFinite(boostMemo.events) ? eventsTotal(state) - boostMemo.events : 0;
        return total ? [{ now: total, later: 0, after: null, injury: false }] : [];
    }
    // Remembers the OVR the boost left (and what was left over after rounding), the starting talent it gave, the form in it and what it has seen
    function setBoostedOVR(state, player, ovr, start, frac, perf) {
        if (player.overall !== ovr) changed = true;
        player.overall = ovr;
        const same = !!boostMemo && boostMemo.seed === String(state.seed);
        boostMemo = {
            seed: String(state.seed),
            ovr: ovr,
            start: start !== undefined ? start : same ? boostMemo.start : undefined,
            // Never goes down, so a season seen twice can't be boosted twice
            seasons: Math.max(state.seasons.length, (same && boostMemo.seasons) || 0),
            log: Array.isArray(state.log) ? state.log.length : 0,
            events: eventsTotal(state),
            frac: Number.isFinite(frac) ? frac : 0,
            perf: Number.isFinite(perf) ? perf : 0
        };
        storeSet('copero99_boost', boostMemo);
    }

