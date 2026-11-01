import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  MoreHorizontal,
  VolumeX,
  Calendar,
  MapPin,
  Globe,
  ExternalLink,
  Share2,
  BadgeCheck,
  Bell,
  BellRing,
  Pin,
  Repeat2,
  MessageCircle,
  Sparkles,
  ArrowLeft,
  Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { EditProfileDialog } from "@/components/blurbi/edit-profile-dialog";
import { OrbitersDialog } from "@/components/blurbi/orbiters-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleOrbit, muteUser, refreshAfterEngagement } from "@/lib/engagement";
import { compactCount, timeAgo, type FeedDrop, type Profile } from "@/lib/blurbi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Blurbbi` },
      { name: "description", content: `@${params.username}'s Drops on Blurbbi.` },
      { property: "og:title", content: `@${params.username} · Blurbbi` },
      { property: "og:description", content: `@${params.username}'s Drops on Blurbbi.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

type UserEcho = {
  id: string;
  content: string;
  created_at: string;
  drop_id: string;
  parentDrop?: {
    id: string;
    content: string;
    author_username: string;
    author_display_name: string;
  } | null;
};

async function fetchProfileDrops(
  username: string,
  viewerId: string | undefined,
): Promise<FeedDrop[]> {
  try {
    const { data, error } = await supabase.rpc("profile_drops", {
      p_username: username,
      ...(viewerId ? { p_viewer: viewerId } : {}),
      p_limit: 50,
    });
    if (error) {
      console.warn("Profile drops error:", error.message);
      return [];
    }
    return (data ?? []) as unknown as FeedDrop[];
  } catch (err) {
    console.warn("Profile drops exception:", err);
    return [];
  }
}

async function fetchUserEchoes(userId: string): Promise<UserEcho[]> {
  try {
    const { data: echoesData, error } = await supabase
      .from("echoes")
      .select("id, content, created_at, drop_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error || !echoesData || echoesData.length === 0) return [];

    const dropIds = [...new Set(echoesData.map((e) => e.drop_id))];
    const { data: dropsData } = await supabase
      .from("drops")
      .select("id, content, user_id")
      .in("id", dropIds);

    const authorIds = [...new Set((dropsData ?? []).map((d) => d.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", authorIds);

    const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
    const dropMap = new Map(
      (dropsData ?? []).map((d) => {
        const author = profileMap.get(d.user_id);
        return [
          d.id,
          {
            id: d.id,
            content: d.content,
            author_username: author?.username ?? "unknown",
            author_display_name: author?.display_name ?? author?.username ?? "Anonymous",
          },
        ];
      }),
    );

    return echoesData.map((e) => ({
      id: e.id,
      content: e.content,
      created_at: e.created_at,
      drop_id: e.drop_id,
      parentDrop: dropMap.get(e.drop_id) ?? null,
    }));
  } catch (err) {
    console.warn("fetchUserEchoes error:", err);
    return [];
  }
}

async function fetchUserRelays(userId: string, viewerId?: string): Promise<FeedDrop[]> {
  try {
    const { data, error } = await supabase.rpc(
      "get_user_relays" as never,
      {
        p_user_id: userId,
        p_viewer: viewerId || null,
        p_limit: 40,
      } as never,
    );

    if (!error && Array.isArray(data)) {
      return data as unknown as FeedDrop[];
    }
  } catch (err) {
    console.warn("get_user_relays RPC fallback:", err);
  }

  // Fallback query
  try {
    const { data: relayRows, error: relayErr } = await supabase
      .from("relays")
      .select("drop_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (relayErr || !relayRows || relayRows.length === 0) return [];

    const dropIds = relayRows.map((r: { drop_id: string }) => r.drop_id);
    const { data: dropsData } = await supabase
      .from("drops")
      .select("id, content, user_id, spark_count, echo_count, relay_count, pass_count, created_at")
      .in("id", dropIds);

    if (!dropsData || dropsData.length === 0) return [];

    const authorIds = [...new Set(dropsData.map((d) => d.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_emoji, avatar_color")
      .in("id", authorIds);

    const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

    return dropsData.map((d) => {
      const author = profileMap.get(d.user_id);
      return {
        drop_id: d.id,
        content: d.content,
        author_id: d.user_id,
        username: author?.username ?? "unknown",
        display_name: author?.display_name ?? author?.username ?? "Anonymous",
        avatar_emoji: author?.avatar_emoji ?? "✨",
        avatar_color: author?.avatar_color ?? "coral",
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

function formatJoinedDate(isoDate: string | undefined): string {
  if (!isoDate) return "Recently";
  try {
    const d = new Date(isoDate);
    return `Joined ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  } catch {
    return "Recently";
  }
}

