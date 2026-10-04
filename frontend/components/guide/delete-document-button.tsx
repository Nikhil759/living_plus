"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteDocumentApi } from "@/lib/api/guide-client";

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${title}"? Saarthi will stop answering from it.`)) return;
    setBusy(true);
    try {
      await deleteDocumentApi(id);
      router.push("/guide");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={remove} disabled={busy}>
      Delete
    </Button>
  );
}
