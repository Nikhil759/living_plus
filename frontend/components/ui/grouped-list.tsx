import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("overflow-hidden rounded-card bg-card shadow-card", className)}>{children}</ul>
  );
}

export interface ListRowProps {
  href?: string;
  title: string;
  detail?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  className?: string;
}

export function ListRow({
  href,
  title,
  detail,
  leading,
  trailing,
  chevron = true,
  className,
}: ListRowProps) {
  const inner = (
    <div className={cn("flex items-center gap-3 px-6 py-3.5", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-headline text-ink">{title}</p>
        {detail ? <p className="truncate text-callout text-ink-secondary">{detail}</p> : null}
      </div>
      {trailing}
      {chevron ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
      ) : null}
    </div>
  );

  const row = href ? (
    <Link href={href} className="block transition-colors duration-premium ease-premium hover:bg-quiet">
      {inner}
    </Link>
  ) : (
    inner
  );

  return (
    <li className="relative after:absolute after:bottom-0 after:right-0 after:left-[60px] after:h-px after:bg-hairline last:after:hidden">
      {row}
    </li>
  );
}
