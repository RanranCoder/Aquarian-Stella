import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = [
  { label: "今日星语", href: "/today" },
  { label: "我的星盘", href: "/chart" },
  { label: "关系星图", href: "/relationship" },
  { label: "我的星愿", href: "/wishes" },
  { label: "探索星座", href: "/explore" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 pb-32 md:pb-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="hairline-t py-10">
          <div className="flex flex-col items-center gap-6">
            <Link href="/" className="block" aria-label="星语星愿 首页">
              <Image
                src="/brand/logo-dark.png"
                alt="星语星愿"
                width={435}
                height={161}
                className="h-8 w-auto max-w-none"
                loading="eager"
              />
            </Link>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {FOOTER_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-moon-400 transition-colors hover:text-moon-100"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <p className="max-w-md text-center text-xs leading-relaxed text-moon-500">
              本产品内容用于娱乐、文化与自我探索，不构成医疗、心理、法律、投资或其他专业建议。
              <br />
              我们不告诉你命运是什么，我们只是把星星翻译成你可以理解的话。
            </p>

            <p className="text-xs text-moon-500">
              © {new Date().getFullYear()} 星语星愿 · 看见星象，也看见自己
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
