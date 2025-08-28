"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, ChevronLeft } from "lucide-react";
import Image from "next/image";

const items = [
  { href: "/", label: "Home", icon: Home },
  // { href: "/earnings", label: "Earnings", icon: Home },
  // { href: "/insiders", label: "Insiders", icon: Home },
  // { href: "/deals", label: "Deals", icon: Home },
  // { href: "/sectors", label: "Sectors", icon: Home },
  // { href: "/policy", label: "Policy", icon: Home },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed(!collapsed);

  return (
    <aside
      className={`bg-neutral-950/50 backdrop-blur-sm border-r border-white/5 transition-all duration-500 ease-in-out flex-shrink-0 overflow-hidden
                  ${collapsed ? "w-16" : "w-60"} h-full`}
    >
      {/* Logo, Brand, and Collapse button */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-white/5 transition-all duration-500 ease-in-out ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? (
          /* Centered logo when collapsed */
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center hover:bg-white/5 rounded-lg p-1 cursor-pointer transition-all duration-200 ease-out"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Image
              src="/logo.png"
              alt="Market Dash Logo"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
          </button>
        ) : (
          /* Logo and text when expanded */
          <>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Market Dash Logo"
                width={32}
                height={32}
                className="flex-shrink-0"
              />
              <div className="flex flex-col transition-all duration-500 ease-in-out overflow-hidden w-auto opacity-100">
                <span className="text-lg font-semibold text-white whitespace-nowrap transition-all duration-500 ease-in-out">Public Markets</span>
                <span className="text-xs text-neutral-400 whitespace-nowrap transition-all duration-500 ease-in-out">Dashboard</span>
              </div>
            </div>
            
            {/* Collapse button - only show when expanded */}
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5 transition-all duration-500 ease-in-out
                          ${active ? "bg-white/10 text-white" : "text-neutral-300"}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-500 ease-in-out overflow-hidden ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                {label}
              </span>
              {collapsed && <span className="sr-only">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
} 
