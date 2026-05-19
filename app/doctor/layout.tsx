import type { Metadata } from "next";
import { DoctorSidebar } from "@/components/DoctorSidebar";

export const metadata: Metadata = {
  title: "Doctor · Oral Cancer Agentic AI",
};

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DoctorSidebar />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
