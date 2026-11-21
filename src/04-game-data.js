    // ========================================================================
    // Copero's game file: clubs, leagues, cups, countries, trophy pictures and crests
    // ========================================================================

    // GAME DATA (club, league and cup names read from the game's own file)

    // teams: id -> { name, league, country, tier, confed, cupId, logo, color }
    // leagues / leagueImages: "ESP:1" -> "LaLiga" / trophy picture; cups / cupImages: cup id -> name / picture
    // continental: "UEFA" -> { continental_primary, continental_secondary, national, images: { same keys -> picture } }
    // flags: fifa code or English country name -> flag picture; countries: fifa code -> { name, confed, cont, fifa, intl } (reputations)
    const gameData = { status: 'idle', teams: {}, leagues: {}, leagueImages: {}, cups: {}, cupImages: {}, continental: {}, flags: {}, countries: {}, kits: {} };
    // Copero's German clubs (4 Nov 2026) have made-up names; these keep Copero's nickname but add the real club's
    // prefix, so it's easier to tell who is who. id -> [Copero's name, ours] (also the short name Copero's cards show)
    const GERMAN_NAMES = {
        'bayern-munchen': ['FC Minga', 'FC München'],
        'bayer-leverkusen': ['Wiesdorf FC', 'Bayer Wiesdorf'],
        'borussia-dortmund': ['Tremonia', 'Borussia Tremonia'],
        'rb-leipzig': ['Sachsen SC', 'RB Sachsen'],
        'vfb-stuttgart': ['SC Schwaben', 'VfB Schwaben'],
        '1-fc-koln': ['Agrippina FC', '1. FC Agrippina'],
        'union-berlin': ['Spree SV', 'Union Spree'],
        '1899-hoffenheim': ['FC Kraichgau', 'TSG Kraichgau'],
        'borussia-monchengladbach': ['Niederrhein FC', 'Borussia Niederrhein'],
        'eintracht-frankfurt': ['SC Hessen', 'Eintracht Hessen'],
        'fc-augsburg': ['Wertach FC', 'FC Wertach'],
        'fsv-mainz-05': ['SV Aurea', 'FSV Aurea 05'],
        'sc-freiburg': ['FC Dreisam', 'SC Dreisam'],
        'werder-bremen': ['Roland FC', 'Werder Roland'],
        'fc-schalke-04': ['Berger FC', 'FC Berger 04'],
        'hamburger-sv': ['Elbe SV', 'Hamburger Elbe SV'],
        'sc-paderborn-07': ['Liborius FC', 'SC Liborius 07'],
        'sv-elversberg': ['Saarland FC', 'SV Saarland']
    };
    // Renames one of Copero's club objects in place (the game file's and the page's own), only while it still has
    // Copero's made-up name, so a later rename by Copero itself wins
    let clubsRenamed = false;
    function renameClub(team) {
        const names = GERMAN_NAMES[team.id];
        if (names && team.name === names[0]) {
            team.name = names[1];
            team.short_name = names[1];
            clubsRenamed = true;
        }
        return team;
    }
    /**
     * Reads the names out of the career simulator's code file (already
     * downloaded by the page, so this comes from the browser cache). If Copero
     * changes the file and this stops matching, everything falls back to
     * generic names ("League", "Cup") instead of breaking.
     */
    function parseGameData(text) {
        // Leagues with their clubs: the JSON.parse(`[...]`) block whose items have a "teams" list
        for (const match of text.matchAll(/JSON\.parse\(`/g)) {
            const start = match.index + match[0].length;
            const end = text.indexOf('`)', start);
            if (end < 0 || text.slice(start, start + 7) !== '[{"id":') continue;
            let list;
            try { list = JSON.parse(text.slice(start, end)); } catch (e) { continue; }
            if (!Array.isArray(list) || !list[0] || !Array.isArray(list[0].teams)) continue;
            for (const league of list) {
                gameData.leagues[league.country_fifa_code + ':' + league.tier] = league.name;
                gameData.leagueImages[league.country_fifa_code + ':' + league.tier] = league.league_trophy_url;
                for (const team of league.teams || []) {
                    renameClub(team);
                    gameData.teams[team.id] = {
                        name: team.name,
                        // The name Copero writes on its own cards ("Man City", "Chivas"), for the script's short lines
                        short: team.short_name || team.name,
                        league: league.name,
                        country: league.country_fifa_code,
                        tier: league.tier,
                        confed: league.confederation,
                        cupId: league.domestic_cup_id,
                        logo: team.logo_url,
                        color: team.primary_color,
                        // Reputations from the game file (domestic, continental, international); the Living world moves the live ones
                        rep: [team.domestic_reputation, team.continental_reputation, team.international_reputation].map(n => Number(n) || 0),
                        // Big clubs (for Big-club interest): top reputations, known worldwide, in a top league
                        big: league.tier === 1 && team.international_reputation >= 3 &&
                            team.domestic_reputation + team.continental_reputation + team.international_reputation >= 11
                    };
                }
            }
            break;
        }
        // Domestic cups: "esp-copa-del-rey":{name:"Copa del Rey",country_fifa_code:"ESP",trophy_url:"https://..."
        for (const m of text.matchAll(/"?([\w-]+)"?:\{name:"([^"]+)",country_fifa_code:"[A-Z]+",trophy_url:"([^"]*)"/g)) {
            gameData.cups[m[1]] = m[2];
            gameData.cupImages[m[1]] = m[3];
        }
        // Countries: {"name_en":"Andorra",...,"fifa_code":"AND",...,"flag_url":"https://..."}
        for (const m of text.matchAll(/\{"name_en":"([^"]+)"[^{}]*?"fifa_code":"([A-Z]{3})"[^{}]*?"flag_url":"([^"]+)"/g)) {
            gameData.flags[m[2]] = m[3];
            gameData.flags[m[1]] = m[3];
        }
        // Countries' shirts: each country is a whole JSON object with its kit colours (and a pattern for a few)
        for (const m of text.matchAll(/\{"name_en":[^{}]*"kit_primary_color"[^{}]*\}/g)) {
            try {
                const country = JSON.parse(m[0]);
                if (country.fifa_code) gameData.kits[country.fifa_code] = country;
            } catch (err) { /* not one of the country objects */ }
        }
        // Countries' reputations: ...,"confederation":"UEFA","continental_reputation":4,"fifa_reputation":5,"international_reputation":5
        for (const m of text.matchAll(/\{"name_en":"([^"]+)"[^{}]*?"fifa_code":"([A-Z]{3})"[^{}]*?"confederation":"([A-Z]+)","continental_reputation":(-?\d+),"fifa_reputation":(-?\d+)(?:,"international_reputation":(-?\d+))?/g)) {
            gameData.countries[m[2]] = { name: m[1], confed: m[3], cont: Number(m[4]), fifa: Number(m[5]), intl: Number(m[6]) || 0 };
        }
        // Continental names per confederation: UEFA:{continental_trophies:{...},national_trophies:{national_continental:{name:"Euro"
        for (const m of text.matchAll(/(UEFA|CONMEBOL|CONCACAF|CAF|AFC|OFC):\{continental_trophies:\{(.*?)\},national_trophies:\{national_continental:\{name:"([^"]+)"(?:,trophy_url:"([^"]*)")?/g)) {
            const primary = m[2].match(/continental_primary:\{name:"([^"]+)"(?:,trophy_url:"([^"]*)")?/);
            const secondary = m[2].match(/continental_secondary:\{name:"([^"]+)"(?:,trophy_url:"([^"]*)")?/);
            gameData.continental[m[1]] = {
                continental_primary: primary ? primary[1] : null,
                continental_secondary: secondary ? secondary[1] : null,
                national: m[3],
                images: {
                    continental_primary: primary && primary[2],
                    continental_secondary: secondary && secondary[2],
                    national_continental: m[4]
                }
            };
        }
    }
    async function loadGameData() {
        gameData.status = 'loading';
        try {
            let url = null;
            // The career simulator file is loaded by the page itself; wait up to ~20 s for it
            for (let i = 0; i < 40 && !url; i++) {
                url = performance.getEntriesByType('resource').map(e => e.name)
                    .find(name => /\/assets\/CareerSimulatorPage-[\w-]+\.js(\?|$)/.test(name)) || null;
                if (!url) await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (!url) throw new Error('career simulator file not found');
            parseGameData(await (await fetch(url)).text());
            const count = Object.keys(gameData.teams).length;
            if (count === 0) throw new Error('no clubs found in the file');
            gameData.status = 'ready';
            console.log('[99] read ' + count + ' clubs from the game');
        } catch (e) {
            gameData.status = 'failed';
            console.warn('[99] could not read club names, using generic ones:', e);
        }
    }
    // A club's name; `short`: the one Copero writes on its cards
    function clubName(id, short) {
        const team = gameData.teams[id];
        return (team && (short ? team.short || team.name : team.name)) || prettyName(id);
    }
    /**
     * The name the game shows for a trophy key won with a club, e.g.
     * "league" at Barcelona -> "LaLiga", "continental_primary" -> "Champions League".
     */
    function trophyName(key, teamId, tier, playerConfed) {
        const team = gameData.teams[teamId];
        const continental = gameData.continental[team ? team.confed : ''] || {};
        if (key === 'league' && team) return gameData.leagues[team.country + ':' + (tier || team.tier)] || team.league;
        if (key === 'cup' && team && gameData.cups[team.cupId]) return gameData.cups[team.cupId];
        if ((key === 'continental_primary' || key === 'continental_secondary') && continental[key]) return continental[key];
        if (key === 'national_continental' && gameData.continental[playerConfed]) return gameData.continental[playerConfed].national;
        return TROPHY_NAMES[key] || prettyName(key);
    }
    // Pictures the game uses for trophies and awards that aren't in its league lists
    const MEDIA = 'https://media.copero.com.ar/';
    const FIXED_TROPHY_IMAGES = {
        world_cup: MEDIA + 'trophies/football/international/FIFA/world-cup.png',
        club_world_cup: MEDIA + 'trophies/football/international/FIFA/club-world-cup.png',
        ballon_dor: MEDIA + 'trophies/football/international/FIFA/ballon-dor.png',
        golden_boot: MEDIA + 'trophies/football/international/UEFA/golden-boot.png',
        golden_glove: MEDIA + 'trophies/football/international/FIFA/golden-glove.png'
    };
    // Copero's own stand-ins for a league or cup with no picture: some leagues have none, and 33 of its pictures aren't on
    // its server (the Superliga, Allsvenskan, the Belgian Pro League…), so Copero shows these instead (see picture)
    const GENERIC_TROPHY = { league: MEDIA + 'trophies/football/generic-league.svg', cup: MEDIA + 'trophies/football/generic-cup.svg' };
    // The picture the game shows for a trophy or award key (null when unknown)
    function trophyImage(key, teamId, tier, playerConfed) {
        const team = gameData.teams[teamId];
        if (key === 'league') return team ? gameData.leagueImages[team.country + ':' + (tier || team.tier)] || GENERIC_TROPHY.league : null;
        if (key === 'cup') return team ? gameData.cupImages[team.cupId] || GENERIC_TROPHY.cup : null;
        const confed = key === 'national_continental' ? playerConfed : team && team.confed;
        const continental = gameData.continental[confed];
        if (continental && continental.images[key]) return continental.images[key];
        return FIXED_TROPHY_IMAGES[key] || null;
    }
    // Copero has a light and a dark version of every crest (…/L/… and …/D/…) and shows the one for its theme: the light
    // one on a dark page made dark crests like Tottenham's disappear. `dark` picks one for a background of the script's own
    const themedLogo = (src, dark) => src && src.replace(/\/[LD]\//, (dark === undefined ? document.documentElement.classList.contains('dark') : dark) ? '/D/' : '/L/');
    const clubLogo = (teamId, dark) => themedLogo((gameData.teams[teamId] && gameData.teams[teamId].logo) || null, dark);

