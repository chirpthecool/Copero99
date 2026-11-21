    // ========================================================================
    // The Living world box under the game card
    // ========================================================================

    // One club with its three reputations as 5 pips each under its name; an arrow shows a change from the game file
    // (`reps`: the reputations to show, e.g. a past season's; now by default)
    function repRow(id, tag, reps) {
        const row = el('div', 'rep-row');
        const logo = picture(clubLogo(id), '');
        if (logo) row.appendChild(logo);
        const text = el('div', 'rep-text');
        text.appendChild(el('b', '', clubName(id)));
        if (tag) text.appendChild(el('small', '', tag));
        row.appendChild(text);
        const now = reps || levelOf(id);
        const base = (gameData.teams[id] && gameData.teams[id].rep) || now;
        const meters = el('div', 'rep-meters c99-group');
        REP_NAMES.forEach((name, i) => meters.appendChild(repMeter(name, REP_SHORT[i], now[i], base[i], REP_HINTS[i])));
        text.appendChild(meters);
        return row;
    }
    // One reputation as 5 pips under its short name, with an arrow when it differs from the game file's value
    function repMeter(name, short, now, base, hint) {
        const meter = el('span', 'rep-meter');
        meter.title = name + ': ' + (now > 5 ? 'superteam, a 6th level past Copero’s top' : now + ' of 5') + (now !== base ? ' (was ' + base + ')' : '') + '. ' + hint;
        meter.appendChild(el('small', '', short));
        const pips = el('span', 'pips');
        for (let k = 1; k <= 5; k++) pips.appendChild(el('i', k <= now ? 'on' : ''));
        // The rare 6th level, a gold pip
        if (now > 5) pips.appendChild(el('i', 'on six'));
        meter.appendChild(pips);
        if (now !== base) meter.appendChild(el('em', now > base ? 'up' : 'down', now > base ? '▲' : '▼'));
        return meter;
    }
    let worldElement = null;
    const NEWS_SHOWN = 4;
    /**
     * The Living world box sits under the game card, inside Copero's page (so
     * it is re-added if the page redraws). It goes after the card's wrapper,
     * not inside it: the game sizes its trophy celebration to that wrapper
     * (inside, the trophy showed up too low) and the panel takes the card's height.
     */
    function placeWorld() {
        const card = currentState ? document.querySelector('[data-career-phase] section') : null;
        const anchor = card && (card.closest('[data-career-phase] .relative') || card);
        if (!anchor) {
            if (worldElement) worldElement.remove();
            return;
        }
        if (!worldElement) {
            worldElement = el('div', 'c99-world c99-own');
            worldElement.id = 'copero99-world';
            lastWorldSig = '';
        }
        if (anchor.nextElementSibling !== worldElement) anchor.after(worldElement);
    }
    // The season shown in the Living world box (an index into the seasons; null = the latest) and how many seasons there were
    let worldPick = null;
    let worldPickCount = 0;
    // The career the Living world shows: during the season animation, the one being played
    const worldState = () => (animating && liveState ? liveState : currentState);
    const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
    const RESULT_CLASSES = ['out', 'plain', 'deep', 'final', 'win'];
    const NOT_QUALIFIED = 'Didn’t qualify';
    // One competition: its trophy, its name on a line of its own across the row, and under it up to two small lines (text,
    // or a line from wonBy) with the result as a coloured chip beside them. Everything is written out, so there's no hover box
    function compRow(img, name, sub, res, lv, sub2) {
        const row = el('div', 'c99-comp' + (lv < 0 ? ' out' : ''));
        const slot = el('span', 'c99-comp-pic');
        const pic = picture(img, '');
        if (pic) slot.appendChild(pic);
        row.appendChild(slot);
        row.appendChild(el('b', 'c99-comp-name', name));
        const text = el('span', 'c99-comp-text');
        for (const line of [sub, sub2]) {
            if (line) text.appendChild(typeof line === 'string' ? el('small', '', line) : line);
        }
        row.appendChild(text);
        row.appendChild(el('span', 'c99-res ' + RESULT_CLASSES[clamp(lv, -1, 3) + 1], res));
        return row;
    }
    // "Won by" a club (its crest) or country (its flag), the picture before the name and kept with its first word (a
    // wrapped line never ends on a lone crest). `after`: the winner's position or goals, kept on one line with the name's end.
    // `nation`: an award winner's country, its flag just before the club's crest
    function wonBy(prefix, src, name, after, nation) {
        const line = el('small', 'c99-won' + (after ? ' c99-who' : ''));
        const part = after ? el('span') : line;
        part.append(prefix + ' ');
        const words = String(name).split(' ');
        const lead = el('span', 'c99-won-lead');
        const flag = nation && picture(gameData.flags[nation], (gameData.countries[nation] || {}).name || nation);
        if (flag) {
            flag.className = 'c99-flag c99-won-flag';
            lead.appendChild(flag);
        }
        const pic = picture(src, '');
        if (pic) lead.appendChild(pic);
        lead.append(words[0]);
        part.append(lead, words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
        if (after) line.append(part, el('em', '', after));
        return line;
    }
    // While the game plays the season (Living world): a row's chip runs through the rounds its club went through (its
    // league place moving), one step every WORLD_TICK ms, and lands on the result with the game's trophies
    const WORLD_TICK = 170;
    let worldTicker = null;
    let worldLive = '';  // The season the box last showed being played ("<seed>:<seasons>"), so its results land with a flourish
    // A row being played: its chip shows the first step, and runs through the rest (renderWorld)
    function liveRow(img, name, sub, steps, ticks) {
        const row = compRow(img, name, sub, steps[0], 0);
        const chip = row.querySelector('.c99-res');
        chip.className = 'c99-res live';
        if (steps.length > 1) ticks.push([chip, steps]);
        return row;
    }
    // The steps a competition's chip shows while it is played: its rounds up to the one the club went out in (or the
    // final), or for a league a place that moves toward where the club finished
    function liveSteps(comp, rounds, rng) {
        if (comp.key === 'league') {
            const n = comp.table.length;
            const from = clamp(comp.pos + Math.round((rng() * 2 - 1) * 6), 1, n);
            return [0, 1, 2, 3, 4, 5].map(k => ordinal(clamp(Math.round(from + (comp.pos - from) * k / 5 + (k < 5 ? rng() * 2 - 1 : 0)), 1, n)));
        }
        const at = comp.res === 'Winner' || comp.res === 'Runner-up' ? rounds.length - 1 : rounds.indexOf(comp.res);
        return at >= 0 ? rounds.slice(0, at + 1) : [comp.res];
    }
    // Your country, always as two rows under your club (so the box keeps its shape every season): the country with your
    // caps and whether you're in the squad (the coach's call, Copero's own OVR rule), and its tournament: the one of the
    // season shown (`result`, being played with `ticks`), or else the next one
    // (`past`: season `index` is an earlier one, so the country is shown as it was then: its name, your caps by then and
    // whether you were in the squad)
    function nationBlock(state, result, ticks, index, past) {
        const nat = state.player.nationality || {};
        const wrap = el('div', 'c99-nation c99-group');
        const season = past ? state.seasons[index] : null;
        const nrep = past && result && Number.isFinite(result.nrep) ? result.nrep : Number(nat.international_reputation) || 0;
        const need = CALLUP_OVR[clamp(nrep, 0, 5)];
        const banned = past ? !!season.suspended : Number(state.suspensionSeasonsRemaining) > 0;
        const good = Number(past ? season.overall : state.player.overall) >= need;
        let caps = 0, goals = 0;
        for (const period of Array.isArray(state.nationalTeamPeriods) ? state.nationalTeamPeriods : []) {
            if (past && Number(period.ageStart) > Number(season.age)) continue;
            caps += Number(period.stats && period.stats.appearances) || 0;
            goals += Number(period.stats && period.stats.goals) || 0;
        }
        const country = compRow(nat.flag_url || gameData.flags[nat.fifa_code], nat.name_en || 'National team',
            caps ? caps + (caps === 1 ? ' cap · ' : ' caps · ') + goals + (goals === 1 ? ' goal' : ' goals') : 'No caps yet',
            banned ? 'Suspended' : good ? 'In the squad' : 'Left out', banned || !good ? -1 : 1);
        const flag = country.querySelector('img');
        if (flag) flag.classList.add('c99-flag');
        country.querySelector('.c99-comp-name').appendChild(armband(nationCaptain(state, caps, good && !banned, past ? season.age : undefined), 'national team'));
        // Its world name, like a club's meters, and its manager
        const file = gameData.countries[nat.fifa_code];
        if (file) {
            const meters = el('div', 'rep-meters');
            meters.appendChild(repMeter(REP_NAMES[2], REP_SHORT[2], clamp(nrep, 0, 5), file.intl, NATION_HINT));
            country.querySelector('.c99-comp-text').appendChild(meters);
        }
        const coach = nat.fifa_code && managerLine(nationManager(state, nat, past ? index : state.seasons.length));
        if (coach) country.querySelector('.c99-comp-text').appendChild(coach);
        wrap.appendChild(country);
        const items = result ? result.nation : [];
        if (items.length) items.forEach(item => wrap.appendChild(nationRow(state, result, item, ticks)));
        else wrap.appendChild(nextTournament(state, index));
        return wrap;
    }
    /**
     * Your games, goals and assists (a keeper's clean sheets) at your
     * country's tournament in a season: a game a round it played (3 in the
     * group), out of Copero's national team numbers for that stretch, and
     * your goals in the same share. '' when Copero has no numbers for it.
     */
    function tournamentStats(state, result, item) {
        const rounds = compRounds(item.key, null, null, item.confed || (state.player.nationality || {}).confederation);
        const stage = item.res === 'Winner' ? rounds.length : item.res === 'Runner-up' ? rounds.length - 1 : rounds.indexOf(item.res);
        const age = Number(result.age);
        const period = (Array.isArray(state.nationalTeamPeriods) ? state.nationalTeamPeriods : [])
            .find(p => p && Number(p.ageStart) <= age && age <= Number(p.ageEnd) && p.stats && Number(p.stats.appearances) > 0);
        if (stage < 0 || !period) return '';
        const s = period.stats;
        const games = Math.min(3 + Math.min(stage, rounds.length - 1), s.appearances);
        const share = (n) => Math.round((Number(n) || 0) * games / s.appearances);
        const count = (n, one, many) => n + ' ' + (n === 1 ? one : many);
        const parts = [count(games, 'game', 'games')];
        if (playerRole(state.player) === 'goalkeeper') parts.push(count(share(s.cleanSheets), 'clean sheet', 'clean sheets'));
        else parts.push(count(share(s.goals), 'goal', 'goals'), count(share(s.assists), 'assist', 'assists'));
        return 'You: ' + parts.join(' · ');
    }
    // Your country's tournament in a season: who won it, and what it meant for you (your numbers there, or why you missed it)
    function nationRow(state, result, item, ticks) {
        const nat = state.player.nationality || {};
        const confed = item.confed || nat.confederation;
        const img = trophyImage(item.key, null, null, confed);
        const name = trophyName(item.key, null, null, confed);
        // Being played: who was called up is known before it starts (not whether they won without you)
        const you = item.res === NOT_QUALIFIED ? '' : item.called ? (!ticks && tournamentStats(state, result, item)) || 'You were called up' : !ticks && item.lv === 3 ? 'Won without you'
            : item.suspended ? 'You were suspended' : item.kept ? 'You stayed with your club' : 'You weren’t called up';
        if (ticks && item.res !== NOT_QUALIFIED) return liveRow(img, name, you, liveSteps(item, compRounds(item.key, null, null, confed), null), ticks);
        // The winner first (like the club rows), then what it meant for you
        const champ = !item.champ ? '' : item.champ === (result.code || nat.fifa_code) ? 'Champions'
            : wonBy('Won by', gameData.flags[item.champ], (gameData.countries[item.champ] || {}).name || item.champ);
        const flag = typeof champ === 'object' && champ.querySelector('img');
        if (flag) flag.classList.add('c99-flag');
        return compRow(img, name, champ || you, item.res, item.lv, champ ? you : '');
    }
    // The next tournament after the season shown (Copero's schedule: the continental title at 17, 21…, the World Cup at
    // 19, 23…, the last season is played at 39). Copero only decides qualifying a decision ahead: until then it's
    // Qualifying (looking back at an older season, a tournament played since is known)
    function nextTournament(state, index) {
        const nat = state.player.nationality || {};
        const shown = state.seasons[index];
        let next = null;
        for (let age = (shown ? Number(shown.age) : CURVE_MIN_AGE - 1) + 1; age < CURVE_MAX_AGE && !next && state.phase !== 'summary'; age++) {
            if (tournamentAt(age, 17)) next = { trophy: 'national_continental', age: age };
            else if (tournamentAt(age, 19)) next = { trophy: 'world_cup', age: age };
        }
        if (!next) return compRow(null, 'No tournament ahead', state.phase === 'summary' ? 'Career over' : 'None left in your career', '—', -1);
        const listed = (Array.isArray(state.upcomingNationalTournaments) ? state.upcomingNationalTournaments : [])
            .find(t => t && Number(t.age) === next.age && t.trophy === next.trophy);
        const played = world && world.results[state.seasons.findIndex(s => Number(s.age) === next.age)];
        const item = played && played.nation.find(n => n.key === next.trophy);
        const known = next.trophy === 'national_continental' ? true : item ? item.res !== NOT_QUALIFIED : listed ? !!listed.selectionQualified
            : world ? world.tournaments[nat.fifa_code + ':' + next.age + ':' + next.trophy] : undefined;
        return compRow(trophyImage(next.trophy, null, null, nat.confederation), trophyName(next.trophy, null, null, nat.confederation),
            'Next up, at age ' + next.age, known === undefined ? 'Qualifying' : known ? 'Qualified' : NOT_QUALIFIED, known === undefined ? 0 : known ? 1 : -1);
    }
    // A trophy the club won in a season you were suspended (banTrophies): it isn't yours
    const missedTrophy = (state, result, key) => {
        const season = state.seasons.find(s => s && Number(s.age) === Number(result.age) && s.teamId === result.teamId);
        return !!season && Array.isArray(season.c99Banned) && season.c99Banned.indexOf(key) >= 0;
    };
    // One season at the club: every competition it played (the league with its champion, the cups with theirs).
    // `ticks`: the season is being played (its rows run through their rounds, see renderWorld)
    function clubSeason(state, result, ticks) {
        const wrap = el('div', 'c99-season c99-group');
        const nat = state.player.nationality || {};
        const rng = seeded(String(state.seed) + ':live:' + result.age);
        for (const comp of result.comps) {
            const name = trophyName(comp.key, result.teamId, result.tier, nat.confederation);
            const img = trophyImage(comp.key, result.teamId, result.tier, nat.confederation);
            if (ticks && comp.res !== NOT_QUALIFIED) {
                wrap.appendChild(liveRow(img, name, 'Being played…', liveSteps(comp, compRounds(comp.key, result.teamId, result.tier), rng), ticks));
                continue;
            }
            if (comp.key !== 'league') {
                wrap.appendChild(compRow(img, name, !comp.champ ? '' : comp.champ === result.teamId ? (missedTrophy(state, result, comp.key) ? 'Champions · without you (suspended)' : 'Champions') : wonBy('Won by', clubLogo(comp.champ), clubName(comp.champ, true)), comp.res, comp.lv));
                continue;
            }
            wrap.appendChild(leagueRow(state, result, comp, img, name));
        }
        // Copero's club crisis, stayed through: every competition of the stretch
        result.comps.forEach((comp, i) => {
            if (!comp.crisis || ticks) return;
            const tag = el('span', 'c99-focus c99-crisis', 'Crisis');
            tag.title = 'Your club is in crisis these seasons: Copero cuts its chances of winning anything to a tenth';
            wrap.children[i].querySelector('.c99-comp-name').appendChild(tag);
        });
        // Talisman: you carried the club this season
        result.comps.forEach((comp, i) => {
            if (!comp.carried || ticks) return;
            const tag = el('span', 'c99-focus c99-carried', 'Talisman');
            tag.title = 'You carried your club: it played a level stronger at home and in Europe';
            wrap.children[i].querySelector('.c99-comp-name').appendChild(tag);
        });
        // The coach (a level up or down, Boost and Sandbox) and a superteam (the 6th level at home)
        result.comps.forEach((comp, i) => {
            if (ticks || !(comp.coached || comp.elite)) return;
            const name = wrap.children[i].querySelector('.c99-comp-name');
            if (comp.elite) {
                const tag = name.appendChild(el('span', 'c99-focus c99-elite', 'Superteam'));
                tag.title = 'Your club is at a 6th level at home, past Copero’s top: it wins the league far more often';
            }
            if (comp.coached) {
                const tag = name.appendChild(el('span', 'c99-focus ' + (comp.coached > 0 ? 'c99-surprise' : 'c99-crisis'), 'Coach'));
                tag.title = comp.coached > 0 ? 'Your manager is far better than the club’s size: it played a level stronger' : 'Your manager is far below the club’s size: it played a level weaker';
            }
        });
        // A small club's surprise season that took it into the top 4
        result.comps.forEach((comp, i) => {
            if (!comp.surprise || ticks) return;
            const tag = el('span', 'c99-focus c99-surprise', 'Surprise');
            tag.title = 'A season far above the club’s name: it played better than anyone expected';
            wrap.children[i].querySelector('.c99-comp-name').appendChild(tag);
        });
        // Copero's club priority choice: a tag on the competition the club put first (one row per competition, in order)
        result.comps.forEach((comp, i) => {
            if (!comp.focus) return;
            const other = comp.key === 'league' ? 'continental_primary' : 'league';
            const plays = result.comps.some(c => c.key === other && c.res !== NOT_QUALIFIED);
            const tag = el('span', 'c99-focus', 'Priority');
            tag.title = 'Your club put this first for these seasons: it goes better here' + (plays ? ', and worse in the ' + trophyName(other, result.teamId, result.tier, nat.confederation) : '');
            wrap.children[i].querySelector('.c99-comp-name').appendChild(tag);
        });
        // …and the one it didn't put first (twenty-first round: only the first one had a tag)
        result.comps.forEach((comp, i) => {
            if (!comp.rested || comp.res === NOT_QUALIFIED) return;
            const first = comp.key === 'league' ? 'continental_primary' : 'league';
            const tag = el('span', 'c99-focus c99-rested', 'Not the priority');
            tag.title = 'Your club put the ' + trophyName(first, result.teamId, result.tier, nat.confederation) + ' first for these seasons: it goes worse here';
            wrap.children[i].querySelector('.c99-comp-name').appendChild(tag);
        });
        return wrap;
    }
    // A league table's points, made up but the same on every look: about 2.2 a game for the champions down to 0.8 for the
    // bottom club over a double round robin (18 clubs: 34 games), never level at the top
    function leaguePoints(state, result, n) {
        const rng = seeded(String(state.seed) + ':points:' + result.age);
        const games = 2 * (n - 1);
        const top = Math.round(games * clamp(2.2 + 0.15 * gauss(rng), 1.9, 2.7));
        const bottom = Math.round(games * clamp(0.8 + 0.12 * gauss(rng), 0.4, 1.1));
        const step = (top - bottom) / Math.max(1, n - 1);
        const points = [top];
        for (let k = 1; k < n; k++) points.push(Math.max(0, points[k - 1] - Math.max(k === 1 ? 1 : 0, Math.round(step * (0.3 + rng() * 1.4)))));
        return points;
    }
    /**
     * Your league season: a standing tile in the colour of the table's zone
     * you finished in (gold for the title, green for promotion, blue for the
     * big continental cup's places, teal for the second cup's, red for
     * relegation), the place big and "of 18" under it; the champions and
     * their points; and a strip of the whole table, a cell a club, yours
     * lifted out.
     */
    function leagueRow(state, result, comp, img, name) {
        const n = comp.table.length;
        const points = leaguePoints(state, result, n);
        const mine = points[comp.pos - 1];
        const champion = comp.table[0];
        const team = gameData.teams[result.teamId] || {};
        const spots = comp.tier === 1 && gameData.continental[team.confed] ? continentalSpots(state, result.country, team.confed) : null;
        const lower = leagueClubs(state, result.country, comp.tier + 1).length > 0;
        const upper = comp.tier > 1 && leagueClubs(state, result.country, comp.tier - 1).length > 0;
        const rule = leagueRule(result.country);
        const zone = (p) => (upper && p <= rule.up ? 'up' : upper && rule.playoff && p >= rule.playoff[0] && p <= rule.playoff[1] ? 'po' : p === 1 ? 'title'
            : spots && p <= spots[0] ? 'cl' : spots && p <= spots[1] ? 'el' : lower && p > n - rule.down ? 'rel' : lower && rule.downPlayoff && p === n - rule.down ? 'relpo' : '');
        const sub = comp.note === 'promoted' && comp.pos === 1 ? 'Champions, promoted · ' + mine + ' pts'
            : comp.pos === 1 ? 'Champions · ' + mine + ' pts'
                : wonBy(comp.note === 'relegated' ? 'Relegated · won by' : 'Won by', clubLogo(champion), clubName(champion, true), '· ' + points[0] + ' pts');
        const gap = comp.pos === 1 ? mine - (points[1] ?? mine) : points[0] - mine;
        const you = 'You: ' + mine + ' pts · ';
        const sub2 = comp.pos === 1 && missedTrophy(state, result, 'league') ? 'Without you: you were suspended'
            : comp.pos === 1 ? (n > 1 ? gap + (gap === 1 ? ' point' : ' points') + ' clear' : '')
                : comp.up === 'auto' ? you + 'promoted automatically'
                    : comp.up === 'playoff' ? you + 'promoted through the play-offs'
                        : comp.up === 'missed' ? you + 'lost in the play-offs'
                            : zone(comp.pos) === 'relpo' ? you + (comp.note === 'relegated' ? 'relegated after the play-off' : 'survived the relegation play-off')
                                : you + gap + ' behind';
        const lv = comp.note === 'relegated' ? -1 : comp.pos === 1 || comp.note === 'promoted' ? 3 : comp.pos <= 4 ? 1 : 0;
        const row = compRow(img, name, sub, '', lv, sub2);
        row.classList.add('c99-standing-row');
        const tile = row.querySelector('.c99-res');
        tile.className = 'c99-res c99-standing ' + (zone(comp.pos) || 'mid');
        tile.setAttribute('aria-label', ordinal(comp.pos) + ' of ' + n);
        const place = el('b', '', String(comp.pos));
        place.appendChild(el('small', '', ordinal(comp.pos).slice(String(comp.pos).length)));
        tile.append(place, el('i', '', 'of ' + n));
        // The table as a strip: every club a cell in its zone's colour, yours lifted out
        const strip = el('span', 'c99-table-strip');
        strip.setAttribute('aria-hidden', 'true');
        for (let p = 1; p <= n; p++) strip.appendChild(el('i', [zone(p), p === comp.pos ? 'me' : ''].filter(Boolean).join(' ')));
        row.querySelector('.c99-comp-text').appendChild(strip);
        return row;
    }
    // One season's awards, every season, won or not: the Ballon d'Or, the Golden Boot and the Golden Glove, each with its
    // winner. `ticks`: the season is being played (see clubSeason)
    // Your Ballon d'Or placing as a medal on a ribbon beside the row's lines (the number big, its ending small: "6th"), coloured
    // by placing: gold, silver, bronze, Copero's purple 95-98 badge for 4th-5th, its light blue 90+ badge to 10th, teal to 20th,
    // quiet to 30th (see the CSS: it swings in when the season lands)
    const MEDAL_TIERS = [[1, 'p1'], [2, 'p2'], [3, 'p3'], [5, 'top5'], [10, 'top10'], [20, 'top20'], [30, 'top30']];
    function medalChip(chip, place) {
        chip.className = 'c99-res c99-medal ' + MEDAL_TIERS.find(([upTo]) => place <= upTo)[1];
        chip.setAttribute('aria-label', place === 1 ? 'Winner' : place === 2 ? 'Runner-up' : ordinal(place) + ' place');
        chip.textContent = '';
        const disc = el('span', 'c99-medal-disc');
        disc.append(el('b', '', String(place)), el('small', '', ordinal(place).slice(String(place).length)), el('i', 'c99-medal-shine'));
        chip.append(el('i', 'c99-medal-ribbon'), disc);
        chip.closest('.c99-comp').classList.add('c99-medal-row');
    }
    function awardSeason(state, index, result, ticks) {
        const wrap = el('div', 'c99-season c99-group');
        const season = state.seasons[index];
        const bdo = result.bdo;
        const winner = (id, after, slot, nation) => wonBy('Won by', clubLogo(id), id === result.teamId ? 'a teammate' : clubName(id, true), after, nation || winnerNation(state, index, id, slot));
        const level = (place) => (place === 1 ? 3 : place === 2 ? 2 : place <= 5 ? 1 : 0);
        if (bdo && ticks) {
            wrap.appendChild(liveRow(FIXED_TROPHY_IMAGES.ballon_dor, TROPHY_NAMES.ballon_dor, 'Votes being counted…', ['Voting'], ticks));
        } else if (bdo) {
            const res = bdo.place === 1 ? 'Winner' : bdo.place === 2 ? 'Runner-up' : !bdo.place ? '—' : ordinal(bdo.place);
            const sub = bdo.place === 1 ? 'World’s best' : bdo.champ ? winner(bdo.champ, bdo.pos && '· ' + bdo.pos, bdo.slot || bdo.pos, bdo.nation) : '';
            // Not nominated goes on its own line (as a chip it squeezed the winner's name to nothing)
            const row = wrap.appendChild(compRow(FIXED_TROPHY_IMAGES.ballon_dor, TROPHY_NAMES.ballon_dor, sub, res, bdo.place ? level(bdo.place) : -1, bdo.place ? '' : 'You weren’t nominated'));
            if (bdo.place) medalChip(row.querySelector('.c99-res'), bdo.place);
        }
        // Golden Boot and Golden Glove: the line under the winner says how you did
        const stats = season.stats || {};
        const keeper = playerRole(state.player) === 'goalkeeper';
        const { boot, glove } = awardRaces(state, index);
        if (ticks) {
            wrap.appendChild(liveRow(FIXED_TROPHY_IMAGES.golden_boot, TROPHY_NAMES.golden_boot, 'Being played…', ['Live'], ticks));
            wrap.appendChild(liveRow(FIXED_TROPHY_IMAGES.golden_glove, TROPHY_NAMES.golden_glove, 'Being played…', ['Live'], ticks));
            return wrap;
        }
        const team = gameData.teams[season.teamId];
        // The race counts league goals × the league's weight (points); a Golden Boot Copero gave elsewhere just shows the goals
        const tally = boot.points === null ? (Number(stats.goals) || 0) + ' goals' : boot.league + ' league goals · ' + boot.points + ' pts';
        const scored = keeper ? '' : season.suspended ? 'You were suspended' : !team || team.confed !== 'UEFA' ? 'Only European leagues count'
            : boot.points === null ? 'Only top flights count' : 'You: ' + tally;
        wrap.appendChild(boot.won ? compRow(FIXED_TROPHY_IMAGES.golden_boot, TROPHY_NAMES.golden_boot, 'Europe’s top scorer', 'Winner', 3, tally)
            : compRow(FIXED_TROPHY_IMAGES.golden_boot, TROPHY_NAMES.golden_boot, boot.champ ? winner(boot.champ, '· ' + boot.pos + ' · ' + boot.goals + ' goals', boot.slot) : '',
                boot.place ? ordinal(boot.place) : '—', boot.place ? level(boot.place) : -1, scored));
        const kept = !keeper ? '' : season.suspended ? 'You were suspended' : 'You kept ' + (Number(stats.cleanSheets) || 0) + ' clean sheets';
        wrap.appendChild(glove.won ? compRow(FIXED_TROPHY_IMAGES.golden_glove, TROPHY_NAMES.golden_glove, 'World’s best keeper', 'Winner', 3, (Number(stats.cleanSheets) || 0) + ' clean sheets')
            : compRow(FIXED_TROPHY_IMAGES.golden_glove, TROPHY_NAMES.golden_glove, glove.champ ? winner(glove.champ, '· ' + glove.sheets + ' clean sheets', 'GK') : '', '—', -1, kept));
        return wrap;
    }
    function renderWorld(state) {
        placeWorld();
        const box = worldElement;
        if (!box) return;
        const mine = world && state && world.seed === String(state.seed) ? world : null;
        const count = state && Array.isArray(state.seasons) ? state.seasons.length : 0;
        // A new season jumps back to the latest one
        if (count !== worldPickCount) {
            worldPickCount = count;
            worldPick = null;
        }
        const pick = worldPick === null ? count - 1 : worldPick;
        const result = mine && pick >= 0 ? mine.results[pick] : undefined;
        const drift = !!currentMode();
        // The latest season while the game is still playing it: its rows run through their rounds until its trophies show
        const live = !seasonLanded() && pick === count - 1 && !!result;
        const sig = JSON.stringify([!!liveTeams, gameData.status, state && state.currentTeamId, state && state.phase, count, pick, result === undefined, live,
            mine && mine.news.length, state && state.upcomingNationalTournaments, drift, state && state.player && state.player.overall, state && state.suspensionSeasonsRemaining, state && state.player && state.player.nationality && state.player.nationality.fifa_code,
            state && state.player && state.player.nationality && state.player.nationality.international_reputation]);
        if (sig === lastWorldSig) return;
        lastWorldSig = sig;
        clearInterval(worldTicker);
        worldTicker = null;
        box.textContent = '';
        if (!state || !state.currentTeamId || gameData.status !== 'ready') return;
        // The season that was just being played lands: its results pop in one after another
        const playing = String(state.seed) + ':' + count;
        const landing = !live && worldLive === playing && pick === count - 1;
        worldLive = live ? playing : '';
        const head = el('div', 'c99-world-head');
        // The Living world's own tile: a globe on a glossy teal tile, shining like the Copero99 diamond
        head.innerHTML = '<span class="c99-gem c99-globe">' + icon('earth') + '</span>';
        head.appendChild(el('b', '', 'Living world'));
        head.appendChild(el('span', 'c99-world-sub', drift ? 'Every competition you play, and club reputations that rise and fall.'
            : 'Every competition you play. Vanilla: reputations stay as Copero has them.'));
        // Season arrows: the latest season, with arrows to look back
        if (count) {
            const step = (to, text, label) => {
                const btn = el('button', 'c99-world-step', text);
                btn.type = 'button';
                btn.setAttribute('aria-label', label);
                btn.disabled = to < 0 || to >= count;
                btn.addEventListener('click', () => {
                    worldPick = to === count - 1 ? null : to;
                    renderWorld(worldState());
                });
                return btn;
            };
            const nav = el('span', 'c99-season-nav');
            nav.appendChild(step(pick - 1, '‹', 'Season before'));
            // Any season in one go: a list of every age played (the arrows step one at a time)
            const list = el('select', 'c99-season-pick');
            list.setAttribute('aria-label', 'Season');
            state.seasons.forEach((s, i) => {
                const opt = el('option', '', 'Age ' + s.age + (i === count - 1 ? ' · latest' : ''));
                opt.value = String(i);
                opt.selected = i === pick;
                list.appendChild(opt);
            });
            list.addEventListener('change', () => {
                const to = Number(list.value);
                worldPick = to === count - 1 ? null : to;
                renderWorld(worldState());
            });
            nav.appendChild(list);
            nav.appendChild(step(pick + 1, '›', 'Season after'));
            head.appendChild(nav);
        }
        box.appendChild(head);
        const cols = el('div', 'c99-world-cols');
        const column = (title) => {
            const col = el('div');
            const label = el('div', 'c99-world-label');
            label.append(...(Array.isArray(title) ? title : [title]));
            col.appendChild(label);
            cols.appendChild(col);
            return col;
        };

        const ticks = live ? [] : null;
        // An earlier season: your club (its reputations, manager and your armband) and country as they were then
        const past = count > 0 && pick < count - 1;
        const clubId = past ? state.seasons[pick].teamId : state.currentTeamId;
        const clubCol = column('Your club');
        const clubRow = clubCol.appendChild(repRow(clubId, '', past && result && result.rep));
        clubRow.querySelector('b').appendChild(armband(clubCaptain(state, past ? pick + 1 : undefined), 'club'));
        const boss = managerLine(clubManager(state, clubId, past ? pick : count));
        if (boss) clubRow.querySelector('.rep-text').appendChild(boss);
        const nation = clubCol.appendChild(nationBlock(state, result || null, ticks, pick, past));

        // The season's club is only named when it isn't the club shown beside it
        const season = count ? state.seasons[pick] : null;
        const other = season && season.teamId !== clubId;
        const seasonTitle = ['Club season'];
        if (other) {
            const crest = picture(clubLogo(season.teamId), '');
            seasonTitle.push(' · ');
            if (crest) seasonTitle.push(crest);
            seasonTitle.push(clubName(season.teamId));
        }
        if (season && season.suspended) seasonTitle.push(el('span', 'c99-res out', 'Suspended'));
        const seasonCol = column(seasonTitle);
        if (!count) seasonCol.appendChild(el('div', 'c99-world-hint', 'After your first season: your league place, the cups, continental cups, the Ballon d’Or and your country’s tournaments.'));
        else if (result === undefined) seasonCol.appendChild(el('div', 'c99-world-hint', 'Working out the results…'));
        else if (!result) seasonCol.appendChild(el('div', 'c99-world-hint', 'This club isn’t in the game’s club list, so there are no results.'));
        else {
            const club = seasonCol.appendChild(clubSeason(state, result, ticks));
            const awards = column('Awards').appendChild(awardSeason(state, pick, result, ticks));
            if (landing) {
                // The country's tournament (under your club) lands with the season's other rows
                const cup = result.nation.length ? nation.lastElementChild : null;
                [...club.children, ...awards.children].concat(cup || []).forEach((row, i) => row.style.setProperty('--i', i));
                club.classList.add('c99-land');
                awards.classList.add('c99-land');
                if (cup) cup.classList.add('c99-land');
            }
        }
        if (ticks) {
            let at = 0;
            worldTicker = setInterval(() => {
                at++;
                for (const [chip, steps] of ticks) chip.textContent = steps[Math.min(at, steps.length - 1)];
                // A season without trophies changes little on Copero's page, so this checks for the landing itself
                // (the pass that sees it redraws the box, which stops this timer)
                if (Date.now() - lastPass >= WORLD_TICK) schedulePass();
            }, WORLD_TICK);
        }

        if (drift) {
            // A strip under the three columns, so they have the room to keep their lines whole
            const moves = column('Latest moves');
            moves.className = 'c99-world-moves';
            if (mine && mine.news.length) {
                const list = el('ul', 'world-news');
                // The newest few, so the column is never a scroll box showing half a line
                for (const item of mine.news.slice(0, NEWS_SHOWN)) {
                    // A club's crest (a country's flag) before its name; a new manager at your club is news too
                    const line = el('li', item.manager ? 'mgr' : item.to > item.from ? 'up' : 'down');
                    const head = line.appendChild(el('b', '', item.manager ? '' : item.to > item.from ? '▲ ' : '▼ '));
                    const crest = picture(item.nation ? gameData.flags[item.id] : clubLogo(item.id), '');
                    if (crest) {
                        if (item.nation) crest.classList.add('c99-flag');
                        head.appendChild(crest);
                    }
                    head.append(item.nation ? (gameData.countries[item.id] || {}).name || item.id : clubName(item.id, true));
                    const parts = item.manager ? ['New manager: ' + item.manager, item.was ? item.was.split(' ').slice(-1)[0] + ' ' + (item.why || 'left') : '']
                        : [REP_NAMES[item.field] + ' ' + item.from + ' → ' + item.to, item.why];
                    // A line only breaks between its parts, before their dot ("age" never ends up apart from its number)
                    for (const part of [...parts, item.age ? 'age ' + item.age : '']) {
                        if (part) line.append(' ', el('span', '', '· ' + part));
                    }
                    list.appendChild(line);
                }
                moves.appendChild(list);
            } else {
                moves.appendChild(el('div', 'c99-world-hint', liveTeams ? 'Moves show up here after each season.' : "Waiting for the game's club list…"));
            }
        }
        box.appendChild(cols);
    }

