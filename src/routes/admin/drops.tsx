import { createFileRoute } from "@tanstack/react-router";
import { AdminDropsView } from "@/components/admin/admin-drops-view";

export const Route = createFileRoute("/admin/drops")({
  head: () => ({
    meta: [
      { title: "Drop Content Management · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDropsRoute,
});

function AdminDropsRoute() {
  return <AdminDropsView />;
}
