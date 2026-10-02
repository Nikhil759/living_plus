import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LivingWordmarkProps {
  className?: string;
  iconOnly?: boolean;
}

export function LivingWordmark({ className, iconOnly = false }: LivingWordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-[22%] object-cover"
        priority
      />
      {iconOnly ? null : (
        <span className="text-headline tracking-tight text-ink">
          Living<span className="text-primary">+</span>
        </span>
      )}
    </span>
  );
}
