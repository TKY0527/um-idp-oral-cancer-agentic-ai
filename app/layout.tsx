import type { Metadata } from "next";
import "./globals.css";
import { ToastViewport } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "Oral Cancer Agentic AI Screening Prototype",
  description:
    "University IDP — Hierarchical multi-agent AI prototype for oral cancer screening using a smart toothbrush IoT concept.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <I18nProvider>
          {children}
          <ToastViewport />
        </I18nProvider>
      </body>
    </html>
  );
}
