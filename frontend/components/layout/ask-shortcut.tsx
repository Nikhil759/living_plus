"use client";

import { useEffect } from "react";
import { useSaarthi } from "@/components/saarthi/saarthi-provider";

/** Cmd/Ctrl+K opens or closes Saarthi from anywhere in the app. */
export function AskShortcut() {
  const { toggle } = useSaarthi();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return null;
}
