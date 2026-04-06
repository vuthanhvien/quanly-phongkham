import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Package,
  FileText,
  Building2,
  UserCog,
  ClipboardList,
  TrendingUp,
  Stethoscope,
  BarChart3,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: string[]; // undefined = tất cả roles
};

export const navItems: NavItem[] = [
  {
    title: "Tổng quan",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Khách hàng",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Lịch hẹn",
    href: "/appointments",
    icon: CalendarDays,
  },
  {
    title: "Hồ sơ bệnh án",
    href: "/episodes",
    icon: Stethoscope,
  },
  {
    title: "Liệu trình",
    href: "/treatments",
    icon: ClipboardList,
  },
  {
    title: "Kho & Vật tư",
    href: "/warehouse",
    icon: Package,
    roles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE", "NURSE", "DOCTOR"],
  },
  {
    title: "Thu chi",
    href: "/finance",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },
  {
    title: "Hoa hồng",
    href: "/commissions",
    icon: TrendingUp,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "DOCTOR", "SALE", "NURSE"],
  },
  {
    title: "Báo cáo",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    title: "Nhân viên",
    href: "/users",
    icon: UserCog,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "Chi nhánh",
    href: "/branches",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
];
