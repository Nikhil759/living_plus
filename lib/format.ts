const TIME_ZONE = "Asia/Kolkata";

/** "Sat, 9:00 PM" */
export function formatEventWhen(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: TIME_ZONE,
  }).format(date);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  })
    .format(date)
    .toUpperCase();
  return `${day}, ${time}`;
}

/** 0 -> "Free", 499 -> "₹499" */
export function formatPriceInr(amount: number): string {
  if (amount <= 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getGreeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: TIME_ZONE,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
