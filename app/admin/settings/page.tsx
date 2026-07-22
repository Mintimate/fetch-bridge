import { KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { PasskeyManagement } from "@/components/passkey-management";
import { prisma } from "@/lib/db";
import { removePasskey } from "./actions";

export default async function SettingsPage() {
  const email = (await auth())?.user?.email;
  const authenticators = email
    ? await prisma.authenticator.findMany({
        where: { user: { email } },
        select: {
          credentialID: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold">设置</h1>
      </header>
      <div className="max-w-2xl space-y-5">
        <section className="rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-muted p-2">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-medium">Passkey 登录</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                将当前设备的生物识别或系统解锁方式绑定到管理员账号。绑定后可直接登录，无需输入密码。
              </p>
            </div>
          </div>
          <PasskeyManagement
            authenticators={authenticators}
            removePasskey={removePasskey}
          />
        </section>
        <section className="rounded-lg border p-5">
          <h2 className="font-medium">安全策略</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>所有 Source 必须是无认证信息的 HTTPS 公网 URL。</li>
            <li>Cookie、Authorization、X-Forwarded-* 不会被接收或转发。</li>
            <li>
              下载入口仅支持 <code>/download/&lt;预配置路径&gt;</code>
              ；不存在通用代理接口。
            </li>
            <li>中继不将文件写入本地磁盘，响应直接流式传递。</li>
          </ul>
        </section>
      </div>
    </>
  );
}
