import "./globals.css";
import type { Metadata } from "next";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";

export const metadata: Metadata = {
  title: "Mercado Financeiro AI",
  description: "SaaS multiusuário para inteligência de mercado financeiro"
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="pt-BR">
      <body><GlobalLanguageSelector/>{children}</body>
    </html>
  );
}
