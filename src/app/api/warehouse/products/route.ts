import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name:            z.string().min(1, "Tên sản phẩm không được để trống"),
  code:            z.string().min(1, "Mã sản phẩm không được để trống"),
  barcode:         z.string().optional(),
  productType:     z.enum(["CONSUMABLE", "REUSABLE", "RETAIL"]),
  categoryName:    z.string().min(1, "Nhóm sản phẩm không được để trống"),
  supplierName:    z.string().min(1, "Nhà cung cấp không được để trống"),
  purchaseUnit:    z.string().min(1, "Đơn vị nhập không được để trống"),
  usageUnit:       z.string().min(1, "Đơn vị sử dụng không được để trống"),
  conversionFactor: z.number().positive().default(1),
  purchasePrice:   z.number().min(0),
  sellingPrice:    z.number().min(0),
  minStockLevel:   z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search")   ?? "";
  const typeF    = searchParams.get("type")     ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { isActive: true };
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (typeF)  where.productType = typeF;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
        batches: {
          where: { remainingQty: { gt: 0 } },
          select: { branchId: true, remainingQty: true },
        },
      },
    }),
  ]);

  return NextResponse.json({ data: products, total, page, pageSize });
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

  // Check duplicate code
  const existing = await prisma.product.findUnique({ where: { code: d.code } });
  if (existing) return NextResponse.json({ message: `Mã sản phẩm "${d.code}" đã tồn tại` }, { status: 409 });

  // FindOrCreate category
  let category = await prisma.productCategory.findFirst({
    where: { name: { equals: d.categoryName, mode: "insensitive" } },
  });
  if (!category) {
    category = await prisma.productCategory.create({
      data: { name: d.categoryName, type: d.productType },
    });
  }

  // FindOrCreate supplier
  let supplier = await prisma.supplier.findFirst({
    where: { name: { equals: d.supplierName, mode: "insensitive" } },
  });
  if (!supplier) {
    const lastSupplier = await prisma.supplier.findFirst({ orderBy: { code: "desc" } });
    const num = lastSupplier ? parseInt(lastSupplier.code.replace("NCC", "")) + 1 : 1;
    const code = "NCC" + String(num).padStart(4, "0");
    supplier = await prisma.supplier.create({ data: { code, name: d.supplierName } });
  }

  const product = await prisma.product.create({
    data: {
      code:            d.code,
      barcode:         d.barcode || null,
      name:            d.name,
      categoryId:      category.id,
      supplierId:      supplier.id,
      productType:     d.productType,
      purchaseUnit:    d.purchaseUnit,
      usageUnit:       d.usageUnit,
      conversionFactor: d.conversionFactor,
      purchasePrice:   d.purchasePrice,
      sellingPrice:    d.sellingPrice,
      minStockLevel:   d.minStockLevel,
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  return NextResponse.json(product, { status: 201 });
}
