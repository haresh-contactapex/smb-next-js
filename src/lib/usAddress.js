import zipcodes from "zipcodes";

// Server-only check of a United States city / state / ZIP against the full ZIP
// database (the `zipcodes` package, ~44k ZIPs). It is imported only by server lib
// code: the database is several MB, so the browser's checkout form runs the lighter
// validateTypedLocation() and relies on this for the real answer.

const NEARBY_MILES = 25;

// "St. Louis" / "Saint Louis", "Mt. Pleasant" / "Mount Pleasant", "Ft. Worth" /
// "Fort Worth" all compare equal; case, periods and extra spaces don't matter.
// "New York City" is how most people write the city the ZIP database calls "New York".
function cityKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^new york city$/, "new york")
    .replace(/\./g, " ")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bmount\b/g, "mt")
    .replace(/\bfort\b/g, "ft")
    .replace(/[^a-z0-9' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// state abbreviation -> city key -> the ZIP records that city covers
let citiesByState;
function getCitiesByState() {
  if (!citiesByState) {
    citiesByState = new Map();
    for (const record of Object.values(zipcodes.codes)) {
      if (record.country !== "US") continue;
      const cities = citiesByState.get(record.state) || new Map();
      const key = cityKey(record.city);
      const places = cities.get(key) || [];
      places.push(record);
      cities.set(key, places);
      citiesByState.set(record.state, cities);
    }
  }
  return citiesByState;
}

const stateName = (abbreviation) => {
  const entry = Object.entries(zipcodes.states.full).find(([, abbr]) => abbr === abbreviation);
  return entry ? entry[0].toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bOf\b/, "of") : abbreviation;
};

// Returns { valid: true, city } (the city spelled as the ZIP database has it when it
// is the ZIP's own city) or { valid: false, field, message }. Any other country is valid
// here: only the United States is checked this deeply.
//   - the ZIP must exist,
//   - it must belong to the state that was typed,
//   - the city must be the ZIP's city, or another real city in that state with a ZIP
//     within NEARBY_MILES of it. Customers often write the big city for a suburb or
//     neighbourhood ("Los Angeles" for North Hollywood), which delivers fine; a typo or
//     a city from elsewhere is still rejected.
export function validateUsLocation({ country, state, city, postalCode }) {
  if (country !== "United States") return { valid: true };

  const zip5 = String(postalCode || "").trim().slice(0, 5);
  const record = zipcodes.codes[zip5];
  if (!record || record.country !== "US") {
    return { valid: false, field: "zip", message: `We couldn't find the ZIP code "${zip5}" in the United States. Check the number and try again.` };
  }

  const typedState = zipcodes.states.normalize(String(state || "").trim());
  if (typedState !== record.state) {
    return {
      valid: false,
      field: "zip",
      message: `The ZIP code ${zip5} is in ${stateName(record.state)}, not ${String(state || "").trim()}. Check the state and ZIP code.`,
    };
  }

  const typedKey = cityKey(city);
  if (typedKey === cityKey(record.city)) return { valid: true, city: record.city };

  const places = getCitiesByState().get(record.state)?.get(typedKey);
  if (places?.some((place) => zipcodes.distance(place.zip, zip5) <= NEARBY_MILES)) return { valid: true };

  return {
    valid: false,
    field: "city",
    message: `"${String(city || "").trim()}" doesn't match the ZIP code ${zip5}, which is ${record.city}, ${record.state}. Check the city and ZIP code.`,
  };
}
