import Link from "next/link";
import { Bot } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

const CHIPS = [
  "When is dry waste collection today?",
  "Who is the plumber on the society list?",
  "Can I renovate on Sunday?",
];

interface AskPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AskLivingPlusPage({ searchParams }: AskPageProps) {
  const { q } = await searchParams;
  const prompt = q?.trim();

  return (
    <AppPage title="Ask Living+">
      <Card className="space-y-5">
        <IconTile>
          <Bot />
        </IconTile>
        <div className="space-y-2">
          <h1 className="text-title text-ink">Ask Living+</h1>
          <p className="text-body text-ink-secondary">
            Answers come from your society documents, with citations. Chat ships with the backend.
          </p>
        </div>
        {prompt ? (
          <p className="rounded-tile bg-quiet px-4 py-3 text-body text-ink">{prompt}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <Link
              key={chip}
              href={`/ask-aangan?q=${encodeURIComponent(chip)}`}
              className="rounded-full bg-quiet px-3 py-1.5 text-callout text-ink-secondary"
            >
              {chip}
            </Link>
          ))}
        </div>
      </Card>
    </AppPage>
  );
}
