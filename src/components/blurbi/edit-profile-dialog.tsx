import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPickerGrid } from "./emoji-picker";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_COLOR_KEYS, avatarStyle, type Profile } from "@/lib/blurbi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Globe, MapPin, Loader2 } from "lucide-react";

export function EditProfileDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [website, setWebsite] = useState(profile.website || "");
  const [location, setLocation] = useState(profile.location || "");
  const [emoji, setEmoji] = useState(profile.avatar_emoji);
  const [color, setColor] = useState(profile.avatar_color);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setWebsite(profile.website || "");
      setLocation(profile.location || "");
      setEmoji(profile.avatar_emoji);
      setColor(profile.avatar_color);
      setUsernameError(null);
    }
  }, [open, profile]);

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);
  const remainingBio = 160 - bio.length;

  async function checkUsername(value: string) {
    if (value === profile.username || !usernameValid) {
      setUsernameError(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", value)
        .neq("id", profile.id)
        .maybeSingle();
      setUsernameError(data ? "That username is taken" : null);
    } catch {
      // ignore
    }
  }

  async function save() {
    if (!usernameValid || usernameError) return;
    setBusy(true);

    let cleanWebsite = website.trim();
    if (cleanWebsite && !/^https?:\/\//i.test(cleanWebsite)) {
      cleanWebsite = "https://" + cleanWebsite;
    }

    try {
      // First attempt full update with all fields
      let { error } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_emoji: emoji,
          avatar_color: color,
          website: cleanWebsite || null,
          location: location.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      // If optional column error occurs (e.g. before migration), fall back gracefully
      if (error && (error.message.includes("website") || error.message.includes("location"))) {
        const fallbackRes = await supabase
          .from("profiles")
          .update({
            username: username.toLowerCase(),
            display_name: displayName.trim(),
            bio: bio.trim(),
            avatar_emoji: emoji,
            avatar_color: color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
        error = fallbackRes.error;
      }

      if (error) {
        toast.error(
          error.message.includes("profiles_username_key")
            ? "That username is taken."
            : error.message,
        );
        return;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["me"] }),
        qc.invalidateQueries({ queryKey: ["profile-drops"] }),
      ]);

      toast.success("Profile updated ✨");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Avatar preview & color switcher */}
          <div className="flex items-center gap-4 rounded-2xl bg-secondary/40 p-3 border border-border/50">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm transition-transform hover:scale-105"
              style={avatarStyle(color)}
            >
              {emoji}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Avatar Theme Color
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_COLOR_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Color ${key}`}
                    onClick={() => setColor(key)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform active:scale-90",
                      color === key &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                    )}
                    style={avatarStyle(key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Emoji selector grid */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Choose Emoji</Label>
            <EmojiPickerGrid value={emoji} onChange={setEmoji} />
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-display" className="text-xs font-semibold">
              Display Name
            </Label>
            <Input
              id="edit-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="rounded-xl bg-card"
              maxLength={40}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-username" className="text-xs font-semibold">
                Username
              </Label>
              <span className="text-[11px] text-muted-foreground">
                3–20 lowercase letters, numbers, or _
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs text-muted-foreground select-none">@</span>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  setUsernameError(null);
                }}
                onBlur={() => checkUsername(username.toLowerCase())}
                className="rounded-xl bg-card pl-7"
                maxLength={20}
              />
            </div>
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
          </div>

          {/* Bio (160 characters limit) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bio" className="text-xs font-semibold">
                Bio
              </Label>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  remainingBio < 0
                    ? "text-destructive font-semibold"
                    : remainingBio <= 20
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {remainingBio} chars left
              </span>
            </div>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell blurbers about yourself…"
              className="min-h-[76px] w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              maxLength={160}
            />
          </div>

          {/* Website Link */}
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-website"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input
              id="edit-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="rounded-xl bg-card"
              maxLength={100}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-location"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country or Orbit"
              className="rounded-xl bg-card"
              maxLength={50}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full px-6 font-semibold"
            disabled={busy || !usernameValid || !!usernameError}
            onClick={save}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
