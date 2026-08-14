import type { Metadata } from "next";
import { LoginView } from "./login-view";

export const metadata: Metadata = {
  title: "登录",
  description: "登录星语星愿，保存你的出生信息与星愿。",
};

export default function Page() {
  return <LoginView />;
}
