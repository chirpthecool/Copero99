    // ========================================================================
    // Random country, position and shirt on the name screen
    // ========================================================================

    // Random country and position on Copero's name screen: a dice button in the country search field and one on the
    // position pitch pick one of Copero's own choices through its own handler, as if you had clicked it (a random position
    // brings a shirt number that goes with it), and one beside Confirm identity picks all of it and the foot

    // One of the name screen's pickers: the nearest of Copero's components above a page element whose props pass `test`
    // (the choices, the one picked and the handler), and that element
    function identityPicker(selector, test) {
        const screen = document.querySelector('[data-career-phase="identity"]');
        for (const node of screen ? screen.querySelectorAll(selector) : []) {
            for (let fiber = findReactFiber(node), depth = 0; fiber && depth < 12; fiber = fiber.return, depth++) {
                if (fiber.memoizedProps && test(fiber.memoizedProps)) return { node: node, props: fiber.memoizedProps };
            }
        }
        return null;
    }
    // Shirt numbers players wear in each position in real football, with how often: [number, weight]
    const POSITION_NUMBERS = {
        GK: [[1, 60], [13, 10], [12, 8], [25, 5], [23, 5], [30, 4], [31, 4], [33, 2], [99, 2]],
        CB: [[4, 22], [5, 20], [3, 12], [6, 8], [2, 8], [15, 8], [24, 5], [22, 5], [33, 4], [44, 3], [14, 3]],
        LB: [[3, 40], [12, 8], [18, 6], [21, 6], [22, 6], [26, 5], [5, 5], [23, 4], [17, 4], [28, 3], [19, 3]],
        RB: [[2, 45], [22, 8], [12, 6], [20, 6], [24, 5], [16, 5], [26, 5], [17, 4], [15, 4], [27, 3]],
        CDM: [[6, 35], [5, 15], [8, 10], [16, 10], [14, 6], [18, 6], [4, 6], [21, 4], [15, 4], [24, 4]],
        CM: [[8, 35], [6, 12], [10, 10], [14, 10], [16, 8], [18, 6], [20, 6], [22, 5], [5, 4], [17, 4]],
        CAM: [[10, 45], [8, 12], [7, 8], [11, 8], [20, 8], [22, 5], [21, 5], [14, 4], [19, 3]],
        LM: [[11, 30], [7, 15], [17, 10], [10, 8], [21, 6], [18, 6], [14, 6], [23, 5], [19, 5], [20, 5]],
        RM: [[7, 35], [11, 10], [17, 10], [16, 8], [20, 8], [22, 6], [8, 6], [19, 5], [14, 5]],
        LW: [[11, 35], [7, 15], [10, 12], [17, 8], [19, 6], [21, 6], [14, 5], [20, 5], [23, 4]],
        RW: [[7, 38], [11, 12], [10, 10], [17, 8], [19, 6], [20, 6], [14, 5], [22, 4], [27, 4]],
        ST: [[9, 45], [10, 12], [11, 8], [19, 8], [20, 6], [7, 5], [18, 5], [14, 4], [21, 4], [29, 2], [99, 2]]
    };
    // How often a player in each position is left-footed (left-backs mostly are, inverted wingers often; the rest about 1 in 5)
    const LEFT_FOOTED = { LB: 0.7, LM: 0.55, LW: 0.4, RW: 0.4, CB: 0.25, RM: 0.15, RB: 0.08 };
    // Copero's shirt card (name, number, foot), with its handlers; on screen with the wide layout (on its phone layout, one
    // step at a time, it isn't there at the position step, so a random position keeps the number)
    const shirtCard = () => identityPicker('#preferredNumberInput', props => typeof props.onPreferredNumberChange === 'function');
    // A shirt number for a position, set through Copero's own number field
    function randomShirt(position) {
        const card = shirtCard();
        const numbers = POSITION_NUMBERS[position];
        if (card && numbers) card.props.onPreferredNumberChange(String(weightedPick(numbers, ([, weight]) => weight)[0]));
    }
    // A random country's weight by its world name 0-5 (Chirp: still too many obscure nations with 2^name, where
    // the smallest 174 countries came up about 1 time in 3): world name 0 2.6%, 1 4.9%, 2 14%, 3 11%, 4 8%, 5 57%
    const RANDOM_NATION_WEIGHTS = [0.06, 0.4, 2, 6, 14, 24];
    const RANDOM_PICKS = [
        // In the search field's box, after the field (hidden while you type: Copero's clear button sits there then)
        { id: 'copero99-random-country', label: 'Pick a random country', cls: 'c99-random-country',
            find: () => identityPicker('input', props => Array.isArray(props.countries) && typeof props.onSelect === 'function'),
            place: (node, btn) => node.nextElementSibling !== btn && node.after(btn),
            choices: (props) => props.countries.filter(c => c && c.iso_alpha2).map(c => c.iso_alpha2), picked: (props) => props.selectedIsoAlpha2,
            // Footballing nations come up far more often (Copero's own world name for each country, RANDOM_NATION_WEIGHTS):
            // the 9 biggest about 2 times in 3, the 137 smallest together about 1 time in 40
            weight: (props, iso) => RANDOM_NATION_WEIGHTS[clamp(Number((props.countries.find(c => c && c.iso_alpha2 === iso) || {}).international_reputation) || 0, 0, 5)] },
        // In the pitch's empty bottom-right corner (its position buttons are its children)
        { id: 'copero99-random-position', label: 'Pick a random position', cls: 'c99-random-position',
            find: () => identityPicker('button[aria-pressed][aria-label]', props => !!props.positionLabels && typeof props.positionLabels === 'object' && typeof props.onSelect === 'function'),
            place: (node, btn) => btn.parentElement !== node.parentElement && node.parentElement.appendChild(btn),
            choices: (props) => Object.keys(props.positionLabels), picked: (props) => props.selectedPosition, then: randomShirt },
        // Everything but the name, left of Copero's Confirm identity button (the wide layout, where the number and foot are on screen too)
        { id: 'copero99-random-all', label: 'Random number, foot, country and position', cls: 'c99-random-all',
            find: () => {
                const confirm = shirtCard() && document.querySelector('[data-career-phase="identity"] button.min-w-44');
                return confirm ? { node: confirm } : null;
            },
            place: (node, btn) => node.previousElementSibling !== btn && node.before(btn),
            run: () => {
                const [country, position] = RANDOM_PICKS;
                pickRandom(country);
                const picked = pickRandom(position);
                const card = shirtCard();
                if (card) card.props.onPreferredFootChange(Math.random() < (LEFT_FOOTED[picked] || 0.2) ? 'left' : 'right');
            } }
    ];
    // Picks one of a picker's choices (never the one picked) through its own handler, and returns it
    function pickRandom(kind) {
        const picker = kind.find();
        const list = picker ? kind.choices(picker.props).filter(key => key !== kind.picked(picker.props)) : [];
        if (!list.length) return null;
        const pick = weightedPick(list, key => (kind.weight ? kind.weight(picker.props, key) : 1));
        picker.props.onSelect(pick);
        if (kind.then) kind.then(pick);
        // Copero adds a country picked from further down to the end of the list: scroll it into view once it's drawn
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const flag = document.querySelector('[data-career-phase="identity"] button[aria-pressed="true"] img');
            if (flag && kind.id === 'copero99-random-country') flag.closest('button').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }));
        return pick;
    }
    function placeRandomPicks() {
        for (const kind of RANDOM_PICKS) {
            const picker = kind.find();
            let btn = document.getElementById(kind.id);
            if (!picker) {
                if (btn) btn.remove();
                continue;
            }
            if (!btn) {
                btn = el('button', 'c99-random ' + kind.cls + ' c99-own');
                btn.id = kind.id;
                btn.type = 'button';
                btn.innerHTML = icon('dice');
                btn.title = kind.label;
                btn.setAttribute('aria-label', kind.label);
                btn.addEventListener('click', () => {
                    if (kind.run) kind.run();
                    else pickRandom(kind);
                    btn.classList.remove('c99-roll');
                    void btn.offsetWidth; // restarts the dice's turn
                    btn.classList.add('c99-roll');
                });
            }
            kind.place(picker.node, btn);
        }
    }

