import { useState, useEffect, useRef } from "react";
import { ratingToColor } from "@/lib/ratingColor";
import { fmt } from "@/components/ItemRow";

type CreateType = "list" | "category" | "item";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (type: CreateType, title: string, rating?: number) => void;
}

const TYPE_META: Record<CreateType, { icon: string; label: string; placeholder: string; description: string }> = {
  list: {
    icon: "📋",
    label: "List",
    placeholder: "e.g. Favourite Movies",
    description: "A list of items you can rate 1–10.",
  },
  category: {
    icon: "📁",
    label: "Category",
    placeholder: "e.g. Albums",
    description: "A folder that holds multiple lists.",
  },
  item: {
    icon: "⭐",
    label: "Item",
    placeholder: "e.g. The Dark Knight",
    description: "A single rated item on the home screen.",
  },
};

export function CreateTypeDialog({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState<"pick" | "name">("pick");
  const [type, setType] = useState<CreateType>("list");
  const [title, setTitle] = useState("");
  const [ratingStr, setRatingStr] = useState("5");
  const titleRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);

  const parsedRating = (() => {
    const n = parseFloat(ratingStr);
    return !isNaN(n) && n >= 0 && n <= 10 ? Math.round(n * 10) / 10 : null;
  })();

  useEffect(() => {
    if (open) {
      setStep("pick");
      setTitle("");
      setRatingStr("5");
    }
  }, [open]);

  useEffect(() => {
    if (step === "name") setTimeout(() => titleRef.current?.focus(), 50);
  }, [step]);

  function pickType(t: CreateType) {
    setType(t);
    setStep("name");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const finalRating = parsedRating ?? 5;
    onCreate(type, title.trim(), type === "item" ? finalRating : undefined);
    onClose();
  }

  if (!open) return null;

  const meta = TYPE_META[type];
  const ratingColor = parsedRating !== null ? ratingToColor(parsedRating) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "pick" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-1">Create New</h2>
            <p className="text-xs text-muted-foreground mb-5">What would you like to add?</p>
            <div className="flex flex-col gap-3">
              {(["list", "category", "item"] as CreateType[]).map((t) => {
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => pickType(t)}
                    className="flex items-center gap-4 w-full text-left bg-muted hover:bg-muted/80 border border-border rounded-2xl px-4 py-4 transition-colors active:scale-[.98]"
                  >
                    <span className="text-3xl">{m.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{m.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                    </div>
                    <span className="ml-auto text-muted-foreground text-lg">›</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("pick")}
              className="flex items-center gap-1 text-primary text-sm mb-4 hover:opacity-70 transition-opacity"
            >
              <span className="text-lg leading-none">‹</span>
              <span>Back</span>
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {meta.icon} New {meta.label}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{meta.description}</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                ref={titleRef}
                type="text"
                placeholder={meta.placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
                maxLength={60}
              />

              {type === "item" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating (0 – 10, decimals ok)</span>
                    {parsedRating !== null && (
                      <span
                        className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                        style={{ backgroundColor: ratingColor, color: "#fff" }}
                      >
                        {fmt(parsedRating)}/10
                      </span>
                    )}
                  </div>
                  <input
                    ref={ratingRef}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step={0.1}
                    value={ratingStr}
                    onChange={(e) => setRatingStr(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
                    style={
                      parsedRating !== null
                        ? { borderColor: ratingColor, boxShadow: `0 0 0 1px ${ratingColor}22` }
                        : undefined
                    }
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || (type === "item" && parsedRating === null)}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Create
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
