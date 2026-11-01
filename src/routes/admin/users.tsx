import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersView } from "@/components/admin/admin-users-view";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Safety · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminUsersRoute,
});

function AdminUsersRoute() {
  return <AdminUsersView />;
}

