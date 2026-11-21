    // ========================================================================
    // The Golden Boot by league points
    // ========================================================================

    // Golden Boot, the real-life way (Europe's Golden Shoe): league goals × the league's weight, by UEFA's ranking of its
    // countries (×2 the five strongest, ×1.5 6th-22nd, ×1 the rest; top flights only), so 30 Premier League goals (60
    // points) beat 38 in Scotland (57). Copero gives it for 30 / 40 / 50 goals in any European league (25 / 50 / 100%).

    const BOOT_WEIGHTS = { ENG: 2, ITA: 2, ESP: 2, GER: 2, FRA: 2, NED: 1.5, POR: 1.5, BEL: 1.5, TUR: 1.5, CZE: 1.5, GRE: 1.5, NOR: 1.5, POL: 1.5,
        DEN: 1.5, AUT: 1.5, SUI: 1.5, SCO: 1.5, SWE: 1.5, ISR: 1.5, CYP: 1.5, CRO: 1.5, HUN: 1.5 };
    // Copero's goals are every competition's; about three in four come in the league (real top scorers: 70-85%)
    const LEAGUE_GOAL_SHARE = 0.75;
    // The season's top scorer: points (real winners: about 70, from 62 to 82 most years) and where it plays (mostly a striker)
    const BOOT_RIVAL = [70, 7];
    const BOOT_POSITIONS = { ST: 76, RW: 10, LW: 9, CAM: 5 };
    // A club's weight in the race in a league tier (0 = not in it: outside Europe or below the top flight)
    function bootWeight(teamId, tier) {
        const team = gameData.teams[teamId];
        return team && team.confed === 'UEFA' && (tier || team.tier) === 1 ? BOOT_WEIGHTS[team.country] || 1 : 0;
    }
    /**
     * One season's race: Europe's top scorer { champ, pos, goals, points }
     * (the same on every look, whatever you scored) and your league goals and
     * points (`mine` null when you weren't in it: a goalkeeper, suspended,
     * outside Europe or below the top flight).
     */
    function bootRace(state, index) {
        const season = state.seasons[index];
        const role = playerRole(state.player);
        const rng = seeded(String(state.seed) + ':golden-boot:' + index);
        // Your club only when someone else there could have won it (a teammate). The big clubs of the strongest leagues most
        // often (about 9 in 10 from the five ×2 leagues; Real Madrid and PSG about 1 in 5 each)
        const clubs = Object.keys(gameData.teams).filter(id => bootWeight(id) && (id !== season.teamId || (role !== 'attacker' && role !== 'creator')));
        const champ = weightedPick(clubs, id => Math.pow(2, gameData.teams[id].rep[0] + gameData.teams[id].rep[1]) * Math.pow(bootWeight(id), 4), rng) || null;
        const goals = champ ? Math.round(clamp(BOOT_RIVAL[0] + BOOT_RIVAL[1] * gauss(rng), 52, 96) / bootWeight(champ)) : 0;
        // A slot in the club's line-up (Ballon d'Or and Golden Boot winners of one club and slot are the same player)
        const slot = champ ? starSlot(state, champ, index, BOOT_POSITIONS, rng) : 'ST';
        // (the league's share of the season's real matches, once they're known: applyRealGames)
        const league = Math.round((Number((season.stats || {}).goals) || 0) * (season.c99Matches ? season.c99League / season.c99Matches : LEAGUE_GOAL_SHARE));
        const weight = role === 'goalkeeper' || season.suspended ? 0 : bootWeight(season.teamId, Number(season.competitionTier) || 0);
        return { champ: champ, pos: slotPos(slot), slot: slot, goals: goals, points: champ ? goals * bootWeight(champ) : 0, league: league, mine: weight ? league * weight : null };
    }
    /**
     * Boost and Sandbox: the Golden Boot goes to the most points in the
     * season's race (with the goals a playing trait added or took), not by
     * Copero's goal lines; also in the totals and in the celebration it is
     * about to show. Until the club list is read, Copero's own award stays.
     */
    function applyGoldenBoot(state, index) {
        const season = state.seasons[index];
        if (gameData.status !== 'ready') return;
        const race = bootRace(state, index);
        const win = race.mine !== null && race.mine >= race.points;
        const has = season.awards.indexOf('golden_boot') >= 0;
        if (win === has) return;
        if (win) season.awards.push('golden_boot');
        else season.awards.splice(season.awards.indexOf('golden_boot'), 1);
        if (state.totals && Number.isFinite(state.totals.awards)) state.totals.awards += win ? 1 : -1;
        celebrateAward(state, season, 'golden_boot', win);
        changed = true;
    }

