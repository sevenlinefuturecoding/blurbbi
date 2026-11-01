import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Hash, MessageSquarePlus, Share2 } from "lucide-react";
import { AppShell } from "@/components/blurbi/app-shell";
import { DropCard } from "@/components/blurbi/drop-card";
import { Composer } from "@/components/blurbi/composer";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { supabase } from "@/integrations/supabase/client";
import { compactCount, type FeedDrop } from "@/lib/blurbi";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/t/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} · Blurbbi` },
      {
        name: "description",
        content: `Explore drops and discussions about #${params.tag} on Blurbbi.`,
      },
      { property: "og:title", content: `#${params.tag} · Blurbbi` },
      {
        property: "og:description",
        content: `Explore drops and discussions about #${params.tag} on Blurbbi.`,
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TopicStreamPage,
});

async function fetchTopicDrops(tag: string): Promise<FeedDrop[]> {
  const clean = tag.trim().toLowerCase();
  if (!clean) return [];

  try {
    // 1. Try search_drops RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_drops" as never,
      {
        p_query: `#${clean}`,
        p_limit: 40,
      } as never,
    );

    const rows = rpcData as unknown as FeedDrop[];
    if (!rpcError && Array.isArray(rows) && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.warn("search_drops RPC fallback:", err);
  }

  // 2. Direct table fallback with ilike
  try {
    const { data: drops, error: dropsError } = await supabase
      .from("drops")
      .select("id, content, user_id, spark_count, echo_count, relay_count, pass_count, created_at")
      .ilike("content", `%#${clean}%`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (dropsError || !drops || drops.length === 0) return [];

    const userIds = [...new Set(drops.map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_emoji, avatar_color")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return drops.map((d) => {
      const p = profileMap.get(d.user_id);
      return {
        drop_id: d.id,
        content: d.content,
        author_id: d.user_id,
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? p?.username ?? "Anonymous",
        avatar_emoji: p?.avatar_emoji ?? "✨",
        avatar_color: p?.avatar_color ?? "coral",
        spark_count: d.spark_count ?? 0,
        echo_count: d.echo_count ?? 0,
        relay_count: d.relay_count ?? 0,
        pass_count: d.pass_count ?? 0,
        created_at: d.created_at,
        score: null,
      };
    });
  } catch {
    return [];
  }
}

function TopicStreamPage() {
  const { tag } = Route.useParams();
  const cleanTag = tag.toLowerCase();
  const navigate = useNavigate();
  const { data: me } = useMyProfile();
  const [showComposer, setShowComposer] = useState(false);

  const topicDrops = useQuery({
    queryKey: ["topic-drops", cleanTag],
    queryFn: () => fetchTopicDrops(cleanTag),
    staleTime: 1000 * 30, // 30s
    refetchInterval: 15000,
  });

  const engagement = useEngagement(
    (topicDrops.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `#${cleanTag} on Blurbbi`,
          text: `Check out drops about #${cleanTag} on Blurbbi:`,
          url: window.location.href,
        })
        .catch(() => {
          /* ignore */
        });
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Topic link copied to clipboard 📋");
    }
  }

  const dropsList = topicDrops.data ?? [];

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-5">
        {/* Topic Header */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate({ to: "/search" })}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
                aria-label="Back to Search"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-5 w-5 text-primary shrink-0" />
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {cleanTag}
                  </h1>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {topicDrops.isLoading
                    ? "Loading stream…"
                    : `${compactCount(dropsList.length)} ${dropsList.length === 1 ? "Drop" : "Drops"} in this topic`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="h-8.5 rounded-full px-3 text-xs gap-1.5"
                aria-label="Share Topic"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              {me && (
                <Button
                  size="sm"
                  onClick={() => setShowComposer(!showComposer)}
                  className="h-8.5 rounded-full px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  <span>Drop #{cleanTag}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Collapsible Quick Topic Composer */}
          {showComposer && me && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <Composer
                userId={me.id}
                initialContent={`#${cleanTag} `}
                placeholder={`What's happening in #${cleanTag}?`}
                onPosted={() => {
                  setShowComposer(false);
                  topicDrops.refetch();
                }}
              />
            </div>
          )}
        </div>

        {/* Drops Feed */}
        {topicDrops.isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : dropsList.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
              <Hash className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground text-base">
              No Drops for #{cleanTag} yet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Start the discussion! Drop your thoughts using #{cleanTag} so other blurbers can
              discover it.
            </p>
            {me ? (
              <Button
                onClick={() => setShowComposer(true)}
                className="mt-4 rounded-full px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Be the first to drop #{cleanTag}
              </Button>
            ) : (
              <Link
                to="/auth"
                className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                Sign in to drop #{cleanTag}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {dropsList.map((drop) => (
              <DropCard key={drop.drop_id} drop={drop} viewerId={me?.id} engagement={engagement} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
