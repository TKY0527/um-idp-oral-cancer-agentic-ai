import type { Metadata } from "next";
import { PatientSidebar } from "@/components/PatientSidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Patient · Oral Cancer Agentic AI",
};

const PATIENT_NAV = [
  { href: "/patient", label: "Overview", icon: "🏠" },
  { href: "/patient/screening", label: "New Screening", icon: "🔬" },
  { href: "/patient/history", label: "History", icon: "📅" },
  { href: "/patient/chat", label: "AI Assistant", icon: "💬" },
  { href: "/patient/messages", label: "Message Doctor", icon: "✉️" },
  { href: "/patient/documents", label: "My Reports", icon: "📎" },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <PatientSidebar />
      <div className="flex-1">
        <MobileNav role="patient" items={PATIENT_NAV} />
        <main className="px-4 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
