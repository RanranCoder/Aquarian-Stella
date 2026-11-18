import type { Metadata } from "next";
import { WishesPage } from "./wishes-view";

export const metadata: Metadata = {
  title: "我的星愿",
  description:
    "写下你的星愿，让星星陪你看它慢慢实现。爱情、成长、生活、事业，把想去的地方写下来。",
  // 个性化工具页：内容在客户端渲染且依赖登录，对搜索引擎无收录价值
  robots: { index: false, follow: true },
};

export default function Page() {
  return <WishesPage />;
}
