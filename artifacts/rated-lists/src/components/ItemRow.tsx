import { useState, useEffect, useRef } from "react";
import type { ListItem } from "@/hooks/useLists";
import { ratingColors, fmt } from "@/lib/ratingColor";

export { fmt, ratingColors };

// Natural item height baseline for font scaling (py-3 + text-sm line ≈ 48px)
const PREVIEW_ROW_BASELINE = 48;

interface Props {
  item: ListItem;
  rank?: number;
  onRatingChange: (rating: number) => void;
  onRename?: (name: string) => void;
  onDelete: () => void;
  showMoveBar?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  scale?: number;
  hideDelete?: boolean;
  previewRowHeight?: number;
}


export function ItemRow({
  item, rank, onRatingChange, onRename, onDelete,
  showMoveBar, onMoveUp, onMoveDown, isFirst, isLast, scale = 1, hideDelete = false,
  previewRowHeight,
}: Props) {
  const fontScale = previewRowHeight
    ? Math.max(0.6, Math.min(3, previewRowHeight / PREVIEW_ROW_BASELINE))
    : 1;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const s = ratingColors(item.rating);

  // Close rating picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  // Focus rename input when it opens
  useEffect(() => {
    if (renaming) setTimeout(() => renameRef.current?.focus(), 30);
  }, [renaming]);

  function openPicker(e: React.MouseEvent) {
    e.stopPropagation();
    if (renaming) return;
    setInputValue(fmt(item.rating));
    setPickerOpen((v) => !v);
  }

  function applyRating() {
    const n = parseFloat(inputValue);
    if (!isNaN(n) && n >= 0 && n <= 10) {
      onRatingChange(Math.round(n * 10) / 10);
    }
    setPickerOpen(false);
  }

  function handleRatingKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyRating();
    if (e.key === "Escape") setPickerOpen(false);
  }

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRename) return;
    setRenameValue(item.name);
    setRenaming(true);
    setPickerOpen(false);
  }

  function commitRename() {
    if (onRename && renameValue.trim()) onRename(renameValue.trim());
    setRenaming(false);
  }

  function handleRenameKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setRenaming(false);
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

  const rankSize = previewRowHeight ? Math.max(10, Math.round(12 * fontScale)) : undefined;
  const textSize = previewRowHeight ? Math.max(11, Math.round(14 * fontScale)) : undefined;
  const rankWidth = previewRowHeight ? Math.max(16, Math.round(20 * fontScale)) : undefined;
  const px = previewRowHeight ? Math.max(8, Math.round(12 * fontScale)) : 12;
  const gap = previewRowHeight ? Math.max(8, Math.round(12 * fontScale)) : 12;

  return (
    <div
      ref={rowRef}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: s.bg,
        zoom: `${Math.round(scale * 100)}%`,
        ...(previewRowHeight ? { height: `${previewRowHeight}px` } : {}),
      }}
    >
      {/* Main row */}
      <div
        className={`flex ${previewRowHeight ? "items-center" : "items-stretch"}`}
        style={previewRowHeight ? { flex: 1 } : undefined}
      >
        {showMoveBar && (
          <div
            className="flex flex-col items-center justify-center w-8 shrink-0 gap-0.5 py-1"
            style={{ backgroundColor: s.barBg }}
          >
            <button
              onClick={() => onMoveUp?.()}
              disabled={isFirst}
              className="flex items-center justify-center w-6 h-6 rounded text-xs disabled:opacity-20 transition-opacity"
              style={{ color: s.barText }}
              aria-label="Move up"
            >▲</button>
            <button
              onClick={() => onMoveDown?.()}
              disabled={isLast}
              className="flex items-center justify-center w-6 h-6 rounded text-xs disabled:opacity-20 transition-opacity"
              style={{ color: s.barText }}
              aria-label="Move down"
            >▼</button>
          </div>
        )}

        <div
          className={`flex items-center flex-1 min-w-0${previewRowHeight ? "" : " px-3 py-3 gap-3"}`}
          style={previewRowHeight ? { paddingLeft: px, paddingRight: px, gap } : undefined}
        >
          {rank !== undefined && (
            <span
              className={`text-center font-mono shrink-0${previewRowHeight ? "" : " text-xs w-5"}`}
              style={{ color: s.rankColor, fontSize: rankSize, width: rankWidth }}
            >
              {rank}
            </span>
          )}

          {/* Name — tap to rename */}
          {renaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKey}
              className={`flex-1 bg-transparent border-b outline-none font-medium min-w-0${previewRowHeight ? "" : " text-sm"}`}
              style={{ borderColor: s.ratingColor, color: s.nameColor, fontSize: textSize }}
              maxLength={80}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`flex-1 font-medium truncate min-w-0 cursor-pointer${previewRowHeight ? "" : " text-sm"}`}
              style={{ color: s.nameColor, fontSize: textSize }}
              onClick={onRename ? startRename : undefined}
              title={onRename ? "Tap to rename" : undefined}
            >
              {item.name}
            </span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openPicker}
              className={`font-bold px-1 py-0.5 rounded transition-opacity hover:opacity-80${previewRowHeight ? "" : " text-sm"}`}
              style={{ color: s.ratingColor, fontSize: textSize }}
              aria-label="Change rating"
            >
              {fmt(item.rating)}/10
            </button>

            {!hideDelete && (
              <button
                onClick={handleDelete}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={
                  confirmDelete
                    ? { backgroundColor: "rgba(239,68,68,0.3)", color: "#fca5a5" }
                    : { color: s.deleteColor, backgroundColor: "transparent" }
                }
                onMouseEnter={(e) => {
                  if (!confirmDelete)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = s.deleteBg;
                }}
                onMouseLeave={(e) => {
                  if (!confirmDelete)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
                aria-label="Delete item"
              >
                {confirmDelete ? "Sure?" : "✕"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline decimal rating input */}
      {pickerOpen && (
        <div
          className="flex items-center gap-2 px-3 pb-3"
          style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
        >
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleRatingKey}
            placeholder="0 – 10"
            className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold outline-none min-w-0"
            style={{
              backgroundColor: s.inputBg,
              border: `1.5px solid ${s.inputBorder}`,
              color: s.inputText,
            }}
          />
          <button
            onClick={applyRating}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: s.confirmBg, color: s.confirmFg }}
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}
