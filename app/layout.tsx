import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import SupabaseGuardBootstrap from "@/components/SupabaseGuardBootstrap";
import { ClientEnvValidator } from "@/components/ClientEnvValidator";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  title: "ZamSchool OS",
  description:
    "The all-in-one school operating system for modern African schools — manage students, attendance, exams, parent communication, and finance from one fast, focused platform.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <SupabaseGuardBootstrap />
        <ClientEnvValidator />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
