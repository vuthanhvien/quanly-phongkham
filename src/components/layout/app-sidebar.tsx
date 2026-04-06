"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Phòng Khám</p>
          {session?.user?.branchName && (
            <p className="text-xs text-muted-foreground">
              {session.user.branchName}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
            {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{session?.user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
