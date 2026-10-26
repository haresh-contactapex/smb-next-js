// Moved to src/lib/shared so server code does not import from components/.
// Kept so existing component imports keep working.
export * from "@/lib/shared/checkout";

// Browser-only, so it stays with the components rather than in src/lib/shared.
// Moves focus to the first field flagged invalid once React has rendered the errors.
export function focusFirstInvalid(container) {
  requestAnimationFrame(() => container?.querySelector('[aria-invalid="true"]')?.focus());
}
