import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts all unique @mentions from text.
 * e.g. "Hello @alice and @bob!" -> ["alice", "bob"]
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]{3,20})/g);
  if (!matches) return [];
  const unique = new Set(matches.map((m) => m.slice(1).toLowerCase()));
  return Array.from(unique);
}

/**
 * Sends in-app mention notifications to all mentioned users in a drop or echo.
 */
export async function notifyMentions(
  dropId: string,
  content: string,
  actorId: string,
): Promise<void> {
  const mentions = extractMentions(content);
  if (mentions.length === 0) return;

  try {
    // 1. Try notify_mentions RPC
    const { error: rpcErr } = await supabase.rpc(
      "notify_mentions" as never,
      {
        p_drop_id: dropId,
        p_content: content,
      } as never,
    );

    if (!rpcErr) return;
  } catch {
    /* fallback to direct lookup */
  }

  // 2. Direct lookup fallback
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", mentions);

    if (!profiles || profiles.length === 0) return;

    const notifs = profiles
      .filter((p) => p.id !== actorId)
      .map((p) => ({
        user_id: p.id,
        actor_id: actorId,
        type: "mention",
        drop_id: dropId,
      }));

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs as never);
    }
  } catch (err) {
    console.warn("Failed to notify mentioned users:", err);
  }
}
