    // ========================================================================
    // The main loop and reacting to Copero's page changes
    // ========================================================================

    let lastPass = 0;
    let passTimer = null;
    function mainLoop() {
        lastPass = Date.now();
        try {
            const state = applyPatch();
            currentState = state;
            if (!state) {
                liveState = null;
                animating = false;
                restoreWorld();
            }
            // The script runs on every Copero page (the site changes pages without reloading), so the game file is read
            // as soon as the simulator is open: its clubs and trophies are ready by the time a career starts
            if (gameData.status === 'idle' && document.querySelector('[data-career-phase]')) loadGameData();
            saveToHallOfFame(state);
            updateStatus(state);
            ensureLaunchers();
            refreshRewind(state);
            decorateCards(state);
            decorateAchievements(state);
            guardAchievements([liveState, state]);
            markBlockedInjury(state);
            fitTrophyCase();
            fitSeasonTable();
            placeSummaryButtons(state);
            placeRandomPicks();
            pressRetire(state);
            placeFlip();
            if (introPending && state) playIntro();
            refreshPanel();
            applyLook();
            // What the info box points at was redrawn away
            if (tipTarget && !tipTarget.isConnected) hideTip();
        } catch (e) {
            console.warn('[99] loop error:', e);
        }
    }
    /**
     * Copero redraws parts of its page all the time (new cards, the pill row,
     * the end screen). A pass as soon as it does puts the script's buttons,
     * pips and boxes in before the browser paints, so nothing flickers or
     * shows up late. At most one pass every 50 ms; the 500 ms timer stays as
     * a fallback.
     */
    // Parts of Copero's page the script adds to: new decision cards and the card's pill row get their extras before the next paint
    const DECORATED = '[class*="lg:grid-cols-4"], div[class*="h-[18px]"], ' + ACH_PICTURES;
    // The script's own buttons, pips and boxes: their changes need no pass of their own
    const isOwn = (node) => node.nodeType === 1 && !!node.closest('.c99-own, #copero99-menu, #copero99-modal, #copero99-toasts');
    function onPageChange(all) {
        const textOnly = (record) => [...record.addedNodes, ...record.removedNodes].every(node => node.nodeType === 3);
        const records = all.filter(record => !isOwn(record.target) && !textOnly(record) && ![...record.addedNodes, ...record.removedNodes].every(isOwn));
        // (Copero's achievements window is outside the game, in a window of its own)
        const inGame = (node) => node.nodeType === 1 && (node.closest('[data-career-phase]') || !!(node.closest('article') || node).querySelector('[data-career-phase], ' + ACH_PICTURES));
        if (!records.some(record => inGame(record.target) || [...record.addedNodes].some(inGame))) return;
        const decorated = (node) => node.nodeType === 1 && (node.matches(DECORATED) || !!node.querySelector(DECORATED));
        const urgent = records.some(record => (record.target.nodeType === 1 && record.target.matches(DECORATED)) || [...record.addedNodes].some(decorated));
        if (urgent) {
            clearTimeout(passTimer);
            passTimer = null;
            cancelAnimationFrame(passFrame);
            passFrame = 0;
            mainLoop();
            return;
        }
        schedulePass();
    }
    // (Chirp: the site lagged at every decision: Copero's animation changes the page many times a
    // second, and a pass at each change (every 50 ms) measured the page again each time, making the browser lay it all out
    // there and then)
    const PASS_GAP = 100;
    let passFrame = 0;
    function schedulePass() {
        if (passTimer || passFrame) return;
        const frame = () => {
            passFrame = requestAnimationFrame(() => {
                passFrame = 0;
                mainLoop();
            });
        };
        const wait = PASS_GAP - (Date.now() - lastPass);
        if (wait <= 0) frame();
        else passTimer = setTimeout(() => {
            passTimer = null;
            frame();
        }, wait);
    }

