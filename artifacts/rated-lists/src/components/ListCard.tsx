import { useState } from "react";
import type { RatedList, ListItem } from "@/hooks/useLists";
import { ratingToColor } from "@/lib/ratingColor";

interface Props {
  list: RatedList;
  onClick: () => void;
  onDelete: () => void;
  onColorModeChange: (value: boolean) => void;
  onAddToList: () => void;
  scale?: number;
}

function averageRating(items: ListItem[]): number {
  return items.reduce((sum, item) => sum + item.rating, 0) / items.length;
}

function averageColor(items: ListItem[]): string {
  if (items.length === 0) return "";
  return ratingToColor(averageRating(items), 26);
}

export function ListCard({ list, onClick, onDelete, onColorModeChange, onAddToList, scale = 1 }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const colored = list.colorMode && list.items.length > 0;
  const bgColor = colored ? averageColor(list.items) : undefined;

  const avg = list.items.length > 0 ? averageRating(list.items) : null;
  const avgLabel = avg !== null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : null;
  const ratingColor = avg !== null ? ratingToColor(avg) : null;

  function handleColorToggle(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    onColorModeChange(e.target.value === "color");
  }

  function handleMenuToggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen((v) => !v);
  }

  function handleRemove(e: React.MouseEvent | React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (confirmDelete) {
      setMenuOpen(false);
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  }

  function handleAddToList(e: React.MouseEvent | React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onAddToList();
  }

  function handleOverlayDismiss(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-4 cursor-pointer active:scale-[.98] transition-all hover:shadow-sm border select-none"
      style={
        colored
          ? { backgroundColor: bgColor, borderColor: "transparent", zoom: `${Math.round(scale * 100)}%` }
          : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--card-border))", zoom: `${Math.round(scale * 100)}%` }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2
              className="font-semibold text-base truncate"
              style={{ color: colored ? "#fff" : "hsl(var(--foreground))" }}
            >
              {list.title}
            </h2>
            {avgLabel !== null && ratingColor !== null && (
              <span
                className="text-base font-bold shrink-0 px-2 py-0.5 rounded-lg"
                style={
                  colored
                    ? { color: "#fff", backgroundColor: "rgba(0,0,0,0.25)" }
                    : { color: "#fff", backgroundColor: ratingColor }
                }
              >
                {avgLabel}/10
              </span>
            )}
          </div>
          <p
            className="text-xs mt-0.5"
            style={{ color: colored ? "rgba(255,255,255,0.65)" : "hsl(var(--muted-foreground))" }}
          >
            {list.items.length === 0
              ? "Empty"
              : `${list.items.length} item${list.items.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <select
            value={list.colorMode ? "color" : "plain"}
            onChange={handleColorToggle}
            onClick={(e) => e.stopPropagation()}
            className="text-xs rounded-lg px-1.5 py-1 border cursor-pointer outline-none transition-colors appearance-none"
            style={
              colored
                ? {
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderColor: "rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.85)",
                  }
                : {
                    backgroundColor: "hsl(var(--muted))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }
            }
            aria-label="Color mode"
          >
            <option value="plain">⬜ Plain</option>
            <option value="color">🎨 Color</option>
          </select>

          {/* ⋮ options menu */}
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xl font-bold leading-none transition-opacity hover:opacity-70"
              style={{
                color: colored ? "rgba(255,255,255,0.70)" : "hsl(var(--muted-foreground))",
              }}
              aria-label="More options"
            >
              ⋮
            </button>

            {menuOpen && (
              <>
                {/* Full-screen dismiss layer — fires on first touch */}
                <div
                  className="fixed inset-0 z-20"
                  onPointerDown={handleOverlayDismiss}
                />
                {/* Dropdown */}
                <div
                  className="absolute right-0 top-9 z-30 min-w-[150px] rounded-xl overflow-hidden shadow-lg border"
                  style={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--popover-border))",
                  }}
                >
                  <button
                    onPointerDown={handleRemove}
                    className="w-full px-4 py-3 text-sm text-left transition-colors active:opacity-60"
                    style={{
                      color: confirmDelete ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                      fontWeight: confirmDelete ? 600 : 400,
                    }}
                  >
                    {confirmDelete ? "Tap again to confirm" : "Remove list"}
                  </button>
                  <div style={{ height: 1, backgroundColor: "hsl(var(--border))" }} />
                  <button
                    onPointerDown={handleAddToList}
                    className="w-full px-4 py-3 text-sm text-left transition-colors active:opacity-60"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Add to list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {list.items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {[...list.items]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3)
            .map((item) => (
              <span
                key={item.id}
                className="text-xs rounded-full px-2 py-0.5 truncate max-w-[120px]"
                style={
                  colored
                    ? { backgroundColor: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.8)" }
                    : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                }
              >
                {item.name}
              </span>
            ))}
          {list.items.length > 3 && (
            <span
              className="text-xs px-1"
              style={{ color: colored ? "rgba(255,255,255,0.55)" : "hsl(var(--muted-foreground))" }}
            >
              +{list.items.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
