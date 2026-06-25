import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Category, RatedList } from "@/hooks/useLists";

interface Props {
  category: Category;
  lists: RatedList[];
  onClick: () => void;
  onDelete: () => void;
  onAddToList: () => void;
  scale?: number;
}

export function CategoryCard({ category, lists, onClick, onDelete, onAddToList, scale = 1 }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setConfirmDelete(false);
    setMenuOpen((v) => !v);
  }

  function handleDelete(e: React.MouseEvent) {
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
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setConfirmDelete(false);
            }}
          />
          <div
            className="fixed z-[9999] min-w-[180px] rounded-xl overflow-hidden shadow-xl border"
            style={{
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--popover-border))",
            }}
          >
            <button
              onClick={handleDelete}
              className="w-full px-4 py-3 text-sm text-left active:opacity-60"
              style={{
                color: confirmDelete ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                fontWeight: confirmDelete ? 600 : 400,
              }}
            >
              {confirmDelete ? "Tap again to confirm" : "Delete category"}
            </button>
            <div style={{ height: 1, backgroundColor: "hsl(var(--border))" }} />
            <button
              onClick={handleAddToList}
              className="w-full px-4 py-3 text-sm text-left active:opacity-60"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Add all items to list
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      <div
        onClick={onClick}
        className="relative bg-card border border-card-border rounded-2xl p-4 cursor-pointer active:scale-[.98] transition-transform hover:shadow-sm"
        style={{ zoom: `${Math.round(scale * 100)}%` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl shrink-0">📁</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-base text-foreground truncate">{category.title}</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {lists.length === 0
                  ? "Empty category"
                  : `${lists.length} list${lists.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <button
            ref={btnRef}
            onClick={openMenu}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-lg font-bold transition-colors hover:bg-muted active:opacity-60"
            style={{ color: "hsl(var(--muted-foreground))" }}
            aria-label="Category options"
          >
            ···
          </button>
        </div>

        {lists.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 pl-10">
            {lists.slice(0, 3).map((list) => (
              <span
                key={list.id}
                className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 truncate max-w-[120px]"
              >
                {list.title}
              </span>
            ))}
            {lists.length > 3 && (
              <span className="text-xs text-muted-foreground px-1">+{lists.length - 3}</span>
            )}
          </div>
        )}
      </div>
      {dropdown}
    </>
  );
}
