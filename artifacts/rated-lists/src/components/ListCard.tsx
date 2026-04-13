import { useState } from "react";
import type { RatedList, ListItem } from "@/hooks/useLists";
import { ratingToColor } from "@/lib/ratingColor";

interface Props {
  list: RatedList;
  onClick: () => void;
  onDelete: () => void;
  onColorModeChange: (value: boolean) => void;
  scale?: number;
}

function averageRating(items: ListItem[]): number {
  return items.reduce((sum, item) => sum + item.rating, 0) / items.length;
}

function averageColor(items: ListItem[]): string {
  if (items.length === 0) return "";
  return ratingToColor(averageRating(items), 26);
}

export function ListCard({ list, onClick, onDelete, onColorModeChange, scale = 1 }: Props) {
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
      className="relative cursor-pointer active:scale-[.99] transition-transform overflow-hidden"
      style={{
        backgroundColor: colored ? bgColor : "hsl(var(--card))",
        border: colored ? "none" : "1px solid hsl(var(--card-border))",
        borderRadius: "var(--radius)",
        zoom: `${Math.round(scale * 100)}%`,
      }}
    >
      {/* Thin left accent bar for plain rated cards */}
      {!colored && ratingColor && (
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: ratingColor }}
        />
      )}

      <div
        className="flex items-center gap-3 py-3.5 pr-3"
        style={{ paddingLeft: !colored && ratingColor ? "1.1rem" : "0.875rem" }}
      >
        {/* Text */}
        <div className="flex-1 min-w-0">
          <h2
            className="font-semibold text-[15px] leading-snug truncate tracking-tight"
            style={{ color: colored ? "rgba(255,255,255,0.96)" : "hsl(var(--foreground))" }}
          >
            {list.title}
          </h2>
          <p
            className="text-[11px] mt-0.5 font-medium uppercase tracking-wide"
            style={{ color: colored ? "rgba(255,255,255,0.45)" : "hsl(var(--muted-foreground))" }}
          >
            {list.items.length === 0 ? "No items" : `${list.items.length} item${list.items.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Average rating — large, colored */}
        {avgLabel !== null && ratingColor !== null && (
          <span
            className="text-[22px] font-bold tabular-nums leading-none shrink-0"
            style={{ color: colored ? "rgba(255,255,255,0.95)" : ratingColor }}
          >
            {avgLabel}
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <select
            value={list.colorMode ? "color" : "plain"}
            onChange={handleColorToggle}
            className="text-[11px] rounded-md px-1.5 py-1 cursor-pointer outline-none appearance-none border"
            style={{
              backgroundColor: colored ? "rgba(0,0,0,0.18)" : "hsl(var(--muted))",
              borderColor: colored ? "rgba(255,255,255,0.15)" : "hsl(var(--border))",
              color: colored ? "rgba(255,255,255,0.7)" : "hsl(var(--muted-foreground))",
            }}
            aria-label="Color mode"
          >
            <option value="plain">Plain</option>
            <option value="color">Color</option>
          </select>

          <button
            onClick={handleDelete}
            className="w-7 h-7 flex items-center justify-center rounded-md text-base font-medium transition-colors"
            style={{
              color: confirmDelete
                ? "#fff"
                : colored
                ? "rgba(255,255,255,0.38)"
                : "hsl(var(--muted-foreground))",
              backgroundColor: confirmDelete ? "rgba(239,68,68,0.62)" : "transparent",
            }}
            aria-label="Delete list"
          >
            {confirmDelete ? "?" : "×"}
          </button>
        </div>
      </div>
    </div>
  );
}
