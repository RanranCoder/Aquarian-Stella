import type { Metadata } from "next";
import { WishesPage } from "./wishes-view";

export const metadata: Metadata = {
  title: "我的星愿",
  description:
    "写下你的星愿，让星星陪你看它慢慢实现。爱情、成长、生活、事业，把想去的地方写下来。",
};

export default function Page() {
  return <WishesPage />;
}
