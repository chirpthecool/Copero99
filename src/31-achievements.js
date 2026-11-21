    // ========================================================================
    // Copero's achievements: progress, and only Vanilla careers unlock them
    // ========================================================================

    // ACHIEVEMENTS (Copero's own, and how close the career on screen is to each)

    // Copero's 20 achievements, in its order and its words: [code, title, what it takes]
    const ACHIEVEMENTS = [
        ['king_of_america', 'King of America', 'Win Copa América and Copa Libertadores in one career.'],
        ['one_club_legend', 'Club legend', 'Play your entire career for one club and win the Cup, League and continental tournament.'],
        ['europe_owner', 'Owner of Europe', 'Win Europe’s five major leagues in one career.'],
        ['mr_champions', 'Mr. Champions', 'Win five Champions League titles.'],
        ['goat', 'GOAT', 'Win a World Cup, two national-team continental titles, eight Ballons d’Or and four Champions titles.'],
        ['only_pele', 'Only Pelé', 'Win three World Cups and score more than 1,000 goals.'],
        ['black_spider', 'Black Spider', 'Win six goalkeeper of the year awards.'],
        ['net_terror', 'Terror of the Nets', 'Win six Golden Boots.'],
        ['complete_football', 'Complete football', 'Earn every major club and national-team title and award.'],
        ['most_decorated', 'Most decorated ever', 'Win 49 collective titles or more.'],
        ['ringless', 'Ringless', 'Finish a career without collective titles.'],
        ['national_hero', 'National hero', 'Win the World Cup with a country that never has.'],
        ['the_world_is_yours', 'The world is yours', 'Win the World Cup and the Club World Cup.'],
        ['from_the_periphery', 'From the periphery', 'Win a Ballon d’Or as a player from Africa, Asia, North America, Central America or Oceania.'],
        ['ushuaia_to_darien', 'From Ushuaia to Darién', 'Play in all ten national leagues in South America.'],
        ['nomad', 'Nomad', 'Play for clubs across all six continents.'],
        ['from_the_bottom', 'From the bottom', 'Win the league after starting in a third division with the same club.'],
        ['matagigantes', 'Giant killer', 'Win the Libertadores or Champions League with a small club.'],
        ['the_treble', 'The treble', 'Win League, Cup and a continental title in one season.'],
        ['baldosero', 'Baldosero', 'Play for 24 different clubs in one career.']
    ];
    // Copero's lists: the countries that have won the World Cup, the "periphery", Europe's five major leagues
    const WORLD_CUP_WINNERS = ['BRA', 'ITA', 'GER', 'ARG', 'ESP', 'FRA', 'URU', 'ENG'];
    const PERIPHERY = ['CAF', 'AFC', 'OFC', 'CONCACAF'];
    const BIG_FIVE = [['ESP', 'Spain'], ['FRA', 'France'], ['ENG', 'England'], ['ITA', 'Italy'], ['GER', 'Germany']];
    /**
     * How close a career is to one of Copero's achievements, by Copero's own
     * rules (li in the game file, which it checks after every change to the
     * career): { parts: [[label, have, need, how need reads]], done, out, atRetirement }. `out` says why it
     * can't happen in this career any more. Club confederations and countries
     * are the clubs' leagues; a giant killer is a club whose continental
     * standing is 0 now (Copero reads its live clubs).
     */
    function achievementProgress(state, code) {
        const seasons = state.seasons;
        const has = (s, key) => (s.trophies || []).indexOf(key) >= 0;
        const award = (s, key) => (s.awards || []).indexOf(key) >= 0;
        const club = (s) => gameData.teams[s.teamId] || {};
        const nation = (s) => (gameData.countries[String(s.nationality_fifa_code || '').toUpperCase()] || {}).confed || null;
        const count = (test) => seasons.filter(test).length;
        const yes = (test) => (seasons.some(test) ? 1 : 0);
        const big = (s, confed) => has(s, 'continental_primary') && club(s).confed === confed;
        const wc = count(s => has(s, 'world_cup'));
        const ucl = count(s => big(s, 'UEFA'));
        const lib = count(s => big(s, 'CONMEBOL'));
        const copa = count(s => has(s, 'national_continental') && nation(s) === 'CONMEBOL');
        const euro = count(s => has(s, 'national_continental') && nation(s) === 'UEFA');
        const bdo = count(s => award(s, 'ballon_dor'));
        const titles = seasons.reduce((sum, s) => sum + (s.trophies || []).length, 0);
        const nat = state.player.nationality || {};
        const keeper = playerRole(state.player) === 'goalkeeper';
        const first = seasons[0];
        // Goalkeepers win the Golden Glove instead of the Ballon d'Or and the Golden Boot
        const noKeepers = keeper ? 'Goalkeepers win the Golden Glove instead' : '';
        let parts = [], out = '', atRetirement = false;
        switch (code) {
            case 'king_of_america': parts = [['Copa América', copa, 1], ['Copa Libertadores', lib, 1]]; break;
            case 'one_club_legend': {
                const there = first ? seasons.filter(s => s.teamId === first.teamId) : [];
                const name = first ? trophyName('continental_primary', first.teamId) : 'Continental cup';
                parts = [['League', there.some(s => has(s, 'league')) ? 1 : 0, 1], ['Cup', there.some(s => has(s, 'cup')) ? 1 : 0, 1], [name, there.some(s => has(s, 'continental_primary')) ? 1 : 0, 1]];
                if (first && (there.length < seasons.length || (state.log || []).some(e => e && (e.type === 'transfer' || e.type === 'loan_started')))) out = 'You’ve played for another club';
                atRetirement = true;
                break;
            }
            case 'europe_owner': parts = BIG_FIVE.map(([country, name]) => [name, yes(s => has(s, 'league') && s.competitionTier === 1 && club(s).country === country), 1]); break;
            case 'mr_champions': parts = [['Champions Leagues', ucl, 5]]; break;
            case 'goat':
                parts = [['World Cup', wc, 1], [nat.confederation === 'UEFA' ? 'Euros' : 'Copas América', Math.max(copa, euro), 2], ['Ballons d’Or', bdo, 8], ['Champions Leagues', ucl, 4]];
                out = noKeepers || (copa < 2 && euro < 2 && ['UEFA', 'CONMEBOL'].indexOf(nat.confederation) < 0 ? 'Only Europe’s and South America’s countries play those titles' : '');
                break;
            case 'only_pele': parts = [['World Cups', wc, 3], ['goals', Number((state.totals || {}).goals) || 0, 1001, '1,000+']]; break;
            case 'black_spider': parts = [['Golden Gloves', count(s => award(s, 'golden_glove')), 6]]; out = keeper ? '' : 'Only goalkeepers win it'; break;
            case 'net_terror': parts = [['Golden Boots', count(s => award(s, 'golden_boot')), 6]]; out = noKeepers; break;
            case 'complete_football':
                parts = [['World Cup', wc ? 1 : 0, 1], ['Copa América or Euro', copa || euro ? 1 : 0, 1], ['Copa Libertadores', lib ? 1 : 0, 1], ['Champions League', ucl ? 1 : 0, 1],
                    ['South American league and cup', yes(s => club(s).confed === 'CONMEBOL' && has(s, 'league') && has(s, 'cup')), 1],
                    ['European league and cup', yes(s => club(s).confed === 'UEFA' && has(s, 'league') && has(s, 'cup')), 1],
                    ['Ballon d’Or', bdo ? 1 : 0, 1], ['Golden Boot', yes(s => award(s, 'golden_boot')), 1]];
                out = noKeepers;
                break;
            case 'most_decorated': parts = [['Trophies', titles, 49]]; break;
            case 'ringless': parts = [['No trophies', titles ? 0 : 1, 1]]; out = titles ? 'You’ve won a trophy' : ''; atRetirement = true; break;
            case 'national_hero': {
                const done = yes(s => has(s, 'world_cup') && WORLD_CUP_WINNERS.indexOf(String(s.nationality_fifa_code || '').toUpperCase()) < 0);
                parts = [['World Cup', done, 1]];
                if (!done && WORLD_CUP_WINNERS.indexOf(nat.fifa_code) >= 0) out = 'Your country has won it before';
                break;
            }
            case 'the_world_is_yours': parts = [['World Cup', wc ? 1 : 0, 1], ['Club World Cup', yes(s => has(s, 'club_world_cup')), 1]]; break;
            case 'from_the_periphery': {
                const done = yes(s => award(s, 'ballon_dor') && PERIPHERY.indexOf(nation(s)) >= 0);
                parts = [['Ballon d’Or', done, 1]];
                out = noKeepers || (!done && PERIPHERY.indexOf(nat.confederation) < 0 ? 'Your country isn’t from those continents' : '');
                break;
            }
            case 'ushuaia_to_darien': parts = [['South American leagues', new Set(seasons.filter(s => club(s).confed === 'CONMEBOL').map(s => club(s).country)).size, 10]]; break;
            case 'nomad': parts = [['Continents', new Set(seasons.map(s => club(s).confed).filter(Boolean)).size, 6]]; break;
            case 'from_the_bottom':
                parts = [['Started in a third division', first && first.competitionTier === 3 ? 1 : 0, 1],
                    ['Its top flight, with that club', first && first.competitionTier === 3 && seasons.some(s => s.teamId === first.teamId && s.competitionTier === 1 && has(s, 'league') && club(s).country === club(first).country) ? 1 : 0, 1]];
                if (first && first.competitionTier !== 3) out = 'You started above the third division';
                break;
            case 'matagigantes': parts = [['With a small club', yes(s => (big(s, 'UEFA') || big(s, 'CONMEBOL')) && repOf(s.teamId)[1] === 0), 1]]; break;
            case 'the_treble': parts = [['League, cup and continental cup in a season', yes(s => has(s, 'league') && has(s, 'cup') && has(s, 'continental_primary')), 1]]; break;
            case 'baldosero': parts = [['Clubs', new Set(seasons.map(s => s.teamId)).size, 24]]; out = state.mode === 'long' ? '' : 'Only in Intense mode'; break;
            default: break;
        }
        const met = parts.every(([, have, need]) => have >= need);
        return { parts: parts, done: !out && met && (!atRetirement || state.phase === 'summary'), out: out, atRetirement: atRetirement && met && !out };
    }
    // Copero's achievement pictures (its achievements window has one per achievement, in a row of its own)
    const ACH_PICTURES = 'img[src*="/career-simulator/achievements/"]';
    /*
     * Achievements stay off the Copero account in Boost and Sandbox careers (Chirp: the script changes those careers,
     * so their achievements shouldn't count). Copero checks the career after every change and hands what it earned to a
     * sync function of its page, which queues the codes in its outbox (localStorage) and posts them to its server
     * (ACH_BATCH). Three guards, so nothing slips through:
     * 1. that sync function (a useCallback whose code builds `detectedAt`) is swapped for one that does nothing while a
     *    Boost or Sandbox career is on screen (wrapAchievementSync, every pass);
     * 2. the codes such a career earns (`achBlocked`, worked out from the coming season too, so before Copero sees them)
     *    are taken out of the request that sends achievements, by a fetch filter in the page itself (React can make a
     *    new sync function before a pass swaps it: Copero refreshes every 6 hours and when you log in);
     * 3. and out of Copero's outbox (localStorage and the page's own copy of it).
     * A code a Vanilla career earns is allowed again, and a code already waiting in the outbox when a Boost or Sandbox
     * career earns it was earned before, so it isn't blocked.
     */
    const ACH_OUTBOX = 'copero:career-achievement-outbox:v2:';
    const ACH_BATCH = '/career-simulator/achievements/batch';
    const achBlocked = new Set(storeGet('copero99_ach_blocked') || []);
    const achievementsOff = () => stats.picked === 'boost' || stats.picked === 'sandbox';
    const syncTest = new WeakMap();   // function → whether it is Copero's achievement sync
    const syncGuard = new WeakMap();  // Copero's sync function → our stand-in
    let achFilter = false;
    function guardAchievements(states) {
        if (!achFilter && document.documentElement) {
            achFilter = true;
            const script = document.createElement('script');
            script.textContent = '(' + pageAchievementFilter.toString() + ')(' + JSON.stringify(ACH_BATCH) + ');';
            (document.head || document.documentElement).appendChild(script);
            script.remove();
        }
        let changed = false;
        if (gameData.status === 'ready' && (achievementsOff() || vanillaCareer())) {
            const waiting = achievementsOff() ? outboxCodes() : null;
            for (const state of states) {
                if (!state || !state.player || !Array.isArray(state.seasons) || String(state.seed) !== stats.seed) continue;
                for (const [code] of ACHIEVEMENTS) {
                    let done = false;
                    try { done = achievementProgress(state, code).done; } catch (e) { done = false; }
                    if (!done) continue;
                    if (waiting && !achBlocked.has(code) && !waiting.has(code)) { achBlocked.add(code); changed = true; }
                    if (!waiting && achBlocked.delete(code)) changed = true;
                }
            }
        }
        if (changed) storeSet('copero99_ach_blocked', [...achBlocked]);
        const list = [...achBlocked].join(' ');
        if (document.documentElement.getAttribute('data-c99-blocked-ach') !== list) document.documentElement.setAttribute('data-c99-blocked-ach', list);
        wrapAchievementSync();
        if (achBlocked.size) cleanOutbox();
    }
    // The codes waiting in Copero's outbox (any account)
    function outboxCodes() {
        const out = new Set();
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || key.indexOf(ACH_OUTBOX) !== 0) continue;
                const items = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(items)) items.forEach(item => item && out.add(item.code));
            }
        } catch (e) { /* storage blocked: nothing waiting */ }
        return out;
    }
    function cleanOutbox() {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (!key || key.indexOf(ACH_OUTBOX) !== 0) continue;
                const items = JSON.parse(localStorage.getItem(key));
                if (!Array.isArray(items)) continue;
                const keep = items.filter(item => !item || !achBlocked.has(item.code));
                if (keep.length === items.length) continue;
                if (keep.length) localStorage.setItem(key, JSON.stringify(keep));
                else localStorage.removeItem(key);
            }
        } catch (e) { /* storage blocked */ }
    }
    // Walks the career page's components: swaps Copero's sync function, and takes blocked codes out of its outbox copy
    function wrapAchievementSync() {
        const node = document.querySelector('[data-career-phase]');
        const key = node && Object.keys(node).find(k => k.startsWith('__reactFiber$'));
        for (let fiber = key ? node[key] : null; fiber; fiber = fiber.return) {
            for (const f of [fiber, fiber.alternate]) {
                for (let hook = f && f.memoizedState; hook && typeof hook === 'object' && 'next' in hook && 'queue' in hook; hook = hook.next) {
                    const value = hook.memoizedState;
                    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'function' && isAchievementSync(value[0])) {
                        value[0] = guardedSync(value[0]);
                    } else if (achBlocked.size && value && typeof value === 'object' && Object.prototype.toString.call(value.current) === '[object Map]') {
                        // (not `instanceof Map`: the page's Map isn't this script's)
                        for (const [code, item] of [...value.current]) {
                            if (item && typeof item === 'object' && 'detectedAt' in item && achBlocked.has(code)) value.current.delete(code);
                        }
                    }
                }
            }
        }
    }
    function isAchievementSync(fn) {
        if (fn.c99Guard) return false;
        if (!syncTest.has(fn)) {
            const code = String(fn);
            syncTest.set(fn, code.indexOf('detectedAt') >= 0 && code.indexOf('toISOString') >= 0);
        }
        return syncTest.get(fn);
    }
    function guardedSync(sync) {
        if (!syncGuard.has(sync)) {
            const guard = function () {
                if (achievementsOff()) return undefined;
                return sync.apply(this, arguments);
            };
            guard.c99Guard = true;
            syncGuard.set(sync, guard);
        }
        return syncGuard.get(sync);
    }
    // Runs in the page itself (a userscript's fetch isn't the page's): takes the codes listed on <html> out of
    // Copero's achievement request, and answers it itself when nothing is left to send
    function pageAchievementFilter(batch) {
        if (window.__c99AchievementFilter) return;
        window.__c99AchievementFilter = true;
        const send = window.fetch;
        window.fetch = function (input, init) {
            try {
                const url = typeof input === 'string' ? input : (input && input.url) || '';
                const blocked = (document.documentElement.getAttribute('data-c99-blocked-ach') || '').split(' ').filter(Boolean);
                if (url.indexOf(batch) >= 0 && blocked.length && init && typeof init.body === 'string') {
                    const body = JSON.parse(init.body);
                    const all = Array.isArray(body.achievements) ? body.achievements : [];
                    const keep = all.filter(item => !item || blocked.indexOf(item.code) < 0);
                    if (keep.length !== all.length) {
                        if (!keep.length) {
                            return Promise.resolve(new Response(JSON.stringify({ achievements: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                        init = Object.assign({}, init, { body: JSON.stringify(Object.assign({}, body, { achievements: keep })) });
                    }
                }
            } catch (e) { /* not ours to judge: send it as it was */ }
            return send.call(this, input, init);
        };
    }
    /**
     * Copero's own achievements window (the gold medal next to the Copero99
     * diamond opens it): each achievement gets this career's progress by
     * Copero's own rules under its description: where it stands (Done, %, At
     * retirement, Out of reach), each part (ticked, or "have / need") and a
     * bar. Copero marks the ones already on the account with their date.
     * Nothing outside a career.
     */
    function decorateAchievements(state) {
        const pictures = [...document.querySelectorAll('article ' + ACH_PICTURES)];
        if (!pictures.length) return;
        const ready = !!state && !!state.player && gameData.status === 'ready';
        const sig = ready ? JSON.stringify([state.seed, state.step, state.seasons.length, state.phase]) : '';
        for (const img of pictures) {
            const article = img.closest('article');
            const text = img.nextElementSibling;
            let box = article.querySelector('.c99-ach');
            const code = (img.getAttribute('src').match(/achievements\/([^/.]+)\.jpg/) || [])[1];
            if (!ready || !code || !text || !ACHIEVEMENTS.some(([key]) => key === code)) {
                if (box) box.remove();
                article.classList.remove('c99-ach-row');
                continue;
            }
            if (box && box.dataset.sig === sig) continue;
            if (!box) box = text.appendChild(el('div', 'c99-ach c99-own c99-group'));
            article.classList.add('c99-ach-row');
            box.dataset.sig = sig;
            box.textContent = '';
            const progress = achievementProgress(state, code);
            const share = progress.parts.reduce((sum, [, have, need]) => sum + Math.min(1, have / need), 0) / Math.max(1, progress.parts.length);
            const line = box.appendChild(el('div', 'c99-ach-line'));
            const status = progress.done ? ['Done', 'win'] : progress.out ? ['Out of reach', 'out'] : progress.atRetirement ? ['At retirement', 'deep'] : [Math.round(share * 100) + '%', 'plain'];
            const chip = line.appendChild(el('span', 'c99-ach-status ' + status[1], status[0]));
            chip.title = progress.out || (progress.atRetirement ? 'Copero counts it when you retire' : progress.done ? 'Done in this career' : 'How far this career is');
            for (const [label, have, need, needText] of progress.parts) {
                const done = have >= need;
                // A yes/no part is ticked; a count shows how far ("812 / 1,000+ goals")
                const shown = need === 1 ? (done ? '✓ ' : '') + label : (needText ? have : Math.min(have, need)) + ' / ' + (needText || need) + ' ' + label;
                line.appendChild(el('span', done ? 'on' : '', shown));
            }
            if (!progress.done && !progress.out) box.appendChild(el('div', 'c99-ach-bar')).appendChild(el('i')).style.width = Math.round(share * 100) + '%';
            box.classList.toggle('out', !!progress.out);
        }
    }

