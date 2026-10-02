import { formatHomeCaption, getGreeting } from "@/lib/format";
import type { Resident } from "@/lib/types/home";

export function HomeGreeting({ resident }: { resident: Resident }) {
  const first = resident.name.split(" ")[0] ?? resident.name;

  return (
    <header className="space-y-2">
      <p className="text-caption text-ink-secondary">
        {formatHomeCaption(resident.society)}
      </p>
      <h1 className="text-large-title text-ink">
        {getGreeting()}, {first}
      </h1>
    </header>
  );
}
