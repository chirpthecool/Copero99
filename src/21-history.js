    // ========================================================================
    // Season history
    // ========================================================================

    function recordHistory(age, before, after) {
        const last = history[history.length - 1];
        if (last && age < last.age) {
            // Age went backwards: a new career started
            history = [];
        } else if (last && age === last.age) {
            // Same season seen again (e.g. page reload): keep the first game value
            last.ovr = after;
            saveHistory();
            return;
        }
        history.push({
            age: age,
            gameOvr: Number.isFinite(Number(before)) ? Number(before) : null,
            ovr: Number.isFinite(Number(after)) ? Number(after) : null
        });
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        saveHistory();
    }
    function historyToCsv() {
        const lines = ['age,game_ovr,script_ovr'];
        for (const item of history) {
            lines.push(item.age + ',' + (item.gameOvr === null ? '' : item.gameOvr) + ',' + (item.ovr === null ? '' : item.ovr));
        }
        return lines.join('\n');
    }
    function showHistory() {
        openModal('Season history (CSV)', historyToCsv(), {
            note: "game_ovr: the game's own OVR · script_ovr: after the script. Starts over with each new career.",
            clearLabel: 'Clear history',
            onClear: () => {
                history = [];
                saveHistory();
                closeModal();
                toast('History cleared', true);
            }
        });
    }

