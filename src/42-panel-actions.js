    // ========================================================================
    // Picking a mode
    // ========================================================================

    /**
     * The first thing in a new career: Boost, Sandbox or Vanilla. The
     * pick is locked in for the career, because switching would change the OVR.
     * Boost's first look rolls the boost and adds the starting talent right away.
     */
    function pickMode(group) {
        if (!currentState || stats.picked || careerStarted() || PICKS.indexOf(group) < 0) return;
        stats.picked = group;
        saveStats();
        if (group === 'boost') {
            config.boostedOVR = true;
            config.ageBasedOVR = false;
            config.forceOVR99 = false;
        } else if (group === 'sandbox') {
            config.boostedOVR = false;
            if (!config.forceOVR99) config.ageBasedOVR = true;
        }
        saveConfig();
        mainLoop();
        updateMenuUI();
        const chosen = menuElement.querySelector(group === 'vanilla' ? '#copero99-pick-late' : '#copero99-mode-badge');
        chosen.classList.remove('c99-lockin');
        void chosen.offsetWidth; // restarts the animation
        chosen.classList.add('c99-lockin');
        confetti(chosen, group === 'boost' ? ['#10b981', '#34d399', '#a7f3d0', '#60a5fa', '#ffffff']
            : group === 'sandbox' ? ['#f59e0b', '#fbbf24', '#fde68a', '#fb923c', '#ffffff']
                : ['#38bdf8', '#7dd3fc', '#e0f2fe', '#a78bfa', '#ffffff']);
    }
    // A soft burst of see-through confetti from a button, in the picked mode's colours
    function confetti(from, colours) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const box = from.getBoundingClientRect();
        const layer = el('div', 'c99-confetti');
        for (let i = 0; i < 40; i++) {
            const piece = el('i');
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 90;
            piece.style.left = (box.left + Math.random() * box.width) + 'px';
            piece.style.top = (box.top + box.height / 2) + 'px';
            piece.style.background = colours[i % colours.length];
            piece.style.setProperty('--x', Math.round(Math.cos(angle) * distance) + 'px');
            piece.style.setProperty('--y', Math.round(Math.sin(angle) * distance * 0.7 - 30) + 'px');
            piece.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
            piece.style.animationDelay = Math.round(Math.random() * 120) + 'ms';
            if (i % 3 === 0) piece.style.borderRadius = '50%';
            layer.appendChild(piece);
        }
        document.body.appendChild(layer);
        setTimeout(() => layer.remove(), 1800);
    }

