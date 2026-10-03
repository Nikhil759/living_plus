"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { contactSellerApi } from "@/lib/api/marketplace-client";
import type { ListingContactMethod } from "@/lib/types/marketplace";

interface ContactSellerButtonProps {
  listingId: string;
  method: ListingContactMethod;
  className?: string;
  /** The mobile bar is too tight for the helper line. */
  hint?: boolean;
}

/** Fetches the WhatsApp or call link on click, so the seller's number is never in the page. */
export function ContactSellerButton({
  listingId,
  method,
  className,
  hint = true,
}: ContactSellerButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = method === "whatsapp" ? MessageCircle : Phone;

  async function contact() {
    setBusy(true);
    setError(null);
    // Open the tab now: popup blockers only allow it directly inside the click.
    const tab = method === "whatsapp" ? window.open("", "_blank") : null;
    try {
      const link = await contactSellerApi(listingId);
      if (link.method === "call") window.location.href = link.url;
      else if (tab) tab.location.href = link.url;
      else window.location.assign(link.url);
    } catch (err) {
      tab?.close();
      setError(err instanceof ApiError ? err.message : "Couldn't open the contact link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button className="w-full" disabled={busy} onClick={() => void contact()}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        Contact seller
      </Button>
      {hint ? (
        <p className="mt-1.5 text-center text-caption text-ink-tertiary">
          {method === "whatsapp" ? "Opens WhatsApp with a message ready to send" : "Starts a phone call"}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-center text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
