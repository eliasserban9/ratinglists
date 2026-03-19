import { useState, useCallback } from "react";

export interface ListItem {
  id: string;
  name: string;
  rating: number;
}

export type SortMode = "added" | "rating" | "name";

export interface RatedList {
  id: string;
  title: string;
  items: ListItem[];
  createdAt: number;
  updatedAt: number;
  colorMode: boolean;
  sortMode: SortMode;
  categoryId?: string;
}

export interface Category {
  id: string;
  title: string;
  createdAt: number;
}

export interface StandaloneItem {
  id: string;
  name: string;
  rating: number;
  createdAt: number;
  updatedAt: number;
}

interface StoredData {
  lists: RatedList[];
  categories: Category[];
  standaloneItems: StandaloneItem[];
}

const STORAGE_KEY = "rated-lists-data-v2";

function load(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.lists)) {
        return {
          lists: parsed.lists.map((l: RatedList) => ({
            colorMode: false,
            sortMode: "rating" as SortMode,
            updatedAt: l.createdAt,
            ...l,
          })),
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          standaloneItems: Array.isArray(parsed.standaloneItems) ? parsed.standaloneItems : [],
        };
      }
    }
    // Migrate from old key
    const oldRaw = localStorage.getItem("rated-lists-data");
    if (oldRaw) {
      const oldLists = JSON.parse(oldRaw);
      if (Array.isArray(oldLists)) {
        return {
          lists: oldLists.map((l: RatedList) => ({
            colorMode: false,
            sortMode: "rating" as SortMode,
            updatedAt: l.createdAt,
            ...l,
          })),
          categories: [],
          standaloneItems: [],
        };
      }
    }
    return { lists: [], categories: [], standaloneItems: [] };
  } catch {
    return { lists: [], categories: [], standaloneItems: [] };
  }
}

