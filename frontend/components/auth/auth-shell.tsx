import Image from "next/image";
import { LivingWordmark } from "@/components/brand/living-wordmark";
import { cn } from "@/lib/utils";

const HERO_SRC = "/home-banner.png";

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-dvh bg-canvas">
      <div className="relative h-[42dvh] min-h-[280px] max-h-[420px] overflow-hidden">
        <Image
          src={HERO_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_40%] saturate-[0.92]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 42%, rgba(251,251,253,0.35) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 top-0 flex justify-center pt-[calc(env(safe-area-inset-top,0px)+16px)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-card backdrop-blur-xl">
            <LivingWordmark className="[&_img]:h-6 [&_img]:w-6 [&_span]:text-callout" />
            <span className="text-caption font-semibold tracking-[0.08em] text-ink-tertiary">
              COMMUNITY
            </span>
          </div>
        </div>
      </div>

      <section
        className={cn(
          "relative z-10 -mt-10 rounded-t-[28px] bg-card px-6 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] sm:mx-auto sm:max-w-md sm:-mt-14 sm:rounded-card sm:px-8 sm:py-8 sm:shadow-card",
          className,
        )}
      >
        <div
          className="mx-auto mb-6 h-1 w-10 rounded-full bg-hairline sm:hidden"
          aria-hidden="true"
        />
        {children}
      </section>
    </div>
  );
}
