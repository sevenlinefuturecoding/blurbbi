import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Trends · Super Admin · Blurbbi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAnalyticsRoute,
});

function AdminAnalyticsRoute() {
  return <AdminAnalyticsView />;
}

