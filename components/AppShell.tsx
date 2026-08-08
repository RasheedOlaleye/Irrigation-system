"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">

      <div className="flex">

        <Sidebar />

        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          {children}
        </div>

      </div>

      <MobileNav />

    </div>
  );
}