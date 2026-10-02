"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type InstallHintKind = "ios" | "desktop";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const ipadOs =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints > 1
      : false;
  return (ios || ipadOs) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [ready, setReady] = useState(false);
  const [installHint, setInstallHint] = useState<InstallHintKind | null>(null);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setReady(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  /** Always show in the header unless the app is already running installed. */
  const showInstallButton = ready && !isStandalone;

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (isIosSafari()) {
      setInstallHint("ios");
      return;
    }
    setInstallHint("desktop");
  }, [deferredPrompt]);

  return {
    showInstallButton,
    install,
    installHint,
    closeInstallHint: () => setInstallHint(null),
  };
}
