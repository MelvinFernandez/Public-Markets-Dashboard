"use client";

import { ReactNode } from "react";
import { PageTransition } from "@/components/shared/PageTransition";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>{children}</PageTransition>
  );
}


