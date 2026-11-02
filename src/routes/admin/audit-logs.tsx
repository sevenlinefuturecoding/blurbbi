import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditLogsView } from "@/components/admin/admin-audit-logs-view";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Trail · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAuditLogsRoute,
});

function AdminAuditLogsRoute() {
  return <AdminAuditLogsView />;
}
