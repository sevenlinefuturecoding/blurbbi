import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function serverSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== "undefined" || typeof process === "undefined") return undefined;
  const serverUrl = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
  const serverKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
  if (!serverUrl || serverUrl === publicUrl || serverKey !== supabaseKey) return undefined;
  return serverUrl;
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, "");
  const serverUrl = serverSupabaseUrl(publicUrl, supabaseKey);
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    if (serverUrl) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(`${publicUrl}/`)) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request =
          typeof input === "string" || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const SUPABASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
    (typeof process !== "undefined" &&
      (process.env?.["VITE_SUPABASE_URL"] || process.env?.["SUPABASE_URL"]));

  const SUPABASE_KEY =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        import.meta.env?.["VITE_SUPABASE_ANON_KEY"])) ||
    (typeof process !== "undefined" &&
      (process.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env?.["SUPABASE_PUBLISHABLE_KEY"] ||
        process.env?.["VITE_SUPABASE_ANON_KEY"] ||
        process.env?.["SUPABASE_ANON_KEY"]));

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL / VITE_SUPABASE_URL"] : []),
      ...(!SUPABASE_KEY
        ? ["SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY / ANON_KEY"]
        : []),
    ];
    const message = `Missing Supabase configuration: ${missing.join(", ")}. Please verify your .env file.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_URL, SUPABASE_KEY),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
