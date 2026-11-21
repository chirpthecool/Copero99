    // ========================================================================
    // Which of Copero's trophies stay: continental cups, league runs, promotion, bans
    // ========================================================================

    // How often Copero's big continental cup (the Champions League) stays won, by the club's continental strength that
    // season (0-5, with the lift a star player gives). Copero gives a strength-5 club 30% a season and every strength-4
    // club 20% (up to 48% and 32% with a star), so Real Madrid and the six strength-4 clubs together "won" it about twice a
    // season. Kept this often, a strength-5 club wins it about 13% of seasons, a strength-4 one 6%, a strength-3 one 4%
    // (a star still makes a club likelier to win it), so a career wins as many as real greats do: sim6b.js, 1500 a level,
    // The Chosen One 2.1 (5+ in 8% of careers; it was 3.6 and 30%), Generational 1.8, Wonderkid 1.3, Talented 1.0.
    // Twenty-first round (Chirp: that made it unrealistically hard; good careers rarer but more rewarding): 0.4 / 0.5 /
    // 0.65 (were 0.25 / 0.3 / 0.45): sim6b.js, 1000 a level, The Chosen One 3.0 a career (5+ in 18%), Generational 2.7, Wonderkid 2.1,
    // Talented 1.6, Steady pro 1.0, Hard worker 0.7
    const CONTINENTAL_KEEP = [1, 1, 1, 0.4, 0.5, 0.65];
    // Copero's club priority for the stretch moves that: the big cup put first stays more often, the league put first less
    const PRIORITY_KEEP = { prioritize_continental: 1.5, prioritize_league: 0.6 };
    // A trophy one of Copero's events decided for the decision's seasons (scoring the penalty in the final, playing it injured)
    // (`any`: also one the event cost you)
    function eventForced(state, season, key, any) {
        const period = PERIOD_SEASONS[state.mode] || 2;
        return (Array.isArray(state.log) ? state.log : []).some(entry => entry && entry.type === 'career_event_selected' && entry.payload &&
            (any || entry.payload.outcomeKind === 'positive') && (entry.payload.targetTrophy === key || entry.payload.targetClubTrophy === key) &&
            entry.age <= season.age && season.age < entry.age + period);
    }
    /**
     * Boost and Sandbox: a continental cup is only won by a club that played
     * it. Copero rolls the title from the club's continental name alone, so a
     * club 17th in its league could win the Champions League the next season;
     * the Living world's own qualification (continentalEntry: last season's
     * title or league place) now decides, and a title from a cup the club
     * didn't play is taken back. Never one an event decided.
     */
    function keepQualified(state, index) {
        const season = state.seasons[index];
        const team = season && gameData.teams[season.teamId];
        if (!team || !Array.isArray(season.trophies) || Number(season.competitionTier) > 1 || gameData.status !== 'ready' || !world || world.seed !== String(state.seed)) return;
        for (const key of ['continental_primary', 'continental_secondary']) {
            if (season.trophies.indexOf(key) < 0 || eventForced(state, season, key)) continue;
            // The season before's table, worked out now as the Living world would, so both read the same one
            if (index > 0 && world.results[index - 1] === undefined) world.results[index - 1] = seasonResult(state, index - 1) || false;
            if (continentalEntry(state, index, season.teamId, team) !== key) takeTrophy(state, season, key);
        }
    }
    /**
     * The Club World Cup the real way (Chirp; FIFA's 32-club cup since
     * 2025): every 4 years, as in Copero, but only for clubs that qualify:
     * each confederation's slots (CWC_SLOTS) go first to its continental
     * champions of the last 4 seasons, then down a 4-season ranking
     * (continental name ×2, the club's era, your club's own runs in the big
     * cup), at most 2 clubs a country. Copero gives it to any top-flight
     * club of UEFA, CONMEBOL or CONCACAF by its continental name alone.
     */
    const CWC_SLOTS = { UEFA: 12, CONMEBOL: 6, CONCACAF: 4, AFC: 4, CAF: 4, OFC: 1 };
    const CWC_RUN = 0.75;
    function cwcField(state, index) {
        const field = new Set();
        if (gameData.status !== 'ready' || !world || world.seed !== String(state.seed)) return field;
        const champs = new Set();
        const runs = {};
        for (let i = Math.max(0, index - 3); i <= index; i++) {
            const season = state.seasons[i];
            if (season && Array.isArray(season.trophies) && season.trophies.indexOf('continental_primary') >= 0) champs.add(season.teamId);
            const result = world.results[i];
            if (!result) continue;
            for (const comp of result.comps) {
                if (comp.key !== 'continental_primary') continue;
                if (comp.champ) champs.add(comp.champ);
                if (i < index && comp.lv > 0) runs[result.teamId] = (runs[result.teamId] || 0) + comp.lv * CWC_RUN;
            }
        }
        const teams = gameData.teams;
        const top = Object.keys(teams).filter(id => teams[id].tier === 1 && CWC_SLOTS[teams[id].confed]);
        const coef = {};
        for (const id of top) coef[id] = repOf(id)[1] * 2 + clubEra(id, index) + (runs[id] || 0);
        for (const confed of Object.keys(CWC_SLOTS)) {
            const clubs = top.filter(id => teams[id].confed === confed);
            const countries = {};
            let taken = 0;
            const add = (id) => {
                field.add(id);
                taken++;
                countries[teams[id].country] = (countries[teams[id].country] || 0) + 1;
            };
            clubs.filter(id => champs.has(id)).forEach(add);
            for (const id of clubs.filter(id => !field.has(id)).sort((a, b) => (coef[b] - coef[a]) || (a < b ? -1 : 1))) {
                if (taken >= CWC_SLOTS[confed]) break;
                if ((countries[teams[id].country] || 0) < 2) add(id);
            }
        }
        return field;
    }
    // A Club World Cup won by a club that didn't qualify is taken back (Boost and Sandbox; never one an event decided)
    function keepClubWorldCup(state, index) {
        const season = state.seasons[index];
        if (!season || !Array.isArray(season.trophies) || season.trophies.indexOf('club_world_cup') < 0 || eventForced(state, season, 'club_world_cup')) return;
        if (!world || world.seed !== String(state.seed) || gameData.status !== 'ready') return;
        if (!cwcField(state, index).has(season.teamId)) takeTrophy(state, season, 'club_world_cup');
    }
    // A suspended season wins you nothing (Chirp): Copero still hands a banned player his club's trophies, so they
    // are taken back (the season, its log entry, the totals, the celebration) and kept in `c99Banned`, so the Living world
    // shows the club winning them without you. Boost and Sandbox, once per season
    function banTrophies(state, index) {
        const season = state.seasons[index];
        if (!season || !season.suspended || !Array.isArray(season.trophies) || Array.isArray(season.c99Banned)) return;
        season.c99Banned = season.trophies.filter(key => NATIONAL_TROPHIES.indexOf(key) < 0);
        season.c99Banned.forEach(key => takeTrophy(state, season, key));
    }
    // Europe's second cup for a big club that only made its places (Chirp): Copero gives it by the club's continental
    // strength ([0, 4, 12, 2, 0, 0]% a season), so a strength-4 or -5 club in the Europa League never won it, where real big
    // clubs there often do (Man United 2017, Chelsea 2013 and 2019, Atlético three times). The chance a season by that
    // strength (with a star's lift); only when the club really played it (continentalEntry). Boost and Sandbox, never one an
    // event decided or in a club crisis
    const SECONDARY_WIN = [0, 0, 0, 0.35, 0.45, 0.55];
    const EL_NEXT = 0.25; // keepContinental: the big cup kept a quarter as often the season after winning the second one
    function secondaryCup(state, index) {
        const season = state.seasons[index];
        const team = season && gameData.teams[season.teamId];
        if (!team || season.suspended || season.relegated || !Array.isArray(season.trophies) || Number(season.competitionTier) > 1 ||
            gameData.status !== 'ready' || !world || world.seed !== String(state.seed) || !(gameData.continental[team.confed] || {}).continental_secondary) return;
        if (season.trophies.indexOf('continental_secondary') >= 0 || eventForced(state, season, 'continental_secondary', true) ||
            stretchChoice(state, season, 'club_crisis') === 'stay_and_fight') return;
        const chance = SECONDARY_WIN[clubStrength(season.teamId, Number(season.overall) || 0)[1]] || 0;
        if (!chance || seeded(String(state.seed) + ':secondary:' + index)() >= chance) return;
        if (index > 0 && world.results[index - 1] === undefined) world.results[index - 1] = seasonResult(state, index - 1) || false;
        if (continentalEntry(state, index, season.teamId, team) === 'continental_secondary') giveTrophy(state, season, 'continental_secondary');
    }
    // A final lost at one of Copero's events (the decisive penalty missed, the trophy missed by playing at the peak): the
    // trophy `key` in the stretch's first season
    function eventLost(state, season, key) {
        return (Array.isArray(state.log) ? state.log : []).some(entry => entry && entry.type === 'career_event_selected' && entry.payload &&
            entry.payload.outcomeKind === 'negative' && (entry.payload.targetTrophy === key || entry.payload.targetClubTrophy === key) &&
            Number(entry.age) === Number(season.age));
    }
    /**
     * Boost and Sandbox: the big continental cup is won as often as the real
     * one (CONTINENTAL_KEEP). A title Copero gave beyond that is taken back
     * from the season (the game's season log shares the list), the totals and
     * the celebration it's about to show; the Living world then shows how far
     * the club got and who won it. Repeatable per season.
     */
    function keepContinental(state, index) {
        const season = state.seasons[index];
        const at = Array.isArray(season.trophies) ? season.trophies.indexOf('continental_primary') : -1;
        // A superteam (the 6th level) keeps every one
        if (at < 0 || eventForced(state, season, 'continental_primary') || superteam(state, season.teamId)[1]) return;
        const strength = clubStrength(season.teamId, Number(season.overall) || 0)[1];
        const priority = PRIORITY_KEEP[stretchChoice(state, season, 'club_priority')] || 1;
        // Into the big cup through last season's second cup (Copero's own rule), not the league: such a club is no favourite
        // (no Europa League winner has won the next Champions League), but Copero rolls it by the club's name alone
        const before = state.seasons[index - 1];
        const won = before && before.teamId === season.teamId && Array.isArray(before.trophies) ? before.trophies : [];
        const viaSecondary = won.indexOf('continental_secondary') >= 0 && won.indexOf('league') < 0 && won.indexOf('continental_primary') < 0 ? EL_NEXT : 1;
        if (seeded(String(state.seed) + ':continental:' + index)() < CONTINENTAL_KEEP[strength] * priority * viaSecondary) return;
        takeTrophy(state, season, 'continental_primary');
    }
    /**
     * Real promotion and relegation rules per country (Chirp: 2nd place should go up, as in the
     * Championship and LaLiga 2): how many go up straight away (`up`), the play-off places one more goes up through
     * (`playoff`), how many go down straight away (`down`) and a relegation play-off place just above them (`downPlayoff`).
     */
    const LEAGUE_RULES = {
        default: { up: 2, playoff: [3, 6], down: 3 },
        ITA: { up: 2, playoff: [3, 8], down: 3 },
        FRA: { up: 2, playoff: [3, 5], down: 2, downPlayoff: true },
        GER: { up: 2, playoff: [3, 3], down: 2, downPlayoff: true },
        POR: { up: 2, playoff: [3, 3], down: 2, downPlayoff: true },
        NED: { up: 1, playoff: [2, 9], down: 2, downPlayoff: true },
        SCO: { up: 1, playoff: [2, 4], down: 1, downPlayoff: true },
        ARG: { up: 1, playoff: [2, 8], down: 2 },
        BRA: { up: 4, playoff: null, down: 4 }
    };
    const leagueRule = (country) => LEAGUE_RULES[country] || LEAGUE_RULES.default;
    // How Copero's promotions are shared out: about as in the Championship (the champions, the other automatic places,
    // the play-off winners)
    const PROMOTION_WAYS = { champion: 0.4, auto: 0.35, playoff: 0.25 };
    /**
     * Boost and Sandbox: Copero decides whether you go up (its "league"
     * trophy below the top flight); the script tells it the real way, once a
     * season (season.c99Up = { how, pos }): the title, another automatic place
     * or the play-offs. Only champions keep the trophy, and every promotion is
     * celebrated with the promoted arrow instead of the second division's
     * trophy (Vanilla keeps Copero's).
     */
    function realPromotion(state, index) {
        const season = state.seasons[index];
        const team = season && gameData.teams[season.teamId];
        const tier = Number(season && season.competitionTier) || (team && team.tier) || 1;
        if (!team || tier < 2 || season.c99Up || !Array.isArray(season.trophies) || season.trophies.indexOf('league') < 0) return;
        const rule = leagueRule(team.country);
        const size = leagueClubs(state, team.country, tier, season.teamId).length || 20;
        const rng = seeded(String(state.seed) + ':promotion:' + index);
        const ways = { champion: PROMOTION_WAYS.champion, auto: rule.up > 1 ? PROMOTION_WAYS.auto : 0, playoff: rule.playoff ? PROMOTION_WAYS.playoff : 0 };
        let roll = rng() * (ways.champion + ways.auto + ways.playoff);
        const how = (roll -= ways.champion) < 0 ? 'champion' : (roll -= ways.auto) < 0 ? 'auto' : 'playoff';
        // (the play-offs: the higher places more often)
        const pos = how === 'champion' ? 1 : how === 'auto' ? 2 + Math.floor(rng() * (rule.up - 1))
            : rule.playoff[0] + Math.floor(Math.pow(rng(), 1.4) * (rule.playoff[1] - rule.playoff[0] + 1));
        season.c99Up = { how: how, pos: Math.min(pos, size) };
        changed = true;
        if (how !== 'champion') takeTrophy(state, season, 'league');
        celebratePromotion(state, season);
    }
    // Copero's relegation arrow, pointing up and green (CSS: c99-promoted), in its own words
    const promotedWord = () => ({ Descenso: 'Ascenso', Rebaixamento: 'Acesso' }[((careerMessages || {}).career || {}).relegation] || 'Promoted');
    const isRelegationShown = (list) => list.some(item => item && item.kind === 'relegation' && !item.c99Up);
    // The celebration Copero is about to show: the second division's trophy goes, the promoted arrow comes before the
    // season's other trophies (Copero draws a `relegation` item as its arrow; a relegation's celebration is left alone)
    function celebratePromotion(state, season) {
        const list = Array.isArray(celebration) ? celebration : null;
        if (!list || isRelegationShown(list) || list.some(item => item && item.c99Up && item.seasonId === season.id)) return;
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            if (item && item.seasonId === season.id && item.kind === 'trophy' && String(item.id).indexOf('-trophy-league-') >= 0) list.splice(i, 1);
        }
        const order = (item) => state.seasons.findIndex(s => s.id === item.seasonId);
        const own = state.seasons.indexOf(season);
        let at = list.findIndex(item => item && order(item) >= own);
        if (at < 0) at = list.length;
        list.splice(at, 0, { id: season.id + '-c99-promoted', seasonId: season.id, kind: 'relegation', c99Up: true, title: promotedWord(), assetUrl: '' });
        changed = true;
    }
    // A trophy Copero gave taken back: from the season (the game's season log shares the list), the totals and the
    // celebration it's about to show
    function takeTrophy(state, season, key) {
        season.trophies.splice(season.trophies.indexOf(key), 1);
        if (state.totals && Number.isFinite(state.totals.trophies)) state.totals.trophies--;
        const list = Array.isArray(celebration) ? celebration : [];
        const shown = list.findIndex(item => item && item.seasonId === season.id && item.kind === 'trophy' && String(item.id).indexOf('-trophy-' + key + '-') >= 0);
        if (shown >= 0) list.splice(shown, 1);
        changed = true;
    }
    // A league title after a run of them at the same club: Copero gives a top club with a star close to 100% a season (and
    // each title used to lift the club's name, which raised those odds again), so one club could win a dozen in a row.
    // The first `free` in a row stay; then each next one is `drop` less sure, never below `floor`: about 1 run in 8
    // reaches 6, 1 in 1000 reaches 10
    const LEAGUE_KEEP = { free: 2, drop: 0.15, floor: 0.3 };
    // League titles in a row at this season's club just before it (top flight only: below it Copero's league trophy is promotion)
    function leagueStreak(state, index) {
        const seasons = state.seasons;
        let n = 0;
        for (let i = index - 1; i >= 0; i--) {
            const s = seasons[i];
            if (s.teamId !== seasons[index].teamId || Number(s.competitionTier) > 1 || !Array.isArray(s.trophies) || s.trophies.indexOf('league') < 0) break;
            n++;
        }
        return n;
    }
    // Boost and Sandbox: a league title beyond LEAGUE_KEEP is taken back (never one an event decided); the Living world then
    // shows who won it instead. Repeatable per season
    // A club far behind its league's strongest club seldom wins it, whoever plays for it (Chirp: eight
    // Scottish titles with Hearts and St Johnstone; Copero gives a title by the club's own league standing, lifted for a
    // star, a talisman, a coach and the Living world, never asking who else is in the league): a title Copero gave a club
    // `gap` levels below the strongest other club of its league stays UNDERDOG[gap] of the time (a star 10+ above the
    // club's level closes one level)
    const UNDERDOG = [1, 0.6, 0.3, 0.12, 0.05, 0.02];
    function underdogKeep(state, season) {
        const team = gameData.teams[season.teamId];
        if (!team) return 1;
        const others = leagueClubs(state, team.country, 1, season.teamId).filter(id => id !== season.teamId);
        if (!others.length) return 1;
        const best = Math.max(...others.map(id => levelOf(id)[0]));
        const star = (Number(season.overall) || 0) - clubLevel(season.teamId) >= 10 ? 1 : 0;
        return UNDERDOG[clamp(best - levelOf(season.teamId)[0] - star, 0, UNDERDOG.length - 1)];
    }
    function keepLeague(state, index) {
        const season = state.seasons[index];
        if (!Array.isArray(season.trophies) || season.trophies.indexOf('league') < 0 || Number(season.competitionTier) > 1 || eventForced(state, season, 'league')) return;
        if (seeded(String(state.seed) + ':league-underdog:' + index)() >= underdogKeep(state, season)) return takeTrophy(state, season, 'league');
        const streak = leagueStreak(state, index);
        // A superteam (the 6th level at home) gets two more in a row for free, a club that put the league first one more
        const free = LEAGUE_KEEP.free + (superteam(state, season.teamId)[0] ? 2 : 0) + (stretchChoice(state, season, 'club_priority') === 'prioritize_league' ? 1 : 0);
        if (streak < free) return;
        const keep = Math.max(LEAGUE_KEEP.floor, 1 - LEAGUE_KEEP.drop * (streak - free + 1));
        if (seeded(String(state.seed) + ':league-keep:' + index)() >= keep) takeTrophy(state, season, 'league');
    }
    // The 6th level of this career's club reputations (none before the Living world has this career)
    const superteam = (state, id) => (world && world.seed === String(state.seed) ? eliteOf(id) : [false, false, false]);
    // A superteam's extra titles (Boost and Sandbox): a top-flight league title Copero didn't give comes `league` of the
    // time with the 6th level at home, the big continental cup `continental` with it in Europe (never one an event
    // decided, nor in a club crisis Copero plays out). Its own numbers, repeatable per season
    const ELITE_TITLES = { league: 0.4, continental: 0.15 };
    function eliteTitles(state, index) {
        const season = state.seasons[index];
        if (!Array.isArray(season.trophies) || season.relegated || season.suspended || Number(season.competitionTier) > 1 || gameData.status !== 'ready' ||
            stretchChoice(state, season, 'club_crisis') === 'stay_and_fight') return;
        const [home, away] = superteam(state, season.teamId);
        const rng = seeded(String(state.seed) + ':elite-titles:' + index);
        const odds = [rng(), rng()];
        for (const [on, key, chance, roll] of [[home, 'league', ELITE_TITLES.league, odds[0]], [away, 'continental_primary', ELITE_TITLES.continental, odds[1]]]) {
            if (on && roll < chance && season.trophies.indexOf(key) < 0 && !eventForced(state, season, key, true)) giveTrophy(state, season, key);
        }
    }
    // A trophy given (a superteam's): into the season (the game's season log shares the list), the totals and the celebration
    // it's about to show (after the season's other trophies; a relegation's celebration is left alone)
    function giveTrophy(state, season, key) {
        season.trophies.push(key);
        if (state.totals && Number.isFinite(state.totals.trophies)) state.totals.trophies++;
        const list = Array.isArray(celebration) ? celebration : null;
        if (list && !isRelegationShown(list) && state.seasons.indexOf(season) >= stats.seasonsSeen) {
            const order = (item) => state.seasons.findIndex(s => s.id === item.seasonId);
            const own = state.seasons.indexOf(season);
            let at = list.findIndex(item => item && (order(item) > own || (item.seasonId === season.id && item.kind === 'award')));
            if (at < 0) at = list.length;
            const confed = (state.player.nationality || {}).confederation;
            list.splice(at, 0, { id: season.id + '-trophy-' + key + '-c99', seasonId: season.id, kind: 'trophy',
                title: trophyName(key, season.teamId, Number(season.competitionTier) || 1, confed), assetUrl: trophyImage(key, season.teamId, Number(season.competitionTier) || 1, confed) });
        }
        changed = true;
    }
    /**
     * The game works out the trophies and awards it celebrates when you click,
     * before the script has seen the season, so a Ballon d'Or given or taken
     * is changed in that list too (the celebration shows a moment later).
     * Relegations replace the whole celebration, so they are left alone.
     */
    function celebrateAward(state, season, key, add) {
        const list = celebration;
        if (!Array.isArray(list) || isRelegationShown(list)) return;
        const mine = (item) => item && item.seasonId === season.id && item.kind === 'award' && String(item.id).indexOf('-award-' + key) >= 0;
        if (!add) {
            for (let i = list.length - 1; i >= 0; i--) if (mine(list[i])) list.splice(i, 1);
            return;
        }
        if (list.some(mine)) return;
        // The game lists each season's trophies, then its awards, season by season
        const order = (item) => state.seasons.findIndex(s => s.id === item.seasonId);
        const own = state.seasons.indexOf(season);
        let at = list.findIndex(item => item && (order(item) > own || (item.seasonId === season.id && item.kind === 'award')));
        if (at < 0) at = list.length;
        list.splice(at, 0, { id: season.id + '-award-' + key + '-c99', seasonId: season.id, title: TROPHY_NAMES[key], assetUrl: FIXED_TROPHY_IMAGES[key], kind: 'award' });
    }

