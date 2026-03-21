import { useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  uiScaleLabel: string;
  canScaleUp: boolean;
  canScaleDown: boolean;
  onScaleUp: () => void;
  onScaleDown: () => void;
}

export function SettingsSheet({
  open, onClose, onDownload, onUpload,
  theme, onToggleTheme,
  uiScaleLabel, canScaleUp, canScaleDown, onScaleUp, onScaleDown,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { onToggleTheme(); }}
            className="flex items-center gap-4 w-full text-left bg-muted hover:bg-muted/80 border border-border rounded-2xl px-4 py-4 transition-colors active:scale-[.98]"
          >
            <span className="text-2xl">{theme === "dark" ? "☀️" : "🌙"}</span>
            <div>
              <div className="font-semibold text-sm text-foreground">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Switch to {theme === "dark" ? "light" : "dark"} theme
              </div>
            </div>
          </button>

          <div className="flex items-center gap-4 w-full bg-muted border border-border rounded-2xl px-4 py-4">
            <span className="text-2xl">🔡</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">UI Scale</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Resize lists, categories and items
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onScaleDown}
                disabled={!canScaleDown}
                aria-label="Decrease scale"
                className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold transition-colors"
                style={{
                  backgroundColor: canScaleDown ? "hsl(var(--primary))" : "hsl(var(--border))",
                  color: canScaleDown ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  cursor: canScaleDown ? "pointer" : "not-allowed",
                }}
              >−</button>
              <span
                className="w-10 text-center text-sm font-semibold tabular-nums"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {uiScaleLabel}
              </span>
              <button
                onClick={onScaleUp}
                disabled={!canScaleUp}
                aria-label="Increase scale"
                className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold transition-colors"
                style={{
                  backgroundColor: canScaleUp ? "hsl(var(--primary))" : "hsl(var(--border))",
                  color: canScaleUp ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  cursor: canScaleUp ? "pointer" : "not-allowed",
                }}
              >+</button>
            </div>
          </div>

          <button
            onClick={() => { onDownload(); onClose(); }}
            className="flex items-center gap-4 w-full text-left bg-muted hover:bg-muted/80 border border-border rounded-2xl px-4 py-4 transition-colors active:scale-[.98]"
          >
            <span className="text-2xl">⬇️</span>
            <div>
              <div className="font-semibold text-sm text-foreground">Download Data</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Save all your lists and items as a JSON file
              </div>
            </div>
          </button>

          <button
            onClick={handleUploadClick}
            className="flex items-center gap-4 w-full text-left bg-muted hover:bg-muted/80 border border-border rounded-2xl px-4 py-4 transition-colors active:scale-[.98]"
          >
            <span className="text-2xl">⬆️</span>
            <div>
              <div className="font-semibold text-sm text-foreground">Upload Data</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Restore from a previously downloaded JSON file
              </div>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
