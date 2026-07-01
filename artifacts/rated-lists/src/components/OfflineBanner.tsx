import { useState, useEffect } from "react";
import { useSaveStatus } from "@/hooks/useLists";

export function OfflineBanner() {
  const { saveError, backOnline, clearBackOnline } = useSaveStatus();
  const [dismissed, setDismissed] = useState(false);

  // When error clears, reset dismissed so banner can re-appear next time
  useEffect(() => {
    if (!saveError) setDismissed(false);
  }, [saveError]);

  // Auto-clear the "back online" green flash after 2s
  useEffect(() => {
    if (!backOnline) return;
    const t = setTimeout(clearBackOnline, 2000);
    return () => clearTimeout(t);
  }, [backOnline, clearBackOnline]);

  // Green "back online" flash — shown for 2s after recovering
  if (backOnline && !saveError) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md"
        style={{ backgroundColor: "#16a34a" }}
      >
        <span>✓</span>
        Back online — all changes saved.
      </div>
    );
  }

  if (!saveError) return null;

  // Collapsed to a small dot in the top-right corner
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed top-3 right-3 z-[60] w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
        style={{ backgroundColor: "#dc2626" }}
        aria-label="No internet connection — tap to see details"
        title="No internet connection"
      >
        !
      </button>
    );
  }

  // Full banner
  return (
    <button
      onClick={() => setDismissed(true)}
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md cursor-pointer active:opacity-90 transition-opacity"
      style={{ backgroundColor: "#dc2626" }}
      aria-label="Dismiss to corner"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      No connection — changes saved locally, will sync when back online.
      <span className="ml-1 text-white/70 text-xs">(tap to minimise)</span>
    </button>
  );
}
