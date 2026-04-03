import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useLists } from "@/hooks/useLists";
import type { SortMode } from "@/hooks/useLists";
import { ItemRow, fmt, ratingColors } from "@/components/ItemRow";
import { NewItemDialog } from "@/components/NewItemDialog";

interface Props {
  params: { id: string };
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "added", label: "As Added" },
  { value: "rating", label: "By Rating" },
  { value: "name", label: "By Name" },
];

function sortLabel(mode: SortMode) {
  if (mode === "rating") return "sorted by rating";
  if (mode === "name") return "sorted by name";
  return "custom order";
}

const MIN_ITEMS_PER_PAGE = 3;
const MAX_ITEMS_PER_PAGE_DEFAULT = 11;
const MAX_ITEMS_PER_PAGE_PHOTO = 9;

export default function ListPage({ params }: Props) {
  const { id } = params;
  const [, navigate] = useLocation();
  const {
    getList, getCategory, addItem, updateItemRating, deleteItem,
    setSortMode, moveItem, renameList, renameItem, setListDescription, setListNote, setListBgColor, setListBgLightness, setListCoverPhoto, applyListPhoto,
  } = useLists();

  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  // Preview mode state
  const [previewMode, setPreviewMode] = useState(false);
  const [pageScale, setPageScale] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [scrolledPastHalf, setScrolledPastHalf] = useState(false);
  const prevItemsPerPageRef = useRef(10);

  // Options panel
  const [showOptions, setShowOptions] = useState(false);
  const colorStripRef = useRef<HTMLDivElement>(null);
  const isDraggingStrip = useRef(false);
  const lightnessStripRef = useRef<HTMLDivElement>(null);
  const isDraggingLightness = useRef(false);

  // Refs for measurement
  const measureRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const prevPreviewModeRef = useRef(false);
  const prevItemCountRef = useRef(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = getList(id);

  useEffect(() => { document.body.dataset.page = "list"; }, []);

  useEffect(() => {
    if (editingTitle) setTimeout(() => titleInputRef.current?.focus(), 30);
  }, [editingTitle]);

  useEffect(() => {
    if (editingDesc) setTimeout(() => descRef.current?.focus(), 30);
  }, [editingDesc]);

  useEffect(() => {
    if (editingNote) setTimeout(() => noteRef.current?.focus(), 30);
  }, [editingNote]);

  // When a cover photo is added, cap items-per-page at the photo limit
  useEffect(() => {
    if (list?.coverPhoto && itemsPerPage > MAX_ITEMS_PER_PAGE_PHOTO) {
      setItemsPerPage(MAX_ITEMS_PER_PAGE_PHOTO);
    }
  }, [list?.coverPhoto]);

  useEffect(() => {
    function onScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setScrolledPastHalf(scrollable > 0 && window.scrollY > scrollable / 2);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Recompute preview scale whenever mode, item count, or items-per-page changes.
  useLayoutEffect(() => {
    const itemCount = list?.items.length ?? 0;
    const previewModeChanged = prevPreviewModeRef.current !== previewMode;
    const itemCountChanged = prevItemCountRef.current !== itemCount;
    const ippChanged = prevItemsPerPageRef.current !== itemsPerPage;

    prevPreviewModeRef.current = previewMode;
    prevItemCountRef.current = itemCount;
    prevItemsPerPageRef.current = itemsPerPage;

    if (!previewMode) {
      if (previewModeChanged) {
        setPageScale(1);
        setPreviewPage(0);
      }
      return;
    }

    if (!previewModeChanged && !itemCountChanged && !ippChanged) return;
    if (!measureRef.current || !itemsRef.current) return;

    setPreviewPage(0);

    const naturalHeight = measureRef.current.scrollHeight;
    const rect = itemsRef.current.getBoundingClientRect();
    const availableHeight = window.innerHeight - rect.top - 8;

    if (naturalHeight <= 0 || availableHeight <= 0 || itemCount <= 0) return;

    const perItemHeight = naturalHeight / itemCount;
    const referenceItems = Math.min(itemsPerPage, itemCount);
    const referenceHeight = perItemHeight * referenceItems;
    const scale = Math.min(1, availableHeight / referenceHeight);
    setPageScale(scale);
  }, [previewMode, list?.items.length, itemsPerPage]);

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">List not found.</p>
      </div>
    );
  }

  const currentSortMode: SortMode = list.sortMode ?? "rating";
  const parentCategory = list.categoryId ? getCategory(list.categoryId) : undefined;
  const backLabel = parentCategory ? parentCategory.title : "Rating Lists";
  const backPath = parentCategory ? `/category/${parentCategory.id}` : "/";

  const avg =
    list.items.length > 0
      ? list.items.reduce((s, i) => s + i.rating, 0) / list.items.length
      : null;
  const avgColors = avg !== null ? ratingColors(avg) : null;

  let displayedItems = [...list.items];
  if (currentSortMode === "rating") {
    displayedItems.sort((a, b) => b.rating - a.rating);
  } else if (currentSortMode === "name") {
    displayedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Pagination derived values
  const totalPages = previewMode ? Math.ceil(displayedItems.length / itemsPerPage) : 1;
  const safePage = Math.min(previewPage, Math.max(0, totalPages - 1));
  const pageStart = safePage * itemsPerPage;
  const pageEnd = Math.min(pageStart + itemsPerPage, displayedItems.length);
  const currentPageItems = previewMode
    ? displayedItems.slice(pageStart, pageEnd)
    : displayedItems;

  function handleTogglePreview() {
    setPreviewMode((v) => !v);
  }

  function startTitleEdit() {
    if (previewMode) return;
    setTitleValue(list!.title);
    setEditingTitle(true);
  }

  function commitTitleEdit() {
    if (titleValue.trim()) renameList(id, titleValue.trim());
    setEditingTitle(false);
  }

  function handleTitleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitTitleEdit();
    if (e.key === "Escape") setEditingTitle(false);
  }

  function startDescEdit() {
    if (previewMode) return;
    setDescValue(list!.description ?? "");
    setEditingDesc(true);
  }

  function commitDescEdit() {
    setListDescription(id, descValue);
    setEditingDesc(false);
  }

  function handleDescKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") commitDescEdit();
  }

  function startNoteEdit() {
    if (previewMode) return;
    setNoteValue(list!.note ?? "");
    setEditingNote(true);
  }

  function commitNoteEdit() {
    setListNote(id, noteValue);
    setEditingNote(false);
  }

  function handleNoteKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") commitNoteEdit();
  }

  function handleScrollArrow() {
    if (scrolledPastHalf) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function cropToSquareCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.src = url;
    });
  }

  function extractDominantColor(canvas: HTMLCanvasElement): { hue: number; lightness: number } {
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 40));
    const NUM_BUCKETS = 36;
    const bucketCounts = new Array(NUM_BUCKETS).fill(0);
    const bucketLightness: number[][] = Array.from({ length: NUM_BUCKETS }, () => []);
    let greyCount = 0;
    let greyLSum = 0;
    let totalSampled = 0;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
        let h = 0;
        if (max !== min) {
          if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
          else if (max === g) h = (b - r) / (max - min) + 2;
          else h = (r - g) / (max - min) + 4;
          h = h * 60;
        }
        totalSampled++;
        if (s < 0.15) {
          greyCount++;
          greyLSum += l * 100;
        } else {
          const bucket = Math.floor(h / (360 / NUM_BUCKETS)) % NUM_BUCKETS;
          bucketCounts[bucket]++;
          bucketLightness[bucket].push(l * 100);
        }
      }
    }

    if (greyCount / totalSampled > 0.55) {
      const avgGreyL = greyCount > 0 ? greyLSum / greyCount : 50;
      return { hue: 380, lightness: Math.round(avgGreyL) };
    }

    const smoothed = bucketCounts.map((_, i) => {
      const prev = bucketCounts[(i - 1 + NUM_BUCKETS) % NUM_BUCKETS];
      const next = bucketCounts[(i + 1) % NUM_BUCKETS];
      return prev + bucketCounts[i] * 2 + next;
    });
    const maxBucket = smoothed.indexOf(Math.max(...smoothed));
    const degPerBucket = 360 / NUM_BUCKETS;
    const domHue = Math.round(maxBucket * degPerBucket + degPerBucket / 2) % 360;
    const lArr = bucketLightness[maxBucket];
    const domL = lArr.length > 0 ? lArr.reduce((a, b) => a + b, 0) / lArr.length : 50;
    return { hue: domHue, lightness: Math.round(domL) };
  }

  // Given the photo's dominant lightness, pick a background lightness that
  // always contrasts enough so the photo is visible in front of the background.
  function contrastBgLightness(photoL: number): number {
    if (photoL < 50) {
      // Dark photo → use a clearly lighter background (55–82%)
      return Math.min(82, Math.max(55, photoL + 45));
    } else {
      // Light photo → use a clearly darker background (18–45%)
      return Math.max(18, Math.min(45, photoL - 45));
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = await cropToSquareCanvas(file);
    const { hue, lightness: photoL } = extractDominantColor(canvas);
    const bgL = contrastBgLightness(photoL);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    applyListPhoto(id, dataUrl, hue, bgL);
    e.target.value = "";
  }

  // Compute list custom background from stored hue + lightness
  const isDark = document.documentElement.classList.contains("dark");
  const defaultLightness = isDark ? 13 : 78;
  const bgLightness = list.bgLightness ?? defaultLightness;
  // bgHue is stored 0–400; values >360 enter the grey/black zone (sat=0)
  const isGrey = list.bgHue !== undefined && list.bgHue > 360;
  const listBg = list.bgHue !== undefined
    ? isGrey
      ? `hsl(0 0% ${bgLightness}%)`
      : `hsl(${list.bgHue} ${isDark ? 42 : 62}% ${bgLightness}%)`
    : undefined;

  // Override CSS text variables so all text stays readable against the custom bg
  const textVars: React.CSSProperties = listBg
    ? bgLightness > 52
      ? ({ '--foreground': '222 47% 8%', '--muted-foreground': '215 16% 32%' } as React.CSSProperties)
      : ({ '--foreground': '210 40% 96%', '--muted-foreground': '215 20% 72%' } as React.CSSProperties)
    : {};

  function hueFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = colorStripRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    // 0–400: 0–360 = coloured hues, 361–400 = grey/black zone
    return Math.round((x / rect.width) * 400);
  }

  function lightnessFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = lightnessStripRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    // left = white (100%), right = black (0%)
    return Math.round(100 - (x / rect.width) * 100);
  }

  return (
    <div
      className="min-h-screen"
      style={previewMode
        ? { overflow: "hidden", ...(listBg ? { backgroundColor: listBg } : {}), ...textVars }
        : { paddingBottom: "6rem", ...(listBg ? { backgroundColor: listBg } : {}), ...textVars }}
    >
      <div className="max-w-lg mx-auto px-4 pt-10 pb-4">

        {/* Top bar: back + right buttons */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1 text-primary text-sm hover:opacity-70 transition-opacity"
          >
            <span className="text-lg leading-none">‹</span>
            <span>{backLabel}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Items-per-page stepper — only shown in preview mode */}
            {previewMode && (() => {
              const maxIPP = list.coverPhoto ? MAX_ITEMS_PER_PAGE_PHOTO : MAX_ITEMS_PER_PAGE_DEFAULT;
              return (
                <div
                  className="flex items-center rounded-full border overflow-hidden text-xs font-semibold select-none"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <button
                    onClick={() => setItemsPerPage((n) => Math.max(MIN_ITEMS_PER_PAGE, n - 1))}
                    disabled={itemsPerPage <= MIN_ITEMS_PER_PAGE}
                    className="w-7 h-7 flex items-center justify-center text-base leading-none transition-opacity disabled:opacity-30 hover:opacity-70 active:scale-95"
                    aria-label="Fewer items per page"
                  >
                    −
                  </button>
                  <span className="px-1 tabular-nums">{itemsPerPage}</span>
                  <button
                    onClick={() => setItemsPerPage((n) => Math.min(maxIPP, n + 1))}
                    disabled={itemsPerPage >= maxIPP}
                    className="w-7 h-7 flex items-center justify-center text-base leading-none transition-opacity disabled:opacity-30 hover:opacity-70 active:scale-95"
                    aria-label="More items per page"
                  >
                    +
                  </button>
                </div>
              );
            })()}

            {/* Camera / gallery button — only shown in preview mode */}
            {previewMode && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-full border text-base transition-colors hover:opacity-70"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
                aria-label="Upload cover photo"
              >
                📷
              </button>
            )}

            <button
              onClick={handleTogglePreview}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
              style={
                previewMode
                  ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                  : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
              }
              aria-label="Toggle preview mode"
            >
              <span>{previewMode ? "✕" : "▶"}</span>
              <span>{previewMode ? "Exit Preview" : "Preview"}</span>
            </button>

            {/* Options button */}
            <div className="relative">
              <button
                onClick={() => setShowOptions((v) => !v)}
                className="w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold transition-colors"
                style={{
                  backgroundColor: showOptions ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  color: showOptions ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  borderColor: showOptions ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
                aria-label="Options"
              >
                ⋯
              </button>

              {showOptions && (
                <>
                  {/* Backdrop to close */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOptions(false)}
                  />
                  {/* Dropdown panel */}
                  <div
                    className="absolute right-0 top-10 z-50 w-64 rounded-2xl shadow-lg border p-4 flex flex-col gap-3"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Background color
                    </p>

                    {/* Hue gradient strip */}
                    <div
                      ref={colorStripRef}
                      className="relative h-7 rounded-full cursor-pointer select-none touch-none"
                      style={{
                        background: "linear-gradient(to right, hsl(0,65%,58%), hsl(30,65%,58%), hsl(60,65%,58%), hsl(90,65%,58%), hsl(120,65%,58%), hsl(150,65%,58%), hsl(180,65%,58%), hsl(210,65%,58%), hsl(240,65%,58%), hsl(270,65%,58%), hsl(300,65%,58%), hsl(330,65%,58%), hsl(360,65%,58%), #000000)",
                      }}
                      onPointerDown={(e) => {
                        isDraggingStrip.current = true;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setListBgColor(id, hueFromPointer(e));
                      }}
                      onPointerMove={(e) => {
                        if (!isDraggingStrip.current) return;
                        setListBgColor(id, hueFromPointer(e));
                      }}
                      onPointerUp={() => { isDraggingStrip.current = false; }}
                    >
                      {list.bgHue !== undefined && (
                        <div
                          className="absolute top-0.5 bottom-0.5 w-5 rounded-full border-2 border-white shadow"
                          style={{
                            left: `calc(${(list.bgHue / 400) * 100}% - 10px)`,
                            backgroundColor: isGrey ? `hsl(0 0% 50%)` : `hsl(${list.bgHue} 65% 58%)`,
                          }}
                        />
                      )}
                    </div>

                    {/* Lightness strip — white (left) to black (right) */}
                    {list.bgHue !== undefined && (
                      <div
                        ref={lightnessStripRef}
                        className="relative h-7 rounded-full cursor-pointer select-none touch-none"
                        style={{ background: "linear-gradient(to right, #ffffff, #000000)" }}
                        onPointerDown={(e) => {
                          isDraggingLightness.current = true;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setListBgLightness(id, lightnessFromPointer(e));
                        }}
                        onPointerMove={(e) => {
                          if (!isDraggingLightness.current) return;
                          setListBgLightness(id, lightnessFromPointer(e));
                        }}
                        onPointerUp={() => { isDraggingLightness.current = false; }}
                      >
                        <div
                          className="absolute top-0.5 bottom-0.5 w-5 rounded-full border-2 border-white shadow"
                          style={{
                            left: `calc(${100 - bgLightness}% - 10px)`,
                            backgroundColor: `hsl(0 0% ${bgLightness}%)`,
                          }}
                        />
                      </div>
                    )}

                    {/* Current color preview + reset */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {list.bgHue !== undefined ? (
                          <>
                            <div
                              className="w-5 h-5 rounded-full border"
                              style={{
                                backgroundColor: listBg,
                                borderColor: "hsl(var(--border))",
                              }}
                            />
                            <span className="text-xs" style={{ color: "hsl(var(--foreground))" }}>
                              Hue {list.bgHue}°
                            </span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                            No color set
                          </span>
                        )}
                      </div>
                      {list.bgHue !== undefined && (
                        <button
                          onClick={() => setListBgColor(id, null)}
                          className="text-xs hover:opacity-70 transition-opacity"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {previewMode ? (
          /* Preview mode: title + avg badge centered and inline */
          <div className="flex items-baseline justify-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground text-center">
              {list.title}
            </h1>
            {avgColors && avg !== null && (
              <div
                className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl shrink-0"
                style={{ backgroundColor: avgColors.bg }}
              >
                <span className="text-lg font-bold" style={{ color: avgColors.ratingColor }}>
                  {fmt(avg)}
                </span>
                <span className="text-xs font-medium" style={{ color: avgColors.rankColor }}>
                  avg
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Title row */}
            <div className="flex items-center justify-between gap-3 mb-1">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={commitTitleEdit}
                  onKeyDown={handleTitleKey}
                  className="flex-1 text-3xl font-bold bg-transparent border-b-2 outline-none text-foreground"
                  style={{ borderColor: "hsl(var(--primary))" }}
                  maxLength={60}
                />
              ) : (
                <h1
                  className="text-3xl font-bold text-foreground truncate cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={startTitleEdit}
                  title="Tap to rename"
                >
                  {list.title}
                </h1>
              )}

              <div className="relative shrink-0">
                <select
                  value={currentSortMode}
                  onChange={(e) => setSortMode(id, e.target.value as SortMode)}
                  className="appearance-none text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 border cursor-pointer outline-none"
                  style={{
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >▾</span>
              </div>
            </div>

            {/* Average rating badge */}
            {avgColors && avg !== null && (
              <div
                className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl mb-2"
                style={{ backgroundColor: avgColors.bg }}
              >
                <span className="text-lg font-bold" style={{ color: avgColors.ratingColor }}>
                  {fmt(avg)}
                </span>
                <span className="text-xs font-medium" style={{ color: avgColors.rankColor }}>
                  avg
                </span>
              </div>
            )}
          </>
        )}

        {/* Description — hidden in preview mode */}
        {!previewMode && (
          editingDesc ? (
            <textarea
              ref={descRef}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={commitDescEdit}
              onKeyDown={handleDescKey}
              placeholder="Add a description…"
              rows={3}
              className="w-full text-sm bg-transparent border-b outline-none resize-none text-muted-foreground mb-2 placeholder:text-muted-foreground/50"
              style={{ borderColor: "hsl(var(--border))" }}
            />
          ) : (
            <p
              className="text-muted-foreground text-sm mb-2 cursor-pointer hover:opacity-70 transition-opacity min-h-[1.5rem] whitespace-pre-wrap"
              onClick={startDescEdit}
              title="Tap to add description"
            >
              {list.description || <span className="opacity-40 italic">Add a description…</span>}
            </p>
          )
        )}

        {!previewMode && (
          <p className="text-muted-foreground text-sm mb-6">
            {list.items.length === 0
              ? "No items yet"
              : `${list.items.length} item${list.items.length === 1 ? "" : "s"} · ${sortLabel(currentSortMode)}`}
          </p>
        )}

        {/* Hidden file input for gallery photo picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {/* Cover photo — shown in preview mode between header and items */}
        {previewMode && list.coverPhoto && (
          <div className="flex justify-center mb-3">
            <div className="relative group">
              <img
                src={list.coverPhoto}
                alt="Cover"
                className="rounded-2xl object-cover"
                style={{ width: 220, height: 220 }}
              />
              <button
                onClick={() => setListCoverPhoto(id, null)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {previewMode && !list.coverPhoto && <div className="mb-2" />}

        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="text-5xl">🎯</div>
            <p className="text-muted-foreground text-base">Tap + to add your first item.</p>
          </div>
        ) : (
          <>
            {/* Off-screen measurement div — always has ALL items at natural scale */}
            {previewMode && (
              <div
                ref={measureRef}
                className="flex flex-col gap-0.5"
                style={{ position: "absolute", top: -9999, left: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}
                aria-hidden="true"
              >
                {displayedItems.map((item, index) => (
                  <ItemRow
                    key={`measure-${item.id}`}
                    item={item}
                    rank={index + 1}
                    onRatingChange={() => {}}
                    onDelete={() => {}}
                    hideDelete
                  />
                ))}
              </div>
            )}

            {/* Visible items area */}
            <div
              ref={itemsRef}
              className={previewMode ? "flex flex-col gap-0.5" : "flex flex-col gap-2"}
              style={previewMode ? { zoom: `${pageScale * 100}%` } : undefined}
            >
              {currentPageItems.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  rank={pageStart + index + 1}
                  onRatingChange={(rating) => updateItemRating(id, item.id, rating)}
                  onRename={(name) => renameItem(id, item.id, name)}
                  onDelete={() => deleteItem(id, item.id)}
                  showMoveBar={!previewMode && currentSortMode === "added"}
                  onMoveUp={() => moveItem(id, item.id, "up")}
                  onMoveDown={() => moveItem(id, item.id, "down")}
                  isFirst={index === 0}
                  isLast={index === currentPageItems.length - 1}
                  hideDelete={previewMode}
                />
              ))}
            </div>

          </>
        )}
        {/* Note section — below items, hidden in preview mode */}
        {!previewMode && (
          <div className="mt-6">
            {editingNote ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={noteRef}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={handleNoteKey}
                  placeholder="Add a note…"
                  rows={4}
                  className="w-full text-sm bg-transparent border-b outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/50"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <div className="flex justify-start">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitNoteEdit(); }}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : list.note ? (
              <p
                className="text-muted-foreground text-sm cursor-pointer hover:opacity-70 transition-opacity whitespace-pre-wrap"
                onClick={startNoteEdit}
                title="Tap to edit note"
              >
                {list.note}
              </p>
            ) : (
              <button
                onClick={startNoteEdit}
                className="text-sm font-medium transition-opacity hover:opacity-60"
                style={{ color: "hsl(var(--muted-foreground) / 45%)" }}
              >
                + note
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!previewMode && (
        <div className="fixed bottom-6 right-6 flex flex-col items-center gap-2 z-50">
          <button
            onClick={handleScrollArrow}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
            aria-label={scrolledPastHalf ? "Scroll to top" : "Scroll to bottom"}
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ transform: scrolledPastHalf ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all"
            aria-label="Add item"
          >
            +
          </button>
        </div>
      )}

      {/* Page navigation — fixed at bottom center so it never shifts with item count */}
      {previewMode && totalPages > 1 && (
        <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-3 z-50 pointer-events-none">
          <button
            onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-25 pointer-events-auto"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--foreground))",
            }}
            aria-label="Previous page"
          >
            ‹
          </button>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPreviewPage(i)}
                aria-label={`Page ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === safePage ? 20 : 8,
                  height: 8,
                  backgroundColor:
                    i === safePage
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 35%)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-25 pointer-events-auto"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--foreground))",
            }}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}

      <NewItemDialog
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(name, rating) => { addItem(id, name, rating); setOpen(false); }}
      />
    </div>
  );
}
