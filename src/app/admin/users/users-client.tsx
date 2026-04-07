"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Plus, UserCog } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Quản lý", DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng", RECEPTIONIST: "Lễ tân", SALE: "Tư vấn",
  WAREHOUSE: "Thủ kho", ACCOUNTANT: "Kế toán",
};

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const userSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email:    z.email("Email không hợp lệ"),
  password: z.string().min(6, "Tối thiểu 6 ký tự"),
  roleId:   z.string().min(1, "Vui lòng chọn vai trò"),
  branchId: z.string().optional(),
  phone:    z.string().optional(),
});
type UserForm = z.infer<typeof userSchema>;

export function UsersClient({ users, roles, branches, isSuperAdmin, currentBranchId }: {
  users: { id: string; fullName: string; email: string; isActive: boolean; role?: { name: string }; branch?: { name: string } | null }[];
  roles: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  isSuperAdmin: boolean; currentBranchId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState(currentBranchId ?? "");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { branchId: currentBranchId ?? undefined },
  });

  const onClose = () => { setOpen(false); reset(); setRoleId(""); setBranchId(currentBranchId ?? ""); };

  const onSubmit = async (data: UserForm) => {
    if (!roleId) return toast.error("Vui lòng chọn vai trò");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, roleId, branchId: branchId || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Tạo tài khoản thành công");
      onClose(); router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = roles.map((r) => ({ value: r.id, label: ROLE_LABELS[r.name] ?? r.name }));
  const branchOptions = [
    { value: "none", label: "Tất cả (Super Admin)" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <>
      <SectionHeader>
        <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>{users.length} tài khoản</span>
        <Button appearance="primary" onClick={() => setOpen(true)}>
          <Plus /> Thêm tài khoản
        </Button>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th>Họ tên</Th>
              <Th>Email</Th>
              <Th>Vai trò</Th>
              <Th>Chi nhánh</Th>
              <Th width={100}>Trạng thái</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {users.length === 0
              ? <TableEmpty colSpan={5} icon={<UserCog />} message="Chưa có tài khoản nào" />
              : users.map((u) => (
                <Tr key={u.id}>
                  <Td bold>{u.fullName}</Td>
                  <Td muted>{u.email}</Td>
                  <Td>
                    <Badge appearance="default" styleVariant="subtle">
                      {u.role ? (ROLE_LABELS[u.role.name] ?? u.role.name) : "–"}
                    </Badge>
                  </Td>
                  <Td>{u.branch?.name ?? <span style={{ color: t.colorTextSubtlest }}>Tất cả</span>}</Td>
                  <Td>
                    <Badge appearance={u.isActive ? "success" : "neutral"} styleVariant="subtle">
                      {u.isActive ? "Hoạt động" : "Đã khóa"}
                    </Badge>
                  </Td>
                </Tr>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={open} onOpenChange={onClose} title="Thêm tài khoản mới" size="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FormGrid>
                <Field label="Họ và tên" required error={errors.fullName?.message}>
                  <TextField placeholder="Nguyễn Văn A" isInvalid={!!errors.fullName} {...register("fullName")} />
                </Field>
                <Field label="Số điện thoại">
                  <TextField placeholder="0901234567" {...register("phone")} />
                </Field>
              </FormGrid>
              <Field label="Email" required error={errors.email?.message}>
                <TextField type="email" placeholder="nhanvien@phongkham.vn" isInvalid={!!errors.email} {...register("email")} />
              </Field>
              <Field label="Mật khẩu" required error={errors.password?.message}>
                <TextField type="password" placeholder="Tối thiểu 6 ký tự" isInvalid={!!errors.password} {...register("password")} />
              </Field>
              <FormGrid>
                <Field label="Vai trò" required>
                  <Select
                    options={roleOptions}
                    value={roleId}
                    onChange={setRoleId}
                    placeholder="Chọn vai trò"
                    isInvalid={!roleId}
                  />
                </Field>
                {isSuperAdmin && (
                  <Field label="Chi nhánh">
                    <Select
                      options={branchOptions}
                      value={branchId || "none"}
                      onChange={setBranchId}
                      placeholder="Chọn chi nhánh"
                    />
                  </Field>
                )}
              </FormGrid>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={loading}>
              {loading ? "Đang lưu..." : "Tạo tài khoản"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
