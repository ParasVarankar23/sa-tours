// Helper utilities for pickup/drop option generation and booking config
function _norm(s) {
    if (s === null || s === undefined) return "";
    return String(s).trim();
}

function _normKey(s) {
    return _norm(s).toLowerCase();
}

export function getStopNames(stops) {
    if (!Array.isArray(stops)) return [];
    return stops.map((s) => (s && typeof s === "object" ? (s.stopName || "") : String(s || "")));
}

export function getEffectiveBookingConfig(schedules = {}, selectedBus = null, date = "") {
    try {
        if (schedules && selectedBus && date) {
            const busSchedules = schedules[selectedBus.busId] || {};
            const sched = busSchedules[date] || {};
            if (sched && sched.pricingOverride && sched.pricingOverride.bookingConfig) return sched.pricingOverride.bookingConfig;
        }
    } catch (e) {
        // ignore
    }
    if (selectedBus && selectedBus.bookingConfig) return selectedBus.bookingConfig;
    return {};
}

export function getPickupOptions(stops, bookingConfig = {}) {
    const names = getStopNames(stops);
    const hidden = (bookingConfig.hiddenPickupStops || []).map(_normKey);
    return names.filter((n) => n && !hidden.includes(_normKey(n)));
}

// blockedPairs: array of [from, to]
function isBlockedPair(from, to, bookingConfig) {
    const pairs = bookingConfig.blockedPairs || [];
    const f = _normKey(from);
    const t = _normKey(to);
    for (const p of pairs) {
        if (!Array.isArray(p) || p.length < 2) continue;
        if (_normKey(p[0]) === f && _normKey(p[1]) === t) return true;
    }
    return false;
}

export function getDropGroups(stops, pickup, bookingConfig = {}) {
    const names = getStopNames(stops || []);
    if (!pickup) return [];
    const norm = names.map(_normKey);
    const pickupIdx = norm.indexOf(_normKey(pickup));
    if (pickupIdx === -1) return [];

    const cityEntry = bookingConfig.cityEntryStop || bookingConfig.cityEntry || null;
    let cityEntryIdx = cityEntry ? norm.indexOf(_normKey(cityEntry)) : -1;
    // if not found, try common fallback 'panvel'
    if (cityEntryIdx === -1) {
        cityEntryIdx = norm.indexOf('panvel');
    }

    const returnVillageStart = bookingConfig.returnVillageStartStop || bookingConfig.returnVillageStart || null;
    const returnVillageIdx = returnVillageStart ? Math.max(0, norm.indexOf(_normKey(returnVillageStart))) : -1;

    const hiddenDrops = (bookingConfig.hiddenDropStops || []).map(_normKey);
    const majorStopsCfg = (bookingConfig.majorDropStops || []).map(_normKey);

    const groups = [];

    // Determine direction
    const isForward = cityEntryIdx === -1 ? pickupIdx < names.length - 1 : pickupIdx < cityEntryIdx;

    if (isForward) {
        // intermediate = stops after pickup until cityEntry (exclusive)
        const interStart = pickupIdx + 1;
        const interEnd = cityEntryIdx === -1 ? names.length - 1 : Math.min(cityEntryIdx - 1, names.length - 1);
        const intermediate = [];
        for (let i = interStart; i <= interEnd; i++) {
            const n = names[i];
            if (!n) continue;
            if (hiddenDrops.includes(_normKey(n))) continue;
            if (isBlockedPair(pickup, n, bookingConfig)) continue;
            // exclude major stops from intermediate
            if (majorStopsCfg.includes(_normKey(n))) continue;
            intermediate.push({ name: n, index: i });
        }

        // major stops: from cityEntry onwards (or configured major stops present in list)
        const major = [];
        for (let i = (cityEntryIdx === -1 ? names.length - 1 : cityEntryIdx); i < names.length; i++) {
            const n = names[i];
            if (!n) continue;
            if (hiddenDrops.includes(_normKey(n))) continue;
            if (isBlockedPair(pickup, n, bookingConfig)) continue;
            // only include if present in configured major stops OR index at/after cityEntry
            if (majorStopsCfg.length > 0) {
                if (!majorStopsCfg.includes(_normKey(n))) continue;
            }
            major.push({ name: n, index: i });
        }

        if (intermediate.length) groups.push({ label: 'Intermediate / Particular Stops', options: intermediate });
        if (major.length) groups.push({ label: 'Major Drop Stops', options: major });
    } else {
        // return direction: pickup is at/after cityEntry
        // major return stops: major stops between cityEntry and pickup (exclusive), listed from nearest to pickup going back
        const majorsBetween = [];
        for (let i = 0; i < names.length; i++) {
            const n = names[i];
            if (!n) continue;
            if (!majorStopsCfg.includes(_normKey(n))) continue;
            if (i >= (cityEntryIdx === -1 ? 0 : cityEntryIdx) && i < pickupIdx) {
                if (hiddenDrops.includes(_normKey(n))) continue;
                if (isBlockedPair(pickup, n, bookingConfig)) continue;
                majorsBetween.push({ name: n, index: i });
            }
        }
        // nearest first: reverse order so closer to pickup shows first
        majorsBetween.sort((a, b) => b.index - a.index);

        // village-side stops starting from returnVillageStartStop backward
        const village = [];
        let rvIdx = returnVillageIdx;
        if (rvIdx === -1) {
            // fallback: first stop before cityEntryIdx
            rvIdx = cityEntryIdx === -1 ? Math.max(0, names.length - 1) : Math.max(0, cityEntryIdx - 1);
        }
        for (let i = rvIdx; i >= 0; i--) {
            const n = names[i];
            if (!n) continue;
            if (hiddenDrops.includes(_normKey(n))) continue;
            if (isBlockedPair(pickup, n, bookingConfig)) continue;
            // avoid listing stops that are city major duplicates already added
            if (majorStopsCfg.includes(_normKey(n)) && i >= (cityEntryIdx === -1 ? 0 : cityEntryIdx)) continue;
            village.push({ name: n, index: i });
        }

        if (majorsBetween.length) groups.push({ label: 'Major return stops', options: majorsBetween });
        if (village.length) groups.push({ label: 'Village-side stops', options: village });
    }

    return groups;
}

export default {
    getStopNames,
    getEffectiveBookingConfig,
    getPickupOptions,
    getDropGroups,
};
