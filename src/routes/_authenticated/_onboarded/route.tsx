import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/blurbi/app-shell";

export const Route = createFileRoute("/_authenticated/_onboarded")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
