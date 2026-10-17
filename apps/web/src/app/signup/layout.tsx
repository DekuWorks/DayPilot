import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a DayPilot account on the web.",
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
