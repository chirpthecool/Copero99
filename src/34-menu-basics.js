    // ========================================================================
    // The panel's state, tabs, sliders and pop-up messages
    // ========================================================================

    // MENU (a side panel styled like Copero's own windows)

    let menuElement = null;
    let fabElement = null;
    let modalElement = null;
    let lastAge = null;
    let lastLockSig = '';
    let lastLocked = null;
    let lastSealed = null; // Whether the boost card was last drawn sealed (it opens when the career ends)
    let lastMode;
    const TABS = ['ovr', 'hof'];
    // Shown under the mode buttons
    const MODE_HINTS = {
        boost: "Copero still rolls your OVR; your boost shapes it season by season. Copero's events count in full, and the Ballon d'Or is a real vote.",
        fixed: "Your own boost, the same every career. Copero still rolls your OVR; the boost shapes it season by season.",
        max: 'Your OVR stays at 99.',
        age: "Your OVR follows the curve below, plus whatever Copero's events add or take."
    };
    // Shown in the status card
    const MODE_STATUS = {
        max: 'always 99',
        age: 'planned curve'
    };
    // Slider rows: [config key, label, short description, how the value is shown, step]
    const SLIDERS = [
        ['peakOverall', 'Best OVR', 'The highest OVR you reach.', v => String(v)],
        ['peakAge', 'Peak age', 'The age you reach it.', v => String(v)],
        ['growthPerYear', 'Growth per year', 'OVR gained each year before the peak.', v => '+' + v],
        ['declineStartAge', 'Decline starts at', 'The age your OVR starts dropping.', v => String(v)],
        ['declinePerYear', 'Decline per year', 'OVR lost each year after that.', v => '−' + v],
        ['minOverall', 'Lowest OVR', 'Your OVR never falls below this.', v => String(v)],
        ['variance', 'Random swing', 'A random ± change each season.', v => (v === 0 ? 'Off' : '±' + v)]
    ];
    const BOOST_SLIDERS = [
        ['boostGrowth', 'Growth boost', "Multiplies Copero's OVR gains.", v => (v === 100 ? 'Off' : '×' + v / 100), 5],
        ['boostCap', 'Potential', 'Gains are boosted up to this OVR.', v => (v === 99 ? 'No limit' : String(v))],
        ['boostPeak', 'Peak age', 'The age you reach your potential by.', v => String(v)],
        ['boostAbove', 'Growth past potential', 'How much of a gain still counts beyond it.', v => v + '%', 5],
        ['boostDecline', 'Drops felt', 'How much of each OVR drop you feel.', v => v + '%', 5],
        ['boostStart', 'Head start', 'OVR added at 16 (Copero starts everyone at 50).', v => (v === 0 ? 'Off' : '+' + v)],
        ['boostGoals', 'Goals', 'More or fewer goals than Copero gives.', v => (v === 0 ? 'Off' : signed(v) + '%')],
        ['boostAssists', 'Assists', 'More or fewer assists than Copero gives.', v => (v === 0 ? 'Off' : signed(v) + '%')],
        ['boostApps', 'Games', 'More or fewer games a season (goals and assists follow).', v => (v === 0 ? 'Off' : signed(v) + '%')]
    ];
    const OFFER_SLIDERS = [
        ['offerQuality', 'Offer quality', 'How big the clubs that want you are.', v => ['Much worse', 'Worse', 'Normal', 'Better', 'Much better'][v + 2]]
    ];
    // Sandbox modifiers: Boost's playing traits, set by hand
    const SANDBOX_SLIDERS = [
        ['sandboxGoals', 'Goals', 'More or fewer goals than Copero gives (a keeper: clean sheets).', v => (v === 0 ? 'Off' : signed(v) + '%')],
        ['sandboxAssists', 'Assists', 'More or fewer assists than Copero gives (a keeper: fewer or more goals conceded).', v => (v === 0 ? 'Off' : signed(v) + '%')],
        ['sandboxApps', 'Games', 'More or fewer games a season (goals and assists follow).', v => (v === 0 ? 'Off' : signed(v) + '%')]
    ];
    const ALL_SLIDERS = SLIDERS.concat(BOOST_SLIDERS, OFFER_SLIDERS, SANDBOX_SLIDERS);
    // Age-style presets shown as buttons (God Mode is the "Always 99" mode)
    const STYLE_PRESETS = Object.keys(PRESETS).filter(key => key !== 'god');
    // Pop-ups: in the bottom-left corner (the empty space beside Copero's card on wide screens, so they never cover the
    // game), with the Copero99 diamond, on screen long enough to read (4-8 s). The same message shows once, at most 2 at a time
    let holdToasts = false;   // Set while the coming season is patched during its animation
    const heldToasts = [];
    const MAX_TOASTS = 2;
    function toast(message, force) {
        if (!force && !config.notifications) return;
        if (holdToasts) {
            if (heldToasts.indexOf(message) < 0) heldToasts.push(message);
            return;
        }
        if (!document.body) return;
        let box = document.getElementById('copero99-toasts');
        if (!box) {
            box = document.createElement('div');
            box.id = 'copero99-toasts';
            box.setAttribute('role', 'status');
            document.body.appendChild(box);
        }
        // Already showing: it just stays a little longer
        const same = [...box.children].find(item => item.c99Text === message && !item.classList.contains('leaving'));
        if (same) same.remove();
        const life = clamp(3000 + String(message).length * 50, 4000, 8000);
        const item = el('div', 'toast');
        item.c99Text = message;
        item.innerHTML = gemIcon();
        item.appendChild(el('span', 'toast-text', message));
        item.style.setProperty('--life', life + 'ms');
        box.appendChild(item);
        while (box.children.length > MAX_TOASTS) box.removeChild(box.firstChild);
        setTimeout(() => item.classList.add('leaving'), life);
        setTimeout(() => item.remove(), life + 300);
    }
    // The season has landed: the pop-ups about it can show now
    function flushToasts() {
        while (heldToasts.length) toast(heldToasts.shift(), true);
    }

