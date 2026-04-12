import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  productId:    z.string().min(1, "Vui lòng chọn sản phẩm"),
  batchNumber:  z.string().min(1, "Số lô không được để trống"),
  expiryDate:   z.string().optional(),
  quantityIn:   z.number().positive("Số lượng phải lớn hơn 0"),
  purchasePrice: z.number().min(0),
  supplierName: z.string().optional(),
  note:         z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") ?? "";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize  = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(productId ? { productId } : {}),
  };

  const [total, batches] = await Promise.all([
    prisma.stockBatch.count({ where }),
    prisma.stockBatch.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product:  { select: { id: true, code: true, name: true, purchaseUnit: true } },
        supplier: { select: { name: true } },
        branch:   { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: batches, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "WAREHOUSE"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const branchId = session.user.branchId ?? body.branchId;
  if (!branchId) return NextResponse.json({ message: "Không xác định được chi nhánh" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: d.productId },
    select: { supplierId: true, conversionFactor: true },
  });
  if (!product) return NextResponse.json({ message: "Không tìm thấy sản phẩm" }, { status: 404 });

  // Find or use product's supplier or override
  let supplierId = product.supplierId;
  if (d.supplierName) {
    const sup = await prisma.supplier.findFirst({
      where: { name: { equals: d.supplierName, mode: "insensitive" } },
    });
    if (sup) supplierId = sup.id;
  }

  const qtyInUsage = d.quantityIn * Number(product.conversionFactor);

  const batch = await prisma.stockBatch.create({
    data: {
      productId:      d.productId,
      branchId,
      supplierId,
      batchNumber:    d.batchNumber,
      expiryDate:     d.expiryDate ? new Date(d.expiryDate) : null,
      quantityIn:     d.quantityIn,
      quantityInUsage: qtyInUsage,
      remainingQty:   qtyInUsage,
      purchasePrice:  d.purchasePrice,
      receivedAt:     new Date(),
      note:           d.note || null,
      createdById:    session.user.id,
    },
    include: {
      product:  { select: { id: true, code: true, name: true, purchaseUnit: true } },
      supplier: { select: { name: true } },
      branch:   { select: { name: true } },
      createdBy: { select: { fullName: true } },
    },
  });

  // Record stock movement
  await prisma.stockMovement.create({
    data: {
      productId:    d.productId,
      batchId:      batch.id,
      type:         "IN",
      quantity:     d.quantityIn,
      unit:         batch.product.purchaseUnit,
      reference:    batch.batchNumber,
      referenceType: "IMPORT",
      note:         d.note || null,
      createdById:  session.user.id,
    },
  });

  return NextResponse.json(batch, { status: 201 });
}
