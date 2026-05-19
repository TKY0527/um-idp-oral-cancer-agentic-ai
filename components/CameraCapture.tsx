"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (img: {
    base64: string;
    mimeType: string;
    fileName: string;
    sizeBytes: number;
    previewUrl: string;
  }) => void;
  disabled?: boolean;
}

/**
 * In-browser camera capture using getUserMedia.
 *
 * Shows a live video preview with a framing guide ("center your mouth here"),
 * lets the user freeze a frame, and returns the captured image as base64
 * to feed into the screening pipeline.
 */
export function CameraCapture({ onCapture, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  async function start() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(s);
      setActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const friendly =
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Camera access was blocked. Click the camera icon in your browser's address bar and allow access, then try again. Or use the upload option instead."
          : name === "NotFoundError"
            ? "No camera was found on this device. Use the upload option instead."
            : name === "NotReadableError"
              ? "Your camera is being used by another app. Close other video apps and try again."
              : "Couldn't open the camera. Use the upload option instead.";
      setError(friendly);
    }
  }

  function stop() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setActive(false);
  }

  function flip() {
    stop();
    setFacing((f) => (f === "user" ? "environment" : "user"));
    // Re-start after state flip
    setTimeout(start, 100);
  }

  function capture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    onCapture({
      base64,
      mimeType: "image/jpeg",
      fileName: `capture_${Date.now()}.jpg`,
      sizeBytes: Math.floor((base64.length * 3) / 4),
      previewUrl: dataUrl,
    });
    stop();
  }

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
        Or capture with your camera
      </h3>
      <p className="mt-1 text-xs text-lavender-900/70">
        Uses your device camera directly — nothing is uploaded until you click capture.
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-lavender-300 bg-lavender-950">
        {!active ? (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="flex w-full flex-col items-center justify-center gap-2 px-4 py-10 text-center text-white/90 transition-colors hover:bg-lavender-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden
              >
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path
                  fillRule="evenodd"
                  d="M5 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1.382l-1.276-1.276A2 2 0 0 0 14.93 3H9.07a2 2 0 0 0-1.412.586L6.382 5H5Zm7 11a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold">Start camera</span>
            <span className="text-[11px] text-white/70">
              Your browser will ask for permission
            </span>
          </button>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            {/* Framing guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/5 w-3/5 rounded-3xl border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <p className="-mt-7 text-center text-[11px] font-semibold uppercase tracking-widest text-white/90">
                  align mouth here
                </p>
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
              <button
                type="button"
                onClick={flip}
                disabled={disabled}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/25"
                aria-label="Flip camera"
              >
                Flip
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={disabled}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-lavender-900 shadow-lg hover:bg-lavender-50"
              >
                📸 Capture
              </button>
              <button
                type="button"
                onClick={stop}
                disabled={disabled}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/25"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </p>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
