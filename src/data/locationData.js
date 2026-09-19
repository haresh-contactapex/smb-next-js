// Country -> State -> City hierarchy used to keep the Address forms'
// City / State / ZIP / Country fields consistent with each other.
//
// Coverage is intentionally a curated subset (major states/provinces and
// their best-known cities) rather than an exhaustive gazetteer — enough to
// drive cascading Country -> State -> City selects and to catch the classic
// "picked the wrong state/city" mistake, not a full postal database.
//
// Each city maps to how its postal/ZIP code is checked:
//   - prefixes: [".."]   the code must start with one of these digit strings
//   - ranges: [[min,max]] the numeric code must fall in one of these ranges
// Countries with no reliable public postal-code system (e.g. UAE) omit both,
// which skips the code/city cross-check for that country.

export const LOCATIONS = {
  "United States": {
    postalLabel: "ZIP Code",
    postalFormat: /^\d{5}(-\d{4})?$/,
    postalHint: "a 5-digit ZIP code (e.g. 94103)",
    states: {
      California: {
        "Los Angeles": { prefixes: ["900", "901"] },
        "San Francisco": { prefixes: ["941"] },
        "San Diego": { prefixes: ["920", "921"] },
        "San Jose": { prefixes: ["951"] },
        Sacramento: { prefixes: ["942", "958"] },
      },
      "New York": {
        "New York City": { prefixes: ["100", "101", "102"] },
        Brooklyn: { prefixes: ["112"] },
        Buffalo: { prefixes: ["142"] },
        Albany: { prefixes: ["122"] },
      },
      Texas: {
        Houston: { prefixes: ["770", "772"] },
        Austin: { prefixes: ["787"] },
        Dallas: { prefixes: ["752", "753"] },
        "San Antonio": { prefixes: ["782"] },
      },
      Florida: {
        Miami: { prefixes: ["331", "332"] },
        Orlando: { prefixes: ["328"] },
        Tampa: { prefixes: ["336"] },
      },
      Illinois: {
        Chicago: { prefixes: ["606", "607"] },
      },
      Pennsylvania: {
        Philadelphia: { prefixes: ["190", "191"] },
        Pittsburgh: { prefixes: ["152"] },
      },
      Ohio: {
        Columbus: { prefixes: ["432"] },
        Cleveland: { prefixes: ["441"] },
        Cincinnati: { prefixes: ["452"] },
      },
      Georgia: {
        Atlanta: { prefixes: ["303", "304"] },
      },
      Washington: {
        Seattle: { prefixes: ["981"] },
        Spokane: { prefixes: ["992"] },
      },
      Massachusetts: {
        Boston: { prefixes: ["021", "022"] },
      },
      Arizona: {
        Phoenix: { prefixes: ["850", "853"] },
        Tucson: { prefixes: ["857"] },
      },
      Colorado: {
        Denver: { prefixes: ["802", "803"] },
      },
      Michigan: {
        Detroit: { prefixes: ["482"] },
      },
      "New Jersey": {
        Newark: { prefixes: ["071"] },
        "Jersey City": { prefixes: ["073"] },
      },
      Nevada: {
        "Las Vegas": { prefixes: ["891"] },
      },
      "North Carolina": {
        Charlotte: { prefixes: ["282"] },
        Raleigh: { prefixes: ["276"] },
      },
      Oregon: {
        Portland: { prefixes: ["972"] },
      },
      Tennessee: {
        Nashville: { prefixes: ["372"] },
        Memphis: { prefixes: ["381"] },
      },
      Missouri: {
        "Kansas City": { prefixes: ["641"] },
        "St. Louis": { prefixes: ["631"] },
      },
      Indiana: {
        Indianapolis: { prefixes: ["462"] },
      },
      Wisconsin: {
        Milwaukee: { prefixes: ["532"] },
      },
      Maryland: {
        Baltimore: { prefixes: ["212"] },
      },
      Minnesota: {
        Minneapolis: { prefixes: ["554"] },
      },
      Louisiana: {
        "New Orleans": { prefixes: ["701"] },
      },
      Utah: {
        "Salt Lake City": { prefixes: ["841"] },
      },
      "District of Columbia": {
        Washington: { prefixes: ["200"] },
      },
    },
  },

  India: {
    postalLabel: "PIN Code",
    postalFormat: /^\d{6}$/,
    postalHint: "a 6-digit PIN code (e.g. 395004)",
    states: {
      Gujarat: {
        Surat: { prefixes: ["394", "395"] },
        Ahmedabad: { prefixes: ["380"] },
        Vadodara: { prefixes: ["390", "391"] },
        Rajkot: { prefixes: ["360"] },
        Gandhinagar: { prefixes: ["382"] },
      },
      Maharashtra: {
        Mumbai: { prefixes: ["400"] },
        Pune: { prefixes: ["411"] },
        Nagpur: { prefixes: ["440"] },
        Nashik: { prefixes: ["422"] },
        Thane: { prefixes: ["400", "421"] },
      },
      Delhi: {
        "New Delhi": { prefixes: ["110"] },
      },
      Karnataka: {
        Bengaluru: { prefixes: ["560"] },
        Mysuru: { prefixes: ["570"] },
        Mangaluru: { prefixes: ["575"] },
      },
      "Tamil Nadu": {
        Chennai: { prefixes: ["600"] },
        Coimbatore: { prefixes: ["641"] },
        Madurai: { prefixes: ["625"] },
      },
      Telangana: {
        Hyderabad: { prefixes: ["500"] },
        Warangal: { prefixes: ["506"] },
      },
      "West Bengal": {
        Kolkata: { prefixes: ["700"] },
        Howrah: { prefixes: ["711"] },
      },
      Rajasthan: {
        Jaipur: { prefixes: ["302"] },
        Jodhpur: { prefixes: ["342"] },
        Udaipur: { prefixes: ["313"] },
      },
      "Uttar Pradesh": {
        Lucknow: { prefixes: ["226"] },
        Kanpur: { prefixes: ["208"] },
        Noida: { prefixes: ["201"] },
        Agra: { prefixes: ["282"] },
        Varanasi: { prefixes: ["221"] },
      },
      Punjab: {
        Ludhiana: { prefixes: ["141"] },
        Amritsar: { prefixes: ["143"] },
      },
      Haryana: {
        Gurugram: { prefixes: ["122"] },
        Faridabad: { prefixes: ["121"] },
      },
      "Madhya Pradesh": {
        Bhopal: { prefixes: ["462"] },
        Indore: { prefixes: ["452"] },
      },
      Kerala: {
        Kochi: { prefixes: ["682"] },
        Thiruvananthapuram: { prefixes: ["695"] },
      },
      Bihar: {
        Patna: { prefixes: ["800"] },
      },
      "Andhra Pradesh": {
        Visakhapatnam: { prefixes: ["530"] },
        Vijayawada: { prefixes: ["520"] },
      },
      Odisha: {
        Bhubaneswar: { prefixes: ["751"] },
      },
      Assam: {
        Guwahati: { prefixes: ["781"] },
      },
      Chandigarh: {
        Chandigarh: { prefixes: ["160"] },
      },
      Goa: {
        Panaji: { prefixes: ["403"] },
      },
      "Jammu and Kashmir": {
        Srinagar: { prefixes: ["190"] },
        Jammu: { prefixes: ["180"] },
      },
      Uttarakhand: {
        Dehradun: { prefixes: ["248"] },
      },
      Jharkhand: {
        Ranchi: { prefixes: ["834"] },
      },
      Chhattisgarh: {
        Raipur: { prefixes: ["492"] },
      },
      "Himachal Pradesh": {
        Shimla: { prefixes: ["171"] },
      },
    },
  },

  "United Kingdom": {
    postalLabel: "Postcode",
    postalFormat: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
    postalHint: "a UK postcode (e.g. SW1A 1AA)",
    states: {
      England: {
        London: { prefixes: ["SW", "SE", "NW", "N", "E", "W", "EC", "WC"] },
        Manchester: { prefixes: ["M"] },
        Birmingham: { prefixes: ["B"] },
        Liverpool: { prefixes: ["L"] },
        Leeds: { prefixes: ["LS"] },
        Bristol: { prefixes: ["BS"] },
      },
      Scotland: {
        Edinburgh: { prefixes: ["EH"] },
        Glasgow: { prefixes: ["G"] },
        Aberdeen: { prefixes: ["AB"] },
      },
      Wales: {
        Cardiff: { prefixes: ["CF"] },
        Swansea: { prefixes: ["SA"] },
      },
      "Northern Ireland": {
        Belfast: { prefixes: ["BT"] },
      },
    },
  },

  Canada: {
    postalLabel: "Postal Code",
    postalFormat: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    postalHint: "a Canadian postal code (e.g. M5V 2T6)",
    states: {
      Ontario: {
        Toronto: { prefixes: ["M"] },
        Ottawa: { prefixes: ["K"] },
        Mississauga: { prefixes: ["L"] },
      },
      Quebec: {
        Montreal: { prefixes: ["H"] },
        "Quebec City": { prefixes: ["G"] },
      },
      "British Columbia": {
        Vancouver: { prefixes: ["V"] },
      },
      Alberta: {
        Calgary: { prefixes: ["T"] },
        Edmonton: { prefixes: ["T"] },
      },
      Manitoba: {
        Winnipeg: { prefixes: ["R"] },
      },
      "Nova Scotia": {
        Halifax: { prefixes: ["B"] },
      },
      Saskatchewan: {
        Regina: { prefixes: ["S"] },
        Saskatoon: { prefixes: ["S"] },
      },
      "New Brunswick": {
        "Saint John": { prefixes: ["E"] },
      },
      "Prince Edward Island": {
        Charlottetown: { prefixes: ["C"] },
      },
    },
  },

  Australia: {
    postalLabel: "Postcode",
    postalFormat: /^\d{4}$/,
    postalHint: "a 4-digit postcode (e.g. 2000)",
    states: {
      "New South Wales": {
        Sydney: { ranges: [[1000, 2249]] },
        Newcastle: { ranges: [[2250, 2299]] },
        Wollongong: { ranges: [[2500, 2599]] },
      },
      "Australian Capital Territory": {
        Canberra: {
          ranges: [
            [200, 299],
            [2600, 2618],
            [2900, 2920],
          ],
        },
      },
      Victoria: {
        Melbourne: { ranges: [[3000, 3207]] },
        Geelong: { ranges: [[3210, 3230]] },
      },
      Queensland: {
        Brisbane: { ranges: [[4000, 4179]] },
        "Gold Coast": { ranges: [[4200, 4229]] },
        Cairns: { ranges: [[4868, 4879]] },
      },
      "South Australia": {
        Adelaide: { ranges: [[5000, 5199]] },
      },
      "Western Australia": {
        Perth: { ranges: [[6000, 6214]] },
      },
      Tasmania: {
        Hobart: { ranges: [[7000, 7099]] },
      },
      "Northern Territory": {
        Darwin: {
          ranges: [
            [800, 899],
            [900, 999],
          ],
        },
      },
    },
  },

  Germany: {
    postalLabel: "Postal Code",
    postalFormat: /^\d{5}$/,
    postalHint: "a 5-digit postal code (e.g. 10115)",
    states: {
      Berlin: {
        Berlin: { ranges: [[10115, 14199]] },
      },
      Bavaria: {
        Munich: { ranges: [[80331, 81929]] },
        Nuremberg: { ranges: [[90402, 90491]] },
      },
      Hesse: {
        Frankfurt: { ranges: [[60306, 60599]] },
      },
      "North Rhine-Westphalia": {
        Cologne: { ranges: [[50667, 51149]] },
        Dusseldorf: { ranges: [[40210, 40629]] },
      },
      "Baden-Wurttemberg": {
        Stuttgart: { ranges: [[70173, 70599]] },
      },
      Saxony: {
        Leipzig: { ranges: [[4103, 4357]] },
        Dresden: { ranges: [[1067, 1279]] },
      },
      Hamburg: {
        Hamburg: { ranges: [[20095, 22769]] },
      },
      "Lower Saxony": {
        Hanover: { ranges: [[30159, 30669]] },
      },
    },
  },

  France: {
    postalLabel: "Postal Code",
    postalFormat: /^\d{5}$/,
    postalHint: "a 5-digit postal code (e.g. 75001)",
    states: {
      "Ile-de-France": {
        Paris: { prefixes: ["75"] },
      },
      "Provence-Alpes-Cote d'Azur": {
        Marseille: { prefixes: ["13"] },
        Nice: { prefixes: ["06"] },
      },
      "Auvergne-Rhone-Alpes": {
        Lyon: { prefixes: ["69"] },
      },
      Occitanie: {
        Toulouse: { prefixes: ["31"] },
      },
      "Nouvelle-Aquitaine": {
        Bordeaux: { prefixes: ["33"] },
      },
      "Hauts-de-France": {
        Lille: { prefixes: ["59"] },
      },
      "Grand Est": {
        Strasbourg: { prefixes: ["67"] },
      },
      "Pays de la Loire": {
        Nantes: { prefixes: ["44"] },
      },
      Bretagne: {
        Rennes: { prefixes: ["35"] },
      },
    },
  },

  "United Arab Emirates": {
    // UAE has no postal/ZIP code system for street delivery (P.O. Box based),
    // so postal-code cross-checking is skipped for this country.
    postalLabel: "PO Box / Postal Code (optional)",
    postalFormat: null,
    postalHint: null,
    states: {
      Dubai: {
        Dubai: {},
        Deira: {},
        Jumeirah: {},
      },
      "Abu Dhabi": {
        "Abu Dhabi": {},
        "Al Ain": {},
      },
      Sharjah: {
        Sharjah: {},
      },
      Ajman: {
        Ajman: {},
      },
      "Ras Al Khaimah": {
        "Ras Al Khaimah": {},
      },
      Fujairah: {
        Fujairah: {},
      },
      "Umm Al Quwain": {
        "Umm Al Quwain": {},
      },
    },
  },
};

export function getCountryNames() {
  return Object.keys(LOCATIONS);
}

export function getStateNames(country) {
  const data = LOCATIONS[country];
  return data ? Object.keys(data.states) : [];
}

export function getCityNames(country, state) {
  const data = LOCATIONS[country];
  if (!data || !state) return [];
  const cities = data.states[state];
  return cities ? Object.keys(cities) : [];
}
