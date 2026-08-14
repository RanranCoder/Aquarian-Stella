import type { Metadata } from "next";
import { ProfilePage } from "./profile-view";

export const metadata: Metadata = {
  title: "个人中心",
  description: "管理你的出生资料、星愿记录、隐私与显示偏好。",
};

export default function Page() {
  return <ProfilePage />;
}
