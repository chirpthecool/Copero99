    // ========================================================================
    // The end of a career: the body's clock, playing on, goodbyes and the Retire card
    // ========================================================================

    /**
     * Playing on past your body (twilight stage 2+; Chirp: the end is
     * yours, but playing on costs): each new season once. A stretch at a club
     * you're no longer well above (`benchGap`) is played a squad step lower
     * `bench` of the time (the manager trusts younger legs), and a season
     * brings a knock now and then: fewer games and an OVR or two (applyBoost,
     * Sandbox's curve; Iron body halves it), with no pop-up. Not a farewell
     * or a last dance, not a stretch a Copero event decided. Every season
     * keeps the wear of its stretch (c99Wear) for applyBoost and the curve.
     */
    const TWILIGHT_COSTS = { bench: 0.4, benchGap: 3, knock: 0.15, knockPer: 0.1, games: [0.5, 0.8] };
    function twilightSeasons(state, mode) {
        if (!realRetireOn(mode) || gameData.status !== 'ready') return;
        const seasons = state.seasons;
        const log = Array.isArray(state.log) ? state.log : [];
        const farewell = !!stats.farewell && Number(state.step) === stats.farewell;
        for (let i = Math.max(0, stats.seasonsSeen); i < seasons.length; i++) {
            const season = seasons[i];
            if (!season || season.c99Wear !== undefined) continue;
            let first = i;
            while (first > 0 && seasons[first - 1].periodIndex === season.periodIndex) first--;
            const start = seasons[first];
            // Copero logs an event with the age it was chosen at: the stretch's first season
            const decided = log.some(e => e && e.type === 'career_event_selected' && Number(e.age) === Number(start.age));
            const tw = farewell || decided || season.suspended ? { level: 0, wear: 0 } : twilight(state, Number(start.age) || 0, Number(start.overall) || 0, first);
            season.c99Wear = tw.wear;
            changed = true;
            const s = season.stats;
            if (tw.level < 2 || !s || !(Number(s.appearances) > 0) || !gameData.teams[season.teamId]) continue;
            if ((Number(season.overall) || 0) - clubLevel(season.teamId) < TWILIGHT_COSTS.benchGap &&
                seeded(String(state.seed) + ':old-bench:' + first)() < TWILIGHT_COSTS.bench) stepRole(state, season, -1);
            const rng = seeded(String(state.seed) + ':knock:' + i);
            if (rng() >= TWILIGHT_COSTS.knock + TWILIGHT_COSTS.knockPer * tw.wear) continue;
            const share = TWILIGHT_COSTS.games[0] + rng() * (TWILIGHT_COSTS.games[1] - TWILIGHT_COSTS.games[0]);
            setGames(state, s, Math.max(1, Math.round(s.appearances * share)));
            const loss = rng() < 0.5 ? 1 : 2;
            season.c99Knock = perkOn('ironBody') ? Math.trunc(loss / 2) : loss;
        }
    }
    // Playing on past your body: what it has cost so far, for Sandbox's Planned curve (Boost builds it into its path):
    // the extra decline every season and the knocks
    function twilightToll(state) {
        const toll = state.seasons.reduce((sum, season) => sum + wearCost(Number(season.c99Wear) || 0) + (Number(season.c99Knock) || 0), 0);
        return Math.round(toll);
    }
    // Club decision screens (club offers, loans and contract ends); a Retire card also joins Copero's story events,
    // and a forced end turns any decision but the academy into one of these, with only the Retire card
    const RETIRE_EVENTS = ['transfer', 'contract_non_renewal', 'loan_offer', 'post_loan_retained', 'post_loan_not_retained', 'no_offers_retirement'];
    // Sandbox's Retire button: the seed of the career to retire at its next decision, and when its card was last pressed (ms)
    let retireNow = '';
    let retirePressed = 0;
    /**
     * The end of a career (Chirp: retired at 38 with OVR 77 when the
     * story wanted more football; the end should be yours, except in
     * extremes). It builds up from what's going on (twilight): the body's
     * clock (from the roll), a season on the bench, a long way below your
     * best, an injury late on, minus how good you still are. Stages at any
     * decision but the academy (Boost; Sandbox with Realistic retirement):
     * 1  retiring is on the table: a Retire card joins the cards, quietly
     * 2  past your body: still every card, but playing on costs: more decline
     *    every season (applyBoost), knocks and the bench (twilightSeasons),
     *    worse offers (marketBars), now and then a real injury (oldInjury);
     *    a stretch an event decided costs nothing
     * 3  forced, only past your body's age and 25+ below your best (or at 60):
     *    only the Retire card
     * The Retire card asks how you want to go (decisionClick, flipRetireCard): now,
     * one last stretch at your club (free of that cost; not a club letting you
     * go, not on loan), a last dance at the club you started at or a
     * homecoming in your own country (homeClub). After it the next decision,
     * whatever it is, ends the career with a send-off (the Retire card,
     * pressed by itself). Sandbox without the switch: its Retire button and 60.
     */
    function applyRetirement(state, event, mode) {
        const options = event.options;
        const age = Number(state.player.age) || 0;
        const ovr = Number(state.player.overall) || 0;
        // (stats.farewell = the step of the decision right after the farewell stretch)
        const farewellOver = !!mode && !!stats.farewell && Number(state.step) >= stats.farewell && event.type !== 'academy_offer';
        // Club decisions, and Copero's story events too; never the academy
        const fits = (event.c99Type || event.type) !== 'academy_offer';
        const button = fits && !!mode && mode !== 'boost' && retireNow === String(state.seed);
        const tw = fits && realRetireOn(mode) ? twilight(state, age, ovr) : { level: 0 };
        const stop = fits && !!mode && age >= SAFETY_AGE;
        const level = farewellOver || button || stop ? 3 : tw.level;
        if ((event.c99Level || 0) === level) return;
        if (event.c99Options) {
            options.splice(0, options.length, ...event.c99Options);
            delete event.c99Options;
        }
        if (event.c99Type) {
            event.type = event.c99Type;
            delete event.c99Type;
        }
        for (let i = options.length - 1; i >= 0; i--) if (options[i] && options[i].c99Retire) options.splice(i, 1);
        event.c99Level = level;
        changed = true;
        if (!level) return;
        const own = options.find(o => o && o.type === 'retire');
        const retire = own || { id: 'retire-c99-' + state.step, type: 'retire', c99Retire: true };
        if (level < 3) {
            // Stages 1-2 (Chirp: your call): every card Copero gave stays, plus a Retire card. Past your body (stage 2)
            // playing on costs instead: worse offers (marketBars), knocks and more decline (twilightSeasons, applyBoost)
            if (!own) options.push(retire);
        } else {
            // Forced (or the farewell is over): only the Retire card, whatever this decision was (a story event too)
            event.c99Options = options.slice();
            options.splice(0, options.length, retire);
            if (RETIRE_EVENTS.indexOf(event.type) < 0) {
                event.c99Type = event.type;
                event.type = 'transfer';
            }
            // After a farewell it is pressed by itself, with a send-off
            if (farewellOver) retireNow = String(state.seed);
        }
        // Each stage is told once a career (stage 1 says nothing: the card is enough)
        if (button || level < 2 || (Number(stats.retireTold) || 0) >= level) return;
        stats.retireTold = level;
        saveStats();
        const here = state.currentTeamId ? clubName(state.currentTeamId, true) : 'your club';
        const line = (list) => list[hashText(String(state.seed) + ':farewell-words:' + level) % list.length].replace('{club}', here).replace('{age}', age);
        toast(farewellOver ? line(FAREWELL_WORDS[stats.farewellWay] || FAREWELL_WORDS.club)
            : level === 3 ? line(age >= SAFETY_AGE ? FAREWELL_WORDS.max : FAREWELL_WORDS.stop) : line(TWILIGHT_WORDS[tw.why] || TWILIGHT_WORDS.age), true);
    }
    // What a career's end feels like, in words (a line picked per career): stage 2 by its biggest reason, then the end
    const TWILIGHT_WORDS = {
        age: ['🧊 Ice baths after every game now, and the physio knows your knees by name. Every season you play on will take a little more out of you.',
            '🌅 Pre-season hurts in places it never used to, and the kids fly past you in training. You can play on, but your body will make you pay for it.',
            '🛏️ Mornings start slower and recoveries take longer. From here on, every season you play costs you something.'],
        bench: ['🪑 You spent most of last season in a tracksuit on the bench. The manager is planning without you, and playing on will cost you.',
            '📋 Your name kept slipping down the team sheet last season. Maybe it’s time to think about how you want to go out.'],
        level: ['📉 You still see the pass, but your legs don’t get you there any more.',
            '🎞️ The fans still share clips of your best years, and you look less like that player every season.'],
        injury: ['🩹 That last injury took longer to heal than any before it, and you can still feel it. Playing on will cost you.',
            '🏥 The scans came back clear, but you felt every week of that recovery.']
    };
    const FAREWELL_WORDS = {
        stop: ['🏁 After training you take one last look around the empty stadium. Your legs can’t keep up any more, and it’s time to hang up your boots.',
            '🏁 The doctors were kind but honest: your body can’t take another season. It’s time to hang up your boots.'],
        home: ['🏠 The final whistle of your last game for {club}, at home in front of your own people. Nobody leaves the stands for a long time.',
            '🏠 Back home, where you first kicked a ball. Half the town comes to {club}’s ground to say goodbye.'],
        max: ['🏁 At {age} there’s nothing left in your legs. It’s time to hang up your boots.'],
        club: ['🎉 Your last season at {club} is over. Your teammates form a guard of honour and the fans sing your name one last time.',
            '🎉 Your last game for {club} ends with a lap of honour, your kids beside you and your name on a banner across the stand.'],
        last: ['🏡 {club}, the club where you started, gives its old academy kid a proper send-off.',
            '🏡 The last dance is over, and the {club} fans applaud you off the pitch one more time.']
    };
    /**
     * How a career can end at this decision (the Retire card asks): 'now',
     * 'farewell' (one last stretch at your club: not a club letting you go,
     * not on loan) and 'last' (a last dance at the club you started at, if you
     * left it and it would have you). Null when the card just retires (Sandbox,
     * Vanilla, stage 3, the farewell over).
     */
    function retireWays(state, event) {
        if (!state || !event || !realRetireOn(currentMode()) || retireNow || !(event.c99Level === 1 || event.c99Level === 2) || state.phase === 'summary') return null;
        // A ban still running (or about to be extended): a goodbye stretch would be spent suspended, so the card just retires
        // (Chirp: the Retire card while suspended)
        if (Number(state.suspensionSeasonsRemaining) > 0 || banExtends(state)) return null;
        const ways = ['now'];
        const here = state.currentTeamId;
        // A move (last dance, homecoming) fits a transfer window, a contract end or a story event (Copero signs you there
        // as with its own story club cards); a farewell is Copero's Stay card, so a transfer window or a loan offer
        const moves = event.type === 'transfer' || event.type === 'contract_non_renewal' || event.type === 'career_event';
        if (here && gameData.teams[here] && !state.activeLoan && (event.type === 'transfer' || event.type === 'loan_offer') && goodbye(state, event, 'farewell', here)) ways.push('farewell');
        const first = state.seasons[0] && state.seasons[0].teamId;
        const code = ((state.player || {}).nationality || {}).fifa_code;
        if (first && first !== here && gameData.teams[first] && (!CLUB_RULES[first] || CLUB_RULES[first] === code) && moves && goodbye(state, event, 'last', first)) ways.push('last');
        const home = moves ? homeClub(state, event) : null;
        if (home && goodbye(state, event, 'home', home)) ways.push('home');
        // Only "now" left: the card just retires
        return ways.length > 1 ? ways : null;
    }
    /**
     * Whether a club offers you this goodbye at this decision
     * (Chirp: a 73 at 43 got a last dance at Barcelona; the goodbyes
     * should be situational): a roll of its own per decision, way and career.
     * Likely when you're still good enough for the club, less the further
     * below its level you are and the older you are past `from`; what you
     * mean there (seasons played, trophies won together) helps; your own club
     * (a farewell) is kinder, and a Fan favourite's club always says yes.
     */
    const GOODBYE = { base: 0.85, gap: 0.09, from: 38, age: 0.05, season: 0.04, trophy: 0.03, farewell: 0.2, floor: 0.03 };
    function goodbyeChance(state, way, club) {
        if (way === 'farewell' && perkOn('fanFavourite')) return 1;
        const ovr = Number(state.player.overall) || 0;
        const age = Number(state.player.age) || 0;
        const there = state.seasons.filter(season => season.teamId === club);
        const bond = there.length * GOODBYE.season + there.reduce((n, season) => n + (Array.isArray(season.trophies) ? season.trophies.length : 0), 0) * GOODBYE.trophy;
        return clamp(GOODBYE.base - Math.max(0, clubLevel(club) - ovr) * GOODBYE.gap - Math.max(0, age - GOODBYE.from) * GOODBYE.age + bond +
            (way === 'farewell' ? GOODBYE.farewell : 0), GOODBYE.floor, 1);
    }
    const goodbye = (state, event, way, club) => seeded(String(state.seed) + ':goodbye:' + way + ':' + event.id)() < goodbyeChance(state, way, club);
    /**
     * A homecoming: a top-flight club of your own country you never
     * played for (and not the club you started at), the one that wants you
     * most likely; the same club every look at this decision. Null when
     * Copero has none (its club list has no league for many countries).
     */
    function homeClub(state, event) {
        const code = ((state.player || {}).nationality || {}).fifa_code;
        // A homecoming is from abroad: already playing in your country, there is no coming home
        const here = gameData.teams[state.currentTeamId];
        if (!code || (here && here.country === code)) return null;
        const played = new Set(state.seasons.map(s => s.teamId).concat(state.currentTeamId));
        const list = Object.keys(gameData.teams).filter(id => gameData.teams[id].country === code && gameData.teams[id].tier === 1 && !played.has(id) &&
            (!CLUB_RULES[id] || CLUB_RULES[id] === code));
        if (!list.length) return null;
        const key = String(state.seed) + ':home:' + event.id;
        const wants = marketBars(state, key);
        const keen = list.filter(wants);
        return weightedPick(keen.length ? keen : list, id => Math.pow(2, Math.max(0, repOf(id)[0])), seeded(key));
    }
    /**
     * Playing on past your body (stage 2), now and then a real injury:
     * a transfer window becomes Copero's own injury screen (its card, its OVR
     * cost, a stretch on the bench), OLD_INJURY of the decisions, decided once
     * each. Copero plays an injury it didn't schedule like its own (its click
     * reads the event's injuryType) and counts it in its event plan (so at
     * most one more of its own comes). The decision it was is kept (c99Hurt)
     * and comes back if playing on stops costing (Sandbox's switch off).
     */
    const OLD_INJURY = 0.05;
    let OLD_INJURY_SET = null; // tests only (the hook)
    // Copero's injuries and how often it picks each (its Wt table)
    const INJURY_TYPES = [['hamstring', 24], ['meniscus', 18], ['acl', 14], ['tibia_fibula', 8], ['achilles', 4], ['ankle_sprain', 14],
        ['calf_tear', 8], ['metatarsal_fracture', 5], ['shoulder_dislocation', 3], ['disc_hernia', 2]];
    function oldInjury(state, event, mode) {
        const was = event.c99Hurt;
        if (was) {
            if (realRetireOn(mode)) return;
            for (const key of ['eventKey', 'injuryType', 'scheduledSlotAge', 'age']) {
                if (key in was) event[key] = was[key];
                else delete event[key];
            }
            event.type = was.type;
            event.options.splice(0, event.options.length, ...was.options);
            for (const key of ['c99Hurt', 'c99Level', 'c99Options', 'c99Type']) delete event[key];
            changed = true;
            return;
        }
        // Transfer windows only (a contract end or a loan offer has the club's own story)
        if (event.c99HurtRolled || !realRetireOn(mode) || event.type !== 'transfer' || retireNow || Number(state.suspensionSeasonsRemaining) > 0 ||
            (stats.farewell && Number(state.step) >= stats.farewell) || event.c99Was) return;
        const age = Number(state.player.age) || 0;
        if (twilight(state, age, Number(state.player.overall) || 0).level !== 2) return;
        event.c99HurtRolled = true;
        const rng = seeded(String(state.seed) + ':old-injury:' + state.step);
        if (rng() >= (OLD_INJURY_SET === null ? OLD_INJURY : OLD_INJURY_SET)) return;
        const keep = { type: event.type, options: event.options.slice() };
        for (const key of ['eventKey', 'injuryType', 'scheduledSlotAge', 'age']) if (key in event) keep[key] = event[key];
        event.c99Hurt = keep;
        event.type = 'career_event';
        event.eventKey = 'injury';
        event.injuryType = weightedPick(INJURY_TYPES, ([, weight]) => weight, rng)[0];
        event.age = age;
        event.scheduledSlotAge = age;
        event.options.splice(0, event.options.length, { id: 'injury-continue', type: 'career_choice', eventKey: 'injury', optionKey: 'continue' });
        changed = true;
    }
    // The way picked on the Retire card's window: { step, way } (the card is pressed again with it)
    let retireWay = null;
    /**
     * "How to go?": the Retire card flips over (Boost, stages 1-2;
     * Chirp: inside the card, fewer words). A layer of our own over the card
     * (buttons can't go inside Copero's card button), one short button per
     * way, each explained on hover; a way presses the card again with it
     * (retireWay). It follows the card and goes with the decision; Back or
     * Esc closes it. flip = { el, seed, step, index, count }.
     */
    let flip = null;
    const FLIP_WAYS = {
        now: ['👋', 'Retire now', 'Your career ends here.'],
        farewell: ['🎉', 'Farewell', 'One last stretch at your club, costing you nothing, then a send-off.'],
        last: ['🏡', 'Last dance', 'One last stretch at the club that gave you your start, then a send-off there.'],
        home: ['🏠', 'Homecoming', 'One last stretch at a big club of your own country, then a send-off.']
    };
    const flipCard = (index, count) => {
        const grid = decisionGrid(count);
        return (grid && grid.children[index]) || null;
    };
    function closeFlip() {
        if (!flip) return;
        flip.el.remove();
        flip = null;
    }
    function flipRetireCard(state, event, index) {
        const ways = retireWays(state, event);
        const count = event.options.length;
        if (!ways || !flipCard(index, count)) return;
        closeFlip();
        const step = Number(state.step);
        const clubs = { farewell: state.currentTeamId, last: state.seasons[0] && state.seasons[0].teamId, home: ways.indexOf('home') >= 0 ? homeClub(state, event) : null };
        const layer = el('div', 'c99-flip c99-own');
        layer.id = 'copero99-flip';
        layer.setAttribute('role', 'dialog');
        layer.setAttribute('aria-label', 'How do you want to go?');
        const face = layer.appendChild(el('div', 'c99-flip-face'));
        const head = face.appendChild(el('div', 'c99-flip-head'));
        const back = head.appendChild(el('button', 'c99-flip-back', '‹ Back'));
        back.type = 'button';
        back.addEventListener('click', closeFlip);
        head.appendChild(el('b', 'c99-flip-title', 'How to go?'));
        const list = face.appendChild(el('div', 'c99-flip-ways' + (ways.length > 3 ? ' many' : '')));
        for (const way of ways) {
            const [mark, words, help] = FLIP_WAYS[way];
            const btn = list.appendChild(el('button', 'c99-flip-way'));
            btn.type = 'button';
            btn.title = help;
            btn.appendChild(el('span', 'c99-flip-mark', mark));
            const label = btn.appendChild(el('span', 'c99-flip-words'));
            label.appendChild(el('b', '', words));
            if (clubs[way]) label.appendChild(el('small', '', clubName(clubs[way], true)));
            btn.addEventListener('click', () => {
                closeFlip();
                const card = flipCard(index, count);
                const press = card && (card.tagName === 'BUTTON' ? card : card.querySelector('button'));
                if (!press || Number((currentState || {}).step) !== step) return;
                retireWay = { step: step, way: way };
                press.click();
                retireWay = null;
            });
        }
        document.body.appendChild(layer);
        flip = { el: layer, seed: String(state.seed), step: step, index: index, count: count };
        placeFlip();
        // Focus on the layer (not its first button, whose info box would pop up at once): Tab goes through the ways
        layer.tabIndex = -1;
        if (flip) layer.focus({ preventScroll: true });
    }
    // The flipped card sits exactly on its card (every pass and on resize) and goes when the decision does
    function placeFlip() {
        if (!flip) return;
        const state = currentState;
        const card = flipCard(flip.index, flip.count);
        if (!state || animating || String(state.seed) !== flip.seed || Number(state.step) !== flip.step || !card) return closeFlip();
        const box = card.getBoundingClientRect();
        put(flip.el, 'hidden', !box.width);
        const press = card.tagName === 'BUTTON' ? card : card.querySelector('button') || card;
        const set = { left: Math.round(box.left + window.scrollX) + 'px', top: Math.round(box.top + window.scrollY) + 'px',
            width: Math.round(box.width) + 'px', height: Math.round(box.height) + 'px', borderRadius: getComputedStyle(press).borderRadius || '12px' };
        for (const key of Object.keys(set)) if (flip.el.style[key] !== set[key]) flip.el.style[key] = set[key];
        // A Retire strip under four cards (c99-strip) is wide and short: the ways go side by side
        flip.el.classList.toggle('wide', box.width > box.height * 2);
    }
    // Sandbox's Retire button: once the decision holds only the Retire card, press it
    function pressRetire(state) {
        if (!retireNow) return;
        if (!state || retireNow !== String(state.seed) || state.phase === 'summary') {
            retireNow = '';
            retirePressed = 0;
            return;
        }
        const options = state.currentEvent && Array.isArray(state.currentEvent.options) ? state.currentEvent.options : [];
        if (options.length !== 1 || options[0].type !== 'retire') return;
        const grid = decisionGrid(1);
        const card = grid && grid.children[0];
        const button = card && (card.tagName === 'BUTTON' ? card : card.querySelector('button'));
        // Copero greys its cards out (disabled) while a season's trophies are celebrated: a click then does nothing, so wait.
        // A click that didn't end the career is tried again a moment later
        if (!button || button.disabled || Date.now() - retirePressed < 1500) return;
        retirePressed = Date.now();
        button.click();
    }
    function requestRetire() {
        const state = currentState;
        const mode = currentMode();
        if (!state || !mode || mode === 'boost' || retireNow) return;
        confirmModal('Retire now?', 'Your career ends at this club decision (or the next one, if this screen has no clubs).', 'Retire', () => {
            retireNow = String(state.seed);
            retirePressed = 0;
            const event = state.currentEvent;
            if (!event || event.type === 'academy_offer') toast('You’ll retire at your next decision', true);
            mainLoop();
        });
    }
    // The last click played past 39 with a younger player (decisionClick): { seed, step (the result's), by (years),
    // seasons / log / periods (how many there were before it) }
    let ageShift = null;
    /**
     * Puts the real ages back into the career a click past 39 produced, the
     * first time the script sees it (during the season animation, before the
     * game draws the new season): the player, the new seasons, log entries,
     * national team stretches, the coming tournaments and the next event.
     */
    function shiftAges(state) {
        // (the mark is the step it was done for: Copero builds every next career as a copy of the last, mark included)
        if (!ageShift || ageShift.seed !== String(state.seed) || Number(state.step) !== ageShift.step || state.c99Aged === ageShift.step) return;
        const by = ageShift.by;
        const add = (obj, key) => { if (obj && Number.isFinite(obj[key])) obj[key] += by; };
        state.c99Aged = ageShift.step;
        add(state.player, 'age');
        state.seasons.slice(ageShift.seasons).forEach(season => add(season, 'age'));
        (Array.isArray(state.log) ? state.log : []).slice(ageShift.log).forEach(entry => { add(entry, 'age'); add(entry && entry.payload, 'age'); });
        (state.nationalTeamPeriods || []).slice(ageShift.periods).forEach(period => { add(period, 'ageStart'); add(period, 'ageEnd'); });
        (state.upcomingNationalTournaments || []).forEach(tournament => add(tournament, 'age'));
        add(state.currentEvent, 'age');
        add(state.currentEvent, 'scheduledSlotAge');
        if (state.activeLoan && state.activeLoan !== (currentState || {}).activeLoan) add(state.activeLoan, 'returnAge');
        changed = true;
    }
    // Boost: the age this career's body starts to complain, from the roll (Chirp: less of a random age, more the roll
    // and the OVR): 33 (a year or two before real pros retire), a little either way by the seed (BODY_SPREAD, mostly 0),
    // then the roll's durability (drops felt 50%: +2, 95%: -2), its style, the Long career perk, a goalkeeper's longer
    // career and a top talent's (clubs keep wanting him). How good you still are counts in twilight (TWILIGHT_CLASS)
    const BODY_BASE = 33;
    const BODY_SPREAD = [[-2, 10], [-1, 22], [0, 36], [1, 22], [2, 10]];
    function bodyAge(state) {
        let pick = hashText(String(state.seed) + ':body') % 1000 / 10;
        let spread = 0;
        for (const [at, weight] of BODY_SPREAD) {
            if ((pick -= weight) < 0) {
                spread = at;
                break;
            }
        }
        // Sandbox's Realistic retirement has no roll: a neutral body (the spread and a goalkeeper's longer career only)
        if (currentMode() !== 'boost') return clamp(BODY_BASE + spread + (isKeeper(state) ? 2 : 0), 29, 44);
        const tough = Math.round((72.5 - config.boostDecline) / 11.25);
        return clamp(BODY_BASE + spread + tough + (currentStyle().retire || 0) + (hasPerk('longCareer') ? 2 : 0) + (isKeeper(state) ? 2 : 0) +
            (tierRank(config.boostTier) >= 3 ? 1 : 0), 29, 44);
    }
    // Boost always has the end of a career; Sandbox only with its Realistic retirement switch
    const realRetireOn = (mode) => mode === 'boost' || ((mode === 'max' || mode === 'age') && !!config.realRetire);
    // The OVR that forces the end once you're past your body's age (Chirp: only in extremes): 25 below your best,
    // but never under 45 (Copero keeps every OVR at 40+, so a modest best could never get there)
    const FORCED_DROP = 25;
    const forcedLine = (best) => Math.max(best - FORCED_DROP, 45);
    // How far a player's OVR keeps the end away (twilight): [OVR, relief], read between the steps (Chirp: old
    // players with the OVR for it should keep playing; the Roblox Copero99's numbers, it was 0.15 at 84+ and 0.3 at 88+)
    const TWILIGHT_CLASS = [[80, 0], [84, 0.15], [88, 0.35], [92, 0.6], [96, 0.8]];
    const twilightClass = (ovr) => {
        if (ovr <= TWILIGHT_CLASS[0][0]) return 0;
        for (let i = 1; i < TWILIGHT_CLASS.length; i++) {
            const [a, x] = TWILIGHT_CLASS[i - 1];
            const [b, y] = TWILIGHT_CLASS[i];
            if (ovr <= b) return x + (y - x) * (ovr - a) / (b - a);
        }
        return TWILIGHT_CLASS[TWILIGHT_CLASS.length - 1][1];
    };
    // No age limit (Chirp): only a technical stop, against careers that never end (Sandbox's Always 99). Copero's
    // own end is 40 (shiftAges moves it)
    const SAFETY_AGE = 60;
    // The most playing on can wear you down, and what it costs a season on top of the drops (applyBoost, Sandbox's curve):
    // (a season's cost, so Intense and Express pay the same; it was 1 + wear a season and a toll of 1 + 1.5 × wear
    // at every click, so Intense, a click a season, ended a career about two years sooner. decline.js: playing on every
    // time, the end is forced at about 39-40, 3-4 years after playing on starts to cost)
    // (Chirp: an 88 dropped to 62 by 38 and was forced out: it was 1.5 + 1.75 × wear, with the drops
    // taken at 1.2 + 0.3 × wear; now the drops are the roll's own share and the wear is gentler)
    const WEAR_MAX = 1.2;
    const WEAR_COST = [0.5, 1.25];
    const wearCost = (wear) => (wear ? WEAR_COST[0] + WEAR_COST[1] * wear : 0);
    /**
     * How close the end is at a decision (Boost, Sandbox's Realistic
     * retirement): { level 0-3, wear, why }. The body's clock (a year before
     * bodyAge: nothing; then a quarter a year), a season mostly on the bench,
     * a long way below your best, an injury in the last two years; the better
     * you still are, the later it comes (TWILIGHT_CLASS), and later still in a
     * last adventure's league. 1 = a Retire card, 2 = past your body (playing
     * on costs: `wear`, applyBoost; worse offers, knocks), 3 = forced: only
     * past your body's age and 25+ below your best (forcedLine), or at
     * SAFETY_AGE. `upto`: judge on the seasons before this one (a decision
     * already played).
     */
    function twilight(state, age, ovr, upto) {
        const seasons = state.seasons.slice(0, upto === undefined ? state.seasons.length : upto);
        // (a quarter a year, at most 2, so the end builds over 4-5 years; it was a third, at most 1.5)
        const parts = { age: clamp((age - bodyAge(state) + 1) / 4, 0, 2), bench: 0, level: 0, injury: 0 };
        const last = seasons[seasons.length - 1];
        if (age >= 31 && last && !last.suspended) {
            const games = Number(last.c99Apps) || Number((last.stats || {}).appearances) || 0;
            parts.bench = games < 15 ? 0.35 : games < 25 ? 0.15 : 0;
        }
        const best = seasons.reduce((top, s) => Math.max(top, Number(s.overall) || 0), ovr);
        if (age >= 31) parts.level = best - ovr >= 18 ? 0.35 : best - ovr >= 12 ? 0.2 : 0;
        parts.injury = age >= 31 && (Array.isArray(state.log) ? state.log : []).some(e => e && e.type === 'career_event_selected' && e.payload &&
            e.payload.eventKey === 'injury' && Number(e.age) >= age - 2) ? 0.25 : 0;
        // A last adventure's league (a top flight that pays for a name): an easier level, so the end comes slower there
        const team = gameData.teams[state.currentTeamId];
        const abroad = age >= ADVENTURE.from && !!team && team.tier === 1 && !!ADVENTURE.leagues[team.country] ? ADVENTURE.ease : 0;
        const p = parts.age + parts.bench + parts.level + parts.injury - twilightClass(ovr) - abroad;
        const why = Object.keys(parts).reduce((a, b) => (parts[b] > parts[a] ? b : a), 'age');
        const forced = age >= SAFETY_AGE || (age >= bodyAge(state) && ovr <= forcedLine(best));
        // (Chirp: the Retire card came at 34 for everyone; now only when the body, the bench or the
        // drop from your best says so, so a player still near his best plays on without it, and never before 31)
        const level = forced ? 3 : p >= 0.6 ? 2 : p > 0.1 ? 1 : 0;
        return { level: age < 31 && !forced ? 0 : level, wear: level >= 2 ? clamp(p - 0.4, 0.2, WEAR_MAX) : 0, why: forced ? 'forced' : why };
    }

