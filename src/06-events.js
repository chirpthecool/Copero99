    // ========================================================================
    // Copero's career events: their OVR effects, lucky outcomes, plain versions and the card click
    // ========================================================================

    // The good side of Copero's random event outcomes (Ci in the game): [from, to) of the first number the game draws for
    // the event. Each event has one risky choice, except injury_at_peak, where both choices roll and under 0.3 is good for both
    const LUCKY_ROLLS = {
        training_extra: [0, 0.65], personal_coach: [0, 0.5], mysterious_substance: [0.25, 1], honesty_test: [0.5, 1],
        indecent_proposal: [0.5, 1], season_load: [0, 0.65], position_competition: [0, 0.5], giant_tattoo: [0, 0.7],
        injury_at_peak: [0, 0.3], decisive_penalty: [0, 0.5]
    };
    /**
     * Lucky events: Copero rolls an event's outcome with the first number
     * of the career's random state (a xorshift, like `seeded`), so the state
     * is nudged until that number lands on the good side. Everything after
     * it is simply a different (still random) story.
     */
    function makeLucky(state, event) {
        const range = LUCKY_ROLLS[event.eventKey];
        if (!range) return;
        // The game's next random state; its value / 2^32 is the number drawn
        const next = (n) => {
            n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
            return (n >>> 0) || 1;
        };
        const good = (n) => next(n) / 4294967296 >= range[0] && next(n) / 4294967296 < range[1];
        let rng = (Number(state.rngState) >>> 0) || 1;
        // Stepping through the game's own sequence (neighbouring states draw almost the same number)
        for (let tries = 0; tries < 1000 && !good(rng); tries++) rng = next(rng);
        if (rng === state.rngState) return;
        state.rngState = rng;
        noteCheat('Lucky events');
    }
    // Stories Copero wrote but never tells: the plain versions of three events, and two story scenes from its debug panel

    // Copero has a plain extra training (+3 / -2 OVR, 70%), personal coach (+2 / -2, 50/50) and season workload (70%),
    // but its event plan always picks their special version (a preseason camp, a nutrition plan, a double session)
    const PLAIN_EVENTS = ['training_extra', 'personal_coach', 'season_load'];
    /**
     * Boost and Sandbox: half of those events are the plain version again.
     * It is the same event without its variant, so Copero draws its own plain
     * card and pictures and rolls the plain odds; eventEffect and Lucky events
     * read the variant from it too. Decided once per event, before it's drawn.
     */
    function applyPlainEvent(state, event, mode) {
        if (!mode || PLAIN_EVENTS.indexOf(event.eventKey) < 0 || !event.variantKey || event.c99Plain !== undefined) return;
        event.c99Plain = seeded(String(state.seed) + ':plain:' + event.id)() < 0.5;
        if (!event.c99Plain) return;
        delete event.variantKey;
        changed = true;
    }
    /**
     * The OVR a Copero event changes, from the game's log entry for it (the
     * game works these out in its own code, Ci; this is the same table):
     * { now, later, after, injury }. `now` is applied when you choose, `later`
     * is given back by the game after `after` seasons (or at the end of the
     * stretch when null): e.g. -2 now and +2 later for a temporary setback.
     * A blocked injury has no OVR change. Null when the entry changes no OVR.
     */
    function eventEffect(entry) {
        const p = entry && entry.type === 'career_event_selected' && entry.payload;
        if (!p) return null;
        const good = p.outcomeKind === 'positive';
        const now = (n) => ({ now: n, later: 0, after: null, injury: false });
        const setback = (n, after) => ({ now: -n, later: n, after: after || null, injury: false });
        switch (p.eventKey + ':' + p.optionKey) {
            case 'injury:continue': return { ...now(Number(p.overallDelta) || 0), injury: true };
            case 'training_extra:accept': return now(p.variantKey === 'preseason_camp' ? (good ? 4 : -3) : (good ? 3 : -2));
            case 'personal_coach:accept': return now(good ? (p.variantKey === 'nutrition_plan' ? 3 : 2) : -2);
            case 'mysterious_substance:consume': return now(good ? 5 : 0);
            case 'honesty_test:accept': return now(good ? 2 : 0);
            case 'indecent_proposal:proceed': return now(good ? 2 : -2);
            case 'giant_tattoo:accept': return now(good ? 2 : 0);
            case 'finish_high_school:accept': return now(1);
            case 'injury_at_peak:play_injured': return now(-1);
            case 'controversial_post:support_club': return setback(2, 1);
            case 'position_change:accept': return setback(2);
            case 'fan_backlash:stay_and_fight': return setback(2);
            case 'return_home:stay_abroad': return setback(5);
            case 'tax_trouble:stay_and_fight': return setback(3);
            default: return null;
        }
    }
    // What an event changes for good (a temporary setback adds up to 0)
    const eventOvr = (entry) => {
        const effect = eventEffect(entry);
        return effect ? effect.now + effect.later : 0;
    };
    // Everything Copero's events have added to (or taken from) the OVR in this career
    const eventsTotal = (state) => (Array.isArray(state.log) ? state.log : []).reduce((sum, entry) => sum + eventOvr(entry), 0);
    // The game's grid of decision cards (one card per option, in the same order), or null
    function decisionGrid(count) {
        return [...document.querySelectorAll('[data-career-phase] [class*="lg:grid-cols-4"]')].find(grid => grid.children.length === count) || null;
    }
    // Talisman: how far above a club's level you carry it, and the clubs it lifted in the last click ({ id: [home, continental] })
    const TALISMAN_GAP = 3;
    let carry = { seed: '', lift: {} };
    // Sandbox's Block injuries is on and this decision is an injury
    const blocksInjury = (event) => !!event && event.eventKey === 'injury' && config.preventInjuries && !!currentMode() && currentMode() !== 'boost';
    /**
     * A decision card's click, changed while Copero handles it. Copero works a
     * decision out inside the click: it looks the clicked option up in the
     * career and reads its type and keys. So the cards stay as drawn, and only
     * while that click runs are the options changed (back before React draws
     * again). React reads a button's click handler from its props when the
     * click reaches the page's root, so this capture listener on the document
     * goes first.
     * - Block injuries: the injury option is renamed, so Copero's injury rule
     *   (optionKey "continue") doesn't match: no OVR lost, no bench (the game
     *   logs the new name, which eventEffect counts as 0).
     * - Superteam (applyScene): its club card plays as Copero's superteam offer
     *   accepted (high rotation, every trophy twice as likely), its Stay card
     *   (also A step up's) half the time as the offer turned down (the fans
     *   cheer, no cost) and half the time as Copero's "Stay and fight" (they
     *   boo: -2 OVR until the end of the stretch), seeded per event.
     * - Talisman (a Boost perk): the club you'll play for is a level stronger
     *   at home and in Europe while Copero plays the stretch, if you're 3+
     *   above its level (remembered in `carry` for the season's form).
     */
    function decisionClick(e) {
        const event = currentState && currentState.currentEvent;
        const talisman = talismanOn(currentState) && !!liveTeams;
        const coaching = !!currentMode() && !!liveTeams && gameData.status === 'ready';
        // Copero ends every career once a season reaches 40; Boost and Sandbox play on (shiftAges)
        const age = Number(currentState && currentState.player && currentState.player.age) || 0;
        const period = PERIOD_SEASONS[currentState && currentState.mode] || 2;
        const pastForty = !!currentMode() && age + period >= 40;
        const retiring = !!retireWays(currentState, event);
        if (!event || !Array.isArray(event.options) || (!blocksInjury(event) && ['superteam', 'stepUp', 'release'].indexOf(event.c99Scene) < 0 && !talisman && !coaching && !pastForty && !retiring)) return;
        const grid = decisionGrid(event.options.length);
        const button = grid && e.target instanceof Element ? e.target.closest('button') : null;
        const key = button && grid.contains(button) ? Object.keys(button).find(k => k.startsWith('__reactProps$')) : null;
        const props = key && button[key];
        if (!props || typeof props.onClick !== 'function' || props.onClick.c99) return;
        const index = [...grid.children].findIndex(card => card.contains(button));
        const option = event.options[index];
        const click = props.onClick;
        props.onClick = Object.assign(function () {
            const undo = [];
            const set = (obj, field, value) => {
                undo.push([obj, field, obj[field]]);
                obj[field] = value;
            };
            // The Retire card flips over to ask how you want to go (flipRetireCard), then is pressed again with the answer: now (Copero's own
            // retirement), a farewell (Copero's Stay) or a last dance (Copero signs you for the club you started at)
            if (retiring && option && option.type === 'retire') {
                const way = retireWay && retireWay.step === Number(currentState.step) ? retireWay.way : null;
                if (!way) {
                    flipRetireCard(currentState, event, index);
                    return undefined;
                }
                if (way !== 'now') {
                    const to = way === 'farewell' ? currentState.currentTeamId : way === 'home' ? homeClub(currentState, event) : currentState.seasons[0].teamId;
                    set(option, 'type', way === 'farewell' ? 'stay' : 'join_club');
                    set(option, 'teamId', to);
                    // The decision after this stretch ends the career (applyRetirement)
                    stats.farewell = Number(currentState.step) + 1;
                    stats.farewellWay = way;
                    saveStats();
                    toast(way === 'farewell' ? '🎉 You tell ' + clubName(to, true) + ' this will be your last season with them.'
                        : way === 'home' ? '🏠 Coming home: one last stretch at ' + clubName(to, true) + ', in front of your own people.'
                        : '🏡 You’re going home: one last dance at ' + clubName(to, true) + ', the club where you started.', true);
                }
            }
            if (blocksInjury(event)) event.options.forEach(o => o && o.optionKey === 'continue' && set(o, 'optionKey', 'continue (injury blocked)'));
            // Past 39: Copero plays the stretch for a player a multiple of 4 years younger (so its 4-year tournament cycles
            // stay in step), and the ages are put back as soon as the script sees the result (shiftAges)
            const shift = pastForty && option && option.type !== 'retire' ? 4 * Math.ceil((age + period - 39) / 4) : 0;
            if (shift) {
                set(currentState.player, 'age', age - shift);
                ageShift = { seed: String(currentState.seed), step: Number(currentState.step) + 1, by: shift, seasons: currentState.seasons.length,
                    log: Array.isArray(currentState.log) ? currentState.log.length : 0, periods: (currentState.nationalTeamPeriods || []).length };
            }
            if (option && option.c99Scene === 'join') {
                set(event, 'eventKey', 'rival_offer');
                set(option, 'type', 'career_choice');
                set(option, 'eventKey', 'rival_offer');
                set(option, 'optionKey', 'accept');
            } else if (option && option.c99Scene === 'stay') {
                const cheer = superteamCheer(currentState, event);
                set(option, 'type', 'career_choice');
                if (cheer) {
                    set(event, 'eventKey', 'rival_offer');
                    set(option, 'eventKey', 'rival_offer');
                    set(option, 'optionKey', 'reject');
                } else {
                    set(option, 'eventKey', 'fan_backlash');
                    set(option, 'optionKey', 'stay_and_fight');
                }
                toast(cheer ? '🎶 The fans sing your name: staying was the right call.' : '😠 Some fans think you only stayed because the talks broke down.', true);
            } else if (option && option.c99Scene === 'renew') {
                // Copero plays its own Stay card; the new contract is ours (3-4 seasons)
                const age = Number(currentState.player.age) || 0;
                stats.renewal = { club: String(currentState.currentTeamId), age: age + 1, years: 3 + (seeded(String(currentState.seed) + ':renewal:' + event.id)() < 0.5 ? 1 : 0) };
                saveStats();
                toast('✍️ You turn ' + clubName(event.rivalTeamId, true) + ' down and sign a new contract. The fans won’t forget it.', true);
            }
            if (talisman && option && option.type !== 'retire') {
                // The club you'll play for: a club card's, the rival's for a superteam, else your own
                const ovr = Number(currentState.player.overall) || 0;
                const lift = {};
                for (const id of new Set([option.teamId, event.rivalTeamId, currentState.currentTeamId])) {
                    const team = id && liveTeams[id];
                    if (!team || ovr < clubLevel(id) + TALISMAN_GAP) continue;
                    lift[id] = REP_KEYS.slice(0, 2).map(key => {
                        const now = Number(team[key]) || 0;
                        if (now < 5) set(team, key, now + 1);
                        return now < 5 ? 1 : 0;
                    });
                }
                carry = { seed: String(currentState.seed), lift: lift, coach: {} };
            }
            if (coaching && option && option.type !== 'retire') {
                // The coach of the club you'll play for: a level up or down at home (and in Europe with a 6-star one)
                const coach = {};
                for (const id of new Set([option.teamId, event.rivalTeamId, currentState.currentTeamId])) {
                    const team = id && liveTeams[id];
                    const step = team ? coachLift(currentState, id, currentState.seasons.length) : 0;
                    if (!step) continue;
                    const six = ratingOf(clubManager(currentState, id, currentState.seasons.length).manager) === 6;
                    coach[id] = REP_KEYS.slice(0, 2).map((key, i) => {
                        const now = Number(team[key]) || 0;
                        const to = clamp(now + (i === 0 || (six && step > 0) ? step : 0), 0, 5);
                        if (to !== now) set(team, key, to);
                        return to - now;
                    });
                }
                carry = { seed: String(currentState.seed), lift: talisman ? carry.lift : {}, coach: coach };
            }
            try {
                return click.apply(this, arguments);
            } finally {
                undo.reverse().forEach(([obj, field, value]) => {
                    if (value === undefined) delete obj[field];
                    else obj[field] = value;
                });
            }
        }, { c99: true });
    }
    // Block injuries: the injury card's "-8 OVR" pill says what really happens, in Copero's green
    function markBlockedInjury(state) {
        const event = state && state.currentEvent;
        const grid = blocksInjury(event) && Array.isArray(event.options) ? decisionGrid(event.options.length) : null;
        if (!grid) return;
        for (const text of grid.querySelectorAll('.rounded-full span.flex-1')) {
            if (!/^-\d+ OVR$/.test(text.textContent.trim())) continue;
            text.textContent = 'No OVR lost';
            text.closest('.rounded-full').setAttribute('data-c99-blocked', '');
        }
    }

