import { CareChat } from "@/components/CareChat";

export default function PatientMessagesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-lavender-950">
          Message your clinician
        </h1>
        <p className="text-sm text-lavender-700">
          Send a message to the reviewing doctor. They can see your screening
          history and will reply here.
        </p>
      </header>
      <CareChat viewerRole="patient" heightClass="h-[60vh]" />
      <p className="mt-3 text-center text-[11px] text-lavender-500">
        Educational prototype — not for emergencies. If you have severe symptoms,
        seek in-person care.
      </p>
    </div>
  );
}
