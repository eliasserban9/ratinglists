import { useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
}

export function SettingsSheet({ open, onClose, onDownload, onUpload }: Props) {
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
