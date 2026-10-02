const TIME_ZONE = "Asia/Kolkata";

/** "Friday, 2 October · Sector 50 Residency" */
export function formatHomeCaption(society: string, now: Date = new Date()): string {
  const date = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(now);
  return `${date} · ${society}`;
}

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
/** Short relative time for feed posts, e.g. "2h ago". */
export function formatFeedAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now.getTime() - then);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

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
