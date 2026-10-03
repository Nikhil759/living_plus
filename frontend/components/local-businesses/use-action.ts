"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";

/** Runs one async action at a time and keeps its busy flag and error message. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run, setError };
}
