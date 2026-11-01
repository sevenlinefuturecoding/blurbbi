import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Users,
  Sparkles,
  Flame,
  UserCheck,
  Clock,
  RotateCw,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/blurbi/app-shell";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurberCard } from "@/components/blurbi/blurber-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { useSearchDrops, useSearchProfiles, useSuggestedProfiles } from "@/hooks/use-search";
import { supabase } from "@/integrations/supabase/client";
import type { FeedDrop } from "@/lib/blurbi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string; tab?: "drops" | "blurbers" } => {
    const qVal = search["q"];
    const tabVal = search["tab"];
    return {
      q: typeof qVal === "string" ? qVal : "",
      tab: tabVal === "blurbers" ? "blurbers" : "drops",
    };
  },
  head: () => ({
    meta: [
      { title: "Search & Explore · Blurbbi" },
      {
        name: "description",
        content: "Search drops, discussions, and blurbers to orbit on Blurbbi.",
      },
      { property: "og:title", content: "Search & Explore · Blurbbi" },
      {
        property: "og:description",
        content: "Search drops, discussions, and blurbers to orbit on Blurbbi.",
      },
    ],
  }),
  component: SearchPage,
});

// Recent searches local storage helpers
const RECENT_KEY = "blurbbi_recent_searches";
const MAX_RECENTS = 6;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const item = localStorage.getItem(RECENT_KEY);
    if (!item) return [];
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function persistRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (!clean || typeof window === "undefined") return [];
  try {
    const prev = loadRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...prev].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function deleteRecentSearch(term: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const prev = loadRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(RECENT_KEY, JSON.stringify(prev));
    return prev;
  } catch {
    return [];
  }
}

function clearAllRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

// Explore topic suggestions
const DISCOVERY_TOPICS = [
  { tag: "tech", label: "Tech", icon: "💻" },
  { tag: "ai", label: "AI", icon: "🤖" },
  { tag: "design", label: "Design", icon: "🎨" },
  { tag: "build", label: "Build", icon: "🔨" },
  { tag: "launch", label: "Launch", icon: "🚀" },
  { tag: "coffee", label: "Coffee", icon: "☕" },
  { tag: "crypto", label: "Crypto", icon: "🪙" },
  { tag: "ideas", label: "Ideas", icon: "💡" },
  { tag: "life", label: "Daily", icon: "✨" },
];

