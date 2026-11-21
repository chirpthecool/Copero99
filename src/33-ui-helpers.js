    // ========================================================================
    // Shared pieces of the UI: icons, pictures, badges, windows
    // ========================================================================

    // A yes/no question in the script's own window (instead of the browser's grey box)
    function confirmModal(title, text, yesLabel, onYes, danger) {
        const body = el('div', 'hof-confirm');
        body.appendChild(el('div', 'muted', text));
        openModal(title, '', {
            body: body,
            buttons: [[yesLabel, danger ? 'btn danger solid' : 'btn primary', () => {
                closeModal();
                onYes();
            }]],
            closeLabel: 'Cancel'
        });
    }
    // Asks first; Cancel goes back to the career
    function confirmHofDelete(entry) {
        const body = el('div', 'hof-confirm');
        body.appendChild(el('b', '', [entry.name, entry.position, 'peak ' + entry.peak, entry.trophyCount + ' trophies'].filter(Boolean).join(' · ')));
        body.appendChild(el('div', 'muted', "This career will be removed from the Hall of Fame for good. This can't be undone."));
        openModal('Delete this career?', '', {
            body: body,
            buttons: [['Delete career', 'btn danger solid', () => {
                hof = hof.filter(e => e.seed !== entry.seed);
                saveHof();
                closeModal();
                renderHofList();
                toast('Career deleted from the Hall of Fame', true);
            }]],
            closeLabel: 'Cancel',
            onClose: () => showHofCareer(entry)
        });
    }
    // Copero's own OVR badge colours (bronze, silver, gold, light blue, elite, 99): [from OVR, background, text, border]
    const OVR_TIERS = [
        [99, 'linear-gradient(145deg, #7c3aed 0%, #09090b 52%, #c026d3 100%)', '#ffffff', 'rgba(232,121,249,0.55)'],
        [95, 'linear-gradient(145deg, #a855f7 0%, #c026d3 48%, #4338ca 100%)', '#faf5ff', 'rgba(240,171,252,0.52)'],
        [90, 'linear-gradient(145deg, #cffafe 0%, #bae6fd 48%, #60a5fa 100%)', '#082f49', 'rgba(3,105,161,0.4)'],
        [80, 'linear-gradient(145deg, #fcd34d 0%, #facc15 48%, #d97706 100%)', '#451a03', 'rgba(146,64,14,0.42)'],
        [70, 'linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 48%, #94a3b8 100%)', '#0f172a', 'rgba(51,65,85,0.38)'],
        [0, 'linear-gradient(145deg, #d97706 0%, #b45309 48%, #78350f 100%)', '#fef3c7', 'rgba(253,230,138,0.42)']
    ];
    // Copero's own badge classes per tier (its `wa()`), for rows copied from its season table
    const COPERO_BADGES = [
        [99, 'bg-gradient-to-br from-violet-600 via-zinc-950 to-fuchsia-600 text-white border-violet-500/50 font-black animate-shadow-pulse-99'],
        [95, 'bg-gradient-to-br from-purple-500 via-fuchsia-600 to-indigo-700 text-purple-50 border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.4)] font-black'],
        [90, 'bg-gradient-to-br from-cyan-100 via-sky-200 to-blue-400 text-sky-950 border-cyan-300/40 shadow-[0_0_8px_rgba(56,189,248,0.4)] font-black'],
        [80, 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 border-yellow-300/40 shadow-[0_0_6px_rgba(251,191,36,0.3)] font-black'],
        [70, 'bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-400 dark:to-slate-600 text-slate-900 dark:text-slate-100 border-slate-300/30'],
        [0, 'bg-gradient-to-br from-amber-600 to-amber-900 text-amber-100 border-amber-800/30']
    ];
    // Dark or white text, whichever reads on a club colour (white clubs like Real Madrid need dark numbers, as in Copero's own table)
    function inkOn(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) return '#fff';
        const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0b0b0f' : '#fff';
    }
    // An OVR painted like the game's badge for that OVR, optionally with a small label above ("PEAK")
    function ovrBadge(ovr, size, label) {
        const badge = el('span', 'ovr ' + size);
        if (label) badge.appendChild(el('small', '', label));
        badge.appendChild(el('span', '', String(ovr)));
        const tier = Number.isFinite(Number(ovr)) ? OVR_TIERS.find(([from]) => Number(ovr) >= from) : null;
        if (tier) {
            badge.style.background = tier[1];
            badge.style.color = tier[2];
            badge.style.borderColor = tier[3];
        }
        return badge;
    }
    // A crest or trophy picture from Copero's media server. A trophy picture that can't load becomes Copero's generic
    // league or cup trophy (as on Copero's own trophy case); anything else disappears. `title` is only for pictures
    // whose name isn't written next to them
    function picture(src, title) {
        if (!src) return null;
        const img = el('img');
        img.src = src;
        img.alt = title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        if (title) img.title = title;
        img.addEventListener('error', () => {
            const generic = src.indexOf('/trophies/football/') < 0 ? null
                : Object.values(gameData.leagueImages).indexOf(src) >= 0 ? GENERIC_TROPHY.league : GENERIC_TROPHY.cup;
            if (generic && img.src !== generic) img.src = generic;
            else img.remove();
        });
        return img;
    }
    // €1.8M / €450K, the way the game writes market values
    function money(value) {
        const n = Number(value) || 0;
        if (n >= 1e9) return '€' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (n >= 1e6) return '€' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return '€' + Math.round(n / 1e3) + 'K';
        return '€' + n;
    }
    // Line icons in the style the site uses (Lucide)
    const ICONS = {
        sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
        save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
        folder: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
        reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        landmark: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
        rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
        dice: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>',
        swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
        chevron: '<path d="m9 18 6-6-6-6"/>',
        lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
        building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
        palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
        shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
        flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
        leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
        medal: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
        earth: '<path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"/><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/>',
        // The exact trophy Copero draws in its logo
        trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>'
    };
    // The Copero99 launcher: the logo's trophy on a shining diamond tile
    const gemIcon = () => '<span class="c99-gem">' + icon('trophy') + '</span>';
    const icon = (name) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
    function closeModal() {
        if (modalElement && modalElement.parentNode) {
            modalElement.parentNode.removeChild(modalElement);
        }
        modalElement = null;
    }
    function copyText(text, textarea) {
        const fallback = () => {
            let ok = false;
            try {
                textarea.focus();
                textarea.select();
                ok = document.execCommand('copy');
            } catch (e) {
                ok = false;
            }
            return ok;
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true, () => fallback());
        }
        return Promise.resolve(fallback());
    }
    /**
     * Pop-up window with a text box. With `onApply` the text box is editable
     * and gets an apply button (used to load settings); otherwise it is
     * read-only with a Copy button.
     */
    function openModal(title, text, options) {
        const opts = options || {};
        closeModal();

        const overlay = document.createElement('div');
        overlay.id = 'copero99-modal';
        overlay.innerHTML = `
            <div class="box">
                <h4></h4>
                <div class="modal-note"></div>
                <textarea spellcheck="false"></textarea>
                <div class="btn-row"></div>
            </div>
        `;
        overlay.querySelector('h4').textContent = title;
        overlay.querySelector('.modal-note').textContent = opts.note || '';
        const textarea = overlay.querySelector('textarea');
        textarea.value = text;
        textarea.readOnly = !opts.onApply;
        if (opts.placeholder) textarea.placeholder = opts.placeholder;
        if (opts.wide) overlay.querySelector('.box').classList.add('wide');
        // A ready-made view (e.g. the Hall of Fame) replaces the text box
        if (opts.body) {
            opts.body.classList.add('modal-body');
            textarea.replaceWith(opts.body);
        }

        const row = overlay.querySelector('.btn-row');
        const addButton = (label, className, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = className;
            btn.textContent = label;
            btn.addEventListener('click', onClick);
            row.appendChild(btn);
        };

        if (opts.onApply) {
            addButton(opts.applyLabel || 'Apply', 'btn primary', () => opts.onApply(textarea.value));
        } else if (!opts.body) {
            addButton('Copy', 'btn primary', () => {
                copyText(textarea.value, textarea).then(ok => {
                    toast(ok ? 'Copied to clipboard' : 'Select the text and press Ctrl+C', true);
                });
            });
        }
        if (opts.onClear) addButton(opts.clearLabel || 'Clear', 'btn danger', opts.onClear);
        for (const [label, className, onClick] of opts.buttons || []) addButton(label, className, onClick);
        addButton(opts.closeLabel || 'Close', 'btn', opts.onClose || closeModal);

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) closeModal();
        });

        document.body.appendChild(overlay);
        modalElement = overlay;
        if (opts.onApply) textarea.focus();
    }

