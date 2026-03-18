// Pricing engine utility

/**
 * Calculate fare between two stops using bus pricing config.
 * bus: bus object from Firebase containing pricingRules and stops
 */
export function calculateFare({ bus, fromStop, toStop, busType = "AC", season = false }) {
    if (!bus || !bus.stops || !Array.isArray(bus.stops)) {
        return { fare: 0, fareRuleMatched: null, stopDistance: 0, routeDirection: null };
    }

    const stops = bus.stops.map((s) => (typeof s === "string" ? s : s.stopName));

    const idxFrom = stops.indexOf(fromStop);
    const idxTo = stops.indexOf(toStop);

    if (idxFrom === -1 || idxTo === -1) {
        return { error: "Invalid stop", fare: 0 };
    }

    let routeDirection = idxTo > idxFrom ? "forward" : "reverse";
    const stopDistance = Math.abs(idxTo - idxFrom);

    // check exact fare map
    const exactMap = (bus.pricingRules && bus.pricingRules.exactFareMap) || {};
    const key = `${fromStop}|${toStop}`;
    const reverseKey = `${toStop}|${fromStop}`;
    if (exactMap[key]) {
        let fareVal = Number(exactMap[key]);
        const seasonInc = (bus.pricingRules && Number(bus.pricingRules.seasonIncrement)) || 0;
        if (season && seasonInc) fareVal = fareVal + seasonInc;
        return { fare: fareVal, fareRuleMatched: key, stopDistance, routeDirection, busType };
    }
    if (exactMap[reverseKey]) {
        let fareVal = Number(exactMap[reverseKey]);
        const seasonInc = (bus.pricingRules && Number(bus.pricingRules.seasonIncrement)) || 0;
        if (season && seasonInc) fareVal = fareVal + seasonInc;
        return { fare: fareVal, fareRuleMatched: reverseKey, stopDistance, routeDirection, busType };
    }

    // fallback to segment pricing
    const rules = (bus.pricingRules && bus.pricingRules) || {};
    const ac = rules.acSegmentFare || { short: 150, medium: 250, long: 350, full: 450 };
    const non = rules.nonAcSegmentFare || { short: 120, medium: 200, long: 300, full: 400 };

    let fare = 0;
    if (stopDistance <= 2) fare = ac.short;
    else if (stopDistance <= 4) fare = ac.medium;
    else if (stopDistance <= 6) fare = ac.long;
    else fare = ac.full;

    if (busType && busType.toLowerCase().includes("non")) {
        // use non-AC fallback
        if (stopDistance <= 2) fare = non.short;
        else if (stopDistance <= 4) fare = non.medium;
        else if (stopDistance <= 6) fare = non.long;
        else fare = non.full;
    }

    // apply season increment if requested
    const seasonInc = (bus.pricingRules && Number(bus.pricingRules.seasonIncrement)) || 0;
    if (season && seasonInc) fare = fare + seasonInc;

    return { fare, fareRuleMatched: "segment_fallback", stopDistance, routeDirection, busType };
}

export default { calculateFare };
