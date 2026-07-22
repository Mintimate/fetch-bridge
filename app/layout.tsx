import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetch-bridge.vercel.app"),
  title: { default: "Fetch Bridge · 私有下载中继", template: "%s · Fetch Bridge" },
  description: "面向个人与团队的受控下载中继服务，仅允许管理员配置的安全下载路由。",
  applicationName: "Fetch Bridge",
  keywords: ["下载中继", "安全下载", "文件分发", "Fetch Bridge"],
  authors: [{ name: "Fetch Bridge" }],
  creator: "Fetch Bridge",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], shortcut: "/icon.svg", apple: "/icon.svg" },
  openGraph: { type: "website", locale: "zh_CN", siteName: "Fetch Bridge", title: "Fetch Bridge · 私有下载中继", description: "仅服务于管理员预先配置下载路由的安全下载中继。", images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Fetch Bridge" }] },
  twitter: { card: "summary", title: "Fetch Bridge · 私有下载中继", description: "仅服务于管理员预先配置下载路由的安全下载中继。", images: ["/icon.svg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body>{children}<script dangerouslySetInnerHTML={{ __html: "try { if (localStorage.getItem('fetch-bridge-theme') === 'dark' || (!localStorage.getItem('fetch-bridge-theme') && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark') } catch {}" }} /></body></html>;
}