function ProfilePage() {
  const { username } = Route.useParams();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [orbitersOpen, setOrbitersOpen] = useState(false);
  const [orbitingOpen, setOrbitingOpen] = useState(false);
  const [tab, setTab] = useState<"drops" | "echoes" | "relays">("drops");
  const [notifyBell, setNotifyBell] = useState(false);

  // Profile data
  const profile = useQuery({
    queryKey: ["profile", username.toLowerCase()],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      return (data as Profile) ?? null;
    },
  });

  const p = profile.data;
  const isOwn = !!me && p?.id === me.id;
  const authorId = p?.id;

  // Drops query
  const drops = useQuery({
    queryKey: ["profile-drops", username.toLowerCase(), me?.id],
    enabled: true,
    queryFn: () => fetchProfileDrops(username, me?.id),
  });

  // Total drops count
  const totalDrops = useQuery({
    queryKey: ["profile-total-drops", authorId],
    enabled: !!authorId,
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        .from("drops")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authorId!);
      return count ?? 0;
    },
    staleTime: 1000 * 30,
  });

  // Echoes query
  const echoes = useQuery({
    queryKey: ["profile-echoes", authorId],
    enabled: !!authorId && tab === "echoes",
    queryFn: () => fetchUserEchoes(authorId!),
  });

  // Relays query
  const relays = useQuery({
    queryKey: ["profile-relays", authorId, me?.id],
    enabled: !!authorId && tab === "relays",
    queryFn: () => fetchUserRelays(authorId!, me?.id),
  });

  // Engagement states for all loaded drops
  const allDropIds = [
    ...(drops.data ?? []).map((d) => d.drop_id),
    ...(relays.data ?? []).map((d) => d.drop_id),
  ];
  const engagement = useEngagement(allDropIds, me?.id);

  const orbiting = engagement?.orbited.has(authorId ?? "") ?? false;

  async function onOrbit() {
    if (!me || !authorId) {
      toast.error("Sign in to orbit other blurbers.");
      navigate({ to: "/auth" });
      return;
    }
    try {
      await toggleOrbit(authorId, orbiting, me.id);
      await refreshAfterEngagement(qc);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(orbiting ? "Left the orbit" : "Now orbiting 🛰️");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onMute() {
    if (!me || !authorId) return;
    try {
      await muteUser(authorId, me.id);
      await refreshAfterEngagement(qc);
      toast.success(`@${username} muted.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onShareProfile() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard 🔗");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  async function onTogglePin(dropId: string) {
    if (!isOwn || !authorId) return;
    const isCurrentlyPinned = p?.pinned_drop_id === dropId;
    const nextPinnedId = isCurrentlyPinned ? null : dropId;

    try {
      if (nextPinnedId) {
        await supabase.rpc("pin_drop" as never, { p_drop_id: dropId } as never);
      } else {
        await supabase.rpc("unpin_drop" as never);
      }
    } catch {
      // Fallback direct update
      await supabase.from("profiles").update({ pinned_drop_id: nextPinnedId }).eq("id", authorId);
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ["profile"] }),
      qc.invalidateQueries({ queryKey: ["profile-drops"] }),
    ]);

    toast.success(
      isCurrentlyPinned ? "Drop unpinned from profile" : "Drop pinned to your profile 📌",
    );
  }

  function toggleBellNotification() {
    const next = !notifyBell;
    setNotifyBell(next);
    toast.success(
      next
        ? `Notifications turned on for @${username} 🔔`
        : `Notifications turned off for @${username}`,
    );
  }

  if (profile.isSuccess && !p) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="font-display text-xl font-bold">No one orbits here</p>
        <p className="mt-1 text-sm text-muted-foreground">@{username} doesn't exist.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the Stream
        </Link>
      </div>
    );
  }

  // Handle pinned drop separation
  const allDropsList = drops.data ?? [];
  const pinnedDropId = p?.pinned_drop_id;
  const pinnedDrop = pinnedDropId ? allDropsList.find((d) => d.drop_id === pinnedDropId) : null;
  const standardDrops = pinnedDropId
    ? allDropsList.filter((d) => d.drop_id !== pinnedDropId)
    : allDropsList;

  const isVerifiedAccount = p?.is_verified || p?.username === "blurbbi";

  return (
    <div className="space-y-4">
      {/* Top mobile navigation back bar */}
      <div className="flex items-center gap-3 px-1 md:hidden">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-display text-base font-bold text-foreground">
              {p?.display_name || username}
            </span>
            {isVerifiedAccount && (
              <BadgeCheck className="h-4 w-4 text-primary fill-primary/20 shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {totalDrops.data !== undefined ? `${compactCount(totalDrops.data)} Drops` : "Profile"}
          </span>
        </div>
      </div>

      {/* Profile Header Card */}
      {p ? (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          {/* Main profile row: Avatar + Actions */}
          <div className="flex items-start justify-between gap-4">
            {/* Avatar with live status indicator */}
            <div className="relative shrink-0">
              <BlurbiAvatar emoji={p.avatar_emoji} color={p.avatar_color} size="xl" />
              <span
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card shadow-sm"
                title="Active on Blurbbi"
              />
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              {isOwn ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full font-semibold px-4 shadow-sm transition-colors hover:bg-accent"
                  onClick={() => setEditOpen(true)}
                >
                  Edit profile
                </Button>
              ) : (
                <>
                  {orbiting && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-border/80 text-muted-foreground hover:text-foreground"
                      onClick={toggleBellNotification}
                      aria-label="Toggle notifications"
                    >
                      {notifyBell ? (
                        <BellRing className="h-4 w-4 text-primary fill-primary/20" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    className="rounded-full px-4 text-xs font-semibold shadow-sm transition-all active:scale-95"
                    variant={orbiting ? "secondary" : "default"}
                    onClick={onOrbit}
                  >
                    {orbiting ? "Orbiting ✓" : "Orbit"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl">
                      <DropdownMenuItem onClick={onShareProfile}>
                        <Share2 className="h-4 w-4" /> Copy profile link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onMute} className="text-muted-foreground">
                        <VolumeX className="h-4 w-4" /> Mute @{p.username}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="mt-3.5 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {p.display_name || p.username}
              </h1>
              {isVerifiedAccount && (
                <span title="Verified Blurber" className="inline-flex">
                  <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">@{p.username}</p>
          </div>

          {/* Bio */}
          {p.bio && (
            <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words max-w-xl">
              {p.bio}
            </p>
          )}

          {/* Metadata items: Location, Website, Joined Date */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {p.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                <span className="truncate max-w-[180px]">{p.location}</span>
              </div>
            )}

            {p.website && (
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                <a
                  href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline flex items-center gap-0.5 truncate max-w-[200px]"
                >
                  {p.website.replace(/^https?:\/\/(www\.)?/, "")}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <span>{formatJoinedDate(p.created_at)}</span>
            </div>
          </div>

          {/* Interactive Statistics Row */}
          <div className="mt-4 flex items-center gap-5 border-t border-border/50 pt-3 text-sm">
            <span className="text-muted-foreground">
              <strong className="font-bold text-foreground tabular-nums">
                {compactCount(totalDrops.data ?? 0)}
              </strong>{" "}
              Drops
            </span>

            <button
              type="button"
              onClick={() => setOrbitersOpen(true)}
              className="group text-left transition-colors hover:text-foreground"
            >
              <strong className="font-bold text-foreground tabular-nums group-hover:underline">
                {compactCount(p.followers_count ?? 0)}
              </strong>{" "}
              <span className="text-muted-foreground group-hover:text-foreground">Orbiters</span>
            </button>

            <button
              type="button"
              onClick={() => setOrbitingOpen(true)}
              className="group text-left transition-colors hover:text-foreground"
            >
              <strong className="font-bold text-foreground tabular-nums group-hover:underline">
                {compactCount(p.following_count ?? 0)}
              </strong>{" "}
              <span className="text-muted-foreground group-hover:text-foreground">Orbiting</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="h-48 animate-pulse rounded-3xl bg-muted/60" />
      )}

      {/* Content Navigation Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "drops" | "echoes" | "relays")}
        className="w-full"
      >
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-full bg-secondary/60 p-1">
          <TabsTrigger value="drops" className="rounded-full text-xs font-semibold">
            Drops
            {drops.data && drops.data.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                ({drops.data.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="echoes" className="rounded-full text-xs font-semibold">
            Echoes
            {echoes.data && echoes.data.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                ({echoes.data.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="relays" className="rounded-full text-xs font-semibold">
            Relays
            {relays.data && relays.data.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                ({relays.data.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* TAB 1: DROPS */}
      {tab === "drops" && (
        <div className="space-y-3">
          {drops.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
              ))}
            </div>
          ) : allDropsList.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-foreground">No Drops yet</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {isOwn
                  ? "You haven't dropped anything yet. Share your first thought in the stream!"
                  : `@${username} hasn't released any Drops into the stream yet.`}
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Drop (if any) */}
              {pinnedDrop && (
                <DropCard
                  key={`pinned-${pinnedDrop.drop_id}`}
                  drop={pinnedDrop}
                  viewerId={me?.id}
                  engagement={engagement}
                  isPinned={true}
                  onTogglePin={isOwn ? () => onTogglePin(pinnedDrop.drop_id) : undefined}
                />
              )}

              {/* Regular Drops */}
              {standardDrops.map((d) => (
                <DropCard
                  key={d.drop_id}
                  drop={d}
                  viewerId={me?.id}
                  engagement={engagement}
                  onTogglePin={isOwn ? () => onTogglePin(d.drop_id) : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* TAB 2: ECHOES (Replies) */}
      {tab === "echoes" && (
        <div className="space-y-3">
          {echoes.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted/60" />
              ))}
            </div>
          ) : (echoes.data?.length ?? 0) === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-foreground">No Echoes yet</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {isOwn
                  ? "You haven't replied to any Drops yet. Join a conversation in the stream!"
                  : `@${username} hasn't replied to any Drops yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {echoes.data!.map((echo) => (
                <article
                  key={echo.id}
                  className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-ring/50 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <BlurbiAvatar
                      emoji={p?.avatar_emoji || "🌀"}
                      color={p?.avatar_color || "sky"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-semibold">{p?.display_name || username}</span>
                        <span className="text-muted-foreground hidden sm:inline">@{username}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(echo.created_at)}
                        </span>
                      </div>

                      {/* Parent drop quote context */}
                      {echo.parentDrop && (
                        <Link
                          to="/drop/$id"
                          params={{ id: echo.drop_id }}
                          className="mt-2 block rounded-2xl border border-border/70 bg-secondary/30 p-2.5 text-xs transition-colors hover:bg-secondary/60 hover:border-border"
                        >
                          <div className="font-medium text-muted-foreground mb-0.5">
                            Echoing @{echo.parentDrop.author_username}:
                          </div>
                          <p className="line-clamp-2 text-foreground/85">
                            {echo.parentDrop.content}
                          </p>
                        </Link>
                      )}

                      {/* Echo content */}
                      <Link to="/drop/$id" params={{ id: echo.drop_id }} className="block">
                        <p className="mt-2 text-[14.5px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                          {echo.content}
                        </p>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RELAYS (Reposts) */}
      {tab === "relays" && (
        <div className="space-y-3">
          {relays.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
              ))}
            </div>
          ) : (relays.data?.length ?? 0) === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
                <Repeat2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-foreground">No Relays yet</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {isOwn
                  ? "You haven't relayed any Drops yet. When you find a Drop you love, Relay it to your orbit!"
                  : `@${username} hasn't relayed any Drops yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {relays.data!.map((drop) => (
                <DropCard
                  key={`relay-${drop.drop_id}`}
                  drop={drop}
                  viewerId={me?.id}
                  engagement={engagement}
                  relayedBy={username}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Dialog */}
      {p && isOwn && <EditProfileDialog profile={p} open={editOpen} onOpenChange={setEditOpen} />}

      {/* Orbiters (Followers) Modal */}
      {p && (
        <OrbitersDialog
          open={orbitersOpen}
          onOpenChange={setOrbitersOpen}
          type="orbiters"
          userId={p.id}
          username={p.username}
          viewerId={me?.id}
        />
      )}

      {/* Orbiting (Following) Modal */}
      {p && (
        <OrbitersDialog
          open={orbitingOpen}
          onOpenChange={setOrbitingOpen}
          type="orbiting"
          userId={p.id}
          username={p.username}
          viewerId={me?.id}
        />
      )}
    </div>
  );
}
