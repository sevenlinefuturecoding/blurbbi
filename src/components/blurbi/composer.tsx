import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmojiPickerPopover } from "./emoji-picker";
import { MAX_DROP_LENGTH } from "@/lib/blurbi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Compose a Drop: 500 characters, text + emoji only, with a live counter. */
export function Composer({
  userId,
  placeholder = "What's dropping?…",
  autoFocus = false,
  onPosted,
  compact = false,
}: {
  userId: string;
  placeholder?: string;
  autoFocus?: boolean;
  onPosted?: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MAX_DROP_LENGTH - text.length;
  const canPost = text.trim().length > 0 && remaining >= 0 && !busy;

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    if (next.length > MAX_DROP_LENGTH) return;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function post() {
    if (!canPost) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("drops")
        .insert({ user_id: userId, content: text.trim() });
      if (error) {
        toast.error(
          error.message.includes("drops_length")
            ? "Keep it 500 characters or fewer."
            : error.message,
        );
        return;
      }
      setText("");
      toast.success("Drop released into the Stream 🌊");
      onPosted?.();
    } finally {
      setBusy(false);
    }
  }

  const counterColor =
    remaining < 0 ? "text-destructive" : remaining <= 20 ? "text-primary" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-4 shadow-sm transition-colors focus-within:border-ring",
        compact && "p-3",
      )}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_DROP_LENGTH + 50))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        className="w-full min-h-[72px] resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        maxLength={MAX_DROP_LENGTH}
      />
      <div className="mt-2 flex items-center justify-between">
        <EmojiPickerPopover onPick={insertEmoji} />
        <div className="flex items-center gap-3">
          <span className={cn("text-xs tabular-nums", counterColor)}>
            {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
          </span>
          <Button size="sm" className="rounded-full px-5" disabled={!canPost} onClick={post}>
            {busy ? "Dropping…" : "Drop it"}
          </Button>
        </div>
      </div>
    </div>
  );
}
