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
const MAX_ITEMS_PER_PAGE = 10;

export default function ListPage({ params }: Props) {
  const { id } = params;
  const [, navigate] = useLocation();
  const {
    loading: listsLoading,
    getList, getCategory, addItem, updateItemRating, deleteItem,
    setSortMode, moveItem, renameList, renameItem, setListDescription, setListNote, setIntroNote, applyListPhoto, removeListPhoto,
  } = useLists();

  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [editingIntroNote, setEditingIntroNote] = useState(false);
  const [introNoteValue, setIntroNoteValue] = useState("");

  // Preview mode state
  const [previewMode, setPreviewMode] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [pageScale, setPageScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [previewPage, setPreviewPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [scrolledPastHalf, setScrolledPastHalf] = useState(false);
  const prevItemsPerPageRef = useRef(10);

  const [photoError, setPhotoError] = useState<string | null>(null);

  // Refs for measurement
  const measureRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const prevPreviewModeRef = useRef(false);
  const prevItemCountRef = useRef(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const introNoteRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    if (editingIntroNote) setTimeout(() => introNoteRef.current?.focus(), 30);
  }, [editingIntroNote]);


  useEffect(() => {
    function onScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setScrolledPastHalf(scrollable > 0 && window.scrollY > scrollable / 2);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Recompute preview scale so the current page always fills the space above the nav bar.
  useLayoutEffect(() => {
    const itemCount = list?.items.length ?? 0;
    const previewModeChanged = prevPreviewModeRef.current !== previewMode;

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

    if (previewModeChanged) {
      setPreviewPage(0);
    }

    // Skip scale computation on intro page — items aren't shown there
    const currentIsIntroPage = showIntro && previewPage === 0;
    if (currentIsIntroPage) return;

    if (!measureRef.current || !itemsRef.current) return;

    const measuredHeight = measureRef.current.scrollHeight;
    const itemPageCount = Math.ceil(itemCount / itemsPerPage);
    const totalPagesCount = showIntro ? itemPageCount + 1 : itemPageCount;
    const bottomReserve = totalPagesCount > 1 ? 72 : 16;

    let availableHeight: number;
    if (showIntro) {
      // Cap to 62% of screen height when intro mode is on — leaves space for bottom nav
      availableHeight = window.innerHeight * 0.62 - bottomReserve;
    } else {
      const rect = itemsRef.current.getBoundingClientRect();
      availableHeight = window.innerHeight - rect.top - bottomReserve;
    }

    if (measuredHeight <= 0 || availableHeight <= 0 || itemCount <= 0) return;

    const scale = Math.min(1.5, availableHeight / measuredHeight);
    setNaturalHeight(measuredHeight);
    setPageScale(scale);
  }, [previewMode, list?.items.length, itemsPerPage, list?.note, list?.coverPhoto, showIntro, previewPage]);

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{listsLoading ? "Loading…" : "List not found."}</p>
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

  // Pagination (intro page = page 0 when showIntro is true, then item pages follow)
  const itemPageCount = previewMode ? Math.ceil(displayedItems.length / itemsPerPage) : 1;
  const totalPages = previewMode && showIntro ? itemPageCount + 1 : itemPageCount;
  const safePage = Math.min(previewPage, Math.max(0, totalPages - 1));
  const isIntroPage = previewMode && showIntro && safePage === 0;
  const itemPageIndex = isIntroPage ? 0 : (previewMode && showIntro ? safePage - 1 : safePage);
  const pageStart = itemPageIndex * itemsPerPage;
  const pageEnd = Math.min(pageStart + itemsPerPage, displayedItems.length);
  const previewItems = (previewMode && !isIntroPage) ? displayedItems.slice(pageStart, pageEnd) : displayedItems;
  // Items used for off-screen scale measurement (always the first item page)
  const measureItems = displayedItems.slice(0, Math.min(itemsPerPage, displayedItems.length));

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

  function startIntroNoteEdit() {
    setIntroNoteValue(list!.introNote ?? "");
    setEditingIntroNote(true);
  }

  function commitIntroNoteEdit() {
    setIntroNote(id, introNoteValue);
    setEditingIntroNote(false);
  }

  function handleIntroNoteKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") commitIntroNoteEdit();
  }

  function handleScrollArrow() {
    if (scrolledPastHalf) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function cropToSquareCanvas(file: File): Promise<HTMLCanvasElement> {
    const MAX_PX = 900;
    return new Promise((resolve, reject) => {
      if (file.size > 25 * 1024 * 1024) {
        reject(new Error("Photo file size is too large. Please choose a smaller image."));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const cropSize = Math.min(img.width, img.height);
        const outSize = Math.min(MAX_PX, cropSize);
        const canvas = document.createElement("canvas");
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          (img.width - cropSize) / 2, (img.height - cropSize) / 2, cropSize, cropSize,
          0, 0, outSize, outSize,
        );
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read this photo. It may be too large or in an unsupported format."));
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
    let totalL = 0;
    let totalPixels = 0;
    const pixels = ctx.getImageData(0, 0, width, height).data;

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
        totalL += l * 100;
        totalPixels++;
        if (s < 0.1) continue; // no meaningful hue — skip
        let h = 0;
        if (max !== min) {
          if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
          else if (max === g) h = (b - r) / (max - min) + 2;
          else h = (r - g) / (max - min) + 4;
          h = h * 60;
        }
        const bucket = Math.floor(h / (360 / NUM_BUCKETS)) % NUM_BUCKETS;
        bucketCounts[bucket]++;
        bucketLightness[bucket].push(l * 100);
      }
    }

    const totalColoured = bucketCounts.reduce((a, b) => a + b, 0);
    // If fewer than 10% of pixels have meaningful colour, treat as neutral/grey
    if (totalColoured / totalPixels < 0.1) {
      return { hue: 380, lightness: Math.round(totalL / totalPixels) };
    }

    // Smooth adjacent buckets to avoid splitting a single colour across two buckets
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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const canvas = await cropToSquareCanvas(file);
      const { hue, lightness } = extractDominantColor(canvas);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      applyListPhoto(id, dataUrl, hue, Math.max(8, lightness - 8));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo.");
      setTimeout(() => setPhotoError(null), 4000);
    }
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
      : `hsl(${list.bgHue} ${isDark ? 22 : 32}% ${bgLightness}%)`
    : undefined;

  // Override CSS variables so ALL UI elements stay readable against the custom bg.
  // When bgLightness > 52 we emulate light-mode tokens; otherwise dark-mode tokens.
  const textVars: React.CSSProperties = listBg
    ? bgLightness > 52
      ? ({
          '--foreground':        '222 47% 8%',
          '--muted-foreground':  '215 16% 32%',
          '--muted':             '220 14% 88%',
          '--card':              '220 10% 96%',
          '--card-foreground':   '222 47% 8%',
          '--border':            '220 15% 74%',
          '--input':             '220 15% 74%',
        } as React.CSSProperties)
      : ({
          '--foreground':        '210 40% 96%',
          '--muted-foreground':  '215 20% 72%',
          '--muted':             '220 12% 22%',
          '--card':              '222 14% 18%',
          '--card-foreground':   '210 40% 96%',
          '--border':            '220 12% 30%',
          '--input':             '220 12% 30%',
        } as React.CSSProperties)
    : {};


  const hasPhotoBg = previewMode && !!list.coverPhoto;

  return (
    <div
      className="min-h-screen"
      style={previewMode
        ? { position: "relative", overflow: "hidden", ...(!hasPhotoBg && listBg ? { backgroundColor: listBg } : {}), ...textVars }
        : { paddingBottom: "6rem" }}
    >
      {hasPhotoBg && (
        <>
          <div style={{
            position: "absolute", inset: "-30px",
            backgroundImage: `url(${list.coverPhoto})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(22px)",
            zIndex: 0,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(0,0,0,0.38)",
            zIndex: 1,
          }} />
        </>
      )}
      <div style={hasPhotoBg ? { position: "relative", zIndex: 2 } : undefined}>
      <div className="max-w-lg mx-auto px-4 pt-10 pb-4">

        {/* Top bar: back + right buttons */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(backPath, { replace: true })}
            className="flex items-center gap-1 text-primary text-sm hover:opacity-70 transition-opacity"
          >
            <span className="text-lg leading-none">‹</span>
            <span>{backLabel}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Items-per-page stepper — only shown in preview mode */}
            {previewMode && (
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
                >−</button>
                <span className="px-1 tabular-nums">{itemsPerPage}</span>
                <button
                  onClick={() => setItemsPerPage((n) => Math.min(MAX_ITEMS_PER_PAGE, n + 1))}
                  disabled={itemsPerPage >= MAX_ITEMS_PER_PAGE}
                  className="w-7 h-7 flex items-center justify-center text-base leading-none transition-opacity disabled:opacity-30 hover:opacity-70 active:scale-95"
                  aria-label="More items per page"
                >+</button>
              </div>
            )}

            {/* Intro page toggle — only in preview mode */}
            {previewMode && (
              <button
                onClick={() => setShowIntro((v) => !v)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors hover:opacity-80"
                style={
                  showIntro
                    ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                    : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
                aria-label="Toggle intro page"
              >Intro</button>
            )}

            {/* Camera / remove-photo button — only shown in preview mode */}
            {previewMode && (
              list.coverPhoto ? (
                <button
                  onClick={() => removeListPhoto(id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }}
                  aria-label="Remove cover photo"
                  title="Remove photo"
                >✕</button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center rounded-full border text-base transition-colors hover:opacity-70"
                  style={{ backgroundColor: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  aria-label="Upload cover photo"
                >📷</button>
              )
            )}

            <button
              onClick={handleTogglePreview}
              className="text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors"
              style={
                previewMode
                  ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                  : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
              }
              aria-label="Toggle preview mode"
            >{previewMode ? "✕ Exit" : "▶ Preview"}</button>

          </div>
        </div>

        {/* Photo upload error toast */}
        {photoError && (
          <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>
            {photoError}
          </div>
        )}

        {isIntroPage ? (
          /* Intro page — all content centered, shifted slightly upward */
          <div
            className="flex flex-col items-center justify-center gap-5 py-4"
            style={{ minHeight: "calc(100vh - 180px)", paddingBottom: "18%" }}
          >
            <h1 className="text-4xl font-bold text-foreground text-center px-2 leading-tight">
              {list.title}
            </h1>

            {avgColors && avg !== null && (
              <div
                className="inline-flex items-baseline gap-1.5 px-4 py-1.5 rounded-xl"
                style={{ backgroundColor: avgColors.bg }}
              >
                <span className="text-2xl font-bold" style={{ color: avgColors.ratingColor }}>
                  {fmt(avg)}
                </span>
                <span className="text-sm font-medium" style={{ color: avgColors.rankColor }}>
                  avg
                </span>
              </div>
            )}

            {list.coverPhoto && (
              <img
                src={list.coverPhoto}
                alt="Cover"
                className="rounded-3xl object-cover shadow-lg"
                style={{ width: 320, height: 320 }}
              />
            )}

            {/* Intro-page-only note */}
            {editingIntroNote ? (
              <div className="w-full flex flex-col gap-2">
                <textarea
                  ref={introNoteRef}
                  value={introNoteValue}
                  onChange={(e) => setIntroNoteValue(e.target.value)}
                  onKeyDown={handleIntroNoteKey}
                  placeholder="Add an intro note…"
                  rows={3}
                  className="w-full text-sm bg-transparent border-b outline-none resize-none text-center placeholder:opacity-40"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground) / 0.92)" }}
                />
                <div className="flex justify-center">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitIntroNoteEdit(); }}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                  >Done</button>
                </div>
              </div>
            ) : list.introNote ? (
              <p
                className="text-sm cursor-pointer hover:opacity-70 transition-opacity whitespace-pre-wrap text-center px-2"
                style={{ color: "hsl(var(--foreground) / 0.92)" }}
                onClick={startIntroNoteEdit}
                title="Tap to edit intro note"
              >{list.introNote}</p>
            ) : (
              <button
                onClick={startIntroNoteEdit}
                className="text-sm font-medium transition-opacity hover:opacity-60"
                style={{ color: "hsl(var(--foreground) / 0.65)" }}
              >+ intro note</button>
            )}
          </div>
        ) : previewMode ? (
          /* Item-page preview header: compact title + avg */
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
              className="w-full text-sm bg-transparent border-b outline-none resize-none mb-2 placeholder:text-muted-foreground/50"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground) / 0.90)" }}
            />
          ) : (
            <p
              className="text-sm mb-2 cursor-pointer hover:opacity-70 transition-opacity min-h-[1.5rem] whitespace-pre-wrap"
              style={{ color: "hsl(var(--foreground) / 0.90)" }}
              onClick={startDescEdit}
              title="Tap to add description"
            >
              {list.description || <span className="opacity-40 italic">Add a description…</span>}
            </p>
          )
        )}

        {!previewMode && (
          <p className="text-sm mb-6" style={{ color: "hsl(var(--foreground) / 0.78)" }}>
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

        {/* Cover photo — shown on item pages only when intro is disabled */}
        {previewMode && !showIntro && list.coverPhoto && (
          <div className="flex justify-center mb-3">
            <img
              src={list.coverPhoto}
              alt="Cover"
              className="rounded-2xl object-cover"
              style={{ width: 220, height: 220 }}
            />
          </div>
        )}

        {previewMode && !showIntro && !list.coverPhoto && <div className="mb-2" />}

        {/* Note section — shown on item pages in preview mode (not on intro page) */}
        {previewMode && !isIntroPage && (
          <div className="mb-3">
            {editingNote ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={noteRef}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={handleNoteKey}
                  placeholder="Add a note…"
                  rows={3}
                  className="w-full text-sm bg-transparent border-b outline-none resize-none placeholder:opacity-40"
                  style={{
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
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
                className="text-sm cursor-pointer hover:opacity-70 transition-opacity whitespace-pre-wrap text-center"
                style={{ color: "hsl(var(--foreground) / 0.90)" }}
                onClick={startNoteEdit}
                title="Tap to edit note"
              >
                {list.note}
              </p>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={startNoteEdit}
                  className="text-sm font-medium transition-opacity hover:opacity-60"
                  style={{ color: "hsl(var(--foreground) / 0.65)" }}
                >
                  + note
                </button>
              </div>
            )}
          </div>
        )}

        {!isIntroPage && (displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="text-5xl">🎯</div>
            <p className="text-muted-foreground text-base">Tap + to add your first item.</p>
          </div>
        ) : (
          <>
            {/* Off-screen measurement div — always measures the first item page */}
            {previewMode && (
              <div
                ref={measureRef}
                className="flex flex-col gap-0.5"
                style={{ position: "absolute", top: -9999, left: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}
                aria-hidden="true"
              >
                {measureItems.map((item, index) => (
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

            {/* Visible items area — centering wrapper when intro is on */}
            <div
              className={showIntro && previewMode ? "flex flex-col items-stretch justify-start" : ""}
              style={showIntro && previewMode ? { minHeight: "calc(100vh - 210px)", paddingTop: "5%" } : undefined}
            >
              {/* Height constrainer + scale */}
              <div style={previewMode && naturalHeight > 0 ? { height: naturalHeight * pageScale, overflow: "hidden" } : undefined}>
                <div
                  ref={itemsRef}
                  className={previewMode ? "flex flex-col gap-0.5" : "flex flex-col gap-2"}
                  style={previewMode ? { transform: `scale(${pageScale})`, transformOrigin: "top left", width: pageScale > 0 ? `${100 / pageScale}%` : "100%" } : undefined}
                >
                  {previewItems.map((item, index) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      rank={pageStart + index + 1}
                      onRatingChange={previewMode ? () => {} : (rating) => updateItemRating(id, item.id, rating)}
                      onRename={previewMode ? undefined : (name) => renameItem(id, item.id, name)}
                      onDelete={() => deleteItem(id, item.id)}
                      showMoveBar={!previewMode && currentSortMode === "added"}
                      onMoveUp={() => moveItem(id, item.id, "up")}
                      onMoveDown={() => moveItem(id, item.id, "down")}
                      isFirst={index === 0}
                      isLast={index === previewItems.length - 1}
                      hideDelete={previewMode}
                      textScale={previewMode ? 1 : 0.85}
                      preview={previewMode}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        ))}
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
                  className="w-full text-sm bg-transparent border-b outline-none resize-none placeholder:text-muted-foreground/50"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground) / 0.90)" }}
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
                className="text-sm cursor-pointer hover:opacity-70 transition-opacity whitespace-pre-wrap"
                style={{ color: "hsl(var(--foreground) / 0.90)" }}
                onClick={startNoteEdit}
                title="Tap to edit note"
              >
                {list.note}
              </p>
            ) : (
              <button
                onClick={startNoteEdit}
                className="text-sm font-medium transition-opacity hover:opacity-60"
                style={{ color: "hsl(var(--foreground) / 0.65)" }}
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


      {/* Page navigation — fixed at bottom center */}
      {previewMode && totalPages > 1 && (
        <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-3 z-50 pointer-events-none">
          <button
            onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-25 pointer-events-auto"
            style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            aria-label="Previous page"
          >‹</button>

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
                  backgroundColor: i === safePage
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
            style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            aria-label="Next page"
          >›</button>
        </div>
      )}

      <NewItemDialog
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(name, rating) => { addItem(id, name, rating); setOpen(false); }}
      />
      </div>
    </div>
  );
}
