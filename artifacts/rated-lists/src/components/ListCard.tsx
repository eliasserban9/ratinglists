import { useState } from "react";
import type { RatedList, ListItem } from "@/hooks/useLists";

interface Props {
  list: RatedList;
  onClick: () => void;
  onDelete: () => void;
  onColorModeChange: (value: boolean) => void;
}

// Color stops: [rating, hue, sat%, light%]
const COLOR_STOPS: [number, number, number, number][] = [
  [1,  0,   85, 50],  // red
  [3,  28,  90, 52],  // orange
  [4.5, 54, 85, 47],  // yellow
  [6,  90,  65, 42],  // light green
  [7.5, 130, 55, 33], // dark green
  [8.5, 215, 78, 50], // blue
  [10, 280, 72, 55],  // purple
];

function ratingToColor(rating: number, lightness?: number): string {
  const r = Math.max(1, Math.min(10, rating));
  let lo = COLOR_STOPS[0];
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (r >= COLOR_STOPS[i][0] && r <= COLOR_STOPS[i + 1][0]) {
      lo = COLOR_STOPS[i];
      hi = COLOR_STOPS[i + 1];
      break;
    }
  }
  const t = (r - lo[0]) / (hi[0] - lo[0]);
  const h = lo[1] + t * (hi[1] - lo[1]);
  const s = lo[2] + t * (hi[2] - lo[2]);
  const l = lightness ?? (lo[3] + t * (hi[3] - lo[3]));
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

function averageRating(items: ListItem[]): number {
  return items.reduce((sum, item) => sum + item.rating, 0) / items.length;
}

function averageColor(items: ListItem[]): string {
  if (items.length === 0) return "";
  return ratingToColor(averageRating(items), 26);
}

export function ListCard({ list, onClick, onDelete, onColorModeChange }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const colored = list.colorMode && list.items.length > 0;
  const bgColor = colored ? averageColor(list.items) : undefined;

  const avg = list.items.length > 0 ? averageRating(list.items) : null;
  const avgLabel = avg !== null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : null;
  const ratingColor = avg !== null ? ratingToColor(avg) : null;

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

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-4 cursor-pointer active:scale-[.98] transition-all hover:shadow-sm border"
      style={
        colored
          ? { backgroundColor: bgColor, borderColor: "transparent" }
          : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }
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
