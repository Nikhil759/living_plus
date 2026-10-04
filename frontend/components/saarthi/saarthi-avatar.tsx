import { useId } from "react";
import { cn } from "@/lib/utils";

export type SaarthiState = "idle" | "talking" | "thinking" | "happy";

const STATE_CLASS: Record<SaarthiState, string | undefined> = {
  idle: undefined,
  talking: "is-talking",
  thinking: "is-thinking",
  happy: "is-happy",
};

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-24 w-24",
} as const;

export interface SaarthiAvatarProps {
  state?: SaarthiState;
  size?: keyof typeof SIZE_CLASS;
  /** Decorative by default; pass a label when the avatar is the only thing naming Saarthi. */
  label?: string;
  className?: string;
}

/** Saarthi's animated face (saarthi-animated/saarthi-face.svg). Animations live in styles/saarthi-face.css. */
export function SaarthiAvatar({ state = "idle", size = "md", label, className }: SaarthiAvatarProps) {
  // Gradient and clip ids must be unique per instance or every avatar on the page shares the first one.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bg = `sf-bg-${uid}`;
  const clip = `sf-clip-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={cn("saarthi shrink-0 rounded-full", STATE_CLASS[state], SIZE_CLASS[size], className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DDF0FE" />
          <stop offset="1" stopColor="#A9D6F7" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="256" cy="256" r="256" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="512" height="512" fill={`url(#${bg})`} />
        <g className="sf-body">
          <path d="M78 540 Q86 408 256 396 Q426 408 434 540 Z" fill="#1E8EF5" />
          <path d="M214 398 L256 452 L298 398" fill="none" stroke="#167BD8" strokeWidth="10" strokeLinejoin="round" />
          <path d="M232 400 L256 432 L280 400 Z" fill="#B97850" />
          <path d="M332 452 l7 15 15 7 -15 7 -7 15 -7 -15 -15 -7 15 -7z" fill="#FFD66B" />
          <rect x="226" y="330" width="60" height="78" rx="22" fill="#B97850" />
          <g className="sf-head">
            <ellipse cx="162" cy="268" rx="15" ry="24" fill="#C98A62" />
            <ellipse cx="350" cy="268" rx="15" ry="24" fill="#C98A62" />
            <ellipse cx="256" cy="256" rx="96" ry="112" fill="#D49A70" />
            <path
              d="M158 246 Q146 140 256 128 Q370 134 356 244 Q348 196 306 182 Q262 206 204 190 Q172 204 158 246 Z"
              fill="#2A211E"
            />
            <path d="M206 168 Q250 150 300 164" fill="none" stroke="#4A3A34" strokeWidth="6" strokeLinecap="round" opacity=".6" />
            <g className="sf-brows">
              <path d="M200 222 Q220 210 240 220" fill="none" stroke="#2A211E" strokeWidth="8" strokeLinecap="round" />
              <path d="M272 220 Q292 210 312 222" fill="none" stroke="#2A211E" strokeWidth="8" strokeLinecap="round" />
            </g>
            <g className="sf-eyes">
              <g className="sf-eye">
                <ellipse cx="220" cy="258" rx="10" ry="13" fill="#2A211E" />
                <circle cx="224" cy="253" r="3.5" fill="#fff" />
              </g>
              <g className="sf-eye">
                <ellipse cx="292" cy="258" rx="10" ry="13" fill="#2A211E" />
                <circle cx="296" cy="253" r="3.5" fill="#fff" />
              </g>
            </g>
            <g className="sf-happy-eyes">
              <path d="M206 262 Q220 246 234 262" fill="none" stroke="#2A211E" strokeWidth="8" strokeLinecap="round" />
              <path d="M278 262 Q292 246 306 262" fill="none" stroke="#2A211E" strokeWidth="8" strokeLinecap="round" />
            </g>
            <path d="M256 268 Q246 292 258 298" fill="none" stroke="#A86A45" strokeWidth="6" strokeLinecap="round" />
            <circle cx="196" cy="300" r="16" fill="#E8826B" opacity=".28" />
            <circle cx="316" cy="300" r="16" fill="#E8826B" opacity=".28" />
            <path className="sf-smile" d="M224 316 Q256 350 288 316 Q256 330 224 316 Z" fill="#8A3A2C" />
            <ellipse className="sf-talk" cx="256" cy="324" rx="18" ry="10" fill="#7A2E24" />
            <g className="sf-dots">
              <circle cx="236" cy="326" r="5" fill="#8A3A2C" />
              <circle cx="256" cy="326" r="5" fill="#8A3A2C" opacity=".7" />
              <circle cx="276" cy="326" r="5" fill="#8A3A2C" opacity=".45" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
