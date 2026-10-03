"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useAction } from "@/components/local-businesses/use-action";
import { Button } from "@/components/ui/button";
import { contactOpeningApi } from "@/lib/api/openings-client";
import { openContactLink } from "@/lib/contact-link";
import type { OpeningContactMethod } from "@/lib/types/flat-opening";

interface ContactPosterButtonProps {
  openingId: string;
  method: OpeningContactMethod;
  /** The small version used on cards. */
  compact?: boolean;
  className?: string;
}

/** Fetches the WhatsApp or call link on click, so the poster's number is never in the page. */
export function ContactPosterButton({
  openingId,
  method,
  compact = false,
  className,
}: ContactPosterButtonProps) {
  const { busy, error, run } = useAction();
  const Icon = method === "whatsapp" ? MessageCircle : Phone;
  const contact = () => run(() => openContactLink(method, () => contactOpeningApi(openingId)));

  if (compact) {
    return (
      <div className={className}>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void contact()}>
          Contact
        </Button>
        {error ? (
          <p role="alert" className="mt-1 text-caption text-status-red">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <Button className="w-full" disabled={busy} onClick={() => void contact()}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        {method === "whatsapp" ? "Contact on WhatsApp" : "Call"}
      </Button>
      <p className="mt-1.5 text-center text-caption text-ink-tertiary">
        {method === "whatsapp" ? "Opens WhatsApp with a message ready to send" : "Starts a phone call"}
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-center text-caption text-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
