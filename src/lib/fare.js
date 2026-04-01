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
   CITY SIDE STOPS (FORWARD ORDER: VILLAGE -> DONGRI)
------------------------------------------------------- */
export const CITY_STOPS = [
    "Panvel",
    "Kalamboli",
    "Khanda Colony",
    "Kamothe",
    "Kharghar",
    "CBD Belapur",
    "Seawoods",
    "Nerul",
    "Juinagar",
    "Vashi",
    "Mankhurd",
    "Govandi",
    "Chembur",
    "Sion",
    "Kurla",
    "Dadar",
    "Byculla",
    "Masjid Bandar",
    "Dongri",
];

/* -------------------------------------------------------
   COMMON VILLAGE STOPS
------------------------------------------------------- */
export const COMMON_VILLAGE_STOPS = [
    "Gondghar",
    "Mendadi",
    "Mendadi Grampanchayat",
    "Kharsai Dam",
    "Kharsai School",
    "Varvatna",
    "Banoti",
    "Tondsure",
    "Saklap",
    "Mhasla",
    "Mhasla Stand",
    "Pabra Fata",
    "Dorje",
    "Chandore",
    "Sai",
    "Morba",
    "Surle",
    "Mangaon",
    "Indapur",
    "Kolad",
];

/* -------------------------------------------------------
   BORLI SIDE VILLAGE STOPS
------------------------------------------------------- */
export const BORLI_VILLAGE_STOPS = [
    "Shekhadi",
    "Valvati",
    "Bharadkhol",
    "Aravi",
    "Kondvili",
    "Dighi",
    "Kudgaon",
    "Adgaon",
    "Velas",
    "Vadavli",
    "Vadavli Fata",
    "Borli",
    "Pohamil",
    "ST Stand",
    "Ganesh Chowk",
    "Shivaji Chowk",
    "Samtanagar",
    "Bhava Fata",
    "Kapoli",
    "Shiste",
    ...COMMON_VILLAGE_STOPS,
];

/* -------------------------------------------------------
   DIGHI SIDE VILLAGE STOPS
------------------------------------------------------- */
export const DIGHI_VILLAGE_STOPS = [
    "Dighi",
    "Kudgaon",
    "Adgaon",
    "Velas",
    "Vadavli",
    "Vadavli Fata",
    "Borli",
    "Pohamil",
    "ST Stand",
    "Ganesh Chowk",
    "Shivaji Chowk",
    "Samtanagar",
    "Bhava Fata",
    "Kapoli",
    "Shiste",
    ...COMMON_VILLAGE_STOPS,
];

/* -------------------------------------------------------
   FARE GROUPS (NON-AC BASE FARE)
   CUSTOM PRICING AS PER YOUR REQUIREMENT
------------------------------------------------------- */
export const BORLI_FARE_GROUPS = [
    {
        zone: "BORLI_GROUP_1",
        fare: 550,
        stops: [
            "Shekhadi",
            "Valvati",
            "Bharadkhol",
            "Aravi",
            "Kondvili",
        ],
    },
    {
        zone: "BORLI_GROUP_1A",
        fare: 500,
        stops: ["Dighi"],
    },
    {
        zone: "BORLI_GROUP_1B",
        fare: 550,
        stops: [
            "Adgaon",
            "Kudgaon",
        ],
    },
    {
        zone: "BORLI_GROUP_2",
        fare: 450,
        stops: [
            "Velas",
            "Vadavli",
            "Vadavli Fata",
            "Borli",
            "Pohamil",
            "ST Stand",
            "Ganesh Chowk",
            "Shivaji Chowk",
            "Samtanagar",
            "Bhava Fata",
            "Kapoli",
            "Shiste",
            "Gondghar",
            "Mendadi",
            "Mendadi Grampanchayat",
        ],
    },
    {
        zone: "BORLI_GROUP_3",
        fare: 400,
        stops: [
            "Kharsai Dam",
            "Kharsai School",
            "Varvatna",
            "Banoti",
            "Tondsure",
            "Saklap",
            "Mhasla",
            "Mhasla Stand",
            "Pabra Fata",
            "Dorje",
            "Chandore",
            "Sai",
            "Morba",
            "Surle",
        ],
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
        stops: [
            "Dighi",
            "Kudgaon",
        ],
    },
    {
        zone: "DIGHI_GROUP_2",
        fare: 550,
        stops: ["Adgaon"],
    },
    {
        zone: "DIGHI_GROUP_3",
        fare: 450,
        stops: [
            "Velas",
            "Vadavli",
            "Vadavli Fata",
            "Shiste",
            "Kapoli",
            "Borli",
            "Ganesh Chowk",
            "Shivaji Chowk",
            "Samtanagar",
            "Bhava Fata",
            "Pohamil",
            "ST Stand",
            "Gondghar",
            "Mendadi",
            "Mendadi Grampanchayat",
        ],
    },
    {
        zone: "DIGHI_GROUP_4",
        fare: 400,
        stops: [
            "Kharsai Dam",
            "Kharsai School",
            "Varvatna",
            "Banoti",
            "Tondsure",
            "Saklap",
            "Mhasla",
            "Mhasla Stand",
            "Pabra Fata",
            "Dorje",
            "Chandore",
            "Sai",
            "Morba",
            "Surle",
        ],
    },
    {
        zone: "DIGHI_GROUP_5",
        fare: 350,
        stops: ["Mangaon", "Indapur", "Kolad"],
    },
    {
        zone: "DIGHI_GROUP_6",
        fare: 550,
        stops: [
            "Shekhadi",
            "Valvati",
            "Bharadkhol",
            "Aravi",
            "Kondvili",
        ],
    },
];

