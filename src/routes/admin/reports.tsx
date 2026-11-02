import { createFileRoute } from "@tanstack/react-router";
import { AdminModerationView } from "@/components/admin/admin-moderation-view";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "User Reports · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReportsRoute,
});

function AdminReportsRoute() {
  return <AdminModerationView />;
}
