"use client";

import { useRef } from "react";

export interface UploadedImage {
  base64: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  previewUrl: string;
}

interface Props {
  value: UploadedImage | null;
  onChange: (img: UploadedImage | null) => void;
  disabled?: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Please upload an image smaller than 8 MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const base64 = dataUrl.split(",")[1] ?? "";
    onChange({
      base64,
      mimeType: file.type || "image/jpeg",
      fileName: file.name,
      sizeBytes: file.size,
      previewUrl: dataUrl,
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
        Or upload an oral cavity photo
      </h3>
      <p className="mt-1 text-xs text-lavender-900/70">
        Uploaded images are sent to the configured Vision provider (Gemini / Claude / Mock).
        No image is stored.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          if (disabled) return;
          await handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors ${
          value
            ? "border-lavender-400 bg-lavender-50"
            : "border-lavender-300 bg-white hover:border-lavender-400 hover:bg-lavender-50"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {value ? (
          <div className="flex w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.previewUrl}
              alt={value.fileName}
              className="max-h-48 rounded-xl border border-lavender-200 object-contain"
            />
            <div className="text-center">
              <p className="text-sm font-medium text-lavender-950">{value.fileName}</p>
              <p className="text-xs text-lavender-900/70">
                {(value.sizeBytes / 1024).toFixed(1)} KB · {value.mimeType}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="rounded-lg border border-lavender-300 bg-white px-3 py-1 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled}
                className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lavender-200 text-lavender-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 1 1-1.06 1.06l-3.22-3.22V14.25a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-lavender-950">
              Click or drop an image here
            </p>
            <p className="text-xs text-lavender-900/70">
              JPG / PNG up to 8 MB
            </p>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
        />
      </div>
    </div>
  );
}
