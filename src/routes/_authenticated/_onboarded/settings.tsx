import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { EditProfileDialog } from "@/components/blurbi/edit-profile-dialog";
import { Button } from "@/components/ui/button";
import {
  VolumeX,
  EyeOff,
  LogOut,
  UserPen,
  Smartphone,
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePwa } from "@/hooks/use-pwa";

export const Route = createFileRoute("/_authenticated/_onboarded/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Blurbbi" },
      { name: "description", content: "Manage your Blurbbi profile, mutes, and hidden drops." },
      { property: "og:title", content: "Settings · Blurbbi" },
      {
        property: "og:description",
        content: "Manage your Blurbbi profile, mutes, and hidden drops.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

type MutedRow = {
  muted_id: string;
  profile: { username: string; display_name: string; avatar_emoji: string; avatar_color: string };
};

type HiddenRow = {
  drop_id: string;
  drop: { id: string; content: string; profiles: { username: string } | null };
};

function Settings() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const { canInstall, isStandalone, isIOS, isInstalled, installApp } = usePwa();

  const muted = useQuery({
    queryKey: ["mutes", me?.id],
    enabled: !!me,
    queryFn: async (): Promise<MutedRow[]> => {
      const { data, error } = await supabase
        .from("mutes")
        .select(
          "muted_id, profile:profiles!mutes_muted_id_fkey(username, display_name, avatar_emoji, avatar_color)",
        )
        .eq("user_id", me!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MutedRow[];
    },
  });

  const hidden = useQuery({
    queryKey: ["hides", me?.id],
    enabled: !!me,
    queryFn: async (): Promise<HiddenRow[]> => {
      const { data, error } = await supabase
        .from("hides")
        .select("drop_id, drop:drops!hides_drop_id_fkey(id, content, profiles(username))")
        .eq("user_id", me!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as HiddenRow[];
    },
  });

  async function unmute(mutedId: string, username: string) {
    if (!me) return;
    const { error } = await supabase
      .from("mutes")
      .delete()
      .eq("user_id", me.id)
      .eq("muted_id", mutedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`@${username} unmuted.`);
    qc.invalidateQueries({ queryKey: ["mutes"] });
  }

  async function unhide(dropId: string) {
    if (!me) return;
    const { error } = await supabase
      .from("hides")
      .delete()
      .eq("user_id", me.id)
      .eq("drop_id", dropId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Drop unhidden.");
    qc.invalidateQueries({ queryKey: ["hides"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  }

  return (
    <div className="space-y-6">
      <h1 className="px-1 font-display text-2xl font-bold tracking-tight">Settings</h1>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Profile</h2>
        {me ? (
          <div className="mt-3 flex items-center gap-3">
            <BlurbiAvatar emoji={me.avatar_emoji} color={me.avatar_color} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{me.display_name || me.username}</p>
              <p className="truncate text-xs text-muted-foreground">@{me.username}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setEditOpen(true)}
            >
              <UserPen className="h-4 w-4" /> Edit
            </Button>
          </div>
        ) : (
          <div className="mt-3 h-12 animate-pulse rounded-2xl bg-muted" />
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Muted accounts</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Their Drops won't appear in your Stream.
        </p>
        {muted.isLoading ? (
          <div className="mt-3 h-10 animate-pulse rounded-2xl bg-muted" />
        ) : (muted.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You haven't muted anyone. 🤝</p>
        ) : (
          <div className="mt-3 space-y-2">
            {muted.data!.map((m) => (
              <div key={m.muted_id} className="flex items-center gap-3">
                <BlurbiAvatar
                  emoji={m.profile?.avatar_emoji ?? "👤"}
                  color={m.profile?.avatar_color ?? "sky"}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.profile?.display_name || m.profile?.username}{" "}
                  <span className="text-muted-foreground">@{m.profile?.username}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => unmute(m.muted_id, m.profile?.username ?? "")}
                >
                  Unmute
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Hidden Drops</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Drops you asked not to see in your Stream.
        </p>
        {hidden.isLoading ? (
          <div className="mt-3 h-10 animate-pulse rounded-2xl bg-muted" />
        ) : (hidden.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing hidden. 👀</p>
        ) : (
          <div className="mt-3 space-y-2">
            {hidden.data!.map((h) => (
              <div key={h.drop_id} className="flex items-center gap-3">
                <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Link
                  to="/u/$username"
                  params={{ username: h.drop?.profiles?.username ?? "" }}
                  className="shrink-0 text-xs text-muted-foreground hover:underline"
                >
                  @{h.drop?.profiles?.username}
                </Link>
                <span className="min-w-0 flex-1 truncate text-sm">{h.drop?.content}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => unhide(h.drop_id)}
                >
                  Unhide
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PWA Web App Section */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-primary" />
              Blurbbi Web App (PWA)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Install Blurbbi for instant launch from home screen, offline browsing, and faster load
              times.
            </p>
          </div>
          {isStandalone || isInstalled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" /> Installed
            </span>
          ) : null}
        </div>

        {!isStandalone && !isInstalled && (
          <div className="mt-4 pt-3 border-t border-border/50">
            {canInstall ? (
              <Button onClick={installApp} className="w-full rounded-full font-semibold">
                <Download className="mr-1.5 h-4 w-4" /> Install Blurbbi App
              </Button>
            ) : isIOS ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowIosGuide(!showIosGuide)}
                  className="w-full rounded-full font-semibold"
                >
                  <Download className="mr-1.5 h-4 w-4" /> Install on iPhone / iPad
                </Button>
                {showIosGuide && (
                  <div className="mt-3 rounded-2xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2 border border-border/60">
                    <div className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        1
                      </span>
                      <span>
                        Tap the <strong>Share</strong> button{" "}
                        <Share className="inline h-3 w-3 text-foreground" /> in Safari's bottom bar.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        2
                      </span>
                      <span>
                        Select <strong>Add to Home Screen</strong>{" "}
                        <PlusSquare className="inline h-3 w-3 text-foreground" />.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                To install, open this page in Chrome, Edge, Safari, or a PWA-compatible browser and
                select &quot;Install&quot; or &quot;Add to Home Screen&quot;.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Account</h2>
        <Button
          variant="outline"
          className="mt-3 w-full rounded-full text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </section>

      {me && <EditProfileDialog profile={me} open={editOpen} onOpenChange={setEditOpen} />}

      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <VolumeX className="h-3.5 w-3.5" /> Report abusive Drops from any Drop's menu.
      </p>
    </div>
  );
}
