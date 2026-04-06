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
    "Panvel ST Stand",
    "Uran Phata",
    "Garden Hotel",
    "Palspa Phata",
    "Kalamboli",
    "Khanda Colony",
    "Kamothe",
    "Kharghar",
    "CBD Belapur",
    "Seawoods",
    "Nerul",
    "Juinagar",
    "Sanpada",
    "Vashi Stand",
    "Turbhe Bridge",
    "Mankhurd",
    "Govandi",
    "Chembur",
    "Sion",
    "Kurla",
    "Dadar",
    "Wadala IMAX",
    "Byculla",
    "Masjid Bandar",
    "Dongri",
];

/* -------------------------------------------------------
   COMMON VILLAGE STOPS
------------------------------------------------------- */
export const COMMON_VILLAGE_STOPS = [
    "Gondghar",
    "HP Petrol Pump",
    "Nayar Petrol Pump",
    "Essar Pump",
    "Khanlosh",
    "Mendadi",
    "Mendadi Grampanchayat",
    "Mendadi Kondh",
    "Mendadi Karnti Nagar",
    "Kharsai Dam",
    "Kharsai School",
    "Varvatna",
    "Agarwada",
    "Kalchi Banoti",
    "Banoti",
    "Varchi Banoti",
    "Dhanghar Male Phata",
    "Salvinde Phata",
    "Tondsure",
    "Tondsure Phata",
    "Jangam Wadi Phata",
    "Saklap",
    "Mhasla Dighi Road",
    "Mhasla",
    "Mhasla HP Petrol Pump",
    "Mhasla Bharat Petrol Pump",
    "Mhasla Stand",
    "Pabra Phata",
    "Dorje",
    "Chandore",
    "Sai",
    "Morba",
    "Surle",
    "Mangaon",
    "Mangaon Railway Station",
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
    "Divegar",
    "Dighi",
    "Karlas",
    "Kudgaon",
    "Khujare",
    "Vave",
    "Asup",
    "Karle",
    "Dandguri",
    "Adgaon",
    "Shrivane",
    "Shrivardhan",
    "Shrivardhan Chiklap",
    "Hunarveli",
    "Vakhalghar",
    "Devkhol",
    "Nagloli ",
    "Khalcha Velas",
    "Velas",
    "Varcha Velas",
    "Vadavli",
    "Vadavli Phata",
    "Borli",
    "Pohamil",
    "Vanjale Road",
    "Borli ST Stand",
    "Ganesh Chowk",
    "Shivaji Chowk",
    "Samtanagar",
    "Bhava Phata",
    "Kapoli",
    "Shiste",
    ...COMMON_VILLAGE_STOPS,
];

/* -------------------------------------------------------
   DIGHI SIDE VILLAGE STOPS
------------------------------------------------------- */
export const DIGHI_VILLAGE_STOPS = [
    "Dighi",
    "Karlas",
    "Kudgaon",
    "Khujare",
    "Vave",
    "Asup",
    "Karle",
    "Dandguri",
    "Adgaon",
    "Shrivane",
    "Shrivardhan",
    "Shrivardhan Chiklap",
    "Hunarveli",
    "Vakhalghar",
    "Devkhol",
    "Nagloli ",
    "Khalcha Velas",
    "Velas",
    "Varcha Velas",
    "Vadavli",
    "Vadavli Phata",
    "Borli",
    "Pohamil",
    "Vanjale Road",
    "Borli ST Stand",
    "Ganesh Chowk",
    "Shivaji Chowk",
    "Samtanagar",
    "Bhava Phata",
    "Kapoli",
    "Shiste",
    ...COMMON_VILLAGE_STOPS,
];

