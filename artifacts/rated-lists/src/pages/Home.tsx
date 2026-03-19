import { useState } from "react";
import { useLocation } from "wouter";
import { useLists } from "@/hooks/useLists";
import { useTheme } from "@/hooks/useTheme";
import { ListCard } from "@/components/ListCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ItemRow } from "@/components/ItemRow";
import { CreateTypeDialog } from "@/components/CreateTypeDialog";

export default function Home() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const {
    lists,
    categories,
    standaloneItems,
    createList,
    deleteList,
    setColorMode,
    createCategory,
    deleteCategory,
    getListsForCategory,
    addStandaloneItem,
    updateStandaloneItemRating,
    deleteStandaloneItem,
    renameStandaloneItem,
  } = useLists();
  const [, navigate] = useLocation();

  function handleCreate(type: "list" | "category" | "item", title: string, rating?: number) {
    if (type === "list") {
      const id = createList(title);
      navigate(`/list/${id}`);
    } else if (type === "category") {
      const id = createCategory(title);
      navigate(`/category/${id}`);
    } else {
      addStandaloneItem(title, rating ?? 5);
    }
  }

  const hasContent = lists.length > 0 || categories.length > 0 || standaloneItems.length > 0;

  // Merge all home-screen items, sort by most recently updated/created
  type HomeEntry =
    | { kind: "category"; item: (typeof categories)[0]; sortKey: number }
    | { kind: "list"; item: (typeof lists)[0]; sortKey: number }
    | { kind: "item"; item: (typeof standaloneItems)[0]; sortKey: number };

  const allItems: HomeEntry[] = [
    ...categories.map((c) => ({ kind: "category" as const, item: c, sortKey: c.createdAt })),
    ...lists.map((l) => ({ kind: "list" as const, item: l, sortKey: l.updatedAt ?? l.createdAt })),
    ...standaloneItems.map((i) => ({ kind: "item" as const, item: i, sortKey: i.updatedAt })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-4">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-bold text-foreground">Rating Lists</h1>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="mt-1 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <p className="text-muted-foreground text-sm mb-8">Rate and rank anything you love</p>

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
            <div className="text-5xl">📝</div>
            <p className="text-muted-foreground text-base">No lists yet. Tap + to create one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allItems.map(({ kind, item }) => {
              if (kind === "category") {
                return (
                  <CategoryCard
                    key={item.id}
                    category={item}
                    lists={getListsForCategory(item.id)}
                    onClick={() => navigate(`/category/${item.id}`)}
                    onDelete={() => deleteCategory(item.id)}
                  />
                );
              }
              if (kind === "list") {
                return (
                  <ListCard
                    key={item.id}
                    list={item}
                    onClick={() => navigate(`/list/${item.id}`)}
                    onDelete={() => deleteList(item.id)}
                    onColorModeChange={(value) => setColorMode(item.id, value)}
                  />
                );
              }
              // Standalone item — render as a colored row
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  onRatingChange={(rating) => updateStandaloneItemRating(item.id, rating)}
                  onRename={(name) => renameStandaloneItem(item.id, name)}
                  onDelete={() => deleteStandaloneItem(item.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label="Create new"
      >
        +
      </button>

      <CreateTypeDialog open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />
    </div>
  );
}
