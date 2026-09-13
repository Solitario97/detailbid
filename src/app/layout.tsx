import type { Metadata } from "next";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: "AutoPick — предложения от детейлинг-центров",
  description:
    "Опишите автомобиль и нужные услуги — детейлинг-центры вашего города сами предложат цену и дату приёма.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-ink">{children}</body>
    </html>
  );
}
