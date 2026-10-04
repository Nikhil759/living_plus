"use client";

import { useEffect, useState } from "react";
import { GuideMarkdown } from "@/components/guide/guide-markdown";
import type { GuideSection } from "@/lib/types/guide";
import { cn } from "@/lib/utils";

/** Renders a guide document; the section named in the URL hash is scrolled to and highlighted. */
export function GuideReader({ sections }: { sections: GuideSection[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    function focusHash() {
      const anchor = decodeURIComponent(window.location.hash.slice(1));
      if (!anchor) return;
      setActive(anchor);
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    focusHash();
    window.addEventListener("hashchange", focusHash);
    return () => window.removeEventListener("hashchange", focusHash);
  }, []);

  return (
    <article className="space-y-6">
      {sections.map((section) => {
        const Heading = section.level === 3 ? "h3" : "h2";
        return (
          <section
            key={section.anchor}
            id={section.anchor}
            aria-current={active === section.anchor ? "location" : undefined}
            className={cn(
              "scroll-mt-24 space-y-3 rounded-tile p-3 transition-colors duration-700",
              active === section.anchor && "bg-primary-tint ring-1 ring-primary/30",
            )}
          >
            {section.level >= 2 ? (
              <Heading
                className={cn("text-ink", section.level === 3 ? "text-headline" : "text-title")}
              >
                {section.heading}
              </Heading>
            ) : null}
            {section.markdown ? <GuideMarkdown markdown={section.markdown} /> : null}
          </section>
        );
      })}
    </article>
  );
}
