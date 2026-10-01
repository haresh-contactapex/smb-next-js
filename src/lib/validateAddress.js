import { LOCATIONS } from "@/data/locationData";

function matchesPostalCode(cityData, postalCode) {
  if (!cityData) return false;
  if (cityData.prefixes) {
    const normalized = postalCode.replace(/\s+/g, "").toUpperCase();
    return cityData.prefixes.some((prefix) => normalized.startsWith(prefix.toUpperCase()));
  }
  if (cityData.ranges) {
    const numeric = Number(postalCode.replace(/\D/g, ""));
    if (Number.isNaN(numeric)) return false;
    return cityData.ranges.some(([min, max]) => numeric >= min && numeric <= max);
  }
  // No prefix/range data for this city (e.g. UAE) — nothing to cross-check.
  return true;
}

// Validates that country -> state -> city -> postal code all belong to the
// same location hierarchy. Returns { valid: true } or { valid: false, message }.
export function validateLocationHierarchy({ country, state, city, postalCode }) {
  const countryData = LOCATIONS[country];
  if (!countryData) {
    return { valid: false, field: "country", message: `"${country}" is not a supported country.` };
  }

  const trimmedState = (state || "").trim();
  const trimmedCity = (city || "").trim();
  const trimmedPostal = (postalCode || "").trim();

  if (!trimmedState || !countryData.states[trimmedState]) {
    return {
      valid: false,
      field: "state",
      message: `"${state || ""}" is not a valid state/province for ${country}.`,
    };
  }

  const citiesInState = countryData.states[trimmedState];
  if (!trimmedCity || !citiesInState[trimmedCity]) {
    return {
      valid: false,
      field: "city",
      message: `"${city || ""}" does not belong to ${trimmedState}, ${country}. Please pick a matching city.`,
    };
  }

  if (countryData.postalFormat) {
    if (!trimmedPostal || !countryData.postalFormat.test(trimmedPostal)) {
      return {
        valid: false,
        field: "zip",
        message: `Enter ${countryData.postalHint} for ${country}.`,
      };
    }

    if (!matchesPostalCode(citiesInState[trimmedCity], trimmedPostal)) {
      return {
        valid: false,
        field: "zip",
        message: `The ${countryData.postalLabel.toLowerCase()} "${postalCode}" does not match ${trimmedCity}, ${trimmedState}. Please double-check the location details.`,
      };
    }
  }

  return { valid: true };
}

// Collapses stray spaces and case so "  surat " and "Surat" compare equal.
function looseKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function findName(names, typed) {
  const wanted = looseKey(typed);
  return wanted ? Object.keys(names).find((name) => looseKey(name) === wanted) : undefined;
}

// Same rules as validateLocationHierarchy, for a state and city the visitor
// typed rather than picked from a list: case and extra spaces don't matter, and
// the valid result carries the state and city spelled the way the location data
// has them ("surat" -> "Surat") so they can be stored and shown consistently.
// Returns { valid: true, state, city } or { valid: false, field, message }.
export function validateTypedLocation({ country, state, city, postalCode }) {
  const countryData = LOCATIONS[country];
  if (!countryData) {
    return { valid: false, field: "country", message: `"${country}" is not a supported country.` };
  }

  const stateName = findName(countryData.states, state);
  if (!stateName) {
    return {
      valid: false,
      field: "state",
      message: `We couldn't match "${String(state || "").trim()}" to a state or province in ${country}. Check the spelling and try again.`,
    };
  }

  const cityName = findName(countryData.states[stateName], city);
  if (!cityName) {
    return {
      valid: false,
      field: "city",
      message: `We couldn't match "${String(city || "").trim()}" to a city in ${stateName}. Check the spelling, or that the city is in this state.`,
    };
  }

  const location = validateLocationHierarchy({ country, state: stateName, city: cityName, postalCode });
  return location.valid ? { valid: true, state: stateName, city: cityName } : location;
}
