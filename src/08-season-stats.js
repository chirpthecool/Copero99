    // ========================================================================
    // A season's games, goals and assists: real rates, real fixtures, playing traits
    // ========================================================================

    // Copero's most games in a season (a starter plays 40-50)
    const MAX_SEASON_APPS = 50;
    /**
     * A club's matches in a season (Chirp: why do games
     * stop at 50?): real regulars play 80-95% of their club's matches, and a
     * big club with long cup runs plays 55-65 a season, a small one in a
     * short league 35-40. The league (two rounds of its clubs, the real
     * number where the league plays another: Scotland's split, MLS), a
     * promotion play-off, a game a cup round, the continental cup's league
     * phase or groups and two legs a knockout round (one final), the Club
     * World Cup's three group games and a game a round: as far as the Living
     * world says the club got. { league, all } or null.
     */
    const LEAGUE_GAMES = { SCO: 38, USA: 34, MEX: 34, ARG: 27 };
    const ROUND_GAMES = { UEFA: [8, 2, 2, 2, 2, 1], other: [6, 2, 2, 2, 1], club_world_cup: [3, 1, 1, 1, 1] };
    const leagueGames = (country, tier, size) => (tier === 1 && LEAGUE_GAMES[country]) || clamp(2 * (size - 1), 26, 46);
    function clubMatches(state, index, result) {
        const season = state.seasons[index];
        const team = season && gameData.teams[season.teamId];
        if (!team || !result || !Array.isArray(result.comps)) return null;
        const tier = Number(season.competitionTier) || team.tier;
        let league = 0, all = 0;
        for (const comp of result.comps) {
            if (comp.lv === -1) continue;
            if (comp.key === 'league') {
                league = leagueGames(team.country, tier, (comp.table || []).length || 20) + (comp.up === 'playoff' || comp.up === 'missed' ? 2 : 0);
                all += league;
                continue;
            }
            const rounds = compRounds(comp.key, season.teamId, tier);
            const reached = comp.res === 'Winner' || comp.res === 'Runner-up' ? rounds.length - 1 : rounds.indexOf(comp.res);
            if (reached < 0) continue;
            const games = comp.key === 'cup' ? rounds.map(() => 1) : ROUND_GAMES[comp.key === 'club_world_cup' ? 'club_world_cup' : team.confed === 'UEFA' ? 'UEFA' : 'other'];
            all += games.slice(0, reached + 1).reduce((sum, n) => sum + n, 0);
        }
        return league ? { league: league, all: all } : null;
    }
    // Copero's games for a club (its rl): fewer in small leagues, as a share of its 50
    const gamesFactor = (domestic, continental) => (domestic === 0 ? 0.7 : domestic === 1 ? 0.8 : continental === 0 ? 0.9 : 1);
    // Boost and Sandbox: a season's games become that share of the club's real matches (goals, assists, clean sheets and
    // goals conceded follow, the totals too). Copero's own games stay on the season (c99Apps), and every rule that reads
    // the games (roles, form, releases, the Ballon d'Or's bench) still reads Copero's. Once per season
    function applyRealGames(state, index) {
        const season = state.seasons[index];
        const s = season && season.stats;
        if (!s || season.c99Matches || season.suspended || !(Number(s.appearances) > 0) || gameData.status !== 'ready' || !world || world.seed !== String(state.seed)) return;
        if (world.results[index] === undefined) world.results[index] = seasonResult(state, index) || false;
        const matches = clubMatches(state, index, world.results[index]);
        if (!matches) return;
        season.c99Matches = matches.all;
        season.c99League = matches.league;
        const [domestic, continental] = repOf(season.teamId);
        const lift = (Array.isArray(season.c99Carry) ? season.c99Carry : [0, 0]).map((n, i) => n + (Array.isArray(season.c99Coach) ? season.c99Coach[i] : 0));
        const share = s.appearances / (MAX_SEASON_APPS * gamesFactor(clamp(domestic + lift[0], 0, 5), continental + lift[1]));
        const apps = clamp(Math.round(share * matches.all), 1, matches.all);
        if (apps !== s.appearances) setGames(state, s, apps);
    }
    // A club's usual matches in a season (for the role chip): its league, a few cup games, a continental campaign for a
    // club that usually plays one
    const usualMemo = new Map();
    function usualMatches(id) {
        const team = gameData.teams[id];
        if (!team) return MAX_SEASON_APPS;
        const continental = repOf(id)[1];
        const key = id + ':' + continental;
        if (!usualMemo.has(key)) {
            const size = Object.keys(gameData.teams).filter(other => gameData.teams[other].country === team.country && gameData.teams[other].tier === team.tier).length;
            usualMemo.set(key, leagueGames(team.country, team.tier, size) + 3 + (team.tier === 1 ? (continental >= 3 ? 11 : continental >= 1 ? 4 : 0) : 0));
        }
        return usualMemo.get(key);
    }
    /**
     * Boost's playing traits on the seasons not looked at yet: games first,
     * then goals and assists (they follow the games, as in Copero's own
     * numbers, and then their own trait), also in the career totals. Runs
     * before the boost reads how the season went, the Golden Boot race and the Ballon d'Or vote.
     */
    function applyStatTraits(state) {
        const t = activeTraits();
        if (!statTraits(t).length) return;
        for (let i = Math.max(0, stats.seasonsSeen); i < state.seasons.length; i++) {
            const season = state.seasons[i];
            const s = season && season.stats;
            if (!s || !(Number(s.appearances) > 0)) continue;
            const more = Math.round(s.appearances * (1 + t.boostApps / 100));
            const apps = t.boostApps > 0 ? Math.max(s.appearances, Math.min(MAX_SEASON_APPS * 1.1, more)) : more;
            setGames(state, s, apps, playerRole(state.player) === 'goalkeeper'
                ? { cleanSheets: 1 + t.boostGoals / 100, goalsConceded: 1 - t.boostAssists / 100 }
                : { goals: 1 + t.boostGoals / 100, assists: 1 + t.boostAssists / 100 });
        }
    }
    /**
     * Sets a season's games (s: its stats, with games already in it): goals,
     * assists, clean sheets and goals conceded follow them (Copero works them
     * out per game), each times its own multiplier in `more`, and the career
     * totals change by the same amounts.
     */
    function setGames(state, s, apps, more) {
        const before = { ...s };
        s.appearances = apps;
        for (const key of ['goals', 'assists', 'cleanSheets', 'goalsConceded']) {
            if (Number.isFinite(s[key])) s[key] = Math.max(0, Math.round(s[key] * apps / before.appearances * ((more && more[key]) || 1)));
        }
        if (state.totals) {
            for (const key of Object.keys(before)) {
                if (Number.isFinite(state.totals[key]) && Number.isFinite(s[key])) state.totals[key] += s[key] - before[key];
            }
        }
        changed = true;
    }
    // Copero's goals and assists a game (its il / ll) by player role and by the gap to the club's level (its nl bands: 10+,
    // 6-9, 3-5, -2..2, -5..-3, -9..-6, lower), times the club's home strength (sl) and the OVR (Qt), then ±10%
    const GOAL_RATES = { attacker: [1.1, 0.85, 0.65, 0.5, 0.3, 0.15, 0.05], creator: [0.85, 0.6, 0.45, 0.3, 0.2, 0.1, 0.05],
        support: [0.15, 0.1, 0.08, 0.05, 0.02, 0, 0], defensive: [0.1, 0.08, 0.06, 0.04, 0.02, 0, 0] };
    const ASSIST_RATES = { attacker: [0.4, 0.3, 0.2, 0.15, 0.1, 0.08, 0.05], creator: [0.6, 0.45, 0.35, 0.25, 0.15, 0.08, 0.05],
        support: [0.35, 0.25, 0.18, 0.12, 0.07, 0.03, 0.02], defensive: [0.1, 0.07, 0.05, 0.03, 0.01, 0, 0] };
    const HOME_SCORING = [0.55, 0.75, 0.95, 1, 1.1, 1.2];
    const gapBand = (gap) => (gap >= 10 ? 0 : gap >= 6 ? 1 : gap >= 3 ? 2 : gap >= -2 ? 3 : gap >= -5 ? 4 : gap >= -9 ? 5 : 6);
    const ovrScoring = (ovr) => {
        const o = clamp(ovr, 40, 99);
        return o <= 65 ? 0.6 : o <= 80 ? 0.6 + (o - 65) / 15 * 0.25 : o <= 85 ? 0.85 + (o - 80) / 5 * 0.15 : o <= 95 ? 1 + (o - 85) / 10 * 0.1 : 1.1;
    };
    // Goalkeepers: goals conceded a game by the club's home strength, times one for the gap to its level (Copero's cl)
    const KEEPER_CONCEDED = [1.4, 1.3, 1.1, 0.9, 0.7, 0.5];
    const keeperGapFactor = (gap) => (gap >= 10 ? 0.5 : gap >= 6 ? 0.75 : gap >= 3 ? 0.9 : gap >= -2 ? 1 : gap >= -5 ? 1.1 : gap >= -9 ? 1.2 : 1.35);
    /**
     * The seasons just played, as Copero gave them, before the script changes
     * their numbers: its own games (the release rules read them, so a playing
     * trait never costs you a club) and the season's form (formOf).
     */
    function recordSeasons(state) {
        if (gameData.status !== 'ready') return;
        const role = playerRole(state.player);
        for (let i = Math.max(0, stats.seasonsSeen); i < state.seasons.length; i++) {
            const season = state.seasons[i];
            if (!season || season.c99Form !== undefined) continue;
            const lift = carry.seed === String(state.seed) ? carry.lift[season.teamId] : null;
            const coach = carry.seed === String(state.seed) && carry.coach ? carry.coach[season.teamId] : null;
            season.c99Apps = Number((season.stats || {}).appearances) || 0;
            season.c99Form = formOf(season, role, lift && coach ? lift.map((n, i) => n + coach[i]) : lift || coach);
            if (lift) season.c99Carry = lift;
            if (coach) season.c99Coach = coach;
        }
    }
    // A season's games as Copero gave them (before the role and playing traits or a ban's fallout changed them)
    const coperoGames = (season) => Number(season.c99Apps ?? (season.stats && season.stats.appearances)) || 0;
    /**
     * Real careers (Boost and Sandbox): Copero's goals and assists a game run
     * far past what real players manage (an attacker 10+ above his club's level
     * scores 1.1 a game before the club and the OVR lift it, so a 92 at a
     * mid-table club scored 50+ a season and 800+ in a career). A season's rate
     * stays Copero's up to `knee` and grows a lot slower past it, so the best
     * season Copero can give comes out at `top`, about the best real seasons in
     * that position (a striker's 0.95 goals a game like Lewandowski or Haaland,
     * a winger's 0.7 like Salah, a playmaker's 0.45 assists like De Bruyne):
     * [goals knee, goals top, assists knee, assists top].
     */
    const REAL_RATES = { ST: [0.55, 0.95, 0.2, 0.27], LW: [0.45, 0.72, 0.25, 0.38], RW: [0.45, 0.72, 0.25, 0.38], CAM: [0.3, 0.48, 0.3, 0.46],
        LM: [0.25, 0.38, 0.3, 0.42], RM: [0.25, 0.38, 0.3, 0.42], CM: [0.12, 0.18, 0.2, 0.3], LB: [0.05, 0.08, 0.15, 0.27], RB: [0.05, 0.08, 0.15, 0.27],
        CDM: [0.06, 0.09, 0.08, 0.11], CB: [0.06, 0.09, 0.04, 0.06] };
    // Copero's best rate a game for a role (10+ above the level, ×1.2 at the strongest clubs, ×1.1 at 95+)
    const coperoTop = (role, assists) => (assists ? ASSIST_RATES : GOAL_RATES)[role][0] * 1.32;
    // Copero's rate → the real one, and back (the Ballon d'Or vote is tuned on Copero's)
    const realRate = (rate, knee, top, best) => (rate <= knee ? rate : knee + (rate - knee) * (top - knee) / (best - knee));
    const coperoRate = (rate, knee, top, best) => (rate <= knee ? rate : knee + (rate - knee) * (best - knee) / (top - knee));
    // The seasons not looked at yet get real-life goals and assists a game (also in the totals); marked, so the vote knows
    function applyRealism(state) {
        const rates = REAL_RATES[state.player.position];
        const role = playerRole(state.player);
        if (!rates || !GOAL_RATES[role]) return;
        for (let i = Math.max(0, stats.seasonsSeen); i < state.seasons.length; i++) {
            const season = state.seasons[i];
            const s = season && season.stats;
            if (!s || season.c99Real || !(Number(s.appearances) > 0)) continue;
            season.c99Real = true;
            [['goals', 0], ['assists', 2]].forEach(([key, at]) => {
                if (!Number.isFinite(s[key])) return;
                const real = Math.round(realRate(s[key] / s.appearances, rates[at], rates[at + 1], coperoTop(role, at === 2)) * s.appearances);
                if (state.totals && Number.isFinite(state.totals[key])) state.totals[key] += real - s[key];
                s[key] = real;
            });
            changed = true;
        }
    }

