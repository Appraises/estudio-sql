import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Laboratório SQL | Atlas", description: "Importe seu banco de dados, visualize tabelas e pratique consultas SQL no navegador.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
