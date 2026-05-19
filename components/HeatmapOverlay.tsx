"use client";

import type { DetectionBox } from "@/lib/types/screening";

interface Props {
  imageSrc: string;
  detections?: DetectionBox[];
  caption?: string;
}

/**
 * Heatmap / Region overlay
 *
 * Draws translucent red rectangles (with a glowing center) over the
 * regions returned by the Vision Screening Agent. Useful for showing
 * "the model thinks this area is suspicious" — much more convincing
 * than a single probability number.
 *
 * Coordinates are normalized (0..1) so we don't need the actual pixel
 * dimensions of the captured image.
 */
export function HeatmapOverlay({ imageSrc, detections, caption }: Props) {
  const hasDetections = detections && detections.length > 0;

  return (
    <figure className="rounded-2xl border border-lavender-200 bg-white p-3 shadow-card">
      <div className="relative overflow-hidden rounded-xl bg-lavender-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Screened oral cavity"
          className="block w-full"
        />
        {hasDetections &&
          detections!.map((d, i) => (
            <div
              key={i}
              className="pointer-events-none absolute"
              style={{
                left: `${d.x * 100}%`,
                top: `${d.y * 100}%`,
                width: `${d.w * 100}%`,
                height: `${d.h * 100}%`,
              }}
            >
              <div
                className="h-full w-full rounded-md border-2 border-red-500/90"
                style={{
                  boxShadow:
                    "inset 0 0 30px rgba(239,68,68,0.45), 0 0 12px rgba(239,68,68,0.6)",
                  background:
                    "radial-gradient(circle at center, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0.10) 60%, rgba(239,68,68,0) 100%)",
                }}
              />
              <span className="absolute -top-5 left-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                {d.label.replace(/_/g, " ")} · {(d.score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        {!hasDetections && (
          <span className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-lavender-700 backdrop-blur">
            No regions detected
          </span>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-[11px] text-lavender-900/70">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
