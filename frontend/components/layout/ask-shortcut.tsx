"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Cmd/Ctrl+K opens Ask Living+. */
export function AskShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/ask-aangan");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
