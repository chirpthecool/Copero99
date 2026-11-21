    // ========================================================================
    // Club offers and the transfer market
    // ========================================================================

    // Three of the biggest clubs for this career and boost roll (the same on every pass, new ones after a reroll)
    function bigClubs(key) {
        const list = Object.keys(gameData.teams).filter(id => gameData.teams[id].big);
        return list.length < 3 ? null : seededPicks(list, key, 3);
    }
    /**
     * The game picks the academy club by the option's teamId, and draws the
     * card from it too, so changing it is all it takes. The game's own club is
     * kept on the option, so losing the perk on a reroll gives it back.
     */
    function applyAcademyPerk(state, event, mode) {
        // Sandbox's club offers own the academy offer instead
        if (mode && mode !== 'boost') return;
        const want = mode === 'boost' && hasPerk('bigClub');
        const clubs = want ? bigClubs(String(state.seed) + ':' + boostSig()) : null;
        if (want && !clubs) return; // club list not read yet
        let first = false;
        event.options.forEach((option, i) => {
            if (!option || option.type !== 'join_club') return;
            if (option.c99From === undefined) {
                if (!want) return;
                option.c99From = option.teamId;
                first = true;
            }
            const teamId = want ? clubs[i % clubs.length] : option.c99From;
            if (option.teamId !== teamId) {
                option.teamId = teamId;
                changed = true;
            }
        });
        if (first) {
            const names = clubs.map(clubName);
            toast('⭐ ' + (boostSealed() ? '' : 'Big-club interest: ') + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' want you', true);
        }
    }
    // The OVR a club of each world name (international reputation) wants before it signs you (the game's own table, Po)
    const CLUB_BARS = { [-1]: 0, 0: 55, 1: 65, 2: 73, 3: 78, 4: 83, 5: 87 };
    // The reputation level of clubs the game offers you at an OVR
    const offerLevel = (ovr) => [5, 4, 3, 2, 1, 0].find(level => ovr >= CLUB_BARS[level]) ?? -1;
    // Clubs only some players can join (the game's own rule)
    const CLUB_RULES = { 'guadalajara-chivas': 'MEX', 'athletic-club': 'ESP' };
    /**
     * A club of a reputation level for an offer: from the current club's
     * country if it has one, else its confederation, else anywhere (nearest
     * level if none). `key` makes the pick repeatable.
     */
    function offerClub(state, level, taken, key) {
        const own = gameData.teams[state.currentTeamId] || {};
        const nationality = state.player.nationality || {};
        const code = nationality.fifa_code;
        // No club yet (the academy offer): the player's own country and confederation
        const country = own.country || code;
        const confed = own.confed || nationality.confederation;
        const ids = Object.keys(gameData.teams).filter(id => !taken.has(id) && (!CLUB_RULES[id] || CLUB_RULES[id] === code));
        const pick = (list) => seededPicks(list, key, 1)[0] || null;
        for (let gap = 0; gap <= 6; gap++) {
            const near = ids.filter(id => Math.abs(repOf(id)[2] - level) === gap);
            const found = pick(near.filter(id => gameData.teams[id].country === country)) ||
                pick(near.filter(id => gameData.teams[id].confed === confed)) || pick(near);
            if (found) return found;
        }
        return null;
    }
    /**
     * How a club's season shapes its interest (Chirp: offers driven by
     * the season in the Living world, not the same few clubs career after
     * career; the "title contender abroad" it replaced brought CFR Cluj, the
     * one strong-league club with no name abroad, to most careers): a club
     * that just finished in your league's top 4 or won a cup or a continental
     * title ×2, one whose name rose this career ×1.5 (fell ×0.7), one in an
     * era on a high ×1.3 (in a slump ×0.6).
     */
    function seasonPull(state, id) {
        if (!world || world.seed !== String(state.seed)) return 1;
        const index = state.seasons.length;
        const last = world.results[index - 1];
        const league = last && last.comps.find(comp => comp.key === 'league');
        const shone = (league && Array.isArray(league.table) && league.table.slice(0, 4).indexOf(id) >= 0) || (!!last && last.comps.some(comp => comp.champ === id));
        const delta = world.deltas[id];
        const moved = Array.isArray(delta) ? delta.reduce((sum, n) => sum + (Number(n) || 0), 0) : 0;
        const era = clubEra(id, index);
        return (shone ? 2 : 1) * (moved > 0 ? 1.5 : moved < 0 ? 0.7 : 1) * (era > 0 ? 1.3 : era < 0 ? 0.6 : 1);
    }
    // A league's pull (Chirp: strong leagues sign from everywhere, small ones mostly at home and nearby): a top
    // flight's weight as for the Golden Boot (2 the big five, 1.5 the next ones and Argentina's and Brazil's, 1 the rest),
    // 0.5 below the top flight
    const LEAGUE_PULL = { ...BOOT_WEIGHTS, ARG: 1.5, BRA: 1.5 };
    const leaguePull = (id) => {
        const team = gameData.teams[id];
        return !team ? 0.5 : team.tier === 1 ? LEAGUE_PULL[team.country] || 1 : 0.5;
    };
    // Offers that make no sense: a club more than `above` OVR over your level (a deep bench) or `below` under it (a
    // star at a tiny club), unless you're 31+ or nothing else wants you
    const SENSE = { above: 6, below: 14, from: 31 };
    // How much a club's need for a player in your position this window moves its bar: [OVR, chance]
    const CLUB_NEEDS = [[-4, 0.12], [-2, 0.2], [0, 0.36], [2, 0.2], [4, 0.12]];
    // How the market rates a player for a whole career (some careers your name travels further): [OVR, chance]
    const MARKET_NAME = [[-2, 0.1], [-1, 0.2], [0, 0.4], [1, 0.2], [2, 0.1]];
    // A club that let you go asks this much more OVR to want you back, except in windows it forgives you (`forgive`)
    const RELEASED = { bar: 8, forgive: 0.25 };
    // How likely an offer moves a level down, stays, or moves a level up, before counting how many clubs there want you
    // (simulated on Copero's own offers at OVR 75-90: the average club stays the same, a window with a bigger club comes
    // twice as often, more so near the next level and less just past one)
    const MARKET_STEP = [0.15, 1, 1];
    // A club rarely signs its fierce rival's player (RIVALS): not at all, except in the windows it dares (Figo, `dare`)
    // (Chirp: Real Madrid to Barcelona and back; 10 more OVR didn't stop a 92)
    const MARKET_RIVAL = { bar: 99, dare: 0.05 };
    // A star (`from`+ OVR) hears from abroad too (Chirp: in LaLiga every window was Real Madrid,
    // Atlético and Barcelona): Copero's own pick from your own league's country stays `keep` of the time
    const STAR_HOME = { from: 83, keep: 0.4 };
    // The world's biggest clubs (world name 5) are only in the market for you now and then (`chance` a window each),
    // otherwise they ask `cold` more: a move there is a dream, not a given
    const ELITE = { chance: 0.4, cold: 6 };
    // A superteam (the 6th level on any scale) has its pick of the world: in the market for you `chance` of the windows,
    // else it asks `bar` more
    const SUPERTEAM_MARKET = { chance: 0.25, bar: 8 };
    // A regular (30+ games a season, the last two seasons at the club) is happy where he is: clubs no bigger than his ask
    // `bar` more (fewer sideways moves)
    const SETTLED = { bar: 3, games: 30 };
    // Suitors, rare and earned (Chirp): a club that came in for you before comes back when it needs your position now
    // (its need at `need` or lower), `chance` a window, at most `returns` times; a club offered in the last `recent`
    // windows weighs `repeat` (the same clubs window after window)
    const SUITORS = { chance: 0.15, need: -2, returns: 2, recent: 2, repeat: 0.2 };
    // New clubs every window (Chirp: the same clubs window after window): a club already offered this
    // career weighs `seen` for each window it was offered in, `recent` more in the last windows; Copero's own pick only
    // stays when it never came in before, `keep` of the time
    // (`side`: the agent's clubs a level either side of the one aimed at)
    const MARKET_FRESH = { seen: 0.3, recent: 0.3, keep: 0.5, side: 0.15 };
    // A club's need for a player in your position this window (a lower bar when it needs one), the same every pass
    const marketRoll = (table, text) => {
        let pick = seeded(text)();
        return (table.find(([, chance]) => (pick -= chance) < 0) || [0])[0];
    };
    const clubNeed = (key, id) => marketRoll(CLUB_NEEDS, key + ':need:' + id);
    // The windows (decision steps) each club was offered in this career, before this one: { recent(id), before(id) }
    function offerMemory(state) {
        const step = Number(state.step) || 0;
        const offered = stats.offered || {};
        const earlier = (id) => (Array.isArray(offered[id]) ? offered[id].filter(n => n < step) : []);
        const windows = [...new Set([].concat(...Object.keys(offered).map(earlier)))].sort((a, b) => b - a).slice(0, SUITORS.recent);
        return { recent: (id) => earlier(id).some(n => windows.indexOf(n) >= 0), before: (id) => earlier(id).length };
    }
    // Remembers the clubs on this window's cards (the last few windows each)
    function noteOffers(state, options) {
        const step = Number(state.step) || 0;
        if (!stats.offered || typeof stats.offered !== 'object') stats.offered = {};
        let dirty = false;
        for (const option of options) {
            if (!option || option.type !== 'join_club' || !gameData.teams[option.teamId]) continue;
            const list = stats.offered[option.teamId] || (stats.offered[option.teamId] = []);
            if (list.indexOf(step) >= 0) continue;
            list.push(step);
            if (list.length > 8) list.shift();
            dirty = true;
        }
        if (dirty) saveStats();
    }
    /**
     * The transfer market of one window (Boost and Sandbox): whether a club
     * wants you. Its bar is Copero's own for its world name (CLUB_BARS), moved
     * by whether it needs a player in your position this window and by its
     * situation in the Living world (an era in a slump or on a high, a fall or
     * a rise in its league and continental standing: a club in a slump asks
     * less). What you bring: your OVR, how far your name travels this career,
     * a young player's promise or an older one's age, and your form. A club
     * that let you go wants you back only rarely (RELEASED), your club's
     * fierce rival hardly ever (MARKET_RIVAL), the world's biggest clubs only
     * in some windows (ELITE), and while you're a regular clubs no bigger than
     * yours ask more (SETTLED); not those three for a story scene (`scene`:
     * a club that wants you is what it's about). The same window always
     * decides the same way.
     */
    // How much less clubs want a player past his body: base + per × wear OVR off his pull (was 1 for everyone 32+)
    const TWILIGHT_MARKET = { base: 2, per: 3 };
    function marketBars(state, key, scene) {
        const roll = marketRoll;
        const age = Number(state.player.age) || 0;
        const last = state.seasons.length - 1;
        const form = last >= 0 ? Math.trunc(seasonPerf(state.seasons, last) / 2) : 0;
        // Past your body (twilight stage 2+), clubs look at the birth certificate: they want you much less
        const tw = age >= 30 && realRetireOn(currentMode()) ? twilight(state, age, Number(state.player.overall) || 0) : null;
        const old = tw && tw.level >= 2 ? Math.round(TWILIGHT_MARKET.base + TWILIGHT_MARKET.per * tw.wear) : age >= 32 ? 1 : 0;
        const pull = (Number(state.player.overall) || 0) + roll(MARKET_NAME, String(state.seed) + ':market') + (age <= 21 ? 1 : -old) + form;
        const eras = !!world && world.seed === String(state.seed);
        const released = releasedBy(state);
        const here = state.currentTeamId;
        const size = clamp(repOf(here)[2], -1, 5);
        const recent = state.seasons.slice(-2);
        const settled = !scene && recent.length === 2 && !state.activeLoan && recent.every(season => season.teamId === here && coperoGames(season) >= SETTLED.games);
        // Gone on a last adventure (a league that pays for a name): the strong leagues stop looking
        // (Chirp: Real Madrid called right after a move to MLS), except now and then
        const team = gameData.teams[here];
        const away = age >= ADVENTURE.from - 1 && !!team && team.tier === 1 && !!ADVENTURE.leagues[team.country];
        const seen = {};
        const bar = (id) => {
            const team = gameData.teams[id];
            const now = repOf(id);
            const world = clamp(now[2], -1, 5);
            const need = clubNeed(key, id);
            const era = eras ? clubEra(id, state.seasons.length) : 0;
            const moved = now[0] + now[1] - team.rep[0] - team.rep[1];
            const grudge = released.has(id) && seeded(key + ':forgive:' + id)() >= RELEASED.forgive ? RELEASED.bar : 0;
            const derby = !scene && RIVAL_PAIRS.has([here, id].sort().join('|')) && seeded(key + ':dare:' + id)() >= MARKET_RIVAL.dare ? MARKET_RIVAL.bar : 0;
            const cold = !scene && world === 5 && seeded(key + ':elite:' + id)() >= ELITE.chance ? ELITE.cold : 0;
            const picky = !scene && eras && eliteOf(id).some(Boolean) && seeded(key + ':superteam:' + id)() >= SUPERTEAM_MARKET.chance ? SUPERTEAM_MARKET.bar : 0;
            const faded = !scene && away && leaguePull(id) >= 1.5 && seeded(key + ':faded:' + id)() >= ADVENTURE.back ? ADVENTURE.fade : 0;
            return CLUB_BARS[world] + need + clamp(Math.sign(era) * Math.round(Math.abs(era)) + moved, -2, 2) + grudge + derby + cold + picky + faded +
                (settled && world <= size ? SETTLED.bar : 0);
        };
        return (id) => (id in seen ? seen[id] : (seen[id] = !!gameData.teams[id] && pull >= bar(id)));
    }
    /**
     * The level of one offer: Copero's own pick sets it (mostly clubs of your
     * level), and the market can move it a level down or up, as likely as the
     * share of clubs there that want you (a player close to the next level
     * hears from it more often, one who only just reached a level less).
     */
    function marketLevel(state, original, wants, key) {
        const from = gameData.teams[original] ? clamp(gameData.teams[original].rep[2], -1, 5) : offerLevel(Number(state.player.overall) || 0);
        const ids = Object.keys(gameData.teams);
        const share = (level) => {
            const list = ids.filter(id => clamp(repOf(id)[2], -1, 5) === level);
            return list.length ? list.filter(wants).length / list.length : 0;
        };
        const weights = [from - 1, from, from + 1].map((level, k) => (level < -1 || level > 5 ? 0 : MARKET_STEP[k] * share(level)));
        if (!weights.some(Boolean)) return from;
        return from - 1 + weightedPick([0, 1, 2], k => weights[k], seeded(key + ':level'));
    }
    // How Copero spreads a window's offers by OVR (Ol in the game): a star hears from anywhere, a smaller player mostly from
    // home. Abroad, a stronger league pulls ×2 a step (leaguePull: 1 → 1.5 → 2) and a small league no stronger than yours
    // ×0.3 (no sideways moves into small leagues abroad); the club's season on top (seasonPull)
    function offerWeight(state, id) {
        const ovr = Number(state.player.overall) || 0;
        const team = gameData.teams[id];
        const own = gameData.teams[state.currentTeamId] || {};
        const nat = state.player.nationality || {};
        const confed = (team.confed === own.confed) + (team.confed === nat.confederation);
        const copero = ovr >= 83 ? 1 : ovr >= 78 ? 2 + confed : ovr >= 73 ? confed : (team.country === own.country) + (team.country === nat.fifa_code);
        if (!copero) return 0;
        const mine = leaguePull(state.currentTeamId), theirs = leaguePull(id);
        const league = !own.country || team.country === own.country ? 1 : theirs > mine ? Math.pow(2, Math.round((theirs - mine) * 2)) : theirs < 2 ? 0.3 : 1;
        return copero * league * seasonPull(state, id);
    }
    // Decision screens with club offers (the academy offer has three clubs and no Stay), and Copero's stories whose club card
    // is a club that came in for you (the fan backlash's "Leave the club for" was Copero's own pick, so a
    // player at a last adventure got Real Madrid)
    const OFFER_EVENTS = ['transfer', 'contract_non_renewal', 'academy_offer'];
    const STORY_OFFERS = ['fan_backlash', 'club_crisis'];
    const storyOffer = (event) => event.type === 'career_event' && STORY_OFFERS.indexOf(event.eventKey) >= 0 && !event.c99Scene && !event.variantKey;
    // How many times the Offer quality slider was moved this visit (part of the offers' key)
    let offerRoll = 0;
    /**
     * Boost and Sandbox: transfer windows and contract ends go through the
     * transfer market (marketBars, marketLevel): Copero's own club stays when
     * it still wants you at the level the market gives that offer, otherwise
     * another club of that level that does. Sandbox: "Offer quality" moves
     * each offer a few reputation levels better or worse (in the academy too),
     * and "4 club offers" adds a club (on a transfer the game shows Stay as
     * the fourth card). Boost perks do the same (Super agent: one level better;
     * Extra club offer), but not in the academy, which Big-club interest owns.
     * Clubs offered in the last windows come up less, and now and then one
     * that came in before returns (SUITORS). The game signs whatever club an option names
     * and draws its card from it, as with Big-club interest. The game's own
     * clubs are kept on the options, so Vanilla gives them back. Runs every
     * pass, so changes show at once.
     */
    // What each window's offers were last worked out from (the market looks at every club: once per change, not every pass)
    const offersMemo = new WeakMap();
    function applyOffers(state, event, mode) {
        // A decision the Retire card took over (applyRetirement) keeps the club it already has: run again, this put the
        // extra club back in front of Sandbox's lone Retire card (so it was never pressed) and moved the kept club's slot
        if ((OFFER_EVENTS.indexOf(event.type) === -1 && !(mode && storyOffer(event))) || gameData.status !== 'ready' || event.c99Options) return;
        const sig = [state.seed, mode, offerRoll, config.offerQuality, config.extraOffer, config.boostPerks, state.player.overall, state.player.age,
            state.currentTeamId, state.seasons.length, world && world.seed === String(state.seed) ? world.seasons : '', stats.offered && Object.keys(stats.offered).length,
            event.options.map(o => o && (o.id + '>' + o.teamId + '>' + o.type)).join()].join('|');
        if (offersMemo.get(event) === sig) return;
        applyOffersNow(state, event, mode);
        offersMemo.set(event, [sig.slice(0, sig.lastIndexOf('|')), event.options.map(o => o && (o.id + '>' + o.teamId + '>' + o.type)).join()].join('|'));
    }
    function applyOffersNow(state, event, mode) {
        const academy = event.type === 'academy_offer';
        if (academy && mode === 'boost') return;
        const story = storyOffer(event);
        const sandbox = !!mode && mode !== 'boost';
        const boost = mode === 'boost';
        const quality = sandbox ? config.offerQuality : boost && hasPerk('superAgent') ? 1 : 0;
        const extra = !story && (sandbox ? config.extraOffer : boost && hasPerk('extraOffer'));
        const options = event.options;
        // Every move of the Offer quality slider brings new clubs (offerRoll), even back at the same quality
        const key = String(state.seed) + ':' + event.id + (sandbox && offerRoll ? ':' + offerRoll : '');
        const taken = new Set([state.currentTeamId, state.contractTeamId]);
        // Transfers and contract ends go through the market; the academy only moves with Offer quality
        const wants = mode && !academy ? marketBars(state, key) : null;
        const want = !!wants || quality !== 0;
        const code = (state.player.nationality || {}).fifa_code;
        const ovr = Number(state.player.overall) || 0;
        const old = (Number(state.player.age) || 0) >= SENSE.from;
        const memory = offerMemory(state);
        // This window, one club that came in before may come back (the first slot it fits)
        let suitorDue = !!wants && seeded(key + ':suitor')() < SUITORS.chance;
        // A club offered before weighs less (MARKET_FRESH)
        const fresh = (id) => Math.pow(MARKET_FRESH.seen, memory.before(id)) * (memory.recent(id) ? MARKET_FRESH.recent : 1);
        const released = releasedBy(state);
        /**
         * Super agent (Boost) and Sandbox's Offer quality: the agent gets clubs
         * `quality` levels better (or worse) interested, so they needn't want you
         * on their own; spread the way the market spreads offers (they used to
         * come from your own country first: Real Madrid in 93% of a Barcelona
         * star's windows, Benfica and Sporting in nearly every one of a Porto
         * player's), never your club's fierce rival or a club that let you go,
         * seldom one offered before.
         */
        const agentClub = (level, slotKey) => {
            const own = state.currentTeamId;
            const open = (id) => !taken.has(id) && (!CLUB_RULES[id] || CLUB_RULES[id] === code) && !released.has(id) && !RIVAL_PAIRS.has([own, id].sort().join('|'));
            const ids = Object.keys(gameData.teams).filter(open);
            // The level, and now and then one either side (only a few clubs share the top level: a star would hear from the
            // same ten every window)
            const off = (id) => Math.abs(clamp(repOf(id)[2], -1, 5) - level);
            for (let gap = 0; gap <= 6; gap++) {
                const list = ids.filter(id => off(id) === gap || off(id) === gap + 1);
                if (!list.some(id => off(id) === gap)) continue;
                const weight = (id) => offerWeight(state, id) * fresh(id) * (off(id) > gap ? MARKET_FRESH.side : 1);
                const spread = list.some(id => weight(id));
                return weightedPick(list, id => (spread ? weight(id) : fresh(id)), seeded(slotKey + ':agent'));
            }
            return null;
        };
        // One offer: the market's level for it (Offer quality and Super agent move it on), in the academy the club's own level
        const slotClub = (original, slotKey) => {
            if (!wants) return offerClub(state, clamp(repOf(original)[2] + quality, -1, 5), taken, slotKey);
            const level = marketLevel(state, original, wants, slotKey);
            if (quality) {
                taken.add(original);
                return agentClub(clamp(level + quality, -1, 5), slotKey);
            }
            // A suitor that earned its return, now and then; else Copero's own club when it still wants you at that level (not
            // one offered in the last windows, mostly), otherwise one that does, spread the way Copero spreads offers, with
            // the league's pull and the club's season, fewer repeats and nothing that makes no sense. When none there wants
            // you, a level or two lower (Copero's own club came back then, even a rival that didn't want you)
            const fits = (id, at) => !taken.has(id) && (!CLUB_RULES[id] || CLUB_RULES[id] === code) && clamp(repOf(id)[2], -1, 5) === at && wants(id);
            for (let at = level; at >= Math.max(-1, level - 2); at--) {
                const all = Object.keys(gameData.teams).filter(id => fits(id, at));
                const sane = old ? all : all.filter(id => clubLevel(id) <= ovr + SENSE.above && clubLevel(id) >= ovr - SENSE.below);
                const list = sane.length ? sane : all;
                if (suitorDue) {
                    const back = list.filter(id => memory.before(id) >= 1 && memory.before(id) <= SUITORS.returns && clubNeed(key, id) <= SUITORS.need);
                    if (back.length) {
                        suitorDue = false;
                        return weightedPick(back, id => seasonPull(state, id), seeded(slotKey + ':suitors'));
                    }
                }
                const homeStar = ovr >= STAR_HOME.from && !!gameData.teams[original] && gameData.teams[original].country === (gameData.teams[state.currentTeamId] || {}).country;
                if (at === level && fits(original, at) && !memory.before(original) && seeded(slotKey + ':again')() < MARKET_FRESH.keep &&
                    !(homeStar && seeded(slotKey + ':home')() >= STAR_HOME.keep)) return original;
                const weight = (id) => offerWeight(state, id) * fresh(id);
                const spread = list.some(id => weight(id));
                if (list.length) return weightedPick(list, id => (spread ? weight(id) : 1), seeded(slotKey));
            }
            return null;
        };
        const last = options.reduce((at, option, i) => (option && option.type === 'join_club' && !option.c99Added ? i : at), -1);
        // An ageing star now and then hears from a league that pays for a name (adventureClub), in place of the last club
        const voyage = mode && !academy && !story ? adventureClub(state, taken, key) : null;
        options.forEach((option, i) => {
            if (!option || option.type !== 'join_club' || option.c99Added) return;
            if (option.c99From === undefined) {
                if (!want) {
                    taken.add(option.teamId);
                    return;
                }
                option.c99From = option.teamId;
            }
            const trip = i === last && voyage ? voyage : null;
            const teamId = trip || (want && slotClub(option.c99From, key + ':' + i)) || option.c99From;
            taken.add(teamId);
            if (option.teamId !== teamId) {
                option.teamId = teamId;
                changed = true;
            }
            if (!!option.c99Adventure !== !!trip) {
                if (trip) option.c99Adventure = true;
                else delete option.c99Adventure;
                changed = true;
            }
        });
        const added = options.findIndex(option => option && option.c99Added);
        if (extra) {
            const first = options.find(option => option && option.type === 'join_club' && !option.c99Added);
            // A club of its own, never one Copero offered and the market passed over
            options.forEach(option => option && option.c99From !== undefined && taken.add(option.c99From));
            const teamId = slotClub(first ? (first.c99From !== undefined ? first.c99From : first.teamId) : null, key + ':extra');
            if (!teamId) {
                if (wants) noteOffers(state, options);
                return;
            }
            if (added < 0) {
                // Clubs first, then Stay (and Retire), like the game's own order
                const at = options.reduce((last, option, i) => (option && option.type === 'join_club' ? i + 1 : last), 0);
                options.splice(at, 0, { id: 'c99-offer-' + teamId, type: 'join_club', teamId: teamId, c99Added: true });
                changed = true;
            } else if (options[added].teamId !== teamId) {
                // Offer quality changed: the added club follows
                options[added].teamId = teamId;
                changed = true;
            }
        } else if (added >= 0) {
            options.splice(added, 1);
            changed = true;
        }
        if (wants) noteOffers(state, options);
    }
    /**
     * A last adventure (twenty-second round, from real careers: Ronaldo at
     * Al-Nassr, Messi at Inter Miami, Iniesta at Vissel Kobe, Pirlo in New
     * York): from 31, a player who was 84+ at his best hears now and then from
     * a league that pays for a name: `chance` a window at 31, `per` more a
     * year, at most `max`. The league by its weight (never your own), the club
     * by how big it is at home and in the world. Boost and Sandbox transfer
     * windows; the card gets a "Last adventure" tag. Null when not this window.
     */
    // (`fade`: what the strong leagues ask more of a player who went there, except `back` of the windows)
    const ADVENTURE = { from: 31, peak: 84, chance: 0.1, per: 0.07, max: 0.45, ease: 0.3, fade: 6, back: 0.15, leagues: { KSA: 3, USA: 3, TUR: 1.5, JPN: 1, CHN: 0.6, AUS: 0.5 } };
    function adventureClub(state, taken, key) {
        const age = Number(state.player.age) || 0;
        const best = state.seasons.reduce((top, s) => Math.max(top, Number(s.overall) || 0), Number(state.player.overall) || 0);
        if (age < ADVENTURE.from || best < ADVENTURE.peak) return null;
        const rng = seeded(key + ':adventure');
        if (rng() >= Math.min(ADVENTURE.max, ADVENTURE.chance + ADVENTURE.per * (age - ADVENTURE.from))) return null;
        const here = (gameData.teams[state.currentTeamId] || {}).country;
        const leagues = Object.keys(ADVENTURE.leagues).filter(code => code !== here);
        const country = weightedPick(leagues, code => ADVENTURE.leagues[code], rng);
        const clubs = Object.keys(gameData.teams).filter(id => !taken.has(id) && gameData.teams[id].country === country && gameData.teams[id].tier === 1);
        return clubs.length ? weightedPick(clubs, id => Math.pow(2, Math.max(0, repOf(id)[0]) + Math.max(0, repOf(id)[2])), rng) : null;
    }
    // The fiercest rivalries among Copero's clubs (Copero has no list of its own; its "rival" offers are just bigger clubs)
    const RIVALS = [
        ['barcelona', 'real-madrid'], ['real-madrid', 'atletico-madrid'], ['barcelona', 'espanyol'], ['sevilla', 'real-betis'], ['athletic-club', 'real-sociedad'],
        ['celta-vigo', 'deportivo-la-coruna'], ['valencia', 'villarreal'],
        ['arsenal', 'tottenham'], ['liverpool', 'everton'], ['liverpool', 'manchester-united'], ['manchester-city', 'manchester-united'], ['chelsea', 'tottenham'],
        ['newcastle', 'sunderland'], ['aston-villa', 'birmingham'], ['leeds', 'manchester-united'], ['nottingham-forest', 'derby'], ['west-ham', 'millwall'],
        ['southampton', 'portsmouth'], ['crystal-palace', 'brighton'],
        ['inter', 'ac-milan'], ['inter', 'juventus'], ['juventus', 'torino'], ['as-roma', 'lazio'], ['genoa', 'sampdoria'], ['napoli', 'juventus'], ['fiorentina', 'juventus'],
        ['paris-saint-germain', 'olympique-de-marseille'], ['olympique-lyonnais', 'saint-etienne'], ['nice', 'monaco'],
        ['benfica', 'sporting-lisboa'], ['benfica', 'porto'], ['porto', 'sporting-lisboa'],
        ['ajax', 'feyenoord'], ['ajax', 'psv'], ['psv', 'feyenoord'],
        ['celtic', 'rangers'], ['hearts', 'hibernian'], ['dundee', 'dundee-united'],
        ['galatasaray', 'fenerbahce'], ['besiktas', 'fenerbahce'], ['galatasaray', 'besiktas'],
        ['anderlecht', 'club-brugge'], ['club-brugge', 'cercle-brugge'], ['anderlecht', 'standard-liege'],
        ['olympiacos', 'panathinaikos'], ['aek-atenas', 'olympiacos'], ['paok', 'aris-thessaloniki'],
        ['crvena-zvezda', 'fk-partizan'], ['dinamo-zagreb', 'hajduk-split'], ['spartak-moscow', 'cska-moscow'], ['zenit', 'spartak-moscow'],
        ['boca-juniors', 'river-plate'], ['racing-club', 'independiente'], ['rosario-central', 'newells-old-boys'], ['estudiantes', 'gimnasia-lp'], ['san-lorenzo', 'huracan'],
        ['flamengo', 'fluminense'], ['flamengo', 'vasco-da-gama'], ['botafogo', 'flamengo'], ['corinthians', 'palmeiras'], ['corinthians', 'sao-paulo'],
        ['palmeiras', 'sao-paulo'], ['gremio', 'internacional'], ['cruzeiro', 'atletico-mg'], ['club-nacional', 'penarol'],
        ['guadalajara-chivas', 'club-america'], ['club-america', 'unam-pumas'], ['club-america', 'cruz-azul'], ['monterrey', 'tigres-uanl'],
        ['los-angeles-galaxy', 'los-angeles-fc'], ['new-york-rb', 'new-york-city-fc'], ['portland-timbers', 'seattle-sounders'],
        ['al-ahly', 'zamalek'], ['al-hilal', 'al-nassr'], ['al-ittihad', 'al-ahli']
    ];
    const RIVAL_PAIRS = new Set(RIVALS.map(pair => pair.slice().sort().join('|')));

