import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/blurbi";

/** The signed-in user's own profile (fetched fresh, RLS-scoped). */
export function useMyProfile() {
  return useQuery<Profile | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data ?? null;
    },
    staleTime: 30_000,
  });
}

export function useQueryClientHelper() {
  return useQueryClient();
}
