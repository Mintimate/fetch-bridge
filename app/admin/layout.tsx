import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Download, FileText, Route, Settings } from "lucide-react";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [["Dashboard", "/admin", BarChart3], ["Sources", "/admin/sources", Download], ["Routes", "/admin/routes", Route], ["Logs", "/admin/logs", FileText], ["Settings", "/admin/settings", Settings]] as const;
export default async function AdminLayout({ children }: { children: React.ReactNode }) { if (!(await auth())) redirect("/login"); return <div className="min-h-screen md:flex"><aside className="border-b p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r"><div className="mb-8 flex items-center justify-between"><Link href="/admin" className="font-semibold">Fetch Bridge</Link><ThemeToggle /></div><nav className="flex gap-1 overflow-auto md:block">{navigation.map(([name, href, Icon]) => <Link key={href} href={href} className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4" />{name}</Link>)}</nav><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }} className="mt-6"><button className="px-3 text-sm text-muted-foreground hover:text-foreground">退出登录</button></form></aside><main className="min-w-0 flex-1 p-6 md:p-10">{children}</main></div>; }
