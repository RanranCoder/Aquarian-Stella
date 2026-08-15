import type { Metadata } from "next";
import { MailView } from "./mail-view";

export const metadata: Metadata = {
  title: "星邮",
  description:
    "有些话，也许现在说不出口。但你可以先把它写下来，让 Stella 替你寄给 Ta。",
};

export default function Page() {
  return <MailView />;
}