/* -------------------------------------------------------
   STOP ALIASES / NORMALIZATION MAP
------------------------------------------------------- */
const STOP_ALIASES = {
    // City side
    panvel: "Panvel",
    kalamboli: "Kalamboli",
    "khanda colony": "Khanda Colony",
    khandacolony: "Khanda Colony",
    kamothe: "Kamothe",
    kharghar: "Kharghar",
    belapur: "CBD Belapur",
    cbdbelapur: "CBD Belapur",
    "cbd belapur": "CBD Belapur",
    seawoods: "Seawoods",
    seawood: "Seawoods",
    nerul: "Nerul",
    juinagar: "Juinagar",
    vashi: "Vashi",
    mankhurd: "Mankhurd",
    govandi: "Govandi",
    chembur: "Chembur",
    sion: "Sion",
    kurla: "Kurla",
    dadar: "Dadar",
    byculla: "Byculla",
    masjidbandar: "Masjid Bandar",
    "masjid bandar": "Masjid Bandar",
    dongri: "Dongri",

    // Village side
    shekhadi: "Shekhadi",
    valvati: "Valvati",
    bharadkhol: "Bharadkhol",
    aravi: "Aravi",
    kondvili: "Kondvili",

    dighi: "Dighi",
    kudgaon: "Kudgaon",
    adgaon: "Adgaon",
    velas: "Velas",

    vadavli: "Vadavli",
    vadvali: "Vadavli",
    "vadavli fata": "Vadavli Fata",
    vadavlifata: "Vadavli Fata",
    "vadvali fata": "Vadavli Fata",
    "vadvali phata": "Vadavli Fata",
    vadvaliphata: "Vadavli Fata",

    borli: "Borli",
    kapoli: "Kapoli",
    shiste: "Shiste",
    shishti: "Shiste",

    pohamil: "Pohamil",
    "st stand": "ST Stand",
    ststand: "ST Stand",

    "ganesh chowk": "Ganesh Chowk",
    ganeshchowk: "Ganesh Chowk",

    "shivaji chowk": "Shivaji Chowk",
    shivajichowk: "Shivaji Chowk",

    samtanagar: "Samtanagar",

    "bhava fata": "Bhava Fata",
    bhavafata: "Bhava Fata",

    gondghar: "Gondghar",

    mendadi: "Mendadi",
    "mendadi grampanchayat": "Mendadi Grampanchayat",
    mendadigrampanchayat: "Mendadi Grampanchayat",
    "mendadi gram panchayat": "Mendadi Grampanchayat",
    mendadigrampanchyat: "Mendadi Grampanchayat",
    "mendadi grampanchyat": "Mendadi Grampanchayat",

    "kharsai dam": "Kharsai Dam",
    kharsaidam: "Kharsai Dam",

    "kharsai school": "Kharsai School",
    kharsaischool: "Kharsai School",

    // old typo compatibility
    kharasai: "Kharsai Dam",

    varvatna: "Varvatna",
    varvatane: "Varvatna",

    banoti: "Banoti",
    tondsure: "Tondsure",
    saklap: "Saklap",

    mhasla: "Mhasla",
    "mhasla stand": "Mhasla Stand",
    mhaslastand: "Mhasla Stand",

    "pabra fata": "Pabra Fata",
    pabrafata: "Pabra Fata",

    dorje: "Dorje",
    chandore: "Chandore",

    sai: "Sai",
    morba: "Morba",
    surle: "Surle",
    surl: "Surle",

    mangaon: "Mangaon",
    mangoan: "Mangaon",

    indapur: "Indapur",
    kolad: "Kolad",
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
   ORDERED CITY STOPS
------------------------------------------------------- */
export function getForwardCityStops() {
    return [...CITY_STOPS];
}

export function getReturnCityStops() {
    return [...CITY_STOPS].reverse();
}

/* -------------------------------------------------------
   FULL ROUTE HELPERS
------------------------------------------------------- */
export function getFullForwardRouteStops(route) {
    switch (route) {
        case ROUTES.BORLI_TO_DONGRI:
            return [...BORLI_VILLAGE_STOPS, ...CITY_STOPS];

        case ROUTES.DIGHI_TO_DONGRI:
            return [...DIGHI_VILLAGE_STOPS, ...CITY_STOPS];

        default:
            return [];
    }
}

export function getFullReturnRouteStops(route) {
    switch (route) {
        case ROUTES.DONGRI_TO_BORLI:
            return [...getReturnCityStops(), ...[...BORLI_VILLAGE_STOPS].reverse()];

        case ROUTES.DONGRI_TO_DIGHI:
            return [...getReturnCityStops(), ...[...DIGHI_VILLAGE_STOPS].reverse()];

        default:
            return [];
    }
}

/* -------------------------------------------------------
   PICKUP / DROP HELPERS
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

    // FORWARD ROUTE (Village -> City)
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
                    "Invalid drop point for this route. Please select a valid city-side drop stop.",
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

    // RETURN ROUTE (City -> Village)
    if (isReturnRoute(route)) {
        const validVillageStops = getVillageStopsByRoute(route);

        if (!isCityStop(normalizedPickup)) {
            return {
                ...responseBase,
                error:
                    "Invalid pickup point for return route. Please select a valid city-side pickup stop.",
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