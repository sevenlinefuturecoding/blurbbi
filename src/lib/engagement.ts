import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Invalidate cached feed + engagement data after any write. */
export function refreshAfterEngagement(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["drops"] }),
    qc.invalidateQueries({ queryKey: ["engagement"] }),
    qc.invalidateQueries({ queryKey: ["drop"] }),
    qc.invalidateQueries({ queryKey: ["profile-drops"] }),
    qc.invalidateQueries({ queryKey: ["me"] }),
  ]);
}

export async function toggleSpark(dropId: string, active: boolean, userId: string) {
  if (active) {
    const { error } = await supabase
      .from("sparks")
      .delete()
      .eq("drop_id", dropId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("sparks")
      .upsert(
        { drop_id: dropId, user_id: userId },
        { onConflict: "drop_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  }
}

export async function toggleRelay(dropId: string, active: boolean, userId: string) {
  if (active) {
    const { error } = await supabase
      .from("relays")
      .delete()
      .eq("drop_id", dropId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("relays")
      .upsert(
        { drop_id: dropId, user_id: userId },
        { onConflict: "drop_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  }
}

/** Pass = copy the link to a Drop and count the share. */
export async function addPass(dropId: string, userId: string) {
  const { error } = await supabase
    .from("passes")
    .upsert(
      { drop_id: dropId, user_id: userId },
      { onConflict: "drop_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function toggleOrbit(followedId: string, active: boolean, followerId: string) {
  if (active) {
    const { error } = await supabase
      .from("orbits")
      .delete()
      .eq("followed_id", followedId)
      .eq("follower_id", followerId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("orbits")
      .upsert(
        { followed_id: followedId, follower_id: followerId },
        { onConflict: "follower_id,followed_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  }
}

export async function reportDrop(input: {
  dropId: string;
  reporterId: string;
  reason: string;
  note?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    drop_id: input.dropId,
    reporter_id: input.reporterId,
    reason: input.reason,
    note: input.note?.trim() || null,
  });
  if (error) {
    if (error.message.includes("duplicate key")) return; // already reported
    throw new Error(error.message);
  }
}

export async function hideDrop(dropId: string, userId: string) {
  const { error } = await supabase
    .from("hides")
    .upsert(
      { drop_id: dropId, user_id: userId },
      { onConflict: "drop_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function muteUser(mutedId: string, userId: string) {
  const { error } = await supabase
    .from("mutes")
    .upsert(
      { muted_id: mutedId, user_id: userId },
      { onConflict: "user_id,muted_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function deleteDrop(dropId: string) {
  const { error } = await supabase.from("drops").delete().eq("id", dropId);
  if (error) throw new Error(error.message);
}
