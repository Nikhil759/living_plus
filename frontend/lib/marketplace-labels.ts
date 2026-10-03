export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  if (message) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}`;
}

export function listingContactHref(
  contact: { type: "whatsapp" | "phone"; value: string },
  message?: string,
): string {
  if (contact.type === "whatsapp") {
    return whatsappHref(contact.value, message);
  }
  const digits = contact.value.replace(/\D/g, "");
  const tel = contact.value.startsWith("+") ? contact.value : `+${digits}`;
  return `tel:${tel}`;
}
