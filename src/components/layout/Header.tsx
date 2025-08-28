"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RotateCw } from "lucide-react";
import { LastUpdated } from "./LastUpdated";

// Reuse these on any page banner so it matches the header 1:1
export const HEADER_BG = "bg-neutral-950";
export const HEADER_BORDER = "border-b border-white/5";

export function Header() {
  // Removed demo data checkbox per request
  const [isPending, startTransition] = useTransition();

  return (
    <header className={cn("sticky top-0 z-40 h-14 md:h-16", HEADER_BG, HEADER_BORDER)}>
      <div className="mx-auto max-w-screen-2xl w-full px-4 md:px-6 lg:px-8 h-full">
        <div className="h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile drawer toggle removed since sidebar is hidden */}
            <h1 className="text-lg font-semibold text-white tracking-tight">Market Dashboard</h1>
            <Separator orientation="vertical" className="h-5" />
            <LastUpdated />
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
              onClick={() =>
                startTransition(async () => {
                  try {
                    const res = await fetch("/api/refresh", { method: "GET", cache: "no-store" });
                    if (!res.ok) console.error("/api/refresh", res.status, await res.text());
                  } catch (e) {
                    console.error(e);
                  }
                })
              }
              disabled={isPending}
            >
              <RotateCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
