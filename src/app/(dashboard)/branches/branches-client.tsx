"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2 } from "lucide-react";

const branchSchema = z.object({
  name: z.string().min(1, "Tên chi nhánh không được để trống"),
  slug: z
    .string()
    .min(1, "Slug không được để trống")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type BranchForm = z.infer<typeof branchSchema>;

interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { users: number; customers: number };
}

export function BranchesClient({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchForm>({ resolver: zodResolver(branchSchema) });

  const onSubmit = async (data: BranchForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Lỗi không xác định");
      }
      toast.success("Tạo chi nhánh thành công");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {branches.length} chi nhánh
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Thêm chi nhánh
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm chi nhánh mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Tên chi nhánh *</Label>
                <Input placeholder="VD: Cơ sở Quận 1" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Slug (URL) *</Label>
                <Input placeholder="VD: co-so-quan-1" {...register("slug")} />
                {errors.slug && (
                  <p className="text-xs text-red-500">{errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Input placeholder="Địa chỉ chi nhánh" {...register("address")} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input placeholder="0901234567" {...register("phone")} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-center">NV</TableHead>
              <TableHead className="text-center">KH</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Chưa có chi nhánh nào
                </TableCell>
              </TableRow>
            ) : (
              branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.slug}
                  </TableCell>
                  <TableCell className="text-sm">{b.address ?? "–"}</TableCell>
                  <TableCell className="text-sm">{b.phone ?? "–"}</TableCell>
                  <TableCell className="text-center">{b._count.users}</TableCell>
                  <TableCell className="text-center">
                    {b._count.customers}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.isActive ? "default" : "secondary"}>
                      {b.isActive ? "Hoạt động" : "Đã đóng"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
