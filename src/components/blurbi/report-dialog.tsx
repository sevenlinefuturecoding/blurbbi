import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { reportDrop, hideDrop } from "@/lib/engagement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REASONS = [
  "Spam",
  "Harassment or abuse",
  "Harmful content",
  "Misinformation",
  "Something else",
];

export function ReportDialog({
  dropId,
  authorUsername,
  viewerId,
  open,
  onOpenChange,
  onDone,
}: {
  dropId: string;
  authorUsername: string;
  viewerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState<string>(REASONS[0] ?? "Spam");
  const [note, setNote] = useState("");
  const [alsoHide, setAlsoHide] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await reportDrop({ dropId, reporterId: viewerId, reason, note });
      if (alsoHide) await hideDrop(dropId, viewerId);
      toast.success("Report sent. Thanks for keeping Blurbbi kind.");
      onOpenChange(false);
      setNote("");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Report @{authorUsername}'s Drop</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Reports are private and reviewed by the team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "block w-full rounded-2xl border px-4 py-2.5 text-left text-sm transition-colors",
                reason === r
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {r}
            </button>
          ))}
          <textarea
            placeholder="Anything else we should know? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-16 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={500}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="also-hide"
              checked={alsoHide}
              onCheckedChange={(v) => setAlsoHide(v === true)}
            />
            <Label htmlFor="also-hide" className="text-sm font-normal">
              Also hide this Drop from my Stream
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" disabled={busy} onClick={submit}>
            {busy ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
