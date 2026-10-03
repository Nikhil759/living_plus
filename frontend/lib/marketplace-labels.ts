export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  if (message) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}`;
}
