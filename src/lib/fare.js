export const ROUTES = {
    DIGHI_TO_DONGRI: "DIGHI_TO_DONGRI",
    BORLI_TO_DONGRI: "BORLI_TO_DONGRI",
    DONGRI_TO_DIGHI: "DONGRI_TO_DIGHI",
    DONGRI_TO_BORLI: "DONGRI_TO_BORLI",
};

export const BUS_TYPES = {
    NON_AC: "NON_AC",
    AC: "AC",
};

export const AC_SURCHARGE = 0;

/* -------------------------------------------------------
   CITY SIDE STOPS (FORWARD ORDER: PANVEL -> DONGRI)
------------------------------------------------------- */
export const CITY_STOPS = [
    "Panvel",
    "Kamothe",
    "Kharghar",
    "Belapur",
    "Seawoods",
    "Nerul",
    "Juinagar",
    "Vashi",
    "Mankhurd",
    "Govandi",
    "Chembur",
    "Kurla",
    "Wadala",
    "Byculla",
    "Masjid Bandar",
    "Dongri",
];

/* -------------------------------------------------------
   VILLAGE SIDE STOPS
   NOTE:
   - Standard stored value is "Vadvali"
   - Both "Vadvali" and "Vadvali" are accepted via aliases
------------------------------------------------------- */
export const BORLI_VILLAGE_STOPS = [
    "Shekhadi",
    "Borli",
    "Kapoli",
    "Shiste",
    "Vadvali Phata",
    "Velas",
    "Vadvali",
    "Gondghar",
    "Mendadi",
    "Kharasai",
    "Varvatna",
    "Banoti",
    "Mhasla",
    "Sai",
    "Morba",
    "Mangaon",
    "Indapur",
    "Kolad",
];

export const DIGHI_VILLAGE_STOPS = [
    "Dighi",
    "Kudgaon",
    "Adgaon",
    "Velas",
    "Vadvali",
    "Gondghar",
    "Mendadi",
    "Kharasai",
    "Varvatna",
    "Banoti",
    "Mhasla",
    "Sai",
    "Morba",
    "Mangaon",
    "Indapur",
    "Kolad",
];

/* -------------------------------------------------------
   FARE GROUPS (NON-AC BASE FARE)
------------------------------------------------------- */
export const BORLI_FARE_GROUPS = [
    {
        zone: "BORLI_GROUP_1",
        fare: 550,
        stops: ["Shekhadi"],
    },
    {
        zone: "BORLI_GROUP_2",
        fare: 450,
        stops: [
            "Borli",
            "Kapoli",
            "Shiste",
            "Vadvali Phata",
            "Velas",
            "Vadvali",
            "Gondghar",
            "Mendadi",
        ],
    },
    {
        zone: "BORLI_GROUP_3",
        fare: 400,
        stops: ["Kharasai", "Varvatna", "Banoti", "Mhasla", "Sai", "Morba"],
    },
    {
        zone: "BORLI_GROUP_4",
        fare: 350,
        stops: ["Mangaon", "Indapur", "Kolad"],
    },
];

export const DIGHI_FARE_GROUPS = [
    {
        zone: "DIGHI_GROUP_1",
        fare: 500,
        stops: ["Dighi", "Velas"],
    },
    {
        zone: "DIGHI_GROUP_2",
        fare: 550,
        stops: ["Adgaon"],
    },
    {
        zone: "DIGHI_GROUP_3",
        fare: 450,
        stops: ["Kudgaon", "Vadvali", "Gondghar", "Mendadi"],
    },
    {
        zone: "DIGHI_GROUP_4",
        fare: 400,
        stops: ["Kharasai", "Varvatna", "Banoti", "Mhasla", "Sai", "Morba"],
    },
    {
        zone: "DIGHI_GROUP_5",
        fare: 350,
        stops: ["Mangaon", "Indapur", "Kolad"],
    },
];

