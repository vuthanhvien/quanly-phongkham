import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  {
    name: "SUPER_ADMIN",
    permissions: [{ module: "*", actions: ["*"] }],
  },
  {
    name: "ADMIN",
    permissions: [
      { module: "customers", actions: ["read", "write", "delete"] },
      { module: "appointments", actions: ["read", "write", "delete"] },
      { module: "episodes", actions: ["read", "write"] },
      { module: "warehouse", actions: ["read", "write"] },
      { module: "finance", actions: ["read", "write"] },
      { module: "commissions", actions: ["read"] },
      { module: "reports", actions: ["read"] },
      { module: "users", actions: ["read", "write"] },
    ],
  },
  {
    name: "DOCTOR",
    permissions: [
      { module: "customers", actions: ["read", "write"] },
      { module: "appointments", actions: ["read", "write"] },
      { module: "episodes", actions: ["read", "write"] },
      { module: "warehouse", actions: ["read"] },
      { module: "commissions", actions: ["read"] },
    ],
  },
  {
    name: "NURSE",
    permissions: [
      { module: "customers", actions: ["read"] },
      { module: "appointments", actions: ["read", "write"] },
      { module: "episodes", actions: ["read", "write"] },
      { module: "warehouse", actions: ["read", "write"] },
    ],
  },
  {
    name: "RECEPTIONIST",
    permissions: [
      { module: "customers", actions: ["read", "write"] },
      { module: "appointments", actions: ["read", "write", "delete"] },
      { module: "finance", actions: ["read", "write"] },
    ],
  },
  {
    name: "SALE",
    permissions: [
      { module: "customers", actions: ["read", "write"] },
      { module: "appointments", actions: ["read", "write"] },
      { module: "commissions", actions: ["read"] },
    ],
  },
  {
    name: "WAREHOUSE",
    permissions: [
      { module: "warehouse", actions: ["read", "write"] },
    ],
  },
  {
    name: "ACCOUNTANT",
    permissions: [
      { module: "finance", actions: ["read", "write"] },
      { module: "commissions", actions: ["read", "write"] },
      { module: "reports", actions: ["read"] },
    ],
  },
];

async function main() {
  console.log("🌱 Bắt đầu seed...");

  // Tạo roles
  console.log("  → Tạo roles...");
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }

  // Tạo branches mẫu
  console.log("  → Tạo chi nhánh mẫu...");
  const branch1 = await prisma.branch.upsert({
    where: { slug: "co-so-chinh" },
    update: {},
    create: {
      name: "Cơ sở Chính",
      slug: "co-so-chinh",
      address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
      phone: "028 3822 1234",
    },
  });

  await prisma.branch.upsert({
    where: { slug: "co-so-2" },
    update: {},
    create: {
      name: "Cơ sở 2",
      slug: "co-so-2",
      address: "456 Lê Văn Sỹ, Quận 3, TP.HCM",
      phone: "028 3855 5678",
    },
  });

  // Tạo SUPER_ADMIN
  console.log("  → Tạo tài khoản admin...");
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: "admin@phongkham.vn" },
    update: {},
    create: {
      fullName: "Super Admin",
      email: "admin@phongkham.vn",
      passwordHash,
      roleId: superAdminRole!.id,
      branchId: null, // SUPER_ADMIN không gắn với chi nhánh cụ thể
    },
  });

  // Tạo 1 tài khoản ADMIN mẫu gắn với branch1
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const adminHash = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: "quanly@phongkham.vn" },
    update: {},
    create: {
      fullName: "Nguyễn Thị Quản Lý",
      email: "quanly@phongkham.vn",
      passwordHash: adminHash,
      roleId: adminRole!.id,
      branchId: branch1.id,
    },
  });

  console.log("✅ Seed hoàn thành!");
  console.log("");
  console.log("  Tài khoản đăng nhập:");
  console.log("  ┌─────────────────────────────────────────┐");
  console.log("  │ Super Admin: admin@phongkham.vn         │");
  console.log("  │ Mật khẩu:   Admin@123                   │");
  console.log("  ├─────────────────────────────────────────┤");
  console.log("  │ Quản lý:    quanly@phongkham.vn         │");
  console.log("  │ Mật khẩu:   Admin@123                   │");
  console.log("  └─────────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
