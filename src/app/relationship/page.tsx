import type { Metadata } from "next";
import { RelationshipPage } from "./relationship-view";

export const metadata: Metadata = {
  title: "关系星图",
  description:
    "输入你与 TA 的出生信息，看看你们的星星如何相遇——吸引力、容易误解的地方，以及这段关系可能带来的成长。",
};

export default function Page() {
  return <RelationshipPage />;
}
