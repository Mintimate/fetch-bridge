import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Download, FileText, Home, Route, Settings } from "lucide-react";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [["Dashboard", "/console", BarChart3], ["Sources", "/console/sources", Download], ["Routes", "/console/routes", Route], ["Logs", "/console/logs", FileText], ["Settings", "/console/settings", Settings]] as const;

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())) redirect("/login");
  return <div className="min-h-screen md:flex"><aside className="border-b p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r"><div className="mb-8 flex items-center justify-between"><Link href="/console" className="font-semibold">Fetch Bridge</Link><ThemeToggle /></div><nav className="flex gap-1 overflow-auto md:block">{navigation.map(([name, href, Icon]) => <Link key={href} href={href} className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4" />{name}</Link>)}</nav><div className="mt-6 border-t pt-4"><Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Home className="h-4 w-4" />返回首页</Link><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="mt-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">退出登录</button></form></div></aside><main className="min-w-0 flex-1 p-6 md:p-10">{children}</main></div>;
}