function save(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useLists() {
  const [data, setData] = useState<StoredData>(load);

  const persist = useCallback((updated: StoredData) => {
    save(updated);
    setData(updated);
  }, []);

  // ── Top-level lists ───────────────────────────────────────────────────────

  const topLevelLists = data.lists.filter((l) => !l.categoryId);

  const createList = useCallback(
    (title: string): string => {
      const id = uid();
      const now = Date.now();
      const newList: RatedList = {
        id,
        title: title.trim() || "Untitled List",
        items: [],
        createdAt: now,
        updatedAt: now,
        colorMode: false,
        sortMode: "rating",
      };
      persist({ ...data, lists: [newList, ...data.lists] });
      return id;
    },
    [data, persist]
  );

  const deleteList = useCallback(
    (id: string) => {
      persist({ ...data, lists: data.lists.filter((l) => l.id !== id) });
    },
    [data, persist]
  );

  const getList = useCallback(
    (id: string) => data.lists.find((l) => l.id === id),
    [data]
  );

  const setColorMode = useCallback(
    (listId: string, colorMode: boolean) => {
      persist({
        ...data,
        lists: data.lists.map((l) => (l.id === listId ? { ...l, colorMode } : l)),
      });
    },
    [data, persist]
  );

  const setSortMode = useCallback(
    (listId: string, sortMode: SortMode) => {
      persist({
        ...data,
        lists: data.lists.map((l) => (l.id === listId ? { ...l, sortMode } : l)),
      });
    },
    [data, persist]
  );

  const moveItem = useCallback(
    (listId: string, itemId: string, direction: "up" | "down") => {
      const list = data.lists.find((l) => l.id === listId);
      if (!list) return;
      const idx = list.items.findIndex((item) => item.id === itemId);
      if (idx === -1) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= list.items.length) return;
      const newItems = [...list.items];
      [newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]];
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, items: newItems, updatedAt: Date.now() } : l
        ),
      });
    },
    [data, persist]
  );

  // ── Categories ────────────────────────────────────────────────────────────

  const createCategory = useCallback(
    (title: string): string => {
      const id = uid();
      const newCat: Category = {
        id,
        title: title.trim() || "Untitled Category",
        createdAt: Date.now(),
      };
      persist({ ...data, categories: [newCat, ...data.categories] });
      return id;
    },
    [data, persist]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      persist({
        ...data,
        lists: data.lists.filter((l) => l.categoryId !== id),
        categories: data.categories.filter((c) => c.id !== id),
      });
    },
    [data, persist]
  );

  const getCategory = useCallback(
    (id: string) => data.categories.find((c) => c.id === id),
    [data]
  );

  const getListsForCategory = useCallback(
    (categoryId: string) => data.lists.filter((l) => l.categoryId === categoryId),
    [data]
  );

  // ── Lists inside a category ───────────────────────────────────────────────

  const createListInCategory = useCallback(
    (categoryId: string, title: string): string => {
      const id = uid();
      const now = Date.now();
      const newList: RatedList = {
        id,
        title: title.trim() || "Untitled List",
        items: [],
        createdAt: now,
        updatedAt: now,
        colorMode: false,
        sortMode: "rating",
        categoryId,
      };
      persist({ ...data, lists: [newList, ...data.lists] });
      return id;
    },
    [data, persist]
  );

  // ── Items ─────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    (listId: string, name: string, rating: number) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id !== listId
            ? l
            : {
                ...l,
                updatedAt: Date.now(),
                items: [...l.items, { id: uid(), name: name.trim(), rating }],
              }
        ),
      });
    },
    [data, persist]
  );

  const updateItemRating = useCallback(
    (listId: string, itemId: string, rating: number) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id !== listId
            ? l
            : {
                ...l,
                updatedAt: Date.now(),
                items: l.items.map((item) => (item.id === itemId ? { ...item, rating } : item)),
              }
        ),
      });
    },
    [data, persist]
  );

  const deleteItem = useCallback(
    (listId: string, itemId: string) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id !== listId
            ? l
            : {
                ...l,
                updatedAt: Date.now(),
                items: l.items.filter((item) => item.id !== itemId),
              }
        ),
      });
    },
    [data, persist]
  );

  const reorderItems = useCallback(
    (listId: string, orderedIds: string[]) => {
      const list = data.lists.find((l) => l.id === listId);
      if (!list) return;
      const itemMap = new Map(list.items.map((item) => [item.id, item]));
      const newItems = orderedIds.map((id) => itemMap.get(id)).filter(Boolean) as typeof list.items;
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, items: newItems, updatedAt: Date.now() } : l
        ),
      });
    },
    [data, persist]
  );

  // ── Standalone items ──────────────────────────────────────────────────────

  const addStandaloneItem = useCallback(
    (name: string, rating: number): string => {
      const id = uid();
      const now = Date.now();
      const newItem: StandaloneItem = { id, name: name.trim(), rating, createdAt: now, updatedAt: now };
      persist({ ...data, standaloneItems: [newItem, ...data.standaloneItems] });
      return id;
    },
    [data, persist]
  );

  const updateStandaloneItemRating = useCallback(
    (itemId: string, rating: number) => {
      persist({
        ...data,
        standaloneItems: data.standaloneItems.map((i) =>
          i.id === itemId ? { ...i, rating, updatedAt: Date.now() } : i
        ),
      });
    },
    [data, persist]
  );

  const deleteStandaloneItem = useCallback(
    (itemId: string) => {
      persist({
        ...data,
        standaloneItems: data.standaloneItems.filter((i) => i.id !== itemId),
      });
    },
    [data, persist]
  );

  const renameList = useCallback(
    (listId: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      persist({
        ...data,
        lists: data.lists.map((l) => (l.id === listId ? { ...l, title: t } : l)),
      });
    },
    [data, persist]
  );

  const renameCategory = useCallback(
    (categoryId: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      persist({
        ...data,
        categories: data.categories.map((c) => (c.id === categoryId ? { ...c, title: t } : c)),
      });
    },
    [data, persist]
  );

  const renameItem = useCallback(
    (listId: string, itemId: string, name: string) => {
      const n = name.trim();
      if (!n) return;
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id !== listId
            ? l
            : { ...l, items: l.items.map((item) => (item.id === itemId ? { ...item, name: n } : item)) }
        ),
      });
    },
    [data, persist]
  );

  const renameStandaloneItem = useCallback(
    (itemId: string, name: string) => {
      const n = name.trim();
      if (!n) return;
      persist({
        ...data,
        standaloneItems: data.standaloneItems.map((i) => (i.id === itemId ? { ...i, name: n } : i)),
      });
    },
    [data, persist]
  );

  return {
    lists: topLevelLists,
    categories: data.categories,
    standaloneItems: data.standaloneItems,
    createList,
    deleteList,
    getList,
    setColorMode,
    setSortMode,
    renameList,
    createCategory,
    deleteCategory,
    getCategory,
    getListsForCategory,
    createListInCategory,
    renameCategory,
    addItem,
    updateItemRating,
    deleteItem,
    moveItem,
    reorderItems,
    renameItem,
    addStandaloneItem,
    updateStandaloneItemRating,
    deleteStandaloneItem,
    renameStandaloneItem,
  };
}
