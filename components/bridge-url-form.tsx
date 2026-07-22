"use client";
import { Check, Clipboard, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BridgeUrlForm() {
  const [url, setUrl] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setProxyUrl(""); setCopied(false);
    const response = await fetch("/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const data: unknown = await response.json();
    if (!response.ok || !data || typeof data !== "object" || !("proxyPath" in data)) { setError(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "无法生成代理地址。"); return; }
    setProxyUrl(`${window.location.origin}${data.proxyPath}`);
  }
  async function copy() { await navigator.clipboard.writeText(proxyUrl); setCopied(true); }
  return <section className="mb-12 rounded-lg border bg-muted/40 p-5 sm:p-6"><div className="flex gap-3"><span className="mt-0.5 rounded-md border bg-background p-2"><LinkIcon className="h-4 w-4" /></span><div><h2 className="font-medium">生成代理下载地址</h2><p className="mt-1 text-sm text-muted-foreground">粘贴已配置源站的完整下载 URL，生成对应的 Fetch Bridge 地址。</p></div></div><form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={url} onChange={(event) => setUrl(event.target.value)} required type="url" placeholder="https://ftp.mozilla.org/pub/fenix/releases/..." className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" /><Button type="submit">生成地址</Button></form>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}{proxyUrl && <div className="mt-4 flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center"><a href={proxyUrl} className="min-w-0 flex-1 truncate font-mono text-sm text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">{proxyUrl}</a><Button type="button" variant="outline" className="shrink-0 gap-2" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied ? "已复制" : "复制"}</Button></div>}<p className="mt-4 text-xs text-muted-foreground">仅会转换管理员预先公开配置的路径；不会访问或代理任意 URL。</p></section>;
}
