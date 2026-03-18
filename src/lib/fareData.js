// Simple fare data model and helpers

export const SEASON_INCREMENT_DEFAULT = 100;
export const NON_AC_DIFF_DEFAULT = -50; // Non-AC regular is AC regular + this diff

// Example fare table derived from user input (partial). Keys are originGroup -> destinationGroup -> base AC regular fare (number)
export const fareTable = {
    "Borli Group": {
        "Borli": 400,
        "Kapoli": 450,
        "Shiste": 500,
    },
    "Dighi / Adgaon Group": {
        "Dighi": 450,
        "Adgaon": 500,
    },
    "Mhasala Group": {
        "Kharsai": 400,
        "Banoti": 400,
        "Mhasala": 450,
    },
    "Mangaon Group": {
        "Morba": 350,
        "Mangaon": 350,
    },
    "Kolad Group": {
        "Kolad": 300,
        "Vadhkala": 350,
    }
};

// Build an exact fare map usable by pricing.calculateFare
export function buildExactFareMap(originGroupKey, options = {}) {
    const originMap = fareTable[originGroupKey] || {};
    const exact = {};
    const seasonInc = Number(options.seasonIncrement || SEASON_INCREMENT_DEFAULT);
    const nonAcDiff = Number(options.nonAcDiff || NON_AC_DIFF_DEFAULT);

    // For each destination in group, set AC regular fare
    Object.keys(originMap).forEach((dest) => {
        const acFare = Number(originMap[dest]);
        // assume origin group name as origin stop name placeholder
        const originName = originGroupKey;
        const key = `${originName}|${dest}`;
        exact[key] = acFare;
        // add non-ac variant (consumer of map should supply busType=Non-AC to apply non-ac rules)
        // Also add season variant keys if needed: we'll store base and let pricing logic apply season increment
    });

    return exact;
}

export default { fareTable, buildExactFareMap };
