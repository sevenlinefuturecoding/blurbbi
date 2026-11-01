import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { DropCard } from "@/components/blurbi/drop-card";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { EditProfileDialog } from "@/components/blurbi/edit-profile-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, VolumeX } from "lucide-react";
import { toggleOrbit, muteUser, refreshAfterEngagement } from "@/lib/engagement";
import { compactCount, type FeedDrop, type Profile } from "@/lib/blurbi";
import { toast } from "sonner";

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

function ProfilePage() {
  const { username } = Route.useParams();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", username.toLowerCase()],
    enabled: true,
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      return data ?? null;
    },
  });

  const drops = useQuery({
    queryKey: ["profile-drops", username.toLowerCase(), me?.id],
    enabled: true,
    queryFn: () => fetchProfileDrops(username, me?.id),
  });

  const engagement = useEngagement(
    (drops.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  const isOwn = !!me && profile.data?.id === me.id;
  const orbiting = engagement?.orbited.has(profile.data?.id ?? "") ?? false;
  const authorId = profile.data?.id;

  async function onOrbit() {
    if (!me || !authorId) return;
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

  if (profile.isSuccess && !profile.data) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="font-display text-xl font-semibold">No one orbits here</p>
        <p className="mt-1 text-sm text-muted-foreground">@{username} doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to the Stream
        </Link>
      </div>
    );
  }

  const p = profile.data;

  return (
    <div className="space-y-4">
      {p ? (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <BlurbiAvatar emoji={p.avatar_emoji} color={p.avatar_color} size="lg" />
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">
                  {p.display_name || p.username}
                </h1>
                <p className="text-sm text-muted-foreground">@{p.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwn ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setEditOpen(true)}
                >
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="rounded-full"
                    variant={orbiting ? "outline" : "default"}
                    onClick={onOrbit}
                    disabled={!me}
                  >
                    {orbiting ? "Orbiting ✓" : "Orbit"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl">
                      <DropdownMenuItem onClick={onMute}>
                        <VolumeX className="h-4 w-4" /> Mute @{p.username}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
          {p.bio && <p className="mt-3 text-[15px] leading-relaxed">{p.bio}</p>}
          <div className="mt-3 flex gap-5 text-sm">
            <span>
              <b>{compactCount(p.followers_count)}</b>{" "}
              <span className="text-muted-foreground">Orbiters</span>
            </span>
            <span>
              <b>{compactCount(p.following_count)}</b>{" "}
              <span className="text-muted-foreground">Orbiting</span>
            </span>
          </div>
        </section>
      ) : (
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      )}

      <h2 className="px-1 text-sm font-semibold text-muted-foreground">Drops</h2>
      {drops.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (drops.data?.length ?? 0) === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No Drops yet.
        </div>
      ) : (
        <div className="space-y-3">
          {drops.data!.map((d) => (
            <DropCard key={d.drop_id} drop={d} viewerId={me?.id} engagement={engagement} />
          ))}
        </div>
      )}

      {p && isOwn && <EditProfileDialog profile={p} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
}
