    // ========================================================================
    // Squad roles (Copero's own rules), role traits and club fit
    // ========================================================================

    // Squad roles, the way Copero picks them every season: your OVR against the club's level (set by its world name), so a
    // player 9 below a big club's level sits on the bench. Copero never shows it; the club cards do (roleChip).

    // The OVR a club of each world name plays at (Copero's Ma)
    const CLUB_LEVEL = { [-1]: 52, 0: 58, 1: 68, 2: 75, 3: 80, 4: 84, 5: 88 };
    // Copero's roles, lowest first, and the games each one brings before the club's factor (its tl)
    const ROLES = ['substitute', 'low_rotation', 'high_rotation', 'starter'];
    const KEEPER_ROLES = ['third_keeper', 'substitute', 'starter'];
    const ROLE_GAMES = { starter: [40, 50], high_rotation: [25, 39], low_rotation: [15, 24], substitute: [5, 14] };
    const KEEPER_GAMES = { starter: [42, 50], substitute: [2, 12], third_keeper: [0, 4] };
    const clubLevel = (id) => CLUB_LEVEL[clamp(repOf(id)[2], -1, 5)];
    // Copero's role for a gap between your OVR and the club's level (its Uo), moved `shift` steps up or down (its la)
    function squadRole(gap, keeper, shift) {
        const role = keeper ? (gap >= 0 ? 'starter' : gap >= -6 ? 'substitute' : 'third_keeper')
            : gap >= 0 ? 'starter' : gap >= -4 ? 'high_rotation' : gap >= -8 ? 'low_rotation' : 'substitute';
        const list = keeper ? KEEPER_ROLES : ROLES;
        return list[clamp(list.indexOf(role) + (shift || 0), 0, list.length - 1)];
    }
    // A role's games at a club, [fewest, most]: Copero's range times the club's factor (its rl: fewer games in small leagues)
    function roleGames(role, keeper, id) {
        const [domestic, continental] = repOf(id);
        const factor = domestic === 0 ? 0.7 : domestic === 1 ? 0.8 : continental === 0 ? 0.9 : 1;
        return (keeper ? KEEPER_GAMES : ROLE_GAMES)[role].map(n => Math.round(n * factor)).concat(factor);
    }
    // How a stint at a club works out (Boost): a club that suits you lifts your OVR a little in each of your first `seasons`
    // there, one that doesn't drags it down: [OVR a season, chance]; Quick adapter never has a bad fit
    // OVR lost at a club that didn't suit you comes back at one that does: `regain` a season at a club that suits you /
    // a neutral one, until it's back. Only the loss of a bad stint's first `scar` seasons can come back: staying longer
    // than that at a club where you weren't clicking damaged your development for good
    const CLUB_FIT = { seasons: 4, rolls: [[0.6, 0.2], [0, 0.6], [-0.7, 0.2]], regain: [0.7, 0.35], scar: 2 };
    // Season `index`'s stint: { fit (its roll), streak (seasons there before this one) }, or null (banned, or a club outside
    // the club list)
    function stintFit(state, index) {
        const season = state.seasons[index];
        if (!season || season.suspended || !gameData.teams[season.teamId]) return null;
        const streak = clubStreak(state.seasons, index, season.teamId);
        const fit = weightedPick(CLUB_FIT.rolls, ([, chance]) => chance, seeded(String(state.seed) + ':fit:' + season.teamId + ':' + (index - streak)))[0];
        return { fit: fit < 0 && hasPerk('quickAdapter') ? 0 : fit, streak: streak };
    }
    // The fit of season `index`'s stint (0 from its 5th season at the club, while banned, or a neutral stint)
    function clubFit(state, index) {
        const stint = stintFit(state, index);
        return stint && stint.streak < CLUB_FIT.seasons ? stint.fit : 0;
    }
    // OVR won back in season `index` at a club that suits you (or a neutral one) after a stint that didn't
    function fitRegain(state, index) {
        let owed = 0;
        for (let j = 0; j <= index; j++) {
            const stint = stintFit(state, j);
            if (!stint) continue;
            const gain = stint.fit < 0 ? 0 : Math.min(owed, CLUB_FIT.regain[stint.fit > 0 ? 0 : 1]);
            if (j === index) return gain;
            owed -= gain;
            if (stint.fit < 0 && stint.streak < CLUB_FIT.scar) owed -= stint.fit;
        }
        return 0;
    }
    // Seasons in a row at a club right before season `index` (0: the season is the first there)
    function clubStreak(seasons, index, teamId) {
        let streak = 0;
        while (streak < index && seasons[index - 1 - streak] && seasons[index - 1 - streak].teamId === teamId) streak++;
        return streak;
    }
    /**
     * Role traits a Boost roll can bring: how coaches treat you, one step up
     * or down the squad (from Copero's role for your OVR at that club) in your
     * first season at every new club, or from your third season in a row at
     * one. About 1 roll in 3 has one.
     */
    const ROLE_TRAITS = {
        impact: { icon: '⚡', name: 'Instant impact', settled: false, step: 1, chance: 0.1, help: 'One step higher in the squad in your first season at every new club.' },
        leader: { icon: '🗝️', name: 'Dressing-room leader', settled: true, step: 1, chance: 0.1, help: 'One step higher in the squad from your third season in a row at a club.' },
        slow: { icon: '🐢', name: 'Slow to settle', settled: false, step: -1, chance: 0.06, help: 'One step lower in the squad in your first season at every new club.' },
        comfort: { icon: '🛋️', name: 'Comfort zone', settled: true, step: -1, chance: 0.06, help: 'One step lower in the squad from your third season in a row at a club.' }
    };
    // The role trait's step at a club after `streak` seasons in a row there (0 = a new club)
    function roleTraitStep(streak) {
        const trait = ROLE_TRAITS[activeTraits().boostRole];
        return !trait ? 0 : (trait.settled ? streak >= 2 : streak === 0) ? trait.step : 0;
    }
    /**
     * Boost's role trait on the seasons not looked at yet: a season Copero
     * played at your own role (your OVR against the club's level) is played a
     * step higher or lower: that role's games, at the same place in its range,
     * with the goals, assists, clean sheets and goals conceded that go with
     * them (setGames). A season an event set the role of (an injury, the
     * superteam's rotation…) has games outside that range and is left alone.
     * Runs before every other change to the season's games.
     */
    function applyRoleTrait(state) {
        if (!ROLE_TRAITS[activeTraits().boostRole] || gameData.status !== 'ready') return;
        const seasons = state.seasons;
        for (let i = Math.max(0, stats.seasonsSeen); i < seasons.length; i++) {
            const season = seasons[i];
            const s = season && season.stats;
            if (!s || season.suspended || !(Number(s.appearances) > 0) || !gameData.teams[season.teamId]) continue;
            stepRole(state, season, roleTraitStep(clubStreak(seasons, i, season.teamId)));
        }
    }
    // Plays a season Copero played at your own role `step` squad steps up or down: the same place in the new role's range
    // as Copero's roll had in the old one. A season an event set the role of (games outside that range) is left alone
    function stepRole(state, season, step) {
        const s = season.stats;
        const keeper = playerRole(state.player) === 'goalkeeper';
        const gap = (Number(season.overall) || 0) - clubLevel(season.teamId);
        const own = squadRole(gap, keeper, 0);
        const moved = squadRole(gap, keeper, step);
        const [lo, hi, factor] = roleGames(own, keeper, season.teamId);
        if (moved === own || s.appearances < lo || s.appearances > hi) return;
        const [from, to] = (keeper ? KEEPER_GAMES : ROLE_GAMES)[own];
        const [a, b] = (keeper ? KEEPER_GAMES : ROLE_GAMES)[moved];
        const [min, max] = roleGames(moved, keeper, season.teamId);
        const t = clamp((s.appearances / factor - from) / Math.max(1, to - from), 0, 1);
        const apps = clamp(Math.round((a + t * (b - a)) * factor), min, max);
        if (apps !== s.appearances) setGames(state, s, apps);
    }
    const isKeeper = (state) => !!state.player && playerRole(state.player) === 'goalkeeper';

