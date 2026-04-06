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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, UserCog } from "lucide-react";

const userSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  roleId: z.string().min(1, "Vui lòng chọn vai trò"),
  branchId: z.string().optional(),
  phone: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Quản lý",
  DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng",
  RECEPTIONIST: "Lễ tân",
  SALE: "Tư vấn",
  WAREHOUSE: "Thủ kho",
  ACCOUNTANT: "Kế toán",
};

export function UsersClient({
  users,
  roles,
  branches,
  isSuperAdmin,
  currentBranchId,
}: {
  users: any[];
  roles: any[];
  branches: any[];
  isSuperAdmin: boolean;
  currentBranchId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { branchId: currentBranchId ?? undefined },
  });

  const onSubmit = async (data: UserForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Lỗi không xác định");
      }
      toast.success("Tạo tài khoản thành công");
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
        <p className="text-sm text-muted-foreground">{users.length} tài khoản</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Thêm tài khoản
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm tài khoản mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Họ và tên *</Label>
                  <Input placeholder="Nguyễn Văn A" {...register("fullName")} />
                  {errors.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input placeholder="0901234567" {...register("phone")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="nhanvien@phongkham.vn" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu *</Label>
                <Input type="password" placeholder="Tối thiểu 6 ký tự" {...register("password")} />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vai trò *</Label>
                  <Select onValueChange={(v) => setValue("roleId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {ROLE_LABELS[r.name] ?? r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.roleId && (
                    <p className="text-xs text-red-500">{errors.roleId.message}</p>
                  )}
                </div>
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>Chi nhánh</Label>
                    <Select
                      defaultValue={currentBranchId ?? undefined}
                      onValueChange={(v) => setValue("branchId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tất cả (Super Admin)</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  <UserCog className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Chưa có tài khoản nào
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ROLE_LABELS[u.role?.name] ?? u.role?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.branch?.name ?? "Tất cả"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? "Hoạt động" : "Đã khóa"}
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
