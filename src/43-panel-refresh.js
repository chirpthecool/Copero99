    // ========================================================================
    // Keeping the panel up to date
    // ========================================================================

    function updateStatus(state) {
        if (!menuElement) return;
        const m = menuElement;
        setText(m.querySelector('#copero99-count-inj'), stats.injuries + (stats.injuries === 1 ? ' injury' : ' injuries') + ' blocked this career');
        setText(m.querySelector('#copero99-count-sus'), stats.suspensions + (stats.suspensions === 1 ? ' ban' : ' bans') + ' lifted this career');
        // The first season locks the mode and the boost, so their buttons change then
        if (careerStarted() !== lastLocked) refreshLockUI();
        // Adjust this boost left open by an earlier career (the panel outlives a career) would skip its question
        const adjustFold = m.querySelector('#copero99-boost-adjust');
        if (adjustFold.open && stats.picked === 'boost' && !stats.peeked) adjustFold.open = false;
        // The sealed boost card opens when the career ends
        if (boostSealed() !== lastSealed) {
            lastSealed = boostSealed();
            updateCurveControls();
        }
        // Worked out as the season animates in, but shown once it has landed
        if (!animating) {
            const note = m.querySelector('#copero99-boost-note');
            const text = lastBoostNote
                ? (lastBoostSeasons > 1 ? 'Last ' + lastBoostSeasons + ' seasons: ' : 'Last season: ') + lastBoostNote
                : 'After each season, the boost’s effect shows here.';
            if (note.dataset.text !== text) {
                // How a club suits you stands out (Chirp: "not clicking" was easy to miss): a glowing pill, red or green
                note.dataset.text = text;
                note.textContent = '';
                text.split(' · ').forEach((part, i) => {
                    if (i) note.appendChild(document.createTextNode(' · '));
                    const fit = /^not clicking at /.test(part) ? 'bad' : /^thriving at /.test(part) ? 'good' : '';
                    note.appendChild(fit ? el('span', 'c99-fit ' + fit, part) : document.createTextNode(part));
                });
            }
        }

        refreshQuickChips(state);
        renderWorld(worldState());
        refreshPanelCrest(state);
        const blockers = state && state.player ? hofBlockers() : null;
        const check = m.querySelector('#copero99-hof-check');
        const checkText = !blockers ? '' : blockers.length ? '✗ This career can’t go into the Hall of Fame: ' + blockers.join(', ')
            : '✓ This ' + (stats.picked === 'boost' ? 'Copero99' : 'Vanilla') + ' career can go into the Hall of Fame';
        if (check.textContent !== checkText) {
            check.textContent = checkText;
            check.classList.toggle('no', !!blockers && blockers.length > 0);
        }
        put(m.querySelector('#copero99-hof-save'), 'hidden', !hofSavable(state));
        // The game already shows the age, so the status line is just the mode (boost level in its colour)
        const sub = m.querySelector('#copero99-status-sub');
        if (!state || !state.player) {
            setText(sub, '');
            setText(m.querySelector('#copero99-status'), 'Waiting for a career…');
            return;
        }

        const player = state.player;
        const age = player.age || 16;
        const mode = currentMode();
        // A new career (back to the pick) or a pick changes what the Career tab shows; updateMenuUI comes back here
        const shown = mode || (vanillaCareer() ? 'vanilla' : null);
        if (shown !== lastMode) {
            lastMode = shown;
            if (!shown) ui.tab = 'ovr';
            updateMenuUI();
            return;
        }
        setText(m.querySelector('#copero99-status'), '');
        // (nothing while the scouting report is sealed)
        const subSig = !mode ? (vanillaCareer() ? 'Vanilla career' : 'Choose a mode') : mode === 'boost' && boostSealed() ? '' : mode + ':' + (mode === 'boost' ? currentTier().colour + ':' + currentTier().name : MODE_STATUS[mode]);
        if (sub.c99Sig !== subSig) {
            sub.c99Sig = subSig;
            sub.textContent = '';
            if (!mode) {
                sub.textContent = subSig;
            } else if (subSig) {
                sub.appendChild(document.createTextNode(mode === 'boost' ? 'Boost: ' : 'Sandbox: '));
                sub.appendChild(mode === 'boost' ? el('span', 'tier-text ' + currentTier().colour, currentTier().name) : el('span', 'sandbox-text', MODE_STATUS[mode]));
            }
        }

        const lockSig = JSON.stringify(lockStatus);
        if (lockSig !== lastLockSig) {
            lastLockSig = lockSig;
            renderLocks();
        }

        if (age !== lastAge) {
            lastAge = age;
            recordHistory(age, rawOvr.seed === String(state.seed) && age in rawOvr.ages ? rawOvr.ages[age] : player.overall, player.overall);
            renderPreview();
        }
    }
    function updateMenuUI() {
        if (!menuElement) return;
        const m = menuElement;

        const tab = TABS.indexOf(ui.tab) >= 0 ? ui.tab : 'ovr';
        m.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        m.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));

        const mode = currentMode();
        const sandbox = !!mode && mode !== 'boost';
        m.querySelector('#copero99-pick').style.display = mode ? 'none' : '';
        m.querySelector('#copero99-mode-area').style.display = mode ? '' : 'none';
        // The picked mode as one badge
        const badge = m.querySelector('#copero99-mode-badge');
        badge.classList.toggle('boost', mode === 'boost');
        badge.classList.toggle('sandbox', sandbox);
        const badgeHtml = mode ? icon(mode === 'boost' ? 'rocket' : 'gamepad') + '<b>' + (mode === 'boost' ? 'Boost' : 'Sandbox') + '</b><span>Set for this career</span>' + icon('lock') : '';
        if (badge.innerHTML !== badgeHtml) badge.innerHTML = badgeHtml;
        // Inside Sandbox: Planned curve or Always 99
        m.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        m.querySelector('#copero99-mode-hint').textContent = mode ? MODE_HINTS[mode === 'boost' && !config.boostRandom ? 'fixed' : mode] : '';
        m.querySelector('#copero99-boost-box').style.display = mode === 'boost' ? '' : 'none';
        m.querySelector('#copero99-sandbox-box').style.display = sandbox ? '' : 'none';
        m.querySelector('#copero99-age-box').style.display = mode === 'age' ? '' : 'none';
        m.querySelector('#copero99-reroll-boost').style.display = config.boostRandom ? '' : 'none';
        m.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === config.boostStyle));
        m.querySelectorAll('[data-tier]').forEach(b => b.classList.toggle('active', b.dataset.tier === config.boostTier));
        m.querySelectorAll('[data-perk]').forEach(b => b.classList.toggle('active', hasPerk(b.dataset.perk)));
        m.querySelectorAll('[data-role]').forEach(b => b.classList.toggle('active', b.dataset.role === config.boostRole));
        m.querySelectorAll('[data-sperk]').forEach(b => b.classList.toggle('active', config.sandboxPerks.indexOf(b.dataset.sperk) >= 0));
        m.querySelectorAll('[data-srole]').forEach(b => b.classList.toggle('active', b.dataset.srole === config.sandboxRole));
        refreshLockUI();
        if (tab === 'hof') renderHofList();

        m.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = !!config[cb.dataset.key];
        });
        m.querySelectorAll('input[data-curve]').forEach(input => {
            input.value = config.customCurve[parseInt(input.dataset.curve, 10)];
        });
        m.querySelector('#copero99-sliders').style.display = config.useCustomCurve ? 'none' : '';
        m.querySelector('#copero99-curve-note').style.display = config.useCustomCurve ? '' : 'none';

        renderLocks();
        updateCurveControls();
        dockChart();
        // The status line names the mode, so refresh it now instead of on the next pass
        updateStatus(currentState);
    }
    // After the first season the boost is set for the career; a career without a pick by then is Vanilla
    function refreshLockUI() {
        const m = menuElement;
        const locked = careerStarted();
        lastLocked = locked;
        const reroll = m.querySelector('#copero99-reroll-boost');
        const left = rerollsLeft();
        put(reroll, 'disabled', locked || !left);
        // The dice carries how many rerolls are left (1 free one; unlimited once Adjust this boost was opened)
        const html = locked ? icon('lock') + 'Locked' : '<span class="reroll-dice">' + icon('dice') + '<i>' + (left === Infinity ? '∞' : left) + '</i></span>Reroll';
        if (reroll.innerHTML !== html) reroll.innerHTML = html;
        setTip(reroll, locked ? 'A boost can only be rerolled before your first season'
            : left === Infinity ? 'Roll a new boost, as often as you like (you opened Adjust this boost)'
                : left ? 'Your one free reroll: the career still counts for the Hall of Fame' : 'Free reroll used. Adjust this boost allows more, but the career then can’t go into the Hall of Fame');
        m.querySelectorAll('#copero99-boost-adjust input, #copero99-boost-adjust button').forEach(input => put(input, 'disabled', locked));
        m.querySelector('#copero99-adjust-lock').style.display = locked ? '' : 'none';
        const warn = m.querySelector('#copero99-reroll-warn');
        warn.textContent = left === Infinity ? 'Unlimited rerolls: you opened Adjust this boost.' : left ? '1 free reroll: the career still counts for the Hall of Fame.'
            : 'Free reroll used. More come with Adjust this boost (no Hall of Fame).';
        warn.style.display = config.boostRandom && !locked ? '' : 'none';
        // Vanilla (picked, or no pick by the first season): a calm card instead of greyed-out choices
        const late = vanillaCareer();
        m.querySelectorAll('[data-pick]').forEach(b => put(b, 'disabled', locked));
        m.querySelector('#copero99-pick-choose').style.display = late ? 'none' : '';
        m.querySelector('#copero99-pick-late').style.display = late ? '' : 'none';
    }
    // The club you play for (from the moment you choose a move), faded: in Vanilla in the empty space at the end of the
    // Career tab (fading in again for every new club), in Boost and Sandbox fainter, behind the Career tab
    function refreshPanelCrest(state) {
        const box = menuElement.querySelector('#copero99-panel-crest');
        const club = state ? clubLogo(playingFor()) : null;
        const behind = !!club && !!currentMode();
        menuElement.classList.toggle('c99-crest-behind', behind);
        if (behind) menuElement.style.setProperty('--c99-crest', 'url(' + JSON.stringify(club) + ')');
        const src = vanillaCareer() ? club : null;
        put(box, 'hidden', !src);
        if (!src || box.dataset.src === src) return;
        box.dataset.src = src;
        box.style.backgroundImage = 'url(' + JSON.stringify(src) + ')';
        box.classList.remove('c99-in');
        void box.offsetWidth; // restarts the fade
        box.classList.add('c99-in');
    }
    // The potential the way a scout would put it: a 5-wide range that holds it, placed by the career's seed so the exact number can't be worked out
    function potentialRange() {
        const state = liveState || currentState;
        const below = hashText(String(state ? state.seed : '') + ':potential') % 5;
        const high = Math.min(CURVE_MAX_OVR, config.boostCap - below + 4);
        return (high - 4) + '–' + high;
    }
    // 1 to 5 dots for where a value sits between the weakest and the strongest a roll can give
    function meterDots(value, weakest, strongest) {
        const on = clamp(1 + Math.round((value - weakest) / (strongest - weakest) * 4), 1, 5);
        const dots = el('span', 'dots');
        for (let i = 1; i <= 5; i++) dots.appendChild(el('i', i <= on ? 'on' : ''));
        return dots;
    }
    /**
     * The boost card (a scouting report), style buttons, sliders and chart:
     * the part of the menu that changes while a slider is being dragged.
     */
    function updateCurveControls() {
        const m = menuElement;
        const preset = STYLE_PRESETS.indexOf(config.preset) >= 0 ? config.preset : 'custom';
        m.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === preset));
        m.querySelector('#copero99-preset-desc').textContent = PRESETS[preset].description;

        const tier = currentTier();
        const style = currentStyle();
        const name = m.querySelector('#copero99-boost-name');
        // Sealed: a closed scouting report with one obscure line, opened when the career ends (or by Adjust this boost)
        const sealed = boostSealed();
        m.querySelector('.boost-card').classList.toggle('sealed', sealed);
        name.textContent = sealed ? 'Sealed scouting report' : tier.name;
        name.className = 'boost-name ' + (sealed ? 'sealed-name' : 'tier-text ' + tier.colour);
        m.querySelector('#copero99-boost-rarity').textContent = sealed ? 'Opens when your career ends' : tierRarity(tier);
        m.querySelector('#copero99-boost-desc').textContent = sealed ? '“' + sealedHint() + '”' : tier.blurb;
        for (const id of ['tiles', 'meters', 'style', 'chips']) put(m.querySelector('#copero99-boost-' + id), 'hidden', sealed);
        m.querySelector('#copero99-boost-tag').textContent = sealed || config.boostRandom ? 'Rolled for this career' : 'Your own boost';
        // A goalkeeper's goals and assists sliders are his clean sheets and goals conceded
        const keeper = keeperOnScreen();
        for (const [key, words] of [['boostGoals', keeper ? ['Clean sheets', 'More or fewer clean sheets than Copero gives.'] : null],
            ['boostAssists', keeper ? ['Goals conceded', 'Plus: fewer goals conceded than Copero gives. Minus: more.'] : null]]) {
            const slider = m.querySelector('input[data-key="' + key + '"]').closest('.slider');
            const [label, desc] = words || BOOST_SLIDERS.find(row => row[0] === key).slice(1, 3);
            slider.querySelector('.slider-top span').textContent = label;
            slider.querySelector('.slider-desc').textContent = desc;
        }

        // Two numbers: where the career starts and roughly how high the boost takes it (the exact potential and the peak
        // age stay hidden, so the career can still surprise)
        const tiles = m.querySelector('#copero99-boost-tiles');
        tiles.textContent = '';
        for (const [label, value, tip] of [['Start', GAME_START_OVR + startTalent(), 'Your OVR at 16'],
            ['Potential', potentialRange(), 'Somewhere in this range: gains are boosted up to it, then slow down. A ' + tier.name + ' usually peaks around ' + tier.peak]]) {
            const tile = el('div');
            tile.title = tip;
            tile.appendChild(el('b', '', String(value)));
            tile.appendChild(el('span', '', label));
            tiles.appendChild(tile);
        }
        // Three meters, against the weakest and strongest rolls
        const meters = m.querySelector('#copero99-boost-meters');
        meters.textContent = '';
        for (const [label, dots, value, tip] of [
            ['Growth', meterDots(config.boostGrowth, 100, 150), '×' + config.boostGrowth / 100, 'Copero’s OVR gains are multiplied by this, up to your potential'],
            ['Durability', meterDots(-config.boostDecline, -DURABILITY[1], -DURABILITY[0]), config.boostDecline + '% of drops', 'How much of each OVR drop you feel below your potential'],
            ['Beyond potential', meterDots(config.boostAbove, 20, 45), config.boostAbove + '%', 'How much of a gain still counts past your potential']]) {
            const row = el('div', 'boost-meter');
            row.title = tip;
            row.appendChild(el('span', '', label));
            row.appendChild(dots);
            row.appendChild(el('em', '', value));
            meters.appendChild(row);
        }
        const styleLine = m.querySelector('#copero99-boost-style');
        styleLine.textContent = '';
        styleLine.appendChild(el('b', '', style.icon + ' ' + style.name + ': '));
        styleLine.appendChild(document.createTextNode(style.blurb));
        const chips = m.querySelector('#copero99-boost-chips');
        chips.textContent = '';
        for (const key of config.boostPerks) {
            const chip = el('span', '', PERKS[key].icon + ' ' + PERKS[key].name);
            chip.title = PERKS[key].help;
            chips.appendChild(chip);
        }
        // Playing traits with their rolled amount (a bad one in red)
        for (const [key, value] of statTraits()) {
            const [traitIcon, traitName, help] = statTrait(key, value, keeperOnScreen());
            const chip = el('span', value < 0 ? 'bad' : '', traitIcon + ' ' + traitName + ' ' + signed(value) + '%');
            chip.title = help;
            chips.appendChild(chip);
        }
        // The role trait (the club cards show its step)
        const roleTrait = ROLE_TRAITS[config.boostRole];
        if (roleTrait) {
            const chip = el('span', roleTrait.step < 0 ? 'bad' : '', roleTrait.icon + ' ' + roleTrait.name);
            chip.title = roleTrait.help;
            chips.appendChild(chip);
        }

        for (const [key, , , show] of ALL_SLIDERS) {
            const input = m.querySelector(`input[type="range"][data-key="${key}"]`);
            // Rewriting the value of the slider being dragged can make it stick
            if (input.value !== String(config[key])) input.value = config[key];
            m.querySelector(`[data-out="${key}"]`).textContent = show(config[key]);
        }
        renderPreview();
    }

