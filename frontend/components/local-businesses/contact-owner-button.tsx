"use client";

import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/local-businesses/use-action";
import { contactBusinessApi } from "@/lib/api/local-businesses-client";
import { openContactLink } from "@/lib/contact-link";
import type { BusinessContactMethod } from "@/lib/types/local-business";

interface ContactOwnerButtonProps {
  businessId: string;
  method: BusinessContactMethod;
  className?: string;
  /** The mobile bar is too tight for the helper line. */
  hint?: boolean;
}

/** Fetches the WhatsApp or call link on click, so the owner's number is never in the page. */
export function ContactOwnerButton({
  businessId,
  method,
  className,
  hint = true,
}: ContactOwnerButtonProps) {
  const { busy, error, run } = useAction();
  const Icon = method === "whatsapp" ? MessageCircle : Phone;

  const contact = () => run(() => openContactLink(method, () => contactBusinessApi(businessId)));

  return (
    <div className={className}>
      <Button className="w-full" disabled={busy} onClick={() => void contact()}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        {method === "whatsapp" ? "Contact on WhatsApp" : "Call"}
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
