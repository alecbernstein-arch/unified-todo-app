"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <Icon>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </Icon>
    ),
  },
  {
    href: "/triage",
    label: "Triage",
    icon: (
      <Icon>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </Icon>
    ),
  },
  {
    href: "/todo",
    label: "Todo",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </Icon>
    ),
  },
  {
    href: "/completed",
    label: "Completed",
    icon: (
      <Icon>
        <rect width="20" height="5" x="2" y="3" rx="1" />
        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
      </Icon>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <Icon>
        <line x1="4" x2="4" y1="21" y2="14" />
        <line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" />
        <line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" />
        <line x1="20" x2="20" y1="12" y2="3" />
        <line x1="2" x2="6" y1="14" y2="14" />
        <line x1="10" x2="14" y1="8" y2="8" />
        <line x1="18" x2="22" y1="16" y2="16" />
      </Icon>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mac / iPad: top navigation */}
      <header className="sticky top-0 z-10 hidden border-b border-line bg-paper/90 backdrop-blur md:block">
        <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
          <span className="mr-4 text-base font-semibold tracking-tight text-ink">Todo</span>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/10 hover:text-ink"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 md:pb-12 md:pt-8">
        {children}
      </main>

      {/* iPhone: bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-amber" : "text-ink/70"
                )}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
