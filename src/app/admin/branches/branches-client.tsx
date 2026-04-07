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
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";

const branchSchema = z.object({
  name:    z.string().min(1, "Tên chi nhánh không được để trống"),
  slug:    z.string().min(1, "Slug không được để trống").regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu -"),
  address: z.string().optional(),
  phone:   z.string().optional(),
});
type BranchForm = z.infer<typeof branchSchema>;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const Count = styled.span`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;

interface Branch {
  id: string; name: string; slug: string;
  address: string | null; phone: string | null; isActive: boolean;
  _count: { users: number; customers: number };
}

export function BranchesClient({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
  });

  const onSubmit = async (data: BranchForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Tạo chi nhánh thành công");
      setOpen(false); reset(); router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionHeader>
        <Count>{branches.length} chi nhánh</Count>
        <Button appearance="primary" onClick={() => setOpen(true)}>
          <Plus /> Thêm chi nhánh
        </Button>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th>Chi nhánh</Th>
              <Th>Slug</Th>
              <Th>Địa chỉ</Th>
              <Th>Điện thoại</Th>
              <Th width={60} style={{ textAlign: "center" }}>NV</Th>
              <Th width={60} style={{ textAlign: "center" }}>KH</Th>
              <Th width={100}>Trạng thái</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {branches.length === 0
              ? <TableEmpty colSpan={7} icon={<Building2 />} message="Chưa có chi nhánh nào" />
              : branches.map((b) => (
                <Tr key={b.id}>
                  <Td bold>{b.name}</Td>
                  <Td muted>{b.slug}</Td>
                  <Td>{b.address ?? "–"}</Td>
                  <Td>{b.phone ?? "–"}</Td>
                  <Td center>{b._count.users}</Td>
                  <Td center>{b._count.customers}</Td>
                  <Td>
                    <Badge appearance={b.isActive ? "success" : "neutral"} styleVariant="subtle">
                      {b.isActive ? "Hoạt động" : "Đã đóng"}
                    </Badge>
                  </Td>
                </Tr>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={open} onOpenChange={setOpen} title="Thêm chi nhánh mới" size="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FormGrid>
                <Field label="Tên chi nhánh" required error={errors.name?.message}>
                  <TextField placeholder="Cơ sở Quận 1" isInvalid={!!errors.name} {...register("name")} />
                </Field>
                <Field label="Slug (URL)" required error={errors.slug?.message} hint="VD: co-so-quan-1">
                  <TextField placeholder="co-so-quan-1" isInvalid={!!errors.slug} {...register("slug")} />
                </Field>
              </FormGrid>
              <Field label="Địa chỉ">
                <TextField placeholder="123 Nguyễn Huệ, Quận 1..." {...register("address")} />
              </Field>
              <Field label="Số điện thoại">
                <TextField placeholder="028 xxxx xxxx" {...register("phone")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => { setOpen(false); reset(); }}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={loading}>
              {loading ? "Đang lưu..." : "Tạo chi nhánh"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
