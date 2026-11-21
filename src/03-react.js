    // ========================================================================
    // Reading Copero's React state: the career, its catalog and its handlers
    // ========================================================================

    function findReactFiber(dom) {
        const keys = Object.keys(dom);
        for (const key of keys) {
            if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                return dom[key];
            }
        }
        return null;
    }
    // Real careers have a seasons list; the game's hidden debug panel also has a player but no seasons
    function isCareer(state) {
        return !!state && typeof state === 'object' && !!state.player && typeof state.player === 'object' &&
            'overall' in state.player && Array.isArray(state.seasons);
    }
    // React keeps two copies of each component and the page element can point at the older one; the hook's queue is
    // shared and always holds what is on screen now
    const hookValue = (hook) => (hook.queue && 'lastRenderedState' in hook.queue ? hook.queue.lastRenderedState : hook.memoizedState);
    /**
     * Finds the career by walking the fiber's useState hooks. Returns
     * { hook, state, next, phase, celebration }: the hook holding the career
     * on screen, the career itself, the next season while the game is
     * animating towards it (null otherwise) with the animation's phase, and
     * then also the list of trophies and awards the game will celebrate (the
     * hook right after the animation's).
     */
    function findCareer(fiber) {
        let current = fiber;
        let depth = 0;
        while (current && depth < 30) {
            let career = null;
            let state = null;
            let next = null;
            let phase = null;
            let celebration = null;
            for (let hook = current.memoizedState; hook && typeof hook === 'object'; hook = hook.next) {
                const value = hookValue(hook);
                if (!value || typeof value !== 'object') continue;
                if (!career && isCareer(value)) {
                    career = hook;
                    state = value;
                }
                // During the season animation the game keeps the coming season in { previousState, nextState, phase }
                else if (isCareer(value.nextState)) {
                    next = value.nextState;
                    phase = value.phase;
                    const after = hook.next && hookValue(hook.next);
                    if (Array.isArray(after)) celebration = after;
                }
            }
            if (career) return { hook: career, state: state, next: next, phase: phase, celebration: celebration };
            current = current.return;
            depth++;
        }
        return null;
    }
    /**
     * The script edits the career in place, which React doesn't notice, so
     * the page kept showing old numbers until the next click. Handing the
     * game's own setter a copy of the same career makes the page redraw.
     */
    function redraw(hook, state) {
        if (hook.queue && typeof hook.queue.dispatch === 'function') {
            hook.queue.dispatch(latest => (latest === state ? { ...state } : latest));
        }
    }
    /**
     * Copero counts the header's numbers up with a counter that remembers
     * where its last count ended (its `Ce`: a useState plus an effect). A
     * value the script changed outside a count (Boost's starting talent,
     * Sandbox's 99, going back) left it behind, so the next count opened with
     * one frame of the old number: the OVR box flickered 68 > 50 > 68 (Chirp).
     * Between seasons the counters are set to what's on screen. The
     * header's counters, in Copero's order: OVR, age, market value, then the
     * totals (`?? 0` as Copero reads them).
     */
    const COUNTERS = [s => s.player.overall, s => s.player.age, s => s.player.marketValue, s => s.totals.appearances,
        s => s.totals.goals, s => s.totals.assists, s => s.totals.goalsConceded, s => s.totals.cleanSheets];
    function syncCounters(state) {
        const badge = document.querySelector('[data-career-phase] [class*="!h-[68px]"]');
        let fiber = badge && findReactFiber(badge);
        while (fiber && !(fiber.memoizedProps && typeof fiber.memoizedProps === 'object' && 'simulation' in fiber.memoizedProps && 'celebrationItems' in fiber.memoizedProps)) fiber = fiber.return;
        if (!fiber || fiber.memoizedProps.simulation || !state.player || !state.totals) return;
        const counters = [];
        for (let hook = fiber.memoizedState; hook && typeof hook === 'object'; hook = hook.next) {
            if (hook.queue && typeof hook.queue.dispatch === 'function') counters.push(hook);
        }
        // Anything else means Copero changed its header: leave it alone
        if (counters.length !== COUNTERS.length) return;
        COUNTERS.forEach((read, k) => {
            const value = read(state) ?? 0;
            const queue = counters[k].queue;
            if (typeof value === 'number' && typeof queue.lastRenderedState === 'number' && queue.lastRenderedState !== value) queue.dispatch(value);
        });
    }
    /**
     * The career screen gets the game's club list as a `catalog` prop. The
     * game reads reputations from those objects for trophy odds, playing time
     * and offers, so changing them changes the game. (Which clubs the game
     * looks at for an offer is grouped once by the original international
     * reputation, so that grouping stays as it was.)
     */
    function findCatalog(fiber) {
        const props = findProps(fiber, p => p.catalog && Array.isArray(p.catalog.competitions));
        if (!props) return null;
        const teams = {};
        for (const competition of props.catalog.competitions) {
            for (const team of (competition && competition.teams) || []) {
                if (team && typeof team.id === 'string') teams[team.id] = renameClub(team);
            }
        }
        return teams;
    }
    // The props of the first of Copero's components under a page element's fiber that passes `test`. The element can
    // point at React's other copy of itself, whose children aren't filled in (seen on the name screen), so both are searched
    function findProps(fiber, test) {
        const stack = fiber ? [fiber.child, fiber.alternate && fiber.alternate.child].filter(Boolean) : [];
        for (let seen = 0; stack.length && seen < 300; seen++) {
            const node = stack.pop();
            if (node.memoizedProps && test(node.memoizedProps)) return node.memoizedProps;
            if (node.sibling) stack.push(node.sibling);
            if (node.child) stack.push(node.child);
        }
        return null;
    }
    // A handler Copero's career page hands one of its components (its "Play again", the name screen's confirm), with that component's other props
    function gameHandler(name, phase) {
        for (const container of document.querySelectorAll(phase ? '[data-career-phase="' + phase + '"]' : '[data-career-phase]')) {
            const props = findProps(findReactFiber(container), p => typeof p[name] === 'function');
            if (props) return props;
        }
        return null;
    }

