"use client";

import { useState } from "react";
import { requestWhatsappApi } from "@/lib/api/community-client";
import type { WhatsappGroupEntry } from "@/lib/types/community";

/** Invite link once approved, otherwise a request button that the group admin must approve. */
export function WhatsappAction({ entry: initial }: { entry: WhatsappGroupEntry }) {
  const [entry, setEntry] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (entry.inviteLink) {
    return (
      <a
        href={entry.inviteLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-caption font-semibold text-primary"
      >
        Open invite
      </a>
    );
  }
  if (entry.pendingApproval) {
    return <span className="text-caption text-ink-tertiary">Requested</span>;
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          setEntry(await requestWhatsappApi(entry.id));
        } finally {
          setBusy(false);
        }
      }}
      className="text-caption font-semibold text-primary disabled:opacity-40"
    >
      Request to join
    </button>
  );
}
