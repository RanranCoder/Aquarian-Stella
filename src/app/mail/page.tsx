import type { Metadata } from "next";
import { MailView } from "./mail-view";

export const metadata: Metadata = {
  title: "星邮",
  description:
    "有些话，也许现在说不出口。但你可以先把它写下来，让 Stella 替你寄给 Ta。",
  // 个性化工具页：内容在客户端渲染且依赖登录，对搜索引擎无收录价值
  robots: { index: false, follow: true },
};

export default function Page() {
  return <MailView />;
}
