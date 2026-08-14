import type { Metadata } from "next";
import { OnboardingPage } from "./onboarding-view";

export const metadata: Metadata = {
  title: "开始探索",
  description:
    "输入出生信息，生成你的第一封星语。星语星愿，把星星翻译成你可以理解的语言。",
};

export default function Page() {
  return <OnboardingPage />;
}
