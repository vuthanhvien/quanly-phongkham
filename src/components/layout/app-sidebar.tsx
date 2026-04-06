"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { navItems } from "./nav-items";
import { LogOut, Building2 } from "lucide-react";
import {
  SidebarRoot, SidebarLogo, SidebarLogoIcon, SidebarLogoText,
  SidebarLogoTitle, SidebarLogoBranch,
  SidebarNav, SidebarSection,
  NavItem, NavItemText,
  SidebarUser, UserAvatar, UserInfo, UserName, UserRole,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const initials = session?.user?.name
    ?.split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <SidebarRoot>
      {/* Logo */}
      <SidebarLogo>
        <SidebarLogoIcon>
          <Building2 />
        </SidebarLogoIcon>
        <SidebarLogoText>
          <SidebarLogoTitle>Phòng Khám</SidebarLogoTitle>
          {session?.user?.branchName && (
            <SidebarLogoBranch>{session.user.branchName}</SidebarLogoBranch>
          )}
        </SidebarLogoText>
      </SidebarLogo>

      {/* Nav */}
      <SidebarNav>
        <SidebarSection>
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <NavItem key={item.href} as={Link} href={item.href} $active={isActive}>
                <item.icon />
                <NavItemText>{item.title}</NavItemText>
              </NavItem>
            );
          })}
        </SidebarSection>
      </SidebarNav>

      {/* User */}
      <SidebarUser onClick={() => signOut({ callbackUrl: "/login" })}>
        <UserAvatar>{initials}</UserAvatar>
        <UserInfo>
          <UserName>{session?.user?.name}</UserName>
          <UserRole>{session?.user?.role}</UserRole>
        </UserInfo>
        <LogOut style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
      </SidebarUser>
    </SidebarRoot>
  );
}
