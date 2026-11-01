import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPickerGrid } from "./emoji-picker";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_COLOR_KEYS, avatarStyle, type Profile } from "@/lib/blurbi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Globe, MapPin, Loader2, X } from "lucide-react";

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
        qc.invalidateQueries({ queryKey: ["drops"] }),
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
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-md max-h-[88dvh] p-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Sticky Mobile-Friendly Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/95 px-5 py-3.5 backdrop-blur-md">
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Edit Profile
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
          {/* Avatar theme & preview */}
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5 flex items-center gap-3.5">
            <div
              className="flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-2xl text-3xl shadow-sm transition-transform active:scale-95"
              style={avatarStyle(color)}
            >
              {emoji}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
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

          {/* Emoji Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Avatar Emoji</Label>
            <EmojiPickerGrid value={emoji} onChange={setEmoji} />
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-display" className="text-xs font-semibold text-foreground">
              Display Name
            </Label>
            <Input
              id="edit-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="h-10 text-base sm:text-sm rounded-xl bg-background"
              maxLength={40}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-username" className="text-xs font-semibold text-foreground">
                Username
              </Label>
              <span className="text-[11px] text-muted-foreground">
                3–20 lowercase letters, numbers, or _
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-medium text-muted-foreground select-none">
                @
              </span>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  setUsernameError(null);
                }}
                onBlur={() => checkUsername(username.toLowerCase())}
                className="h-10 text-base sm:text-sm rounded-xl bg-background pl-7"
                maxLength={20}
              />
            </div>
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
          </div>

          {/* Bio (160 characters limit) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bio" className="text-xs font-semibold text-foreground">
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
                {remainingBio} left
              </span>
            </div>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell blurbers about yourself…"
              className="min-h-[76px] w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              maxLength={160}
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-website"
              className="text-xs font-semibold flex items-center gap-1.5 text-foreground"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input
              id="edit-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="h-10 text-base sm:text-sm rounded-xl bg-background"
              maxLength={100}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-location"
              className="text-xs font-semibold flex items-center gap-1.5 text-foreground"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="h-10 text-base sm:text-sm rounded-xl bg-background"
              maxLength={50}
            />
          </div>
        </div>

        {/* Sticky Mobile-Friendly Footer */}
        <div className="border-t border-border/60 bg-card/95 px-5 py-3 flex items-center justify-end gap-2 backdrop-blur-md pb-safe">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full px-4 text-xs font-medium"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full px-6 text-xs font-semibold shadow-sm"
            disabled={busy || !usernameValid || !!usernameError}
            onClick={save}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
