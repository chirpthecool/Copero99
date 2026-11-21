    // ========================================================================
    // Opening, placing and launching the panel
    // ========================================================================

    // Planned curve: while the panel floats, the chart has its own box under it (the empty space beside the Living world
    // box); otherwise, once it scrolls out of sight, it docks at the bottom of the panel, so it stays in view while you drag sliders
    function dockChart() {
        const m = menuElement;
        if (!m) return;
        const body = m.querySelector('.body');
        const spot = m.querySelector('#copero99-chart-spot');
        const dock = m.querySelector('#copero99-chart-dock');
        const below = document.getElementById('copero99-chart-below');
        const chart = document.getElementById('copero99-chart');
        const curve = ui.tab === 'ovr' && currentMode() === 'age';
        const under = curve && m.classList.contains('floating');
        const docked = curve && !under && body.scrollTop > 0 && spot.getBoundingClientRect().bottom < body.getBoundingClientRect().top + 4;
        put(below, 'hidden', !under);
        const home = under ? below : docked ? dock : spot;
        if (chart.parentNode === home) return;
        // The empty spot keeps the chart's height while it's docked, so the sliders don't jump
        spot.style.height = docked && chart.parentNode === spot ? spot.offsetHeight + 'px' : '';
        home.appendChild(chart);
    }
    // `ui.open` is whether you want the panel; it only shows while a career is on screen (not on the start or name screens)
    function setMenuVisible(visible, persist) {
        if (!menuElement) return;
        if (persist !== false) {
            ui.open = visible;
            saveUi();
        }
        refreshPanel();
    }
    function refreshPanel() {
        const show = ui.open && !!currentState;
        const wasOpen = menuElement.classList.contains('open');
        menuElement.classList.toggle('open', show);
        placePanel();
        if (show && !wasOpen) {
            // A career without a mode opens on the pick
            if (!stats.picked) ui.tab = 'ovr';
            updateMenuUI();
        }
    }
    // A new career: the panel opens by itself, sliding in with a glow on the logo and a light sweep
    function playIntro() {
        introPending = false;
        if (!menuElement || menuElement.classList.contains('open')) return;
        ui.open = true;
        refreshPanel();
        menuElement.classList.remove('c99-intro');
        void menuElement.offsetWidth; // restarts the animation
        menuElement.classList.add('c99-intro');
        setTimeout(() => menuElement.classList.remove('c99-intro'), 1400);
    }
    const toggleMenu = () => {
        if (!currentState) {
            toast('Start a career to use Copero99', true);
            return;
        }
        setMenuVisible(!menuElement.classList.contains('open'));
    };
    // Window width from which the panel (at least 340px) fits in the free space right of the game card: the card is
    // 67rem (1072px) wide and centred, with 12px before the panel and 16px after it
    const FLOAT_MIN_WIDTH = 1072 + 2 * (340 + 28);
    /**
     * Wide screens: the panel floats next to the game card, exactly as tall
     * as the card, and the game stays centred. Narrower screens: the page is
     * pushed aside (or the panel becomes a bottom sheet, see the CSS). The
     * window width decides, not the measured room, because docking itself
     * moves the card.
     */
    function placePanel() {
        const open = menuElement.classList.contains('open');
        const floating = open && window.innerWidth >= FLOAT_MIN_WIDTH;
        document.documentElement.classList.toggle('c99-docked', open && !floating);
        menuElement.classList.toggle('floating', floating);
        dockChart();
        if (!floating) {
            menuElement.style.left = menuElement.style.top = menuElement.style.width = menuElement.style.height = '';
            return;
        }
        // The card's visible box (the section has a negative margin, its child is the bordered card)
        const section = document.querySelector('[data-career-phase] section');
        const card = section && (section.firstElementChild || section);
        const box = card ? card.getBoundingClientRect() : null;
        const left = box ? box.right + 12 : window.innerWidth / 2 + 548;
        const top = box ? box.top : 82;
        const height = box && box.height > 200 ? Math.round(box.height) : 680;
        const width = Math.round(Math.min(460, window.innerWidth - left - 16));
        const set = (node, key, value) => { if (node.style[key] !== value) node.style[key] = value; };
        set(menuElement, 'left', Math.round(left + window.scrollX) + 'px');
        set(menuElement, 'top', Math.round(top + window.scrollY) + 'px');
        set(menuElement, 'width', width + 'px');
        set(menuElement, 'height', height + 'px');
        // The Planned curve chart's box: under the panel, level with the Living world box
        const below = document.getElementById('copero99-chart-below');
        const worldBox = document.getElementById('copero99-world');
        const belowTop = Math.max(top + height + 12, worldBox ? worldBox.getBoundingClientRect().top : 0);
        set(below, 'left', Math.round(left + window.scrollX) + 'px');
        set(below, 'top', Math.round(belowTop + window.scrollY) + 'px');
        set(below, 'width', width + 'px');
    }
    // The site's own achievements buttons (not our copies, not inside a pop-up)
    function siteMedalButtons() {
        return [...document.querySelectorAll('svg.lucide-medal')].map(svg => svg.closest('button'))
            .filter(button => button && !button.closest('.c99-own, [role="dialog"], #copero99-menu, #copero99-modal'));
    }
    // Beside the career card the achievements button sits alone in a narrow column of the card's grid
    function careerColumn(anchor) {
        const column = anchor.parentElement;
        const grid = column && column.parentElement;
        const own = [...column.children].filter(child => !child.classList.contains('c99-launch')).length;
        return own === 1 && !anchor.textContent.trim() && grid && grid.classList.contains('grid') ? { column, grid } : null;
    }
    /**
     * On the career screen the achievements button and ours become two small
     * round buttons in the card's pill row (next to "#7 ST"), and the site's
     * narrow button column is hidden so the card meets the panel. Elsewhere
     * (start screen, phone layout) a copy of the site's button goes next to
     * it. React redraws these areas, so this runs on every pass.
     */
    function placeCardButtons(anchor, layout) {
        const pillRow = layout.grid.querySelector('div[class*="h-[18px]"]');
        if (!pillRow) return false;
        layout.column.style.display = 'none';
        layout.grid.style.gridTemplateColumns = 'minmax(0, 1fr)';
        pillRow.style.overflow = 'visible';
        // The box around the pill row clips too, which cut the Retire button short
        pillRow.parentElement.style.overflow = 'visible';
        let minis = pillRow.querySelector('.c99-minis');
        if (!minis) {
            minis = el('span', 'c99-minis c99-own');
            // The achievements medal on a glossy gold tile, like the Copero99 diamond beside it
            const medal = el('button', 'c99-tile');
            medal.type = 'button';
            medal.title = anchor.title || 'Achievements';
            const medalTile = el('span', 'c99-gem c99-gold');
            medalTile.appendChild(anchor.querySelector('svg').cloneNode(true));
            medal.appendChild(medalTile);
            // The site's own (hidden) button still opens its achievements window
            medal.addEventListener('click', () => minis.c99Anchor.click());
            const launcher = el('button', 'c99-launch');
            launcher.type = 'button';
            launcher.title = 'Copero99 (Alt+Shift+C)';
            launcher.setAttribute('aria-label', 'Copero99');
            launcher.innerHTML = gemIcon();
            launcher.addEventListener('click', toggleMenu);
            // Going back: a glossy red tile (refreshRewind shows it and names it for the career's mode)
            const rewind = el('button', 'c99-tile c99-rewind');
            rewind.type = 'button';
            rewind.hidden = true;
            rewind.innerHTML = '<span class="c99-gem c99-red">' + icon('reset') + '</span>';
            rewind.addEventListener('click', requestRewind);
            const retire = el('button', 'c99-retire');
            retire.innerHTML = icon('flag') + '<span>Retire</span>';
            retire.setAttribute('aria-label', 'Retire');
            retire.type = 'button';
            retire.title = 'End your career at this club decision (Sandbox)';
            retire.addEventListener('click', requestRetire);
            minis.appendChild(medal);
            minis.appendChild(launcher);
            minis.appendChild(rewind);
            minis.appendChild(retire);
            pillRow.appendChild(minis);
        }
        minis.c99Anchor = anchor;
        const mode = currentMode();
        const retire = minis.querySelector('.c99-retire');
        put(retire, 'hidden', !mode || mode === 'boost' || !currentState || currentState.phase === 'summary');
        // A narrower card has no room for the word next to the age: just the flag, like the buttons beside it (the window's
        // width says so: measuring the card every pass made the browser lay out the page)
        if (!retire.hidden) retire.classList.toggle('c99-compact', window.innerWidth - (document.documentElement.classList.contains('c99-docked') ? 380 : 0) - 32 < 1000);
        return true;
    }
    function ensureLaunchers() {
        // Before a career exists there is nothing to change, so no buttons at all
        if (!currentState) {
            document.querySelectorAll('.c99-launch:not(#copero99-fab), .c99-minis').forEach(node => node.remove());
            if (fabElement) put(fabElement, 'hidden', true);
            return;
        }
        let found = 0;
        for (const anchor of siteMedalButtons()) {
            found++;
            const layout = careerColumn(anchor);
            if (layout && placeCardButtons(anchor, layout)) continue;
            let launcher = anchor.nextElementSibling;
            if (!launcher || !launcher.classList.contains('c99-launch')) {
                const parent = anchor.parentElement;
                if (parent.children.length === 1) {
                    // Beside the career card the button sits alone in a narrow column: stack ours under it
                    Object.assign(parent.style, anchor.textContent.trim()
                        ? { gap: '8px' }
                        : { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '8px' });
                }
                launcher = anchor.cloneNode(false);
                launcher.removeAttribute('id');
                launcher.classList.add('c99-launch');
                launcher.innerHTML = gemIcon() + (anchor.textContent.trim() ? 'Copero99' : '');
                launcher.setAttribute('aria-label', 'Copero99');
                launcher.title = 'Copero99 (Alt+Shift+C)';
                launcher.addEventListener('click', toggleMenu);
                anchor.after(launcher);
            }
        }
        if (fabElement) put(fabElement, 'hidden', found > 0);
    }

