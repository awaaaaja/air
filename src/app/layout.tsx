import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
export const metadata: Metadata = {
  title: "Leaksense | Simulasi jaringan air",
  description: "Simulator interaktif jaringan distribusi air",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={GeistSans.variable}>{children}</body>
    </html>
  );
}
