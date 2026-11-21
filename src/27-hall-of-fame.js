    // ========================================================================
    // Saving a career to the Hall of Fame
    // ========================================================================

    // Hall of Fame: remembers that a cheat was used in this career
    function noteCheat(name) {
        if (stats.cheats.indexOf(name) >= 0) return;
        stats.cheats.push(name);
        saveStats();
    }
    const NATIONAL_TROPHIES = ['national_continental', 'world_cup'];
    const TROPHY_NAMES = {
        league: 'League',
        cup: 'Cup',
        continental_primary: 'Continental cup',
        continental_secondary: 'Second continental cup',
        club_world_cup: 'Club World Cup',
        national_continental: 'Continental title (national team)',
        world_cup: 'World Cup',
        ballon_dor: "Ballon d'Or",
        golden_boot: 'Golden Boot',
        golden_glove: 'Golden Glove'
    };
    // "real-madrid" -> "Real Madrid" (the game only stores club ids)
    function prettyName(id) {
        return String(id || '?').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    function countNames(list, into) {
        for (const name of Array.isArray(list) ? list : []) {
            if (typeof name === 'string') into[name] = (into[name] || 0) + 1;
        }
    }
    function buildHofEntry(state) {
        const player = state.player || {};
        const totals = state.totals || {};
        const confed = player.nationality && player.nationality.confederation;
        const trophies = {};
        const awards = {};
        const stints = [];
        const seasonList = [];
        let peak = 0;
        let maxValue = Number(player.marketValue) || 0;
        for (const season of state.seasons) {
            const club = clubName(season.teamId);
            const trophyKeys = (Array.isArray(season.trophies) ? season.trophies : []).filter(key => typeof key === 'string');
            const won = trophyKeys.map(key => trophyName(key, season.teamId, season.competitionTier, confed));
            const awardKeys = (Array.isArray(season.awards) ? season.awards : []).filter(key => typeof key === 'string');
            const wonAwards = awardKeys.map(key => TROPHY_NAMES[key] || prettyName(key));
            countNames(won, trophies);
            countNames(wonAwards, awards);
            peak = Math.max(peak, Number(season.overall) || 0);

            // Club spells: consecutive seasons at the same club; national team trophies don't count for the club
            let stint = stints[stints.length - 1];
            if (!stint || stint.teamId !== season.teamId) {
                stint = { teamId: season.teamId, club: club, from: season.age, to: season.age, seasons: 0, won: {} };
                stints.push(stint);
            }
            stint.to = season.age;
            stint.seasons++;
            countNames(won.filter((_, i) => NATIONAL_TROPHIES.indexOf(trophyKeys[i]) === -1), stint.won);

            const numbers = season.stats || {};
            maxValue = Math.max(maxValue, Number(season.marketValue) || 0);
            seasonList.push({
                age: season.age,
                teamId: season.teamId,
                tier: season.competitionTier,
                up: !!season.c99Up,
                club: club,
                ovr: season.overall,
                apps: Number(numbers.appearances) || 0,
                goals: Number(numbers.goals) || 0,
                assists: Number(numbers.assists) || 0,
                // trophies + awards are keys (for pictures); won holds the same items as names, in the same order
                trophies: trophyKeys,
                awards: awardKeys,
                won: won.concat(wonAwards)
            });
        }
        const clubs = stints.map(stint => stint.club);
        let ntApps = 0, ntGoals = 0;
        for (const period of Array.isArray(state.nationalTeamPeriods) ? state.nationalTeamPeriods : []) {
            ntApps += Number(period.stats && period.stats.appearances) || 0;
            ntGoals += Number(period.stats && period.stats.goals) || 0;
        }
        return {
            seed: String(state.seed),
            // Your own date (YYYY-MM-DD): toISOString's is UTC's, a day behind just after midnight in Romania
            savedAt: new Date().toLocaleDateString('en-CA'),
            name: String(player.lastName || 'Unknown'),
            country: String((player.nationality && player.nationality.name_en) || ''),
            code: String((player.nationality && player.nationality.fifa_code) || ''),
            flag: String((player.nationality && player.nationality.flag_url) || ''),
            confed: String(confed || ''),
            position: String(player.position || ''),
            number: Number(player.preferredNumber) || null,
            maxValue: maxValue,
            retiredAt: Number(player.age) || 0,
            peak: peak,
            clubs: clubs,
            apps: Number(totals.appearances) || 0,
            goals: Number(totals.goals) || 0,
            assists: Number(totals.assists) || 0,
            trophyCount: Number(totals.trophies) || 0,
            awardCount: Number(totals.awards) || 0,
            trophies: trophies,
            awards: awards,
            stints: stints,
            seasonList: seasonList,
            ntApps: ntApps,
            ntGoals: ntGoals,
            // 'copero': Vanilla (or no mode picked), the game decided everything; 'copero99': a Boost career
            kind: stats.picked === 'boost' ? 'copero99' : 'copero',
            // The boost the career was rolled with
            boost: stats.picked === 'boost' ? { tier: config.boostTier, style: config.boostStyle, perks: config.boostPerks.slice(), peak: config.boostPeak, traits: statTraits(),
                role: config.boostRole } : null
        };
    }
    // The kind of career, in words (the oldest entries go by whether the script changed the OVR)
    const careerKind = (entry) => ((entry.kind || (entry.assisted ? 'copero99' : 'copero')) === 'copero99' ? 'Copero99 career' : 'Vanilla career');
    // How a Copero99 career was rolled ("Rolled: Wonderkid · ⚡ Prodigy · peak age 21 · ⭐ 🦾 🥅"), each part explained on hover
    function boostRoll(boost, keeper) {
        if (!boost || !BOOST_TIERS[boost.tier]) return null;
        const tier = BOOST_TIERS[boost.tier];
        const style = BOOST_STYLES[boost.style];
        const parts = [[tier.name, tierRarity(tier) + '\n' + tier.blurb]];
        if (style) parts.push([style.icon + ' ' + style.name, style.blurb]);
        if (boost.peak) parts.push(['peak age ' + boost.peak, 'The age the boost steered this career to its best']);
        // Perks, playing traits and the role trait are just their icons, side by side
        const role = ROLE_TRAITS[boost.role];
        const perks = (boost.perks || []).filter(key => PERKS[key]).map(key => [PERKS[key].icon, PERKS[key].name + ': ' + PERKS[key].help])
            .concat((Array.isArray(boost.traits) ? boost.traits : []).map(([key, value]) => statTrait(key, value, keeper)).filter(Boolean)
                .map(([traitIcon, name, help]) => [traitIcon, name + ': ' + help]))
            .concat(role ? [[role.icon, role.name + ': ' + role.help]] : []);
        parts.push(...perks);
        const line = el('div', 'icard-note');
        line.append('Rolled: ');
        // One hover per part (the perks are just their icons, side by side)
        const group = el('span', 'c99-group');
        parts.forEach(([text, tip], i) => {
            if (i) group.append(i > parts.length - perks.length ? ' ' : ' · ');
            const part = el('span', 'icard-roll', text);
            part.title = tip;
            group.appendChild(part);
        });
        line.appendChild(group);
        return line;
    }
    /**
     * Why the career on screen won't go into the Hall of Fame (empty = it
     * will): a Vanilla career (or one with no mode picked) or a Boost career
     * with the boost as rolled (its one free reroll is fine; no change by hand). Sandbox
     * never count. Living world, the Stay gamble and playing on past
     * retirement aren't cheats.
     */
    function hofBlockers() {
        const reasons = [];
        if (stats.picked === 'sandbox') reasons.push('Sandbox');
        else if (stats.picked === 'boost' && stats.peeked) reasons.push('boost details looked at');
        else if (stats.picked === 'boost' && stats.rolled === null) reasons.push('your own boost (not rolled)');
        else if (stats.picked === 'boost' && stats.rolled !== boostSig()) reasons.push('boost changed by hand');
        return reasons.concat(stats.cheats);
    }
    let hofAsked = '';  // Seed of the finished career last asked about (asked once per visit; the tab's Save button still works)
    // A finished career on the summary screen, with the club and competition names loaded (a few seconds at most)
    function careerFinished(state) {
        return !!state && state.phase === 'summary' && Array.isArray(state.seasons) && state.seasons.length > 0 && (gameData.status === 'ready' || gameData.status === 'failed');
    }
    // The finished career on screen counts and isn't in the Hall of Fame yet
    function hofSavable(state) {
        return careerFinished(state) && stats.seed === String(state.seed) && hofBlockers().length === 0 &&
            !hof.some(entry => entry.seed === String(state.seed));
    }
    function addToHof(entry) {
        if (hof.some(e => e.seed === entry.seed)) return;
        hof.push(entry);
        if (hof.length > MAX_HOF) hof = hof.slice(-MAX_HOF);
        saveHof();
        renderHofList();
        toast('Career saved to the Hall of Fame 🏛️', true);
    }
    /**
     * When a career reaches the end-of-career summary screen, asks once whether
     * to save it (only careers hofBlockers() lets through). Runs even with the menu off.
     */
    function saveToHallOfFame(state) {
        if (!careerFinished(state)) return;
        const seed = String(state.seed);
        const index = hof.findIndex(entry => entry.seed === seed);
        if (index >= 0) {
            // The oldest entries have no season list: redo them while the career is still on screen
            if (!hof[index].seasonList) {
                hof[index] = buildHofEntry(state);
                saveHof();
                toast('Hall of Fame entry updated with full details 🏛️', true);
            }
            return;
        }
        if (hofAsked === seed) return;
        const blockers = stats.seed === seed ? hofBlockers() : ['career not tracked'];
        if (blockers.length) {
            hofAsked = seed;
            toast('Not saved to the Hall of Fame: ' + blockers.join(', '), true);
            return;
        }
        if (modalElement) return;  // ask once the open window is closed
        hofAsked = seed;
        askHofSave(state);
    }
    function askHofSave(state) {
        const entry = buildHofEntry(state);
        const body = el('div', 'icard-wrap');
        body.appendChild(buildIconCard(entry));
        body.appendChild(el('div', 'icard-note', ['Retired at ' + entry.retiredAt, entry.goals + ' goals', entry.trophyCount + ' trophies'].join(' · ')));
        openModal('Save to the Hall of Fame?', '', {
            note: 'This ' + careerKind(entry) + ' qualifies. Keep it in the Hall of Fame? You can also save it later from the end-of-career screen.',
            body: body,
            buttons: [['Save career', 'btn primary', () => { closeModal(); addToHof(entry); }]],
            closeLabel: 'Not now'
        });
    }
    // Copero's "View summary" button in its languages (the end-of-career screen)
    const SUMMARY_LABELS = ['View summary', 'Ver resumen', 'Ver resumo'];
    // On the end-of-career screen: a button under View summary / Play again that opens this career in the Hall of Fame (or saves it first)
    function placeSummaryButtons(state) {
        const done = careerFinished(state);
        const entry = done ? hof.find(e => e.seed === String(state.seed)) : null;
        const label = entry ? 'View in the Hall of Fame' : done && hofSavable(state) ? 'Save to the Hall of Fame' : '';
        const rows = label ? [...document.querySelectorAll('[data-career-phase] button')]
            .filter(button => SUMMARY_LABELS.indexOf(button.textContent.trim()) >= 0).map(button => button.parentElement) : [];
        document.querySelectorAll('.c99-summary-row').forEach(node => {
            if (rows.indexOf(node.previousElementSibling) < 0) node.remove();
        });
        for (const row of rows) {
            let mine = row.nextElementSibling;
            if (!mine || !mine.classList.contains('c99-summary-row')) {
                mine = el('div', 'c99-summary-row c99-own');
                const button = el('button');
                button.type = 'button';
                button.addEventListener('click', () => {
                    const seed = String(currentState && currentState.seed);
                    if (!hof.some(e => e.seed === seed) && hofSavable(currentState)) addToHof(buildHofEntry(currentState));
                    const saved = hof.find(e => e.seed === seed);
                    if (saved) showHofCareer(saved);
                });
                mine.appendChild(button);
                row.after(mine);
            }
            const button = mine.firstChild;
            if (button.dataset.label !== label) {
                button.dataset.label = label;
                button.innerHTML = gemIcon();
                button.appendChild(document.createTextNode(label));
            }
        }
    }

