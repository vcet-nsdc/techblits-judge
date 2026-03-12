"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Gamepad2,
  Users,
  Gavel,
  Building2,
  Award,
  LogOut,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/admin/competition", label: "Competition Control", icon: Gamepad2 },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/judges", label: "Judges", icon: Gavel },
  { href: "/admin/seminar-hall", label: "Seminar Hall", icon: Building2 },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    document.cookie = "refreshToken=; Max-Age=0; path=/";
    localStorage.removeItem("adminToken");
    router.push("/admin");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col min-h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin/dashboard" className="font-display text-2xl text-[#ff1a1a]">
            TECH<span className="text-white">BLITZ</span>
          </Link>
          <p className="text-gray-400 text-sm mt-1 font-body">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4">
          {sidebarLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-heading transition-colors ${
                  isActive
                    ? "bg-[#ff1a1a] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-sm font-heading text-gray-300 hover:text-[#ff1a1a] transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
