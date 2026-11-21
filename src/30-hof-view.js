    // ========================================================================
    // The Hall of Fame tab and a saved career's window
    // ========================================================================

    /**
     * The Hall of Fame tab: records plus one row per finished career (newest
     * first). A row opens the full career card.
     */
    function renderHofList() {
        if (!menuElement) return;
        const box = menuElement.querySelector('#copero99-hof-list');
        // Rebuilt only when the list, the game file or the site's theme (crests) changed: 50 rows of pictures every time the
        // panel redrew made the page lag
        const version = [hofVersion, hof.length, gameData.status, document.documentElement.classList.contains('dark')].join(':');
        if (box.dataset.version === version) return;
        box.dataset.version = version;
        box.textContent = '';
        menuElement.querySelector('#copero99-hof-clear').style.display = hof.length ? '' : 'none';
        if (hof.length === 0) {
            box.appendChild(el('div', 'hof-empty', 'No finished careers yet. Play a career until you retire and save it here.'));
            return;
        }

        const records = el('div', 'hof-records');
        for (const [label, key] of [['Most goals', 'goals'], ['Most trophies', 'trophyCount'], ['Highest peak', 'peak']]) {
            const best = hof.reduce((a, b) => ((Number(b[key]) || 0) > (Number(a[key]) || 0) ? b : a));
            const record = el('div', 'hof-record');
            record.appendChild(el('small', '', label));
            record.appendChild(el('b', '', String(best[key])));
            record.appendChild(el('span', '', best.name));
            records.appendChild(record);
        }
        box.appendChild(records);

        for (const entry of hof.slice().reverse()) {
            const row = el('button', 'hof-row');
            row.type = 'button';
            row.appendChild(ovrBadge(entry.peak, 'small'));
            const flagSrc = entry.flag || gameData.flags[entry.code] || gameData.flags[entry.country];
            if (flagSrc) {
                const flag = el('span', 'hof-flag');
                flag.style.backgroundImage = 'url(' + JSON.stringify(flagSrc) + ')';
                row.appendChild(flag);
            }
            const text = el('span', 'hof-row-text');
            const top = el('span', 'hof-row-top');
            const mini = picture(flagSrc, entry.country);
            if (mini) {
                mini.className = 'hof-mini-flag';
                top.appendChild(mini);
            }
            top.appendChild(el('b', '', [entry.name, entry.position].filter(Boolean).join(' · ')));
            const best = el('span', 'hof-trophies c99-group');
            bestTrophies(entry).forEach(([name, img], i) => {
                const pic = picture(img, name);
                if (pic && i >= 3) pic.classList.add('hof-extra');
                if (pic) best.appendChild(pic);
            });
            top.appendChild(best);
            text.appendChild(top);
            text.appendChild(el('small', '', ['Retired at ' + entry.retiredAt, entry.goals + ' goals', entry.assists + ' assists', (entry.ntApps || 0) + ' caps',
                entry.trophyCount + (entry.trophyCount === 1 ? ' trophy' : ' trophies')].join(' · ')));
            row.appendChild(text);
            // Every row is the same height: 4 crests and one line of each text; hovering shows the rest
            const crests = el('span', 'hof-crests c99-group');
            const seen = new Set();
            for (const stint of entry.stints || []) {
                if (seen.has(stint.teamId)) continue;
                seen.add(stint.teamId);
                const crest = picture(clubLogo(stint.teamId), stint.club);
                if (crest) crests.appendChild(crest);
            }
            if (crests.children.length > 4) {
                const hidden = [...crests.children].slice(3);
                hidden.forEach(crest => crest.classList.add('hof-extra'));
                crests.appendChild(el('span', 'hof-more', '+' + hidden.length));
            }
            row.appendChild(crests);
            row.addEventListener('click', () => showHofCareer(entry));
            box.appendChild(row);
        }
    }
    /**
     * The clubs of a Hall of Fame career, one row each, in the colours of
     * Copero's own summary: the club's colour, its crest (also big and faded
     * behind), the ages, games, goals and assists there, and the trophies it
     * won there (national team trophies and awards aren't the club's). A club
     * played for twice is one row.
     */
    function clubCards(entry) {
        const clubs = new Map();
        for (const stint of entry.stints) {
            const club = clubs.get(stint.teamId) || { name: stint.club, spells: [], seasons: 0, apps: 0, goals: 0, assists: 0, wins: new Map() };
            club.spells.push(stint.from === stint.to ? String(stint.from) : stint.from + '–' + stint.to);
            club.seasons += stint.seasons;
            clubs.set(stint.teamId, club);
        }
        for (const season of entry.seasonList) {
            const club = clubs.get(season.teamId);
            if (!club) continue;
            club.apps += Number(season.apps) || 0;
            club.goals += Number(season.goals) || 0;
            club.assists += Number(season.assists) || 0;
            (season.trophies || []).forEach((key, i) => {
                if (NATIONAL_TROPHIES.indexOf(key) >= 0) return;
                const name = (season.won || [])[i] || TROPHY_NAMES[key] || key;
                const win = club.wins.get(name) || { img: trophyImage(key, season.teamId, season.tier, entry.confed), count: 0 };
                win.count++;
                club.wins.set(name, win);
            });
        }
        const grid = el('div', 'hofc-clubs');
        for (const [teamId, club] of clubs) {
            const card = el('div', 'hofc-clubcard');
            const team = gameData.teams[teamId];
            if (team && team.color) card.style.setProperty('--club', team.color);
            // The cards are always dark, so they get the crests made for dark backgrounds
            const mark = picture(clubLogo(teamId, true), '');
            if (mark) {
                mark.className = 'hofc-clubcard-mark';
                card.appendChild(mark);
            }
            const crest = picture(clubLogo(teamId, true), '');
            if (crest) {
                crest.className = 'hofc-clubcard-crest';
                card.appendChild(crest);
            }
            const text = el('div', 'hofc-clubcard-text');
            text.appendChild(el('b', '', club.name));
            text.appendChild(el('small', '', (club.spells.length > 1 || club.spells[0].indexOf('–') >= 0 ? 'Ages ' : 'Age ') + club.spells.join(', ') +
                ' · ' + club.seasons + (club.seasons === 1 ? ' season' : ' seasons')));
            card.appendChild(text);
            const numbers = el('div', 'hofc-clubcard-stats');
            for (const [label, value] of [['APPS', club.apps], ['GOALS', club.goals], ['AST', club.assists]]) {
                const stat = el('span');
                stat.appendChild(el('small', '', label));
                stat.appendChild(el('b', '', String(value)));
                numbers.appendChild(stat);
            }
            card.appendChild(numbers);
            if (club.wins.size) {
                const wins = el('div', 'hofc-clubcard-wins c99-group');
                for (const [name, win] of club.wins) {
                    const item = el('span');
                    item.title = name + (win.count > 1 ? ' ×' + win.count : '');
                    // The picture has no hover text of its own, so the box says how often it was won
                    const img = picture(win.img, '');
                    if (img) img.alt = name;
                    item.appendChild(img || el('span', 'win-name', name));
                    if (win.count > 1) item.appendChild(el('em', '', '×' + win.count));
                    wins.appendChild(item);
                }
                text.appendChild(wins);
            }
            grid.appendChild(card);
        }
        return grid;
    }
    /**
     * One finished career: its Icon card, trophy case and clubs on the left,
     * every season on the right (like the game's career screen).
     */
    function showHofCareer(entry) {
        const root = el('div', 'hofc');
        const side = el('div', 'hofc-side');

        const cardBox = el('div', 'icard-wrap');
        cardBox.appendChild(buildIconCard(entry));
        cardBox.appendChild(el('div', 'icard-note', [entry.country, careerKind(entry), 'saved ' + entry.savedAt].filter(Boolean).join(' · ')));
        const rolled = boostRoll(entry.boost, entry.position === 'GK');
        if (rolled) cardBox.appendChild(rolled);
        side.appendChild(cardBox);

        // Every trait the career earned (the card has room for three), listed by rarity
        const traits = careerTraits(careerFacts(entry), true);
        if (traits.length) {
            side.appendChild(el('div', 'hofc-label', 'Traits'));
            const list = el('div', 'hofc-traits');
            for (const [rarity, label] of RARITIES) {
                const group = traits.filter(([name]) => traitRarity(name) === rarity);
                if (!group.length) continue;
                const row = el('div', 'hofc-rarity ' + rarity);
                row.appendChild(el('small', '', label));
                const chips = el('div', 'hofc-rarity-chips c99-group');
                for (const [name, , meaning] of group) {
                    const trait = el('span', 'hofc-trait ' + rarity);
                    trait.title = meaning;
                    trait.appendChild(el('b', '', name + '+'));
                    chips.appendChild(trait);
                }
                row.appendChild(chips);
                list.appendChild(row);
            }
            side.appendChild(list);
        }

        // Trophy case: every trophy and award, how often it was won
        side.appendChild(el('div', 'hofc-label', 'Trophy case'));
        const cabinet = el('div', 'hofc-cabinet c99-group');
        const counted = new Map();
        if (entry.seasonList) {
            for (const season of entry.seasonList) {
                for (const [name, img] of seasonWins(entry, season)) {
                    const item = counted.get(name) || { img: null, count: 0 };
                    item.count++;
                    item.img = item.img || img;
                    counted.set(name, item);
                }
            }
        } else {
            for (const counts of [entry.trophies, entry.awards]) {
                for (const key of Object.keys(counts || {})) counted.set(TROPHY_NAMES[key] || key, { img: null, count: counts[key] });
            }
        }
        if (counted.size === 0) cabinet.appendChild(el('div', 'muted', 'Empty trophy case'));
        for (const [name, item] of counted) {
            const trophy = el('div', 'hofc-trophy');
            // The name is written under it, so no hover box
            const img = picture(item.img, '');
            if (img) trophy.appendChild(img);
            trophy.appendChild(el('b', '', '×' + item.count));
            trophy.appendChild(el('small', '', name));
            cabinet.appendChild(trophy);
        }
        side.appendChild(cabinet);

        // Clubs: one card each, like Copero's own end-of-career summary (older entries without seasons: one row per spell)
        side.appendChild(el('div', 'hofc-label', 'Clubs'));
        if (entry.stints && entry.seasonList) {
            side.appendChild(clubCards(entry));
        } else if (entry.stints) {
            for (const stint of entry.stints) {
                const club = el('div', 'hofc-club');
                const crest = picture(clubLogo(stint.teamId), '');
                if (crest) club.appendChild(crest);
                const text = el('div', 'hofc-club-text');
                text.appendChild(el('b', '', stint.club));
                const ages = stint.from === stint.to ? 'Age ' + stint.from : 'Ages ' + stint.from + '–' + stint.to;
                text.appendChild(el('small', '', ages + ' · ' + stint.seasons + (stint.seasons === 1 ? ' season' : ' seasons')));
                const won = Object.keys(stint.won || {}).map(name => name + (stint.won[name] > 1 ? ' ×' + stint.won[name] : '')).join(', ');
                text.appendChild(el('small', '', won ? 'Won: ' + won : 'No trophies'));
                club.appendChild(text);
                side.appendChild(club);
            }
        } else {
            side.appendChild(el('div', 'hofc-club', (entry.clubs || []).map(prettyName).join(' → ')));
        }
        root.appendChild(side);

        // Every season, like the table on the right of the career screen
        const seasonsBox = el('div', 'hofc-seasons');
        if (entry.seasonList) {
            const table = el('table');
            const head = el('tr');
            for (const title of ['Age', 'Club', 'OVR', 'Apps', 'Goals', 'Ast', 'Won']) head.appendChild(el('th', '', title));
            table.appendChild(head);
            for (const season of entry.seasonList) {
                const row = el('tr');
                const ageCell = el('td');
                const ageBox = el('span', 'age-box', String(season.age));
                const team = gameData.teams[season.teamId];
                if (team && team.color) {
                    ageBox.style.background = team.color;
                    ageBox.style.color = inkOn(team.color);
                }
                ageCell.appendChild(ageBox);
                row.appendChild(ageCell);
                const clubCell = el('td');
                const clubBox = el('span', 'club-cell');
                const crest = picture(clubLogo(season.teamId), '');
                if (crest) clubBox.appendChild(crest);
                clubBox.appendChild(el('span', '', season.club));
                clubCell.appendChild(clubBox);
                row.appendChild(clubCell);
                const ovrCell = el('td');
                ovrCell.appendChild(ovrBadge(season.ovr, 'small'));
                row.appendChild(ovrCell);
                for (const value of [season.apps, season.goals, season.assists]) row.appendChild(el('td', 'num', String(value)));
                const winsCell = el('td');
                const wins = el('span', 'wins c99-group');
                for (const [name, img] of seasonWins(entry, season)) {
                    wins.appendChild(picture(img, name) || el('span', 'win-name', name));
                }
                winsCell.appendChild(wins);
                row.appendChild(winsCell);
                table.appendChild(row);
            }
            seasonsBox.appendChild(table);
        } else {
            seasonsBox.appendChild(el('div', 'hof-empty', "This career was saved by an older version, so its season-by-season details weren't recorded. Careers you finish from now on show every season here."));
        }
        root.appendChild(seasonsBox);

        openModal('Hall of Fame', '', { body: root, wide: true, buttons: [['Delete career', 'btn danger', () => confirmHofDelete(entry)]] });
        // Wide windows scroll the card side and the seasons on their own; focus lets the arrow keys / Page Down scroll the seasons, not the page behind
        side.tabIndex = 0;
        seasonsBox.tabIndex = 0;
        seasonsBox.focus({ preventScroll: true });
    }

