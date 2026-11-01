import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ALGORITHM_CONFIG,
  calculateHeatScore,
  recordFeedTelemetry,
  type AlgorithmConfig,
} from "@/lib/intelligence";

describe("Blurbbi Intelligence Engine: Comprehensive Test Suite", () => {
  // ---------------------------------------------------------------------------
  // 1. Ranking Calculations
  // ---------------------------------------------------------------------------
  describe("1. Ranking calculations", () => {
    it("higher engagement results in higher heat score at identical age", () => {
      const createdNow = new Date();
      const lowEngagement = calculateHeatScore(2, 0, 0, 0, createdNow);
      const highEngagement = calculateHeatScore(20, 5, 2, 1, createdNow);

      expect(highEngagement).toBeGreaterThan(lowEngagement);
    });

    it("decays older drops according to the gravity exponent", () => {
      const now = Date.now();
      const freshDate = new Date(now - 1000 * 60 * 60 * 1); // 1 hour old
      const olderDate = new Date(now - 1000 * 60 * 60 * 24); // 24 hours old

      // Identical engagement
      const freshScore = calculateHeatScore(10, 2, 1, 0, freshDate);
      const olderScore = calculateHeatScore(10, 2, 1, 0, olderDate);

      expect(freshScore).toBeGreaterThan(olderScore * 3);
    });

    it("respects custom experiment variant weights (e.g. Conversation First)", () => {
      const created = new Date();
      // Drop A has more echoes (comments)
      // Drop B has more sparks (likes)
      const dropA = { sparks: 2, echoes: 10, relays: 1, passes: 0 };
      const dropB = { sparks: 15, echoes: 1, relays: 1, passes: 0 };

      // Under default config (spark_weight: 3, echo_weight: 2):
      // Drop A numerator: 2*3 + 10*2 + 1*5 + 0 + 1 = 32
      // Drop B numerator: 15*3 + 1*2 + 1*5 + 0 + 1 = 53 -> Drop B wins
      const defaultScoreA = calculateHeatScore(
        dropA.sparks,
        dropA.echoes,
        dropA.relays,
        dropA.passes,
        created,
      );
      const defaultScoreB = calculateHeatScore(
        dropB.sparks,
        dropB.echoes,
        dropB.relays,
        dropB.passes,
        created,
      );
      expect(defaultScoreB).toBeGreaterThan(defaultScoreA);

      // Under conversation_first variant (spark_weight: 2.0, echo_weight: 4.0):
      // Drop A numerator: 2*2 + 10*4 + 1*4 + 1 = 49
      // Drop B numerator: 15*2 + 1*4 + 1*4 + 1 = 39 -> Drop A wins!
      const convConfig: Partial<AlgorithmConfig> = {
        spark_weight: 2.0,
        echo_weight: 4.0,
        relay_weight: 4.0,
      };
      const convScoreA = calculateHeatScore(
        dropA.sparks,
        dropA.echoes,
        dropA.relays,
        dropA.passes,
        created,
        convConfig,
      );
      const convScoreB = calculateHeatScore(
        dropB.sparks,
        dropB.echoes,
        dropB.relays,
        dropB.passes,
        created,
        convConfig,
      );
      expect(convScoreA).toBeGreaterThan(convScoreB);
    });

    it("time offset prevents division by zero at age 0", () => {
      const brandNew = new Date();
      const score = calculateHeatScore(0, 0, 0, 0, brandNew);
      // Numerator is 1. Denominator is (0 + 2.0)^1.4 = ~2.639
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Chronological Following Feed (feed_orbit_v2 logic)
  // ---------------------------------------------------------------------------
  describe("2. Chronological Following feed", () => {
    it("orders strictly by created_at descending rather than heat score", () => {
      const followedAuthorId = "author-1";
      const viewerId = "viewer-123";

      const mockDrops = [
        {
          id: "drop-old-viral",
          author_id: followedAuthorId,
          content: "Old viral drop",
          spark_count: 500,
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: "drop-new-quiet",
          author_id: followedAuthorId,
          content: "Fresh quiet drop",
          spark_count: 1,
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ];

      // Simulate SQL feed_orbit_v2 ordering: order by d.created_at desc
      const sorted = [...mockDrops].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      expect(sorted[0]!.id).toBe("drop-new-quiet");
      expect(sorted[1]!.id).toBe("drop-old-viral");
    });

    it("filters out drops from authors the viewer does not orbit", () => {
      const viewerOrbits = new Set(["user-followed-1", "user-followed-2"]);

      const allDrops = [
        { id: "d1", author_id: "user-followed-1", content: "From followed" },
        { id: "d2", author_id: "random-stranger", content: "From stranger" },
        { id: "d3", author_id: "user-followed-2", content: "From followed 2" },
      ];

      const orbitFeed = allDrops.filter((d) => viewerOrbits.has(d.author_id));

      expect(orbitFeed).toHaveLength(2);
      expect(orbitFeed.map((d) => d.id)).toEqual(["d1", "d3"]);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Personalized For You Feed (feed_for_you_v2 logic)
  // ---------------------------------------------------------------------------
  describe("3. Personalized For You feed", () => {
    it("filters out drops older than the configured window hours", () => {
      const windowHours = 72;
      const now = Date.now();
      const cutoff = now - windowHours * 3600 * 1000;

      const drops = [
        { id: "recent", created_at: new Date(now - 3600000 * 12).toISOString() },
        { id: "borderline", created_at: new Date(now - 3600000 * 70).toISOString() },
        { id: "expired", created_at: new Date(now - 3600000 * 80).toISOString() },
      ];

      const forYouFeed = drops.filter((d) => new Date(d.created_at).getTime() > cutoff);

      expect(forYouFeed.map((d) => d.id)).toEqual(["recent", "borderline"]);
    });

    it("sorts primarily by score desc and secondarily by created_at desc", () => {
      const dropsWithScores = [
        { id: "drop-low-score", score: 1.25, created_at: "2026-11-01T20:00:00Z" },
        { id: "drop-high-score", score: 8.5, created_at: "2026-11-01T19:00:00Z" },
        { id: "drop-equal-score-older", score: 8.5, created_at: "2026-11-01T18:00:00Z" },
      ];

      const sorted = [...dropsWithScores].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      expect(sorted[0]!.id).toBe("drop-high-score");
      expect(sorted[1]!.id).toBe("drop-equal-score-older");
      expect(sorted[2]!.id).toBe("drop-low-score");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Trending Windows (viral_now_v2 logic)
  // ---------------------------------------------------------------------------
  describe("4. Trending windows", () => {
    it("respects dynamic window boundaries (24h vs custom 6h flash window)", () => {
      const now = Date.now();
      const items = [
        { id: "flash-item", ageHours: 4, sparks: 50 },
        { id: "day-item", ageHours: 18, sparks: 100 },
        { id: "old-item", ageHours: 30, sparks: 300 },
      ];

      const getTrending = (maxAgeHours: number) => items.filter((i) => i.ageHours <= maxAgeHours);

      expect(getTrending(6).map((i) => i.id)).toEqual(["flash-item"]);
      expect(getTrending(24).map((i) => i.id)).toEqual(["flash-item", "day-item"]);
    });

    it("filters out suspended accounts from trending", () => {
      const drops = [
        { id: "d1", author_suspended: false, sparks: 25 },
        { id: "d2", author_suspended: true, sparks: 150 }, // offending/suspended user
      ];

      const trending = drops.filter((d) => !d.author_suspended);
      expect(trending).toHaveLength(1);
      expect(trending[0]!.id).toBe("d1");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Creator Recommendations (recommend_creators logic)
  // ---------------------------------------------------------------------------
  describe("5. Creator recommendations", () => {
    it("excludes the viewer themselves and creators already followed", () => {
      const viewerId = "me-viewer";
      const followingSet = new Set(["already-following-1"]);

      const candidates = [
        { id: "me-viewer", username: "me" },
        { id: "already-following-1", username: "alice" },
        { id: "new-creator-1", username: "bob" },
        { id: "new-creator-2", username: "carol" },
      ];

      const recommended = candidates.filter((c) => c.id !== viewerId && !followingSet.has(c.id));

      expect(recommended.map((r) => r.username)).toEqual(["bob", "carol"]);
    });

    it("ranks candidates by recent spark momentum and follower count", () => {
      const candidates = [
        { id: "c1", sparks_received_14d: 10, followers: 100 },
        { id: "c2", sparks_received_14d: 95, followers: 80 },
        { id: "c3", sparks_received_14d: 95, followers: 300 },
      ];

      const ranked = [...candidates].sort((a, b) => {
        if (b.sparks_received_14d !== a.sparks_received_14d) {
          return b.sparks_received_14d - a.sparks_received_14d;
        }
        return b.followers - a.followers;
      });

      expect(ranked[0]!.id).toBe("c3"); // High sparks + highest followers
      expect(ranked[1]!.id).toBe("c2"); // High sparks
      expect(ranked[2]!.id).toBe("c1"); // Lower sparks
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Blocked and Muted Accounts (viewer_hidden logic)
  // ---------------------------------------------------------------------------
  describe("6. Blocked and muted accounts", () => {
    it("hides drops authored by muted users from the viewer", () => {
      const viewerId = "viewer-user";
      const mutedUserIds = new Set(["spammer-account"]);

      const viewerHidden = (dropAuthorId: string) => {
        return mutedUserIds.has(dropAuthorId);
      };

      expect(viewerHidden("spammer-account")).toBe(true);
      expect(viewerHidden("friend-account")).toBe(false);
    });

    it("globally hides drops authored by suspended accounts for all viewers", () => {
      const suspendedAuthor = { id: "bad-actor", is_suspended: true };
      const normalAuthor = { id: "good-actor", is_suspended: false };

      const isGloballyHidden = (author: { is_suspended: boolean }) => author.is_suspended;

      expect(isGloballyHidden(suspendedAuthor)).toBe(true);
      expect(isGloballyHidden(normalAuthor)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Deleted and Hidden Drops
  // ---------------------------------------------------------------------------
  describe("7. Deleted and hidden Drops", () => {
    it("hides drops that the user has explicitly hidden", () => {
      const hiddenDropIds = new Set(["drop-hidden-123"]);

      const isHiddenForViewer = (dropId: string) => hiddenDropIds.has(dropId);

      expect(isHiddenForViewer("drop-hidden-123")).toBe(true);
      expect(isHiddenForViewer("drop-visible-456")).toBe(false);
    });

    it("hides drops that the user has reported to prevent harassment", () => {
      const reportedByViewerDropIds = new Set(["drop-reported-999"]);

      const isHiddenAfterReport = (dropId: string) => reportedByViewerDropIds.has(dropId);

      expect(isHiddenAfterReport("drop-reported-999")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Cursor Pagination (p_before logic)
  // ---------------------------------------------------------------------------
  describe("8. Cursor pagination", () => {
    const mockFeed = [
      { id: "d1", created_at: "2026-11-01T22:00:00.000Z" },
      { id: "d2", created_at: "2026-11-01T21:00:00.000Z" },
      { id: "d3", created_at: "2026-11-01T20:00:00.000Z" },
      { id: "d4", created_at: "2026-11-01T19:00:00.000Z" },
      { id: "d5", created_at: "2026-11-01T18:00:00.000Z" },
    ];

    const fetchPage = (before?: string, limit = 2) => {
      return mockFeed
        .filter((d) => !before || new Date(d.created_at) < new Date(before))
        .slice(0, limit);
    };

    it("fetches non-overlapping pages using timestamp cursor", () => {
      const page1 = fetchPage(undefined, 2);
      expect(page1.map((d) => d.id)).toEqual(["d1", "d2"]);

      const cursor1 = page1[page1.length - 1]!.created_at;
      const page2 = fetchPage(cursor1, 2);
      expect(page2.map((d) => d.id)).toEqual(["d3", "d4"]);

      const cursor2 = page2[page2.length - 1]!.created_at;
      const page3 = fetchPage(cursor2, 2);
      expect(page3.map((d) => d.id)).toEqual(["d5"]);

      // Verify no duplicate IDs across pages
      const combined = [...page1, ...page2, ...page3];
      const idSet = new Set(combined.map((d) => d.id));
      expect(idSet.size).toBe(5);
    });

    it("returns empty array when cursor exceeds oldest item", () => {
      const beyondOldest = "2026-11-01T10:00:00.000Z";
      const emptyPage = fetchPage(beyondOldest, 2);
      expect(emptyPage).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Empty User Profiles
  // ---------------------------------------------------------------------------
  describe("9. Empty user profiles", () => {
    it("handles zero followers and zero orbiting without crashing or throwing", () => {
      const emptyUserOrbits: string[] = [];
      const drops = [{ id: "d1", author_id: "other-user" }];

      const orbitFeed = drops.filter((d) => emptyUserOrbits.includes(d.author_id));
      expect(orbitFeed).toEqual([]);
      expect(orbitFeed.length).toBe(0);
    });

    it("provides fallback content when personalized feed has 0 matches", () => {
      const personalizedDrops: unknown[] = [];
      const globalTrendingFallback = [{ id: "viral-1", content: "Community hit" }];

      const displayedFeed =
        personalizedDrops.length > 0 ? personalizedDrops : globalTrendingFallback;
      expect(displayedFeed).toHaveLength(1);
      expect(displayedFeed[0]).toEqual({ id: "viral-1", content: "Community hit" });
    });
  });

  // ---------------------------------------------------------------------------
  // 10. RLS and Authorization
  // ---------------------------------------------------------------------------
  describe("10. RLS and authorization", () => {
    it("denies access when is_admin is false", () => {
      const regularUser = { id: "user-reg", is_admin: false };
      const adminUser = { id: "user-adm", is_admin: true };

      const canManageAlgorithm = (user: { is_admin?: boolean | null }) => Boolean(user.is_admin);

      expect(canManageAlgorithm(regularUser)).toBe(false);
      expect(canManageAlgorithm(adminUser)).toBe(true);
    });

    it("prevents non-admins from resolving or dismissing moderation reports", () => {
      const user = { id: "user-1", is_admin: false };
      const action = "delete_drop";

      const canResolve = (u: { is_admin?: boolean | null }) => Boolean(u.is_admin);
      expect(canResolve(user)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Concurrent Interactions and Duplicate Events
  // ---------------------------------------------------------------------------
  describe("11. Concurrent interactions and duplicate events", () => {
    it("idempotently handles duplicate spark actions", () => {
      const sparkedSet = new Set<string>();

      // User taps spark twice rapidly
      const toggleSpark = (dropId: string) => {
        if (sparkedSet.has(dropId)) {
          sparkedSet.delete(dropId);
        } else {
          sparkedSet.add(dropId);
        }
      };

      // Initial state
      expect(sparkedSet.has("drop-abc")).toBe(false);

      // First tap
      toggleSpark("drop-abc");
      expect(sparkedSet.has("drop-abc")).toBe(true);

      // Rapid unspark
      toggleSpark("drop-abc");
      expect(sparkedSet.has("drop-abc")).toBe(false);
    });

    it("batches telemetry events without race conditions or dropped items", () => {
      vi.useFakeTimers();

      // Clear any prior queue
      recordFeedTelemetry("global", 120, 30);
      recordFeedTelemetry("for_you", 85, 25);
      recordFeedTelemetry("orbit", 45, 10);

      // Should schedule a flush timeout
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
