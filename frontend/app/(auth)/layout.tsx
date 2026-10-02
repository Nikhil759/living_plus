import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · Living+",
  description: "Join your society on Living+.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
