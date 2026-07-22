import { ArrowLeft, Compass, SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <section className="relative z-10 max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border bg-background shadow-lg">
          <SearchX className="h-7 w-7 text-orange-500" />
        </div>
        <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-orange-500">
          404 · NOT FOUND
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          这条路由不存在
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          地址可能已变更，或并未配置为 Fetch Bridge 的受控入口。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/console">
              <Compass className="mr-2 h-4 w-4" />
              打开控制台
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
