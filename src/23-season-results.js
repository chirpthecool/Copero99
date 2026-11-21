    // ========================================================================
    // A simulated season: league tables, cup runs, continental cups, champions
    // ========================================================================

    // Season results: where your club finished in every competition it played, and your country's tournaments.
    // The game only decides what you win; everything else is simulated here from the clubs' reputations, so it
    // always agrees with the game: a title the game gave you is a 1st place or a Winner, and without one your club
    // never finishes 1st or wins the final.

    // The game's own tables: call-up OVR by the country's international reputation, and the chance a country
    // qualifies for the World Cup by its continental reputation
    const CALLUP_OVR = [60, 70, 74, 78, 80, 83];
    const WC_QUALIFY = [0.05, 0.5, 0.8, 1, 1, 1, 1];
    // Every 4 years from these ages (the game's own schedule): continental title 17, Club World Cup 18, World Cup 19
    const tournamentAt = (age, first) => age >= first && (age - first) % 4 === 0;
    // Canadian MLS clubs don't play the US Open Cup (the game's own rule)
    const NO_CUP = { 'usa-us-open': ['cf-montreal', 'toronto-fc', 'vancouver-whitecaps'] };
    const CUP_ROUNDS = ['First round', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
    const CONTINENTAL_ROUNDS = {
        UEFA: ['League phase', 'Knockout play-offs', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
        other: ['Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final']
    };
    const CLUB_WORLD_ROUNDS = ['Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
    const NATION_ROUNDS = {
        world_cup: ['Group stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
        UEFA: ['Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
        CONMEBOL: ['Group stage', 'Quarter-final', 'Semi-final', 'Final'],
        CONCACAF: ['Group stage', 'Quarter-final', 'Semi-final', 'Final'],
        OFC: ['Group stage', 'Semi-final', 'Final']
    };
    // The rounds of a competition a club (`teamId`, playing in league `tier`) or its country (`confed`) plays
    function compRounds(key, teamId, tier, confed) {
        if (key === 'cup') return CUP_ROUNDS.slice(tier === 1 ? 1 : 0); // lower leagues start a round earlier
        if (key === 'club_world_cup') return CLUB_WORLD_ROUNDS;
        if (key === 'world_cup') return NATION_ROUNDS.world_cup;
        if (key === 'national_continental') return NATION_ROUNDS[confed] || NATION_ROUNDS.UEFA;
        const team = gameData.teams[teamId];
        return CONTINENTAL_ROUNDS[team && team.confed] || CONTINENTAL_ROUNDS.other;
    }
    // Chance to win a knockout round by strength (0-5)
    const ROUND_WIN = [0.3, 0.38, 0.46, 0.55, 0.63, 0.72];
    // Continental cups and the Club World Cup (twenty-first round): the chance to get through a round = base + per ×
    // strength − stage × the round's number, so a big club nearly always gets past the early rounds and a small one seldom
    // does (it was ROUND_WIN, the same every round: Real Madrid out in the league phase 28% of seasons, a strength-1 club
    // in the last 16 14%). Now: strength 5 in the last 16 ~85% and the quarter-finals ~70%, strength 3 46% / 27%,
    // strength 1 ~18% / ~6%
    const CONTINENTAL_ROUND = { base: 0.32, per: 0.13, stage: 0.06, min: 0.06, max: 0.95 };
    const roundOdds = (strength, stage) => clamp(CONTINENTAL_ROUND.base + CONTINENTAL_ROUND.per * strength - CONTINENTAL_ROUND.stage * stage, CONTINENTAL_ROUND.min, CONTINENTAL_ROUND.max);
    // A club's league and continental strength in a season: its reputations plus the game's own lift for an 85+ player (rr in the game)
    function clubStrength(teamId, ovr) {
        const [domestic, continental, international] = repOf(teamId);
        const intl = clamp(international, -1, 5);
        let d = 0, c = 0;
        if (ovr >= 90) {
            if (intl === 3) { d = 1; c = 1; } else if (intl === 2) { d = 2; c = 1; } else if (intl <= 1) { d = 2; c = 2; }
        } else if (ovr >= 85 && intl <= 3) {
            d = 1;
            c = intl <= 1 ? 1 : 0;
        }
        return [clamp(domestic + d, 0, 5), clamp(continental + c, 0, 5)];
    }
    /**
     * The clubs of one league as the game has them in this career (your clubs' promotions and relegations included).
     * Copero only moves your club, so a promotion made the league above 21 clubs and left 19 behind (Chirp): every
     * club that moved swaps places with one going the other way (the weakest of the league it went up to, the strongest
     * of the one it went down to, by the file's names, so the same club every time), and every league keeps its size.
     * `own`: a club that played this season in `tier` (the game's tier for it may already be the next season's).
     */
    function leagueClubs(state, country, tier, own) {
        const teams = gameData.teams;
        const moved = { ...(state.teamTierOverrides || {}) };
        if (own && teams[own] && teams[own].country === country) {
            if (tier === teams[own].tier) delete moved[own];
            else moved[own] = tier;
        }
        const ids = Object.keys(teams).filter(id => teams[id].country === country);
        const at = {};
        const movers = Object.keys(moved).filter(id => teams[id] && teams[id].country === country && moved[id] !== teams[id].tier).sort();
        for (const id of movers) at[id] = moved[id];
        for (const id of movers) {
            const from = teams[id].tier;
            const to = moved[id];
            const pool = ids.filter(c => teams[c].tier === to && !(c in at))
                .sort((a, b) => (teams[a].rep[0] - teams[b].rep[0]) || (a < b ? -1 : 1));
            if (pool.length) at[to < from ? pool[0] : pool[pool.length - 1]] = from;
        }
        return ids.filter(id => (id in at ? at[id] : teams[id].tier) === tier);
    }
    // A league table: each club's league reputation, its era and luck, best first; `own` plays with `ownStrength`
    function leagueTable(clubs, rng, own, ownStrength, index, league) {
        const list = clubs.indexOf(own) >= 0 ? clubs : clubs.concat(own);
        const tired = (id) => (league ? DYNASTY.tire * Math.max(0, titleRun(league, id, index) - 1) : 0);
        return list.map(id => [id, (id === own ? ownStrength : repOf(id)[0] + clubEra(id, index) - tired(id)) + (rng() + rng() + rng() - 1.5) * 1.6])
            .sort((a, b) => b[1] - a[1]).map(([id]) => id);
    }
    // A club that has won the league a few seasons running tires (a squad that has won it all, rivals that catch up):
    // `tire` levels less in the table for every title in a row after the first
    const DYNASTY = { tire: 0.5 };
    // League titles in a row a club won before season `index` in league `league` ('<country>:<tier>'), as far as the
    // Living world's results remember (the seasons you played in that league)
    function titleRun(league, id, index) {
        let n = 0;
        for (let i = index - 1; i >= 0; i--) {
            const result = world.results[i];
            const comp = result && result.country + ':' + result.tier === league && result.comps.find(c => c.key === 'league');
            if (!comp || comp.table[0] !== id) break;
            n++;
        }
        return n;
    }
    // Eras: every club (and country) has spells of a few seasons when it is much better or worse than its name says.
    // Each one lasts 4 seasons, starting at a different season per club, so the favourites change through a career
    const ERAS = [[-1.5, 0.12], [-0.75, 0.18], [0, 0.4], [0.75, 0.2], [1.5, 0.1]];
    function clubEra(id, index) {
        const block = Math.floor((Number(index) + hashText(world.seed + id) % 4) / 4);
        let roll = seeded(world.seed + ':era:' + id + ':' + block)();
        for (const [lift, chance] of ERAS) {
            if ((roll -= chance) < 0) return lift;
        }
        return 0;
    }
    // Now and then your club has a season far above its name (a surprise: a new coach, a team that clicks), its own seeded
    // numbers: `chance` a season, `lift` reputation levels for its league table. With its era it can finish high enough for
    // a continental cup next season, even when you aren't the reason
    const SURPRISE = { chance: 0.1, lift: 2.5 };
    const surpriseSeason = (id, index) => seeded(world.seed + ':surprise:' + id + ':' + index)() < SURPRISE.chance;
    // A season's form on top of the era: up to about ±1 reputation level
    function clubForm(id, index) {
        const rng = seeded(world.seed + ':form:' + id + ':' + index);
        return (rng() + rng() + rng() - 1.5) * 1.2;
    }
    /**
     * How far a club gets in a knockout competition (index of the round it
     * went out in; rounds.length = it won). `won` is what the game decided:
     * true wins it, false goes out somewhere (luck and strength decide where),
     * null means the game had no say (a country playing without you).
     */
    function knockout(rng, rounds, strength, won, continental) {
        if (won) return rounds.length;
        const p = ROUND_WIN[clamp(Math.round(Number(strength) || 0), 0, 5)];
        const odds = (stage) => (continental ? roundOdds(Number(strength) || 0, stage) : p);
        for (let tries = 0; tries < 50; tries++) {
            let stage = 0;
            while (stage < rounds.length && rng() < odds(stage)) stage++;
            if (stage < rounds.length || won === null) return stage;
        }
        return rounds.length - 1;
    }
    // A knockout result in words with its level: 3 won, 2 runner-up, 1 last eight / last four, 0 earlier
    function roundResult(rounds, stage) {
        if (stage >= rounds.length) return { res: 'Winner', lv: 3 };
        if (rounds[stage] === 'Final') return { res: 'Runner-up', lv: 2 };
        return { res: rounds[stage], lv: stage >= rounds.length - 3 ? 1 : 0 };
    }
    // Spots for the big and the second continental cup by how strong a league is (its best club's continental reputation)
    function continentalSpots(state, country, confed) {
        const best = Math.max(0, ...leagueClubs(state, country, 1).map(id => gameData.teams[id].rep[1]));
        const extra = confed === 'CONMEBOL' ? 2 : 0;
        const primary = (best >= 5 ? 4 : best >= 4 ? 3 : best >= 3 ? 2 : 1) + extra;
        return [primary, primary + 2 + extra];
    }
    /**
     * Which continental cup a club plays when it won neither: last season's
     * champions and continental winners play the big one (the game's own rule:
     * they can't win the second one), cup winners at least the second one, the
     * rest go by last season's league place. Null: didn't qualify.
     */
    function continentalEntry(state, index, own, team) {
        const before = state.seasons[index - 1];
        const cn = gameData.continental[team.confed] || {};
        let cupWon = false;
        if (before && before.teamId === own) {
            const won = Array.isArray(before.trophies) ? before.trophies : [];
            if ((Number(before.competitionTier) || 1) !== 1) return null; // just promoted
            if (won.indexOf('league') >= 0 || won.indexOf('continental_primary') >= 0 || won.indexOf('continental_secondary') >= 0) return 'continental_primary';
            cupWon = won.indexOf('cup') >= 0;
        }
        const prev = world.results[index - 1];
        const prevLeague = prev && prev.country === team.country && prev.comps.find(comp => comp.key === 'league' && comp.tier === 1);
        let table = prevLeague && prevLeague.table.indexOf(own) >= 0 ? prevLeague.table : null;
        if (!table) table = leagueTable(leagueClubs(state, team.country, 1, own), seeded(world.seed + ':before:' + index + ':' + own), own, repOf(own)[0], index - 1);
        const pos = table.indexOf(own) + 1;
        const [primary, secondary] = continentalSpots(state, team.country, team.confed);
        if (pos <= primary) return 'continental_primary';
        if (cn.continental_secondary && (pos <= secondary || cupWon)) return 'continental_secondary';
        return null;
    }
    /**
     * One season's results for the club you played for and your country:
     * { age, teamId, tier, country, comps: [...], nation: [...] }. Worked out
     * once, when the season is first on screen, and kept with the career.
     */
    function seasonResult(state, index) {
        const season = state.seasons[index];
        const own = season && season.teamId;
        const team = own && gameData.teams[own];
        if (!team) return null;
        const trophies = Array.isArray(season.trophies) ? season.trophies : [];
        // (a suspended season's club trophies went to the club without you, banTrophies)
        const won = (key) => trophies.indexOf(key) >= 0 || (Array.isArray(season.c99Banned) && season.c99Banned.indexOf(key) >= 0);
        // A final Copero's event lost (the decisive penalty missed, the trophy missed at the peak): that stretch's first
        // season reached it and lost it (2nd in a league)
        const lost = (key) => !won(key) && eventLost(state, season, key);
        const finalLost = (key, stage, rounds) => (lost(key) ? rounds.length - 1 : stage);
        const rng = seeded(world.seed + ':results:' + index);
        const tier = Number(season.competitionTier) || team.tier;
        const ovr = Number(season.overall) || 0;
        // Talisman: the club played a level stronger while you carried it (decisionClick); its coach a level up or down the
        // same way (c99Coach), and a superteam (the 6th level) a level past Copero's top
        const lifted = Array.isArray(season.c99Carry) ? season.c99Carry : [0, 0];
        const coached = Array.isArray(season.c99Coach) ? season.c99Coach : [0, 0];
        const elite = superteam(state, own);
        const [domestic, continental] = clubStrength(own, ovr).map((n, i) => clamp(n + lifted[i] + coached[i], 0, 5) + (elite[i] ? 1 : 0));
        // Copero's club priority choice for this stretch: the competition the club put first goes better (Copero doubles its
        // odds) and the other one worse (Copero halves them)
        const focus = { prioritize_league: 'league', prioritize_continental: 'continental_primary' }[stretchChoice(state, season, 'club_priority')];
        // Staying through Copero's club crisis: it cuts every trophy chance to a tenth for the stretch, so the club plays far
        // below its name everywhere
        const crisis = stretchChoice(state, season, 'club_crisis') === 'stay_and_fight';
        // (twenty-first round: PRIORITY_LIFT levels either way, it was 1, and on either continental cup the club plays)
        const area = (key) => (key === 'league' ? 'league' : key === 'continental_primary' || key === 'continental_secondary' ? 'continental_primary' : null);
        const lift = (key) => (crisis ? -CRISIS_DROP : 0) + (!focus || !area(key) ? 0 : area(key) === focus ? PRIORITY_LIFT : -PRIORITY_LIFT);
        const comps = [];

        // League: a table from the reputations; the game decides the title (in a lower league the title is promotion) and relegation.
        // Your club has eras like every other club, and now and then a surprise season
        const surprise = surpriseSeason(own, index);
        const table = leagueTable(leagueClubs(state, team.country, tier, own), rng, own, domestic + lift('league') + clubEra(own, index) + (surprise ? SURPRISE.lift : 0), index, team.country + ':' + tier);
        const place = (at) => {
            table.splice(table.indexOf(own), 1);
            table.splice(at, 0, own);
        };
        // Promotion the real way (realPromotion; Copero's own, and Vanilla's, is the title); a club that stayed down never
        // finishes in the automatic places, and the bottom places are the league's own (LEAGUE_RULES)
        const rule = leagueRule(team.country);
        const above = tier > 1 && !!gameData.leagues[team.country + ':' + (tier - 1)];
        const below = !!gameData.leagues[team.country + ':' + (tier + 1)];
        const up = season.c99Up || (tier > 1 && won('league') ? { how: 'champion', pos: 1 } : null);
        const size = table.length;
        if (up) place(Math.min(up.pos, size) - 1);
        else if (won('league')) place(0);
        else if (table[0] === own || (lost('league') && !season.relegated)) place(1);
        if (!up && above && !season.relegated && table.indexOf(own) < rule.up && size > rule.up + 2) place(rule.up);
        const bottom = rule.down + (rule.downPlayoff ? 1 : 0);
        if (season.relegated) {
            if (table.indexOf(own) < size - bottom) place(size - 1 - Math.floor(rng() * bottom));
        } else if (size > 6 && below && table.indexOf(own) >= size - rule.down) {
            place(size - rule.down - 1);
        }
        const pos = table.indexOf(own) + 1;
        const playoffs = above && rule.playoff && pos >= rule.playoff[0] && pos <= rule.playoff[1];
        comps.push({ key: 'league', tier: tier, up: up ? up.how : playoffs && !season.relegated ? 'missed' : '', table: table, pos: table.indexOf(own) + 1, focus: focus === 'league', rested: !!focus && focus !== 'league', crisis: crisis, carried: !!season.c99Carry, coached: Math.sign(coached[0]), elite: elite[0], surprise: surprise && table.indexOf(own) < 4,
            note: season.relegated ? 'relegated' : up ? 'promoted' : '' });

        // Domestic cup
        if (team.cupId && gameData.cups[team.cupId] && (NO_CUP[team.cupId] || []).indexOf(own) < 0) {
            const rounds = compRounds('cup', own, tier);
            comps.push({ key: 'cup', crisis: crisis, ...roundResult(rounds, finalLost('cup', knockout(rng, rounds, domestic + lift('cup'), won('cup')), rounds)) });
        }

        // Continental cups and the Club World Cup: top-league clubs only, as in the game
        const cn = gameData.continental[team.confed] || {};
        if (tier === 1 && cn.continental_primary) {
            const entry = won('continental_primary') || lost('continental_primary') ? 'continental_primary'
                : won('continental_secondary') || lost('continental_secondary') ? 'continental_secondary' : continentalEntry(state, index, own, team);
            if (entry) {
                const rounds = compRounds(entry, own, tier);
                comps.push({ key: entry, focus: area(entry) === focus, rested: !!focus && area(entry) !== focus, crisis: crisis, ...roundResult(rounds, finalLost(entry, knockout(rng, rounds, continental + lift(entry), won(entry), true), rounds)) });
            } else {
                comps.push({ key: 'continental_primary', res: 'Didn’t qualify', lv: -1 });
            }
        }
        if (tier === 1 && tournamentAt(Number(season.age), 18)) {
            // The clubs that qualified play (cwcField: the continental champions of the last 4 seasons, then a ranking)
            if (won('club_world_cup') || lost('club_world_cup') || cwcField(state, index).has(own)) {
                const rounds = compRounds('club_world_cup', own, tier);
                comps.push({ key: 'club_world_cup', crisis: crisis, ...roundResult(rounds, finalLost('club_world_cup', knockout(rng, rounds, continental + lift('club_world_cup'), won('club_world_cup'), true), rounds)) });
            } else {
                comps.push({ key: 'club_world_cup', res: 'Didn’t qualify', lv: -1 });
            }
        }

        // Your country's tournament that season (the game only gives the trophy to players it called up)
        const nation = [];
        const nat = state.player.nationality || {};
        // Club-national team conflict: choosing your club keeps you out of that stretch's tournament
        const period = PERIOD_SEASONS[state.mode] || 2;
        const kept = (Array.isArray(state.log) ? state.log : []).some(entry => entry && entry.type === 'career_event_selected' && entry.payload &&
            entry.payload.eventKey === 'club_national_team_conflict' && entry.payload.optionKey === 'comply' && entry.age <= season.age && season.age < entry.age + period);
        if (!season.nationality_fifa_code || season.nationality_fifa_code === nat.fifa_code) {
            for (const [key, first] of [['national_continental', 17], ['world_cup', 19]]) {
                if (!tournamentAt(Number(season.age), first)) continue;
                const known = world.tournaments[nat.fifa_code + ':' + season.age + ':' + key] ?? world.tournaments[season.age + ':' + key];
                const qualified = key === 'national_continental' || won(key) ||
                    (known !== undefined ? known : rng() < WC_QUALIFY[clamp(Number(nat.continental_reputation) || 0, 0, 6)]);
                if (!qualified) {
                    nation.push({ key: key, res: 'Didn’t qualify', lv: -1, confed: nat.confederation });
                    continue;
                }
                const need = CALLUP_OVR[clamp(Number(nat.international_reputation) || 0, 0, 5)];
                const called = won(key) || lost(key) || (!season.suspended && !kept && ovr >= need);
                const rounds = compRounds(key, own, tier, nat.confederation);
                const strength = key === 'world_cup' ? nat.fifa_reputation : nat.continental_reputation;
                nation.push({ key: key, called: called, need: need, suspended: !!season.suspended, kept: kept && !called, confed: nat.confederation,
                    ...roundResult(rounds, finalLost(key, knockout(rng, rounds, strength, called ? won(key) : null), rounds)) });
            }
        }
        addChampions(index, own, team, comps, nation, nat, state);
        // (rep, nrep: the club's and the country's reputations that season, for looking back)
        return { age: season.age, teamId: own, tier: tier, country: team.country, comps: comps, nation: nation, code: nat.fifa_code,
            bdo: ballonDorResult(state, index, comps, nation), rep: levelOf(own), nrep: Number(nat.international_reputation) || 0 };
    }
    // Seasons per decision in Copero's three modes
    const PERIOD_SEASONS = { long: 1, normal: 2, express: 3 };
    // How many levels a club in crisis plays below its name in the Living world's results
    const CRISIS_DROP = 2;
    // How many levels better the competition a club put first goes (Copero's club priority), and worse the other one
    const PRIORITY_LIFT = 1.5;
    // The option chosen at one of Copero's career events for the stretch a season belongs to (null: none that stretch)
    function stretchChoice(state, season, eventKey) {
        const period = PERIOD_SEASONS[state.mode] || 2;
        const entry = (Array.isArray(state.log) ? state.log : []).find(e => e && e.type === 'career_event_selected' && e.payload &&
            e.payload.eventKey === eventKey && e.age <= season.age && season.age < e.age + period);
        return entry ? entry.payload.optionKey : null;
    }
    // Chance that a competition goes to a fairy tale: a winner from just below the usual contenders
    const FAIRY_TALE = 0.05;
    /**
     * A winner: the contenders are the clubs (or countries) whose name is
     * within `band` of the best; each one's chance grows 3× per level of name
     * plus its era and form this season, so favourites rise and fall through a
     * career. Sometimes it's a fairy tale from the 2 levels below. Simulated
     * on the real lists (300 careers): the Champions League goes to Real Madrid
     * about 1 time in 4 on average, about 9 different clubs win it per career.
     */
    function pickByStrength(rng, list, strengthOf, band, index) {
        const best = Math.max(...list.map(strengthOf));
        const fairyTale = rng() < FAIRY_TALE;
        let field = list.filter(id => (fairyTale ? strengthOf(id) < best - band && strengthOf(id) >= best - band - 2 : strengthOf(id) >= best - band));
        if (!field.length) field = list.filter(id => strengthOf(id) >= best - band);
        const weights = field.map(id => Math.pow(3, strengthOf(id) + clubEra(id, index) + clubForm(id, index)));
        let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
        for (let i = 0; i < field.length; i++) {
            if ((roll -= weights[i]) < 0) return field[i];
        }
        return field[field.length - 1] || null;
    }
    // The Club World Cup favours European clubs, then South American ones (as the game's own odds do)
    const CLUB_WORLD_EDGE = { UEFA: 1, CONMEBOL: 0 };
    /**
     * Who won each cup and tournament (`champ`): your club or country when the
     * game gave you the trophy (or your country won without you), otherwise
     * another one picked by reputation, never yours. Its own random numbers,
     * so the rounds reached stay as they were.
     */
    function addChampions(index, own, team, comps, nation, nat, state) {
        const rng = seeded(world.seed + ':champions:' + index);
        const topClubs = (fits) => Object.keys(gameData.teams).filter(id => id !== own && gameData.teams[id].tier === 1 && fits(gameData.teams[id]));
        for (const comp of comps) {
            if (comp.key === 'league') continue;
            if (comp.res === 'Winner') {
                comp.champ = own;
                continue;
            }
            let list, strength;
            if (comp.key === 'cup') {
                // Every club of the country plays its cup; lower leagues rarely win it
                list = Object.keys(gameData.teams).filter(id => id !== own && gameData.teams[id].cupId === team.cupId && (NO_CUP[team.cupId] || []).indexOf(id) < 0);
                strength = (id) => repOf(id)[0] - (gameData.teams[id].tier - 1) * 1.5;
            } else if (comp.key === 'club_world_cup') {
                // Only the clubs that qualified
                const field = state ? cwcField(state, index) : null;
                list = topClubs(() => true).filter(id => !field || !field.size || field.has(id));
                strength = (id) => repOf(id)[1] + (CLUB_WORLD_EDGE[gameData.teams[id].confed] !== undefined ? CLUB_WORLD_EDGE[gameData.teams[id].confed] : -1);
            } else {
                // Continental cups (also when your club didn't qualify): the confederation's top-league clubs; the second cup
                // goes to the mid-sized ones (the biggest clubs play the first one)
                const secondary = comp.key === 'continental_secondary';
                list = topClubs(t => t.confed === team.confed);
                const midSized = list.filter(id => repOf(id)[1] <= 3);
                if (secondary && midSized.length) list = midSized;
                strength = (id) => repOf(id)[1];
            }
            // Cups have more upsets than the continental competitions
            comp.champ = list.length ? pickByStrength(rng, list, strength, comp.key === 'cup' ? 3 : 2, index) : null;
        }
        for (const item of nation) {
            if (item.res === 'Winner') {
                item.champ = nat.fifa_code;
                continue;
            }
            const worldCup = item.key === 'world_cup';
            const list = Object.keys(gameData.countries).filter(code => code !== nat.fifa_code && (worldCup || gameData.countries[code].confed === nat.confederation));
            item.champ = list.length ? pickByStrength(rng, list, code => (worldCup ? gameData.countries[code].fifa : gameData.countries[code].cont), 2, index) : null;
        }
    }

