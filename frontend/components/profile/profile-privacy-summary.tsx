import { Badge } from "@/components/ui/badge";

interface ProfilePrivacySummaryProps {
  isVisible: boolean;
  showFlat: boolean;
  apiMode: boolean;
}

export function ProfilePrivacySummary({
  isVisible,
  showFlat,
  apiMode,
}: ProfilePrivacySummaryProps) {
  if (!apiMode) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>{isVisible ? "Visible to neighbours" : "Hidden from matching"}</Badge>
        <Badge>{showFlat ? "Flat shown" : "Flat hidden"}</Badge>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Badge dot={isVisible ? "green" : undefined}>
        {isVisible ? "Visible for interest matching" : "Not visible to neighbours"}
      </Badge>
      <Badge>{showFlat ? "Flat number shown" : "Flat number hidden"}</Badge>
    </div>
  );
}
