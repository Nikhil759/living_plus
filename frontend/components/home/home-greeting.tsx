import { formatHomeCaption, getGreeting } from "@/lib/format";
import type { Resident } from "@/lib/types/home";

export function HomeGreeting({ resident }: { resident: Resident }) {
  const first = resident.name.split(" ")[0] ?? resident.name;

  return (
    <header className="space-y-1 lg:space-y-2">
      <p className="text-caption text-ink-tertiary lg:text-ink-secondary">
        {formatHomeCaption(resident.society)}
      </p>
      <h1 className="text-[1.75rem] font-semibold leading-[2.125rem] tracking-[-0.025em] text-ink sm:text-large-title">
        {getGreeting()}, {first}
      </h1>
    </header>
  );
}
