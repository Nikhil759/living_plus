import { dayChip } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";

interface DayRowProps {
  days: string[];
  today: string;
  selected: string;
  onSelect: (day: string) => void;
}

export function DayRow({ days, today, selected, onSelect }: DayRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Pick a day">
      {days.map((day) => {
        const chip = dayChip(day, today);
        const active = day === selected;
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(day)}
            className={cn(
              "flex min-w-[3.75rem] shrink-0 flex-col items-center rounded-tile px-3 py-2",
              "transition-colors duration-premium ease-premium",
              active ? "bg-primary text-white" : "bg-quiet text-ink-secondary",
            )}
          >
            <span className="text-caption">{chip.weekday}</span>
            <span className="text-headline">{chip.date}</span>
          </button>
        );
      })}
    </div>
  );
}
