import { useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const hasPhoto = !!list.coverPhoto;
  const colorModeOn = list.colorMode && list.items.length > 0;
  const colored = hasPhoto || colorModeOn;
  const bgColor = !hasPhoto && colored ? averageColor(list.items) : undefined;
  const photoTintColor = hasPhoto && colorModeOn ? ratingToColor(averageRating(list.items)) : null;
  const avg = list.items.length > 0 ? averageRating(list.items) : null;
  const avgLabel = avg !== null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : null;
  const ratingColor = avg !== null ? ratingToColor(avg) : null;


  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  }

  function handleColorToggle(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    onColorModeChange(e.target.value === "color");
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) {
      setMenuOpen(false);
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  }

  function handleAddToList(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    onAddToList();
  }

  const dropdown = menuOpen
    ? createPortal(
        <>
          {/* Full-screen backdrop — closing layer, sits beneath the menu */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setConfirmDelete(false);
            }}
          />
          {/* Menu panel — above the backdrop */}
          <div
            className="fixed z-[9999] min-w-[160px] rounded-xl overflow-hidden shadow-xl border"
            style={{
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--popover-border))",
            }}
          >
            <button
              onClick={handleRemove}
              className="w-full px-4 py-3 text-sm text-left active:opacity-60"
              style={{
                color: confirmDelete ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                fontWeight: confirmDelete ? 600 : 400,
              }}
            >
              {confirmDelete ? "Tap again to confirm" : "Remove list"}
            </button>
            <div style={{ height: 1, backgroundColor: "hsl(var(--border))" }} />
            <button
              onClick={handleAddToList}
              className="w-full px-4 py-3 text-sm text-left active:opacity-60"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Add to list
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-4 cursor-pointer active:scale-[.98] transition-all hover:shadow-sm border select-none overflow-hidden"
      style={
        colored
          ? { backgroundColor: bgColor ?? "#222", borderColor: "transparent", zoom: `${Math.round(scale * 100)}%` }
          : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--card-border))", zoom: `${Math.round(scale * 100)}%` }
      }
    >
      {hasPhoto && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${list.coverPhoto})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(18px)",
              transform: "scale(1.25)",
              opacity: 0.95,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={
              photoTintColor
                ? { backgroundColor: photoTintColor, opacity: 0.55, mixBlendMode: "multiply" }
                : { backgroundColor: "rgba(0,0,0,0.30)" }
            }
          />
        </>
      )}
      <div className="relative flex items-start justify-between gap-2">
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
                ? { backgroundColor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)" }
                : { backgroundColor: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
            }
            aria-label="Color mode"
          >
            <option value="plain">⬜ Plain</option>
            <option value="color">🎨 Color</option>
          </select>

          <button
            ref={btnRef}
            onClick={openMenu}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xl font-bold leading-none transition-opacity hover:opacity-70"
            style={{ color: colored ? "rgba(255,255,255,0.70)" : "hsl(var(--muted-foreground))" }}
            aria-label="More options"
          >
            ⋮
          </button>
        </div>
      </div>

      {list.items.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1">
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

      {dropdown}
    </div>
  );
}
