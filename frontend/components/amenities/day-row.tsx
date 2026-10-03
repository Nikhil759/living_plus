import { dayChip } from "@/lib/amenities/view";
import { cn } from "@/lib/utils";

interface DayRowProps {
  days: string[];
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  /** "fit" squeezes all pills into the width (booking card); "scroll" lets them overflow. */
  layout?: "fit" | "scroll";
}

export function DayRow({ days, today, selected, onSelect, layout = "scroll" }: DayRowProps) {
  return (
    <div
      className={cn(
        layout === "fit"
          ? "grid grid-cols-7 gap-1.5"
          : "flex gap-2 overflow-x-auto no-scrollbar",
      )}
      role="group"
      aria-label="Pick a day"
    >
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
              "flex shrink-0 flex-col items-center rounded-full py-1.5",
              layout === "fit" ? "min-w-0 px-0" : "min-w-[3.75rem] px-3",
              "transition-colors duration-premium ease-premium",
              active ? "bg-primary text-white" : "bg-quiet text-ink-secondary hover:text-ink",
            )}
          >
            <span className="text-[11px] leading-4">{chip.weekday}</span>
            <span className="text-callout font-semibold leading-5">{chip.date}</span>
          </button>
        );
      })}
    </div>
  );
}
