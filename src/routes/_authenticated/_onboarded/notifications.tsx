import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, MessageCircle, Repeat2, UserPlus, CheckCheck, Bell, AtSign } from "lucide-react";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/blurbi";

export const Route = createFileRoute("/_authenticated/_onboarded/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Blurbbi" },
      {
        name: "description",
        content: "Stay updated with your latest sparks, echoes, relays, and orbits on Blurbbi.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, isMarkingAllAsRead } =
    useNotifications();
  const [filter, setFilter] = useState<"all" | "spark" | "echo" | "orbit">("all");
  const navigate = useNavigate();

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "spark") return n.type === "spark" || n.type === "relay";
    return n.type === filter;
  });

  function handleNotificationClick(n: NotificationItem) {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.drop_id) {
      navigate({ to: "/drop/$id", params: { id: n.drop_id } });
    } else if (n.actor?.username) {
      navigate({ to: "/u/$username", params: { username: n.actor.username } });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="rounded-full gap-1.5 text-xs font-medium"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="grid w-full grid-cols-4 rounded-full bg-secondary/60 p-1">
          <TabsTrigger value="all" className="rounded-full text-xs font-medium">
            All
          </TabsTrigger>
          <TabsTrigger value="spark" className="rounded-full text-xs font-medium">
            Sparks
          </TabsTrigger>
          <TabsTrigger value="echo" className="rounded-full text-xs font-medium">
            Echoes
          </TabsTrigger>
          <TabsTrigger value="orbit" className="rounded-full text-xs font-medium">
            Orbits
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border/40 p-4 animate-pulse bg-card/40"
            >
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
            <Bell className="h-6 w-6" />
          </div>
          <h2 className="font-display font-semibold text-foreground">No notifications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
            {filter === "all"
              ? "When blurbers spark, echo, or orbit you, you'll see them right here."
              : `No ${filter} notifications found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition-colors cursor-pointer ${
                item.read
                  ? "border-border/60 bg-card/60 hover:bg-card hover:border-border"
                  : "border-primary/30 bg-primary/5 hover:bg-primary/10"
              }`}
            >
              {/* Type Badge & Actor Avatar */}
              <div className="relative shrink-0">
                {item.actor ? (
                  <BlurbiAvatar
                    emoji={item.actor.avatar_emoji}
                    color={item.actor.avatar_color}
                    size="md"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    ?
                  </div>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-background ${
                    item.type === "spark"
                      ? "bg-amber-500"
                      : item.type === "echo"
                        ? "bg-sky-500"
                        : item.type === "relay"
                          ? "bg-emerald-500"
                          : item.type === "mention"
                            ? "bg-primary"
                            : "bg-indigo-500"
                  }`}
                >
                  {item.type === "spark" && <Flame className="h-3 w-3 fill-current" />}
                  {item.type === "echo" && <MessageCircle className="h-3 w-3 fill-current" />}
                  {item.type === "relay" && <Repeat2 className="h-3 w-3 stroke-[2.5]" />}
                  {item.type === "orbit" && <UserPlus className="h-3 w-3" />}
                  {item.type === "mention" && <AtSign className="h-3 w-3" />}
                </div>
              </div>

              {/* Notification Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <Link
                      to="/u/$username"
                      params={{ username: item.actor?.username ?? "" }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {item.actor?.display_name || item.actor?.username || "Someone"}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      {item.type === "spark" && "sparked your Drop"}
                      {item.type === "echo" && "echoed on your Drop"}
                      {item.type === "relay" && "relayed your Drop"}
                      {item.type === "orbit" && "started orbiting you"}
                      {item.type === "mention" && "mentioned you in a Drop"}
                    </span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(item.created_at)}
                  </span>
                </div>

                {/* Drop content preview snippet */}
                {item.drop?.content && (
                  <p className="mt-1.5 line-clamp-2 rounded-xl border border-border/40 bg-secondary/50 px-3 py-2 text-xs font-normal text-foreground/80">
                    {item.drop.content}
                  </p>
                )}
              </div>

              {/* Unread dot */}
              {!item.read && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
