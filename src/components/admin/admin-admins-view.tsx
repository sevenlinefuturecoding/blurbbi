import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  UserPlus,
  UserX,
  Clock,
  Mail,
  Copy,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  Key,
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
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  fetchAdminUserRoles,
  manageAdminRole,
  fetchAdminInvitations,
  createAdminInvitation,
  revokeAdminInvitation,
  acceptAdminInvitation,
  type AdminUserRoleItem,
  type AdminInvitationItem,
  type AdminRole,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminAdminsView() {
  const qc = useQueryClient();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("moderator");
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [tokenToAccept, setTokenToAccept] = useState("");

  const { data: admins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ["admin", "user-roles"],
    queryFn: fetchAdminUserRoles,
  });

  const { data: invitations = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: fetchAdminInvitations,
  });

  // Mutations
  const createInviteMutation = useMutation({
    mutationFn: () => createAdminInvitation(inviteEmail, inviteRole),
    onSuccess: (data) => {
      if (data?.token) {
        setCreatedInviteToken(data.token);
        toast.success("Single-use admin invitation generated successfully");
        qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create invitation");
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => revokeAdminInvitation(id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (token: string) => acceptAdminInvitation(token),
    onSuccess: () => {
      toast.success("Invitation claimed! Admin role assigned");
      setAcceptDialogOpen(false);
      setTokenToAccept("");
      qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to claim invitation");
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: AdminRole }) =>
      manageAdminRole({ targetUserId: userId, roleId, action: "revoke" }),
    onSuccess: () => {
      toast.success("Administrative privileges revoked");
      qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Revocation failed");
    },
  });

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    toast.success("Invitation token copied to clipboard");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Admin Account & Invitation Management
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Delegate administrative roles, issue single-use secure invitations, and audit staff
            access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAcceptDialogOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Key className="h-3.5 w-3.5" />
            Claim Invitation Token
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreatedInviteToken(null);
              setInviteDialogOpen(true);
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Administrator
          </Button>
        </div>
      </div>

      {/* Active Administrators Section */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Active Administrators ({admins.length})</h2>
            <p className="text-xs text-muted-foreground">
              Users with authenticated administrative privileges.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary text-xs font-mono">
            RBAC Enforced
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                    Loading admin personnel...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                    No administrators registered.
                  </td>
                </tr>
              ) : (
                admins.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <BlurbiAvatar
                          emoji={item.user.avatar_emoji}
                          color={item.user.avatar_color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground">
                            {item.user.display_name || item.user.username}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            @{item.user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={item.role_id === "super_admin" ? "default" : "outline"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {item.role_id.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {timeAgo(item.assigned_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeRoleMutation.isPending}
                        onClick={() =>
                          revokeRoleMutation.mutate({
                            userId: item.user_id,
                            roleId: item.role_id,
                          })
                        }
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Revoke Access
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Admin Invitations ({invitations.filter((i) => i.status === "pending").length} Pending)
            </h2>
            <p className="text-xs text-muted-foreground">
              Single-use tokens with a 7-day expiration.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">Invited Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Token Preview</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitesLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                    Loading invitations...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                    No invitations issued yet.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-xs text-foreground">{inv.email}</td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {inv.role_id}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.token.slice(0, 10)}...</span>
                        {inv.status === "pending" && (
                          <button
                            onClick={() => copyToken(inv.token)}
                            className="p-1 hover:text-foreground transition-colors"
                            title="Copy invitation token"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          inv.status === "accepted"
                            ? "default"
                            : inv.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px] uppercase font-mono"
                      >
                        {inv.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(inv.id)}
                          className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Administrator Modal */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Invite Platform Administrator</DialogTitle>
          </DialogHeader>

          {!createdInviteToken ? (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Administrator Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-1.5 bg-background text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Assigned Administrative Role</Label>
                <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as AdminRole)}>
                  <SelectTrigger className="mt-1.5 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Administrator (Unrestricted)</SelectItem>
                    <SelectItem value="admin">Administrator (Operations & Content)</SelectItem>
                    <SelectItem value="moderator">Content Moderator (Triage & Warnings)</SelectItem>
                    <SelectItem value="support">Customer Support (User Inspection)</SelectItem>
                    <SelectItem value="analyst">Platform Analyst (Read-Only Metrics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!inviteEmail.trim() || createInviteMutation.isPending}
                  onClick={() => createInviteMutation.mutate()}
                >
                  {createInviteMutation.isPending ? "Generating..." : "Generate Invitation Token"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Invitation Created Successfully
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Provide this single-use secure token to the invited user. Valid for 7 days.
                </p>
              </div>

              <div>
                <Label className="text-xs">Invitation Token</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdInviteToken}
                    className="bg-background font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToken(createdInviteToken)}
                    className="shrink-0 text-xs"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setInviteDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Claim Invitation Modal */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Claim Administrative Invitation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              If you received a single-use administrative token from a Super Admin, enter it below
              to claim your role.
            </p>

            <div>
              <Label className="text-xs">Invitation Token (48 characters)</Label>
              <Input
                value={tokenToAccept}
                onChange={(e) => setTokenToAccept(e.target.value.trim())}
                placeholder="Paste token hex..."
                className="mt-1.5 bg-background font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!tokenToAccept || acceptInviteMutation.isPending}
              onClick={() => acceptInviteMutation.mutate(tokenToAccept)}
            >
              {acceptInviteMutation.isPending ? "Verifying..." : "Claim Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
