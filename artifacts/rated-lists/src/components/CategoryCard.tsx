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
          onClick={handleDelete}
          className={`shrink-0 text-xs px-2 py-1 rounded-lg transition-colors ${
            confirmDelete
              ? "bg-destructive text-destructive-foreground"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          }`}
          aria-label="Delete category"
        >
          {confirmDelete ? "Sure?" : "✕"}
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
  );
}
