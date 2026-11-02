import { createFileRoute } from "@tanstack/react-router";
import { AdminRolesView } from "@/components/admin/admin-roles-view";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & RBAC Permissions · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRolesRoute,
});

function AdminRolesRoute() {
  return <AdminRolesView />;
}
