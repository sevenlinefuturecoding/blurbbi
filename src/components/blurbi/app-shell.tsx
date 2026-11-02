import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Trophy,
  Plus,
  User,
  Settings2,
  LogOut,
  Moon,
  Sun,
  LogIn,
  Bell,
  Search,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useUnreadNotificationsCount } from "@/hooks/use-notifications";
import { usePwa } from "@/hooks/use-pwa";
import { Composer } from "./composer";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMyProfile();
  const unreadCount = useUnreadNotificationsCount();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = useState(false);
  const { canInstall, installApp } = usePwa();
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

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

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function compose() {
    if (me) setComposeOpen(true);
    else navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/" as const, label: "Home", icon: Home },
    { to: "/search" as const, label: "Search & Explore", icon: Search },
    ...(me
      ? [
          {
            to: "/notifications" as const,
            label: "Notifications",
            icon: Bell,
            badge: unreadCount,
          },
        ]
      : []),
    { to: "/hall" as const, label: "Hall of Blurbs", icon: Trophy },
    ...(me ? [{ to: "/settings" as const, label: "Settings", icon: Settings2 }] : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-0.5 border-r border-border bg-background px-3 py-6 md:flex">
        <Link
          to="/"
          className="mb-6 px-3 font-display text-2xl font-bold tracking-tight text-foreground"
        >
          blurbbi
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
            {"badge" in item && Boolean(item.badge) && item.badge! > 0 && (
              <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        ))}
        {me && (
          <Link
            to="/u/$username"
            params={{ username: me.username }}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
          >
            <User className="h-5 w-5 shrink-0" />
            <span className="truncate">Self</span>
          </Link>
        )}
        <Button className="mt-5 w-full rounded-full py-2.5 font-semibold" onClick={compose}>
          <Plus className="h-4 w-4" /> New Drop
        </Button>
        <div className="mt-auto flex flex-col gap-0.5">
          {canInstall && (
            <button
              onClick={installApp}
              className="flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 mb-1"
            >
              <Download className="h-5 w-5 shrink-0" />
              <span className="truncate">Install App</span>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            {dark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          {me ? (
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogIn className="h-5 w-5 shrink-0" /> Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-13 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:hidden">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          blurbbi
        </Link>
        <div className="flex items-center gap-2">
          {!me ? (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          ) : null}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 sm:px-4 pb-28 pt-3 sm:pt-5 md:pl-[280px] md:pr-8 md:pb-12 md:pt-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border/70 bg-background/90 px-1 pb-safe backdrop-blur-md md:hidden">
        <Link
          to="/"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "text-primary font-semibold" }}
        >
          <Home className="h-5 w-5" />
          Home
        </Link>

        <Link
          to="/search"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "text-primary font-semibold" }}
        >
          <Search className="h-5 w-5" />
          Search
        </Link>

        <div className="flex flex-1 items-center justify-center py-0.5">
          <button
            onClick={compose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-all active:scale-90 hover:scale-105"
            aria-label="Create Drop"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {me ? (
          <Link
            to="/notifications"
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            Alerts
          </Link>
        ) : (
          <Link
            to="/hall"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <Trophy className="h-5 w-5" />
            Hall
          </Link>
        )}

        {me ? (
          <Link
            to="/u/$username"
            params={{ username: me.username }}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <User className="h-5 w-5" />
            Self
          </Link>
        ) : (
          <Link
            to="/auth"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogIn className="h-5 w-5" />
            Sign in
          </Link>
        )}
      </nav>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="rounded-3xl p-0">
          <DialogTitle className="px-5 pt-5 text-lg font-semibold">New Drop</DialogTitle>
          <div className="p-4">
            {me ? (
              <Composer
                userId={me.id}
                autoFocus
                onPosted={() => {
                  setComposeOpen(false);
                  qc.invalidateQueries({ queryKey: ["drops"] });
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
