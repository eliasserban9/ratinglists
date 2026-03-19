import { useState } from "react";
import type { RatedList, ListItem } from "@/hooks/useLists";

interface Props {
  list: RatedList;
  onClick: () => void;
  onDelete: () => void;
  onColorModeChange: (value: boolean) => void;
}

function ratingToHue(rating: number): number {
  // Map 1–10 → hue 0 (red) to 120 (green)
  return ((rating - 1) / 9) * 120;
}

function averageColor(items: ListItem[]): string {
  if (items.length === 0) return "";
  // Average the hues from each item's rating
  const avgHue = items.reduce((sum, item) => sum + ratingToHue(item.rating), 0) / items.length;
  return `hsl(${avgHue.toFixed(1)}, 62%, 26%)`;
}

export function ListCard({ list, onClick, onDelete, onColorModeChange }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const colored = list.colorMode && list.items.length > 0;
  const bgColor = colored ? averageColor(list.items) : undefined;

  const avgRating =
    list.items.length > 0
      ? list.items.reduce((sum, i) => sum + i.rating, 0) / list.items.length
      : null;

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
            {avgRating !== null && (
              <span
                className="text-sm font-semibold shrink-0"
                style={{ color: colored ? "rgba(255,255,255,0.9)" : "hsl(var(--primary))" }}
              >
                {avgRating % 1 === 0 ? avgRating : avgRating.toFixed(1)}/10
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
