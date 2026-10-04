import { redirect } from "next/navigation";

interface AskPageProps {
  searchParams: Promise<{ q?: string }>;
}

/** Old "Ask Living+" links: open Saarthi on Home, carrying the question across. */
export default async function AskRedirectPage({ searchParams }: AskPageProps) {
  const { q } = await searchParams;
  const ask = q?.trim();
  redirect(ask ? `/home?saarthi=1&q=${encodeURIComponent(ask)}` : "/home?saarthi=1");
}
