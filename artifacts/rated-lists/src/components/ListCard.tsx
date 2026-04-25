import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { RatedList, ListItem } from "@/hooks/useLists";
import { ratingToColor } from "@/lib/ratingColor";
import { useTheme } from "@/hooks/useTheme";

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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const colorPickerBtnRef = useRef<HTMLButtonElement>(null);

  const colorModeOn = list.colorMode && list.items.length > 0;
  const showPhoto = !!list.coverPhoto && !colorModeOn;
  const bgColor = colorModeOn ? averageColor(list.items) : undefined;
  // When the photo backdrop is on, adapt overlay/text to the UI theme so the card
  // matches the surrounding light/dark UI brightness instead of forcing a dark look.
  const photoLight = showPhoto && isLight;
  const overlayColor = photoLight ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.30)";
  const onPhotoText = photoLight ? "rgba(20,20,25,0.95)" : "#fff";
  const onPhotoMutedText = photoLight ? "rgba(20,20,25,0.65)" : "rgba(255,255,255,0.65)";
  const onPhotoChipBg = photoLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.20)";
  const onPhotoChipText = photoLight ? "rgba(20,20,25,0.85)" : "rgba(255,255,255,0.80)";
  const onPhotoControlBg = photoLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.20)";
  const onPhotoControlBorder = photoLight ? "rgba(20,20,25,0.18)" : "rgba(255,255,255,0.25)";
  const onPhotoControlText = photoLight ? "rgba(20,20,25,0.85)" : "rgba(255,255,255,0.85)";
  const onPhotoMenuIcon = photoLight ? "rgba(20,20,25,0.70)" : "rgba(255,255,255,0.70)";
  const onPhotoBadgeBg = photoLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.25)";
  const photoFallbackBg = photoLight ? "#eee" : "#222";
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

  function openColorPicker(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = colorPickerBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setColorPickerPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setColorPickerOpen((v) => !v);
  }

  function pickColorMode(value: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    setColorPickerOpen(false);
    onColorModeChange(value);
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

  const colorPickerPortal = colorPickerOpen
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setColorPickerOpen(false);
            }}
          />
          <div
            className="fixed z-[9999] min-w-[140px] rounded-xl overflow-hidden shadow-xl border"
            style={{
              top: colorPickerPos.top,
              right: colorPickerPos.right,
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--popover-border))",
            }}
          >
            <button
              type="button"
              onClick={(e) => pickColorMode(false, e)}
              className="w-full px-4 py-2.5 text-sm text-left active:opacity-60 flex items-center gap-2"
              style={{
                color: "hsl(var(--foreground))",
                backgroundColor: !list.colorMode ? "hsl(var(--muted))" : "transparent",
                fontWeight: !list.colorMode ? 600 : 400,
              }}
            >
              <span>⬜</span>
              <span>Default</span>
            </button>
            <div style={{ height: 1, backgroundColor: "hsl(var(--border))" }} />
            <button
              type="button"
              onClick={(e) => pickColorMode(true, e)}
              className="w-full px-4 py-2.5 text-sm text-left active:opacity-60 flex items-center gap-2"
              style={{
                color: "hsl(var(--foreground))",
                backgroundColor: list.colorMode ? "hsl(var(--muted))" : "transparent",
                fontWeight: list.colorMode ? 600 : 400,
              }}
            >
              <span>🎨</span>
              <span>Color</span>
            </button>
          </div>
        </>,
        document.body
      )
    : null;

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
        colorModeOn
          ? { backgroundColor: bgColor, borderColor: "transparent", zoom: `${Math.round(scale * 100)}%` }
          : showPhoto
          ? { backgroundColor: photoFallbackBg, borderColor: "transparent", zoom: `${Math.round(scale * 100)}%` }
          : { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--card-border))", zoom: `${Math.round(scale * 100)}%` }
      }
    >
      {showPhoto && (
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
            style={{ backgroundColor: overlayColor }}
          />
        </>
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2
              className="font-semibold text-base truncate"
              style={{
                color: colorModeOn
                  ? "#fff"
                  : showPhoto
                  ? onPhotoText
                  : "hsl(var(--foreground))",
              }}
            >
              {list.title}
            </h2>
            {avgLabel !== null && ratingColor !== null && (
              <span
                className="text-base font-bold shrink-0 px-2 py-0.5 rounded-lg"
                style={
                  colorModeOn
                    ? { color: "#fff", backgroundColor: "rgba(0,0,0,0.25)" }
                    : showPhoto
                    ? { color: onPhotoText, backgroundColor: onPhotoBadgeBg }
                    : { color: "#fff", backgroundColor: ratingColor }
                }
              >
                {avgLabel}/10
              </span>
            )}
          </div>
          <p
            className="text-xs mt-0.5"
            style={{
              color: colorModeOn
                ? "rgba(255,255,255,0.65)"
                : showPhoto
                ? onPhotoMutedText
                : "hsl(var(--muted-foreground))",
            }}
          >
            {list.items.length === 0
              ? "Empty"
              : `${list.items.length} item${list.items.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            ref={colorPickerBtnRef}
            type="button"
            onClick={openColorPicker}
            className="text-xs rounded-lg px-2 py-1 border cursor-pointer outline-none transition-colors flex items-center gap-1"
            style={
              colorModeOn
                ? { backgroundColor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)" }
                : showPhoto
                ? { backgroundColor: onPhotoControlBg, borderColor: onPhotoControlBorder, color: onPhotoControlText }
                : { backgroundColor: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
            }
            aria-label="Color mode"
            aria-haspopup="listbox"
            aria-expanded={colorPickerOpen}
          >
            <span>{list.colorMode ? "🎨 Color" : "⬜ Default"}</span>
            <span style={{ fontSize: "0.7em", opacity: 0.7 }}>▾</span>
          </button>

          <button
            ref={btnRef}
            onClick={openMenu}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xl font-bold leading-none transition-opacity hover:opacity-70"
            style={{
              color: colorModeOn
                ? "rgba(255,255,255,0.70)"
                : showPhoto
                ? onPhotoMenuIcon
                : "hsl(var(--muted-foreground))",
            }}
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
                  colorModeOn
                    ? { backgroundColor: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.8)" }
                    : showPhoto
                    ? { backgroundColor: onPhotoChipBg, color: onPhotoChipText }
                    : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                }
              >
                {item.name}
              </span>
            ))}
          {list.items.length > 3 && (
            <span
              className="text-xs px-1"
              style={{
                color: colorModeOn
                  ? "rgba(255,255,255,0.55)"
                  : showPhoto
                  ? onPhotoMutedText
                  : "hsl(var(--muted-foreground))",
              }}
            >
              +{list.items.length - 3}
            </span>
          )}
        </div>
      )}

      {colorPickerPortal}
      {dropdown}
    </div>
  );
}
