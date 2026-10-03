"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
  /** Small secondary line, e.g. the flat address. */
  hint?: string;
  /** Options with the same group key are listed together under `groupLabels[group]`. */
  group?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  groupLabels?: Record<string, string>;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

const POPOVER_MAX_HEIGHT = 288;

function EmojiTile({
  emoji,
  active,
  small = false,
}: {
  emoji?: string;
  active: boolean;
  small?: boolean;
}) {
  if (!emoji) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg leading-none",
        small ? "h-7 w-7 text-[15px]" : "h-8 w-8 text-[16px]",
        active ? "bg-card" : "bg-quiet",
      )}
    >
      {emoji}
    </span>
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
  groupLabels,
  disabled,
  invalid,
  id,
  "aria-label": ariaLabel,
  className,
}: SelectProps) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => setOpen(false), []);

  const openList = useCallback(() => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < POPOVER_MAX_HEIGHT && rect.top > below);
    }
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  }, [disabled, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(options.length - 1, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  }

  const rows = useMemo(() => {
    let previousGroup: string | undefined;
    return options.map((option, index) => {
      const showHeading = Boolean(option.group && groupLabels?.[option.group]) && option.group !== previousGroup;
      previousGroup = option.group;
      return { option, index, heading: showHeading ? groupLabels?.[option.group ?? ""] : undefined };
    });
  }, [options, groupLabels]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-activedescendant={open ? `${reactId}-opt-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-tile border bg-surface-container-lowest px-3 py-1.5 text-left text-body outline-none transition-[border-color,box-shadow] duration-premium ease-premium",
          "focus-visible:ring-2 focus-visible:ring-primary/30",
          open ? "border-primary/50 ring-2 ring-primary/20" : "border-outline-variant/40 hover:border-outline-variant",
          invalid && "border-error",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <EmojiTile emoji={selected?.emoji} active={false} small />
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-ink">{selected.label}</span>
              {selected.hint ? (
                <span className="block truncate text-caption text-ink-tertiary">{selected.hint}</span>
              ) : null}
            </>
          ) : (
            <span className="block truncate text-ink-tertiary">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-premium ease-premium",
            open && "rotate-180 text-primary",
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            "select-pop absolute left-0 right-0 z-50 max-h-72 overflow-y-auto overscroll-contain rounded-card border border-hairline bg-card p-1.5 shadow-hover",
            openUp ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top",
          )}
        >
          {rows.map(({ option, index, heading }) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li key={option.value} role="presentation">
                {heading ? (
                  <p className="px-3 pb-1 pt-2 text-caption font-semibold text-ink-tertiary">{heading}</p>
                ) : null}
                <div
                  id={`${reactId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-tile px-2.5 py-2 transition-colors",
                    isSelected ? "bg-primary-tint" : isActive ? "bg-quiet" : "bg-transparent",
                  )}
                >
                  <EmojiTile emoji={option.emoji} active={isSelected} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-body",
                        isSelected ? "font-semibold text-primary" : "text-ink",
                      )}
                    >
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="block truncate text-caption text-ink-tertiary">{option.hint}</span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
