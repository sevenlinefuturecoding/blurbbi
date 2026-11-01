import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmojiPickerPopover } from "./emoji-picker";
import { MAX_DROP_LENGTH } from "@/lib/blurbi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Modern, compact, expanding Drop Composer.
 * Default idle state: minimal single-line footprint.
 * Expanded state: expands when focused or content is typed.
 */
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
  const [isFocused, setIsFocused] = useState(autoFocus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MAX_DROP_LENGTH - text.length;
  const canPost = text.trim().length > 0 && remaining >= 0 && !busy;
  const isExpanded = isFocused || text.length > 0 || autoFocus;

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
      setIsFocused(false);
      toast.success("Drop released into the Stream 🌊");
      onPosted?.();
    } finally {
      setBusy(false);
    }
  }

  const counterColor =
    remaining < 0
      ? "text-destructive font-semibold"
      : remaining <= 20
        ? "text-primary font-medium"
        : "text-muted-foreground";

  return (
    <div
      onClick={() => {
        if (!isFocused) textareaRef.current?.focus();
      }}
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 p-3 shadow-xs transition-all duration-200 cursor-text",
        "hover:border-border hover:bg-card focus-within:border-primary/50 focus-within:bg-card focus-within:shadow-sm",
        compact && "p-2.5",
      )}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (text.length === 0) setIsFocused(false);
        }}
        onChange={(e) => setText(e.target.value.slice(0, MAX_DROP_LENGTH + 50))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={isExpanded ? (compact ? 2 : 3) : 1}
        className={cn(
          "w-full resize-none bg-transparent text-base sm:text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground transition-all duration-200",
          isExpanded ? "min-h-[72px]" : "min-h-[38px] pt-1",
        )}
        maxLength={MAX_DROP_LENGTH}
      />

      {/* Action footer */}
      <div
        className={cn(
          "flex items-center justify-between transition-all duration-200",
          isExpanded ? "mt-2 pt-2 border-t border-border/40" : "mt-1",
        )}
      >
        <div className="flex items-center gap-1.5">
          <EmojiPickerPopover onPick={insertEmoji} />
          {isExpanded && (
            <span className="text-[11px] text-muted-foreground/80 hidden sm:inline select-none">
              Text & emoji only
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isExpanded && (
            <span className={cn("text-xs tabular-nums select-none", counterColor)}>
              {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining}`}
            </span>
          )}

          <Button
            size="sm"
            className="rounded-full px-4 text-xs font-semibold shadow-xs transition-all active:scale-95"
            disabled={!canPost}
            onClick={(e) => {
              e.stopPropagation();
              post();
            }}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Dropping…
              </>
            ) : (
              "Drop it"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
