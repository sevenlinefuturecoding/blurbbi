import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewView } from "@/components/admin/admin-overview-view";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview · Super Admin Control Center · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOverviewRoute,
});

function AdminOverviewRoute() {
  return <AdminOverviewView />;
}

