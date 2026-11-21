    // ========================================================================
    // Loans, contracts, bans and the clubs that let you go
    // ========================================================================

    // Loan offers turned down with the Stay card (the game logs them as "stayed")
    const countStays = (state) => (Array.isArray(state.log) ? state.log : [])
        .filter(entry => entry && entry.type === 'stayed' && entry.payload && entry.payload.eventType === 'loan_offer').length;
    /**
     * Boost: the first loan turned down quietly moves the potential (boost
     * limit) 2 up or 2 down, 50/50. It plays in the background: a rise is
     * celebrated, a dip passes without a word (the boost card shows the new value).
     */
    function loanGamble() {
        const before = config.boostCap;
        const won = Math.random() < 0.5;
        config.boostCap = clamp(before + (won ? 2 : -2), LIMITS.boostCap[0], LIMITS.boostCap[1]);
        saveConfig();
        // The gamble is part of the boost, so the Hall of Fame still counts it as rolled
        if (stats.rolled === boostSig({ ...config, boostCap: before })) {
            stats.rolled = boostSig();
            saveStats();
        }
        if (won && config.boostCap > before) {
            // The club saw it too: it won't let you go at the next loan offer (releaseReason)
            stats.loanGrew = stats.loans;
            saveStats();
            toast('🌱 Staying at ' + clubName(currentState && currentState.currentTeamId) + ' paid off: your potential grew', true);
        }
        if (menuElement) updateMenuUI();
    }
    /**
     * A loan offer only has loan cards. With the menu on (Vanilla careers too)
     * the script adds the game's own "Stay at <club>" card, which the game draws
     * and handles itself; it goes again with the menu off. In Boost the first
     * stay quietly moves the potential (loanGamble, once the game has logged it).
     */
    function applyLoanStay(state, event, mode) {
        if (event.type !== 'loan_offer') return;
        const options = event.options;
        const added = options.findIndex(option => option && option.c99Added && option.type === 'stay');
        const want = (!!mode || vanillaCareer()) && !!state.currentTeamId && !options.some(option => option && option.type === 'stay' && !option.c99Added);
        if (want && added < 0) {
            options.push({ id: 'stay-' + state.currentTeamId, type: 'stay', teamId: state.currentTeamId, c99Added: true });
            changed = true;
        } else if (!want && added >= 0) {
            options.splice(added, 1);
            changed = true;
        }
    }
    /**
     * Why the club lets a young player go at this loan offer ('' = it keeps
     * them): they turned a loan down before and since then grew less than 2
     * OVR a season or played fewer than 10 games a season. Then 35% (55% for
     * both), plus 15% for every earlier stay. Never when that stay grew the
     * potential (Boost's loanGamble). The same offer always decides the same way.
     */
    function releaseReason(state, event) {
        const stays = (Array.isArray(state.log) ? state.log : [])
            .filter(entry => entry && entry.type === 'stayed' && entry.payload && entry.payload.eventType === 'loan_offer');
        // Your potential grew from the last stay: the club believes in you, at least until you turn a loan down again
        if (!stays.length || stays.length === stats.loanGrew) return '';
        const since = Number(stays[stays.length - 1].age);
        const seasons = state.seasons.filter(season => Number(season.age) >= since);
        if (!seasons.length) return '';
        const growth = ((Number(state.player.overall) || 0) - (Number(seasons[0].overall) || 0)) / seasons.length;
        const games = seasons.reduce((sum, season) => sum + coperoGames(season), 0) / seasons.length;
        const slow = growth < 2;
        const benched = games < 10;
        if (!slow && !benched) return '';
        const chance = Math.min(0.85, (slow && benched ? 0.55 : 0.35) + 0.15 * (stays.length - 1));
        if (seeded(String(state.seed) + ':release:' + event.id)() >= chance) return '';
        return slow && benched ? 'you barely played and stopped improving' : slow ? 'you stopped improving' : 'you barely played';
    }
    // What a ban does on top of Copero's own (no games, trophies, call-ups or growth while it lasts), rolled per ban: a quiet
    // one passes almost unnoticed, a scandal runs a season longer. `rust`: OVR lost (Boost; [min, max]), `value`: share of the
    // market value kept, `bench`: share of the games the season after the ban, `release`: chance the club lets you go
    const BAN_FALLOUT = [
        { chance: 0.35, longer: false, rust: [0, 0], value: 0.85, bench: 1, release: 0.2 },
        { chance: 0.45, longer: false, rust: [1, 2], value: 0.65, bench: 0.7, release: 0.5 },
        { chance: 0.2, longer: true, rust: [2, 4], value: 0.45, bench: 0.5, release: 0.8 }
    ];
    // The first season of the ban that season `index` is part of (suspended seasons in a row)
    function banStart(seasons, index) {
        while (index > 0 && seasons[index - 1].suspended) index--;
        return index;
    }
    // How hard the ban that starts at season `start` hits (one of BAN_FALLOUT, its rust rolled); the same on every pass
    function banFallout(state, start) {
        const rng = seeded(String(state.seed) + ':ban-fallout:' + start);
        const fallout = weightedPick(BAN_FALLOUT, item => item.chance, rng);
        return { ...fallout, rust: fallout.rust[0] + Math.floor(rng() * (fallout.rust[1] - fallout.rust[0] + 1)) };
    }
    /**
     * A ban's fallout (Boost and Sandbox; Sandbox's Block suspensions keeps
     * it from happening): when its first season is played the market value
     * drops and a pop-up says how bad it is; a scandal runs a season longer
     * (Copero's own ban counter, so it plays that season as a ban too); the
     * season after it the coach plays you less (games, goals and assists, also
     * in the totals). The OVR lost to rust is in applyBoost, the club letting
     * you go in banRelease. Each season is looked at once (stats.seasonsSeen).
     */
    function applyBanFallout(state, mode) {
        if (!mode || (mode !== 'boost' && config.preventSuspensions)) return;
        const seasons = state.seasons;
        for (let i = Math.max(0, stats.seasonsSeen); i < seasons.length; i++) {
            const season = seasons[i];
            if (season.suspended) {
                const start = banStart(seasons, i);
                const fallout = banFallout(state, start);
                // Copero works the market value out again every season, so it is cut for every season of the ban (in Intense
                // one a decision), and the player's while the ban is the last thing played
                if (Number.isFinite(season.marketValue)) season.marketValue = roundValue(season.marketValue * fallout.value);
                if (i === seasons.length - 1 && Number.isFinite(state.player.marketValue)) state.player.marketValue = roundValue(state.player.marketValue * fallout.value);
                changed = true;
                if (start !== i) continue;
                const parts = [fallout.longer && 'the ban was extended by a season', mode === 'boost' && fallout.rust && 'you lost ' + fallout.rust + ' OVR to rust',
                    fallout.value < 0.5 ? 'your market value crashed' : fallout.value < 0.8 ? 'your market value fell' : 'your market value dipped',
                    fallout.bench < 1 && 'the coach won’t trust you at first'].filter(Boolean);
                const said = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
                toast(fallout.longer ? '⛔ Scandal: ' + said + '.' : fallout.bench < 1 ? '⛔ The ban hurt: ' + said + '.'
                    : '⛔ Suspended: you served it quietly and the story faded. Only ' + said + '.', true);
            } else if (!season.suspended && i > 0 && seasons[i - 1].suspended && season.stats && Number(season.stats.appearances) > 0) {
                const bench = banFallout(state, banStart(seasons, i - 1)).bench;
                if (bench >= 1) continue;
                // (the Golden Boot race and the Ballon d'Or vote read the season later in this pass: processSeasons)
                setGames(state, season.stats, Math.max(1, Math.round(season.stats.appearances * bench)));
            }
        }
        // A scandal: once the ban's own seasons are over, one more (Copero plays it as a ban at the next decision)
        if (banExtends(state)) {
            state.suspensionSeasonsRemaining = 1;
            changed = true;
        }
    }
    // The ban that was just played is a scandal whose extra season hasn't been added yet (Copero bans for at least 2 seasons,
    // so in Intense its own seasons span two decisions)
    function banExtends(state) {
        const seasons = state.seasons;
        const last = seasons.length - 1;
        if (last < 0 || !seasons[last].suspended || Number(state.suspensionSeasonsRemaining) > 0 || state.phase === 'summary') return false;
        const start = banStart(seasons, last);
        return banFallout(state, start).longer && last - start < Math.max(2, PERIOD_SEASONS[state.mode] || 2);
    }
    /**
     * A suspension in the seasons just played: the club can let the player
     * go ('you were suspended'), more likely the worse the ban (banFallout).
     * Only once the whole ban is over, and only if the next decision is a
     * transfer window (the same way on every pass). Sandbox's Block
     * suspensions keeps it from happening.
     */
    function banRelease(state) {
        const seasons = state.seasons;
        let start = seasons.length - 1;
        if (start < 0 || !seasons[start].suspended || (stats.picked === 'sandbox' && config.preventSuspensions)) return '';
        // Not while the ban still runs: in Intense Copero puts a transfer window between its two seasons, and a scandal adds one
        if (Number(state.suspensionSeasonsRemaining) > 0 || banExtends(state)) return '';
        start = banStart(seasons, start);
        const key = String(state.seed) + ':ban:' + start;
        const [seen, step] = stats.banSeen.split('@');
        if (seen === key && step !== String(state.step)) return '';
        if (seen !== key) {
            stats.banSeen = key + '@' + state.step;
            saveStats();
        }
        return seeded(key)() < banFallout(state, start).release ? 'you were suspended' : '';
    }
    // A big club (world name 3+) lets an older player go at a transfer window more easily, the bigger the club: [world name,
    // weight]. From `from`, when he no longer earns his place (below the club's level, or hardly playing); a club veteran
    // (`loyal` seasons in a row there) is mostly kept, a club legend (`legend`) nearly always
    // (Chirp: a great player in his 40s was let go "for younger legs": now `margin` below the club's
    // level counts as below it, the age adds `age` a year at most `ageMax`, a regular (`regular`+ of Copero's games) or a
    // player in form is let go half as often, and never more than `max`)
    const VETERAN = { from: 33, size: { 3: 0.6, 4: 1, 5: 1.3 }, loyal: 6, legend: 10, margin: 2, age: 0.04, ageMax: 0.24, regular: 35, max: 0.7 };
    /**
     * Why a big club lets an older player go at this transfer window ('' =
     * it keeps him): 33 or older and below the club's level (Copero's level
     * for its world name) or under 25 games a season lately. About 30-50%
     * (more the older he is, the worse his form and the bigger the club),
     * a third of that for a club veteran and a seventh for a club legend:
     * clubs are forgiving now and then. The same window always decides the same way.
     */
    function ageReason(state, event) {
        const age = Number(state.player.age) || 0;
        const id = state.currentTeamId;
        const size = VETERAN.size[clamp(repOf(id)[2], -1, 5)];
        const last = state.seasons.length - 1;
        if (age < VETERAN.from || !size || last < 0 || state.activeLoan) return '';
        const recent = state.seasons.slice(-(PERIOD_SEASONS[state.mode] || 2)).filter(season => season.teamId === id && !season.suspended);
        if (!recent.length) return '';
        const games = recent.reduce((sum, season) => sum + coperoGames(season), 0) / recent.length;
        const below = (Number(state.player.overall) || 0) < clubLevel(id) - VETERAN.margin;
        const benched = games < 25;
        if (!below && !benched) return '';
        const form = seasonPerf(state.seasons, last);
        const streak = clubStreak(state.seasons, last + 1, id);
        const loyalty = streak >= VETERAN.legend ? 0.15 : streak >= VETERAN.loyal ? 0.35 : 1;
        const kept = (games >= VETERAN.regular ? 0.5 : 1) * (form >= 1 ? 0.5 : 1);
        const chance = Math.min(VETERAN.max, (0.25 + (below && benched ? 0.2 : 0) + (form <= -1 ? 0.1 : 0) + Math.min(VETERAN.ageMax, VETERAN.age * (age - VETERAN.from))) * size * loyalty * kept);
        if (seeded(String(state.seed) + ':veteran:' + event.id)() >= chance) return '';
        return benched ? 'at ' + age + ', you barely played' : 'at ' + age + ', they want younger legs';
    }
    // Clubs that let you go this career (an End of cycle, Copero's or the script's): the club of the last season before you
    // signed elsewhere. They're slow to want you back (marketBars)
    function releasedBy(state) {
        const out = new Set();
        for (const entry of Array.isArray(state.log) ? state.log : []) {
            if (!entry || entry.type !== 'transfer' || !entry.payload || entry.payload.eventType !== 'contract_non_renewal') continue;
            const before = state.seasons.filter(season => Number(season.age) < Number(entry.age)).pop();
            if (before) out.add(before.contractTeamId || before.teamId);
        }
        return out;
    }
    // A club that signs you gives you a contract of a few seasons, the younger you are the longer: [from age, [[seasons, weight], ...]]
    const CONTRACT_YEARS = [[33, [[1, 0.5], [2, 0.5]]], [30, [[2, 0.6], [3, 0.4]]], [0, [[3, 0.35], [4, 0.4], [5, 0.25]]]];
    // Seasons left on the contract you signed with your club (0: it has run out, or it's the club you came through at)
    function contractLeft(state) {
        const club = state.contractTeamId || state.currentTeamId;
        const left = (age, years) => Math.max(0, years - state.seasons.filter(season => Number(season.age) >= age && season.teamId === club).length);
        // A new contract signed by turning a release clause down
        const renewed = stats.renewal && stats.renewal.club === club ? left(stats.renewal.age, stats.renewal.years) : 0;
        const signed = (Array.isArray(state.log) ? state.log : []).filter(entry => entry && entry.type === 'transfer' && entry.payload && entry.payload.teamId === club).pop();
        if (!signed) return renewed;
        const age = Number(signed.age);
        const years = weightedPick(CONTRACT_YEARS.find(([from]) => age >= from)[1], ([, weight]) => weight, seeded(String(state.seed) + ':contract:' + club + ':' + age))[0];
        return Math.max(renewed, left(age, years));
    }
    /**
     * Copero's own End of cycle (from 26, after a stretch or two below the
     * club's level) while your contract still runs: a normal transfer window
     * instead, with Copero's clubs and Stay. Once the contract has run out,
     * Copero's End of cycle comes as before.
     */
    function keepContract(state, event, left, loved) {
        event.c99Was = { type: event.type, options: event.options.slice() };
        event.type = 'transfer';
        const clubs = event.options.filter(option => option && option.type === 'join_club').slice(0, 2);
        event.options.splice(0, event.options.length, ...clubs, { id: 'stay-' + state.currentTeamId, type: 'stay', teamId: state.currentTeamId });
        changed = true;
        if (!event.c99Told) {
            event.c99Told = true;
            toast(loved ? '🫶 ' + clubName(state.currentTeamId) + ' would let you go, but the fans won’t hear of it: stay, or take an offer.'
                : '📝 ' + clubName(state.currentTeamId) + ' would let you go, but your contract runs ' + left + ' more season' + (left === 1 ? '' : 's') + ': stay, or take an offer.', true);
        }
    }
    /**
     * A club can let a player go (Boost and Sandbox): one who kept turning
     * loans down (releaseReason), was just suspended (banRelease) or is an
     * older player a big club no longer needs (ageReason). The
     * decision then becomes the game's own "End of cycle" screen with two
     * clubs of the player's level, one of them a step down; the game signs
     * whichever is picked. Never while the contract the club gave you runs
     * (contractLeft), except after a ban; Copero's own End of cycle then
     * becomes a transfer window (keepContract). The original decision is
     * kept on the event, so switching the menu off gives it back.
     */
    function applyRelease(state, event, mode) {
        // The farewell is over (applyRetirement): no club lets you go at your send-off
        if (event.c99Type || (mode && stats.farewell && Number(state.step) >= stats.farewell && !event.c99Was)) return;
        const released = !!event.c99Was;
        const ready = !released && mode && gameData.status === 'ready';
        // Boost's Fan favourite: a club you've played 3+ seasons for keeps you as if your contract still ran
        const loved = ready && perkOn('fanFavourite') && clubStreak(state.seasons, state.seasons.length, state.currentTeamId) >= 3;
        const left = ready ? contractLeft(state) || (loved ? 1 : 0) : 0;
        if (left && event.type === 'contract_non_renewal') {
            keepContract(state, event, left, loved && !contractLeft(state));
            return;
        }
        const reason = !ready ? '' : event.type === 'loan_offer' ? (left ? '' : releaseReason(state, event))
            : event.type === 'transfer' ? banRelease(state) || (left ? '' : ageReason(state, event)) : '';
        if (reason) {
            const level = offerLevel(Number(state.player.overall) || 0);
            const taken = new Set([state.currentTeamId, state.contractTeamId, ...releasedBy(state)]);
            const clubs = [0, -1].map(drop => {
                const id = offerClub(state, clamp(level + drop, -1, 5), taken, String(state.seed) + ':release:' + event.id + ':' + drop);
                if (id) taken.add(id);
                return id;
            }).filter(Boolean);
            if (!clubs.length) return;
            event.c99Was = { type: event.type, options: event.options.slice() };
            event.type = 'contract_non_renewal';
            event.options.splice(0, event.options.length, ...clubs.map(id => ({ id: 'non-renewal-' + id, type: 'join_club', teamId: id })));
            // Copero's own End of cycle offers an older player (32+) the Retire card too
            if (Number(state.player.age) >= 32) event.options.push({ id: 'retire-' + state.step, type: 'retire' });
            changed = true;
            if (!event.c99Told) {
                event.c99Told = true;
                toast('🚪 ' + clubName(state.currentTeamId) + ' let you go: ' + reason + '. Time to find a new club.', true);
            }
        } else if (released && !mode) {
            event.type = event.c99Was.type;
            event.options.splice(0, event.options.length, ...event.c99Was.options);
            delete event.c99Was;
            changed = true;
        }
    }

