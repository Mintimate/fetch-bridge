import Link from "next/link";
import { ArrowUpRight, Download, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { BridgeUrlForm } from "@/components/bridge-url-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const routes = await prisma.route.findMany({
    where: { enabled: true, isPublic: true, source: { enabled: true } },
    include: { source: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:px-10">
      <header className="mb-16 flex items-center justify-between">
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            FETCH BRIDGE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            可靠的软件下载入口
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/console"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            控制台 <ArrowUpRight className="h-4 w-4" />
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="inline-flex h-9 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </form>
        </div>
      </header>
      <BridgeUrlForm />
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-medium">公开下载</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              由受审核的源站提供，支持断点续传。
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {routes.length} 个项目
          </span>
        </div>
        <div className="divide-y rounded-lg border">
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
                  <Download className="h-4 w-4" /> 下载
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
      <footer className="mt-16 text-xs text-muted-foreground">
        Fetch Bridge 仅服务于管理员预先配置的下载路由。
      </footer>
    </main>
  );
}
