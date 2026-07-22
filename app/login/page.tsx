"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState("");
  async function submit(formData: FormData) { setError(""); const result = await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false }); if (result?.error) setError("邮箱或密码不正确，或管理员凭据尚未配置。"); else window.location.assign("/console"); }
  return <main className="grid min-h-screen place-items-center px-6"><form action={submit} className="w-full max-w-sm rounded-lg border p-6"><p className="text-sm font-medium text-muted-foreground">FETCH BRIDGE</p><h1 className="mt-2 text-xl font-semibold">管理员登录</h1><label className="mt-6 block text-sm">邮箱<input name="email" type="email" required className="mt-2 h-10 w-full rounded-md border bg-background px-3" /></label><label className="mt-4 block text-sm">密码<input name="password" type="password" required className="mt-2 h-10 w-full rounded-md border bg-background px-3" /></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<Button className="mt-6 w-full" type="submit">登录</Button></form></main>;
}
