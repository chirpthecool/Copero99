    // ========================================================================
    // Story scenes from Copero's debug panel: Off limits, release clause, a step up
    // ========================================================================

    // Two stories from Copero's debug panel, told with the clubs of any career (Boost and Sandbox), on a transfer window:
    // your club won't sell you to a rival that wants you ("Off limits", its barcelona_no), or a club of your country at
    // least as big as yours wants to build a superteam around you ("Superteam", its enzo_city). The chance a season brings
    // one where it fits (a decision of 1 / 2 / 3 seasons: 8 / 15 / 22%); each comes once a career at most, since Copero's
    // event plan counts it as its fan backlash or superteam story
    const SCENES = { chance: 0.08 };
    // Off limits has texts of its own, added to Copero's fan backlash variants (its barcelona_no is written for Atlético):
    // [title, description], with Copero's own {rival}
    const OFF_LIMITS = 'c99_off_limits';
    let sceneTextsSeed = '';  // The career whose texts have Off limits in them
    // The superteam story's versions (Chirp): below the top flight a bigger club a division up ("A step up", its Stay
    // card can go either way: the fans cheer or boo). In the top flight (Chirp: two superteam stories
    // that were virtually the same, Copero's own and ours) a big club anywhere pays your release clause ("Release
    // clause"): go, or turn it down and sign a new contract. (c99_superteam: careers from before, which had ours)
    const SUPERTEAM = 'c99_superteam';
    const STEP_UP = 'c99_step_up';
    const RELEASE = 'c99_release_clause';
    const SCENE_TEXTS = {
        en: { cheer: 'The fans sing your name', title: 'A step up', text: '{rival} want you a level up. Do you take the step?', stage: 'A bigger stage', stay: 'Stay, and the fans may cheer or boo you.',
            clause: 'Release clause', clauseText: '{rival} have paid your release clause. Take the move of a lifetime, or turn them down and sign a new contract: the fans would never forget it.',
            move: 'The move of a lifetime', renew: 'A new contract, and the fans’ love' },
        es: { cheer: 'La hinchada canta tu nombre', title: 'Un salto de categoría', text: '{rival} te quiere una categoría más arriba. ¿Das el salto?', stage: 'Un escenario más grande', stay: 'Si te quedás, la hinchada puede aplaudirte o abuchearte.',
            clause: 'Cláusula de rescisión', clauseText: '{rival} pagó tu cláusula de rescisión. Aceptá el pase de tu vida, o rechazalo y firmá un contrato nuevo: la hinchada nunca lo olvidaría.',
            move: 'El pase de tu vida', renew: 'Un contrato nuevo y el cariño de la hinchada' },
        pt: { cheer: 'A torcida canta seu nome', title: 'Um salto de divisão', text: '{rival} quer você uma divisão acima. Você dá o salto?', stage: 'Um palco maior', stay: 'Se ficar, a torcida pode aplaudir ou vaiar você.',
            clause: 'Multa rescisória', clauseText: '{rival} pagou sua multa rescisória. Aceite a transferência da sua vida, ou recuse e assine um contrato novo: a torcida nunca esqueceria.',
            move: 'A transferência da sua vida', renew: 'Um contrato novo e o carinho da torcida' }
    };
    const OFF_LIMITS_TEXTS = {
        en: ['{rival} is off limits', 'Your club refuses to sell you to {rival}, but they will let you leave for another club. If you stay, you will have to win the fans back.'],
        es: ['A {rival}, no', 'Tu club se niega a venderte a {rival}, pero te deja irte a otro club. Si te quedás, vas a tener que reconquistar a la hinchada.'],
        pt: ['Para {rival}, não', 'Seu clube se recusa a te vender para {rival}, mas deixa você sair para outro clube. Se ficar, vai ter que reconquistar a torcida.']
    };
    /**
     * Adds the Off limits texts to Copero's texts in the language on screen
     * (one object per language that Copero keeps for the whole visit): Copero's
     * fan backlash title and description of our own, its own "Stay and fight"
     * card. True once they're there.
     */
    function addSceneTexts(fiber) {
        const props = findProps(fiber, p => p.messages && p.messages.careerEvents && p.messages.careerEvents.fan_backlash);
        const backlash = props && props.messages.careerEvents.fan_backlash;
        if (props) careerMessages = props.messages;
        if (!backlash || !backlash.options || !backlash.options.stay_and_fight) return false;
        backlash.variants = backlash.variants || {};
        // The language from Copero's own version of the story
        const lang = { 'Al Barcelona no': 'es', 'Barcelona não': 'pt' }[(backlash.variants.barcelona_no || {}).title] || 'en';
        if (!backlash.variants[OFF_LIMITS]) {
            const [title, description] = OFF_LIMITS_TEXTS[lang];
            backlash.variants[OFF_LIMITS] = { title: title, description: description, options: { stay_and_fight: backlash.options.stay_and_fight } };
        }
        const enzo = backlash.variants.enzo_city;
        if (!backlash.variants[RELEASE] && enzo && enzo.options && enzo.options.stay && enzo.options.join_club) {
            const words = SCENE_TEXTS[lang];
            // Two outcomes on the Stay card: the cheer, then Copero's own boo (Copero's club cards don't draw outcomes, so the
            // story's text says it too)
            const stay = { ...enzo.options.stay, positiveOutcome: { description: words.cheer } };
            backlash.variants[SUPERTEAM] = { ...enzo, description: enzo.description + ' ' + words.stay, options: { join_club: enzo.options.join_club, stay: stay } };
            backlash.variants[STEP_UP] = { title: words.title, description: words.text + ' ' + words.stay,
                options: { join_club: { label: enzo.options.join_club.label, positiveOutcome: { description: words.stage } }, stay: stay } };
            backlash.variants[RELEASE] = { title: words.clause, description: words.clauseText,
                options: { join_club: { label: enzo.options.join_club.label, positiveOutcome: { description: words.move } },
                    stay: { label: enzo.options.stay.label, positiveOutcome: { description: words.renew } } } };
        }
        return true;
    }
    /**
     * A transfer window can become one of the story scenes, decided once (the
     * same way on every pass): from 21 to 33, at a club where Copero plays you
     * as a starter or in rotation, not on loan or just after a ban. The scene
     * is a Copero fan backlash event:
     * - Off limits: the rival is your club's fierce rival (RIVALS) if it wants
     *   you, else a bigger club of your country that does; the cards are
     *   Copero's own "Stay and fight" (-2 OVR until the end of the stretch) and
     *   one of the window's other clubs.
     * - Release clause (the top flight; it was our own
     *   superteam story, too like Copero's): a bigger club anywhere that wants
     *   you pays your release clause; joining is a plain transfer (you're their
     *   big signing), Stay is a new contract (contractLeft: 3-4 seasons, so no
     *   club lets you go meanwhile) and the fans' love.
     * - A step up (below the top flight, instead of the superteam): a club of
     *   your country a division or more up that wants you; joining is a plain
     *   transfer, Stay the same cheer or boo.
     */
    function applyScene(state, event, mode) {
        if (event.type !== 'transfer' || event.c99Scene !== undefined || !mode || gameData.status !== 'ready') return;
        event.c99Scene = '';
        const player = state.player;
        const here = state.currentTeamId;
        const team = gameData.teams[here];
        const age = Number(player.age) || 0;
        const last = state.seasons[state.seasons.length - 1];
        const rng = seeded(String(state.seed) + ':scene:' + event.id);
        if (!team || state.activeLoan || age < 21 || age > 33 || event.c99Options || (last && last.suspended) ||
            rng() >= 1 - Math.pow(1 - SCENES.chance, PERIOD_SEASONS[state.mode] || 2)) return;
        const keeper = playerRole(player) === 'goalkeeper';
        const role = squadRole((Number(player.overall) || 0) - clubLevel(here), keeper, 0);
        if (role !== 'starter' && role !== 'high_rotation') return;
        const done = (state.careerEventPlan && state.careerEventPlan.completedEventKeys) || [];
        const wants = marketBars(state, String(state.seed) + ':' + event.id, true);
        const code = (player.nationality || {}).fifa_code;
        const fits = (id) => id !== here && !!gameData.teams[id] && gameData.teams[id].country === team.country && (!CLUB_RULES[id] || CLUB_RULES[id] === code) && wants(id);
        // Copero's own rule for who can build a superteam (br): a club of your country as big at home and in the world
        const [home, , world] = repOf(here);
        // Copero only moves your club between divisions (teamTierOverrides); a bigger club plays in your division or above
        const tierNow = (id) => Number((state.teamTierOverrides || {})[id]) || gameData.teams[id].tier;
        const bigger = Object.keys(gameData.teams).filter(id => fits(id) && repOf(id)[0] >= home && repOf(id)[2] >= world && tierNow(id) <= tierNow(here));
        const lower = tierNow(here) > 1;
        const climb = lower ? Object.keys(gameData.teams).filter(id => fits(id) && tierNow(id) < tierNow(here)) : [];
        // A release clause: a top-flight club anywhere, bigger than yours (in the world, and at home and in Europe together),
        // that wants you; never your club's fierce rival (that's Off limits), never a club you've already played for (one you
        // just left paying to have you back made no sense)
        const played = new Set(state.seasons.map(season => season && season.teamId));
        const buyers = lower ? [] : Object.keys(gameData.teams).filter(id => id !== here && !played.has(id) && gameData.teams[id].tier === 1 && tierNow(id) === 1 &&
            (!CLUB_RULES[id] || CLUB_RULES[id] === code) && !RIVAL_PAIRS.has([here, id].sort().join('|')) &&
            repOf(id)[2] >= world && repOf(id)[0] + repOf(id)[1] > home + repOf(here)[1] && wants(id));
        const derby = RIVALS.filter(pair => pair.indexOf(here) >= 0).map(pair => (pair[0] === here ? pair[1] : pair[0])).filter(fits);
        const rival = derby[0] || (bigger.length ? weightedPick(bigger, id => Math.pow(2, repOf(id)[0] + repOf(id)[2]), rng) : null);
        const other = event.options.find(option => option && option.type === 'join_club' && option.teamId !== here && option.teamId !== rival);
        const scenes = [];
        if (rival && other && done.indexOf('fan_backlash') < 0) scenes.push('offLimits');
        // Once a career each: a step up (not after Copero's own superteam offer, the same story), a release clause
        const told = (key) => (state.log || []).some(entry => entry && entry.payload && entry.payload.variantKey === key);
        if (lower && climb.length && done.indexOf('rival_offer') < 0 && !told(STEP_UP)) scenes.push('stepUp');
        if (buyers.length && !told(RELEASE) && !told(SUPERTEAM)) scenes.push('release');
        if (!scenes.length) return;
        const scene = scenes[Math.floor(rng() * scenes.length)];
        const builder = scene === 'offLimits' ? rival : scene === 'stepUp' ? weightedPick(climb, id => Math.pow(2, repOf(id)[0] + repOf(id)[2]), rng)
            : weightedPick(buyers, id => Math.pow(2, repOf(id)[1] + repOf(id)[2]) * leaguePull(id), rng);
        event.c99Scene = scene;
        event.type = 'career_event';
        event.eventKey = 'fan_backlash';
        event.variantKey = scene === 'release' ? RELEASE : scene === 'stepUp' ? STEP_UP : OFF_LIMITS;
        event.rivalTeamId = builder;
        event.age = age;
        const stay = { id: 'c99-superteam-stay-' + here, type: 'stay', teamId: here, c99Scene: 'stay' };
        event.options.splice(0, event.options.length, ...(scene === 'release' ? [{ id: 'c99-release-' + builder, type: 'join_club', teamId: builder },
            { id: 'c99-release-stay-' + here, type: 'stay', teamId: here, c99Scene: 'renew' }]
            : scene === 'stepUp' ? [{ id: 'c99-step-up-' + builder, type: 'join_club', teamId: builder }, stay]
            : [{ id: 'fan_backlash-stay_and_fight', type: 'career_choice', eventKey: 'fan_backlash', optionKey: 'stay_and_fight' },
                { id: 'c99-off-limits-' + other.teamId, type: 'join_club', teamId: other.teamId }]));
        changed = true;
    }
    // How the fans take staying in the superteam story: true = they cheer (half the time, the same way for an event)
    const superteamCheer = (state, event) => seeded(String(state.seed) + ':superteam-stay:' + event.id)() < 0.5;

