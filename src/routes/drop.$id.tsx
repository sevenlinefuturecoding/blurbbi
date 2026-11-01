import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { EmojiPickerPopover } from "@/components/blurbi/emoji-picker";
import { Button } from "@/components/ui/button";
import { MAX_DROP_LENGTH, type FeedDrop, type Profile } from "@/lib/blurbi";
import { timeAgo } from "@/lib/blurbi";
import { toast } from "sonner";

export const Route = createFileRoute("/drop/$id")({
  head: () => ({
    meta: [
      { title: "Drop · Blurbi" },
      { name: "description", content: "A Drop and its Echoes on Blurbi." },
      { property: "og:title", content: "Drop · Blurbi" },
      { property: "og:description", content: "A Drop and its Echoes on Blurbi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DropDetail,
});

type EchoRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: Pick<Profile, "username" | "display_name" | "avatar_emoji" | "avatar_color">;
};

function DropDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [echoText, setEchoText] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const drop = useQuery({
    queryKey: ["drop", id, me?.id],
    enabled: true,
    queryFn: async (): Promise<FeedDrop | null> => {
      try {
        const { data, error } = await supabase.rpc(
          "get_drop",
          me?.id ? { p_drop: id, p_viewer: me.id } : { p_drop: id },
        );
        if (error) {
          console.warn("Get drop error:", error.message);
          return null;
        }
        const rows = (data ?? []) as unknown as FeedDrop[];
        return rows[0] ?? null;
      } catch (err) {
        console.warn("Get drop exception:", err);
        return null;
      }
    },
  });

  const echoes = useQuery({
    queryKey: ["echoes", id],
    enabled: true,
    queryFn: async (): Promise<EchoRow[]> => {
      try {
        const { data, error } = await supabase
          .from("echoes")
          .select(
            "id, content, created_at, user_id, profile:profiles(username, display_name, avatar_emoji, avatar_color)",
          )
          .eq("drop_id", id)
          .order("created_at");
        if (error) {
          console.warn("Echoes query error:", error.message);
          return [];
        }
        return (data ?? []) as unknown as EchoRow[];
      } catch (err) {
        console.warn("Echoes query exception:", err);
        return [];
      }
    },
  });

  const engagement = useEngagement(id ? [id] : [], me?.id);

  async function postEcho() {
    if (!me || !echoText.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("echoes")
        .insert({ drop_id: id, user_id: me.id, content: echoText.trim() });
      if (error) {
        toast.error(
          error.message.includes("echoes_length")
            ? "Keep it 500 characters or fewer."
            : error.message,
        );
        return;
      }
      setEchoText("");
      qc.invalidateQueries({ queryKey: ["echoes", id] });
      qc.invalidateQueries({ queryKey: ["drop", id] });
      qc.invalidateQueries({ queryKey: ["drops"] });
      toast.success("Echo sent 🔊");
    } finally {
      setBusy(false);
    }
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? echoText.length;
    const end = el?.selectionEnd ?? echoText.length;
    setEchoText(echoText.slice(0, start) + emoji + echoText.slice(end));
  }

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Stream
      </Link>

      {drop.isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      ) : !drop.data ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          This Drop isn't available — it may have been deleted or hidden.
        </div>
      ) : (
        <DropCard drop={drop.data} viewerId={me?.id} engagement={engagement} />
      )}

      {/* Echo composer */}
      {me && (
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <textarea
            ref={textareaRef}
            value={echoText}
            onChange={(e) => setEchoText(e.target.value.slice(0, MAX_DROP_LENGTH))}
            placeholder="Echo back…"
            rows={2}
            className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center justify-between">
            <EmojiPickerPopover onPick={insertEmoji} />
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-muted-foreground">
                {MAX_DROP_LENGTH - echoText.length} left
              </span>
              <Button
                size="sm"
                className="rounded-full px-5"
                disabled={busy || !echoText.trim()}
                onClick={postEcho}
              >
                Echo
              </Button>
            </div>
          </div>
        </div>
      )}

      <h2 className="px-1 text-sm font-semibold text-muted-foreground">
        {echoes.data?.length ?? 0} Echoes
      </h2>

      {echoes.isLoading ? (
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
      ) : (echoes.data?.length ?? 0) === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No Echoes yet. Say something back 🗨️
        </div>
      ) : (
        <div className="space-y-3">
          {echoes.data!.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-3xl border border-border bg-card p-4"
            >
              <BlurbiAvatar
                emoji={e.profile?.avatar_emoji ?? "👤"}
                color={e.profile?.avatar_color ?? "sky"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="truncate font-semibold">
                    {e.profile?.display_name || e.profile?.username || "Someone"}
                  </span>
                  <span className="truncate text-muted-foreground">@{e.profile?.username}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    · {timeAgo(e.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                  {e.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
