import { createFileRoute } from "@tanstack/react-router";
import { AdminAdminsView } from "@/components/admin/admin-admins-view";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [
      { title: "Admin Personnel & Invitations · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAdminsRoute,
});

function AdminAdminsRoute() {
  return <AdminAdminsView />;
}
