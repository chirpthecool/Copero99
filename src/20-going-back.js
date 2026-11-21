    // ========================================================================
    // Going back in time and starting over
    // ========================================================================

    // GOING BACK (the career as it was at each decision)

    // Copero keeps a career only while its page is open, so these copies do too: one per decision,
    // { step, age, seasons, sig, state, boost, world, stats, cap }
    let snapshots = [];
    let snapshotSeed = '';
    let careerHook = null;  // The hook holding the career on screen (its setter puts a copy back)
    const copy = (value) => (value == null ? null : typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
    /**
     * Keeps a copy of the career at the decision on screen, with the script's
     * own memory of it (boost, Living world, counters). While the decision is
     * on screen its copy follows changes (picking a mode or rerolling before
     * the first season).
     */
    function takeSnapshot(state) {
        // Only Sandbox goes back to a decision (Boost and Vanilla start a new career instead, startOver)
        if (!state.player || state.phase === 'summary' || stats.picked !== 'sandbox') return;
        const seed = String(state.seed);
        if (snapshotSeed !== seed) {
            snapshotSeed = seed;
            snapshots = [];
        }
        const options = state.currentEvent && Array.isArray(state.currentEvent.options) ? state.currentEvent.options : [];
        const sig = JSON.stringify([state.step, state.seasons.length, state.player.overall, stats.picked, boostSig(), options.map(o => o && o.teamId)]);
        const at = snapshots.findIndex(snap => snap.step === state.step);
        if (at >= 0 && snapshots[at].sig === sig) return;
        const snap = {
            step: state.step, age: Number(state.player.age) || CURVE_MIN_AGE, seasons: state.seasons.length, sig: sig, state: copy(state),
            boost: boostMemo && boostMemo.seed === seed ? copy(boostMemo) : null, world: world && world.seed === seed ? copy(world) : null,
            stats: { ...stats }, cap: config.boostCap
        };
        if (at >= 0) snapshots[at] = snap;
        else snapshots.push(snap);
    }
    /**
     * Puts the career back as it was at a saved decision, with a new fate from
     * there: the game's random numbers start somewhere new, so the same
     * choices can turn out differently. The script's memory of the career
     * (boost, Living world, counters, the Stay gamble's potential) goes back
     * with it; what keeps a career out of the Hall of Fame (a reroll, cheats) stays.
     */
    function goBack(snap) {
        if (!careerHook || animating || !currentState || String(currentState.seed) !== snapshotSeed) return;
        const state = copy(snap.state);
        state.rngState = Math.floor(Math.random() * 4294967295) + 1;
        boostMemo = copy(snap.boost);
        storeSet('copero99_boost', boostMemo);
        world = copy(snap.world);
        saveWorld();
        for (const key of ['injuries', 'suspensions', 'loans', 'seasonsSeen', 'retireTold', 'banSeen', 'loanGrew', 'farewell', 'farewellWay']) stats[key] = snap.stats[key] !== undefined ? snap.stats[key] : 0;
        if (stats.picked === 'boost' && config.boostCap !== snap.cap) {
            const asRolled = stats.rolled === boostSig();
            config.boostCap = snap.cap;
            if (asRolled) stats.rolled = boostSig();
            saveConfig();
        }
        saveStats();
        snapshots = snapshots.filter(s => s.step <= snap.step);
        history = history.filter(item => item.age < snap.age);
        saveHistory();
        for (const age of Object.keys(rawOvr.ages)) if (Number(age) > snap.age) delete rawOvr.ages[age];
        lastAge = null;
        lastBoostNote = '';
        lastWorldSig = '';
        worldPick = null;
        retireNow = '';
        hofAsked = '';
        careerHook.queue.dispatch(state);
        toast(snap.seasons ? '⏪ Back to age ' + snap.age + '. What happens next is up to Copero again.' : '⏪ Back to 16: the same player, a new story.', true);
    }
    /**
     * Boost and Vanilla start over the way Copero's own "Play again" does: the
     * same player (name, country, position, number, foot) in a brand-new
     * career, so Copero rolls everything again (academy clubs, development,
     * tournaments). It is a new career like any other: the panel opens on the
     * pick (Boost, Sandbox or Vanilla) and Boost rolls a new boost. The script
     * confirms Copero's name screen itself (hidden while it does).
     */
    function startOver() {
        const page = gameHandler('onReplay');
        if (!page || animating) return;
        const root = document.documentElement;
        root.classList.add('c99-restarting');
        page.onReplay();
        let tries = 0;
        const confirm = () => {
            const names = gameHandler('onConfirm', 'identity');
            if (names && names.initialIdentity) {
                names.onConfirm(names.initialIdentity);
                // trackCareer shows the page again as soon as the new career is there
                setTimeout(() => root.classList.remove('c99-restarting'), 1500);
            } else if (++tries < 50) {
                setTimeout(confirm, 20);
            } else {
                // Copero's name screen never came up filled in: it stays on screen to start the career by hand
                root.classList.remove('c99-restarting');
            }
        };
        setTimeout(confirm, 0);
    }
    // Decisions a Sandbox career can go back to: any earlier one of this visit (Boost and Vanilla only start over, so
    // going back a season or two can't dodge whatever Copero rolled)
    function rewindTargets(state) {
        if (!state || !state.player || !state.seasons.length || String(state.seed) !== snapshotSeed) return [];
        return snapshots.filter(snap => snap.step < state.step);
    }
    // The red tile in the card's pill row (and the panel's button on narrow screens): shown once a season is played
    // (Sandbox: once there is a decision to go back to)
    function refreshRewind(state) {
        const sandbox = stats.picked === 'sandbox';
        const show = !!state && !!state.player && state.seasons.length > 0 && (!sandbox || rewindTargets(state).length > 0);
        const label = sandbox ? 'Go back in time' : 'Start over at 16';
        document.querySelectorAll('.c99-rewind').forEach(button => {
            put(button, 'hidden', !show);
            put(button, 'disabled', animating);
            setTip(button, sandbox ? 'Go back in time: replay seasons with a new outcome' : 'Start over at 16: the same player in a new career');
            if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
            if (button.id && button.textContent !== label) button.textContent = label;
        });
    }
    /**
     * Going back, asked first: Sandbox picks how far back (any earlier
     * decision of this visit); Boost and Vanilla careers only start over at 16.
     */
    function requestRewind() {
        const state = currentState;
        if (animating || !state || !state.player || !state.seasons.length) return;
        if (stats.picked !== 'sandbox') {
            confirmModal('Start over at 16?', 'This career ends here. You start again at 16 as the same player in a brand-new career: Copero rolls everything again ' +
                '(new academy clubs, a new story), and you choose Boost, Sandbox or Vanilla again.', 'Start over', startOver, true);
            return;
        }
        const targets = rewindTargets(state);
        if (!targets.length) return;
        const age = Number(state.player.age) || 0;
        const body = el('div', 'rewind-pick');
        body.appendChild(el('div', 'muted', 'Everything after it is undone. From there Copero plays it out again, so the same choices can end differently.'));
        const select = el('select');
        for (const snap of targets.slice().reverse()) {
            const years = age - snap.age;
            const option = el('option', '', (years > 0 ? years + (years === 1 ? ' year back' : ' years back') : 'An earlier decision') + ' · age ' + snap.age);
            option.value = String(snap.step);
            select.appendChild(option);
        }
        body.appendChild(select);
        body.appendChild(el('div', 'muted', 'Or start over at 16 in a brand-new career (and choose Boost, Sandbox or Vanilla again).'));
        openModal('Go back in time', '', {
            body: body,
            buttons: [['Go back', 'btn primary', () => {
                const snap = targets.find(s => String(s.step) === select.value);
                closeModal();
                if (snap) goBack(snap);
            }], ['Start over', 'btn', () => {
                closeModal();
                startOver();
            }]],
            closeLabel: 'Cancel'
        });
    }

