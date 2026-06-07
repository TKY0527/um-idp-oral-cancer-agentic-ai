"use client";

import { useEffect, useRef, useState } from "react";
import type { PatientDocument } from "@/lib/types/screening";
import { showToast } from "@/components/Toast";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function PatientDocumentsPage() {
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/documents", { cache: "no-store" });
      if (r.ok) setDocs((await r.json()).documents ?? []);
    } catch {
      /* offline */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 650 * 1024) {
      showToast("File too large — please upload under 650 KB (compress or screenshot one page).", "warn");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataUrl, note }),
      });
      if (r.ok) {
        showToast("Report uploaded — your doctor can now see it.", "success");
        setNote("");
        await load();
      } else {
        const e = await r.json().catch(() => ({}));
        showToast(e.error ?? "Upload failed", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-lavender-950">My reports</h1>
        <p className="text-sm text-lavender-700">
          Upload a previous dental report, X-ray photo, or referral letter so the
          reviewing doctor can see your history alongside the AI screening.
        </p>
      </header>

      <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g. 'X-ray from City Dental, March 2026')"
          className="w-full rounded-lg border border-lavender-300 px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-lavender-300 bg-lavender-50 px-4 py-6 text-sm font-medium text-lavender-800 hover:border-lavender-400 hover:bg-lavender-100 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "📎 Click to upload a report (image or PDF, under 650 KB)"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0] ?? undefined)}
        />
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-lavender-900">
          Uploaded ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <p className="mt-2 text-sm text-lavender-600">No reports uploaded yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-lavender-200 bg-white p-3"
              >
                <span className="text-xl">{d.mimeType.includes("pdf") ? "📄" : "🖼️"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-lavender-950">{d.fileName}</p>
                  <p className="text-[11px] text-lavender-600">
                    {new Date(d.uploadedAt).toLocaleString()}
                    {d.note ? ` · ${d.note}` : ""}
                  </p>
                </div>
                <a
                  href={d.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={d.fileName}
                  className="rounded-lg border border-lavender-300 px-3 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
