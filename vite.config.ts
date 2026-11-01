import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { resolve } from "node:path";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Populate process.env for Node.js SSR and server functions
  Object.assign(process.env, env);

  const envDefines: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith("VITE_") || k.startsWith("SUPABASE_")) {
      envDefines[`process.env.${k}`] = JSON.stringify(v);
      envDefines[`import.meta.env.${k}`] = JSON.stringify(v);
    }
  }

  return {
    define: envDefines,
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      viteReact(),
      ...(command === "build"
        ? [
            nitro({
              defaultPreset: "cloudflare-module",
            }),
          ]
        : []),
    ],
  };
});
