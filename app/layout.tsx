import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Fetch Bridge", description: "Configured, secure download relay" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body>{children}<script dangerouslySetInnerHTML={{ __html: "try { if (localStorage.getItem('fetch-bridge-theme') === 'dark' || (!localStorage.getItem('fetch-bridge-theme') && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark') } catch {}" }} /></body></html>;
}