/* -------------------------------------------------------
   FARE GROUPS (NON-AC BASE FARE)
------------------------------------------------------- */
export const BORLI_FARE_GROUPS = [
    {
        zone: "BORLI_GROUP_1",
        fare: 550,
        stops: [
            "Shekhadi",
            "Valvati",
            "Aravi",
            "Kondvili",
            "Adgaon",
            "Shrivane",
            "Shrivardhan",
            "Shrivardhan Chiklap",
            "Hunarveli",
            "Vakhalghar",
            "Devkhol",
            "Nagloli ",
        ],
    },
    {
        zone: "BORLI_GROUP_1A",
        fare: 500,
        stops: [
            "Dighi",
            "Karlas",
            "Kudgaon",
            "Divegar",
            "Bharadkhol",
            "Khujare",
            "Vave",
            "Asup",
            "Karle",
            "Dandguri",
            "Khalcha Velas",
            "Velas",
            "Varcha Velas",
        ],
    },
    {
        zone: "BORLI_GROUP_2",
        fare: 450,
        stops: [
            "Vadavli",
            "Vadavli Phata",
            "Borli",
            "HP Petrol Pump",
            "Nayar Petrol Pump",
            "Essar Pump",
            "Pohamil",
            "Vanjale Road",
            "Borli ST Stand",
            "Ganesh Chowk",
            "Shivaji Chowk",
            "Samtanagar",
            "Bhava Phata",
            "Kapoli",
            "Shiste",
            "Gondghar",
            "Khanlosh",
            "Mendadi",
            "Mendadi Grampanchayat",
            "Mendadi Kondh",
            "Mendadi Karnti Nagar",
        ],
    },
    {
        zone: "BORLI_GROUP_3",
        fare: 400,
        stops: [
            "Kharsai Dam",
            "Kharsai School",
            "Varvatna",
            "Agarwada",
            "Kalchi Banoti",
            "Banoti",
            "Varchi Banoti",
            "Dhanghar Male Phata",
            "Salvinde Phata",
            "Tondsure",
            "Tondsure Phata",
            "Jangam Wadi Phata",
            "Saklap",
            "Mhasla Dighi Road",
            "Mhasla",
            "Mhasla HP Petrol Pump",
            "Mhasla Bharat Petrol Pump",
            "Mhasla Stand",
            "Pabra Phata",
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
        stops: ["Mangaon", "Mangaon Railway Station", "Indapur", "Kolad"],
    },
];

export const DIGHI_FARE_GROUPS = [
    {
        zone: "DIGHI_GROUP_1",
        fare: 500,
        stops: [
            "Dighi",
            "Karlas",
            "Kudgaon",
            "Bharadkhol",
            "Divegar",
            "Khujare",
            "Vave",
            "Asup",
            "Karle",
            "Dandguri",
            "Khalcha Velas",
            "Velas",
            "Varcha Velas",
        ],
    },
    {
        zone: "DIGHI_GROUP_2",
        fare: 550,
        stops: [
            "Adgaon",
            "Shekhadi",
            "Valvati",
            "Aravi",
            "Kondvili",
            "Shrivane",
            "Shrivardhan",
            "Shrivardhan Chiklap",
            "Hunarveli",
            "Vakhalghar",
            "Devkhol",
            "Nagloli ",
        ],
    },
    {
        zone: "DIGHI_GROUP_3",
        fare: 450,
        stops: [
            "Vadavli",
            "Vadavli Phata",
            "Borli",
            "HP Petrol Pump",
            "Nayar Petrol Pump",
            "Essar Pump",
            "Shiste",
            "Kapoli",
            "Ganesh Chowk",
            "Shivaji Chowk",
            "Samtanagar",
            "Bhava Phata",
            "Pohamil",
            "Vanjale Road",
            "Borli ST Stand",
            "Gondghar",
            "Khanlosh",
            "Mendadi",
            "Mendadi Grampanchayat",
            "Mendadi Kondh",
            "Mendadi Karnti Nagar",
        ],
    },
    {
        zone: "DIGHI_GROUP_4",
        fare: 400,
        stops: [
            "Kharsai Dam",
            "Kharsai School",
            "Varvatna",
            "Agarwada",
            "Kalchi Banoti",
            "Banoti",
            "Varchi Banoti",
            "Dhanghar Male Phata",
            "Salvinde Phata",
            "Tondsure",
            "Tondsure Phata",
            "Jangam Wadi Phata",
            "Saklap",
            "Mhasla Dighi Road",
            "Mhasla",
            "Mhasla HP Petrol Pump",
            "Mhasla Bharat Petrol Pump",
            "Mhasla Stand",
            "Pabra Phata",
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
        stops: ["Mangaon", "Mangaon Railway Station", "Indapur", "Kolad"],
    },
];

/* -------------------------------------------------------
   STOP NAMES IN MARATHI
------------------------------------------------------- */
export const STOP_NAMES_MARATHI = {
    // CITY SIDE STOPS
    "Panvel ST Stand": "पनवेल एसटी स्टँड",
    "Uran Phata": "उरण फाटा",
    "Garden Hotel": "गार्डन हॉटेल",
    "Palspa Phata": "पळस्पे फाटा",
    Kalamboli: "कळंबोली",
    "Khanda Colony": "खंडा कॉलनी",
    Kamothe: "कामोठे",
    Kharghar: "खारघर",
    "CBD Belapur": "सीबीडी बेलापूर",
    Seawoods: "सीवूड्स",
    Nerul: "नेरुळ",
    Juinagar: "जुईनगर",
    Sanpada: "सानपाडा",
    "Vashi Stand": "वाशी स्टँड",
    "Turbhe Bridge": "तुर्भे ब्रिज",
    Mankhurd: "मानखुर्द",
    Govandi: "गोवंडी",
    Chembur: "चेंबूर",
    Sion: "सायन",
    Kurla: "कुर्ला",
    Dadar: "दादर",
    "Wadala IMAX": "वडाळा आयमॅक्स",
    Byculla: "भायखळा",
    "Masjid Bandar": "मस्जिद बंदर",
    Dongri: "डोंगरी",

    // Village side
    Shekhadi: "शेखाडी",
    Valvati: "वाळवटी",
    Bharadkhol: "भरडखोल",
    Aravi: "आरावी",
    Kondvili: "कोंडविली",

    Dighi: "दिघी",
    Karlas: "करलास",
    Kudgaon: "कुडगाव",
    Khujare: "खुजारे",
    Vave: "वावे",
    Asup: "आसुप",
    Karle: "कारले",
    Dandguri: "दांडगुरी",
    Adgaon: "आडगाव",

    Shrivane: "शिरवणे ",
    Shrivardhan: "श्रीवर्धन",
    "Shrivardhan Chiklap": "श्रीवर्धन चिकलप",
    Hunarveli: "हुनरवेली",
    Vakhalghar: "वाखळघर",
    Devkhol: "देवखोल",
    "Nagloli ": "नागळोली",

    "Khalcha Velas": "खालचा वेळास",
    Velas: "वेळास",
    "Varcha Velas": "वरचा वेळास",

    Vadavli: "वडवली",
    "Vadavli Phata": "वडवली फाटा",

    Borli: "बोर्ली",
    "HP Petrol Pump": "एचपी पेट्रोल पंप",
    "Nayar Petrol Pump": "नायर पेट्रोल पंप",
    "Essar Pump": "एस्सार पंप",
    Pohamil: "पोहामिल",
    "Vanjale Road": "वांजळे रोड",
    "Borli ST Stand": "बोर्ली एसटी स्टँड",
    "Ganesh Chowk": "गणेश चौक",
    "Shivaji Chowk": "शिवाजी चौक",
    Samtanagar: "समतानगर",
    "Bhava Phata": "भावा फाटा",
    Kapoli: "कापोली",
    Shiste: "शिस्ते",

    Gondghar: "गोंडघर",
    Khanlosh: "खानलोश",
    Mendadi: "मेंडडी",
    "Mendadi Grampanchayat": "मेंडडी ग्रामपंचायत",
    "Mendadi Kondh": "मेंडडी कोंढ",
    "Mendadi Karnti Nagar": "मेंडडी क्रांती नगर",

    "Kharsai Dam": "खारसई धरण",
    "Kharsai School": "खारसई शाळा",
    Varvatna: "वरवटणे",
    Agarwada: "आगरवाडा",
    "Kalchi Banoti": "खालची बनोटी",
    Banoti: "बनोटी",
    "Varchi Banoti": "वरची बनोटी",
    "Dhanghar Male Phata": "धनगर मळे फाटा",
    "Salvinde Phata": "सालविंदे फाटा",
    Tondsure: "तोंडसुरे",
    "Tondsure Phata": "तोंडसुरे फाटा",
    "Jangam Wadi Phata": "जंगमवाडी फाटा",
    Saklap: "सकळप",

    "Mhasla Dighi Road": "म्हसळा-दिघी रोड",
    Mhasla: "म्हसळा",
    "Mhasla HP Petrol Pump": "म्हसळा एचपी पेट्रोल पंप",
    "Mhasla Bharat Petrol Pump": "म्हसळा भारत पेट्रोल पंप",
    "Mhasla Stand": "म्हसळा स्टँड",
    "Pabra Phata": "पाब्रा फाटा",
    Dorje: "दोरजे",
    Chandore: "चांदोरे",
    Sai: "साई",
    Morba: "मोर्बा",
    Surle: "सुरळे",

    Mangaon: "माणगाव",
    "Mangaon Railway Station": "माणगाव रेल्वे स्टेशन",
    Indapur: "इंदापूर",
    Kolad: "कोलाड",

    Divegar: "दिवेआगर",
};

/* -------------------------------------------------------
   STOP ALIASES / NORMALIZATION MAP
------------------------------------------------------- */
const STOP_ALIASES = {
    // City side
    panvel: "Panvel ST Stand",
    "panvel st stand": "Panvel ST Stand",
    panvelststand: "Panvel ST Stand",
    "panvel st": "Panvel ST Stand",
    panvelst: "Panvel ST Stand",

    "uran phata": "Uran Phata",
    uranphata: "Uran Phata",
    "uran fata": "Uran Phata",
    uranfata: "Uran Phata",

    "garden hotel": "Garden Hotel",
    gardenhotel: "Garden Hotel",
    garden: "Garden Hotel",

    "palspa phata": "Palspa Phata",
    palspaphata: "Palspa Phata",
    "palspa fata": "Palspa Phata",
    palspafata: "Palspa Phata",
    "palspe phata": "Palspa Phata",
    "palspe fata": "Palspa Phata",

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
    sanpada: "Sanpada",

    vashi: "Vashi Stand",
    "vashi stand": "Vashi Stand",
    vashistand: "Vashi Stand",

    turbhe: "Turbhe Bridge",
    "turbhe bridge": "Turbhe Bridge",
    turbhebridge: "Turbhe Bridge",

    mankhurd: "Mankhurd",
    govandi: "Govandi",
    chembur: "Chembur",
    sion: "Sion",
    kurla: "Kurla",
    dadar: "Dadar",

    "wadala imax": "Wadala IMAX",
    wadalaimax: "Wadala IMAX",
    "wadala max": "Wadala IMAX",
    "wadvala imax": "Wadala IMAX",
    wadvalaimax: "Wadala IMAX",

    byculla: "Byculla",
    masjidbandar: "Masjid Bandar",
    "masjid bandar": "Masjid Bandar",
    dongri: "Dongri",

    // Village side
    shekhadi: "Shekhadi",
    valvati: "Valvati",
    walvati: "Valvati",
    bharadkhol: "Bharadkhol",
    aravi: "Aravi",
    kondvili: "Kondvili",

    dighi: "Dighi",
    karlas: "Karlas",
    karlasgaon: "Karlas",
    "karlas gaon": "Karlas",
    करलास: "Karlas",
    kudgaon: "Kudgaon",
    khujare: "Khujare",
    vave: "Vave",
    asup: "Asup",
    karle: "Karle",
    dandguri: "Dandguri",
    adgaon: "Adgaon",

    shrivane: "Shrivane",
    shrivardhan: "Shrivardhan",
    "shrivardhan chiklap": "Shrivardhan Chiklap",
    shrivardhanchiklap: "Shrivardhan Chiklap",
    hunarveli: "Hunarveli",
    vakhalghar: "Vakhalghar",
    devkhol: "Devkhol",
    "nagloli": "Nagloli ",
    "nagloli ": "Nagloli ",

    "khalcha velas": "Khalcha Velas",
    khalchavelas: "Khalcha Velas",
    velas: "Velas",
    "varcha velas": "Varcha Velas",
    varchavelas: "Varcha Velas",

    vadavli: "Vadavli",
    vadvali: "Vadavli",
    "vadavli phata": "Vadavli Phata",
    vadavliphata: "Vadavli Phata",
    "vadavli fata": "Vadavli Phata",
    vadavlifata: "Vadavli Phata",
    "vadvali phata": "Vadavli Phata",
    "vadvali fata": "Vadavli Phata",
    vadvaliphata: "Vadavli Phata",
    vadvalifata: "Vadavli Phata",

    borli: "Borli",
    "hp petrol pump": "HP Petrol Pump",
    hppetrolpump: "HP Petrol Pump",
    "nayar petrol pump": "Nayar Petrol Pump",
    nayarpetrolpump: "Nayar Petrol Pump",
    "nayar petrol pum": "Nayar Petrol Pump",
    "essar pump": "Essar Pump",
    essarpump: "Essar Pump",

    "mhasla hp petrol pump": "Mhasla HP Petrol Pump",
    mhaslahppetrolpump: "Mhasla HP Petrol Pump",
    "mhasla hp pump": "Mhasla HP Petrol Pump",

    "mhasla bharat petrol pump": "Mhasla Bharat Petrol Pump",
    mhaslabharatpetrolpump: "Mhasla Bharat Petrol Pump",
    "mhasla bharat pump": "Mhasla Bharat Petrol Pump",
    "mhasla bp pump": "Mhasla Bharat Petrol Pump",

    "mangaon railway station": "Mangaon Railway Station",
    mangaonrailwaystation: "Mangaon Railway Station",
    "mangaon station": "Mangaon Railway Station",
    mangoanrailwaystation: "Mangaon Railway Station",
    "mangoan railway station": "Mangaon Railway Station",

    kapoli: "Kapoli",
    shiste: "Shiste",
    shishti: "Shiste",

    pohamil: "Pohamil",
    khanlosh: "Khanlosh",

    "st stand": "Borli ST Stand",
    ststand: "Borli ST Stand",
    "borli st stand": "Borli ST Stand",
    borliststand: "Borli ST Stand",

    "ganesh chowk": "Ganesh Chowk",
    ganeshchowk: "Ganesh Chowk",

    "shivaji chowk": "Shivaji Chowk",
    shivajichowk: "Shivaji Chowk",

    samtanagar: "Samtanagar",

    "bhava phata": "Bhava Phata",
    bhavaphata: "Bhava Phata",
    "bhava fata": "Bhava Phata",
    bhavafata: "Bhava Phata",

    gondghar: "Gondghar",

    mendadi: "Mendadi",
    "mendadi grampanchayat": "Mendadi Grampanchayat",
    mendadigrampanchayat: "Mendadi Grampanchayat",
    "mendadi gram panchayat": "Mendadi Grampanchayat",
    mendadigrampanchyat: "Mendadi Grampanchayat",
    "mendadi grampanchyat": "Mendadi Grampanchayat",
    "mendadi kondh": "Mendadi Kondh",
    mendadikondh: "Mendadi Kondh",
    "mendadi karnti nagar": "Mendadi Karnti Nagar",
    mendadikarntinagar: "Mendadi Karnti Nagar",

    "kharsai dam": "Kharsai Dam",
    kharsaidam: "Kharsai Dam",
    "kharsai school": "Kharsai School",
    kharsaischool: "Kharsai School",
    kharasai: "Kharsai Dam",

    varvatna: "Varvatna",
    varvatane: "Varvatna",
    agarwada: "Agarwada",
    agrawada: "Agarwada",

    "kalchi banoti": "Kalchi Banoti",
    kalchibanoti: "Kalchi Banoti",
    banoti: "Banoti",
    "varchi banoti": "Varchi Banoti",
    varchibanoti: "Varchi Banoti",

    "dhanghar male phata": "Dhanghar Male Phata",
    dhangharmalephata: "Dhanghar Male Phata",
    "salvinde phata": "Salvinde Phata",
    salvindephata: "Salvinde Phata",
    tondsure: "Tondsure",
    "tondsure phata": "Tondsure Phata",
    tondsurephata: "Tondsure Phata",
    "jangam wadi phata": "Jangam Wadi Phata",
    jangamwadiphata: "Jangam Wadi Phata",

    saklap: "Saklap",
    mhasla: "Mhasla",
    "mhasla dighi road": "Mhasla Dighi Road",
    mhasladighiroad: "Mhasla Dighi Road",
    "mhasla dighi": "Mhasla Dighi Road",
    "mhasla stand": "Mhasla Stand",
    mhaslastand: "Mhasla Stand",

    "pabra phata": "Pabra Phata",
    pabraphata: "Pabra Phata",
    "pabra fata": "Pabra Phata",
    pabrafata: "Pabra Phata",

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

    vanjale: "Vanjale Road",
    "vanjale road": "Vanjale Road",
    vanjaleroad: "Vanjale Road",

    divegar: "Divegar",
    diveagar: "Divegar",
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function sanitizeStopKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{M}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function compactStopKey(value) {
    return sanitizeStopKey(value).replace(/\s+/g, "");
}

export function normalizeStopName(stop) {
    if (!stop) return "";

    if (typeof stop === "object") {
        const objName = String(stop.name || "").trim();
        if (!objName) return "";
        const rawObj = sanitizeStopKey(objName);
        const compactObj = compactStopKey(objName);
        return STOP_ALIASES[rawObj] || STOP_ALIASES[compactObj] || objName;
    }

    const raw = sanitizeStopKey(stop);
    const compact = compactStopKey(stop);

    return STOP_ALIASES[raw] || STOP_ALIASES[compact] || String(stop).trim();
}

/* -------------------------------------------------------
   MARATHI NAME HELPERS
------------------------------------------------------- */
export function getStopNameMarathi(stop) {
    const normalized = normalizeStopName(stop);
    return STOP_NAMES_MARATHI[normalized] || normalized;
}

export function getStopDisplayName(stop) {
    const normalized = normalizeStopName(stop);
    const marathi = getStopNameMarathi(normalized);

    if (marathi && marathi !== normalized) {
        return `${normalized} (${marathi})`;
    }

    return normalized;
}

export function getStopDisplayFromObject(stop) {
    if (!stop) return "";

    if (typeof stop === "string") {
        const normalized = normalizeStopName(stop);
        return `${normalized} (${getStopNameMarathi(normalized)})`;
    }

    const english = normalizeStopName(stop.name || "");
    const marathi = stop.nameMr || getStopNameMarathi(english);

    return marathi ? `${english} (${marathi})` : english;
}

export function createStopObject(stopName, time = "") {
    const normalized = normalizeStopName(stopName);
    return {
        name: normalized,
        nameMr: getStopNameMarathi(normalized),
        time: time || "",
    };
}

export function getStopsWithMarathi(stops = []) {
    return stops.map((stop) => ({
        english: normalizeStopName(stop),
        marathi: getStopNameMarathi(stop),
        display: getStopDisplayName(stop),
    }));
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

export function getAvailablePickupStopsWithMarathi(route) {
    return getStopsWithMarathi(getAvailablePickupStops(route));
}

export function getAvailableDropStopsWithMarathi(route) {
    return getStopsWithMarathi(getAvailableDropStops(route));
}

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
        pickupMarathi: getStopNameMarathi(normalizedPickup),
        pickupDisplay: getStopDisplayName(normalizedPickup),
        drop: normalizedDrop,
        dropMarathi: getStopNameMarathi(normalizedDrop),
        dropDisplay: getStopDisplayName(normalizedDrop),
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

export function getFarePreviewByRoute(route, busType = BUS_TYPES.NON_AC) {
    const groups = getFareGroupsByRoute(route);
    const surcharge = busType === BUS_TYPES.AC ? AC_SURCHARGE : 0;

    return groups.map((group) => ({
        zone: group.zone,
        stops: group.stops,
        stopsWithMarathi: getStopsWithMarathi(group.stops),
        baseFare: group.fare,
        surcharge,
        amount: group.fare + surcharge,
        busType,
    }));
}

/* -------------------------------------------------------
   OPTIONAL DISPLAY ARRAYS
------------------------------------------------------- */
export const CITY_STOPS_WITH_MARATHI = CITY_STOPS.map((stop) => ({
    english: stop,
    marathi: getStopNameMarathi(stop),
    display: getStopDisplayName(stop),
}));

export const BORLI_VILLAGE_STOPS_WITH_MARATHI = BORLI_VILLAGE_STOPS.map((stop) => ({
    english: stop,
    marathi: getStopNameMarathi(stop),
    display: getStopDisplayName(stop),
}));

export const DIGHI_VILLAGE_STOPS_WITH_MARATHI = DIGHI_VILLAGE_STOPS.map((stop) => ({
    english: stop,
    marathi: getStopNameMarathi(stop),
    display: getStopDisplayName(stop),
}));