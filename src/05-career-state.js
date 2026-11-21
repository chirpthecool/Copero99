    // ========================================================================
    // The career on screen and the pass that patches it
    // ========================================================================

    let currentState = null;  // The career on screen (during the season animation: the season before it)
    let liveState = null;     // The career being patched (during the season animation: the coming season)
    let animating = false;    // The game is animating towards the coming season
    let animPhase = null;     // That animation's phase (ANIM_PHASES)
    let celebration = null;   // During that animation: the trophies and awards the game is about to celebrate (its own list)
    // Copero's season animation, in order (about 0.3 s apart; the trophies come at 1.15 s, the end at 3.2 s)
    const ANIM_PHASES = ['metrics', 'identity', 'history', 'stats', 'trophies', 'overall', 'postOverall'];
    // The coming season's results are out once the game shows its trophies (a phase it doesn't have yet counts as out)
    const seasonLanded = () => !animating || ANIM_PHASES.indexOf(animPhase) < 0 || ANIM_PHASES.indexOf(animPhase) >= ANIM_PHASES.indexOf('trophies');
    let lastPhase = null;     // Value of the data-career-phase attribute
    let rawOvr = { seed: '', ages: {} }; // The game's own OVR at each age, read before the script touches it
    let lockStatus = {};      // path -> 'ok' | 'missing' | 'type' | 'error' (result of the last pass)
    let lastBoostNote = '';   // e.g. "+5 OVR · hot season", shown on the boost card
    let changed = false;      // Set when a pass edits the career, so the page gets redrawn
    let forceRedraw = false;  // Set when the menu edits the career between passes (e.g. a reroll changed the starting OVR)
    function patchCareerState(state) {
        if (!state || !state.player) return;

        const player = state.player;
        // A stretch played past 39 gets its real ages back first
        shiftAges(state);
        if (rawOvr.seed !== String(state.seed)) rawOvr = { seed: String(state.seed), ages: {} };
        if (!(player.age in rawOvr.ages)) rawOvr.ages[player.age] = player.overall;
        trackCareer(state);
        const event = state.currentEvent;
        const options = event && Array.isArray(event.options) ? event.options : [];

        const age = player.age || 16;
        const mode = currentMode();
        const boost = mode === 'boost';
        // Protection (block injuries / suspensions, always qualify) is part of Sandbox: Boost and Vanilla careers play by the game's rules
        const careerCheats = !!mode && !boost;

        // Hall of Fame: remembers the Protection cheats used (Sandbox careers never count anyway)
        if (careerCheats && state.seasons.length > 0) {
            if (config.preventInjuries) noteCheat('Block injuries');
            if (config.preventSuspensions) noteCheat('Block suspensions');
            if (config.forceQualify) noteCheat('Always qualify');
        }

        // 1) Anti-injury: counted and announced once per injury; the click itself is changed (decisionClick)
        if (blocksInjury(event) && !event.c99Blocked && options.some(option => option && option.optionKey === 'continue')) {
            event.c99Blocked = true;
            stats.injuries++;
            noteCheat('Block injuries');
            saveStats();
            toast('🩹 Injury blocked: no OVR lost, no time on the bench');
        }

        // 1b) A loan offer only has loan cards: the game's own "Stay at <club>" card is added (see applyLoanStay), unless
        //     the club lets a player go who stayed before and didn't grow or play, or was just suspended (applyRelease)
        if (event && Array.isArray(event.options)) {
            // Past your body, now and then a club decision becomes a real injury (before the clubs are worked on)
            oldInjury(state, event, mode);
            applyRelease(state, event, mode);
            applyLoanStay(state, event, mode);
        }

        // 1b2) Copero's plain extra training, personal coach and season workload come back (half of them); then Lucky events
        //      (Sandbox): every risky choice in a Copero event turns out well
        if (event && event.type === 'career_event') applyPlainEvent(state, event, mode);
        if (careerCheats && config.luckyEvents && event && event.type === 'career_event') makeLucky(state, event);

        // 1c) National team. World Cup qualification is random; this makes it a sure thing (you still need a high
        //     enough OVR to be called up). Sandbox's Always qualify, or Boost's Golden generation perk
        if (((careerCheats && config.forceQualify) || (boost && hasPerk('goldenGen'))) && Array.isArray(state.upcomingNationalTournaments)) {
            for (const tournament of state.upcomingNationalTournaments) {
                if (tournament && tournament.selectionQualified === false) {
                    tournament.selectionQualified = true;
                    changed = true;
                }
            }
        }

        // 2) Anti-suspension. The game keeps this counter at the top level of
        //    the career state; the player object is checked as well.
        if (careerCheats && config.preventSuspensions) {
            let cleared = false;
            if (state.suspensionSeasonsRemaining) {
                state.suspensionSeasonsRemaining = 0;
                cleared = true;
            }
            if (player.suspensionSeasonsRemaining) {
                player.suspensionSeasonsRemaining = 0;
                cleared = true;
            }
            if (cleared) {
                changed = true;
                stats.suspensions++;
                noteCheat('Block suspensions');
                saveStats();
                toast('Ban lifted: you’re free to play');
            }
        }

        // 2b) The new seasons as Copero gave them (their form), then Boost's role trait on Copero's own games, real-life goals
        //     and assists a game, and Boost's playing traits on top
        if (mode) recordSeasons(state);
        if (mode) applyRoleTrait(state);
        // Playing on past your body: the bench and knocks (Boost; Sandbox's Realistic retirement)
        if (mode) twilightSeasons(state, mode);
        if (mode) applyRealism(state);
        if (mode) applyStatTraits(state);

        // 2c) A ban's fallout: a longer ban, a lower market value, fewer games after it (the OVR lost to rust: applyBoost)
        applyBanFallout(state, mode);

        // 3) OVR (nothing until a mode is picked for this career)
        if (mode === 'max') {
            // God Mode: OVR always at 99 (regardless of age)
            if (player.overall !== 99) {
                player.overall = 99;
                changed = true;
            }
        } else if (mode === 'age') {
            // Age-based OVR (more realistic), plus whatever Copero's own events added or took away
            const targetOVR = clamp(calculateOVR(age) + eventsTotal(state) - (realRetireOn(mode) ? twilightToll(state) : 0), CURVE_MIN_OVR, CURVE_MAX_OVR);

            // Only modify if different (to avoid forcing unnecessary re-renders)
            if (player.overall !== targetOVR) {
                player.overall = targetOVR;
                changed = true;
            }
        } else if (boost) {
            applyBoost(state, player);
        }

        // 3a) Seasons not looked at yet: their OVR inside a decision (Sandbox), the Ballon d'Or vote, perks
        processSeasons(state, mode);

        // 3b) Big-club interest (a perk some boosts roll): the academy offer comes from three of the biggest clubs
        if (event && event.type === 'academy_offer' && Array.isArray(event.options)) applyAcademyPerk(state, event, mode);

        // 3c) Decision screens with clubs: Sandbox can change the club offers (academy too) and retire with
        //     the Retire button; some boosts add a club; Boost retires you at the age your body allows; a transfer window
        //     can become one of the story scenes (with the clubs the market picked)
        if (event && Array.isArray(event.options)) {
            applyOffers(state, event, mode);
            applyRetirement(state, event, mode);
            applyScene(state, event, mode);
        }

        // 4) Switch values (Sandbox only; applied last, so they win over everything above)
        if (mode && !boost) applyLocks(state);
        else lockStatus = {};
    }
    // Set when a new career starts with no season played: the panel opens by itself, with its intro animation
    let introPending = false;
    /**
     * The counters and the picked mode belong to one career: a new career
     * starts them over (so it waits for a new pick). Also settles the Boost
     * loan gamble.
     */
    function trackCareer(state) {
        const seed = String(state.seed);
        if (stats.seed !== seed) {
            // A career started by "Start over" is a new career like any other: it waits for a new pick (startOver)
            document.documentElement.classList.remove('c99-restarting');
            stats.seed = seed;
            stats.injuries = 0;
            stats.suspensions = 0;
            // Loans turned down before the script first saw this career don't count (and don't trigger the gamble)
            stats.loans = countStays(state);
            stats.picked = null;
            stats.cheats = [];
            stats.rolled = null;
            stats.rerolled = false;
            stats.peeked = false;
            stats.retireTold = 0;
            stats.farewell = 0;
            stats.farewellWay = '';
            stats.banSeen = '';
            stats.loanGrew = 0;
            stats.offered = {};
            stats.renewal = null;
            // Seasons played before the script first saw this career keep what the game gave them
            stats.seasonsSeen = state.seasons.length;
            saveStats();
            // A career that starts now (not one already under way when the script first saw it) opens the panel on the pick
            introPending = state.seasons.length === 0;
            return;
        }
        if (stats.seasonsSeen < 0) {
            stats.seasonsSeen = state.seasons.length;
            saveStats();
        }
        const stays = countStays(state);
        if (stays > stats.loans) {
            const first = stats.loans === 0;
            stats.loans = stays;
            saveStats();
            // Only the first stay of a career is a gamble
            if (first && currentMode() === 'boost') loanGamble();
        }
    }
    /**
     * Seasons the script hasn't looked at yet, each handled once (during the
     * season animation, before the game shows them): Sandbox's OVR for
     * the seasons inside a decision (the game records each season's OVR before
     * the script sets the new one), no endless league title runs, the big
     * continental cup kept as often as the real one is won, the Golden Boot race and the Ballon d'Or vote (all
     * Boost and Sandbox; Vanilla keeps Copero's own) and the Marketable perk.
     */
    function processSeasons(state, mode) {
        const seasons = state.seasons;
        if (stats.seasonsSeen >= seasons.length) return;
        const events = eventsTotal(state);
        for (let i = Math.max(0, stats.seasonsSeen); i < seasons.length; i++) {
            const season = seasons[i];
            if (!season || typeof season !== 'object') continue;
            const inside = i > 0 && seasons[i - 1] && seasons[i - 1].periodIndex === season.periodIndex;
            // (Always 99: the stretch's first season too, which holds an event's cost taken at the click)
            if ((inside && mode === 'age') || mode === 'max') {
                const ovr = mode === 'max' ? 99 : clamp(calculateOVR(Number(season.age)) + events, CURVE_MIN_OVR, CURVE_MAX_OVR);
                if (season.overall !== ovr) {
                    season.overall = ovr;
                    changed = true;
                }
            }
            if (mode) banTrophies(state, i);
            if (mode) realPromotion(state, i);
            if (mode) eliteTitles(state, i);
            if (mode) keepLeague(state, i);
            if (mode) keepQualified(state, i);
            if (mode) secondaryCup(state, i);
            if (mode) keepContinental(state, i);
            if (mode) keepClubWorldCup(state, i);
            if (mode) applyRealGames(state, i);
            if (mode && Array.isArray(season.awards)) applyGoldenBoot(state, i);
            if (mode && Array.isArray(season.awards)) applyBallonDor(state, i);
            if (perkOn('marketable') && Number.isFinite(season.marketValue)) {
                season.marketValue = marketable(season.marketValue);
                changed = true;
            }
        }
        // The player's market value is new after every decision, so it is raised along with that decision's seasons
        if (perkOn('marketable') && Number.isFinite(state.player.marketValue)) {
            state.player.marketValue = marketable(state.player.marketValue);
            changed = true;
        }
        stats.seasonsSeen = seasons.length;
        saveStats();
    }
    // A career has started once its first season is played: from then on its OVR mode and boost are set
    // (judged on the season being played, so a click during the first season's animation already counts)
    const careerStarted = () => {
        const state = liveState || currentState;
        return !!state && Array.isArray(state.seasons) && state.seasons.length > 0;
    };
    /**
     * Finds the career state, patches it and returns it (or null if the
     * career is not on screen yet).
     */
    function applyPatch() {
        const containers = document.querySelectorAll('[data-career-phase]');
        if (containers.length === 0) return null;

        for (const container of containers) {
            const fiber = findReactFiber(container);
            if (!fiber) continue;

            // The game's club list never changes, so it is looked up once, as early as it can be found (on the name
            // screen), so the German clubs are renamed before Copero draws a card; renamed later, a redraw shows it (only
            // when one is on screen: a redraw hands Copero a new career object)
            const renamed = !liveTeams && (liveTeams = findCatalog(fiber)) && clubsRenamed;
            const found = findCareer(fiber);
            if (renamed && found && [found.state.currentTeamId, ...((found.state.currentEvent || {}).options || []).map(o => o && o.teamId)].some(id => GERMAN_NAMES[id])) forceRedraw = true;
            if (found) {
                lastPhase = container.getAttribute('data-career-phase');
                // Off limits' texts, in Copero's language for this career (it's picked before a career starts)
                if (sceneTextsSeed !== String(found.state.seed) && addSceneTexts(fiber)) sceneTextsSeed = String(found.state.seed);
                // Mid-animation the coming season is patched before the game shows it, so it needs no redraw
                const state = found.next || found.state;
                liveState = state;
                animating = !!found.next;
                animPhase = found.phase;
                celebration = found.celebration;
                changed = false;
                // Pop-ups about the coming season wait until the game shows it
                holdToasts = animating;
                try {
                    patchCareerState(state);
                } finally {
                    holdToasts = false;
                }
                if ((changed || forceRedraw) && !found.next) redraw(found.hook, state);
                forceRedraw = false;
                if (!found.next) syncCounters(state);
                // The Living world plays the coming season along with the game's animation (its results are worked out as
                // it starts, the reputations move once its trophies show); the panel, cards and Hall of Fame follow what's on screen
                updateWorld(state, seasonLanded());
                careerHook = found.hook;
                if (!animating) {
                    takeSnapshot(found.state);
                    flushToasts();
                }
                return found.state;
            }
        }
        return null;
    }
    // The career's mode: 'boost', or the Sandbox OVR cheat in use ('age' = Planned curve, 'max' = Always 99); null until one is picked
    function currentMode() {
        if (stats.picked === 'boost') return 'boost';
        if (stats.picked === 'sandbox') return config.forceOVR99 ? 'max' : 'age';
        return null;
    }
    // A Vanilla career: picked, or its first season played without a pick
    const vanillaCareer = () => stats.picked === 'vanilla' || (!stats.picked && careerStarted());

