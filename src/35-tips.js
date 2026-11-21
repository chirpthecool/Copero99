    // ========================================================================
    // Hover info boxes
    // ========================================================================

    // Hover info, the way Copero's trophy case does it: the things next to what you point at (a `.c99-group`) fade, and
    // where there's something to add (an explanation, a picture's name) a small info box shows under it. Every hover
    // text of the script (`title`) shows this way instead of the browser's box; text already on screen gets none.

    const TIP_AREAS = '#copero99-menu, #copero99-modal, #copero99-toasts, #copero99-fab, .c99-own';
    let tipBox = null;
    let tipTarget = null;
    // Sets a hover text, left alone while it's the same (re-adding `title` under the pointer would bring the browser's box back)
    const setTip = (node, text) => {
        if ((node.title || node.dataset.c99Tip) !== text) node.title = text;
    };
    // The script's element under the pointer with a hover text; the text moves out of `title` so only Copero's style shows
    function tipFor(node) {
        const target = node && node.nodeType === 1 ? node.closest('[title], [data-c99-tip]') : null;
        if (!target || !target.closest(TIP_AREAS)) return null;
        if (target.hasAttribute('title')) {
            if (target.title) target.dataset.c99Tip = target.title;
            target.removeAttribute('title');
        }
        return target.dataset.c99Tip ? target : null;
    }
    function showTip(target) {
        if (!tipBox) {
            tipBox = el('div', 'c99-tip');
            tipBox.id = 'copero99-tip';
            tipBox.setAttribute('role', 'tooltip');
            document.body.appendChild(tipBox);
        }
        tipTarget = target;
        tipBox.textContent = target.dataset.c99Tip;
        target.setAttribute('aria-describedby', 'copero99-tip');
        // Under it, centred and kept on screen; above it when there's no room below
        const box = target.getBoundingClientRect();
        tipBox.classList.remove('above');
        tipBox.classList.add('show');
        const tip = tipBox.getBoundingClientRect();
        const centre = box.left + box.width / 2;
        const left = clamp(centre - tip.width / 2, 8, window.innerWidth - tip.width - 8);
        let top = box.bottom + 8;
        if (top + tip.height > window.innerHeight - 8) {
            top = box.top - tip.height - 8;
            tipBox.classList.add('above');
        }
        tipBox.style.left = Math.round(left) + 'px';
        tipBox.style.top = Math.round(top) + 'px';
        tipBox.style.setProperty('--arrow', Math.round(centre - left) + 'px');
    }
    function hideTip() {
        if (!tipTarget) return;
        tipTarget.removeAttribute('aria-describedby');
        tipTarget = null;
        tipBox.classList.remove('show');
    }
    // Pointing at one item of a group fades the others (as Copero's trophy case does), with or without an info box
    function lightGroup(node) {
        const group = node && node.nodeType === 1 ? node.closest('.c99-group') : null;
        const item = group && group.closest(TIP_AREAS) ? [...group.children].find(child => child.contains(node)) : null;
        if (item && item.classList.contains('c99-lit')) return;
        document.querySelectorAll('.c99-dim, .c99-lit').forEach(lit => lit.classList.remove('c99-dim', 'c99-lit'));
        if (item) {
            group.classList.add('c99-dim');
            item.classList.add('c99-lit');
        }
    }
    function watchTips() {
        const over = (e) => {
            lightGroup(e.target);
            const target = tipFor(e.target);
            if (target === tipTarget) return;
            hideTip();
            if (target) showTip(target);
        };
        document.addEventListener('pointerover', over);
        document.addEventListener('focusin', over);
        document.addEventListener('pointerout', (e) => {
            // A finger "leaves" the moment it lifts: keep a tapped explanation until the next tap or a scroll
            if (e.pointerType === 'touch') return;
            lightGroup(e.relatedTarget);
            if (tipTarget && !(e.relatedTarget && tipTarget.contains(e.relatedTarget))) hideTip();
        });
        document.addEventListener('focusout', hideTip);
        window.addEventListener('scroll', () => {
            hideTip();
            lightGroup(null);
        }, { capture: true, passive: true });
    }

