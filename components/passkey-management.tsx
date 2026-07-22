"use client";

import { Fingerprint, PencilLine, Plus, Trash2 } from "lucide-react";
import { PasskeyButton } from "@/components/passkey-button";
import { Button } from "@/components/ui/button";
import { formatShanghaiDate } from "@/lib/utils";

type Authenticator = {
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  name: string | null;
  createdAt: Date;
};

type PasskeyManagementProps = {
  authenticators: Authenticator[];
  removePasskey: (formData: FormData) => void | Promise<void>;
  updatePasskeyName: (formData: FormData) => void | Promise<void>;
};

function deviceLabel(authenticator: Authenticator) {
  return authenticator.credentialDeviceType === "multiDevice"
    ? "可在设备间同步"
    : authenticator.credentialBackedUp
      ? "已备份"
      : "仅此设备";
}

export function PasskeyManagement({
  authenticators,
  removePasskey,
  updatePasskeyName,
}: PasskeyManagementProps) {
  if (authenticators.length === 0) {
    return (
      <PasskeyButton
        mode="register"
        callbackUrl="/console/settings"
        className="mt-5 max-w-xs"
      />
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <p className="text-sm text-muted-foreground">
        已绑定 {authenticators.length} 台设备。删除后，该设备将无法再用 Passkey
        登录。
      </p>
      <ul className="divide-y rounded-md border">
        {authenticators.map((authenticator, index) => (
          <li
            key={authenticator.credentialID}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <form
              action={updatePasskeyName}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Fingerprint className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="hidden"
                name="credentialID"
                value={authenticator.credentialID}
              />
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`passkey-name-${index}`}>
                  Passkey 备注
                </label>
                <input
                  id={`passkey-name-${index}`}
                  name="name"
                  maxLength={40}
                  defaultValue={authenticator.name ?? ""}
                  placeholder={`Passkey ${index + 1}`}
                  className="h-8 w-full rounded border bg-background px-2 text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {deviceLabel(authenticator)} · 绑定于{" "}
                  {formatShanghaiDate(authenticator.createdAt)}
                </p>
              </div>
              <Button type="submit" variant="ghost" className="shrink-0 gap-2">
                <PencilLine className="h-4 w-4" />
                <span className="hidden md:inline">保存</span>
              </Button>
            </form>
            <form
              action={removePasskey}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "确定删除这个 Passkey 吗？删除后该设备将不能再用于登录。",
                  )
                )
                  event.preventDefault();
              }}
            >
              <input
                type="hidden"
                name="credentialID"
                value={authenticator.credentialID}
              />
              <Button
                type="submit"
                variant="ghost"
                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">删除</span>
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <PasskeyButton
        mode="register"
        callbackUrl="/console/settings"
        label="绑定新设备"
        className="max-w-xs"
      />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Plus className="h-3.5 w-3.5" />
        如需更换设备，请先添加新设备并确认可登录，再删除旧设备。
      </p>
    </div>
  );
}
