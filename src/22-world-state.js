    // ========================================================================
    // The Living world's memory: reputations that move, news, countries
    // ========================================================================

    // LIVING WORLD (club reputations rise and fall during a career)

    // The game's reputations: domestic (league and cup odds, 0-5), continental (continental cup odds, 0-5),
    // international (which players the club wants and which offers you get, -1..5)
    const REP_KEYS = ['domestic_reputation', 'continental_reputation', 'international_reputation'];
    // (6: the Living world's own rare top level, see ELITE_REP)
    const REP_RANGE = [[0, 6], [0, 6], [-1, 6]];
    // The 6th level of a reputation: a club that climbed past Copero's top, essentially a superteam. Copero's scales stop at
    // 5, so the game sees 5; the script plays it stronger (its league titles and the big continental cup: eliteTitles,
    // seasonResult). A move up to 6 only lands `reach` of the time; each season a 6 falls back with `fade`. Moves stay
    // within `spread` of the game file
    // `emerge`: each season a superteam rises somewhere else that often (a top-flight club already at 5 on one of its scales),
    // so a few clubs in the world are at the 6th level at any time
    const ELITE_REP = { reach: 0.25, fade: 0.2, spread: 3, emerge: 0.35 };
    // A club's reputations on the Living world's scale (0-6, Copero's plus the 6th level)
    const levelOf = (id) => repOf(id).map((n, i) => n + (eliteOf(id)[i] ? 1 : 0));
    // Which of a club's reputations are at the 6th level: [domestic, continental, international]
    function eliteOf(id) {
        const team = gameData.teams[id];
        const delta = (world && world.deltas[id]) || [0, 0, 0];
        return team && team.rep ? team.rep.map((n, i) => n + delta[i] > 5) : [false, false, false];
    }
    const REP_NAMES = ['League', 'Continental', 'World name'];
    let liveTeams = null;            // The game's own club objects by id (found through React), edited in place
    let world = null;                // { seed, seasons, deltas: { teamId: [domestic, continental, international] }, nations: { fifa code: -1..1 }, news: [] }
    const worldTouched = new Set();  // Clubs whose live reputation differs from the game file
    const nationTouched = new Set(); // Country records (the player's nationality) whose reputations differ from the game file
    function loadWorld() {
        const saved = storeGet('copero99_world');
        world = saved && typeof saved.seed === 'string' && saved.deltas && typeof saved.deltas === 'object' && Array.isArray(saved.news) ? saved : null;
        // Saved before seasons had results (older versions)
        if (world && (!world.results || typeof world.results !== 'object')) world.results = {};
        if (world && (!world.tournaments || typeof world.tournaments !== 'object')) world.tournaments = {};
        if (world && (!world.nations || typeof world.nations !== 'object')) world.nations = {};
    }
    function saveWorld() {
        storeSet('copero99_world', world);
    }
    // A club's reputations as the game uses them right now: [domestic, continental, international]
    function repOf(id) {
        const live = liveTeams && liveTeams[id];
        if (live) return REP_KEYS.map(key => Number(live[key]) || 0);
        const team = gameData.teams[id];
        const delta = (world && world.deltas[id]) || [0, 0, 0];
        return team && team.rep ? team.rep.map((n, i) => Math.min(5, n + delta[i])) : [0, 0, 0];
    }
    /**
     * Every season played (the game plays two per decision), the world moves:
     * your club's titles can lift its league or continental standing (and a
     * continental title or a 90+ player its world name), a season without a
     * title can cost a little, and a few clubs in your league and in top
     * leagues everywhere drift up or down, pulled back toward where they
     * started (at most 2 levels from the game file). Repeatable per career.
     * During the season animation the coming seasons' results are worked out
     * straight away (the Living world plays them out), and the world moves
     * once they have `landed` (the game shows their trophies).
     */
    function updateWorld(state, landed) {
        if (!liveTeams) {
            restoreWorld();
            return;
        }
        const seed = String(state.seed);
        const log = Array.isArray(state.log) ? state.log : [];
        if (!world || world.seed !== seed) {
            world = { seed: seed, seasons: state.seasons.length, deltas: {}, nations: {}, news: [], results: {}, tournaments: {}, logSeen: log.length };
            saveWorld();
        }
        // Saved before club events moved reputations: what's in the log already stays as it was
        if (!Number.isFinite(world.logSeen)) world.logSeen = log.length;
        let dirty = false;
        // National tournaments of the coming seasons: whether the country qualified is decided before they're played
        // (per country: an event can switch your national team)
        const code = (state.player.nationality || {}).fifa_code;
        for (const tournament of Array.isArray(state.upcomingNationalTournaments) ? state.upcomingNationalTournaments : []) {
            const key = tournament && code + ':' + tournament.age + ':' + tournament.trophy;
            if (key && world.tournaments[key] === undefined) {
                world.tournaments[key] = !!tournament.selectionQualified;
                dirty = true;
            }
        }
        // Vanilla careers play by Copero's own reputations: the results are shown, nothing moves
        const drift = !!currentMode();
        // Waits for the club list from the game file (a few seconds at most). Each season's results are worked out
        // once, with the reputations as they were, then the world moves
        if (gameData.status === 'ready') {
            for (let i = 0; i < state.seasons.length; i++) {
                if (world.results[i] === undefined) {
                    world.results[i] = seasonResult(state, i) || false;
                    dirty = true;
                }
                // Copero's club events of this decision come first (they happened before its seasons were played)
                if (landed && i === world.seasons && world.logSeen < log.length) {
                    if (drift) log.slice(world.logSeen).forEach(entry => clubEvent(state, entry));
                    world.logSeen = log.length;
                }
                if (landed && i >= world.seasons && drift) evolveWorld(state, i);
            }
            if (landed && state.seasons.length > world.seasons) {
                world.seasons = state.seasons.length;
                dirty = true;
            }
        }
        if (dirty) saveWorld();
        if (drift) applyWorld(state.player.nationality);
        else restoreWorld();
    }
    function evolveWorld(state, index) {
        const season = state.seasons[index] || {};
        const rng = seeded(world.seed + ':world:' + index);
        const moves = [];
        const own = season.teamId;
        const trophies = Array.isArray(season.trophies) ? season.trophies : [];
        if (gameData.teams[own]) {
            // (only up to its name in the file: each title lifting it again raised Copero's odds again, a dozen titles in a row)
            if (trophies.indexOf('league') >= 0 && rng() < 0.5 && (world.deltas[own] || [0])[0] <= 0) moves.push([own, 0, 1]);
            if (trophies.some(key => key === 'continental_primary' || key === 'club_world_cup') && rng() < 0.5) moves.push([own, 1, 1]);
            if (trophies.indexOf('continental_primary') >= 0 && rng() < 0.25) moves.push([own, 2, 1]);
            if (Number(season.overall) >= 90 && rng() < 0.15) moves.push([own, 2, 1]);
            if (trophies.length === 0 && rng() < 0.1) moves.push([own, 0, -1]);
            // Going down hurts, coming up and a continental final help
            const result = world.results[index];
            const comps = result ? result.comps : [];
            if (season.relegated && rng() < 0.5) moves.push([own, 0, -1]);
            if (comps.some(comp => comp.note === 'promoted') && rng() < 0.4) moves.push([own, 0, 1]);
            if (comps.some(comp => comp.key === 'continental_primary' && comp.lv === 2) && rng() < 0.25) moves.push([own, 1, 1]);
            // Your club finds its way back to its name too, like every other club (its own numbers): without it a big club
            // that had a few bad seasons only ever went down while you were there
            // (not through a club crisis: that's a slump of its own)
            const recover = seeded(world.seed + ':recover:' + index);
            const crisis = !!stretchChoice(state, season, 'club_crisis');
            (world.deltas[own] || [0, 0, 0]).forEach((delta, field) => {
                if (recover() < (delta < 0 && !crisis ? 0.25 : 0)) moves.push([own, field, 1]);
            });
        }
        const ownTeam = gameData.teams[own] || {};
        const top = Object.keys(gameData.teams).filter(id => gameData.teams[id].tier === 1);
        const league = top.filter(id => gameData.teams[id].country === ownTeam.country && id !== own);
        for (const [pool, count] of [[league, 3], [top, 5]]) {
            for (let n = 0; n < count && pool.length; n++) {
                const id = pool[Math.floor(rng() * pool.length)];
                const field = Math.floor(rng() * 3);
                const drift = ((world.deltas[id] || [0, 0, 0])[field]);
                moves.push([id, field, rng() < 0.5 - drift * 0.2 ? 1 : -1]);
            }
        }
        // The rest of the world moves more (twenty-first round, Chirp: other clubs' names hardly changed in a career): more
        // clubs of your league and of the world's top flights move each season, now and then two levels at once, and other
        // clubs' titles lift them. Its own numbers (so the moves above stay as they were), applied first so your club's own
        // moves stay the newest in Latest moves; moves abroad aren't news (they'd bury your league's)
        const shake = seeded(world.seed + ':shake:' + index);
        const extra = [];
        for (const [pool, count, quiet] of [[league, WORLD_SHAKE.league, false], [top, WORLD_SHAKE.top, true]]) {
            for (let n = 0; n < count && pool.length; n++) {
                const id = pool[Math.floor(shake() * pool.length)];
                if (id === own) continue;
                const field = Math.floor(shake() * 3);
                const drift = ((world.deltas[id] || [0, 0, 0])[field]);
                const step = shake() < 0.5 - drift * 0.2 ? 1 : -1;
                extra.push([id, field, step, '', quiet]);
                if (shake() < WORLD_SHAKE.double) extra.push([id, field, step, '', quiet]);
            }
        }
        const latest = world.results[index];
        for (const comp of (latest && latest.comps) || []) {
            const champ = comp.key === 'league' ? comp.tier === 1 && comp.table && comp.table[0] : (comp.key === 'continental_primary' || comp.key === 'club_world_cup') && comp.champ;
            if (champ && champ !== own && shake() < WORLD_SHAKE.champion) extra.push([champ, comp.key === 'league' ? 0 : 1, 1, comp.key === 'league' ? 'league champions' : 'continental champions', false]);
        }
        for (const [id, field, step, why, quiet] of extra) moveRep(id, field, step, season.age, why, false, quiet);
        // A small club (continental standing 0) that just won the big continental cup stays small this time: Copero's Giant
        // killer achievement reads its live standing when the season lands, after this
        const giantKiller = trophies.indexOf('continental_primary') >= 0 && repOf(own)[1] === 0;
        for (const [id, field, step] of moves) {
            if (!(giantKiller && id === own && field === 1 && step > 0)) moveRep(id, field, step, season.age);
        }
        // A small club (league standing 2 or less) that finished in the top 4 of a top flight without the title: 40% it grows
        // at home (its own numbers, so the moves above stay as they were)
        const table = (world.results[index] || { comps: [] }).comps.find(comp => comp.key === 'league');
        if (table && table.tier === 1 && table.pos > 1 && table.pos <= 4 && repOf(own)[0] <= 2 && seeded(world.seed + ':overachiever:' + index)() < 0.4) {
            moveRep(own, 0, 1, season.age, 'surprise season');
        }
        // Managers: their stars move with the season, coaches move their clubs, and a new manager at your club is news
        rateManagers(state, index);
        coachWorld(state, index);
        const before = clubManager(state, own, index);
        const after = clubManager(state, own, index + 1);
        if (before && after && after.since === index + 1) {
            world.news.unshift({ age: Number(season.age) || null, id: own, manager: after.manager.name, code: after.manager.code, was: before.manager.name, why: MANAGER_EXITS[after.exit] || '' });
            world.news = world.news.slice(0, NEWS_KEPT);
        }
        // Superteams elsewhere: now and then a club already at the top of a scale climbs past it (its own numbers)
        const rise = seeded(world.seed + ':superteam-rise:' + index);
        if (rise() < ELITE_REP.emerge) {
            const peaks = [];
            for (const id of top) {
                if (id === own) continue;
                repOf(id).forEach((n, field) => { if (n >= 5 && !eliteOf(id)[field]) peaks.push([id, field]); });
            }
            const pick = peaks.length && peaks[Math.floor(rise() * peaks.length)];
            if (pick) moveRep(pick[0], pick[1], 1, season.age, 'a superteam rises', true);
        }
        // A superteam (the 6th level) seldom lasts long
        for (const id of Object.keys(world.deltas)) {
            eliteOf(id).forEach((on, field) => {
                if (on && seeded(world.seed + ':elite-fade:' + id + ':' + field + ':' + index)() < ELITE_REP.fade) moveRep(id, field, -1, season.age, 'the superteam fades');
            });
        }
        moveNation(state, index);
    }
    /**
     * Copero's events about a club move its reputation the way the event
     * says, beyond the stretch whose trophy odds the game changes: a crisis
     * costs the club in it, a superteam lifts the club that builds it around
     * you, mentoring a new prospect lifts your club at home.
     */
    function clubEvent(state, entry) {
        const p = entry && entry.payload;
        if (!p || p.eventType !== 'career_event') return;
        const age = entry.age;
        if (p.eventKey === 'club_crisis') {
            // Staying logs the club in crisis; leaving logs the new club, so then it's the club of the last season played
            const before = state.seasons.filter(season => Number(season.age) < Number(age)).pop();
            const club = p.optionKey ? p.teamId : before && before.teamId;
            moveRep(club, 0, -1, age, 'club crisis');
            moveRep(club, 1, -1, age, 'club crisis');
        } else if (p.eventKey === 'rival_offer' && p.optionKey === 'accept') {
            moveRep(p.rivalTeamId || p.teamId, 0, 1, age, 'superteam');
            moveRep(p.rivalTeamId || p.teamId, 1, 1, age, 'superteam');
        } else if (p.eventKey === 'unexpected_prospect' && p.optionKey === 'mentor') {
            moveRep(p.teamId, 0, 1, age, 'new prospect');
        }
    }
    // The rest of the world's extra moves a season (evolveWorld): clubs of your league, clubs of any top flight, the share
    // that moves two levels, and how often another club's league or continental title lifts it
    const WORLD_SHAKE = { league: 4, top: 30, double: 0.25, champion: 0.3 };
    // Latest moves kept (4 are shown)
    const NEWS_KEPT = 24;
    function moveRep(id, field, step, age, why, sure, quiet) {
        const team = gameData.teams[id];
        if (!team || !team.rep) return;
        const base = team.rep[field];
        const delta = world.deltas[id] || [0, 0, 0];
        const from = base + delta[field];
        const to = clamp(from + step, REP_RANGE[field][0], REP_RANGE[field][1]);
        if (to === from || Math.abs(to - base) > ELITE_REP.spread) return;
        if (to > 5 && !sure && seeded(world.seed + ':elite:' + id + ':' + field + ':' + world.seasons + ':' + world.news.length)() >= ELITE_REP.reach) return;
        delta[field] = to - base;
        if (delta.some(Boolean)) world.deltas[id] = delta;
        else delete world.deltas[id];
        if (quiet) return;
        world.news.unshift({ age: Number(age) || null, id: id, field: field, from: from, to: to, why: why || '' });
        world.news = world.news.slice(0, NEWS_KEPT);
    }
    // Your country's world name: one reputation, its squad level (Copero's international_reputation), moved by its
    // tournaments and the generation coming through. Copero reads it from the player's nationality, so it is also the
    // OVR a call-up needs (CALLUP_OVR, the game's `We`) and the team-mates' level; the country's other reputations
    // (qualifying, title odds) move with it. At most one level from Copero's own values.

    // Copero's reputations of a country, in the order of gameData.countries' intl, cont, fifa
    const NATION_KEYS = ['international_reputation', 'continental_reputation', 'fifa_reputation'];
    const NATION_HINT = 'How strong the national team is: the higher, the better your team-mates and the higher the OVR a call-up needs';
    // A country's generation in a season (its era: clubEra): golden +1, thin -1. Golden generation (the perk) makes a
    // golden one likelier and never a thin one
    function nationGeneration(code, index) {
        const era = clubEra(code, index);
        const perk = stats.picked === 'boost' && hasPerk('goldenGen');
        return era >= 1.5 || (perk && era >= 0.75) ? 1 : era <= -1.5 && !perk ? -1 : 0;
    }
    // How far a country is from Copero's own values at a season (its results so far, `delta`, and its generation): -1..1
    const nationShift = (code, delta, index) => clamp(delta + nationGeneration(code, index), -1, 1);
    // The country's world name as Copero reads it at a season (0-5)
    function nationRep(code, delta, index) {
        const base = gameData.countries[code].intl;
        return clamp(base + nationShift(code, delta, index), 0, Math.max(5, base));
    }
    /**
     * Your country's tournaments in a season move its world name: a title
     * lifts it, so may a lost final; an early exit or a World Cup missed may
     * cost it. A new generation coming through moves it too. Latest moves
     * says why.
     */
    function moveNation(state, index) {
        const result = world.results[index];
        const code = (result && result.code) || (state.player.nationality || {}).fifa_code;
        if (!gameData.countries[code]) return;
        const rng = seeded(world.seed + ':nation:' + index);
        const before = world.nations[code] || 0;
        let step = 0, why = '';
        for (const item of result ? result.nation : []) {
            const name = trophyName(item.key, null, null, item.confed);
            if (item.res === 'Winner' && rng() < (item.key === 'world_cup' ? 1 : 0.6)) [step, why] = [1, name + ' won'];
            else if (item.lv === 2 && rng() < 0.3) [step, why] = [1, name + ' final'];
            else if (item.res === NOT_QUALIFIED && rng() < 0.4) [step, why] = [-1, 'missed the ' + name];
            else if (item.res === 'Group stage' && rng() < 0.3) [step, why] = [-1, 'out in the ' + name + ' group stage'];
        }
        const delta = clamp(before + step, -1, 1);
        if (delta) world.nations[code] = delta;
        else delete world.nations[code];
        const from = nationRep(code, before, index);
        const to = nationRep(code, delta, index + 1);
        if (to === from) return;
        if (!step || Math.sign(to - from) !== step) {
            const gen = nationGeneration(code, index + 1);
            why = gen > 0 ? 'golden generation' : gen < 0 ? 'thin generation' : nationGeneration(code, index) > 0 ? 'golden generation gone' : 'new generation';
        }
        world.news.unshift({ age: Number((state.seasons[index] || {}).age) || null, id: code, nation: true, field: 2, from: from, to: to, why: why });
        world.news = world.news.slice(0, NEWS_KEPT);
    }
    // Sets a country record (the player's nationality) to the game file's values moved by `shift`
    function setNation(nat, shift) {
        const base = gameData.countries[nat.fifa_code];
        if (!base) return;
        [base.intl, base.cont, base.fifa].forEach((value, i) => {
            const to = clamp(value + shift, 0, Math.max(5, value));
            if (nat[NATION_KEYS[i]] !== to) nat[NATION_KEYS[i]] = to;
        });
        if (shift) nationTouched.add(nat);
        else nationTouched.delete(nat);
    }
    // Sets the game's live club objects to the file's values plus this career's changes, and your country (`nat`, the
    // player's nationality) for the coming decision (Copero reads it when you choose)
    function applyWorld(nat) {
        for (const other of nationTouched) if (other !== nat) setNation(other, 0);
        if (nat && world) setNation(nat, nationShift(nat.fifa_code, world.nations[nat.fifa_code] || 0, world.seasons));
        if (!liveTeams) return;
        const deltas = (world && world.deltas) || {};
        for (const id of new Set([...worldTouched, ...Object.keys(deltas)])) {
            const team = liveTeams[id];
            const base = gameData.teams[id] && gameData.teams[id].rep;
            if (!team || !base) continue;
            const delta = deltas[id] || [0, 0, 0];
            REP_KEYS.forEach((key, i) => {
                const value = Math.min(5, base[i] + delta[i]);
                if (team[key] !== value) team[key] = value;
            });
            if (delta.some(Boolean)) worldTouched.add(id);
            else worldTouched.delete(id);
        }
    }
    // Menu off: every club (and country) back to the game file's values (this career's changes are kept for later)
    function restoreWorld() {
        if (!worldTouched.size && !nationTouched.size) return;
        const kept = world;
        world = null;
        applyWorld();
        world = kept;
    }

