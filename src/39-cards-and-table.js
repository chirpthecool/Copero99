    // ========================================================================
    // Copero's decision cards and season table: role chips, pips, rows past 39
    // ========================================================================

    // Squad roles in words (goalkeepers have their own), and the chip's colour for each
    const ROLE_NAMES = { starter: 'Starter', high_rotation: 'Rotation', low_rotation: 'Squad player', substitute: 'Bench' };
    const KEEPER_ROLE_NAMES = { starter: 'No. 1', substitute: 'Back-up', third_keeper: 'Third choice' };
    const ROLE_COLOURS = { starter: 'starter', high_rotation: 'rotation', low_rotation: 'squad', substitute: 'bench', third_keeper: 'bench' };
    // Career choices that keep you at your club, and how they change the role there
    const STAY_CHOICES = ['rival_offer:reject', 'fan_backlash:stay_and_fight', 'club_crisis:stay_and_fight', 'tax_trouble:stay_and_fight', 'return_home:stay_abroad', 'unexpected_prospect:mentor'];
    /**
     * What a decision card signs you up for, as Copero will play its first
     * season: { id, role, own, gap, keeper, star, why, trait } or null for a
     * card that doesn't put you at a club. Your OVR there includes the card's
     * own change; Copero's superteam (the Superteam scene too) plays you in
     * rotation, a triumphant return as a starter, mentoring a prospect a step
     * lower, and Boost's role trait moves the rest (as applyRoleTrait does).
     */
    function cardRole(state, event, option) {
        if (!option || option.type === 'retire') return null;
        const key = event.type === 'career_event' ? event.eventKey : '';
        const choice = key + ':' + option.optionKey;
        let id = option.teamId, override = null, shift = 0, delta = 0, why = '';
        if (option.type === 'career_choice') {
            if (choice === 'rival_offer:accept') id = event.rivalTeamId;
            else if (STAY_CHOICES.indexOf(choice) >= 0) id = state.currentTeamId;
            else return null;
            const effect = eventEffect({ type: 'career_event_selected', payload: { eventKey: key, optionKey: option.optionKey } });
            delta = effect ? effect.now : 0;
        }
        if (choice === 'rival_offer:accept' || option.c99Scene === 'join') {
            override = 'high_rotation';
            why = 'A superteam: Copero rotates you for these seasons';
        } else if (key === 'triumphant_return' && option.type === 'join_club') {
            override = 'starter';
            why = 'A hero’s return: Copero starts you for these seasons';
        } else if (choice === 'unexpected_prospect:mentor') {
            shift = -1;
            why = 'Mentoring the prospect: a step lower in the squad';
        }
        if (!id || !gameData.teams[id]) return null;
        const keeper = playerRole(state.player) === 'goalkeeper';
        const gap = clamp((Number(state.player.overall) || 0) + delta, CURVE_MIN_OVR, CURVE_MAX_OVR) - clubLevel(id);
        const own = override || squadRole(gap, keeper, shift);
        const step = !override && !shift && currentMode() ? roleTraitStep(id === state.currentTeamId ? clubStreak(state.seasons, state.seasons.length, id) : 0) : 0;
        const role = override || squadRole(gap, keeper, shift + step);
        const star = role === 'starter' && !override && gap >= starBar(state, id, state.seasons.length) && gap + clubLevel(id) >= starFloor(state, id);
        return { id, role, own, gap, keeper, why, star, trait: role !== own ? ROLE_TRAITS[activeTraits().boostRole] : null };
    }
    // The chip on a decision card: the role (a star well above the club's level, starBar: 7-14 by the squad), the
    // role trait's step with its icon, and on hover the games it brings and why
    function roleChip(card, box, info) {
        let chip = card.querySelector('.c99-card-role');
        if (!info) {
            if (chip) chip.remove();
            return;
        }
        const names = info.keeper ? KEEPER_ROLE_NAMES : ROLE_NAMES;
        // (Boost and Sandbox: the share of the club's usual real matches, applyRealGames)
        const [low, high, factor] = roleGames(info.role, info.keeper, info.id);
        const usual = currentMode() ? usualMatches(info.id) : 0;
        const [lo, hi] = usual ? [low, high].map(n => Math.min(usual, Math.round(n / (MAX_SEASON_APPS * factor) * usual))) : [low, high];
        const label = info.star ? 'Star player' : names[info.role];
        // A sealed boost keeps its role trait secret (the role still includes its step)
        if (boostSealed()) info = { ...info, trait: null };
        const tip = [label + ' at ' + clubName(info.id, true) + ': about ' + lo + '–' + hi + ' games a season', info.why,
            info.trait ? info.trait.icon + ' ' + info.trait.name + ': ' + names[info.own] + ' without it' : ''].filter(Boolean).join('\n');
        const sig = label + '|' + tip;
        if (!chip) chip = el('span', 'c99-card-role c99-own');
        if (chip.parentElement !== box) box.insertBefore(chip, box.querySelector('.c99-card-rep'));
        if (chip.dataset.sig === sig) return;
        chip.dataset.sig = sig;
        chip.className = 'c99-card-role c99-own ' + (info.star ? 'star' : ROLE_COLOURS[info.role === 'substitute' && info.keeper ? 'low_rotation' : info.role]);
        chip.textContent = '';
        chip.appendChild(el('i'));
        chip.append(label);
        if (info.trait) chip.appendChild(el('b', '', info.trait.icon + (info.trait.step > 0 ? '▲' : '▼')));
        setTip(chip, tip);
    }
    // On a narrow card the role chip is just its dot (see decorateCards)
    function fitChip(inner) {
        const chip = inner.isConnected && inner.querySelector('.c99-card-role');
        if (!chip) return;
        chip.classList.remove('c99-compact');
        chip.classList.toggle('c99-compact', inner.scrollWidth > inner.clientWidth + 1);
    }
    const chipSizes = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => fitChip(entry.target))) : null;
    // Each club's three reputations under its name on Copero's own decision cards (in the same order as the options), and
    // the role chip on every card that puts you at a club
    function decorateCards(state) {
        const event = state && state.currentEvent;
        const options = event && Array.isArray(event.options) ? event.options : [];
        const grid = gameData.status === 'ready' && options.length ? decisionGrid(options.length) : null;
        if (!grid) return;
        // Copero's grid holds 4 cards; a fifth went into a third row below the others (Chirp): five club cards sit
        // 3 + 2. A Retire card after two or four cards becomes a short strip across the bottom (Copero hung it alone under
        // two story cards, and cut it off under four)
        const five = options.length === 5;
        const last = options[options.length - 1];
        const strip = (options.length === 3 || five) && !!last && last.type === 'retire';
        if (grid.classList.contains('c99-five') !== five) grid.classList.toggle('c99-five', five);
        if (grid.classList.contains('c99-strip') !== strip) grid.classList.toggle('c99-strip', strip);
        options.forEach((option, i) => {
            const card = grid.children[i];
            const foot = card.querySelector('.relative.z-10') ? card.querySelector('.relative.z-10').lastElementChild : card;
            // A club card's chip goes on its country line, after the code (so it takes no room from the crest); a choice
            // card's under its title
            const chipBox = option && option.type === 'career_choice' ? card.querySelector('.relative.z-20') : foot.querySelector('span.font-bold');
            roleChip(card, chipBox || foot, cardRole(state, event, option));
            // A last adventure's club card says so (adventureClub)
            const note = option && option.c99Adventure ? ['✈️ Last adventure', 'A league that pays well for a big name. The level is easier, so your career winds down more slowly there.'] : null;
            let bye = card.querySelector('.c99-card-farewell');
            if (bye && (!note || bye.dataset.tag !== note[0])) {
                bye.remove();
                bye = null;
            }
            if (note && !bye) {
                bye = el('span', 'c99-card-farewell c99-own', note[0]);
                bye.dataset.tag = note[0];
                bye.title = note[1];
                // Over the foot of the crest (on the country line it ran past the card's edge, next to the role chip)
                const art = card.querySelector('.relative.z-10') && card.querySelector('.relative.z-10').children[1];
                if (art && art !== foot) art.classList.add('c99-tag-host');
                (art && art !== foot ? art : chipBox || foot).appendChild(bye);
            }
            // On a narrow card the chip is just its dot (the role on hover): its words made the league line wider than the
            // card, which pushed the crest off centre
            const chip = card.querySelector('.c99-card-role');
            const inner = card.querySelector('.relative.z-10');
            // (measured when the card changes size or the chip its words, never in a pass: a pass that reads a size
            // after the page changed makes the browser lay out the whole page there and then)
            if (chip && inner && chip.parentElement === chipBox) {
                if (chipSizes && !inner.c99Watched) {
                    inner.c99Watched = true;
                    chipSizes.observe(inner);
                }
                if (chip.c99Fit !== chip.dataset.sig) {
                    chip.c99Fit = chip.dataset.sig;
                    requestAnimationFrame(() => fitChip(inner));
                }
            }
            let tag = card.querySelector('.c99-card-rep');
            const id = option && gameData.teams[option.teamId] ? option.teamId : '';
            if (!id) {
                if (tag) tag.remove();
                return;
            }
            const now = levelOf(id);
            const sig = id + ':' + now.join();
            if (tag && tag.dataset.sig === sig) return;
            if (!tag) {
                tag = el('div', 'c99-card-rep c99-own c99-group');
                foot.appendChild(tag);
            }
            tag.dataset.sig = sig;
            tag.textContent = '';
            // One short row (L / C / W, the name on hover): Copero's card keeps its height, so every extra line shrank the crest
            REP_SHORT.forEach((name, k) => {
                const meter = el('span');
                meter.title = REP_NAMES[k] + ': ' + (now[k] > 5 ? 'superteam, a 6th level past Copero’s top' : Math.max(0, now[k]) + ' of 5') + '. ' + REP_HINTS[k];
                meter.appendChild(document.createTextNode(name[0]));
                for (let n = 1; n <= (now[k] > 5 ? 6 : 5); n++) meter.appendChild(el('i', n > 5 ? 'on six' : n <= now[k] ? 'on' : ''));
                tag.appendChild(meter);
            });
        });
    }
    // Copero's texts in the career's language (its `messages`, found by addSceneTexts): the season table's "Choosing club..."
    let careerMessages = null;
    /**
     * Copero's season table (twenty-second round, Chirp): it draws a row for
     * every age from 16 to 39 from the start, and has none past 39. Now a row
     * shows once its age is reached (the rest keep their place, hidden, and
     * fade in), and the seasons past 39 get rows of their own, copied from
     * Copero's, in a table that scrolls instead of growing (keeping the
     * newest row in view). Copero's row i is the stretch starting at
     * 16 + i × the seasons a decision plays.
     */
    function fitSeasonTable() {
        const shown = seasonLanded() ? liveState || currentState : currentState;
        const lists = new Set([...document.querySelectorAll('[data-career-phase] .career-history-row:not(.c99-row)')].map(row => row.parentElement));
        for (const list of lists) {
            const rows = [...list.children].filter(row => row.classList.contains('career-history-row') && !row.classList.contains('c99-row'));
            const extra = [...list.querySelectorAll(':scope > .c99-row')];
            if (!shown || !shown.player || !rows.length) {
                rows.forEach(row => row.classList.remove('c99-future'));
                extra.forEach(row => row.remove());
                continue;
            }
            const n = PERIOD_SEASONS[shown.mode] || 2;
            const over = shown.phase === 'summary';
            const seasons = Array.isArray(shown.seasons) ? shown.seasons : [];
            const reached = over ? (seasons.length ? Number(seasons[seasons.length - 1].age) || 16 : 16) : Number(shown.player.age) || 16;
            rows.forEach((row, i) => row.classList.toggle('c99-future', CURVE_MIN_AGE + i * n > reached));
            // The stretches past Copero's last row: played ones, and the one being chosen
            const periods = [];
            const last = seasons.reduce((top, s) => Math.max(top, Number(s.periodIndex) || 0), 0);
            for (let p = rows.length + 1; p <= last; p++) periods.push({ p, seasons: seasons.filter(s => Number(s.periodIndex) === p) });
            if (!over && CURVE_MIN_AGE + rows.length * n <= reached) periods.push({ p: Math.max(last, rows.length) + 1, seasons: [], next: true });
            const done = rows.filter(row => row.firstElementChild && row.firstElementChild.classList.contains('bg-card'));
            const template = done[done.length - 1];
            const sigs = periods.map(({ p, seasons: s, next }) => [p, next ? 'next:' + shown.player.overall + ':' + (shown.currentEvent || {}).type : s.map(x => [x.teamId, x.overall, x.trophies.join('+'), x.stats.appearances, x.stats.goals, x.stats.assists, x.stats.cleanSheets, x.stats.goalsConceded].join(',')).join(';'), document.documentElement.classList.contains('dark'), gameData.status].join('|'));
            if (!template || extra.length !== periods.length || extra.some((row, i) => row.dataset.sig !== sigs[i])) {
                extra.forEach(row => row.remove());
                if (template) periods.forEach((period, i) => list.appendChild(seasonRow(template, period, n, shown, sigs[i])));
            }
            // A promotion's arrow (realPromotion) on its stretch's row, after the club's trophies, like Copero's relegation arrow
            [...rows, ...list.querySelectorAll(':scope > .c99-row')].forEach((row, i) => markPromotion(row, seasons.filter(s => Number(s.periodIndex) === i + 1)));
            // Past 39: the rows keep Copero's height and the table scrolls (Copero's own phone layout already scrolls)
            const box = list.parentElement;
            const added = list.querySelectorAll(':scope > .c99-row').length;
            const scrolls = /overflow-y-auto/.test(box.className);
            if (added) {
                const fits = scrolls ? 12 : rows.length;
                const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
                const height = (box.clientHeight - (fits - 1) * gap) / fits;
                // (only when it changes: a style written again is a page change, which runs another pass)
                const template = 'repeat(' + (rows.length + added) + ', ' + height.toFixed(1) + 'px)';
                if (height > 4 && list.style.gridTemplateRows !== template) list.style.gridTemplateRows = template;
                if (list.style.height !== 'auto') list.style.height = 'auto';
                box.classList.add('c99-scrolls');
                if (list.dataset.c99Count !== String(added)) box.scrollTop = box.scrollHeight;
                list.dataset.c99Count = String(added);
            } else if (list.dataset.c99Count) {
                list.style.gridTemplateRows = scrolls ? 'repeat(' + rows.length + ', calc((100% - ' + (11 * 0.125) + 'rem) / 12))' : 'repeat(' + rows.length + ', minmax(0, 1fr))';
                list.style.height = '';
                box.classList.remove('c99-scrolls');
                delete list.dataset.c99Count;
            }
        }
    }
    function markPromotion(row, seasons) {
        const inner = row.querySelector('.relative.z-10');
        const line = inner && inner.children[1] && inner.children[1].children[0];
        let mark = row.querySelector('.c99-up-mark');
        if (!seasons.some(s => s && s.c99Up)) {
            if (mark) mark.remove();
            return;
        }
        if (mark || !line) return;
        mark = el('span', 'c99-up-mark c99-own');
        mark.innerHTML = '<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#16a34a"/><path d="M20 31V10m-9 9 9-9 9 9" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        mark.setAttribute('role', 'img');
        mark.setAttribute('aria-label', promotedWord());
        mark.title = promotedWord();
        line.appendChild(mark);
    }
    // A season-table row past 39, copied from one of Copero's: the stretch's age, club, OVR at its start, trophies, games,
    // goals and assists (a keeper's clean sheets and goals conceded), or the stretch being chosen
    function seasonRow(template, period, n, state, sig) {
        const row = template.cloneNode(true);
        row.classList.add('c99-row', 'c99-own');
        row.classList.remove('c99-future');
        row.dataset.sig = sig;
        const age = CURVE_MIN_AGE + (period.p - 1) * n;
        const first = period.seasons[0];
        const latest = period.seasons[period.seasons.length - 1];
        const team = latest && gameData.teams[latest.teamId];
        const colour = team && /^#[0-9a-f]{6}$/i.test(team.color || '') ? team.color : '';
        const inner = row.querySelector('.relative.z-10');
        const ageBox = inner && inner.children[0];
        const main = inner && inner.children[1];
        if (!ageBox || !main) return row;
        ageBox.textContent = String(age);
        ageBox.style.backgroundColor = period.next ? 'hsl(var(--foreground) / 0.15)' : colour || 'hsl(var(--primary))';
        ageBox.style.color = period.next ? 'hsl(var(--foreground))' : colour ? inkOn(colour) : 'hsl(var(--primary-foreground))';
        const card = row.firstElementChild;
        const tint = card && card.querySelector(':scope > .pointer-events-none.absolute');
        if (tint) tint.style.background = colour && !period.next ? 'linear-gradient(to bottom, color-mix(in srgb, ' + colour + ' 7%, transparent), color-mix(in srgb, ' + colour + ' 4%, transparent))' : 'none';
        if (card && period.next) card.style.background = 'hsl(var(--foreground) / 0.05)';
        const name = main.children[0];
        const grid = main.querySelector(':scope > .grid');
        const crest = name && name.querySelector('img');
        const label = name && name.querySelector('span.truncate');
        const trophies = name && name.querySelector('[class*="-space-x-1"]');
        if (trophies) trophies.textContent = '';
        if (period.next) {
            if (crest) crest.replaceWith(el('span', 'c99-row-ask', '?'));
            if (label) {
                label.textContent = (careerMessages && careerMessages.career && careerMessages.career[state.currentEvent && state.currentEvent.type === 'career_event' ? 'careerEventPending' : 'choosingClub']) || 'Choosing club...';
                label.style.color = 'hsl(var(--muted-foreground))';
            }
        } else {
            if (crest) {
                crest.src = clubLogo(latest.teamId, document.documentElement.classList.contains('dark')) || crest.src;
                crest.alt = team ? team.name : '';
            }
            if (label) label.textContent = team ? team.short || team.name : '-';
            // The stretch's trophies, as Copero shows them after the club's name
            const box = trophies || (name && name.appendChild(el('div', 'flex shrink-0 select-none items-center -space-x-1 lg:gap-0.5 -ml-0.5')));
            for (const season of period.seasons) {
                for (const key of season.trophies || []) {
                    const img = picture(trophyImage(key, season.teamId, season.competitionTier, (state.player.nationality || {}).confederation), '');
                    if (img) box.appendChild(Object.assign(img, { className: 'c99-row-trophy' }));
                }
            }
        }
        if (grid) {
            const badge = grid.children[0];
            const ovr = period.next ? Number(state.player.overall) : Number(first.overall);
            if (badge && badge.lastElementChild) {
                badge.lastElementChild.textContent = String(ovr);
                // Copero's own classes for the tier (its silver is darker in dark mode than the light gradient OVR_TIERS has)
                const all = new Set(COPERO_BADGES.flatMap(([, cls]) => cls.split(' ')));
                [...badge.classList].filter(c => all.has(c) && c !== 'font-black').forEach(c => badge.classList.remove(c));
                badge.style.background = badge.style.color = badge.style.borderColor = '';
                const tier = COPERO_BADGES.find(([from]) => ovr >= from);
                if (tier) badge.classList.add(...tier[1].split(' '));
            }
            const keeper = playerRole(state.player) === 'goalkeeper';
            const sum = (key) => period.seasons.reduce((total, s) => total + (Number((s.stats || {})[key]) || 0), 0);
            [sum('appearances'), sum(keeper ? 'goalsConceded' : 'goals'), sum(keeper ? 'cleanSheets' : 'assists')].forEach((value, i) => {
                const cell = grid.children[i + 1];
                const number = cell && cell.querySelector('span.font-bold');
                if (number) number.textContent = String(value);
                if (cell) cell.style.opacity = period.next ? '0' : '';
            });
        }
        return row;
    }
    // Copero's trophy case (on the career card and the summary) keeps every trophy at full size and never wraps, so a long
    // career's trophies ran past both edges of the card: its trophy groups are shrunk together until they fit
    const TROPHY_ROWS = '[data-career-phase] .select-none.flex-nowrap.pr-1';
    function fitTrophyCase() {
        for (const row of document.querySelectorAll(TROPHY_ROWS)) {
            const groups = [...row.children];
            const pictures = row.querySelectorAll('img');
            if (!pictures.length) continue;
            const sig = groups.length + ':' + [...pictures].map(img => img.getAttribute('src')).join() + ':' + window.innerWidth + ':' + document.documentElement.classList.contains('c99-docked');
            if (row.c99Fit === sig) continue;
            row.c99Fit = sig;
            groups.forEach(group => { group.style.zoom = ''; });
            const need = groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0);
            // The row's own right padding stays, plus a little air
            const room = row.clientWidth - 8;
            if (need > room && room > 0) groups.forEach(group => { group.style.zoom = String(Math.max(0.4, room / need)); });
        }
    }

