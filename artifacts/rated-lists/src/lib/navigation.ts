if (typeof window !== "undefined") {
  // Prevent iOS from jumping scroll position on popstate, which causes a visual jolt
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
}

/** Call immediately before any app-initiated history.back() */
export function markAppNavigation() {}
