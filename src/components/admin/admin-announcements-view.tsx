import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAnnouncements,
  createAnnouncement,
  publishAnnouncement,
  type PlatformAnnouncementItem,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminAnnouncementsView() {
  const qc = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"general" | "feature_update" | "maintenance" | "important">(
    "general",
  );
  const [audience, setAudience] = useState<"all" | "verified" | "new_users">("all");

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: fetchAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      toast.success("Platform announcement draft created");
      setCreateDialogOpen(false);
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create announcement");
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishAnnouncement,
    onSuccess: () => {
      toast.success("Announcement broadcasted and notifications sent to recipients");
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to broadcast announcement");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Platform Announcements
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Broadcast platform updates, maintenance advisories, and system notices to users.
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="h-9 gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
            No platform announcements published yet. Click &quot;Create Announcement&quot; to draft
            one.
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 bg-card transition-all ${
                item.status === "published" ? "border-primary/30" : "border-border/70"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === "published" ? "default" : "secondary"}
                    className="text-[10px] uppercase font-mono"
                  >
                    {item.status}
                  </Badge>

                  <Badge variant="outline" className="text-[10px] capitalize font-mono">
                    Type: {item.type.replace("_", " ")}
                  </Badge>

                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Audience: {item.audience}
                  </Badge>
                </div>

                <div className="text-muted-foreground font-mono">
                  {item.published_at
                    ? `Published: ${timeAgo(item.published_at)}`
                    : `Draft: ${timeAgo(item.created_at)}`}
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/90 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>

              {item.status === "draft" && (
                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => publishMutation.mutate(item.id)}
                    disabled={publishMutation.isPending}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {publishMutation.isPending ? "Broadcasting..." : "Broadcast & Notify Users"}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Platform Announcement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Announcement Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Maintenance or New Features"
                className="mt-1.5 bg-background text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as typeof type)}>
                  <SelectTrigger className="mt-1.5 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Notice</SelectItem>
                    <SelectItem value="feature_update">Feature Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance Advisory</SelectItem>
                    <SelectItem value="important">Important Platform Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Target Audience</Label>
                <Select
                  value={audience}
                  onValueChange={(val) => setAudience(val as typeof audience)}
                >
                  <SelectTrigger className="mt-1.5 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Registered Blurbers</SelectItem>
                    <SelectItem value="verified">Verified Creators Only</SelectItem>
                    <SelectItem value="new_users">New Blurbers (7d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Message Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write announcement body here..."
                className="mt-1.5 bg-background text-sm min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  title,
                  content,
                  type,
                  audience,
                });
              }}
            >
              {createMutation.isPending ? "Creating..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
