import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { AppShell } from "@/components/blurbi/app-shell";
import { Composer } from "@/components/blurbi/composer";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo, type FeedDrop } from "@/lib/blurbi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blurbbi — say it in a Drop" },
      {
        name: "description",
        content:
          "The public Stream: every Drop from every blurber. Browse without an account, or sign in to Spark, Echo, Relay, and Orbit.",
      },
      { property: "og:title", content: "Blurbbi — say it in a Drop" },
      {
        property: "og:description",
        content: "A minimal social platform for short text and emoji posts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type FeedRow = FeedDrop;

async function callFeed(name: string, args: Record<string, unknown>): Promise<FeedRow[]> {
  try {
    const { data, error } = await supabase.rpc(name as never, args as never);
    if (error) {
      console.warn(`[Feed] RPC ${name} error:`, error.message);
      return [];
    }
    return (data ?? []) as unknown as FeedRow[];
  } catch (err) {
    console.warn(`[Feed] RPC ${name} exception:`, err);
    return [];
  }
}

function Home() {
  const { data: me } = useMyProfile();
  const [tab, setTab] = useState<"everyone" | "foryou" | "orbit">("everyone");

  const viral = useQuery({
    queryKey: ["drops", "viral"],
    queryFn: () => callFeed("viral_now", { p_limit: 5 }),
  });
  const everyone = useQuery({
    queryKey: ["drops", "everyone"],
    queryFn: () => callFeed("feed_global", { p_limit: 30 }),
  });
  const forYou = useQuery({
    queryKey: ["drops", "for-you", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("feed_for_you", { p_viewer: me!.id, p_limit: 30 }),
  });
  const recs = useQuery({
    queryKey: ["drops", "recs", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("recommend_drops", { p_viewer: me!.id, p_limit: 10 }),
  });
  const orbit = useQuery({
    queryKey: ["drops", "orbit", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("feed_orbit", { p_viewer: me!.id, p_limit: 30 }),
  });

  const active = tab === "everyone" ? everyone : tab === "foryou" ? forYou : orbit;

  const merged = useMemo(() => {
    const base = active.data ?? [];
    const recList = tab === "foryou" ? (recs.data ?? []) : [];
    const seen = new Set<string>();
    const out: FeedRow[] = [];
    let r = 0;
    for (let i = 0; i < base.length; i++) {
      const item = base[i];
      if (!item) continue;
      out.push(item);
      seen.add(item.drop_id);
      // mix in one recommendation after every 2nd heat-ranked drop
      if (tab === "foryou" && (i + 1) % 2 === 0 && r < recList.length) {
        while (r < recList.length && seen.has(recList[r]!.drop_id)) r++;
        if (r < recList.length) {
          const rec = recList[r]!;
          out.push(rec);
          seen.add(rec.drop_id);
          r++;
        }
      }
    }
    return out;
  }, [active.data, recs.data, tab]);

  const engagement = useEngagement(
    merged.map((d) => d.drop_id),
    me?.id,
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="px-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Stream</h1>
          {!me && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every Drop from every blurber — browse freely, sign in to interact.
            </p>
          )}
        </div>

        {/* Blurbing Now strip */}
        <section>
          <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
            <Flame className="h-4 w-4 text-primary" />
            Blurbing Now
          </div>
          {viral.isLoading ? (
            <div className="flex gap-2 overflow-hidden px-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 w-44 shrink-0 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (viral.data?.length ?? 0) === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              Nothing viral yet — be the spark! ✨
            </p>
          ) : (
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-1 pb-1">
              {viral.data!.map((d) => (
                <Link
                  key={d.drop_id}
                  to="/drop/$id"
                  params={{ id: d.drop_id }}
                  className="w-40 shrink-0 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-ring/50 sm:w-48"
                >
                  <div className="flex items-center gap-2">
                    <BlurbiAvatar emoji={d.avatar_emoji} color={d.avatar_color} size="sm" />
                    <span className="truncate text-xs font-medium">@{d.username}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {timeAgo(d.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug">{d.content}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {me ? (
          <Composer userId={me.id} onPosted={() => everyone.refetch()} />
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm transition-colors hover:border-ring/50"
          >
            <span>Say something in a Drop…</span>
            <span className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Sign in to post
            </span>
          </Link>
        )}

        {me ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "everyone" | "foryou" | "orbit")}>
            <TabsList className="grid h-10 w-full grid-cols-3 rounded-full">
              <TabsTrigger value="everyone" className="rounded-full">
                Everyone
              </TabsTrigger>
              <TabsTrigger value="foryou" className="rounded-full">
                For You
              </TabsTrigger>
              <TabsTrigger value="orbit" className="rounded-full">
                Orbit
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <p className="px-1 text-sm font-semibold text-muted-foreground">Everyone</p>
        )}

        {active.isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : merged.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {tab === "orbit" ? (
              <>
                Your Orbit is quiet. Find people in <b className="text-foreground">Everyone</b> and
                start orbiting 🛰️
              </>
            ) : tab === "foryou" ? (
              <>Nothing here yet. Post a Drop and get things going 🌊</>
            ) : me ? (
              <>No Drops yet. Post the first one — the Stream is waiting 🌊</>
            ) : (
              <>
                No Drops yet.{" "}
                <Link to="/auth" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>{" "}
                and post the first one — the Stream is waiting 🌊
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {merged.map((d, i) => (
              <DropCard
                key={`${d.drop_id}-${i}`}
                drop={d}
                viewerId={me?.id}
                engagement={engagement}
                className={i > 0 ? "" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
