import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  Cpu,
  Megaphone,
  Sliders,
  Shield,
  FileText,
  Search,
  Menu,
  X,
  ArrowLeft,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { useMyProfile } from "@/hooks/use-my-profile";
import { getCurrentAdminRole, type AdminRole } from "@/lib/admin";
import { AdminSearchDialog } from "./admin-search-dialog";

export type AdminTab =
  | "overview"
  | "users"
  | "drops"
  | "moderation"
  | "analytics"
  | "engine"
  | "announcements"
  | "settings"
  | "roles"
  | "audit";

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  children: ReactNode;
}

export function AdminLayout({ currentTab, onSelectTab, children }: AdminLayoutProps) {
  const { data: me } = useMyProfile();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const { data: adminRole } = useQuery<AdminRole | null>({
    queryKey: ["admin", "my-role", me?.id],
    enabled: !!me,
    queryFn: getCurrentAdminRole,
  });

  // Handle Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchDialogOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("blurbbi-theme", next ? "dark" : "light");
      localStorage.setItem("blurbi-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  const navSections = [
    {
      title: "Operations",
      items: [
        { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
        { id: "users" as const, label: "Users & Safety", icon: Users },
        { id: "drops" as const, label: "Drop Content", icon: MessageSquare },
        { id: "moderation" as const, label: "Moderation Queue", icon: ShieldAlert },
      ],
    },
    {
      title: "Intelligence",
      items: [
        { id: "analytics" as const, label: "Analytics & Trends", icon: BarChart3 },
        { id: "engine" as const, label: "Intelligence Engine", icon: Cpu },
      ],
    },
    {
      title: "Platform",
      items: [
        { id: "announcements" as const, label: "Announcements", icon: Megaphone },
        { id: "settings" as const, label: "Feature Flags & Settings", icon: Sliders },
      ],
    },
    {
      title: "Administration",
      items: [
        { id: "roles" as const, label: "Roles & RBAC", icon: ShieldCheck },
        { id: "audit" as const, label: "Audit Trail", icon: FileText },
      ],
    },
  ];

  const TAB_LABELS: Record<AdminTab, string> = {
    overview: "Overview",
    users: "Users & Safety",
    drops: "Drop Content",
    moderation: "Moderation Queue",
    analytics: "Analytics & Trends",
    engine: "Intelligence Engine",
    announcements: "Announcements",
    settings: "Feature Flags & Settings",
    roles: "Roles & RBAC",
    audit: "Audit Trail",
  };

  const currentTabLabel = TAB_LABELS[currentTab] || "Overview";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Global Search Dialog */}
      <AdminSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectUser={(userId) => {
          onSelectTab("users");
        }}
        onSelectDrop={(dropId) => {
          onSelectTab("drops");
        }}
        onSelectReport={(reportId) => {
          onSelectTab("moderation");
        }}
      />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 z-30 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
                B
              </span>
              <div>
                <span className="font-bold text-sm tracking-tight">Blurbbi Admin</span>
                <span className="block text-[10px] text-muted-foreground uppercase font-mono">
                  Control Center
                </span>
              </div>
            </div>
          ) : (
            <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
              B
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-7 w-7 p-0 text-muted-foreground hidden lg:flex"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
            />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="text-[11px] text-muted-foreground">Admin Mode</span>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono border-primary/40 text-primary"
              >
                {adminRole || "Admin"}
              </Badge>
            </div>
          )}

          <Link to="/" className="w-full">
            <Button
              variant="outline"
              size="sm"
              className={`w-full text-xs h-8 gap-1.5 ${sidebarCollapsed ? "px-0" : ""}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {!sidebarCollapsed && "Return to Stream"}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur px-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Blurbbi</span>
              <span>/</span>
              <span>Admin</span>
              <span>/</span>
              <span className="text-foreground font-medium">{currentTabLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search Shortcut Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchDialogOpen(true)}
              className="h-8 gap-2 text-xs bg-background text-muted-foreground hover:text-foreground font-normal sm:w-60 justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search users, drops...</span>
                <span className="sm:hidden">Search</span>
              </span>
              <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Admin Profile Pill */}
            {me && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <BlurbiAvatar emoji={me.avatar_emoji} color={me.avatar_color} size="sm" />
                <div className="hidden lg:block text-left text-xs min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {me.display_name || me.username}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">@{me.username}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Slideout Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-64 bg-card border-r border-border flex flex-col p-4 z-10">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <span className="font-bold text-sm">Blurbbi Admin</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {navSections.map((sec) => (
                  <div key={sec.title} className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      {sec.title}
                    </div>
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const active = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border">
                <Link to="/">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Return to Stream
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
