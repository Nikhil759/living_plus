import { Avatar, type AvatarSize } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types/home";

export interface AvatarStackProps {
  people: Person[];
  max?: number;
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

  const ring = "ring-2 ring-card";

  return (
    <div
      className={cn("flex -space-x-2", className)}
      role="group"
      aria-label={`${total ?? people.length} people`}
    >
      {visible.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          src={person.avatarUrl}
          size={size}
          className={ring}
        />
      ))}
      {overflow > 0 ? (
        <Avatar
          name={`${overflow} more`}
          label={`+${overflow}`}
          size={size}
          className={ring}
        />
      ) : null}
    </div>
  );
}
