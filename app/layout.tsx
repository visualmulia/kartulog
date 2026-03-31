import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// Font untuk body teks
const inter = Inter({ subsets: ["latin"] });
// Font untuk heading/judul biar kelihatan lebih modern/gaming
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "700", "800", "900"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "KartuLog - TCG Portfolio & Vault",
  description: "Catat, kelola, dan pamerkan koleksi kartu TCG kamu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} ${outfit.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}