import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKY HAUS POS — Sistem Kasir",
  description: "Aplikasi kasir (Point of Sale) untuk SKY HAUS Cafe — Jl. Lapas, Kec. Jati Agung, Lampung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
