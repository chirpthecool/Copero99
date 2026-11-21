    // ========================================================================
    // Line-ups, star players and who wins the awards
    // ========================================================================

    // Club line-ups for the award winners the Living world names: [weight, slots]. A club plays one for a few seasons at a
    // time and its stars stand in its slots, so two strikers of one club only win things when it plays two up front
    const FORMATIONS = [
        [30, ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW']], // 4-3-3
        [28, ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'LW', 'CAM', 'RW', 'ST']], // 4-2-3-1
        [16, ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']], // 4-4-2
        [12, ['GK', 'CB', 'CB', 'CB', 'LM', 'CDM', 'CM', 'RM', 'CAM', 'ST', 'ST']], // 3-5-2
        [14, ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'ST', 'ST']] // diamond
    ];
    // Seasons a club keeps its line-up and its stars (starting at a different season per club, like the eras)
    const SQUAD_SPELL = 4;
    const spellOf = (state, id, index) => Math.floor((Number(index) + hashText(String(state.seed) + ':spell:' + id) % SQUAD_SPELL) / SQUAD_SPELL);
    const slotPos = (slot) => String(slot).replace(/\d+$/, '');
    // How far above a club's level makes you its star player, per club and squad spell: a squad with another big name in it
    // asks more of you, a thin one less (it used to be 10 everywhere, always)
    const STAR_BARS = [[7, 0.15], [9, 0.25], [10, 0.3], [12, 0.2], [14, 0.1]];
    function starBar(state, id, index) {
        let pick = seeded(String(state.seed) + ':star-bar:' + id + ':' + spellOf(state, id, index))();
        return (STAR_BARS.find(([, chance]) => (pick -= chance) < 0) || [10])[0];
    }
    // A star stands out in his league too (Chirp: a 67 at Coventry, a small Premier League club, was its
    // "Star player"): at least this OVR in a top flight by its pull (LEAGUE_PULL: the big five 80, the next ones 75), 72 in
    // a big five's second tier
    const STAR_FLOOR = { 2: 80, 1.5: 75 };
    function starFloor(state, id) {
        const team = gameData.teams[id];
        if (!team) return 0;
        const tier = Number((state.teamTierOverrides || {})[id]) || team.tier;
        const pull = LEAGUE_PULL[team.country] || 1;
        return tier === 1 ? STAR_FLOOR[pull] || 0 : tier === 2 && pull === 2 ? 72 : 0;
    }
    const ROLE_RANK = { attacker: 3, creator: 2, support: 1, defensive: 0, goalkeeper: 0 };
    // A club's line-up in a season; your club's always has your position while you play there
    function clubFormation(state, id, index) {
        const season = state.seasons[index] || {};
        const mine = id === season.teamId ? state.player.position : null;
        const list = FORMATIONS.filter(([, slots]) => !mine || slots.indexOf(mine) >= 0);
        return weightedPick(list.length ? list : FORMATIONS, ([weight]) => weight, seeded(String(state.seed) + ':formation:' + id + ':' + spellOf(state, id, index)))[1];
    }
    /**
     * The slot an award winner plays in at a club (its position, with a number
     * for a second one: ST2), from the club's line-up, weighted by `weights`
     * per position. Never your slot when you were a regular there; with
     * `beaten` (the Ballon d'Or) a teammate who beats you also never plays
     * further back than you (a CM doesn't beat the club's regular CAM).
     */
    function starSlot(state, id, index, weights, rng, beaten) {
        const season = state.seasons[index] || {};
        const slots = [];
        for (const pos of clubFormation(state, id, index)) {
            const n = slots.filter(slot => slotPos(slot) === pos).length;
            slots.push(n ? pos + (n + 1) : pos);
        }
        const mine = id === season.teamId && (Number((season.stats || {}).appearances) || 0) >= 20 ? state.player.position : null;
        const open = slots.filter(slot => weights[slotPos(slot)] > 0 && slot !== mine);
        const ahead = open.filter(slot => !beaten || !mine || ROLE_RANK[ROLE_OF[slotPos(slot)]] >= ROLE_RANK[ROLE_OF[mine]]);
        return weightedPick(ahead.length ? ahead : open.length ? open : slots, slot => weights[slotPos(slot)] || 0, rng);
    }
    // How often the world's best players come from each country (roughly where the real Ballon d'Or's top 30 have come
    // from); every other country with a flag STAR_OTHER
    const STAR_NATIONS = {
        BRA: 16, FRA: 15, ARG: 12, ESP: 11, ENG: 10, POR: 8, GER: 8, NED: 6, ITA: 5, BEL: 4, CRO: 3, URU: 3,
        NOR: 2, POL: 2, DEN: 1.5, COL: 1.5, SEN: 1.5, NGA: 1.5, MAR: 1.5, EGY: 1.5, CIV: 1, GHA: 1, CMR: 1, ALG: 1,
        SRB: 1, SUI: 1, SWE: 1, AUT: 1, TUR: 1, GEO: 1, KOR: 1, JPN: 1, MEX: 1, USA: 1, CAN: 1, UKR: 1, ECU: 1,
        CHI: 0.5, SCO: 0.5, WAL: 0.5, CZE: 0.5, SVN: 0.5, SVK: 0.5, HUN: 0.5, GRE: 0.5, RUS: 0.5, PAR: 0.5, GUI: 0.5,
        MLI: 0.5, TUN: 0.5, KOS: 0.3, ALB: 0.3, BIH: 0.3, MNE: 0.3, IRL: 0.3, VEN: 0.3, PER: 0.3, AUS: 0.3, IRN: 0.3,
        GAB: 0.3, BFA: 0.3, COD: 0.3, NIR: 0.2, ISL: 0.2, FIN: 0.2, CRC: 0.2, KSA: 0.2, JAM: 0.2, ROU: 0.2, BUL: 0.2
    };
    // ...by the country's world name (Copero's international_reputation, 0-5): about 130 tiny nations at 0 together used to
    // give 1 award winner in 30, now about 1 in 600
    const STAR_OTHER = 0.03;
    const STAR_OTHER_BY_NAME = [0.05, 0.3, 1, 1.5, 2, 2];
    const starWeight = (code) => STAR_NATIONS[code] || STAR_OTHER * STAR_OTHER_BY_NAME[clamp(Number((gameData.countries[code] || {}).intl) || 0, 0, 5)];
    function ballonDorResult(state, index, comps, nation) {
        const season = state.seasons[index];
        const has = (key) => Array.isArray(season.awards) && season.awards.indexOf(key) >= 0;
        // Boost and Sandbox: the vote decides (the award follows it); Vanilla: Copero's own award
        const vote = ballonDorVote(state, index, comps ? Object.assign(comps.slice(), { nation: nation || [] }) : null);
        if (currentMode() ? !!(vote && vote.won) : has('ballon_dor')) return { place: 1, champ: season.teamId };
        // Out of the running (a goalkeeper, under 10 games, suspended or far off): there's still a winner, the best of the
        // season's stars (in Vanilla a vote "win" without Copero's award is a 2nd)
        const place = vote && vote.place ? Math.max(2, vote.place) : 0;
        const winner = vote && vote.winner;
        return { place: place, champ: winner ? winner.club : null, pos: winner ? winner.pos : null, slot: winner ? winner.slot : null, nation: winner ? winner.nation : null };
    }
    /**
     * The season's Golden Boot and Golden Glove for the Living world, every
     * season: { boot: { won, champ, pos, goals, place, league, points },
     * glove: { won, champ } }. The Golden Boot is the season's race (bootRace;
     * in Vanilla Copero decides yours by goals); keepers get the Golden Glove.
     * This names who won otherwise, the same every time it's shown (seeded,
     * from the clubs' names in the game file).
     */
    function awardRaces(state, index) {
        const season = state.seasons[index];
        const has = (key) => Array.isArray(season.awards) && season.awards.indexOf(key) >= 0;
        const role = playerRole(state.player);
        const rng = seeded(String(state.seed) + ':awards:' + index);
        // Your club only when someone else there could have won it (a teammate)
        const keepers = Object.keys(gameData.teams).filter(id => (role !== 'goalkeeper' || id !== season.teamId) && gameData.teams[id].tier === 1 && gameData.teams[id].rep[2] >= 4);
        const keeper = weightedPick(keepers, id => Math.pow(3, gameData.teams[id].rep[1] + gameData.teams[id].rep[2]), rng) || null;
        // Europe's top scorer always has more points than you when it wasn't you (in Vanilla, Copero's goal lines decide yours)
        const race = bootRace(state, index);
        const goals = race.mine !== null && race.champ && race.mine >= race.points ? Math.floor(race.mine / bootWeight(race.champ)) + 1 : race.goals;
        // Your place in the race, when you were in it: one place for every 4 points (2 goals in a top league) short
        const place = race.mine === null ? 0 : 2 + Math.max(0, Math.floor((goals * bootWeight(race.champ) - race.mine - 2) / 4));
        const you = { league: race.league, points: race.mine };
        // The best keeper's clean sheets (real winners keep about 18-30 in a season), always more than yours when you're a keeper
        // who didn't win it. Its own numbers, so the winner's club stays what it was
        const sheetRng = seeded(String(state.seed) + ':glove-sheets:' + index);
        const mySheets = role === 'goalkeeper' && !season.suspended ? Number((season.stats || {}).cleanSheets) || 0 : 0;
        const sheets = Math.max(Math.round(clamp(24 + 3.5 * gauss(sheetRng), 17, 32)), mySheets + 1 + Math.floor(sheetRng() * 3));
        return {
            boot: has('golden_boot') ? { won: true, ...you } : { champ: race.champ, pos: race.pos, slot: race.slot, goals: goals, place: place <= 10 ? place : 0, ...you },
            glove: has('golden_glove') ? { won: true } : { champ: keeper, sheets: sheets }
        };
    }
    /**
     * An award winner's nationality: the player in that club's slot this
     * spell (the same star for every award and every season of the spell), by
     * where the world's best come from (STAR_NATIONS: Brazil, France,
     * Argentina, Spain, England, Portugal and Germany about 6 in 10), twice as
     * often from the club's own country. Its own seeded numbers, so the
     * winner's club and position stay what they were.
     */
    function winnerNation(state, index, clubId, slot) {
        const home = (gameData.teams[clubId] || {}).country;
        const codes = Object.keys(gameData.countries).filter(code => gameData.flags[code]);
        if (!codes.length) return null;
        const rng = seeded(String(state.seed) + ':star:' + clubId + ':' + slot + ':' + spellOf(state, clubId, index));
        return weightedPick(codes, code => starWeight(code) * (code === home ? 2 : 1), rng);
    }

