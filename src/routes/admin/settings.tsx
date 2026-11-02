import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsView } from "@/components/admin/admin-settings-view";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform Settings & Feature Flags · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSettingsRoute,
});

function AdminSettingsRoute() {
  return <AdminSettingsView />;
}
