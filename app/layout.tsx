import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
