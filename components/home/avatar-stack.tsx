import { Avatar, type AvatarSize, type AvatarTone } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types/home";

const TONE_CYCLE: AvatarTone[] = ["primary", "secondary", "tertiary"];

export interface AvatarStackProps {
  people: Person[];
  /** Max avatars rendered before collapsing into a "+N" chip. Default 3. */
  max?: number;
  /** Real total when `people` is only a preview (e.g. 7 matches, 3 loaded). */
  total?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarStack({
  people,
  max = 3,
  total,
  size = "sm",
  className,
}: AvatarStackProps) {
  const visible = people.slice(0, max);
  const overflow = Math.max((total ?? people.length) - visible.length, 0);

  if (visible.length === 0) return null;

  const ring = "ring-2 ring-surface-container-lowest shadow-card";

  return (
    <div
      className={cn("flex -space-x-2", className)}
      role="group"
      aria-label={`${total ?? people.length} people`}
    >
      {visible.map((person, i) => (
        <Avatar
          key={person.id}
          name={person.name}
          src={person.avatarUrl}
          size={size}
          tone={TONE_CYCLE[i % TONE_CYCLE.length]}
          className={ring}
        />
      ))}
      {overflow > 0 ? (
        <Avatar
          name={`${overflow} more`}
          label={`+${overflow}`}
          size={size}
          tone="neutral"
          className={ring}
        />
      ) : null}
    </div>
  );
}
