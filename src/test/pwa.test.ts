import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Route } from "@/routes/__root";

describe("Progressive Web App (PWA) Configuration", () => {
  const publicDir = path.resolve(process.cwd(), "public");

  describe("Web App Manifest", () => {
    it("has valid manifest.webmanifest with essential PWA properties", () => {
      const manifestPath = path.join(publicDir, "manifest.webmanifest");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe("Blurbbi — Minimal Social Drops");
      expect(manifest.short_name).toBe("Blurbbi");
      expect(manifest.start_url).toBe("/");
      expect(manifest.display).toBe("standalone");
      expect(manifest.theme_color).toBe("#FF6B4A");
      expect(manifest.background_color).toBe("#0a0a0c");
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
    });

    it("ensures all icons declared in manifest exist on disk and have valid sizes", () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(publicDir, "manifest.webmanifest"), "utf-8"),
      );

      for (const icon of manifest.icons) {
        const iconPath = path.join(publicDir, icon.src.replace(/^\//, ""));
        expect(fs.existsSync(iconPath), `Icon not found: ${icon.src}`).toBe(true);
        const stats = fs.statSync(iconPath);
        expect(stats.size).toBeGreaterThan(500); // Must be a valid image file
      }

      // Check apple-touch-icon.png specifically
      const appleTouchIcon = path.join(publicDir, "apple-touch-icon.png");
      expect(fs.existsSync(appleTouchIcon)).toBe(true);
    });

    it("declares app shortcuts for fast navigation", () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(publicDir, "manifest.webmanifest"), "utf-8"),
      );
      expect(Array.isArray(manifest.shortcuts)).toBe(true);
      const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
      expect(urls).toContain("/");
      expect(urls).toContain("/search");
    });
  });

  describe("Service Worker & Offline Fallback", () => {
    it("has a valid service worker (public/sw.js)", () => {
      const swPath = path.join(publicDir, "sw.js");
      expect(fs.existsSync(swPath)).toBe(true);
      const swCode = fs.readFileSync(swPath, "utf-8");

      expect(swCode).toContain('addEventListener("install"');
      expect(swCode).toContain('addEventListener("activate"');
      expect(swCode).toContain('addEventListener("fetch"');
      expect(swCode).toContain("/offline.html");
      expect(swCode).toContain("skipWaiting");
      expect(swCode).toContain("clients.claim");
    });

    it("has an offline fallback page (public/offline.html)", () => {
      const offlinePath = path.join(publicDir, "offline.html");
      expect(fs.existsSync(offlinePath)).toBe(true);
      const html = fs.readFileSync(offlinePath, "utf-8");

      expect(html.toLowerCase()).toContain("<!doctype html>");
      expect(html).toContain("Offline");
      expect(html).toContain("reconnecting");
    });
  });

  describe("HTML Head Metadata", () => {
    it("includes PWA meta tags and link rels in root route", () => {
      const head = Route.options.head;
      expect(typeof head).toBe("function");

      const headResult = (
        head as () => {
          meta?: Array<{ name?: string; content?: string; property?: string }>;
          links?: Array<{ rel?: string; href?: string }>;
        }
      )();
      const meta = headResult.meta ?? [];
      const links = headResult.links ?? [];

      // Manifest link
      const manifestLink = links.find((l) => l.rel === "manifest");
      expect(manifestLink).toBeDefined();
      expect(manifestLink?.href).toBe("/manifest.webmanifest");

      // Apple touch icon link
      const appleTouchIcon = links.find((l) => l.rel === "apple-touch-icon");
      expect(appleTouchIcon).toBeDefined();
      expect(appleTouchIcon?.href).toBe("/apple-touch-icon.png");

      // Mobile web app capability
      const mobileWebApp = meta.find((m) => m.name === "mobile-web-app-capable");
      expect(mobileWebApp?.content).toBe("yes");

      const appleCapable = meta.find((m) => m.name === "apple-mobile-web-app-capable");
      expect(appleCapable?.content).toBe("yes");

      const themeColor = meta.find((m) => m.name === "theme-color");
      expect(themeColor?.content).toBe("#FF6B4A");
    });
  });
});
