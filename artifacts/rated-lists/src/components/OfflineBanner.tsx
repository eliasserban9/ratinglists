import { useState, useEffect } from "react";
import { useSaveStatus } from "@/hooks/useLists";

export function OfflineBanner() {
  const { saveError, backOnline, clearBackOnline } = useSaveStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!saveError) setDismissed(false);
  }, [saveError]);

  useEffect(() => {
    if (!backOnline) return;
    const t = setTimeout(clearBackOnline, 2000);
    return () => clearTimeout(t);
  }, [backOnline, clearBackOnline]);

  const showBanner = saveError && !dismissed;
  const showDot    = saveError && dismissed;
  const showOnline = backOnline && !saveError;

  return (
    <>
      {/* Full red error banner — slides down from top */}
      <div
        aria-live="assertive"
        onClick={() => setDismissed(true)}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 61,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 16px",
          backgroundColor: "#dc2626",
          color: "#fff",
          fontSize: 14, fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          cursor: "pointer",
          userSelect: "none",
          opacity: showBanner ? 1 : 0,
          transform: showBanner ? "translateY(0)" : "translateY(-110%)",
          transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: showBanner ? "auto" : "none",
          willChange: "transform, opacity",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        No connection — changes saved locally, will sync when back online.
        <span style={{ opacity: 0.65, fontSize: 12, marginLeft: 4 }}>(tap to minimise)</span>
      </div>

      {/* Minimised dot — fades + scales in at top-right corner */}
      <button
        onClick={() => setDismissed(false)}
        aria-label="No internet — tap to expand"
        title="No internet connection"
        style={{
          position: "fixed", top: 12, right: 12, zIndex: 61,
          width: 32, height: 32, borderRadius: "50%",
          backgroundColor: "#dc2626",
          color: "#fff",
          fontSize: 16, fontWeight: 700,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
          opacity: showDot ? 1 : 0,
          transform: showDot ? "scale(1)" : "scale(0.4)",
          transition: "opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          pointerEvents: showDot ? "auto" : "none",
          willChange: "transform, opacity",
        }}
      >
        !
      </button>

      {/* Green "back online" flash — slides down then away */}
      <div
        aria-live="polite"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 62,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 16px",
          backgroundColor: "#16a34a",
          color: "#fff",
          fontSize: 14, fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
          pointerEvents: "none",
          opacity: showOnline ? 1 : 0,
          transform: showOnline ? "translateY(0)" : "translateY(-110%)",
          transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform, opacity",
        }}
      >
        <span>✓</span>
        Back online — all changes saved.
      </div>
    </>
  );
}
