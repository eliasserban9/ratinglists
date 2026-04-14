import { useState, useRef } from "react";
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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const colored = list.colorMode && list.items.length > 0;
  const bgColor = colored ? averageColor(list.items) : undefined;

  const avg = list.items.length > 0 ? averageRating(list.items) : null;
  const avgLabel = avg !== null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : null;
  const ratingColor = avg !== null ? ratingToColor(avg) : null;

  function cancelLongPress() {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    didLongPress.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(40);
      setMenuOpen(true);
    }, 500);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      cancelLongPress();
    }
  }

  function handlePointerUp() {
    cancelLongPress();
  }

  function handleClick(e: React.MouseEvent) {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onClick();
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2000);
    }
  }

  function handleColorToggle(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    onColorModeChange(e.target.value === "color");
  }

  function handleAddToList(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    onAddToList();
  }

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      className="relative rounded-2xl p-4 cursor-pointer active:scale-[.98] transition-all hover:shadow-sm border select-none"
      style={
        colored
          ? { backgroundColor: bgColor, borderColor: "transparent", zoom: `${Math.round(scale * 100)}%` }
          : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--card-border))", zoom: `${Math.round(scale * 100)}%` }
      }
    >
      {/* Long-press context menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="absolute right-3 top-3 z-30 min-w-[140px] rounded-xl overflow-hidden shadow-lg border"
            style={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--popover-border))",
            }}
          >
            <button
              onClick={handleAddToList}
              className="w-full px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-muted"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Add to list
            </button>
          </div>
        </>
      )}

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

          <button
            onClick={handleDelete}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={
              confirmDelete
                ? { backgroundColor: "rgba(239,68,68,0.8)", color: "#fff" }
                : colored
                ? { color: "rgba(255,255,255,0.55)", backgroundColor: "transparent" }
                : { color: "hsl(var(--muted-foreground))", backgroundColor: "transparent" }
            }
            aria-label="Delete list"
          >
            {confirmDelete ? "Sure?" : "✕"}
          </button>
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
