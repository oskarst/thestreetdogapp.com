"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const ua = navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isInstalled || dismissed) return null;

  // Nothing to show if no prompt and not iOS
  if (!deferredPrompt && !isIOS) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
        <div className="flex-1">
          <p className="text-sm font-medium">Install Street Dog App</p>
          <p className="text-xs text-muted-foreground">
            Add to home screen for the best experience
          </p>
        </div>
        <Button
          size="sm"
          onClick={isIOS ? () => setShowIOSModal(true) : handleInstall}
        >
          <Download className="mr-1 size-4" />
          Install
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* iOS instructions modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">
              Install on iOS
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>
                1. Tap the <strong>Share</strong> button in Safari (square with
                arrow)
              </li>
              <li>
                2. Scroll down and tap <strong>Add to Home Screen</strong>
              </li>
              <li>
                3. Tap <strong>Add</strong> in the top right
              </li>
            </ol>
            <Button
              className="mt-4 w-full"
              onClick={() => setShowIOSModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
