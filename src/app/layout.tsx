import type { Metadata } from "next";
import { Geist_Mono, Anek_Gujarati } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const anekGujarati = Anek_Gujarati({
  variable: "--font-anek-gujarati",
  subsets: ["gujarati", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Murli Milk Dairy Management",
  description: "Milk Purchase, Production, Dairy & Inventory Management Software",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anekGujarati.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
