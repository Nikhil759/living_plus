import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { loadAiUsage, loadResident } from "@/lib/data";
import {
  PURPOSE_LABEL,
  barHeights,
  formatInr,
  formatLatency,
  formatPercent,
} from "@/lib/saarthi/usage-format";

const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-caption text-ink-secondary">{label}</p>
      <p className="text-title text-ink">{value}</p>
      {detail ? <p className="text-caption text-ink-tertiary">{detail}</p> : null}
    </Card>
  );
}

export default async function AiUsagePage() {
  const resident = await loadResident();
  if (!resident.roles.some((r) => /committee|admin/i.test(r))) notFound();
  const usage = await loadAiUsage(14);

  if (!usage) {
    return (
      <AppPage title="AI usage" backHref="/more" backLabel="More">
        <p className="text-body text-ink-secondary">AI usage is recorded when the app runs on the API.</p>
      </AppPage>
    );
  }

  const { today, days, byPurpose, feedback, unanswered } = usage;
  const heights = barHeights(days);
  const total = days.reduce((sum, d) => sum + d.costInr, 0);

  return (
    <AppPage title="AI usage" backHref="/more" backLabel="More">
      <p className="text-body text-ink-secondary">
        How residents use Saarthi: requests, estimated cost, speed and answer quality. Costs are
        estimates from token counts.
      </p>

      <section aria-label="Today" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Requests today" value={String(today.requests)} detail={today.errors ? `${today.errors} failed` : undefined} />
        <Tile label="Cost today" value={formatInr(today.costInr)} detail={`${formatInr(total)} in 14 days`} />
        <Tile label="Typical reply (p50)" value={formatLatency(today.p50Ms)} />
        <Tile label="Slowest 5% (p95)" value={formatLatency(today.p95Ms)} />
      </section>

      <Card className="space-y-3 p-4">
        <p className="text-headline text-ink">Requests, last 14 days</p>
        <div className="flex h-32 items-end gap-1" role="img" aria-label="Requests per day for the last 14 days">
          {days.map((d, i) => (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${DAY_LABEL.format(new Date(d.date))}: ${d.requests} requests, ${formatInr(d.costInr)}`}>
              <div className="rounded-t bg-primary opacity-80" style={{ height: `${heights[i]}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-caption text-ink-tertiary">
          <span>{DAY_LABEL.format(new Date(days[0].date))}</span>
          <span>Today</span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <p className="text-headline text-ink">What it's used for</p>
          <GroupedList>
            {byPurpose.length ? (
              byPurpose.map((p) => (
                <ListRow
                  chevron={false}
                  key={p.purpose}
                  title={PURPOSE_LABEL[p.purpose] ?? p.purpose}
                  detail={`${p.requests} ${p.requests === 1 ? "request" : "requests"} · ${formatInr(p.costInr)}`}
                />
              ))
            ) : (
              <ListRow chevron={false} title="No requests yet" />
            )}
          </GroupedList>
        </section>
        <section className="space-y-2">
          <p className="text-headline text-ink">Answer feedback</p>
          <Card className="space-y-1 p-4">
            <p className="text-title text-ink">
              {feedback.upRatio === null ? "No ratings yet" : `${formatPercent(feedback.upRatio)} helpful`}
            </p>
            <p className="text-caption text-ink-secondary">
              {feedback.up} thumbs up · {feedback.down} thumbs down
            </p>
          </Card>
        </section>
      </div>

      <section className="space-y-2">
        <p className="text-headline text-ink">Questions the guide couldn&apos;t answer</p>
        <p className="text-caption text-ink-tertiary">
          Adding a notice or rule for these to the society guide lets Saarthi answer them.
        </p>
        <GroupedList>
          {unanswered.length ? (
            unanswered.map((u) => (
              <ListRow
                chevron={false}
                key={u.question}
                title={u.question}
                detail={`Asked ${u.count === 1 ? "once" : `${u.count} times`}`}
              />
            ))
          ) : (
            <ListRow chevron={false} title="None in the last 14 days" />
          )}
        </GroupedList>
      </section>
    </AppPage>
  );
}
