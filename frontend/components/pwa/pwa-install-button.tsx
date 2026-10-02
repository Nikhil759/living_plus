"use client";

import { Download, X } from "lucide-react";
import { headerIconButtonClass } from "@/components/layout/header-action-button";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { buttonVariants } from "@/components/ui/button";

export function PwaInstallButton() {
  const { showInstallButton, install, installHint, closeInstallHint } = usePwaInstall();

  if (!showInstallButton) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install Living+ app"
        className={headerIconButtonClass()}
      >
        <Download className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {installHint ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:items-center sm:pb-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-lg ring-1 ring-hairline">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 id="pwa-install-title" className="text-headline text-ink">
                  Install Living+
                </h2>
                {installHint === "ios" ? (
                  <p className="text-body text-ink-secondary">
                    Tap <span className="font-medium text-ink">Share</span>, then{" "}
                    <span className="font-medium text-ink">Add to Home Screen</span> to use
                    Living+ like an app.
                  </p>
                ) : (
                  <p className="text-body text-ink-secondary">
                    In Chrome or Edge, open the browser menu and choose{" "}
                    <span className="font-medium text-ink">Install app</span> or{" "}
                    <span className="font-medium text-ink">Install Living+</span>. On production
                    HTTPS the install prompt may also appear here automatically.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeInstallHint}
                aria-label="Close"
                className={buttonVariants({
                  variant: "secondary",
                  className: "h-9 w-9 p-0",
                })}
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
