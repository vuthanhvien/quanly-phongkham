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
  ClipboardPlus,
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
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Khách hàng",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Lịch hẹn",
    href: "/admin/appointments",
    icon: CalendarDays,
  },
  {
    title: "Khám bệnh",
    href: "/admin/visits",
    icon: ClipboardPlus,
  },
  {
    title: "Hồ sơ bệnh án",
    href: "/admin/episodes",
    icon: Stethoscope,
  },
  {
    title: "Liệu trình",
    href: "/admin/treatments",
    icon: ClipboardList,
  },
  {
    title: "Kho & Vật tư",
    href: "/admin/warehouse",
    icon: Package,
    roles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE", "NURSE", "DOCTOR"],
  },
  {
    title: "Thu chi",
    href: "/admin/finance",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },
  {
    title: "Hoa hồng",
    href: "/admin/commissions",
    icon: TrendingUp,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "DOCTOR", "SALE", "NURSE"],
  },
  {
    title: "Báo cáo",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    title: "Nhân viên",
    href: "/admin/users",
    icon: UserCog,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "Chi nhánh",
    href: "/admin/branches",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
];
