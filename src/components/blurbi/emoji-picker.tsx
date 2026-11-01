import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { EMOJI_CATEGORIES } from "./emoji-data";
import { cn } from "@/lib/utils";

/** Plain grid of emojis with category chips (no positioning logic). */
export function EmojiPickerGrid({
  value,
  onChange,
}: {
  value?: string;
  onChange: (emoji: string) => void;
}) {
  const [category, setCategory] = useState(0);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setCategory(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto sm:grid-cols-10">
        {(EMOJI_CATEGORIES[category]?.emojis ?? []).map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onClick={() => onChange(e)}
            className={cn(
              "rounded-lg p-1 text-lg transition-colors hover:bg-accent",
              value === e && "bg-accent",
            )}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Popover picker that inserts an emoji at the caret of a textarea. */
export function EmojiPickerPopover({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Pick an emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-2">
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {EMOJI_CATEGORIES.map((c) => (
            <div key={c.name}>
              <p className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">{c.name}</p>
              <div className="grid grid-cols-9 gap-0.5">
                {c.emojis.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    type="button"
                    onClick={() => {
                      onPick(e);
                      setOpen(false);
                    }}
                    className="rounded-lg p-1 text-lg transition-colors hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
