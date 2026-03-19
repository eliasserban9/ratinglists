import { useState, useEffect, useRef } from "react";

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
  const [rating, setRating] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep("pick");
      setTitle("");
      setRating(5);
    }
  }, [open]);

  useEffect(() => {
    if (step === "name") setTimeout(() => inputRef.current?.focus(), 50);
  }, [step]);

  function pickType(t: CreateType) {
    setType(t);
    setStep("name");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(type, title.trim(), type === "item" ? rating : undefined);
    onClose();
  }

  if (!open) return null;

  const meta = TYPE_META[type];

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
                ref={inputRef}
                type="text"
                placeholder={meta.placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
                maxLength={60}
              />

              {type === "item" && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0">Rating</span>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                        style={
                          rating === n
                            ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
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
                  disabled={!title.trim()}
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
