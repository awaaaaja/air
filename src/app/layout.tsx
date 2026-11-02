import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LEAKSENSE AI · Digital Twin",
  description: "Simulator interaktif jaringan distribusi air",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
