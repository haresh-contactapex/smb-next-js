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
