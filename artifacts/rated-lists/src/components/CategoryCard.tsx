import { useState } from "react";
import type { Category, RatedList } from "@/hooks/useLists";

interface Props {
  category: Category;
  lists: RatedList[];
  onClick: () => void;
  onDelete: () => void;
  scale?: number;
}

export function CategoryCard({ category, lists, onClick, onDelete, scale = 1 }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2000);
    }
  }

  return (
    <div
      onClick={onClick}
      className="relative bg-card border border-card-border cursor-pointer active:scale-[.99] transition-transform overflow-hidden"
      style={{ borderRadius: "var(--radius)", zoom: `${Math.round(scale * 100)}%` }}
    >
      {/* Subtle left accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px] bg-muted-foreground opacity-20" />

      <div className="flex items-center gap-3 py-3.5 pr-3 pl-[1.1rem]">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] leading-snug truncate tracking-tight text-foreground">
            {category.title}
          </h2>
          <p className="text-[11px] mt-0.5 font-medium uppercase tracking-wide text-muted-foreground">
            {lists.length === 0 ? "No lists" : `${lists.length} list${lists.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* List count badge */}
        {lists.length > 0 && (
          <span className="text-sm font-semibold tabular-nums text-muted-foreground shrink-0 opacity-60">
            {lists.length}
          </span>
        )}

        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-md text-base font-medium transition-colors shrink-0"
          style={{
            color: confirmDelete ? "#fff" : "hsl(var(--muted-foreground))",
            backgroundColor: confirmDelete ? "rgba(239,68,68,0.62)" : "transparent",
          }}
          aria-label="Delete category"
        >
          {confirmDelete ? "?" : "×"}
        </button>
      </div>
    </div>
  );
}
