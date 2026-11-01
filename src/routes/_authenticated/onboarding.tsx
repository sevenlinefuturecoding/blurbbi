import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmojiPickerGrid } from "@/components/blurbi/emoji-picker";
import { AVATAR_COLORS, AVATAR_COLOR_KEYS, avatarStyle, type Profile } from "@/lib/blurbi";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your profile · Blurbbi" },
      { name: "description", content: "Pick your handle, name, bio, and emoji avatar on Blurbbi." },
      { property: "og:title", content: "Set up your profile · Blurbbi" },
      {
        property: "og:description",
        content: "Pick your handle, name, bio, and emoji avatar on Blurbbi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [emoji, setEmoji] = useState("🌀");
  const [color, setColor] = useState("sky");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      let { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!data) {
        const initialUsername = `u_${user.id.replace(/-/g, "").slice(0, 10)}`;
        const { data: created } = await supabase
          .from("profiles")
          .insert({ id: user.id, username: initialUsername })
          .select()
          .maybeSingle();
        data = created;
      }
      if (data) {
        setProfile(data);
        if (data.onboarded) {
          navigate({ to: "/", replace: true });
          return;
        }
        setUsername(data.username.startsWith("u_") ? "" : data.username);
        setEmoji(data.avatar_emoji || "🌀");
        setColor(data.avatar_color || "sky");
      }
    });
  }, [navigate]);

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);

  async function checkUsername(value: string) {
    if (!/^[a-z0-9_]{3,20}$/.test(value)) return;
    setChecking(true);
    let query = supabase.from("profiles").select("id").ilike("username", value);
    if (profile) query = query.neq("id", profile.id);
    const { data } = await query.maybeSingle();
    if (data) setUsernameError("That username is taken");
    else setUsernameError(null);
    setChecking(false);
  }

  async function handleSave() {
    if (!profile || !usernameValid || usernameError) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_emoji: emoji,
          avatar_color: color,
          onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (error) {
        const msg = error.message.includes("profiles_username_format")
          ? "Usernames are 3–20 lowercase letters, numbers, or underscores."
          : error.message.includes("profiles_username_key")
            ? "That username is taken."
            : error.message;
        toast.error(msg);
        return;
      }
      toast.success("You're in! Welcome to the Stream. 🌊");
      navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Make it yours</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your handle, name, and a tiny avatar for the Stream.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-sm"
            style={avatarStyle(color)}
          >
            {emoji}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Avatar color</Label>
            <div className="flex gap-2">
              {AVATAR_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Color ${key}`}
                  onClick={() => setColor(key)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform",
                    color === key &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110",
                  )}
                  style={avatarStyle(key)}
                >
                  {color === key ? "✓" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Emoji</Label>
          <EmojiPickerGrid value={emoji} onChange={setEmoji} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="e.g. star_seeker"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              setUsernameError(null);
            }}
            onBlur={() => checkUsername(username)}
            className="rounded-full"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            {usernameError ??
              (username && !usernameValid
                ? "3–20 lowercase letters, numbers, or underscores"
                : checking
                  ? "Checking…"
                  : "blurbbi.app/u/" + (username || "yourname"))}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display">Display name</Label>
          <Input
            id="display"
            placeholder="How people see you"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-full"
            maxLength={40}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            placeholder="A sentence about you (200 characters)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-20 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={200}
          />
        </div>

        <Button
          className="w-full rounded-full"
          size="lg"
          disabled={busy || !usernameValid || !!usernameError || checking}
          onClick={handleSave}
        >
          Enter the Stream
        </Button>
      </div>
    </div>
  );
}
