    // ========================================================================
    // The manager carousel and captains
    // ========================================================================

    let managerList = null;
    // { clubs: { id: m }, nations: { code: m }, free: [m] }, m = { name, code, club } (club = the one he runs or last ran)
    // or { name, code, nation } for a national team's
    function managers() {
        if (managerList) return managerList;
        const rows = (text) => text.trim().split('\n').map(line => line.split('|'));
        managerList = { clubs: {}, nations: {}, free: [], future: [] };
        for (const [club, code, name] of rows(REAL_CLUB_MANAGERS)) managerList.clubs[club] = { name, code, club };
        for (const [nation, code, name] of rows(REAL_NATION_MANAGERS)) managerList.nations[nation] = { name, code, nation };
        for (const [code, name, club] of rows(FREE_MANAGERS)) managerList.free.push({ name, code, club, free: true });
        for (const [code, name, club, born] of rows(FUTURE_MANAGERS)) managerList.future.push({ name, code, club, born: Number(born), future: true });
        return managerList;
    }
    // 1-5 stars by the size (world name, -1..5) of the club or country he runs or last ran
    const managerRating = (size) => clamp(Math.round((clamp(Number(size) || 0, -1, 5) + 1) * 5 / 6), 1, 5);
    // The best of the best start at 6 stars (purple)
    const ELITE_MANAGERS = ['Pep Guardiola', 'Carlo Ancelotti', 'Jürgen Klopp', 'Luis Enrique'];
    /**
     * A manager's stars, 1-6: where he starts (a regen's own; the elite 6;
     * else the size of the club or country he runs or last ran), moved by how
     * his teams do this career (world.mgr, rateManagers). 6 is for a 5-star
     * whose teams keep winning, and the elite while they do.
     */
    // A real manager's base never changes once the game file is read, so it's remembered (hires rate ~1000 of them)
    const baseMemo = new WeakMap();
    function baseOf(m) {
        if (m.base) return m.base;
        if (baseMemo.has(m)) return baseMemo.get(m);
        const size = managerRating(m.nation ? (gameData.countries[m.nation] || {}).intl : (gameData.teams[m.club] || { rep: [] }).rep[2]);
        // An ex-player starts a star below the club he made his name at (a rookie: his results do the rest)
        const base = ELITE_MANAGERS.indexOf(m.name) >= 0 ? 6 : m.future ? Math.max(1, size - 1) : size;
        if (gameData.status === 'ready') baseMemo.set(m, base);
        return base;
    }
    function ratingOf(m) {
        const now = baseOf(m) + ((world && world.mgr && world.mgr[m.name]) || 0);
        return clamp(now >= 6 ? 6 : Math.round(Math.min(now, 5.49)), 1, 6);
    }
    // The season a real manager retires (6-24 seasons into the career, by name): no club hires him after it, and his club
    // replaces him then. Regens: `from` seasons in, a hire is a regen `1 / over` more often every season, up to `max`
    // Remembered per career: every hire checks all ~1000 out-of-work managers, and hashing each one every time made a
    // season's landing freeze the page for a quarter of a second or more
    let retireMemo = { seed: null, by: new Map() };
    function regenAfter(state, m) {
        const seed = String(state.seed);
        if (retireMemo.seed !== seed) retireMemo = { seed, by: new Map() };
        let at = retireMemo.by.get(m.name);
        // (an ex-player's clock starts at his first job, not at the career's start)
        if (at === undefined) retireMemo.by.set(m.name, at = (m.future ? coachDebut(state, m) : 0) + 6 + Math.floor(seeded(seed + ':mgr-retire:' + m.name)() * 19));
        return at;
    }
    // Real managers' names by country (two words or more, countries with 6+ of them), for regens: { code: [[first, last]] }
    let regenPool = null;
    function regenNames() {
        if (regenPool) return regenPool;
        const all = managers();
        const byCode = {};
        for (const m of [...Object.values(all.clubs), ...Object.values(all.nations), ...all.free]) {
            const words = m.name.split(' ');
            if (!m.code || words.length < 2) continue;
            (byCode[m.code] = byCode[m.code] || []).push([words[0], words.slice(1).join(' ')]);
        }
        regenPool = { names: {}, real: new Set([...Object.values(all.clubs), ...Object.values(all.nations), ...all.free, ...all.future].map(m => m.name)) };
        for (const code of Object.keys(byCode)) if (byCode[code].length >= 6) regenPool.names[code] = byCode[code];
        return regenPool;
    }
    /**
     * A regen: a new manager, his name a real first name and a real last
     * name of his country's managers (never a real manager's whole name), his
     * stars around the club's size. A national team nearly always picks one
     * of its own (one of its confederation when the data has too few of its
     * names), a club only now and then. Repeatable per `key`.
     */
    function regenManager(key, want, home, country) {
        const rng = seeded(key + ':regen');
        const { names, real } = regenNames();
        const codes = Object.keys(names);
        if (!codes.length) return null;
        const confed = (gameData.countries[home] || {}).confed;
        const near = codes.filter(c => confed && (gameData.countries[c] || {}).confed === confed);
        const code = names[home] && rng() < (country ? 0.95 : 0.3) ? home : weightedPick(country && near.length ? near : codes, c => names[c].length, rng);
        const list = names[code];
        let name = '';
        for (let tries = 0; tries < 20 && (!name || real.has(name)); tries++) {
            const first = list[Math.floor(rng() * list.length)][0], last = list[Math.floor(rng() * list.length)][1];
            // (never "Peter Peter")
            if (first !== last) name = first + ' ' + last;
        }
        return { name, code, regen: true, base: clamp(want + Math.round(gauss(rng) * 0.8), 1, 5) };
    }
    // The stars of a club's new manager against its size: mostly one rated for it, sometimes a star less, now and then a
    // step up, seldom two less. (Weighting all ~1000 out-of-work managers by how close they were let the hundreds from
    // small clubs outnumber the few top ones, so big clubs kept hiring weak managers, who then dragged them down.)
    const HIRE_STARS = [[0, 0.55], [-1, 0.3], [1, 0.1], [-2, 0.05]];
    // An ex-player (FUTURE_MANAGERS) joins the out-of-work managers at his debut; the club he made his name at weighs him
    // ×`home` when it hires
    const LEGENDS = { home: 6 };
    // The real year of a career's first season (the managers are the 2026-27 ones)
    const CAREER_START_YEAR = 2026;
    let debutMemo = { seed: null, by: new Map() };
    function coachDebut(state, m) {
        const seed = String(state.seed);
        if (debutMemo.seed !== seed) debutMemo = { seed, by: new Map() };
        let at = debutMemo.by.get(m.name);
        if (at === undefined) debutMemo.by.set(m.name, at = Math.max(1, m.born + 38 + Math.floor(seeded(seed + ':coach-debut:' + m.name)() * 7) - CAREER_START_YEAR));
        return at;
    }
    // Why a club changed manager, for Latest moves
    const MANAGER_EXITS = { sacked: 'sacked', poached: 'left for a bigger job', retired: 'retired', quit: 'stepped down' };
    /**
     * The manager carousel (Chirp: managers changed too often, the same
     * names ran several clubs at once and some hires made no sense). One
     * shared world of managers per career, every club and national team in
     * it, worked out season by season with its own seeded numbers and kept:
     * each man has one job at a time, a sacked one sits a season out before he
     * comes back to the pool, a real one retires (regenAfter) and a regen of
     * his stars and country takes his place in the pool, an ex-player joins at
     * his debut. A season's exits (CAROUSEL): `base` + `tenure` a season in
     * charge; after a bad season (bottom half of your league's table, or
     * about one club in six elsewhere) `bad`; a relegation `drop`; a title
     * `title`; a big club (world name 4+) that won nothing `big` after a bad
     * one; `quit` steps down. Vacancies are filled biggest club first, by the
     * club's size in the file (HIRE_STARS around it, his own country ×1.5,
     * an ex-player at his old club ×6); a big club now and then poaches a
     * manager rated well above his smaller club, which then hires too.
     * National teams change about one season in six and hire mostly their own.
     */
    const CAROUSEL = { base: 0.07, tenure: 0.012, bad: 0.25, badShare: 0.16, bigShare: 0.35, drop: 0.5, title: 0.02, big: 0.2, quit: 0.02, poach: 0.2, poachGap: 2, nation: 0.16 };
    let carousel = { seed: null, snaps: [] };
    let carouselClubs = null;
    // Every club, biggest first (world name, then home name, in the file), and every country
    function carouselOrder() {
        if (carouselClubs) return carouselClubs;
        const teams = gameData.teams;
        carouselClubs = {
            clubs: Object.keys(teams).sort((a, b) => (teams[b].rep[2] - teams[a].rep[2]) || (teams[b].rep[0] - teams[a].rep[0]) || (a < b ? -1 : 1)),
            nations: Object.keys(gameData.countries).sort()
        };
        return carouselClubs;
    }
    const starsOf = (m) => Math.min(baseOf(m), 5);
    // The data a season's change depends on (the season you played and whether its results are worked out)
    function carouselToken(state, j) {
        const prev = state.seasons[j - 1];
        const own = !!world && world.seed === String(state.seed);
        return (prev ? prev.teamId + (prev.relegated ? 'r' : '') + (Array.isArray(prev.trophies) && prev.trophies.indexOf('league') >= 0 ? 't' : '') : '-') +
            (own && world.results[j - 1] ? '1' : '0');
    }
    // Hires a manager for a club (`id`) or a country (`code`) into snapshot `snap` in season `j`
    function carouselHire(state, snap, rng, j, size, home, nation, id) {
        let pick = rng();
        const want = managerRating(size);
        const target = clamp(want + (HIRE_STARS.find(([, chance]) => (pick -= chance) < 0) || [0])[0], 1, 5);
        const ok = (m) => (snap.rest.get(m.name) ?? -9) < j && (!m.future || coachDebut(state, m) <= j) && (m.regen || regenAfter(state, m) > j);
        const weight = (m) => (starsOf(m) === target ? 3 : 1) * (m.code === home ? (nation ? 40 : 1.5) : 1) * (id && m.future && m.club === id ? LEGENDS.home : 1);
        // Stars within one of the target, never two below the club's size (one at the biggest clubs) nor above it by more than one
        const buckets = [];
        let total = 0;
        for (let s = Math.max(target - 1, want - (!nation && size >= 4 ? 1 : 2), 1); s <= Math.min(target + 1, want + 1, 5); s++) {
            if (snap.free[s] && snap.free[s].length) {
                buckets.push(snap.free[s]);
                total += snap.free[s].length;
            }
        }
        const any = () => {
            let at = Math.floor(rng() * total);
            for (const list of buckets) {
                if (at < list.length) return list[at];
                at -= list.length;
            }
            return null;
        };
        let chosen = null;
        if (nation) {
            // A national team looks at its own first (all of them), then anyone
            const own = [];
            for (const list of buckets) for (const m of list) if (m.code === home && ok(m)) own.push(m);
            if (own.length && rng() < 0.95) chosen = weightedPick(own, weight, rng);
        }
        // A few random looks, each kept as likely as its weight (cheaper than weighing the whole pool every hire)
        for (let tries = 0; tries < 80 && !chosen && total; tries++) {
            const m = any();
            if (ok(m) && rng() * 27 < (nation ? 3 : weight(m))) chosen = m;
        }
        if (chosen) {
            const list = snap.free[starsOf(chosen)];
            list.splice(list.indexOf(chosen), 1);
            return chosen;
        }
        // Nobody fits: a regen of those stars
        return carouselRegen(state, snap, target, home, nation, j + ':' + (id || home) + ':hire');
    }
    // A new regen (never two of one name)
    function carouselRegen(state, snap, stars, home, nation, key) {
        for (let k = 0; k < 6; k++) {
            const m = regenManager(String(state.seed) + ':carousel:' + key + ':' + k, stars, home, nation);
            if (!m) return null;
            if (!snap.names.has(m.name)) {
                snap.names.add(m.name);
                return m;
            }
        }
        return null;
    }
    const carouselFree = (snap, m) => (snap.free[starsOf(m)] = snap.free[starsOf(m)] || []).push(m);
    // The first season: the real managers (an empty seat gets a hire, biggest club first)
    function carouselStart(state) {
        const all = managers();
        const order = carouselOrder();
        const snap = { clubs: new Map(), nations: new Map(), free: {}, rest: new Map(), names: new Set(), token: '' };
        for (const id of order.clubs) {
            const m = all.clubs[id];
            if (m && !snap.names.has(m.name)) {
                snap.clubs.set(id, { manager: m, since: 0, exit: '' });
                snap.names.add(m.name);
            }
        }
        for (const code of order.nations) {
            const m = all.nations[code];
            if (m && !snap.names.has(m.name)) {
                snap.nations.set(code, { manager: m, since: 0, exit: '' });
                snap.names.add(m.name);
            }
        }
        for (const m of [...all.free, ...all.future]) {
            if (snap.names.has(m.name)) continue;
            snap.names.add(m.name);
            carouselFree(snap, m);
        }
        const rng = seeded(String(state.seed) + ':carousel:0');
        for (const id of order.clubs) {
            if (snap.clubs.has(id)) continue;
            const team = gameData.teams[id];
            const m = carouselHire(state, snap, rng, 0, team.rep[2], team.country, false, id);
            if (m) snap.clubs.set(id, { manager: m, since: 0, exit: '' });
        }
        for (const code of order.nations) {
            if (snap.nations.has(code)) continue;
            const m = carouselHire(state, snap, rng, 0, gameData.countries[code].intl, code, true);
            if (m) snap.nations.set(code, { manager: m, since: 0, exit: '' });
        }
        return snap;
    }
    // Season j from season j - 1: who goes, then the hires
    function carouselNext(state, last, j) {
        const order = carouselOrder();
        const snap = { clubs: new Map(last.clubs), nations: new Map(last.nations), free: {}, rest: new Map(last.rest), names: new Set(last.names), token: carouselToken(state, j) };
        for (const s of Object.keys(last.free)) snap.free[s] = last.free[s].slice();
        const rng = seeded(String(state.seed) + ':carousel:' + j);
        const prev = state.seasons[j - 1];
        const result = world && world.seed === String(state.seed) ? world.results[j - 1] : null;
        const league = result && result.comps.find(comp => comp.key === 'league');
        const table = league && Array.isArray(league.table) ? league.table : null;
        const champs = new Set(result ? result.comps.map(comp => comp.champ).filter(Boolean) : []);
        if (table) champs.add(table[0]);
        // The out-of-work managers who retired don't come back
        for (const s of Object.keys(snap.free)) snap.free[s] = snap.free[s].filter(m => m.regen || regenAfter(state, m) > j);
        const vacant = [];
        const gone = new Set();
        const leave = (map, key, entry, why) => {
            vacant.push([map, key, why]);
            gone.add(key);
            const m = entry.manager;
            if (why === 'retired') {
                // A new name of his stars and country takes his place among the managers
                const regen = carouselRegen(state, snap, starsOf(m), m.code, false, j + ':' + key + ':retire');
                if (regen) carouselFree(snap, regen);
            } else if (why !== 'poached') {
                snap.rest.set(m.name, j);
                carouselFree(snap, m);
            }
        };
        for (const id of order.clubs) {
            const entry = snap.clubs.get(id);
            if (!entry) continue;
            const m = entry.manager;
            if (!m.regen && regenAfter(state, m) <= j) {
                leave(snap.clubs, id, entry, 'retired');
                continue;
            }
            const mine = !!prev && prev.teamId === id;
            const pos = table ? table.indexOf(id) : -1;
            const big = gameData.teams[id].rep[2] >= 4;
            const won = (mine && Array.isArray(prev.trophies) && prev.trophies.indexOf('league') >= 0) || champs.has(id);
            const badLuck = rng();
            let chance = CAROUSEL.base + CAROUSEL.tenure * (j - entry.since);
            if (won) chance = CAROUSEL.title;
            else if (mine && prev.relegated) chance = CAROUSEL.drop;
            else if (pos >= 0 ? pos >= table.length / 2 : badLuck < (big ? CAROUSEL.bigShare : CAROUSEL.badShare)) chance = Math.max(chance, big ? CAROUSEL.bad + CAROUSEL.big : CAROUSEL.bad);
            const roll = rng();
            const why = roll < chance ? 'sacked' : rng() < CAROUSEL.quit ? 'quit' : '';
            if (why) leave(snap.clubs, id, entry, why);
        }
        for (const code of order.nations) {
            const entry = snap.nations.get(code);
            if (!entry) continue;
            const m = entry.manager;
            if (!m.regen && regenAfter(state, m) <= j) leave(snap.nations, code, entry, 'retired');
            else if (rng() < CAROUSEL.nation) leave(snap.nations, code, entry, 'sacked');
        }
        // Clubs first (in the order they came: biggest first, a poached manager's club after), then the countries
        for (let k = 0; k < vacant.length; k++) {
            const [map, key, why] = vacant[k];
            const nation = map === snap.nations;
            const size = nation ? gameData.countries[key].intl : gameData.teams[key].rep[2];
            const home = nation ? key : gameData.teams[key].country;
            let m = null;
            if (!nation && size >= 4 && rng() < CAROUSEL.poach) {
                // A big club goes for a manager rated well above his smaller club
                const want = managerRating(size) - 1;
                let best = null;
                for (const [other, entry] of snap.clubs) {
                    const there = gameData.teams[other].rep[2];
                    const stars = starsOf(entry.manager);
                    if (other === key || gone.has(other) || there >= size || stars < want || stars < managerRating(there) + CAROUSEL.poachGap || entry.since === j) continue;
                    if (!best || stars > starsOf(best[1].manager)) best = [other, entry];
                }
                if (best) {
                    m = best[1].manager;
                    gone.add(best[0]);
                    snap.clubs.delete(best[0]);
                    vacant.push([snap.clubs, best[0], 'poached']);
                }
            }
            m = m || carouselHire(state, snap, rng, j, size, home, nation, nation ? null : key);
            if (m) map.set(key, { manager: m, since: j, exit: why });
            else map.delete(key);
        }
        return snap;
    }
    // The managers of season `index` (the career's carousel, worked out up to it and kept; a season whose data changed,
    // such as its results being worked out when it lands, is worked out again from there)
    function carouselAt(state, index) {
        const seed = String(state.seed);
        if (carousel.seed !== seed) carousel = { seed, snaps: [] };
        const snaps = carousel.snaps;
        let ok = snaps.length ? 1 : 0;
        while (ok < snaps.length && ok <= index && snaps[ok].token === carouselToken(state, ok)) ok++;
        if (ok < snaps.length && ok <= index) snaps.length = ok;
        if (!snaps.length) snaps.push(carouselStart(state));
        while (snaps.length <= index) snaps.push(carouselNext(state, snaps[snaps.length - 1], snaps.length));
        return snaps[Math.max(0, index)];
    }
    /**
     * The manager of club `id` in season `index` (null outside the club
     * list): { manager, since, exit } (since = the season he took over, exit =
     * how the one before left), from the carousel.
     */
    function clubManager(state, id, index) {
        if (!gameData.teams[id] || gameData.status !== 'ready') return null;
        return carouselAt(state, Math.max(0, Number(index) || 0)).clubs.get(id) || null;
    }
    // The national team's manager (the carousel's; never your club's: one job each)
    function nationManager(state, nat, index) {
        if (!nat || !nat.fifa_code || gameData.status !== 'ready') return null;
        const entry = carouselAt(state, Math.max(0, Number(index) || 0)).nations.get(nat.fifa_code);
        return entry ? { manager: entry.manager, since: entry.since } : null;
    }
    /**
     * How the coach changes his club's level: +1 when his stars are 2+ above
     * the club's size (or he is a 6-star at one of the biggest clubs), −1 when
     * 2+ below. Boost and Sandbox play the club that much stronger or weaker
     * (decisionClick, seasonResult) and the Living world moves it now and then.
     */
    function coachLift(state, id, index) {
        const info = clubManager(state, id, index);
        if (!info || !info.manager) return 0;
        const rating = ratingOf(info.manager);
        const size = managerRating(repOf(id)[2]);
        return rating >= size + 2 || (rating === 6 && size >= 5) ? 1 : rating <= size - 2 ? -1 : 0;
    }
    /**
     * Managers' stars after each season (world.mgr: a name's change, fading
     * a little every season, so it takes a run): your club's manager by how
     * the season went (the big continental cup, the league, a relegation or a
     * bottom-half finish), the league's and the continental cup's champions'
     * managers up. Then the coaches move their clubs: your club, and the
     * other clubs of your league now and then.
     */
    function rateManagers(state, index) {
        world.mgr = world.mgr || {};
        for (const name of Object.keys(world.mgr)) {
            world.mgr[name] *= 0.85;
            if (Math.abs(world.mgr[name]) < 0.05) delete world.mgr[name];
        }
        const season = state.seasons[index] || {};
        const result = world.results[index];
        const nudge = (info, by) => {
            if (info && info.manager && by) world.mgr[info.manager.name] = clamp((world.mgr[info.manager.name] || 0) + by, -2.5, 1.5);
        };
        const comps = result ? result.comps : [];
        const trophies = Array.isArray(season.trophies) ? season.trophies : [];
        const league = comps.find(comp => comp.key === 'league');
        let by = 0;
        if (trophies.indexOf('continental_primary') >= 0) by += 0.6;
        if (league && league.tier === 1 && league.pos === 1) by += 0.4;
        else if (season.relegated) by -= 0.8;
        else if (league && league.pos > league.table.length / 2) by -= 0.3;
        if (gameData.teams[season.teamId]) nudge(clubManager(state, season.teamId, index), by);
        for (const comp of comps) {
            const champ = comp.key === 'league' && comp.tier === 1 ? comp.table[0] : comp.key === 'continental_primary' ? comp.champ : null;
            if (champ && champ !== season.teamId) nudge(clubManager(state, champ, index), comp.key === 'league' ? 0.3 : 0.5);
        }
    }
    // The coaches move their clubs (Boost and Sandbox, after rateManagers): your club 30% a season with a coach well above it
    // (20% down with one well below), the other clubs of your league half as often. Its own numbers
    function coachWorld(state, index) {
        const season = state.seasons[index] || {};
        const own = gameData.teams[season.teamId];
        if (!own) return;
        const rng = seeded(world.seed + ':coach-world:' + index);
        const clubs = [season.teamId, ...Object.keys(gameData.teams).filter(id => id !== season.teamId && gameData.teams[id].tier === 1 && gameData.teams[id].country === own.country)];
        for (const id of clubs) {
            const lift = coachLift(state, id, index + 1);
            const roll = rng();
            const field = rng() < 0.75 ? 0 : 1;
            const odds = (id === season.teamId ? 1 : 0.5) * (lift > 0 ? 0.3 : 0.2);
            if (lift && roll < odds) moveRep(id, lift > 0 ? field : 0, lift, season.age, 'under ' + clubManager(state, id, index + 1).manager.name.split(' ').slice(-1)[0]);
        }
    }
    // "Manager: [flag] Name ★★★" (purple at 6)
    function managerLine(info) {
        if (!info || !info.manager) return null;
        const m = info.manager;
        const line = el('small', 'c99-manager');
        line.append('Manager: ');
        const flag = m.code && picture(gameData.flags[m.code], '');
        if (flag) {
            flag.className = 'c99-flag';
            line.appendChild(flag);
        }
        line.append(m.name);
        const stars = ratingOf(m);
        // 6 stars, the best of the best, in purple
        line.appendChild(el('span', 'c99-stars' + (stars === 6 ? ' six' : ''), '★'.repeat(stars)));
        return line;
    }
    // Club captain: a regular at the club for a while (4-6 seasons by the stint, a season less for a star; Born leader 2-4)
    // and 24 or older (Born leader 22)
    // (`upto`: as it was after that many seasons, for looking back; now by default)
    function clubCaptain(state, upto) {
        const seasons = state.seasons;
        const now = upto === undefined || upto >= seasons.length;
        const index = now ? seasons.length : upto;
        const last = seasons[index - 1];
        const id = now ? state.currentTeamId : last && last.teamId;
        const age = now ? Number(state.player.age) || 0 : Number(last && last.age) || 0;
        if (!last || (now && state.activeLoan) || last.teamId !== id || last.suspended || coperoGames(last) < 30) return false;
        const leader = perkOn('bornLeader');
        const streak = clubStreak(seasons, index, id);
        const star = (Number(state.player.overall) || 0) >= clubLevel(id) + 6 ? 1 : 0;
        const need = (leader ? 2 : 4) + Math.floor(seeded(String(state.seed) + ':captain:' + id + ':' + (index - streak))() * 3) - star;
        return streak >= need && age >= (leader ? 22 : 24);
    }
    // National team captain: in the squad, 25 or older and 40-70 caps (Born leader: 23 and 25-55)
    function nationCaptain(state, caps, inSquad, age) {
        const leader = perkOn('bornLeader');
        const need = (leader ? 25 : 40) + Math.floor(seeded(String(state.seed) + ':nation-captain')() * 31);
        return inSquad && caps >= need && (Number(age ?? state.player.age) || 0) >= (leader ? 23 : 25);
    }
    // The armband beside a name: gold when you're the captain, a faint outline when you aren't
    function armband(on, team) {
        const band = el('span', 'c99-armband' + (on ? ' on' : ''));
        band.title = on ? 'You’re the ' + team + ' captain.' : 'Not the ' + team + ' captain: the armband comes with seniority.';
        band.setAttribute('role', 'img');
        band.setAttribute('aria-label', on ? team + ' captain' : 'not the ' + team + ' captain');
        return band;
    }

