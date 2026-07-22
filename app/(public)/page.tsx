import Link from "next/link";
import { ArrowUpRight, Download, LogOut, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { BridgeUrlForm } from "@/components/bridge-url-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [routes, session] = await Promise.all([
    prisma.route.findMany({
      where: { enabled: true, isPublic: true, source: { enabled: true } },
      include: { source: true },
      orderBy: { updatedAt: "desc" },
    }),
    auth(),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-5 sm:px-8 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          FETCH BRIDGE
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/console"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            控制台 <ArrowUpRight className="h-4 w-4" />
          </Link>
          {session && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </form>
          )}
        </div>
      </header>
      <div className="space-y-5">
        <section className="rounded-2xl bg-slate-950 px-6 py-12 text-slate-100 shadow-xl shadow-slate-950/10 sm:px-10 sm:py-16 dark:bg-slate-100 dark:text-slate-950">
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
            FETCH BRIDGE · PRIVATE DOWNLOAD RELAY
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            可靠的软件下载入口
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400 dark:text-slate-600">
            所有内容均通过管理员预先审核的 Route
            分发。文件流式中继、不落盘，并完整支持断点续传。
          </p>
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-orange-300 dark:text-orange-600">
            <ShieldCheck className="h-4 w-4" />
            受控路由 · HTTPS 源站 · 安全中继
          </div>
        </section>
        <section className="rounded-2xl border bg-background/80 p-5 shadow-sm backdrop-blur sm:p-8">
          <BridgeUrlForm embedded />
        </section>
        <section className="rounded-2xl border border-orange-200/70 bg-orange-50/70 p-5 sm:p-8 dark:border-orange-900/50 dark:bg-orange-950/20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                AVAILABLE DOWNLOADS
              </p>
              <h2 className="mt-2 text-xl font-semibold">公开下载</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                由受审核的源站提供，支持断点续传。
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {routes.length} 个项目
            </span>
          </div>
          <div className="divide-y overflow-hidden rounded-xl border bg-background/85">
            {routes.length ? (
              routes.map((route) => (
                <article
                  key={route.id}
                  className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-medium">{route.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {route.description ||
                        `${route.source.name} · ${route.pathPrefix}`}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      更新于 {route.updatedAt.toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <a
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:opacity-90"
                    href={`/download${route.pathPrefix}/`}
                  >
                    <Download className="h-4 w-4" />
                    下载
                  </a>
                </article>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                暂时没有公开下载。管理员可以在后台添加 Route。
              </div>
            )}
          </div>
        </section>
      </div>
      <footer className="py-8 text-center text-xs text-muted-foreground">
        Fetch Bridge 仅服务于管理员预先配置的下载路由。
      </footer>
    </main>
  );
}
