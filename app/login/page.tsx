"use client";

import {
  ArrowRight,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { PasskeyButton } from "@/components/passkey-button";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) setError("邮箱或密码不正确，或管理员凭据尚未配置。");
      else window.location.assign("/console");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden px-5 py-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <section className="relative z-10 hidden flex-col justify-between rounded-2xl border border-border bg-gradient-to-br from-orange-50 via-background to-sky-50 p-10 text-slate-950 shadow-2xl shadow-slate-950/10 md:flex dark:border-white/10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 shadow-lg shadow-orange-500/30">
              <ArrowRight className="h-4 w-4" />
            </span>
            FETCH BRIDGE
          </Link>
          <div className="mt-28 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-orange-500 dark:text-orange-300" />
              私有下载中继
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">
              受控、安全，
              <br />
              只为你而设。
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
              所有下载仅来自已审核的映射路由。管理员认证后，才可管理源站、规则和下载记录。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          HTTPS 传输 · 受控路由 · 流式中继
        </div>
      </section>
      <section className="relative z-10 flex items-center justify-center md:pl-10">
        <div className="w-full max-w-md rounded-2xl border bg-background/90 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 md:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500 text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold tracking-wide">
                FETCH BRIDGE
              </span>
            </div>
            <p className="mt-6 text-sm font-medium text-muted-foreground md:mt-0">
              管理员入口
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              欢迎回来
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              使用密码或已绑定设备继续。
            </p>
          </div>
          <PasskeyButton mode="authenticate" callbackUrl="/console" />
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            或使用密码
          </div>
          <form action={submit} className="space-y-4">
            <label className="block text-sm font-medium">
              邮箱
              <input
                name="email"
                type="email"
                autoComplete="email webauthn"
                required
                className="mt-2 h-11 w-full rounded-md border bg-background px-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
            </label>
            <label className="block text-sm font-medium">
              密码
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-md border bg-background pl-10 pr-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <Button
              className="h-11 w-full gap-2"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "正在验证…"
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  登录控制台
                </>
              )}
            </Button>
          </form>
          <p className="mt-7 text-center text-xs text-muted-foreground">
            仅限已获授权的管理员使用
          </p>
        </div>
      </section>
    </main>
  );
}
