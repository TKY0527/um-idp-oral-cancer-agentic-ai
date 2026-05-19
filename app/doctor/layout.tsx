import type { Metadata } from "next";
import { DoctorSidebar } from "@/components/DoctorSidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Doctor · Oral Cancer Agentic AI",
};

const DOCTOR_NAV = [
  { href: "/doctor", label: "Triage Queue", icon: "📥" },
  { href: "/doctor/analytics", label: "Analytics", icon: "📊" },
];

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DoctorSidebar />
      <div className="flex-1">
        <MobileNav role="doctor" items={DOCTOR_NAV} />
        <main className="px-4 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
