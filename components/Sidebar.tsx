"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Dashboard",
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">

      <div className="flex h-full flex-col">

        {/* Logo */}

        <div className="border-b border-slate-100 px-6 py-6">

          <Link
            href="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl">
              🌱
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Smart Irrigation
              </p>

              <p className="text-xs text-slate-400">
                Plant care system
              </p>
            </div>

          </Link>

        </div>

        {/* Navigation */}

        <nav className="flex-1 px-4 py-6">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>

          <div className="space-y-1">

            {navigation.map((item) => {

              const active =
                pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >

                  <span className="flex w-6 justify-center text-base">
                    {item.icon}
                  </span>

                  {item.name}

                </Link>
              );
            })}

          </div>

        </nav>

        {/* Bottom information */}

        <div className="border-t border-slate-100 p-4">

          <div className="rounded-2xl bg-blue-50 p-4">

            <p className="text-xs font-semibold text-blue-600">
              Smart watering
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your plant receives water based on its moisture requirements.
            </p>

          </div>

        </div>

      </div>

    </aside>
  );
}