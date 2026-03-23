"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 3;

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const expiry = parseInt(val, 10);
  if (Date.now() > expiry) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

function setDismissed() {
  localStorage.setItem(
    DISMISS_KEY,
    String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissedState] = useState(true); // start hidden

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check localStorage dismissal
    if (isDismissed()) return;
    setDismissedState(false);

    const ua = navigator.userAgent;

    // Detect iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Detect Safari (including macOS Safari)
    const isSafariBrowser =
      /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

    setIsSafari(isIOS || isSafariBrowser);
    setIsMobile(isIOS || /Android/i.test(ua));

    // Listen for Chrome/Edge install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isSafari) return null;

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

  function handleDismiss() {
    setDismissed();
    setDismissedState(true);
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
        <div className="flex-1">
          <p className="text-sm font-medium">Install The Street Dog App</p>
          <p className="text-xs text-muted-foreground">
            {isSafari
              ? "Add to home screen for the best experience"
              : "Install for quick access and offline use"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={isSafari ? () => setShowInstructions(true) : handleInstall}
        >
          <Download className="mr-1 size-4" />
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Safari instructions modal */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-semibold">
              {isMobile ? "Install on iOS" : "Install on Mac"}
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {isMobile ? (
                <>
                  <li className="flex items-start gap-2">
                    <span>1.</span>
                    <span>
                      Tap the <Share className="inline size-4 -mt-0.5" />{" "}
                      <strong>Share</strong> button in Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>2.</span>
                    <span>
                      Scroll down and tap <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>3.</span>
                    <span>
                      Tap <strong>Add</strong> in the top right
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span>1.</span>
                    <span>
                      In the Safari menu bar, click <strong>File</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>2.</span>
                    <span>
                      Click <strong>Add to Dock</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>3.</span>
                    <span>
                      Click <strong>Add</strong> to confirm
                    </span>
                  </li>
                </>
              )}
            </ol>
            <Button
              className="mt-4 w-full"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
