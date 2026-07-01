let _appInitiated = false;
let _nextShouldAnimate = true;

if (typeof window !== "undefined") {
  // Prevent iOS from jumping scroll position on popstate, which causes a visual jolt
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  window.addEventListener(
    "popstate",
    () => {
      if (!_appInitiated) {
        _nextShouldAnimate = false;
      }
      _appInitiated = false;
    },
    { capture: true }
  );
}

/** Call immediately before any app-initiated history.back() so the popstate
 *  listener knows it was us, not the native swipe gesture. */
export function markAppNavigation() {
  _appInitiated = true;
}

/** Consume the animation flag once on page mount. Resets to true afterwards
 *  so the next forward navigation always animates. */
export function consumePageAnimation(): boolean {
  const val = _nextShouldAnimate;
  _nextShouldAnimate = true;
  return val;
}
