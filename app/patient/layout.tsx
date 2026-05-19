import type { Metadata } from "next";
import { PatientSidebar } from "@/components/PatientSidebar";

export const metadata: Metadata = {
  title: "Patient · Oral Cancer Agentic AI",
};

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <PatientSidebar />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
