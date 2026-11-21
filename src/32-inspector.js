    // ========================================================================
    // Inspect data
    // ========================================================================

    /**
     * Turns any value into a compact, JSON-safe description: same keys,
     * primitives kept, long strings cut, arrays summarised, cycles marked.
     */
    function describeValue(value, depth, seen) {
        if (value === null) return null;
        const type = typeof value;
        if (type === 'string') return value.length > 60 ? value.slice(0, 57) + '…' : value;
        if (type === 'boolean') return value;
        if (type === 'number') return Number.isFinite(value) ? value : String(value);
        if (type === 'undefined') return '[undefined]';
        if (type === 'bigint') return String(value) + 'n';
        if (type === 'function') return '[function]';
        if (type === 'symbol') return '[symbol]';

        // objects
        if (typeof value.nodeType === 'number') return '[DOM node]';
        const tag = Object.prototype.toString.call(value);
        if (tag === '[object Date]') return String(value);
        if (tag === '[object Map]') return '[Map size ' + value.size + ']';
        if (tag === '[object Set]') return '[Set size ' + value.size + ']';
        if (seen.has(value)) return '[circular]';
        if (depth <= 0) return Array.isArray(value) ? '[array(' + value.length + ') …]' : '{…}';

        seen.add(value);
        let result;
        if (Array.isArray(value)) {
            result = {
                '[array length]': value.length,
                '[first items]': value.slice(0, 3).map(item => describeValue(item, depth - 1, seen))
            };
        } else {
            result = {};
            const keys = Object.keys(value);
            for (const key of keys.slice(0, 80)) {
                try {
                    result[key] = describeValue(value[key], depth - 1, seen);
                } catch (e) {
                    result[key] = '[unreadable]';
                }
            }
            if (keys.length > 80) result['[more keys]'] = keys.length - 80;
        }
        seen.delete(value);
        return result;
    }
    function buildInspectorReport() {
        let text = '';
        for (let depth = 7; depth >= 3; depth--) {
            const report = {
                scriptVersion: VERSION,
                phase: lastPhase,
                topLevelKeys: Object.keys(currentState),
                state: describeValue(currentState, depth, new Set())
            };
            text = JSON.stringify(report, null, 1);
            if (text.length <= 60000) break;
        }
        return text;
    }
    function inspectState() {
        if (!currentState) {
            toast('No career found yet. Open a career first.', true);
            return;
        }
        try {
            openModal('Career state inspector', buildInspectorReport(), {
                note: 'Your career data, for troubleshooting. Nothing is sent anywhere.'
            });
        } catch (e) {
            console.warn('[99] inspector error:', e);
            toast('Could not read the state (see console).', true);
        }
    }

