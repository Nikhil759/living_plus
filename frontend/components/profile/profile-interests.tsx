import { Badge } from "@/components/ui/badge";

interface ProfileInterestsProps {
  interests: string[];
}

export function ProfileInterests({ interests }: ProfileInterestsProps) {
  if (interests.length === 0) {
    return (
      <p className="mt-3 text-caption text-ink-tertiary">
        No interests yet — add a few so neighbours can find you.
      </p>
    );
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {interests.map((interest) => (
        <li key={interest}>
          <Badge tone="primary">{interest}</Badge>
        </li>
      ))}
    </ul>
  );
}
