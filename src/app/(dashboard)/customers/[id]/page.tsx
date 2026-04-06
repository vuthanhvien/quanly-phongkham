import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { CustomerDetailClient } from "./customer-detail-client";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      branch:       { select: { id: true, name: true } },
      createdBy:    { select: { id: true, fullName: true } },
      assignedSale: { select: { id: true, fullName: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
      episodes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, chiefComplaint: true, status: true, createdAt: true },
      },
      appointments: {
        orderBy: { startTime: "desc" },
        take: 10,
        select: { id: true, startTime: true, status: true, note: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, totalAmount: true, status: true, createdAt: true },
      },
    },
  });

  if (!customer) notFound();

  // Branch isolation
  if (session.user.role !== "SUPER_ADMIN" && customer.branchId !== session.user.branchId) {
    redirect("/customers");
  }

  // Serialize (Decimal → number, Date → string)
  const serialized = JSON.parse(JSON.stringify({
    ...customer,
    totalSpent: Number(customer.totalSpent),
    discountRate: Number(customer.discountRate),
    invoices: customer.invoices.map(inv => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
    })),
  }));

  const sales = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ["SALE", "ADMIN", "SUPER_ADMIN", "DOCTOR"] } },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <AppHeader title={customer.fullName} />
      <PageBody>
        <CustomerDetailClient
          customer={serialized}
          sales={sales}
          currentUserId={session.user.id}
        />
      </PageBody>
    </>
  );
}
