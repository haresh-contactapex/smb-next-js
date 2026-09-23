"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

/**
 * The signed-in staff member's effective permission keys ("module.action"),
 * supplied by the root layout from their role. Used only to hide controls a
 * role can't use — every API route still enforces permissions itself.
 *
 * Without a provider (standalone auth pages) nothing is hidden.
 */
const StaffPermissionsContext = createContext(null);

export function StaffPermissionsProvider({ permissions, children }) {
  const value = useMemo(() => (permissions ? new Set(permissions) : null), [permissions]);
  return <StaffPermissionsContext.Provider value={value}>{children}</StaffPermissionsContext.Provider>;
}

// Returns can(key | [keys]) — true when any of the keys is granted.
export function useCan() {
  const granted = useContext(StaffPermissionsContext);
  return useCallback(
    (permission) => {
      if (!granted) return true;
      const keys = Array.isArray(permission) ? permission : [permission];
      return keys.some((key) => granted.has(key));
    },
    [granted]
  );
}

/**
 * Renders children only when the role has the permission (any of, for an
 * array); otherwise `fallback`. Usable from server components too:
 *   <Can permission="products.create"><AddButton /></Can>
 */
export function Can({ permission, fallback = null, children }) {
  const can = useCan();
  return can(permission) ? children : fallback;
}
