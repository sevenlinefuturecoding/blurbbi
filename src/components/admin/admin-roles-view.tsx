import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  UserPlus,
  UserX,
  AlertTriangle,
  Lock,
  Search,
  CheckCircle2,
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
  fetchAdminUsers,
  type AdminUserRoleItem,
  type AdminRole,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminRolesView() {
  const qc = useQueryClient();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<AdminRole>("moderator");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ["admin", "user-roles"],
    queryFn: fetchAdminUserRoles,
  });

  const manageMutation = useMutation({
    mutationFn: manageAdminRole,
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "assign" ? "Role assigned successfully" : "Administrative role revoked",
      );
      setAssignDialogOpen(false);
      setTargetUsername("");
      setSelectedUserId(null);
      qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update admin role");
    },
  });

  // User search query for assignment dialog
  const userSearchQuery = useQuery({
    queryKey: ["admin", "user-search-assign", targetUsername],
    enabled: targetUsername.trim().length >= 2,
    queryFn: () => fetchAdminUsers({ search: targetUsername, limit: 5 }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Roles & Administrative Permissions (RBAC)
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Manage administrative privilege delegation, assign roles, and inspect permission
            matrices.
          </p>
        </div>

        <Button onClick={() => setAssignDialogOpen(true)} className="h-9 gap-1.5 text-xs">
          <UserPlus className="h-4 w-4" />
          Assign Admin Role
        </Button>
      </div>

      {/* Role Hierarchy Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-primary/40 bg-card p-4">
          <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">
            Super Admin
          </Badge>
          <h3 className="mt-2 text-xs font-bold text-foreground">Platform Owner</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Full platform control, permission delegation, settings, and role management.
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/40 bg-card p-4">
          <Badge variant="outline" className="text-sky-500 border-sky-500/40 font-mono text-[10px]">
            Admin
          </Badge>
          <h3 className="mt-2 text-xs font-bold text-foreground">Operations Lead</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            User management, content moderation, analytics inspection, and announcements.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-card p-4">
          <Badge
            variant="outline"
            className="text-amber-500 border-amber-500/40 font-mono text-[10px]"
          >
            Moderator
          </Badge>
          <h3 className="mt-2 text-xs font-bold text-foreground">Safety Team</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Report queue triage, drop removal, warnings, and temporary suspensions.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-500/40 bg-card p-4">
          <Badge
            variant="outline"
            className="text-indigo-400 border-indigo-500/40 font-mono text-[10px]"
          >
            Support
          </Badge>
          <h3 className="mt-2 text-xs font-bold text-foreground">Customer Care</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Inspect user profiles, verify account status, and assist user inquiries.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <Badge variant="secondary" className="font-mono text-[10px]">
            Analyst
          </Badge>
          <h3 className="mt-2 text-xs font-bold text-foreground">Data Read-Only</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Access analytics dashboards, growth curves, and engagement telemetry.
          </p>
        </div>
      </div>

      {/* Assigned Administrators Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active Administrators ({adminUsers.length})</h2>
          <span className="text-xs text-muted-foreground">
            Protected against demoting the last active Super Admin
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Granted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-xs text-muted-foreground">
                    Loading admin personnel...
                  </td>
                </tr>
              ) : adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-xs text-muted-foreground">
                    No administrative role records found.
                  </td>
                </tr>
              ) : (
                adminUsers.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <BlurbiAvatar
                          emoji={item.user.avatar_emoji}
                          color={item.user.avatar_color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground">
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
                        onClick={() => {
                          manageMutation.mutate({
                            targetUserId: item.user_id,
                            roleId: item.role_id,
                            action: "revoke",
                          });
                        }}
                        disabled={manageMutation.isPending}
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Assign Administrative Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Search Blurber by Username</Label>
              <Input
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="Type username..."
                className="mt-1.5 bg-background text-sm"
              />
            </div>

            {/* Candidate list */}
            {userSearchQuery.data?.users && userSearchQuery.data.users.length > 0 && (
              <div className="rounded-xl border border-border p-2 space-y-1 max-h-36 overflow-y-auto">
                {userSearchQuery.data.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs ${
                      selectedUserId === u.id ? "bg-primary/20 text-primary" : "hover:bg-muted/50"
                    }`}
                  >
                    <span>@{u.username}</span>
                    {selectedUserId === u.id && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label className="text-xs">Role to Assign</Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => setSelectedRole(val as AdminRole)}
              >
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedUserId || manageMutation.isPending}
              onClick={() => {
                if (!selectedUserId) return;
                manageMutation.mutate({
                  targetUserId: selectedUserId,
                  roleId: selectedRole,
                  action: "assign",
                });
              }}
            >
              {manageMutation.isPending ? "Assigning..." : "Confirm Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
