"use client";

import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { ApiError } from "@/lib/api/client";
import { uploadListingPhotoApi } from "@/lib/api/marketplace-client";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, moveItem } from "@/lib/marketplace/form";
import { cn } from "@/lib/utils";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ListingCategory } from "@/lib/types/marketplace";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface ListingPhotoPickerProps {
  photos: string[];
  /** Tile icon: from a marketplace category, or passed directly. */
  category?: ListingCategory;
  icon?: IconDefinition;
  onChange: (photos: string[]) => void;
  error?: string;
  /** Defaults to the Marketplace limit and uploader. */
  max?: number;
  upload?: (file: File) => Promise<string>;
  /** Marks the first photo as the cover and says so in the helper text. */
  coverBadge?: boolean;
}

/** Drag to reorder (or use the arrows). By default the first photo is the cover. */
export function ListingPhotoPicker({
  photos,
  category,
  icon,
  onChange,
  error,
  max = MAX_PHOTOS,
  upload = uploadListingPhotoApi,
  coverBadge = true,
}: ListingPhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(photos);
  latest.current = photos;
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const slotsLeft = max - photos.length - uploading;

  async function addFiles(files: File[]) {
    setUploadError(null);
    const chosen = files.slice(0, Math.max(0, slotsLeft));
    if (files.length > chosen.length) setUploadError(`You can add up to ${max} ${max === 1 ? "photo" : "photos"}.`);
    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type)) {
        setUploadError("Photos must be JPEG, PNG or WebP.");
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setUploadError("Each photo must be 5 MB or smaller.");
        continue;
      }
      setUploading((count) => count + 1);
      try {
        const url = await upload(file);
        onChange([...latest.current, url]);
      } catch (err) {
        setUploadError(err instanceof ApiError ? err.message : "A photo failed to upload. Please try again.");
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5" aria-label="Photos">
        {photos.map((url, index) => (
          <li
            key={url}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) onChange(moveItem(photos, dragFrom, index));
              setDragFrom(null);
            }}
            onDragEnd={() => setDragFrom(null)}
            className={cn("group relative cursor-grab active:cursor-grabbing", dragFrom === index && "opacity-40")}
          >
            <ListingPhoto title={`Photo ${index + 1}`} category={category} icon={icon} src={url} className="aspect-square rounded-tile" />
            {coverBadge && index === 0 ? (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-caption font-semibold text-white">
                Cover
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(moveItem(photos, index, index - 1))}
                aria-label={`Move photo ${index + 1} earlier`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-card/90 text-ink disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === photos.length - 1}
                onClick={() => onChange(moveItem(photos, index, index + 1))}
                aria-label={`Move photo ${index + 1} later`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-card/90 text-ink disabled:opacity-30"
              >
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, index) => (
          <li key={`uploading-${index}`} className="shimmer aspect-square rounded-tile" aria-label="Uploading photo" />
        ))}
        {slotsLeft > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-hairline bg-quiet text-callout text-ink-secondary hover:text-ink"
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              Add photo
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <p className="text-caption text-ink-tertiary">
        {photos.length} of {max}
        {coverBadge ? " · The first photo is the cover." : ""}
        {max > 1 ? " Drag to reorder." : ""} JPEG, PNG or WebP, up to 5 MB.
      </p>
      {uploadError ?? error ? (
        <p role="alert" className="text-caption text-status-red">
          {uploadError ?? error}
        </p>
      ) : null}
    </div>
  );
}
