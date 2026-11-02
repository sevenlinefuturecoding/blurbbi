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
import { PwaInstallBanner } from "@/components/blurbi/pwa-install-banner";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo, compactCount, type FeedDrop } from "@/lib/blurbi";
import { recordFeedTelemetry } from "@/lib/intelligence";

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
  const start = performance.now();
  try {
    const { data, error } = await supabase.rpc(name as never, args as never);
    const latency = Math.round(performance.now() - start);
    if (error) {
      console.warn(`[Feed] RPC ${name} error:`, error.message);
      return [];
    }
    const rows = (data ?? []) as unknown as FeedRow[];
    recordFeedTelemetry(name, latency, rows.length);
    return rows;
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
    refetchInterval: 30000,
  });
  const everyone = useQuery({
    queryKey: ["drops", "everyone"],
    queryFn: () => callFeed("feed_global", { p_limit: 30 }),
    refetchInterval: 20000,
  });
  const forYou = useQuery({
    queryKey: ["drops", "for-you", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("feed_for_you", { p_viewer: me!.id, p_limit: 30 }),
    refetchInterval: 25000,
  });
  const recs = useQuery({
    queryKey: ["drops", "recs", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("recommend_drops", { p_viewer: me!.id, p_limit: 10 }),
    refetchInterval: 45000,
  });
  const orbit = useQuery({
    queryKey: ["drops", "orbit", me?.id],
    enabled: !!me,
    queryFn: () => callFeed("feed_orbit", { p_viewer: me!.id, p_limit: 30 }),
    refetchInterval: 25000,
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
      <div className="space-y-3.5 sm:space-y-4">
        {/* Stream Header */}
        <div className="flex items-baseline justify-between px-1">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Stream
            </h1>
            {!me && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Public stream of short drops from the orbit.
              </p>
            )}
          </div>
        </div>

        {/* Blurbing Now compact carousel */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary fill-primary/20" />
            <span>Blurbing Now</span>
          </div>

          {viral.isLoading ? (
            <div className="flex gap-2 overflow-hidden px-0.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 w-48 shrink-0 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : (viral.data?.length ?? 0) === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">
              Nothing viral right now — be the spark! ✨
            </p>
          ) : (
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-0.5 pb-1 overscroll-x-contain">
              {viral.data!.map((d) => (
                <Link
                  key={d.drop_id}
                  to="/drop/$id"
                  params={{ id: d.drop_id }}
                  className="w-48 sm:w-56 shrink-0 rounded-2xl border border-border/70 bg-card/70 p-2.5 sm:p-3 text-left shadow-xs transition-all duration-150 hover:bg-card hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <BlurbiAvatar emoji={d.avatar_emoji} color={d.avatar_color} size="sm" />
                    <span className="truncate text-xs font-semibold text-foreground">
                      @{d.username}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(d.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/85">
                    {d.content}
                  </p>
                  {d.spark_count > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary">
                      <Flame className="h-3 w-3 fill-current" />
                      <span>{compactCount(d.spark_count)}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* PWA Install Banner */}
        <PwaInstallBanner className="my-1" />

        {/* Drop Composer / Guest Prompt */}
        {me ? (
          <Composer userId={me.id} onPosted={() => everyone.refetch()} />
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-3 sm:p-3.5 text-xs text-muted-foreground shadow-xs transition-all hover:bg-card hover:border-primary/40"
          >
            <span>What's dropping? Join the stream…</span>
            <span className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs">
              Sign in
            </span>
          </Link>
        )}

        {/* Feed Selector */}
        {me ? (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "everyone" | "foryou" | "orbit")}
            className="w-full"
          >
            <TabsList className="grid h-9 w-full grid-cols-3 rounded-full bg-secondary/50 p-1 border border-border/40">
              <TabsTrigger
                value="everyone"
                className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Everyone
              </TabsTrigger>
              <TabsTrigger
                value="foryou"
                className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                For You
              </TabsTrigger>
              <TabsTrigger
                value="orbit"
                className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Orbit
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Everyone
            </span>
            <span className="text-[11px] text-muted-foreground">Public Stream</span>
          </div>
        )}

        {/* Feed Stream Content */}
        {active.isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        ) : merged.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card/60 p-8 text-center text-sm text-muted-foreground shadow-xs">
            {tab === "orbit" ? (
              <>
                Your Orbit is quiet. Find people in <b className="text-foreground">Everyone</b> or{" "}
                <Link to="/search" className="text-primary font-medium hover:underline">
                  Search & Explore
                </Link>{" "}
                and start orbiting 🛰️
              </>
            ) : tab === "foryou" ? (
              <>Nothing here yet. Post a Drop and get things going 🌊</>
            ) : me ? (
              <>No Drops yet. Post the first one — the Stream is waiting 🌊</>
            ) : (
              <>
                No Drops yet.{" "}
                <Link to="/auth" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>{" "}
                and post the first one — the Stream is waiting 🌊
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {merged.map((d, i) => (
              <DropCard
                key={`${d.drop_id}-${i}`}
                drop={d}
                viewerId={me?.id}
                engagement={engagement}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