async function fetchTrendingDrops(): Promise<FeedDrop[]> {
  try {
    const { data, error } = await supabase.rpc("viral_now" as never, { p_limit: 8 } as never);
    const rows = data as unknown as FeedDrop[];
    if (!error && Array.isArray(rows) && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.warn("viral_now RPC fallback:", err);
  }

  // Fallback: fetch drops ordered by spark count
  try {
    const { data: drops, error } = await supabase
      .from("drops")
      .select("id, content, user_id, spark_count, echo_count, relay_count, pass_count, created_at")
      .order("spark_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (error || !drops || drops.length === 0) return [];

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

function SearchPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { data: me } = useMyProfile();

  const [inputVal, setInputVal] = useState(searchParams.q || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const activeTab = searchParams.tab || "drops";
  const query = (searchParams.q || "").trim();

  // Load recents on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // Keep local input in sync if URL query changes
  useEffect(() => {
    setInputVal(searchParams.q || "");
  }, [searchParams.q]);

  // Debounced URL updates when typing
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputVal !== (searchParams.q || "")) {
        const clean = inputVal.trim();
        if (clean.length > 0) {
          const updated = persistRecentSearch(clean);
          setRecentSearches(updated);
        }
        navigate({
          to: "/search",
          search: {
            q: inputVal,
            tab: activeTab,
          },
          replace: true,
        });
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [inputVal, activeTab, navigate, searchParams.q]);

  function handleTabChange(tab: "drops" | "blurbers") {
    navigate({
      to: "/search",
      search: {
        q: inputVal,
        tab,
      },
      replace: true,
    });
  }

  function handleClear() {
    setInputVal("");
    navigate({
      to: "/search",
      search: {
        q: "",
        tab: activeTab,
      },
      replace: true,
    });
  }

  function handleSearchTerm(term: string) {
    setInputVal(term);
    const updated = persistRecentSearch(term);
    setRecentSearches(updated);
    navigate({
      to: "/search",
      search: {
        q: term,
        tab: "drops",
      },
      replace: true,
    });
  }

  // Search Queries
  const dropsQuery = useSearchDrops(query);
  const profilesQuery = useSearchProfiles(query);
  const suggestedQuery = useSuggestedProfiles(me?.id);

  // Trending Drops Query for Explore section
  const trendingDropsQuery = useQuery({
    queryKey: ["search", "trending-drops"],
    queryFn: fetchTrendingDrops,
    staleTime: 1000 * 60 * 3, // 3 mins
  });

  // Engagement state for drops in search results
  const searchDropsEngagement = useEngagement(
    (dropsQuery.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  // Engagement state for trending drops
  const trendingEngagement = useEngagement(
    (trendingDropsQuery.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  const hasQuery = query.length > 0;

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-5">
        {/* Page Header */}
        <div className="px-0.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Search & Explore
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Find blurbers, active discussions, or explore trending drops.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputVal.trim()) {
                const updated = persistRecentSearch(inputVal.trim());
                setRecentSearches(updated);
              }
            }}
            placeholder="Search drops, @username, or keywords…"
            className="h-11 sm:h-12 w-full rounded-full border border-border/80 bg-card pl-10 pr-10 text-base sm:text-sm text-foreground shadow-2xs transition-colors outline-none placeholder:text-muted-foreground placeholder:truncate focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            autoFocus={!hasQuery}
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab switcher when querying */}
        {hasQuery && (
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as "drops" | "blurbers")}>
            <TabsList className="grid h-9.5 w-full grid-cols-2 rounded-full bg-secondary/60 p-1">
              <TabsTrigger value="drops" className="rounded-full text-xs font-semibold">
                Drops
                {dropsQuery.data && dropsQuery.data.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-background/80 px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                    {dropsQuery.data.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="blurbers" className="rounded-full text-xs font-semibold">
                Blurbers
                {profilesQuery.data && profilesQuery.data.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-background/80 px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                    {profilesQuery.data.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Search Results Area */}
        {hasQuery ? (
          activeTab === "drops" ? (
            /* DROPS RESULTS */
            <div className="space-y-3">
              {dropsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
                  ))}
                </div>
              ) : (dropsQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-10 text-center shadow-xs">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">
                    No Drops found for "{query}"
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Try searching for different keywords, topics, or switch to the{" "}
                    <button
                      onClick={() => handleTabChange("blurbers")}
                      className="font-medium text-primary hover:underline"
                    >
                      Blurbers tab
                    </button>{" "}
                    to find users.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dropsQuery.data!.map((drop) => (
                    <DropCard
                      key={drop.drop_id}
                      drop={drop}
                      viewerId={me?.id}
                      engagement={searchDropsEngagement}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* BLURBERS RESULTS */
            <div className="space-y-2.5">
              {profilesQuery.isLoading ? (
                <div className="space-y-2.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/60" />
                  ))}
                </div>
              ) : (profilesQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-10 text-center shadow-xs">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">
                    No blurbers match "{query}"
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Check the username spelling or try searching for a display name.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profilesQuery.data!.map((blurber) => (
                    <BlurberCard
                      key={blurber.id}
                      blurber={blurber}
                      viewerId={me?.id}
                      isOrbited={searchDropsEngagement?.orbited.has(blurber.id) ?? false}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          /* DEFAULT EXPLORE AREA (WHEN NO QUERY IS TYPED) */
          <div className="space-y-5">
            {/* Recent Searches (if available) */}
            {recentSearches.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Recent Searches
                  </div>
                  <button
                    onClick={() => {
                      clearAllRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {recentSearches.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50"
                    >
                      <button
                        type="button"
                        onClick={() => handleSearchTerm(term)}
                        className="truncate max-w-[140px] text-left hover:text-primary transition-colors"
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = deleteRecentSearch(term);
                          setRecentSearches(updated);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        aria-label={`Remove ${term}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Explore Topics / Ideas */}
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 text-primary" />
                Explore Topics
              </div>
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
                {DISCOVERY_TOPICS.map((topic) => (
                  <button
                    key={topic.tag}
                    onClick={() => handleSearchTerm(topic.tag)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/90 shadow-2xs transition-all hover:border-primary/50 hover:bg-card/90 active:scale-95"
                  >
                    <span>{topic.icon}</span>
                    <span>{topic.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Suggested Blurbers to Orbit */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Suggested Blurbers to Orbit
                </div>
                <button
                  type="button"
                  onClick={() => suggestedQuery.refetch()}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCw
                    className={cn(
                      "h-3 w-3",
                      suggestedQuery.isFetching && "animate-spin text-primary",
                    )}
                  />
                  Refresh
                </button>
              </div>

              {suggestedQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-18 animate-pulse rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : (suggestedQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-5 text-center text-xs text-muted-foreground shadow-2xs">
                  <UserCheck className="mx-auto h-7 w-7 text-muted-foreground/50 mb-1.5" />
                  You're orbiting active blurbers! Check back soon for new recommendations.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestedQuery.data!.slice(0, 5).map((blurber) => (
                    <BlurberCard
                      key={blurber.id}
                      blurber={blurber}
                      viewerId={me?.id}
                      isOrbited={false}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Trending / Discovery Drops */}
            <section className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Trending Drops
                </div>
                <span className="text-xs text-muted-foreground">Popular discussions</span>
              </div>

              {trendingDropsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : (trendingDropsQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-6 text-center text-xs text-muted-foreground shadow-2xs">
                  No trending drops right now. Be the first to spark a conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {trendingDropsQuery.data!.map((drop) => (
                    <DropCard
                      key={drop.drop_id}
                      drop={drop}
                      viewerId={me?.id}
                      engagement={trendingEngagement}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
