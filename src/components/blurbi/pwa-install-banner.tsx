import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { usePwa } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PwaInstallBanner({ className }: { className?: string }) {
  const { canInstall, isStandalone, isIOS, isInstalled, installApp } = usePwa();
  const [dismissed, setDismissed] = useState(true);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isDismissed = localStorage.getItem("blurbbi_pwa_dismissed");
    if (!isDismissed && !isStandalone && !isInstalled) {
      // Show banner after brief delay
      const timer = setTimeout(() => setDismissed(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isStandalone, isInstalled]);

  if (isStandalone || isInstalled || dismissed) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("blurbbi_pwa_dismissed", "true");
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-orange-500/10 via-primary/5 to-card p-3.5 shadow-sm transition-all duration-200",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#E03E1A] shadow-xs">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
              Install Blurbbi App
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Add to your home screen for full-screen & offline access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canInstall ? (
            <Button
              size="sm"
              onClick={installApp}
              className="h-8 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Install
            </Button>
          ) : isIOS ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowIosGuide(!showIosGuide)}
              className="h-8 rounded-full border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              How to install
            </Button>
          ) : null}

          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div className="mt-3 border-t border-primary/15 pt-2.5 text-xs text-foreground/90 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="font-medium text-primary">To install on iPhone or iPad:</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary font-bold text-[10px]">
              1
            </span>
            <span>
              Tap the Safari <strong>Share</strong> button <Share className="inline h-3 w-3" /> in
              the bottom toolbar.
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary font-bold text-[10px]">
              2
            </span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>{" "}
              <PlusSquare className="inline h-3 w-3" />.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
