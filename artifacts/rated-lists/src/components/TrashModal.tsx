import { useState, useEffect } from "react";
import { useLists, TRASH_TTL } from "@/hooks/useLists";

function timeLeft(deletedAt: number): string {
  const msLeft = deletedAt + TRASH_TTL - Date.now();
  if (msLeft <= 0) return "Expiring soon…";
  const h = Math.floor(msLeft / (60 * 60 * 1000));
  const m = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return "< 1m left";
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TrashModal({ open, onClose }: Props) {
  const { trash, restoreFromTrash } = useLists();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const sorted = [...trash].sort((a, b) => b.deletedAt - a.deletedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl shadow-xl"
        style={{ backgroundColor: "hsl(var(--card))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            🗑 Trash
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-lg"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Close
          </button>
        </div>

        {sorted.length === 0 ? (
          <p
            className="text-sm text-center px-5 pb-12 pt-6"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Trash is empty
          </p>
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-10 max-h-[65vh] overflow-y-auto">
            {sorted.map((item) => {
              const name = item.type === "list" ? item.list?.title : item.category?.title;
              const icon = item.type === "category" ? "📁" : "📋";
              const subline =
                item.type === "category" && item.categoryLists && item.categoryLists.length > 0
                  ? `${item.categoryLists.length} list${item.categoryLists.length !== 1 ? "s" : ""} inside`
                  : null;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                >
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      {name}
                    </p>
                    {subline && (
                      <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {subline}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {timeLeft(item.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreFromTrash(item.id)}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
