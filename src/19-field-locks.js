    // ========================================================================
    // Sandbox's Switch values (field locks)
    // ========================================================================

    /**
     * Walks a dot path from the career state. Only follows keys that already
     * exist (nothing is ever created). Returns { obj, key } or null.
     */
    function resolvePath(root, path) {
        const parts = path.split('.');
        let obj = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (obj === null || typeof obj !== 'object') return null;
            if (!Object.prototype.hasOwnProperty.call(obj, parts[i])) return null;
            obj = obj[parts[i]];
        }
        if (obj === null || typeof obj !== 'object') return null;
        const key = parts[parts.length - 1];
        if (!Object.prototype.hasOwnProperty.call(obj, key)) return null;
        return { obj: obj, key: key };
    }
    /**
     * Lists the number, true/false and text fields in the career state as
     * [path, value] pairs for the field lock picker. Lists only show their
     * first 3 items.
     */
    function listFields(root) {
        const out = [];
        const walk = (obj, prefix, depth) => {
            if (depth > 5 || out.length >= 500) return;
            const keys = Object.keys(obj);
            for (const key of Array.isArray(obj) ? keys.slice(0, 3) : keys) {
                const path = prefix ? prefix + '.' + key : key;
                if (!isValidPath(path)) continue;
                const value = obj[key];
                const type = typeof value;
                if (type === 'number' || type === 'boolean' || type === 'string') {
                    out.push([path, value]);
                } else if (value && type === 'object') {
                    walk(value, path, depth + 1);
                }
            }
        };
        walk(root, '', 0);
        return out;
    }
    /**
     * Keeps every locked field at its value. A lock is only applied when the
     * field exists and already holds the same kind of value (number, boolean
     * or text), so a typo can't break the game state.
     */
    function applyLocks(state) {
        const statuses = {};
        for (const lock of config.locks) {
            const target = resolvePath(state, lock.path);
            if (!target) {
                statuses[lock.path] = 'missing';
                continue;
            }
            const existing = target.obj[target.key];
            if (existing === null || typeof existing !== typeof lock.value) {
                statuses[lock.path] = 'type';
                continue;
            }
            try {
                if (existing !== lock.value) {
                    target.obj[target.key] = lock.value;
                    changed = true;
                }
                // The game works out a new market value every season and its summary shows the highest one, so every season is locked too
                if (lock.path === 'player.marketValue') {
                    for (const season of state.seasons) {
                        if (season && typeof season.marketValue === 'number' && season.marketValue !== lock.value) {
                            season.marketValue = lock.value;
                            changed = true;
                        }
                    }
                }
                statuses[lock.path] = 'ok';
            } catch (e) {
                statuses[lock.path] = 'error';
            }
        }
        lockStatus = statuses;
    }
    // Field locks

    const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
    // One-tap buttons above the search box: [path, icon, name, { choices: [[value, label]], range: [min, max], help }]
    const QUICK_LOCKS = [
        ['player.marketValue', '💰', 'Market value', { range: [0, 5e9] }],
        ['player.preferredNumber', '👕', 'Shirt number', { range: [1, 99] }],
        ['player.lastName', '✏️', 'Player name', {}],
        ['player.preferredFoot', '🦶', 'Preferred foot', { choices: [['right', 'Right'], ['left', 'Left']] }],
        ['player.position', '📍', 'Position', { choices: POSITIONS.map(p => [p, p]), help: 'Changes the position shown; how the game uses you stays the same.' }]
    ];
    const quickLock = (path) => QUICK_LOCKS.find(([quickPath]) => quickPath === path);
    // How a value reads to people: list labels ("Left"), money for market values, numbers with commas
    function lockLabel(path, value) {
        const choice = (((quickLock(path) || [])[3] || {}).choices || []).find(([option]) => option === value);
        if (choice) return choice[1];
        if (typeof value === 'number' && /(^|\.)marketValue$/.test(path)) return money(value);
        return showValue(value);
    }
    // Quick picks show what the open career has right now, e.g. "👕 Shirt number 10"
    function refreshQuickChips(state) {
        for (const chip of menuElement.querySelectorAll('#copero99-lock-quick .chip')) {
            const target = state && resolvePath(state, chip.dataset.path);
            const value = target ? target.obj[target.key] : undefined;
            chip.querySelector('.chip-value').textContent = isLockable(value) ? lockLabel(chip.dataset.path, value) : '';
        }
    }
    // "player.marketValue" -> "Player › Market value", "seasons.0.stats.goals" -> "Seasons › #1 › Stats › Goals"
    function friendlyPath(path) {
        const quick = quickLock(path);
        if (quick) return quick[2];
        return path.split('.').map(part => (/^\d+$/.test(part)
            ? '#' + (Number(part) + 1)
            : part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())
        )).join(' › ');
    }
    function showValue(value) {
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value.toLocaleString('en-US');
        return String(value);
    }
    const isLockable = (value) => ['number', 'boolean', 'string'].indexOf(typeof value) >= 0;
    function renderLockResults(query) {
        const box = menuElement.querySelector('#copero99-lock-results');
        box.textContent = '';
        const typed = query.trim();
        const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 0) return;
        if (!currentState) {
            box.appendChild(el('div', 'hint', 'Open a career to search its values.'));
            return;
        }
        const fields = listFields(currentState).filter(([path]) => canSwitch(path));
        // An exact path typed by hand also works (the list only covers the first 3 items of each list)
        const exact = isValidPath(typed) && canSwitch(typed) && resolvePath(currentState, typed);
        if (exact && isLockable(exact.obj[exact.key]) && !fields.some(([path]) => path === typed)) {
            fields.unshift([typed, exact.obj[exact.key]]);
        }
        const matches = fields.filter(([path]) => {
            const text = (friendlyPath(path) + ' ' + path).toLowerCase();
            return words.every(word => text.includes(word));
        }).slice(0, 30);
        if (matches.length === 0) {
            box.appendChild(el('div', 'hint', 'Nothing found. Try another word.'));
            return;
        }
        for (const [path, value] of matches) {
            const item = el('button', 'lock-result');
            item.type = 'button';
            item.title = path;
            item.appendChild(el('span', '', friendlyPath(path)));
            item.appendChild(el('small', '', 'now ' + showValue(value)));
            item.addEventListener('click', () => selectLockField(path));
            box.appendChild(item);
        }
    }
    /**
     * Opens the small editor for one value: a number box, a Yes/No list or a
     * text box, matching what the game stores, prefilled with the current value.
     */
    function selectLockField(path) {
        if (!canSwitch(path)) {
            toast('Your OVR is set by the cheat above (Planned curve or Always 99)', true);
            return;
        }
        const target = currentState && resolvePath(currentState, path);
        const current = target ? target.obj[target.key] : undefined;
        if (!isLockable(current)) {
            toast('Open a career first: this value only exists during one.', true);
            return;
        }
        menuElement.querySelector('#copero99-lock-search').value = '';
        menuElement.querySelector('#copero99-lock-results').textContent = '';
        const editor = menuElement.querySelector('#copero99-lock-editor');
        editor.textContent = '';
        editor.appendChild(el('div', 'lock-editor-title', friendlyPath(path)));
        editor.appendChild(el('div', 'muted', 'Now ' + lockLabel(path, current) + '. Switch to:'));
        const extra = (quickLock(path) || [])[3] || {};

        // Market values get thousands separators and quick ± million buttons
        const money = typeof current === 'number' && /(^|\.)marketValue$/.test(path);
        const readMoney = () => Number(input.value.replace(/\D/g, '')) || 0;
        const writeMoney = (n) => { input.value = Math.max(0, Math.round(n)).toLocaleString('en-US'); };

        let input;
        const choices = typeof current === 'boolean' ? [['true', 'Yes'], ['false', 'No']] : typeof current === 'string' && extra.choices;
        if (choices) {
            input = el('select', 'field');
            for (const [value, label] of choices) {
                const option = el('option', '', label);
                option.value = value;
                input.appendChild(option);
            }
        } else {
            input = el('input', 'field');
            input.type = typeof current === 'number' ? 'number' : 'text';
            input.spellcheck = false;
        }
        input.value = String(current);
        if (money) {
            input.type = 'text';
            input.inputMode = 'numeric';
            writeMoney(current);
            input.addEventListener('input', () => {
                if (!/\d/.test(input.value)) {
                    input.value = '';
                    return;
                }
                // Re-add the commas while typing, keeping the cursor after the same digit
                const digitsBefore = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
                writeMoney(readMoney());
                let pos = 0;
                for (let seen = 0; pos < input.value.length && seen < digitsBefore; pos++) {
                    if (/\d/.test(input.value[pos])) seen++;
                }
                input.setSelectionRange(pos, pos);
            });
        }

        const lock = () => {
            let value = input.value;
            if (typeof current === 'number') {
                value = Number(money ? value.replace(/,/g, '') : value);
                if (input.value.trim() === '' || !Number.isFinite(value)) {
                    toast('Enter a number', true);
                    return;
                }
                if (extra.range && (value < extra.range[0] || value > extra.range[1])) {
                    toast(friendlyPath(path) + ' must be between ' + showValue(extra.range[0]) + ' and ' + showValue(extra.range[1]), true);
                    return;
                }
            } else if (typeof current === 'boolean') {
                value = value === 'true';
            } else if (value.length > 200) {
                toast('Text is too long (max 200 characters)', true);
                return;
            }
            if (addLock(path, value)) editor.textContent = '';
        };
        const lockButton = el('button', 'btn primary', '🔁 Switch');
        lockButton.type = 'button';
        lockButton.addEventListener('click', lock);
        const cancelButton = el('button', 'btn', 'Cancel');
        cancelButton.type = 'button';
        cancelButton.addEventListener('click', () => { editor.textContent = ''; });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') lock();
        });

        const row = el('div', 'lock-form');
        row.appendChild(input);
        row.appendChild(lockButton);
        row.appendChild(cancelButton);
        editor.appendChild(row);
        if (money) {
            const steps = el('div', 'money-steps');
            for (const millions of [-50, -10, -1, 1, 10, 50]) {
                const step = el('button', 'mini-btn', (millions > 0 ? '+' : '−') + Math.abs(millions) + 'M');
                step.type = 'button';
                step.addEventListener('click', () => writeMoney(readMoney() + millions * 1e6));
                steps.appendChild(step);
            }
            editor.appendChild(steps);
            if (path === 'player.marketValue') editor.appendChild(el('div', 'hint', 'Every season is set too, so the career summary matches.'));
        }
        if (extra.help) editor.appendChild(el('div', 'lock-help', extra.help));
        input.focus();
    }
    function addLock(path, value) {
        const existing = config.locks.find(lock => lock.path === path);
        if (existing) {
            existing.value = value;
        } else if (config.locks.length >= MAX_LOCKS) {
            toast('Too many switched values (max ' + MAX_LOCKS + ')', true);
            return false;
        } else {
            config.locks.push({ path: path, value: value });
        }
        saveConfig();
        mainLoop();
        renderLocks();
        toast('🔁 ' + friendlyPath(path) + ' switched to ' + lockLabel(path, value), true);
        return true;
    }
    function renderLocks() {
        if (!menuElement) return;
        const list = menuElement.querySelector('#copero99-locks-list');
        // [badge, colour, explanation shown on hover]
        const STATUS = {
            ok: ['Switched', 'ok', 'Being kept at this value.'],
            missing: ['Not in this career', 'warn', "This value doesn't exist in the open career, so nothing is changed."],
            type: ['Wrong kind', 'warn', 'The game stores a different kind of value here (number, yes/no or text).'],
            error: ["Can't change", 'warn', "The game doesn't let this value be changed."]
        };
        list.textContent = '';

        if (config.locks.length === 0) {
            list.appendChild(el('div', 'hint', 'Nothing switched yet.'));
            return;
        }

        config.locks.forEach((lock, index) => {
            const row = el('div', 'lock-row');

            const label = el('span', 'lock-label');
            label.title = lock.path;
            label.appendChild(el('b', '', friendlyPath(lock.path)));
            label.appendChild(el('span', 'lock-value', ' → ' + lockLabel(lock.path, lock.value)));

            const [statusText, statusClass, statusHelp] = STATUS[lockStatus[lock.path]] ||
                ['Waiting', 'wait', 'Applies when a career is open and Sandbox is picked.'];
            const status = el('span', 'badge ' + statusClass, statusText);
            status.title = statusHelp;

            const remove = el('button', 'icon-btn', '✕');
            remove.type = 'button';
            remove.title = 'Switch back (the game decides again)';
            remove.addEventListener('click', () => {
                config.locks.splice(index, 1);
                saveConfig();
                delete lockStatus[lock.path];
                renderLocks();
            });

            row.appendChild(label);
            row.appendChild(status);
            row.appendChild(remove);
            list.appendChild(row);
        });
        if (config.locks.length > 1) {
            const all = el('button', 'mini-btn', 'Switch all back');
            all.type = 'button';
            all.style.marginTop = '6px';
            all.addEventListener('click', () => {
                config.locks = [];
                saveConfig();
                lockStatus = {};
                renderLocks();
            });
            list.appendChild(all);
        }
    }

