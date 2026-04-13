import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ListItem {
  id: string;
  name: string;
  rating: number;
}

export type SortMode = "added" | "rating" | "name";

export interface RatedList {
  id: string;
  title: string;
  description?: string;
  note?: string;
  introNote?: string;
  bgHue?: number;
  bgLightness?: number;
  coverPhoto?: string;
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
  sortMode?: SortMode;
}

export interface StandaloneItem {
  id: string;
  name: string;
  rating: number;
  createdAt: number;
  updatedAt: number;
}

export interface TrashItem {
  id: string;
  deletedAt: number;
  type: "list" | "category";
  list?: RatedList;
  category?: Category;
  categoryLists?: RatedList[];
}

export interface StoredData {
  lists: RatedList[];
  categories: Category[];
  standaloneItems: StandaloneItem[];
  trash: TrashItem[];
}

export const TRASH_TTL = 24 * 60 * 60 * 1000;

const EMPTY: StoredData = { lists: [], categories: [], standaloneItems: [], trash: [] };
const USER_DATA_KEY = ["user-data"];
const CACHE_KEY = "rated-lists-server-cache";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadCache(): StoredData | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as StoredData;
  } catch {
    return undefined;
  }
}

function saveCache(data: StoredData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function purgeExpired(trash: TrashItem[]): TrashItem[] {
  const cutoff = Date.now() - TRASH_TTL;
  return trash.filter((t) => t.deletedAt >= cutoff);
}

function normalize(raw: Partial<StoredData>): StoredData {
  return {
    lists: (raw.lists ?? []).map((l) => ({
      colorMode: false,
      sortMode: "added" as SortMode,
      updatedAt: l.createdAt,
      ...l,
    })),
    categories: raw.categories ?? [],
    standaloneItems: raw.standaloneItems ?? [],
    trash: purgeExpired(raw.trash ?? []),
  };
}

async function fetchUserData(): Promise<StoredData> {
  const r = await fetch("/api/user-data");
  if (!r.ok) throw new Error("Failed to load user data");
  const fresh = normalize(await r.json());
  saveCache(fresh);
  return fresh;
}

function scheduleSave(data: StoredData) {
  saveCache(data);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/user-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }, 800);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useLists() {
  const queryClient = useQueryClient();

  const { data: queryData, isLoading } = useQuery({
    queryKey: USER_DATA_KEY,
    queryFn: fetchUserData,
    staleTime: Infinity,
    retry: 1,
    initialData: loadCache,
    initialDataUpdatedAt: 0,
  });

  const data: StoredData = queryData ?? EMPTY;

  const persist = useCallback(
    (updated: StoredData) => {
      queryClient.setQueryData(USER_DATA_KEY, updated);
      scheduleSave(updated);
    },
    [queryClient]
  );

  // ── Top-level lists ────────────────────────────────────────────────────────

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
        sortMode: "added",
      };
      persist({ ...data, lists: [newList, ...data.lists] });
      return id;
    },
    [data, persist]
  );

  const deleteList = useCallback(
    (id: string) => {
      const list = data.lists.find((l) => l.id === id);
      if (!list) return;
      const trashItem: TrashItem = { id: uid(), deletedAt: Date.now(), type: "list", list };
      persist({ ...data, lists: data.lists.filter((l) => l.id !== id), trash: [...data.trash, trashItem] });
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

  // ── Categories ─────────────────────────────────────────────────────────────

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
      const category = data.categories.find((c) => c.id === id);
      if (!category) return;
      const categoryLists = data.lists.filter((l) => l.categoryId === id);
      const trashItem: TrashItem = { id: uid(), deletedAt: Date.now(), type: "category", category, categoryLists };
      persist({
        ...data,
        lists: data.lists.filter((l) => l.categoryId !== id),
        categories: data.categories.filter((c) => c.id !== id),
        trash: [...data.trash, trashItem],
      });
    },
    [data, persist]
  );

  const restoreFromTrash = useCallback(
    (trashId: string) => {
      const item = data.trash.find((t) => t.id === trashId);
      if (!item) return;
      let newLists = data.lists;
      let newCategories = data.categories;
      if (item.type === "list" && item.list) {
        const catStillExists = item.list.categoryId
          ? data.categories.some((c) => c.id === item.list!.categoryId)
          : true;
        const restoredList = catStillExists ? item.list : { ...item.list, categoryId: undefined };
        newLists = [restoredList, ...data.lists];
      } else if (item.type === "category" && item.category) {
        newCategories = [item.category, ...data.categories];
        newLists = [...(item.categoryLists ?? []), ...data.lists];
      }
      persist({ ...data, lists: newLists, categories: newCategories, trash: data.trash.filter((t) => t.id !== trashId) });
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

  // ── Lists inside a category ────────────────────────────────────────────────

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
        sortMode: "added",
        categoryId,
      };
      persist({ ...data, lists: [newList, ...data.lists] });
      return id;
    },
    [data, persist]
  );

  // ── Items ──────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    (listId: string, name: string, rating: number) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id !== listId
            ? l
            : { ...l, updatedAt: Date.now(), items: [...l.items, { id: uid(), name: name.trim(), rating }] }
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
            : { ...l, updatedAt: Date.now(), items: l.items.map((item) => (item.id === itemId ? { ...item, rating } : item)) }
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
            : { ...l, updatedAt: Date.now(), items: l.items.filter((item) => item.id !== itemId) }
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

  // ── Standalone items ───────────────────────────────────────────────────────

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
      persist({ ...data, lists: data.lists.map((l) => (l.id === listId ? { ...l, title: t } : l)) });
    },
    [data, persist]
  );

  const setListDescription = useCallback(
    (listId: string, description: string) => {
      persist({ ...data, lists: data.lists.map((l) => (l.id === listId ? { ...l, description } : l)) });
    },
    [data, persist]
  );

  const setListNote = useCallback(
    (listId: string, note: string) => {
      persist({ ...data, lists: data.lists.map((l) => (l.id === listId ? { ...l, note } : l)) });
    },
    [data, persist]
  );

  const setIntroNote = useCallback(
    (listId: string, introNote: string) => {
      persist({ ...data, lists: data.lists.map((l) => (l.id === listId ? { ...l, introNote } : l)) });
    },
    [data, persist]
  );

  const setListBgColor = useCallback(
    (listId: string, hue: number | null) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, bgHue: hue === null ? undefined : hue } : l
        ),
      });
    },
    [data, persist]
  );

  const setListBgLightness = useCallback(
    (listId: string, lightness: number) => {
      persist({ ...data, lists: data.lists.map((l) => (l.id === listId ? { ...l, bgLightness: lightness } : l)) });
    },
    [data, persist]
  );

  const setListCoverPhoto = useCallback(
    (listId: string, dataUrl: string | null) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, coverPhoto: dataUrl ?? undefined } : l
        ),
      });
    },
    [data, persist]
  );

  const applyListPhoto = useCallback(
    (listId: string, dataUrl: string, hue: number, lightness: number) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, coverPhoto: dataUrl, bgHue: hue, bgLightness: lightness } : l
        ),
      });
    },
    [data, persist]
  );

  const removeListPhoto = useCallback(
    (listId: string) => {
      persist({
        ...data,
        lists: data.lists.map((l) =>
          l.id === listId ? { ...l, coverPhoto: undefined, bgHue: undefined, bgLightness: undefined } : l
        ),
      });
    },
    [data, persist]
  );

  const setCategorySortMode = useCallback(
    (categoryId: string, sortMode: SortMode) => {
      persist({ ...data, categories: data.categories.map((c) => (c.id === categoryId ? { ...c, sortMode } : c)) });
    },
    [data, persist]
  );

  const renameCategory = useCallback(
    (categoryId: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      persist({ ...data, categories: data.categories.map((c) => (c.id === categoryId ? { ...c, title: t } : c)) });
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
      persist({ ...data, standaloneItems: data.standaloneItems.map((i) => (i.id === itemId ? { ...i, name: n } : i)) });
    },
    [data, persist]
  );

  const getAllData = useCallback(() => data, [data]);

  const importData = useCallback(
    (incoming: StoredData) => {
      const normalized = normalize(incoming);
      queryClient.setQueryData(USER_DATA_KEY, normalized);
      saveCache(normalized);
      fetch("/api/user-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      }).catch(() => {});
    },
    [queryClient]
  );

  const copyItemsToLists = useCallback(
    (sourceListId: string, targetListIds: string[]) => {
      const source = data.lists.find((l) => l.id === sourceListId);
      if (!source || targetListIds.length === 0) return;
      const now = Date.now();
      const updatedLists = data.lists.map((list) => {
        if (!targetListIds.includes(list.id)) return list;
        const copied = source.items.map((item) => ({
          id: uid(),
          name: item.name,
          rating: item.rating,
        }));
        return { ...list, items: [...list.items, ...copied], updatedAt: now };
      });
      persist({ ...data, lists: updatedLists });
    },
    [data, persist]
  );

  return {
    loading: isLoading,
    lists: topLevelLists,
    categories: data.categories,
    standaloneItems: data.standaloneItems,
    trash: data.trash,
    createList,
    deleteList,
    getList,
    setColorMode,
    setSortMode,
    renameList,
    setListDescription,
    setListNote,
    setIntroNote,
    setListBgColor,
    setListBgLightness,
    setListCoverPhoto,
    applyListPhoto,
    removeListPhoto,
    createCategory,
    deleteCategory,
    restoreFromTrash,
    getCategory,
    getListsForCategory,
    createListInCategory,
    renameCategory,
    setCategorySortMode,
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
    getAllData,
    importData,
    copyItemsToLists,
    allLists: data.lists,
  };
}
