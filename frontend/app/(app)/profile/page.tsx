import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { mockResident } from "@/lib/mock/home";

export default function ProfilePage() {
  return (
    <AppPage title="Profile">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
      <Card className="mt-4 flex items-start gap-4 p-5">
        <Avatar name={mockResident.name} src={mockResident.avatarUrl} size="md" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-headline-sm text-on-surface">{mockResident.name}</h2>
          <p className="text-body-md text-on-surface-variant">{mockResident.society}</p>
          <p className="text-body-md text-on-surface">
            {mockResident.tower}, Flat {mockResident.flat}
          </p>
          <p className="text-label-md text-primary">{mockResident.roles.join(" · ")}</p>
        </div>
      </Card>
    </AppPage>
  );
}
