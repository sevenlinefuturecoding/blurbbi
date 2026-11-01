import { createFileRoute } from "@tanstack/react-router";
import { AdminModerationView } from "@/components/admin/admin-moderation-view";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation Queue · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminModerationRoute,
});

function AdminModerationRoute() {
  return <AdminModerationView />;
}