/* -------------------------------------------------------
   STOP ALIASES / NORMALIZATION MAP
------------------------------------------------------- */
const STOP_ALIASES = {
    // Common city aliases
    panvel: "Panvel",
    kamothe: "Kamothe",
    kharghar: "Kharghar",
    belapur: "Belapur",
    cbdbelapur: "Belapur",
    "cbd belapur": "Belapur",
    seawoods: "Seawoods",
    seawood: "Seawoods",
    nerul: "Nerul",
    juinagar: "Juinagar",
    vashi: "Vashi",
    mankhurd: "Mankhurd",
    mankhur: "Mankhurd",
    govandi: "Govandi",
    chembur: "Chembur",
    kurla: "Kurla",
    wadala: "Wadala",
    byculla: "Byculla",
    masjidbandar: "Masjid Bandar",
    "masjid bandar": "Masjid Bandar",
    // common misspellings
    majizdbandar: "Masjid Bandar",
    "majizd bandar": "Masjid Bandar",
    dongri: "Dongri",

    // Borli side
    shekhadi: "Shekhadi",
    borli: "Borli",
    kapoli: "Kapoli",
    shiste: "Shiste",
    shishti: "Shiste",
    vadvaliphata: "Vadvali Phata",
    "vadvali phata": "Vadvali Phata",

    // Shared / common villages
    velas: "Velas",

    // BOTH SPELLINGS SUPPORTED -> normalized to one standard value
    vadvali: "Vadvali",
    Vadvali: "Vadvali",

    gondghar: "Gondghar",
    mendadi: "Mendadi",
    kharasai: "Kharasai",

    // NEW STOP
    varvatna: "Varvatna",
    varvatane: "Varvatna",

    banoti: "Banoti",
    mhasla: "Mhasla",
    sai: "Sai",
    morba: "Morba",
    mangaon: "Mangaon",
    mangoan: "Mangaon",
    indapur: "Indapur",
    kolad: "Kolad",

    // Dighi side
    dighi: "Dighi",
    kudgaon: "Kudgaon",
    adgaon: "Adgaon",
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function sanitizeStopKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^a-z\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function compactStopKey(value) {
    return sanitizeStopKey(value).replace(/\s+/g, "");
}

export function normalizeStopName(stop) {
    if (!stop) return "";

    const raw = sanitizeStopKey(stop);
    const compact = compactStopKey(stop);

    return STOP_ALIASES[raw] || STOP_ALIASES[compact] || String(stop).trim();
}

export function isCityStop(stop) {
    const normalized = normalizeStopName(stop);
    return CITY_STOPS.includes(normalized);
}

export function isBorliVillageStop(stop) {
    const normalized = normalizeStopName(stop);
    return BORLI_VILLAGE_STOPS.includes(normalized);
}

export function isDighiVillageStop(stop) {
    const normalized = normalizeStopName(stop);
    return DIGHI_VILLAGE_STOPS.includes(normalized);
}

export function getVillageStopsByRoute(route) {
    switch (route) {
        case ROUTES.BORLI_TO_DONGRI:
        case ROUTES.DONGRI_TO_BORLI:
            return BORLI_VILLAGE_STOPS;

        case ROUTES.DIGHI_TO_DONGRI:
        case ROUTES.DONGRI_TO_DIGHI:
            return DIGHI_VILLAGE_STOPS;

        default:
            return [];
    }
}

export function getFareGroupsByRoute(route) {
    switch (route) {
        case ROUTES.BORLI_TO_DONGRI:
        case ROUTES.DONGRI_TO_BORLI:
            return BORLI_FARE_GROUPS;

        case ROUTES.DIGHI_TO_DONGRI:
        case ROUTES.DONGRI_TO_DIGHI:
            return DIGHI_FARE_GROUPS;

        default:
            return [];
    }
}

export function isForwardRoute(route) {
    return (
        route === ROUTES.BORLI_TO_DONGRI ||
        route === ROUTES.DIGHI_TO_DONGRI
    );
}

export function isReturnRoute(route) {
    return (
        route === ROUTES.DONGRI_TO_BORLI ||
        route === ROUTES.DONGRI_TO_DIGHI
    );
}

export function getFareZoneForStop(route, stop) {
    const normalized = normalizeStopName(stop);
    const groups = getFareGroupsByRoute(route);

    for (const group of groups) {
        if (group.stops.includes(normalized)) {
            return {
                zone: group.zone,
                baseFare: group.fare,
                stop: normalized,
            };
        }
    }

    return null;
}

export function getRouteDirectionLabel(route) {
    switch (route) {
        case ROUTES.DIGHI_TO_DONGRI:
            return "Dighi → Dongri";
        case ROUTES.BORLI_TO_DONGRI:
            return "Borli → Dongri";
        case ROUTES.DONGRI_TO_DIGHI:
            return "Dongri → Dighi";
        case ROUTES.DONGRI_TO_BORLI:
            return "Dongri → Borli";
        default:
            return "Unknown Route";
    }
}

/* -------------------------------------------------------
   ORDERED CITY STOPS (VERY IMPORTANT FOR UI)
------------------------------------------------------- */

// Forward order: Panvel -> Dongri
export function getForwardCityStops() {
    return [...CITY_STOPS];
}

// Return order: Dongri -> Panvel
export function getReturnCityStops() {
    return [...CITY_STOPS].reverse();
}

/* -------------------------------------------------------
   PICKUP / DROP HELPERS (BEST FOR DROPDOWNS)
------------------------------------------------------- */
export function getAvailablePickupStops(route) {
    switch (route) {
        case ROUTES.BORLI_TO_DONGRI:
            return BORLI_VILLAGE_STOPS;

        case ROUTES.DIGHI_TO_DONGRI:
            return DIGHI_VILLAGE_STOPS;

        case ROUTES.DONGRI_TO_BORLI:
        case ROUTES.DONGRI_TO_DIGHI:
            return getReturnCityStops();

        default:
            return [];
    }
}

export function getAvailableDropStops(route) {
    switch (route) {
        case ROUTES.BORLI_TO_DONGRI:
        case ROUTES.DIGHI_TO_DONGRI:
            return getForwardCityStops();

        case ROUTES.DONGRI_TO_BORLI:
            return BORLI_VILLAGE_STOPS;

        case ROUTES.DONGRI_TO_DIGHI:
            return DIGHI_VILLAGE_STOPS;

        default:
            return [];
    }
}

/* -------------------------------------------------------
   ROUTE-SPECIFIC HELPERS (OPTIONAL, GOOD FOR UI)
------------------------------------------------------- */

// BORLI
export function getBorliForwardPickupStops() {
    return BORLI_VILLAGE_STOPS;
}

export function getBorliForwardDropStops() {
    return getForwardCityStops();
}

export function getBorliReturnPickupStops() {
    return getReturnCityStops();
}

export function getBorliReturnDropStops() {
    return BORLI_VILLAGE_STOPS;
}

// DIGHI
export function getDighiForwardPickupStops() {
    return DIGHI_VILLAGE_STOPS;
}

export function getDighiForwardDropStops() {
    return getForwardCityStops();
}

export function getDighiReturnPickupStops() {
    return getReturnCityStops();
}

export function getDighiReturnDropStops() {
    return DIGHI_VILLAGE_STOPS;
}

/* -------------------------------------------------------
   MAIN FARE FUNCTION
------------------------------------------------------- */
export function getFare({
    route,
    pickup,
    drop,
    busType = BUS_TYPES.NON_AC,
}) {
    const normalizedPickup = normalizeStopName(pickup);
    const normalizedDrop = normalizeStopName(drop);

    const responseBase = {
        amount: 0,
        baseAmount: 0,
        surcharge: 0,
        busType,
        route,
        routeLabel: getRouteDirectionLabel(route),
        zone: null,
        pickup: normalizedPickup,
        drop: normalizedDrop,
        isValid: false,
        error: null,
    };

    if (!route || !Object.values(ROUTES).includes(route)) {
        return {
            ...responseBase,
            error: "Invalid route selected.",
        };
    }

    if (!pickup || !drop) {
        return {
            ...responseBase,
            error: "Pickup and drop are required.",
        };
    }

    if (!Object.values(BUS_TYPES).includes(busType)) {
        return {
            ...responseBase,
            error: "Invalid bus type selected.",
        };
    }

    if (normalizedPickup === normalizedDrop) {
        return {
            ...responseBase,
            error: "Pickup and drop cannot be the same.",
        };
    }

    // FORWARD ROUTE VALIDATION
    if (isForwardRoute(route)) {
        const validVillageStops = getVillageStopsByRoute(route);

        if (!validVillageStops.includes(normalizedPickup)) {
            return {
                ...responseBase,
                error:
                    "Invalid pickup point for this route. Please select a valid village-side pickup stop.",
            };
        }

        if (!isCityStop(normalizedDrop)) {
            return {
                ...responseBase,
                error:
                    "Invalid drop point for this route. Please select a valid city-side drop stop (Panvel to Dongri).",
            };
        }

        const fareZone = getFareZoneForStop(route, normalizedPickup);

        if (!fareZone) {
            return {
                ...responseBase,
                error: "No fare zone found for the selected pickup point.",
            };
        }

        const surcharge = busType === BUS_TYPES.AC ? AC_SURCHARGE : 0;
        const amount = fareZone.baseFare + surcharge;

        return {
            ...responseBase,
            amount,
            baseAmount: fareZone.baseFare,
            surcharge,
            zone: fareZone.zone,
            isValid: true,
            error: null,
        };
    }

    // RETURN ROUTE VALIDATION
    if (isReturnRoute(route)) {
        const validVillageStops = getVillageStopsByRoute(route);

        if (!isCityStop(normalizedPickup)) {
            return {
                ...responseBase,
                error:
                    "Invalid pickup point for return route. Please select a valid city-side pickup stop (Dongri to Panvel side).",
            };
        }

        if (!validVillageStops.includes(normalizedDrop)) {
            return {
                ...responseBase,
                error:
                    "Invalid drop point for return route. Please select a valid village-side drop stop.",
            };
        }

        const fareZone = getFareZoneForStop(route, normalizedDrop);

        if (!fareZone) {
            return {
                ...responseBase,
                error: "No fare zone found for the selected destination village stop.",
            };
        }

        const surcharge = busType === BUS_TYPES.AC ? AC_SURCHARGE : 0;
        const amount = fareZone.baseFare + surcharge;

        return {
            ...responseBase,
            amount,
            baseAmount: fareZone.baseFare,
            surcharge,
            zone: fareZone.zone,
            isValid: true,
            error: null,
        };
    }

    return {
        ...responseBase,
        error: "Unable to calculate fare for the selected route.",
    };
}

/* -------------------------------------------------------
   FARE PREVIEW HELPER
------------------------------------------------------- */
export function getFarePreviewByRoute(route, busType = BUS_TYPES.NON_AC) {
    const groups = getFareGroupsByRoute(route);
    const surcharge = busType === BUS_TYPES.AC ? AC_SURCHARGE : 0;

    return groups.map((group) => ({
        zone: group.zone,
        stops: group.stops,
        baseFare: group.fare,
        surcharge,
        amount: group.fare + surcharge,
        busType,
    }));
}

/* -------------------------------------------------------
   EXAMPLE USAGE
------------------------------------------------------- */

// Example 1: Borli -> Dongri
// getFare({
//   route: ROUTES.BORLI_TO_DONGRI,
//   pickup: "Varvatna",
//   drop: "Belapur",
//   busType: BUS_TYPES.NON_AC,
// });

// Example 2: Dongri -> Borli
// getFare({
//   route: ROUTES.DONGRI_TO_BORLI,
//   pickup: "Seawoods",
//   drop: "Varvatna",
//   busType: BUS_TYPES.AC,
// });

// Example 3: Dighi -> Dongri
// getFare({
//   route: ROUTES.DIGHI_TO_DONGRI,
//   pickup: "Varvatna",
//   drop: "Dongri",
//   busType: BUS_TYPES.NON_AC,
// });

// Example 4: Dongri -> Dighi
// getFare({
//   route: ROUTES.DONGRI_TO_DIGHI,
//   pickup: "Masjid Bandar",
//   drop: "Varvatna",
//   busType: BUS_TYPES.AC,
// });