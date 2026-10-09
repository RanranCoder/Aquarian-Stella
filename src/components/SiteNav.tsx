"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { store, useMounted } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import {
  HomeIcon,
  SparkleIcon,
  OrbitIcon,
  HeartIcon,
  StarIcon,
  CompassIcon,
  UserIcon,
  MenuIcon,
} from "./icons";

const DESKTOP_LINKS = [
  { href: "/", label: "首页", icon: HomeIcon },
  { href: "/today", label: "星语", icon: SparkleIcon },
  { href: "/chart", label: "星盘", icon: OrbitIcon },
  { href: "/relationship", label: "关系", icon: HeartIcon },
  { href: "/wishes", label: "星愿", icon: StarIcon },
  { href: "/explore", label: "探索", icon: CompassIcon },
];

const MOBILE_TABS = DESKTOP_LINKS.filter((l) => l.href !== "/explore");

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const mounted = useMounted();
  const s = store.useStore();
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuId = useId();
  const profile = mounted ? s.profile : null;
  // 用户填过昵称就用昵称首字，否则回落邮箱前缀
  const nick = (profile?.nickname || "").trim();
  const displayName =
    nick && nick !== "星星"
      ? nick
      : auth.status === "authenticated"
        ? auth.email.split("@")[0]
        : "";
  const moreActive = ["/explore", "/profile", "/login"].some((href) =>
    isActive(pathname, href),
  );

  useEffect(() => {
    if (!moreOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <>
      {/* 桌面端 · 浮岛玻璃导航 */}
      <header className="fixed inset-x-0 top-0 z-40 hidden justify-center px-6 pt-5 md:flex">
        <nav className="glass-strong flex items-center gap-1 rounded-full py-1.5 pl-2.5 pr-1.5">
          <Link href="/" className="mr-2 flex items-center" aria-label="星语星愿 首页">
            <span className="flex items-center rounded-full bg-white p-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
              <Image
                src="/brand/logo-main.png"
                alt="星语星愿"
                width={1020}
                height={305}
                className="h-6 w-auto max-w-none"
                priority
              />
            </span>
          </Link>
          {DESKTOP_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm transition-colors duration-300",
                  active
                    ? "bg-white/[0.09] text-moon-100"
                    : "text-moon-400 hover:text-moon-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {auth.status === "authenticated" ? (
            <Link
              href="/profile"
              className="ml-2 flex items-center"
              aria-label="个人中心"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 text-sm font-medium text-night-950 shadow-[0_0_18px_rgba(155,142,196,0.4)]">
                {displayName.slice(0, 1) || "星"}
              </span>
            </Link>
          ) : auth.status === "loading" ? (
            <span className="ml-2 px-4 py-2 text-sm text-moon-500">…</span>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-4 py-2 text-sm font-medium text-night-950 transition-transform duration-300 ease-luxe hover:-translate-y-px active:scale-95"
            >
              登录
            </Link>
          )}
        </nav>
      </header>

      {/* 移动端 · 底部 Tab */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="glass-strong mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] flex items-stretch justify-between rounded-full px-2 py-1.5">
          {MOBILE_TABS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-xs transition-colors duration-300",
                  active
                    ? "bg-white/[0.08] text-gold-200"
                    : "text-moon-400",
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          {/* 更多：为探索与账户保留入口，避免底部主导航继续变窄 */}
          <div ref={moreRef} className="relative flex flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              aria-controls={moreMenuId}
              aria-expanded={moreOpen}
              className={cn(
                "flex min-h-11 w-full cursor-pointer flex-col items-center gap-0.5 rounded-full py-1.5 text-xs transition-colors duration-300",
                moreActive
                  ? "bg-white/[0.08] text-gold-200"
                  : "text-moon-400",
              )}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MenuIcon className="h-5 w-5" />
              更多
            </button>
            {moreOpen && (
              <div
                id={moreMenuId}
                role="group"
                aria-label="更多导航"
                className="glass-strong absolute bottom-full right-0 mb-3 flex w-44 flex-col gap-1 rounded-2xl p-2 shadow-card-lg"
              >
                <Link
                  href="/explore"
                  aria-current={isActive(pathname, "/explore") ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                    isActive(pathname, "/explore")
                      ? "bg-white/[0.08] text-gold-200"
                      : "text-moon-300 hover:bg-white/[0.06] hover:text-moon-100",
                  )}
                >
                  <CompassIcon className="h-5 w-5" />
                  探索
                </Link>
                <Link
                  href={auth.status === "authenticated" ? "/profile" : "/login"}
                  aria-current={
                    pathname === "/profile" || pathname === "/login"
                      ? "page"
                      : undefined
                  }
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                    pathname === "/profile" || pathname === "/login"
                      ? "bg-white/[0.08] text-gold-200"
                      : "text-moon-300 hover:bg-white/[0.06] hover:text-moon-100",
                  )}
                >
                  {auth.status === "authenticated" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 text-[11px] font-medium leading-none text-night-950 shadow-[0_0_10px_rgba(155,142,196,0.35)]">
                      {displayName.slice(0, 1) || "星"}
                    </span>
                  ) : (
                    <UserIcon className="h-5 w-5" />
                  )}
                  {auth.status === "authenticated"
                    ? "我的"
                    : auth.status === "loading"
                      ? "加载中"
                      : "登录"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 为固定导航预留间距 */}
      <div className="h-6 md:h-20" aria-hidden="true" />
    </>
  );
}
