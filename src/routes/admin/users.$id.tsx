import { createFileRoute } from "@tanstack/react-router";
import { AdminUserInspectView } from "@/components/admin/admin-user-inspect-view";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({
    meta: [
      { title: "User Intelligence Inspection · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminUserInspectRoute,
});

function AdminUserInspectRoute() {
  const { id } = Route.useParams();
  return <AdminUserInspectView userId={id} />;
}
