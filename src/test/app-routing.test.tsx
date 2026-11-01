import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("serves the public browse pages without sign-in (Hall, profile, Drop, Search)", () => {
    for (const path of [
      "/hall",
      "/search",
      "/u/mara",
      "/drop/00000000-0000-0000-0000-000000000000",
    ]) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, `guest route ${path}`).not.toBe(rootRouteId);
      expect(matches.at(-1)?.routeId, `guest route ${path}`).not.toContain("_authenticated");
    }
  });

  it("keeps settings members-only", () => {
    const matches = router.matchRoutes("/settings");
    expect(matches.map((m) => m.routeId)).toContain("/_authenticated");
  });
});
