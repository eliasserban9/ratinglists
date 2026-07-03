import { useState, startTransition, useEffect } from "react";

// Replicates Wouter's navigate — history is already monkeypatched by Wouter
// to dispatch pushState/replaceState events, so our subscriber picks them up.
function navigate(
  to: string,
  { replace = false, state = null as unknown } = {}
) {
  history[replace ? "replaceState" : "pushState"](state, "", to);
}

/**
 * Custom Wouter location hook:
 * - popstate (swipe-back / in-app back): URGENT React update so the DOM commits
 *   as fast as possible, minimising the window before iOS accepts the next swipe.
 * - pushState / replaceState (forward nav): wrapped in startTransition so the
 *   current page stays fully interactive while React prepares the new route.
 */
export function useTransitionLocation(_opts?: unknown): [string, typeof navigate] {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    // Back navigation must be urgent so the new page is ready ASAP.
    const onBack = () => setPath(window.location.pathname);

    // Forward navigation can be deferred — keeps current page interactive.
    const onForward = () =>
      startTransition(() => setPath(window.location.pathname));

    window.addEventListener("popstate", onBack);
    window.addEventListener("pushState", onForward);
    window.addEventListener("replaceState", onForward);

    return () => {
      window.removeEventListener("popstate", onBack);
      window.removeEventListener("pushState", onForward);
      window.removeEventListener("replaceState", onForward);
    };
  }, []);

  return [path, navigate];
}
