let _appInitiated = false;
let _nextShouldAnimate = true;

if (typeof window !== "undefined") {
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

/** Call immediately before any app-initiated history.back() */
export function markAppNavigation() {
  _appInitiated = true;
}

/** Consume the animation flag once on page mount. Resets to true afterwards. */
export function consumePageAnimation(): boolean {
  const val = _nextShouldAnimate;
  _nextShouldAnimate = true;
  return val;
}
