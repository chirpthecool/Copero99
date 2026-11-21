    // ========================================================================
    // The Hall of Fame card: tiers, titles and traits
    // ========================================================================

    // What a season won, as [name, picture] pairs (the oldest entries have names only)
    function seasonWins(entry, season) {
        const keys = (season.trophies || []).concat(season.awards || []);
        return (season.won || []).map((name, i) => [name, keys[i] ? trophyImage(keys[i], season.teamId, season.tier, entry.confed) : null]);
    }
    // Icon card: a FIFA-style card for a finished career

    // Icons and Heroes are earned where it counts: a Ballon d'Or, a World Cup as a regular for the country (25+ caps), 3+ big
    // continental cups or 15+ trophies in strong leagues (an 83 with a handful of caps, a World Cup and a pile of MLS cups
    // used to get a Hero card)
    const isImpressive = (f) => f.bdo >= 1 || (f.worldCups >= 1 && f.regular) || f.bigCups >= 3 || f.majorTrophies >= 15;
    // Card finishes like FIFA's, best first: [label, test, card class]. A career that did little for its clubs but won
    // with its country (as a regular) gets a National Hero card in its flag
    const CARD_TIERS = [
        ['NATIONAL HERO', (f) => ((f.nationalTitles >= 1 && f.regular) || f.caps >= 80) && f.clubTrophies <= 3 && f.bigCups === 0 && f.bdo === 0, 'nation'],
        ['ICON', (f) => f.peak >= 91 && (f.bdo >= 1 || (f.worldCups >= 1 && f.regular) || f.bigCups >= 3 || f.majorTrophies >= 20), 'icon'],
        ['HERO', (f) => (isImpressive(f) && (f.peak >= 85 || f.bdo >= 1)) || f.peak >= 90, 'hero'],
        ['GOLD', (f) => f.peak >= 75, 'gold'],
        ['SILVER', (f) => f.peak >= 65, 'silver'],
        ['BRONZE', () => true, 'bronze']
    ];
    /**
     * Everything the card needs, worked out from a Hall of Fame entry. Works for
     * every entry version: newer entries have season keys, the oldest only totals.
     */
    function careerFacts(entry) {
        const count = (counts, ...keys) => keys.reduce((sum, key) => sum + (Number((counts || {})[key]) || 0), 0);
        const seasons = entry.seasonList || [];
        const keyCount = (key) => seasons.reduce((sum, s) => sum + (s.trophies || []).concat(s.awards || []).filter(k => k === key).length, 0);
        const hasKeys = seasons.some(s => Array.isArray(s.trophies));
        const facts = {
            peak: Number(entry.peak) || 0,
            apps: Number(entry.apps) || 0,
            goals: Number(entry.goals) || 0,
            assists: Number(entry.assists) || 0,
            trophies: Number(entry.trophyCount) || 0,
            caps: Number(entry.ntApps) || 0,
            bdo: hasKeys ? keyCount('ballon_dor') : count(entry.awards, "Ballon d'Or", 'ballon_dor'),
            boots: hasKeys ? keyCount('golden_boot') : count(entry.awards, 'Golden Boot', 'golden_boot'),
            worldCups: hasKeys ? keyCount('world_cup') : count(entry.trophies, 'World Cup', 'world_cup'),
            bigCups: hasKeys ? keyCount('continental_primary') : count(entry.trophies, 'continental_primary', 'Champions League', 'Copa Libertadores'),
            clubCount: entry.stints ? new Set(entry.stints.map(s => s.teamId)).size : (entry.clubs || []).length,
            retiredAt: Number(entry.retiredAt) || 0,
            longestStint: Math.max(0, ...(entry.stints || []).map(s => s.seasons)),
            countries: new Set((entry.stints || []).map(s => (gameData.teams[s.teamId] || {}).country).filter(Boolean)).size,
            teenPeak: Math.max(0, ...seasons.filter(s => s.age <= 19).map(s => Number(s.ovr) || 0)),
            peakAge: (seasons.slice().sort((a, b) => (Number(b.ovr) || 0) - (Number(a.ovr) || 0))[0] || {}).age || 0,
            trebles: seasons.filter(s => ['league', 'cup', 'continental_primary'].every(key => (s.trophies || []).indexOf(key) >= 0)).length,
            quadruple: seasons.some(s => (s.trophies || []).length >= 4),
            sweep:seasons.some(s => ['league', 'cup', 'continental_primary', 'club_world_cup'].every(key => (s.trophies || []).indexOf(key) >= 0)),
            nationalTitles: hasKeys ? keyCount('world_cup') + keyCount('national_continental') : count(entry.trophies, 'World Cup', 'world_cup'),
            continentalTitles: keyCount('national_continental'),
            clubWorldCups: keyCount('club_world_cup'),
            gloves: keyCount('golden_glove'),
            bdoAndBoot: seasons.some(s => ['ballon_dor', 'golden_boot'].every(key => (s.awards || []).indexOf(key) >= 0)),
            bestSeasonGoals: Math.max(0, ...seasons.map(s => Number(s.goals) || 0)),
            eliteSeasons: seasons.filter(s => (Number(s.ovr) || 0) >= 90).length,
            ntGoals: Number(entry.ntGoals) || 0,
            // Top-division titles in how many countries; a title with a small club; a promotion won
            titleCountries: new Set(seasons.filter(s => (Number(s.tier) || 1) === 1 && (s.trophies || []).indexOf('league') >= 0)
                .map(s => (gameData.teams[s.teamId] || {}).country).filter(Boolean)).size,
            giantKiller: seasons.some(s => (Number(s.tier) || 1) === 1 && (s.trophies || []).indexOf('league') >= 0 &&
                gameData.teams[s.teamId] && gameData.teams[s.teamId].rep[0] <= 2),
            promoted: seasons.some(s => s.up || ((Number(s.tier) || 1) > 1 && (s.trophies || []).indexOf('league') >= 0)),
            galactico: (entry.stints || []).some(s => gameData.teams[s.teamId] && gameData.teams[s.teamId].big),
            // Straight from a club to its rival (a spell somewhere else in between doesn't count)
            judas: (entry.stints || []).some((s, i, all) => i > 0 && RIVAL_PAIRS.has([all[i - 1].teamId, s.teamId].sort().join('|'))),
            leagues: keyCount('league'),
            pos: entry.position || '',
            homegrown: seasons.length >= 10 && !!entry.code && (entry.stints || []).length > 0 &&
                (entry.stints || []).every(s => (gameData.teams[s.teamId] || {}).country === entry.code)
        };
        facts.treble = facts.trebles >= 1;
        facts.clubTrophies = Math.max(0, facts.trophies - facts.nationalTitles);
        // A regular for the country (its titles count for the card), and the trophies won where they mean something: club
        // trophies in a strong league (one of Europe's top 22, or Argentina's or Brazil's top flight), Europe's and South
        // America's continental cups, the country's titles as a regular. Entries saved without season keys count them all
        facts.regular = facts.caps >= 25;
        const strongLeague = (team) => !!team && (BOOT_WEIGHTS[team.country] || team.country === 'ARG' || team.country === 'BRA');
        const major = (s, key) => {
            const team = gameData.teams[s.teamId];
            if (key === 'world_cup' || key === 'national_continental') return facts.regular;
            if (key === 'league' || key === 'cup') return (Number(s.tier) || 1) === 1 && strongLeague(team);
            return !!team && (team.confed === 'UEFA' || team.confed === 'CONMEBOL');
        };
        facts.majorTrophies = hasKeys ? seasons.reduce((sum, s) => sum + (s.trophies || []).filter(key => major(s, key)).length, 0) : facts.trophies;
        // Signature club: the one with the most seasons (the oldest entries only have the club list, so the last one)
        const bySeasons = {};
        for (const stint of entry.stints || []) bySeasons[stint.teamId] = (bySeasons[stint.teamId] || 0) + stint.seasons;
        facts.clubId = Object.keys(bySeasons).sort((a, b) => bySeasons[b] - bySeasons[a])[0] || (entry.clubs || []).slice(-1)[0];
        const team = gameData.teams[facts.clubId];
        facts.clubName = team ? team.name : prettyName(facts.clubId);
        facts.clubSeasons = bySeasons[facts.clubId] || 0;
        facts.clubColor = (team && team.color) || '#334155';
        facts.perGame = facts.apps ? facts.goals / facts.apps : 0;
        facts.assistsPerGame = facts.apps ? facts.assists / facts.apps : 0;
        return facts;
    }
    // The card's one-line title, the first that fits (best first): [title, test, what it means]. Some name the main club
    const CAREER_TITLES = [
        ["Ballon d'Or dynasty", (f) => f.bdo >= 5, "Won the Ballon d'Or 5 or more times"],
        ['Perfect 99', (f) => f.peak >= 99, 'Reached the perfect 99 OVR'],
        ['World champion', (f) => f.worldCups && f.bdo, "Won the World Cup and the Ballon d'Or"],
        ["Ballon d'Or winner", (f) => f.bdo, "Won the Ballon d'Or"],
        ['World Cup hero', (f) => f.worldCups, 'Won the World Cup with their country'],
        ['Continental royalty', (f) => f.bigCups >= 3, 'Won the big continental cup 3 or more times'],
        ['One-club legend', (f) => f.clubCount === 1 && f.clubSeasons >= 8, 'Spent a whole career of 8 or more seasons at one club'],
        ['Treble winner', (f) => f.treble, 'Won the league, the cup and the continental cup in one season'],
        ['Golden Boot machine', (f) => f.boots >= 3, 'Won the Golden Boot 3 or more times'],
        ['Record scorer', (f) => f.goals >= 500, 'Scored 500 or more goals'],
        ['Serial winner', (f) => f.trophies >= 15, 'Won 15 or more trophies'],
        [(f) => f.clubName + ' legend', (f) => f.clubSeasons >= 10, (f) => 'Spent ' + f.clubSeasons + ' seasons at ' + f.clubName],
        ['National hero', (f) => f.nationalTitles >= 1, 'Won a title with their country'],
        ['Safe hands', (f) => f.gloves >= 2, 'Won the Golden Glove 2 or more times'],
        ['Goal machine', (f) => f.perGame >= 0.6, 'Scored 0.6 or more goals a game'],
        ['Playmaker', (f) => f.apps && f.assists / f.apps >= 0.3, 'Set up 0.3 or more goals a game'],
        ['Trophy hunter', (f) => f.trophies >= 8, 'Won 8 or more trophies'],
        ['Giant killer', (f) => f.giantKiller, 'Won a top-flight title with a small club'],
        ['Teen sensation', (f) => f.teenPeak >= 80, 'Rated 80 or more as a teenager'],
        ['Big-club star', (f) => f.galactico && f.peak >= 85, 'Rated 85 or more and played for one of the biggest clubs in the world'],
        ['Late bloomer', (f) => f.peakAge >= 30, 'Hit their best at 30 or older'],
        ['Globetrotter', (f) => f.countries >= 4, 'Played in 4 or more countries'],
        // Many clubs and never at home anywhere (5 clubs with long spells, like 8 seasons at Everton, isn't one)
        ['Journeyman', (f) => f.clubCount >= 7 || (f.clubCount >= 5 && f.longestStint <= 3), 'Played for many clubs and never settled at one'],
        [(f) => f.clubName + ' cult hero', (f) => f.trophies === 0 && f.clubSeasons >= 6, (f) => 'Spent ' + f.clubSeasons + ' seasons at ' + f.clubName + ' without winning a trophy'],
        ['Iron man', (f) => f.apps >= 700, 'Played 700 or more games'],
        ['Evergreen', (f) => f.retiredAt >= 39, 'Kept playing until 39 or older'],
        ['Climber', (f) => f.promoted, 'Won promotion from a lower division'],
        ['Top-flight regular', (f) => f.peak >= 80, 'Rated 80 or more at their best'],
        [(f) => f.clubName + ' favourite', () => true, (f) => 'Played the most seasons at ' + f.clubName]
    ];
    // The card's title and what it means: [title, meaning]
    function careerTitle(f) {
        const [name, , meaning] = CAREER_TITLES.find(([, test]) => test(f));
        const read = (part) => (typeof part === 'function' ? part(f) : part);
        return [read(name), read(meaning)];
    }
    // Traits like PlayStyles+ on a FIFA card, rarest first: [name, test, what it means]. A card shows up to three;
    // the career view lists them all
    const TRAITS = [
        ['Perfect', (f) => f.peak >= 99, 'Reached 99 OVR'],
        ['Dynasty', (f) => f.bdo >= 3, "Won 3+ Ballon d'Ors"],
        ['Golden', (f) => f.bdo >= 1, "Won the Ballon d'Or"],
        ['World champion', (f) => f.worldCups >= 1, 'Won the World Cup'],
        ['Clean sweep', (f) => f.sweep, 'League, cup, continental cup and Club World Cup in one season'],
        ['Quadruple', (f) => f.quadruple, 'Won 4 or more trophies in one season'],
        ['Treble machine', (f) => f.trebles >= 2, 'Won the treble (league, cup and continental cup) in 2+ seasons'],
        ['Treble',(f) => f.treble, 'League, cup and continental cup in one season'],
        ['Thousand', (f) => f.goals >= 1000, 'Scored 1,000+ goals'],
        ['Unstoppable', (f) => f.bdoAndBoot, "Ballon d'Or and Golden Boot in the same season"],
        ['Big-game', (f) => f.bigCups >= 2, 'Won the big continental cup twice or more'],
        ['Conqueror', (f) => f.titleCountries >= 3, 'Won the league in 3+ countries'],
        ['Giant killer', (f) => f.giantKiller, 'Won a top-flight title with a small club'],
        ['Prodigy', (f) => f.teenPeak >= 80, 'Rated 80+ as a teenager'],
        ['Untouchable', (f) => f.eliteSeasons >= 10, 'Rated 90+ for 10+ seasons'],
        ['Judas', (f) => f.judas, 'Moved straight from a club to its fiercest rival'],
        // What the player was on the pitch (marked true: a card always shows one when it's earned)
        ['Fox in the box', (f) => f.pos === 'ST' && f.perGame >= 0.8, 'A striker who scored 0.8+ goals a game', true],
        ['Inside forward', (f) => (f.pos === 'LW' || f.pos === 'RW') && f.perGame >= 0.5, 'A winger who scored 0.5+ goals a game', true],
        ['Number 10', (f) => f.pos === 'CAM' && f.perGame >= 0.3 && f.assistsPerGame >= 0.3, 'A playmaker who scored and set up 0.3+ goals a game each', true],
        ['Wing wizard', (f) => ['LW', 'RW', 'LM', 'RM'].indexOf(f.pos) >= 0 && f.assistsPerGame >= 0.3, 'A wide player who set up 0.3+ goals a game', true],
        ['Box-to-box', (f) => f.pos === 'CM' && f.perGame >= 0.15 && f.assistsPerGame >= 0.15, 'A central midfielder who scored and set up 0.15+ goals a game each', true],
        ['Goal threat', (f) => ['CB', 'LB', 'RB', 'CDM'].indexOf(f.pos) >= 0 && f.perGame >= 0.12, 'A defender who scored 0.12+ goals a game', true],
        ['Overlapper', (f) => (f.pos === 'LB' || f.pos === 'RB') && f.assistsPerGame >= 0.15, 'A full-back who set up 0.15+ goals a game', true],
        ['Rock', (f) => f.pos === 'CB' && f.leagues >= 3, 'A centre-back behind 3+ league titles', true],
        ['Anchor', (f) => f.pos === 'CDM' && f.leagues >= 3, 'A holding midfielder behind 3+ league titles', true],
        ['Shot stopper', (f) => f.pos === 'GK' && f.leagues >= 3, 'A goalkeeper behind 3+ league titles', true],
        ['Continental king', (f) => f.continentalTitles >= 1, 'Won the continental title with their country'],
        ['Record breaker', (f) => f.bestSeasonGoals >= 60, 'Scored 60+ goals in one season'],
        ['Sharpshooter', (f) => f.boots >= 2, 'Won 2+ Golden Boots'],
        ['Wall', (f) => f.gloves >= 2, 'Won 2+ Golden Gloves'],
        ['Clinical', (f) => f.perGame >= 0.6, 'Scored in most games (0.6+ a game)'],
        ['Centurion', (f) => f.goals >= 300, 'Scored 300+ goals'],
        ['Maestro', (f) => f.assists >= 200, 'Set up 200+ goals'],
        ['Playmaker', (f) => f.apps && f.assists / f.apps >= 0.3, 'Set up goals for fun (0.3+ assists a game)'],
        ['Global star', (f) => f.ntGoals >= 50, 'Scored 50+ goals for their country'],
        ['Late bloomer', (f) => f.peakAge >= 30, 'Hit their best at 30 or older'],
        ['Serial winner', (f) => f.trophies >= 15, 'Won 15+ trophies'],
        ['World club champion', (f) => f.clubWorldCups >= 1, 'Won the Club World Cup'],
        ['Galáctico', (f) => f.galactico, 'Played for one of the biggest clubs in the world'],
        ['Loyal', (f) => f.clubCount === 1, 'Played for one club only'],
        ['Club legend', (f) => f.clubCount > 1 && f.longestStint >= 10, 'Spent 10+ seasons at one club'],
        ['Homegrown', (f) => f.homegrown, 'Never left their home country'],
        ['Patriot', (f) => f.caps >= 80, 'Played 80+ games for their country'],
        ['Climber', (f) => f.promoted, 'Won promotion from a lower division'],
        ['Globetrotter', (f) => f.countries >= 3 || (!f.countries && f.clubCount >= 4), 'Played in 3+ countries'],
        ['Iron man', (f) => f.apps >= 600, 'Played 600+ games'],
        ['Evergreen', (f) => f.retiredAt >= 38, 'Kept playing until 38 or older'],
        ['Journeyman', (f) => f.clubCount >= 6, 'Played for 6+ clubs']
    ];
    // How rare each trait is (the rest are Common): rarer ones get a look of their own and their rarity listed
    const TRAIT_RARITY = {
        legendary: ['Perfect', 'Dynasty', 'Thousand', 'Clean sweep', 'Quadruple', 'Treble machine', 'Untouchable'],
        epic: ['Golden', 'World champion', 'Treble', 'Unstoppable', 'Conqueror', 'Giant killer', 'Judas', 'Record breaker'],
        rare: ['Big-game', 'Prodigy', 'Fox in the box', 'Rock', 'Anchor', 'Shot stopper', 'Continental king', 'Sharpshooter', 'Wall', 'Centurion', 'Maestro',
            'Global star', 'Late bloomer', 'World club champion', 'Homegrown']
    };
    const RARITIES = [['legendary', 'Legendary'], ['epic', 'Epic'], ['rare', 'Rare'], ['common', 'Common']];
    const traitRarity = (name) => Object.keys(TRAIT_RARITY).find(key => TRAIT_RARITY[key].indexOf(name) >= 0) || 'common';
    const rarityName = (name) => RARITIES.find(([key]) => key === traitRarity(name))[1];
    const careerTraits = (f, all) => {
        const earned = TRAITS.filter(([, test]) => test(f));
        if (all) return earned;
        // A card shows the three rarest, but always one for the player's position when there is one
        const card = earned.slice(0, 3);
        const position = earned.find(trait => trait[3]);
        if (position && card.indexOf(position) < 0) card[2] = position;
        return card;
    };
    function buildIconCard(entry) {
        const f = careerFacts(entry);
        const [tierLabel, , tierClass] = CARD_TIERS.find(([, test]) => test(f));
        const card = el('div', 'icard ' + tierClass);
        card.style.setProperty('--club', f.clubColor);
        // National Hero: the card is the player's flag
        const nationFlag = entry.flag || gameData.flags[entry.code] || gameData.flags[entry.country];
        if (tierClass === 'nation' && nationFlag) card.style.setProperty('--flag', 'url(' + JSON.stringify(nationFlag) + ')');

        const crestSrc = clubLogo(f.clubId, tierClass === 'hero' || tierClass === 'nation');
        const watermark = tierClass === 'nation' ? null : picture(crestSrc, '');
        if (watermark) {
            watermark.className = 'icard-mark';
            card.appendChild(watermark);
        }

        // Where a FIFA card has the player's picture: Copero's shirt with the name and number (the country's on a National
        // Hero card, else the signature club's)
        const team = gameData.teams[f.clubId];
        // A spotlight behind the shirt
        card.appendChild(el('div', 'icard-spot'));
        card.appendChild(kitSvg(tierClass === 'nation' ? gameData.kits[entry.code] : team && { primary_color: team.color }, entry.name, entry.number));

        const side = el('div', 'icard-side');
        side.appendChild(el('div', 'icard-rating', String(f.peak)));
        side.appendChild(el('div', 'icard-pos', entry.position || '—'));
        const flag = picture(entry.flag || gameData.flags[entry.code] || gameData.flags[entry.country], entry.country);
        if (flag) {
            flag.className = 'icard-flag';
            side.appendChild(flag);
        }
        const crest = picture(crestSrc, f.clubName);
        if (crest) {
            crest.className = 'icard-crest';
            side.appendChild(crest);
        }
        card.appendChild(side);

        card.appendChild(el('div', 'icard-tier', tierLabel));
        card.appendChild(el('div', 'icard-name', entry.name));
        const [title, meaning] = careerTitle(f);
        const titleLine = el('div', 'icard-title', title);
        titleLine.title = meaning;
        card.appendChild(titleLine);
        const traits = careerTraits(f);
        if (traits.length) {
            const row = el('div', 'icard-traits c99-group');
            for (const [name, , meaning] of traits) {
                const chip = el('span', traitRarity(name), name + '+');
                chip.title = rarityName(name) + ' trait\n' + meaning;
                row.appendChild(chip);
            }
            card.appendChild(row);
        }

        // Left column in words, right column as pictures: trophies (the 🏆 Copero's trophy case uses), Ballon d'Ors, caps for the country
        const stats = el('div', 'icard-stats c99-group');
        const trophyIcon = el('span', 'icard-icon', '🏆');
        const flagSrc = entry.flag || gameData.flags[entry.code] || gameData.flags[entry.country];
        const capsFlag = picture(flagSrc, entry.country);
        if (capsFlag) capsFlag.className = 'icard-flag-mini';
        for (const [label, value, tip] of [['APP', f.apps], [trophyIcon, f.trophies, 'Trophies'], ['GLS', f.goals],
            [picture(FIXED_TROPHY_IMAGES.ballon_dor, "Ballon d'Or") || "Ballon d'Or", f.bdo, "Ballon d'Ors"], ['AST', f.assists],
            [capsFlag || 'CAPS', f.caps, 'Games for ' + (entry.country || 'the national team')]]) {
            const stat = el('div');
            if (tip) stat.title = tip;
            stat.appendChild(el('b', '', String(value)));
            const name = el('span');
            name.append(label);
            stat.appendChild(name);
            stats.appendChild(stat);
        }
        card.appendChild(stats);

        return card;
    }
    // The biggest trophies and awards a career won, best first, one picture each: [name, picture]
    const TROPHY_RANK = ['world_cup', 'ballon_dor', 'continental_primary', 'national_continental', 'club_world_cup', 'league', 'continental_secondary', 'golden_boot', 'golden_glove', 'cup'];
    function bestTrophies(entry) {
        const found = new Map();
        for (const season of entry.seasonList || []) {
            const keys = (season.trophies || []).concat(season.awards || []);
            seasonWins(entry, season).forEach(([name, img], i) => {
                if (img && !found.has(img)) found.set(img, [name, img, TROPHY_RANK.indexOf(keys[i])]);
            });
        }
        return [...found.values()].sort((a, b) => (a[2] < 0 ? 99 : a[2]) - (b[2] < 0 ? 99 : b[2])).map(([name, img]) => [name, img]);
    }

