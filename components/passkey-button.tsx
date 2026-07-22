"use client";

import { Fingerprint, LoaderCircle } from "lucide-react";
import { signIn as signInWithPasskey } from "next-auth/webauthn";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type PasskeyButtonProps = {
  mode: "authenticate" | "register";
  callbackUrl: string;
  className?: string;
};

export function PasskeyButton({
  mode,
  callbackUrl,
  className,
}: PasskeyButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const isRegistration = mode === "register";

  async function usePasskey() {
    setStatus("loading");
    try {
      if (!window.PublicKeyCredential) throw new Error("unsupported");
      const result = await signInWithPasskey("passkey", {
        action: mode,
        callbackUrl,
        redirect: false,
      });
      if (!result?.ok || !result.url) throw new Error("failed");
      window.location.assign(result.url);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={isRegistration ? "outline" : "default"}
        className="w-full gap-2"
        disabled={status === "loading"}
        onClick={usePasskey}
      >
        {status === "loading" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
        {status === "loading"
          ? "正在验证…"
          : isRegistration
            ? "绑定此设备的 Passkey"
            : "使用 Passkey 登录"}
      </Button>
      {status === "error" && (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
          Passkey 操作未完成。请确认设备支持，并使用 HTTPS 或本机开发地址。
        </p>
      )}
    </div>
  );
}
