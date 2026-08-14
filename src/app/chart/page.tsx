import type { Metadata } from "next";
import { ChartPage } from "./chart-view";

export const metadata: Metadata = {
  title: "我的星盘",
  description:
    "查看你的太阳、月亮与上升星座，从三个角度认识自己，读懂你的性格、情绪与关系模式。",
};

export default function Page() {
  return <ChartPage />;
}
