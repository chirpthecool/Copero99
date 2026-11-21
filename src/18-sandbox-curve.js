    // ========================================================================
    // Sandbox's planned curve and its style presets
    // ========================================================================

    const PRESETS = {
        god: {
            name: 'God Mode',
            description: 'OVR always at 99, regardless of age',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'god',
                forceOVR99: true,
                ageBasedOVR: false,
            }
        },
        realistic: {
            name: 'Realistic',
            description: 'OVR grows until the peak and then declines with age',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'realistic',
                forceOVR99: false,
                ageBasedOVR: true,
                peakOverall: 99,
                peakAge: 28,
                growthPerYear: 4,
                declineStartAge: 31,
                declinePerYear: 2,
            }
        },
        prodigy: {
            name: 'Prodigy',
            description: 'Fast rise, early peak, earlier and steeper decline',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'prodigy',
                forceOVR99: false,
                ageBasedOVR: true,
                peakOverall: 99,
                peakAge: 25,
                growthPerYear: 5,
                declineStartAge: 29,
                declinePerYear: 3,
            }
        },
        lateBloomer: {
            name: 'Late Bloomer',
            description: 'Slow rise, late peak, gentle decline',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'lateBloomer',
                forceOVR99: false,
                ageBasedOVR: true,
                peakOverall: 99,
                peakAge: 31,
                growthPerYear: 3,
                declineStartAge: 34,
                declinePerYear: 2,
            }
        },
        ironman: {
            name: 'Iron Man',
            description: 'Normal rise, plays at the top until 36, very slow decline',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'ironman',
                forceOVR99: false,
                ageBasedOVR: true,
                peakOverall: 99,
                peakAge: 29,
                growthPerYear: 4,
                declineStartAge: 36,
                declinePerYear: 1,
            }
        },
        custom: {
            name: 'Custom',
            description: 'Configure each option to your liking',
            config: { ...DEFAULT_CONFIG, preset: 'custom' }
        }
    };
    function applyPreset(presetName) {
        if (presetName === 'custom') {
            // Keep the current values, just mark the config as custom
            config.preset = 'custom';
        } else {
            const preset = PRESETS[presetName];
            if (!preset) return;
            // These are personal settings, not part of a career style, so they are preserved
            const keep = {
                notifications: config.notifications,
                preventInjuries: config.preventInjuries,
                preventSuspensions: config.preventSuspensions,
                forceQualify: config.forceQualify,
                luckyEvents: config.luckyEvents,
                boostRandom: config.boostRandom,
                boostGrowth: config.boostGrowth,
                boostDecline: config.boostDecline,
                boostStart: config.boostStart,
                boostCap: config.boostCap,
                boostAbove: config.boostAbove,
                boostPeak: config.boostPeak,
                boostStyle: config.boostStyle,
                boostTier: config.boostTier,
                boostPerks: config.boostPerks,
                boostSwing: config.boostSwing,
                boostGoals: config.boostGoals,
                boostAssists: config.boostAssists,
                boostApps: config.boostApps,
                boostRole: config.boostRole,
                extraOffer: config.extraOffer,
                offerQuality: config.offerQuality,
                realRetire: config.realRetire,
                varianceSeed: config.varianceSeed,
                customCurve: config.customCurve,
                locks: config.locks
            };
            // Picking a career style switches to the planned curve
            config = sanitizeConfig({ ...preset.config, ...keep, boostedOVR: false });
        }
        saveConfig();
        updateMenuUI();
    }
    /**
     * Builds the 25-value table (ages 16..40) from the formula.
     */
    function buildCurve(cfg) {
        const base = { ...cfg, useCustomCurve: false };
        const curve = [];
        for (let age = CURVE_MIN_AGE; age <= CURVE_MAX_AGE; age++) {
            curve.push(calculateOVR(age, base));
        }
        return curve;
    }
    /**
     * Deterministic "random" offset in [-variance, +variance] for a given age.
     * The same age and seed always give the same offset (no jitter).
     */
    function varianceOffset(age, cfg) {
        const v = cfg.variance;
        if (!v) return 0;
        let h = Math.imul(Math.round(age) + 1 + cfg.varianceSeed * 31, 2654435761);
        h = Math.imul(h ^ (h >>> 15), 2246822519);
        h = h ^ (h >>> 13);
        return ((h >>> 0) % (2 * v + 1)) - v;
    }
    /**
     * Calculates the OVR for a given age.
     * - Custom curve (if enabled): the value typed for that age
     * - Before the peak age: the OVR rises by `growthPerYear` each year,
     *   reaching the peak exactly at the peak age
     * - Between the peak age and the decline age: maximum OVR
     * - From the decline age on: the OVR drops by `declinePerYear` each year
     * Formula results get the variance offset and are kept between
     * `minOverall` and `peakOverall`.
     */
    function calculateOVR(age, cfg = config) {
        if (cfg.useCustomCurve && Array.isArray(cfg.customCurve) && cfg.customCurve.length === CURVE_AGES) {
            const index = clamp(Math.round(age) - CURVE_MIN_AGE, 0, CURVE_AGES - 1);
            const value = Number(cfg.customCurve[index]);
            if (Number.isFinite(value)) {
                return Math.round(clamp(value, CURVE_MIN_OVR, CURVE_MAX_OVR));
            }
        }

        const peak = cfg.peakOverall;
        const floor = Math.min(cfg.minOverall, peak);
        // The decline can never start before the peak
        const declineAge = Math.max(cfg.declineStartAge, cfg.peakAge);

        let ovr;
        if (age < cfg.peakAge) {
            // Rising toward the peak
            ovr = peak - (cfg.peakAge - age) * cfg.growthPerYear;
        } else if (age >= declineAge) {
            // Declining after the peak
            ovr = peak - (age - declineAge) * cfg.declinePerYear;
        } else {
            // At the peak
            ovr = peak;
        }
        ovr += varianceOffset(age, cfg);
        return Math.round(Math.max(floor, Math.min(peak, ovr)));
    }
    /**
     * Draws the OVR from age 16 to 40 with the current settings, plus a
     * one-line summary. A yellow dot marks the player's current age.
     */
    function renderPreview() {
        if (!menuElement) return;
        // The chart can be in its box under the panel, so it's looked up in the whole page
        const box = document.getElementById('copero99-preview');

        const W = 280, H = 112, L = 24, R = 8, T = 8, B = 18;
        const LOW = CURVE_MIN_OVR, HIGH = CURVE_MAX_OVR;
        const xOf = (age) => L + ((age - CURVE_MIN_AGE) / (CURVE_MAX_AGE - CURVE_MIN_AGE)) * (W - L - R);
        const yOf = (ovr) => T + ((HIGH - ovr) / (HIGH - LOW)) * (H - T - B);

        const points = [];
        for (let age = CURVE_MIN_AGE; age <= CURVE_MAX_AGE; age++) {
            points.push(xOf(age).toFixed(1) + ',' + yOf(calculateOVR(age)).toFixed(1));
        }
        const area = `${xOf(CURVE_MIN_AGE)},${yOf(LOW)} ${points.join(' ')} ${xOf(CURVE_MAX_AGE)},${yOf(LOW)}`;

        let grid = '';
        for (const ovr of [40, 60, 80, 99]) {
            const y = yOf(ovr).toFixed(1);
            grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" style="stroke: var(--c99-line)"/>`;
            grid += `<text x="${L - 5}" y="${y}" dy="3" text-anchor="end">${ovr}</text>`;
        }
        for (const age of [16, 20, 24, 28, 32, 36, 40]) {
            grid += `<text x="${xOf(age).toFixed(1)}" y="${H - 4}" text-anchor="middle">${age}</text>`;
        }
        // Red dashed line: the "Never drops below" floor
        if (!config.useCustomCurve && config.minOverall > LOW) {
            const y = yOf(Math.min(config.minOverall, config.peakOverall)).toFixed(1);
            grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#f87171" stroke-opacity="0.7" stroke-dasharray="4 3"/>`;
        }

        const nowEl = document.getElementById('copero99-now');
        let marker = '';
        if (typeof lastAge === 'number' && lastAge >= CURVE_MIN_AGE && lastAge <= CURVE_MAX_AGE) {
            const ovr = calculateOVR(lastAge);
            const x = xOf(lastAge).toFixed(1);
            const y = yOf(ovr).toFixed(1);
            marker = `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="#facc15" stroke-opacity="0.35" stroke-dasharray="3 3"/>`;
            marker += `<circle cx="${x}" cy="${y}" r="4.5" fill="#facc15" style="stroke: var(--c99-bg)" stroke-width="2"/>`;
            const events = currentState ? eventsTotal(currentState) : 0;
            nowEl.textContent = `You now: age ${lastAge}, OVR ${clamp(ovr + events, CURVE_MIN_OVR, CURVE_MAX_OVR)} this season` +
                (events ? ` (curve ${ovr}, events ${signed(events)})` : '');
            nowEl.style.display = '';
        } else {
            nowEl.style.display = 'none';
        }

        box.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" font-size="9" style="fill: var(--c99-muted)">
                ${grid}
                <polygon points="${area}" style="fill: var(--c99-accent-soft)"/>
                <polyline points="${points.join(' ')}" style="fill: none; stroke: var(--c99-accent)" stroke-width="2" stroke-linejoin="round"/>
                ${marker}
            </svg>
        `;

        // The curve in short, plain lines (numbers in bold)
        const lines = [];
        if (config.useCustomCurve) {
            lines.push(['You set the OVR for every age yourself.']);
        } else {
            const holdUntil = Math.max(config.declineStartAge, config.peakAge);
            const floor = Math.min(config.minOverall, config.peakOverall);
            lines.push(['Grows ', '+' + config.growthPerYear, ' a year until it reaches ', config.peakOverall, ' at age ', config.peakAge, '.']);
            lines.push(holdUntil > config.peakAge ? ['Stays at ', config.peakOverall, ' until age ', holdUntil, '.'] : ['Starts dropping right after the peak.']);
            lines.push(['Then loses ', config.declinePerYear, ' a year, never going below ', floor, '.']);
            if (config.variance) lines.push(['Each season can be up to ', config.variance, ' higher or lower.']);
            const lowest = Math.min(...buildCurve({ ...config, minOverall: CURVE_MIN_OVR }));
            if (config.minOverall > CURVE_MIN_OVR && floor < lowest) lines.push(['"Lowest OVR" does nothing yet: the curve never gets down to ', floor, '.']);
        }
        const list = el('ul', 'curve-summary');
        for (const parts of lines) {
            const item = el('li');
            // Text pieces sit at even places, numbers at odd ones
            parts.forEach((part, i) => item.appendChild(i % 2 ? el('b', '', String(part)) : document.createTextNode(part)));
            list.appendChild(item);
        }
        const summary = menuElement.querySelector('#copero99-summary');
        summary.textContent = '';
        summary.appendChild(list);
    }

