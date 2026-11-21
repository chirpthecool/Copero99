    // ========================================================================
    // The Ballon d'Or vote against the season's stars
    // ========================================================================

    // Ballon d'Or: Copero gives it to every 97+ OVR attacker, so with a boost it came almost every season. In Boost
    // and Sandbox it's a vote instead: the season's OVR, what it won (club and country), goals and assists,
    // position and club, against the season's best rival. Most seasons the rival is strong on purpose (it takes a
    // historic season), but about 1 in 4 is an open year with a weaker rival, when a very good season can win it.
    // Odds for a striker at a top club (bdo-bal.js, fourteenth round): 99 with the league and the Champions League 66%,
    // with only the league 24%; 97 with the league and the Champions League 46%; a 95 treble 36%; 94 with the league and
    // the Champions League 19%; a 92 with the World Cup and the league 13%; a 91 winger's treble with 37 goals and the
    // Golden Boot 5% (2nd most years); 95 with only the league 2%. Nominated: an 88 who wins the league with 30 goals
    // always (about 12th), an 86 with 25 goals and the league 83% (about 23rd). A 93 centre-back's treble: about 4th.
    // Per career (sim8.js): The Chosen One ~7, Generational talent ~2.5, Wonderkid ~0.4 (a third win at least one).

    // Points for the season's trophies, by how much voters care about them
    // (a top club wins its league almost every season, so the league counts for little)
    // (twenty-first round: the continental cups count less, OVR and goals more; they were 15 / 10 / 3)
    const BDO_TROPHIES = { world_cup: 22, continental_primary: 11, national_continental: 8, league: 4, continental_secondary: 2, club_world_cup: 2, cup: 2 };
    // Trophies that always get a player who played for them (10+ games) nominated
    const BDO_NOMINATES = ['world_cup', 'national_continental', 'continental_primary'];
    // Copero's player roles: attackers score most; midfielders and defenders need a huge season (goalkeepers keep
    // Copero's Golden Glove)
    const BDO_ROLES = { attacker: 0, creator: -1, support: -8, defensive: -13 };
    const ROLE_OF = { LW: 'attacker', ST: 'attacker', RW: 'attacker', LM: 'creator', CAM: 'creator', RM: 'creator', LB: 'support', CM: 'support', RB: 'support', CDM: 'defensive', CB: 'defensive', GK: 'goalkeeper' };
    // The rest of the 30 behind the season's named stars (bdoRivals): the k-th best scores about top - drop × ln k, a
    // little higher or lower every season (spread), never above the last named star
    const BDO_FIELD = { top: 50, drop: 12.5, spread: 4 };
    // The jury's mood (Chirp: "the criteria is pretty flexible and can change from time to time"): half the years
    // trophies decide (Modrić 2018, Rodri 2024: a midfielder's role counts half), half the player's own season (Messi
    // 2010 over the World Cup winners, Ronaldo 2013 without a trophy); each weight a little up or down (`jitter`)
    // (bdo-bal.js / bdo-career.js: a 91 RW's treble wins 33% (it was 20%), an 88 with the Champions League and the World Cup
    // 39% (8%), a 95 who only wins the league 26% (32%); Ballon d'Ors per career about as before)
    const BDO_MOOD = { trophy: { trophy: 1.6, talent: 0.75, role: 0.5 }, talent: { trophy: 0.8, talent: 1.1, role: 1 }, jitter: 0.08 };
    // Every vote's own noise (100 journalists): points of spread on each candidate's score
    const BDO_NOISE = 4;
    // The season's stars (the real rivals): OVR around `mean` (+`size` per world name of the club above 4), `sd` spread,
    // 84-96, the same for a club's slot through a squad spell (±1 a season)
    // (`mate`: your own club's stars, a little below: the club's main man is usually you)
    // (Chirp: too few Ballon d'Ors for a career at 92-95 with Real Madrid: the stars were 91.5 on
    // average, so the best of 24 was about 96 every season; at 89.5 a 93 winger with the league and the Champions League
    // wins about 3 in 5 (it was 3 in 10), with only the league about 1 in 6 (1 in 100))
    const BDO_STARS = { mean: 89.5, size: 1, sd: 2.5, min: 84, max: 96, mate: 2.5 };
    // Their goals and assists a game in real life by position (a star at 89; a little more or less with the OVR)
    const BDO_STAR_RATES = { ST: [0.7, 0.18], LW: [0.45, 0.3], RW: [0.45, 0.3], CAM: [0.3, 0.33], LM: [0.25, 0.28], RM: [0.25, 0.28],
        CM: [0.12, 0.2], CDM: [0.06, 0.08], CB: [0.07, 0.03], LB: [0.05, 0.2], RB: [0.05, 0.2] };
    // Where the season's stars play (roughly the real top 30's positions)
    const BDO_STAR_SLOTS = { ST: 30, LW: 15, RW: 15, CAM: 15, CM: 10, CDM: 5, CB: 5, LB: 2, RB: 2, LM: 2, RM: 2, GK: 3 };
    // The big five's champions are in the running every year
    const BDO_LEAGUES = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
    // Points per OVR above `from` (it was 4 above 85, so OVR decided almost everything: 99 nearly always won, 91 never)
    // and `high` more per OVR above `top`: 95+ is rare now (HIGH_OVR), so it counts for a lot; 80-94 a little more than before
    // (twenty-first round: 3.5 above 83, so each OVR point counts more; it was 3 above 82)
    const BDO_OVR = { per: 3.5, from: 83, high: 6, top: 94 };
    // Goals and assists a game: `per` points per one a game around half a goal a game (at most ±`base`), then past about one a game
    // `past` points per extra one a game, up to `cap` (twenty-first round: 12 / 7 / 11 / 7, they were 10 / 5 / 8 / 5)
    const BDO_GOALS = { per: 12, base: 7, past: 11, cap: 7 };
    // Twenty-second round (Chirp: less likely when you're not a starter, and too many Ballon d'Ors in great careers):
    // a regular who wasn't a starter that season (Copero's own games, below a starter's 40 × the club's factor: rotation,
    // or an event that benched you) loses `BENCH` points; every Ballon d'Or already won costs `per` (voters like a new
    // name, up to `cap`)
    const BDO_BENCH = 9;
    // A goalkeeper's vote: clean sheets a game around `sheets` count `per` points each (at most ±`cap`), the Golden
    // Glove `glove`, and every keeper starts `penalty` behind; `win`: the share of the seasons he'd have won that he does
    // (17, it was 14, with the season's stars a little less strong)
    const BDO_KEEPER = { sheets: 0.35, per: 20, cap: 5, glove: 3, penalty: 17, win: 0.1 };
    // (Chirp: a 95 striker's 48-goal season at 34 lost it: only the Ballon d'Ors of the last `recent`
    // seasons tire the voters now, at most `cap` points; it was 2.5 each for every one ever won, up to 10)
    const BDO_FATIGUE = { per: 2, cap: 6, recent: 4 };
    // Copero's games factor for a club (its rl: a weak league plays fewer games)
    const clubGamesFactor = (id) => { const [domestic, continental] = repOf(id); return domestic <= 0 ? 0.7 : domestic === 1 ? 0.8 : continental <= 0 ? 0.9 : 1; };
    const playerRole = (player) => player.role || ROLE_OF[player.position] || 'attacker';
    // Goals + 0.6 assists a game on Copero's scale (the vote is tuned on it): real-life numbers (applyRealism, the stars) are
    // read back to Copero's
    function bdoPerGame(position, role, goals, assists, real) {
        const rates = real && REAL_RATES[position];
        if (!rates || !GOAL_RATES[role]) return goals + 0.6 * assists;
        return coperoRate(goals, rates[0], rates[1], coperoTop(role, false)) + 0.6 * coperoRate(assists, rates[2], rates[3], coperoTop(role, true));
    }
    /**
     * One candidate's score: { ovr, trophies, perGame (Copero's scale),
     * role, keeper, sheets (a game), glove, boot, size (the club's world
     * name), bigGame, regular, bench, fatigue }, under the season's mood
     * (bdoMood: how much the trophies, the player's own season and his role
     * count this year). Shared by you and the season's stars.
     */
    function bdoScore(p, mood) {
        const m = mood || { trophy: 1, talent: 1, role: 1 };
        const talent = BDO_OVR.per * (p.ovr - BDO_OVR.from) + BDO_OVR.high * Math.max(0, p.ovr - BDO_OVR.top);
        let honours = 0;
        for (const key of p.trophies) honours += BDO_TROPHIES[key] || 0;
        let play, role;
        if (p.keeper) {
            // A goalkeeper: clean sheets a game instead of goals, the Golden Glove, and every keeper starts behind
            play = clamp((p.sheets - BDO_KEEPER.sheets) * BDO_KEEPER.per, -BDO_KEEPER.cap, BDO_KEEPER.cap) + (p.glove ? BDO_KEEPER.glove : 0);
            role = -BDO_KEEPER.penalty;
        } else {
            // Full weight up to about one a game, then less up to a cap, so a record season still beats a merely great one
            play = clamp(p.perGame * BDO_GOALS.per - 5.5, -BDO_GOALS.base, BDO_GOALS.base) + clamp((p.perGame - 1.05) * BDO_GOALS.past, 0, BDO_GOALS.cap) + (p.boot ? 2 : 0);
            role = BDO_ROLES[p.role] || 0;
        }
        return m.talent * (talent + play) + m.trophy * honours + m.role * role + (clamp(p.size, -1, 5) - 3) * 1.5 +
            (p.bigGame ? 5 : 0) - (p.regular ? 0 : 10) - (p.bench ? BDO_BENCH : 0) - (p.fatigue || 0);
    }
    // The season's mood (BDO_MOOD): a trophy year or a year for the player's own season, half and half
    function bdoMood(state, index) {
        const rng = seeded(String(state.seed) + ':ballon-dor-mood:' + index);
        const kind = rng() < 0.5 ? 'trophy' : 'talent';
        const jitter = () => 1 + (rng() * 2 - 1) * BDO_MOOD.jitter;
        return { kind: kind, trophy: BDO_MOOD[kind].trophy * jitter(), talent: BDO_MOOD[kind].talent * jitter(), role: BDO_MOOD[kind].role };
    }
    /**
     * The season's real rivals (Chirp: the vote against the stars of
     * the season the Living world played, not a made-up number): the stars
     * of the club that won Europe's big cup (two), of each of the big five
     * leagues' champions, of the countries that won this season's World Cup
     * or continental titles, the Golden Boot winner, and one at each other
     * club of world name 5. Each star stands in a slot of his club's line-up
     * (starSlot; never your slot, and a teammate never further back than
     * you), with his country (winnerNation) and an OVR for the squad spell;
     * his trophies are his club's and his country's that season. Scored like
     * you under the season's mood, each with the vote's noise, best first.
     */
    function bdoRivals(state, index, comps, mood) {
        const season = state.seasons[index] || {};
        const seed = String(state.seed);
        const own = season.teamId;
        const rng = seeded(seed + ':ballon-dor-field:' + index);
        const teams = gameData.teams;
        const list = comps || [];
        const ownTrophies = (Array.isArray(season.trophies) ? season.trophies : []).filter(key => NATIONAL_TROPHIES.indexOf(key) < 0);
        const pick = (ids, strength) => (ids.length ? (world && world.seed === seed ? pickByStrength(rng, ids, strength, 2, index) : weightedPick(ids, id => Math.pow(3, strength(id)), rng)) : null);
        // Each club's trophies this season (yours as Copero gave them)
        const won = new Map();
        const give = (id, key) => { if (id && teams[id]) won.set(id, [...new Set([...(won.get(id) || []), key])]); };
        if (own && teams[own]) ownTrophies.forEach(key => give(own, key));
        // Europe's big cup: the Living world's winner when your club plays in Europe, else the strongest by name
        const continental = list.find(comp => comp.key === 'continental_primary');
        const europe = teams[own] && teams[own].confed === 'UEFA' && ownTrophies.indexOf('continental_primary') >= 0 ? own
            : teams[own] && teams[own].confed === 'UEFA' && continental ? continental.champ
            : pick(Object.keys(teams).filter(id => id !== own && teams[id].tier === 1 && teams[id].confed === 'UEFA'), id => repOf(id)[1]);
        if (europe && europe !== own) give(europe, 'continental_primary');
        // The big five's champions (yours from the Living world's table)
        const league = list.find(comp => comp.key === 'league');
        for (const code of BDO_LEAGUES) {
            const home = teams[own] && teams[own].country === code && teams[own].tier === 1;
            const top = home && ownTrophies.indexOf('league') >= 0 ? own : home && league && league.tier === 1 ? league.table[0]
                : pick(Object.keys(teams).filter(id => id !== own && teams[id].tier === 1 && teams[id].country === code), id => repOf(id)[0]);
            if (top && top !== own) give(top, 'league');
        }
        const stars = [];
        const taken = new Set();
        const add = (club, extra, nation, weights) => {
            if (!teams[club] || stars.length >= 24) return;
            const slot = starSlot(state, club, index, weights || BDO_STAR_SLOTS, rng, club === own);
            if (!slot || taken.has(club + ':' + slot)) return;
            taken.add(club + ':' + slot);
            const pos = slotPos(slot);
            const spell = seeded(seed + ':ballon-dor-star:' + club + ':' + slot + ':' + spellOf(state, club, index));
            const size = clamp(repOf(club)[2], -1, 5);
            const ovr = clamp(Math.round(BDO_STARS.mean + (size - 4) * BDO_STARS.size - (club === own ? BDO_STARS.mate : 0) + BDO_STARS.sd * gauss(spell) + (rng() * 2 - 1)), BDO_STARS.min, BDO_STARS.max);
            const keeper = pos === 'GK';
            const [goals, assists] = BDO_STAR_RATES[pos] || [0, 0];
            const form = (1 + (ovr - 89) * 0.04) * (0.8 + 0.4 * rng());
            const role = ROLE_OF[pos] || 'attacker';
            const trophies = [...(won.get(club) || []), ...(extra || [])];
            stars.push({
                club: club, slot: slot, pos: pos, nation: nation || winnerNation(state, index, club, slot), ovr: ovr, trophies: trophies,
                score: bdoScore({ ovr: ovr, trophies: trophies, perGame: keeper ? 0 : bdoPerGame(pos, role, goals * form, assists * form, true), role: role, keeper: keeper,
                    sheets: 0.45 * (0.8 + 0.4 * rng()), size: size, regular: true }, mood) + BDO_NOISE * gauss(rng)
            });
        };
        // (one when it's your club: you're one of its stars)
        if (europe) {
            add(europe);
            if (europe !== own) add(europe);
        }
        // Your club's star when it won something big (a teammate)
        if (own && teams[own] && teams[own].confed === 'UEFA' && ownTrophies.some(key => key === 'league' || key === 'continental_primary') && own !== europe) add(own);
        for (const id of won.keys()) if (id !== europe && id !== own) add(id);
        // The countries that won this season's World Cup or continental titles: a star of each, at one of Europe's big clubs
        const bigClubs = Object.keys(teams).filter(id => id !== own && teams[id].tier === 1 && teams[id].confed === 'UEFA' && repOf(id)[2] >= 4);
        const nations = (comps && comps.nation) || [];
        for (const item of nations) {
            if (!item.champ || (item.champ === (state.player.nationality || {}).fifa_code && item.res === 'Winner' && item.called)) continue;
            const club = weightedPick(bigClubs, id => Math.pow(3, repOf(id)[1] + repOf(id)[2]), rng);
            if (club) add(club, [item.key], item.champ);
        }
        // Europe's top scorer
        const race = bootRace(state, index);
        if (race.champ && race.champ !== own && !(Array.isArray(season.awards) && season.awards.indexOf('golden_boot') >= 0)) add(race.champ, [], null, { [race.pos]: 1 });
        // One star at each other club of world name 5
        for (const id of Object.keys(teams)) if (id !== own && teams[id].tier === 1 && teams[id].confed === 'UEFA' && repOf(id)[2] >= 5 && !stars.some(star => star.club === id)) add(id);
        return stars.sort((a, b) => b.score - a.score);
    }
    /**
     * The vote for one season: { won, place, winner } (place 1 = won; 2-30 =
     * where you finished; 0 = not nominated; winner = the best of the
     * season's stars, bdoRivals). Your season is scored like theirs under the
     * season's mood; the same season always gets the same vote. `comps`: the
     * season's Living world results (who won Europe and the league).
     */
    function ballonDorVote(state, index, comps) {
        const season = state.seasons[index];
        if (!season) return null;
        const role = playerRole(state.player);
        const keeper = role === 'goalkeeper';
        const mood = bdoMood(state, index);
        const results = comps || (world && world.seed === String(state.seed) && world.results[index] ? world.results[index].comps : null);
        const nation = comps ? null : world && world.seed === String(state.seed) && world.results[index] ? world.results[index].nation : null;
        const field = bdoRivals(state, index, results ? Object.assign(results.slice(), { nation: (results.nation || nation || []) }) : null, mood);
        const winner = field[0] || null;
        const s = season.stats || {};
        const apps = Number(s.appearances) || 0;
        if (season.suspended || apps < 10) return { won: false, place: 0, winner: winner };
        // Only regulars can win it (Copero's own rule: starters and rotation players); a squad player can still be nominated
        const regular = apps >= 20;
        const trophies = Array.isArray(season.trophies) ? season.trophies : [];
        const has = (key) => Array.isArray(season.awards) && season.awards.indexOf(key) >= 0;
        // Not a starter that season (judged on Copero's own games, before a playing trait changed them); voters tire of the
        // same winner
        const games = Number(season.c99Apps) || apps;
        const before = state.seasons.slice(Math.max(0, index - BDO_FATIGUE.recent), index).filter(x => x && Array.isArray(x.awards) && x.awards.indexOf('ballon_dor') >= 0).length;
        const mine = {
            ovr: Number(season.overall) || 0, trophies: trophies, role: role, keeper: keeper,
            perGame: keeper ? 0 : bdoPerGame(state.player.position, role, (Number(s.goals) || 0) / apps, (Number(s.assists) || 0) / apps, season.c99Real),
            sheets: (Number(s.cleanSheets) || 0) / apps, glove: has('golden_glove'), boot: has('golden_boot'),
            size: repOf(season.teamId)[2], bigGame: perkOn('bigGame'), regular: regular,
            bench: !!gameData.teams[season.teamId] && games < 38 * clubGamesFactor(season.teamId), fatigue: Math.min(BDO_FATIGUE.cap, BDO_FATIGUE.per * before)
        };
        const rng = seeded(String(state.seed) + ':ballon-dor:' + index);
        const score = bdoScore(mine, mood) + BDO_NOISE * gauss(rng);
        const above = field.filter(star => star.score > score).length;
        // Even a clear favourite loses now and then (about 1 vote in 14); a goalkeeper only with the World Cup or the big
        // continental cup, and even then seldom (one has won it, Yashin in 1963)
        if (regular && !above && rng() >= 0.07 && (!keeper || (trophies.some(key => key === 'world_cup' || key === 'continental_primary') &&
            seeded(String(state.seed) + ':ballon-dor-keeper:' + index)() < BDO_KEEPER.win))) return { won: true, place: 1, winner: winner };
        // Behind the named stars who had a better season, then the rest of the 30
        let place = Math.max(2, above + 1);
        if (above === field.length) {
            const top = BDO_FIELD.top + BDO_FIELD.spread * gauss(rng);
            const last = field.length ? field[field.length - 1].score : Infinity;
            for (let k = field.length + 1; k <= 30 && Math.min(last, top - BDO_FIELD.drop * Math.log(k)) > score; k++) place++;
        }
        if (place > 30) place = 0;
        // Winning the World Cup, your continent's title or the big continental cup always puts you on the list of 30
        if (!place && trophies.some(key => BDO_NOMINATES.indexOf(key) >= 0)) place = 16 + Math.floor(rng() * 15);
        return { won: false, place: place, winner: winner };
    }
    // Gives or takes the season's Ballon d'Or by the vote, also in the game's totals and in the celebration it is about to show
    function applyBallonDor(state, index) {
        const season = state.seasons[index];
        // The season's results first (who won Europe and the league), as the Living world will show them
        if (gameData.status === 'ready' && world && world.seed === String(state.seed) && world.results[index] === undefined) world.results[index] = seasonResult(state, index) || false;
        const result = world && world.seed === String(state.seed) ? world.results[index] : null;
        const vote = ballonDorVote(state, index, result ? Object.assign(result.comps.slice(), { nation: result.nation }) : null);
        if (!vote) return;
        const at = season.awards.indexOf('ballon_dor');
        if ((at >= 0) === vote.won) return;
        // The game's season log shares this list, so it changes there too
        if (vote.won) season.awards.unshift('ballon_dor');
        else season.awards.splice(at, 1);
        if (state.totals && Number.isFinite(state.totals.awards)) state.totals.awards += vote.won ? 1 : -1;
        celebrateAward(state, season, 'ballon_dor', vote.won);
        changed = true;
    }

