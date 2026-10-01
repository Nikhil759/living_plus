import Link from "next/link";
import { Bot } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AskAanganPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AskAanganPage({ searchParams }: AskAanganPageProps) {
  const { q } = await searchParams;
  const prompt = q?.trim() || "How can I help you today?";

  return (
    <AppPage title="Ask Aangan">
      <Card className="space-y-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Bot className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-headline-sm text-on-surface">AI concierge</h2>
          <p className="text-body-md text-on-surface-variant">
            Streaming chat and society-aware tools ship with the LangGraph backend. Your prompt:
          </p>
          <p className="rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface">
            “{prompt}”
          </p>
        </div>
        <Link href="/home" className={buttonVariants({ variant: "soft", size: "md" })}>
          Back to Home
        </Link>
      </Card>
    </AppPage>
  );
}
