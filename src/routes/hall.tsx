import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useEngagement } from "@/hooks/use-engagement";
import { AppShell } from "@/components/blurbi/app-shell";
import { DropCard } from "@/components/blurbi/drop-card";
import type { FeedDrop } from "@/lib/blurbi";

export const Route = createFileRoute("/hall")({
  head: () => ({
    meta: [
      { title: "Hall of Blurbs · Blurbbi" },
      {
        name: "description",
        content: "The top 50 Drops of the last 7 days, crowned by the crowd.",
      },
      { property: "og:title", content: "Hall of Blurbs · Blurbbi" },
      {
        property: "og:description",
        content: "The top 50 Drops of the last 7 days, crowned by the crowd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hall,
});

async function fetchHall(): Promise<FeedDrop[]> {
  try {
    const { data, error } = await supabase.rpc("hall_of_blurbs");
    if (error) {
      console.warn("Hall RPC error:", error.message);
      return [];
    }
    return (data ?? []) as unknown as FeedDrop[];
  } catch (err) {
    console.warn("Hall RPC exception:", err);
    return [];
  }
}

function Hall() {
  const { data: me } = useMyProfile();
  const hall = useQuery({ queryKey: ["drops", "hall"], queryFn: fetchHall });
  const engagement = useEngagement(
    (hall.data ?? []).map((d) => d.drop_id),
    me?.id,
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Hall of Blurbs</h1>
        </div>
        <p className="px-1 text-sm text-muted-foreground">
          The 50 most-sparked Drops of the last 7 days.
        </p>

        {hall.isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : (hall.data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            The Hall is empty this week. A legend starts with one Drop 👑
          </div>
        ) : (
          <div className="space-y-3">
            {hall.data!.map((d, i) => (
              <DropCard
                key={d.drop_id}
                drop={d}
                rank={i + 1}
                viewerId={me?.id}
                engagement={engagement}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
