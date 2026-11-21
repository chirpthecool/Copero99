    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    loadConfig();
    loadStats();
    loadHistory();
    loadHof();
    loadBoost();
    loadWorld();
    loadUi();
    // Arriving from another Copero page, the game file loads later; a full timing list would hide it from loadGameData
    if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(1000);
    createMenu();
    watchTips();

    console.log('[99] v' + VERSION + ' loaded. Preset:', config.preset);
    // On every Copero page load: a short confirmation that the script is running
    toast('Copero99 ' + VERSION + ' is ready. It opens when you start a career (Alt+Shift+C).');

    mainLoop();
    setInterval(mainLoop, 500);
    new MutationObserver(onPageChange).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', decisionClick, true);

    // For the test suite and the balance simulation (sim4.js); nothing on a real page defines this
    if (typeof window.__copero99Test === 'function') {
        window.__copero99Test({ boostStep, seasonForm, seasonPerf, soonestPeak, startTalent, styleStep, ballonDorVote, rollBoost, rollPeak, devProfile, squadRole, achievementProgress, pageAchievementFilter, formOf, realRate, coperoRate, REAL_RATES, contractLeft, statTrait,
            agesBadly, milkAge, tierWeight, careerFacts, CARD_TIERS, winnerNation, awardRaces, gameData, BOOST_TIERS, BOOST_STYLES, PERKS, ROLE_TRAITS, SCENES, MILK,
            BDO: { TROPHIES: BDO_TROPHIES, ROLES: BDO_ROLES, FIELD: BDO_FIELD, MOOD: BDO_MOOD, STARS: BDO_STARS, NOISE: BDO_NOISE, OVR: BDO_OVR, GOALS: BDO_GOALS, FATIGUE: BDO_FATIGUE }, THIN_AIR, BDO_BENCH, coachDebut, LEGENDS, CAROUSEL, carouselAt, bdoScore, bdoMood, bdoRivals, bdoPerGame, cwcField, twilight, bodyAge, BOOST_TIERS_RANK: tierRank, shiftAges, fitSeasonTable,
            CONTINENTAL_KEEP, crestColors, waveColors, managers, clubManager, nationManager, kitColors, kitSvg, banFallout, clubFit, fitRegain, starBar, HIGH_OVR, seasonPull, offerWeight, applyOffers, marketBars, LEAGUE_KEEP, CLUB_FIT, MARKET_RIVAL, ELITE, SETTLED, SUITORS, FORMATIONS, clubFormation, starSlot, STAR_NATIONS, eliteOf, ELITE_REP, ELITE_TITLES, regenManager, coachLift, ratingOf, boostSealed, sealedHint, leaguePoints, roundOdds, WORLD_SHAKE, PRIORITY_KEEP, leagueClubs, talismanOn, perkOn, retireWays, BDO_KEEPER, SECONDARY_WIN, RANDOM_NATION_WEIGHTS, homeClub, forcedLine, TWILIGHT_COSTS, TWILIGHT_MARKET, ageDrift, AGE_DRIFT, wearCost, WEAR_COST, starFloor, cardRole, realPromotion, LEAGUE_RULES, PROMOTION_WAYS, seasonResult,
            GOODBYE, goodbyeChance, UNDERDOG, underdogKeep, clubMatches, applyRealGames, ageReason, VETERAN, STAR_HOME, ADVENTURE, marketLevel, setOldInjury: (v) => { OLD_INJURY_SET = v; }, stats: () => stats, config: () => config });
    }

