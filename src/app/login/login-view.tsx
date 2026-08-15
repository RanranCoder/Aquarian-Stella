"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AccountCard } from "@/components/AccountCard";

export function LoginView({ next }: { next: string }) {
  const router = useRouter();
  const onAuthed = () => {
    try {
      const url = new URL(next, window.location.origin);
      if (url.origin === window.location.origin) router.replace(next);
    } catch {
      // 非法 next，忽略
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16 md:py-24">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <Image
          src="/brand/logo-main.png"
          alt="星语星愿"
          width={1020}
          height={305}
          className="h-8 w-auto max-w-none"
        />
        <h1 className="display-zh text-2xl">登录星语星愿</h1>
        <p className="text-sm leading-relaxed text-moon-400">
          登录后，你的出生信息与星愿会保存在你的账号下。
        </p>
      </div>
      <AccountCard onAuthed={onAuthed} />
    </div>
  );
}
