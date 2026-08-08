"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Home",
    href: "/",
    icon: "⌂",
  },
  {
    name: "Plant",
    href: "/plant",
    icon: "🌱",
  },
  {
    name: "Logs",
    href: "/logs",
    icon: "▤",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙",
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">

      <div className="mx-auto flex max-w-lg items-center justify-around">

        {navigation.map((item) => {

          const active =
            pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 px-3 py-3 text-[11px] font-medium transition ${
                active
                  ? "text-blue-600"
                  : "text-slate-400"
              }`}
            >

              <span className="text-lg">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>

            </Link>
          );
        })}

      </div>

    </nav>
  );
}