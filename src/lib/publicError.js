const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function isInternalError(error) {
  if (error?.name === "NeonDbError") return true;
  return /connecting to database|fetch failed|DATABASE_URL|JWT_SECRET/i.test(String(error?.message || ""));
}

// Message that is safe to return in an API response. Validation and other application
// errors keep their message; database and configuration errors are logged and replaced.
export function publicErrorMessage(error) {
  if (isInternalError(error)) {
    console.error("API error:", error);
    return GENERIC_MESSAGE;
  }
  return error?.message || GENERIC_MESSAGE;
}
