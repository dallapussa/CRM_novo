import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ExtinControl CRM — Gestão para Prevenção Contra Incêndio",
    template: "%s | ExtinControl CRM",
  },
  description:
    "Sistema completo para empresas de prevenção contra incêndio: Ordens de Serviço, Extintores, PPCI, Financeiro e muito mais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background",
          fontSans.variable,
          fontDisplay.variable
        )}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
