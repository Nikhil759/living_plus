"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { decideJoinRequestApi, listJoinRequestsApi } from "@/lib/api/community-client";
import type { JoinRequest } from "@/lib/types/community";

/** Requests waiting for this resident as a group or WhatsApp admin. Hidden when there are none. */
export function JoinRequestQueue() {
  const router = useRouter();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listJoinRequestsApi().then(setRequests).catch(() => setRequests([]));
  }, []);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    try {
      await decideJoinRequestApi(id, approve);
      setRequests((all) => all.filter((r) => r.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <Card className="space-y-3 p-4">
      <p className="text-headline text-ink">Requests to review</p>
      <ul className="space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body text-ink">
              {request.requesterName} wants to join <strong>{request.targetName}</strong>
            </span>
            <span className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busyId === request.id}
                onClick={() => decide(request.id, true)}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyId === request.id}
                onClick={() => decide(request.id, false)}
              >
                Decline
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
