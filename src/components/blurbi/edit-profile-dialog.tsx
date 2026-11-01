import { useEffect, useState } from "react";
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

export function EditProfileDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [emoji, setEmoji] = useState(profile.avatar_emoji);
  const [color, setColor] = useState(profile.avatar_color);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setEmoji(profile.avatar_emoji);
      setColor(profile.avatar_color);
      setUsernameError(null);
    }
  }, [open, profile]);

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);

  async function checkUsername(value: string) {
    if (value === profile.username || !usernameValid) {
      setUsernameError(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", value)
      .neq("id", profile.id)
      .maybeSingle();
    setUsernameError(data ? "That username is taken" : null);
  }

  async function save() {
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (error) {
        toast.error(
          error.message.includes("profiles_username_key")
            ? "That username is taken."
            : error.message,
        );
        return;
      }
      toast.success("Profile updated ✨");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
              style={avatarStyle(color)}
            >
              {emoji}
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Color ${key}`}
                  onClick={() => setColor(key)}
                  className={cn(
                    "h-6 w-6 rounded-full",
                    color === key && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  )}
                  style={avatarStyle(key)}
                />
              ))}
            </div>
          </div>
          <EmojiPickerGrid value={emoji} onChange={setEmoji} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase());
                setUsernameError(null);
              }}
              onBlur={() => checkUsername(username.toLowerCase())}
              className="rounded-full"
              maxLength={20}
            />
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-display">Display name</Label>
            <Input
              id="edit-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-full"
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Bio</Label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-20 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full"
            disabled={busy || !usernameValid || !!usernameError}
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
