"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Header at the top */}
      <Header />
      
      {/* Main content area with sidebar */}
      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pt-4">
        {/* Sidebar below header */}
        <Sidebar />
        
        {/* Main content */}
        <main className="flex-1 pt-0 px-4 md:px-6 lg:px-8 pb-10">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
