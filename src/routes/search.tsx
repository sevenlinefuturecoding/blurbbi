import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, X, Users, Sparkles, Flame, UserCheck } from "lucide-react";
import { AppShell } from "@/components/blurbi/app-shell";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurberCard } from "@/components/blurbi/blurber-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { useSearchDrops, useSearchProfiles, useSuggestedProfiles } from "@/hooks/use-search";

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

function SearchPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { data: me } = useMyProfile();

  const [inputVal, setInputVal] = useState(searchParams.q || "");
  const activeTab = searchParams.tab || "drops";
  const query = (searchParams.q || "").trim();

  // Keep local input in sync if URL query changes
  useEffect(() => {
    setInputVal(searchParams.q || "");
  }, [searchParams.q]);

  // Debounced URL updates when typing
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputVal !== (searchParams.q || "")) {
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

  // Data fetching
  const dropsQuery = useSearchDrops(query);
  const profilesQuery = useSearchProfiles(query);
  const suggestedQuery = useSuggestedProfiles(me?.id);

  // Engagement state for drops in search results
  const dropsEngagement = useEngagement(
    (dropsQuery.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  const hasQuery = query.length > 0;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Search header & input */}
        <div className="space-y-3">
          <div className="px-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Search & Explore
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Find blurbers, discussions, or topics across the stream.
            </p>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search drops, @username, or keywords…"
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-10 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              autoFocus={!hasQuery}
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher when querying */}
        {hasQuery && (
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as "drops" | "blurbers")}>
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-full bg-secondary/60 p-1">
              <TabsTrigger value="drops" className="rounded-full text-xs font-semibold">
                Drops
                {dropsQuery.data && dropsQuery.data.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                    {dropsQuery.data.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="blurbers" className="rounded-full text-xs font-semibold">
                Blurbers
                {profilesQuery.data && profilesQuery.data.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
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
            <div>
              {dropsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
                  ))}
                </div>
              ) : (dropsQuery.data ?? []).length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">
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
                      engagement={dropsEngagement}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* BLURBERS RESULTS */
            <div>
              {profilesQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-3xl bg-muted/60" />
                  ))}
                </div>
              ) : (profilesQuery.data ?? []).length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">
                    No blurbers match "{query}"
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Check the username spelling or try searching for a display name.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {profilesQuery.data!.map((blurber) => (
                    <BlurberCard
                      key={blurber.id}
                      blurber={blurber}
                      viewerId={me?.id}
                      isOrbited={dropsEngagement?.orbited.has(blurber.id) ?? false}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          /* DEFAULT EXPLORE AREA (WHEN NO QUERY IS TYPED) */
          <div className="space-y-6">
            {/* Suggested users to orbit */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Suggested Blurbers to Orbit
                </div>
                <span className="text-xs text-muted-foreground">Recommended for you</span>
              </div>

              {suggestedQuery.isLoading ? (
                <div className="space-y-2.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-3xl bg-muted/60" />
                  ))}
                </div>
              ) : (suggestedQuery.data ?? []).length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
                  <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  You're orbiting everyone! Check back later for new blurbers.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {suggestedQuery.data!.map((blurber) => (
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

            {/* Quick Explore tags / hints */}
            <section className="rounded-3xl border border-border bg-card/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                <Flame className="h-4 w-4 text-primary" />
                Explore Ideas
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap on any keyword to quickly search drops and discussions:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["tech", "ai", "design", "music", "build", "coffee", "launch", "idea", "life"].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setInputVal(tag);
                        navigate({
                          to: "/search",
                          search: { q: tag, tab: "drops" },
                          replace: true,
                        });
                      }}
                      className="rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary active:scale-95"
                    >
                      #{tag}
                    </button>
                  ),
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
