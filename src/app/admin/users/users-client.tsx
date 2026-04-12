"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Plus, UserCog, Pencil, ShieldCheck } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserProfile = {
  specialty:     string | null;
  licenseNumber: string | null;
  experience:    number | null;
  bio:           string | null;
  position:      string | null;
  department:    string | null;
  workDays:      string[];
} | null;

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role:    { id: string; name: string } | null;
  branch:  { id: string; name: string } | null;
  profile: UserProfile;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:  "Super Admin",
  ADMIN:        "Quản lý",
  DOCTOR:       "Bác sĩ",
  NURSE:        "Y tá / Điều dưỡng",
  RECEPTIONIST: "Lễ tân",
  SALE:         "Tư vấn",
  WAREHOUSE:    "Thủ kho",
  ACCOUNTANT:   "Kế toán",
};

const ROLE_APPEARANCE: Record<string, "primary"|"danger"|"success"|"warning"|"neutral"|"discovery"|"default"> = {
  SUPER_ADMIN:  "danger",
  ADMIN:        "discovery",
  DOCTOR:       "primary",
  NURSE:        "success",
  RECEPTIONIST: "warning",
  SALE:         "primary",
  WAREHOUSE:    "neutral",
  ACCOUNTANT:   "neutral",
};

const MEDICAL_ROLES = ["DOCTOR", "NURSE"];

const WEEKDAYS = [
  { key: "mon", label: "T2" },
  { key: "tue", label: "T3" },
  { key: "wed", label: "T4" },
  { key: "thu", label: "T5" },
  { key: "fri", label: "T6" },
  { key: "sat", label: "T7" },
  { key: "sun", label: "CN" },
];

const SPECIALTY_OPTIONS = [
  "Thẩm mỹ tổng quát", "Da liễu thẩm mỹ", "Nha khoa thẩm mỹ",
  "Phẫu thuật tạo hình", "Điêu khắc cơ thể", "Laser & Công nghệ cao",
  "Chăm sóc da", "Điều dưỡng thẩm mỹ", "Tư vấn thẩm mỹ",
];

const DEPARTMENT_OPTIONS_BY_ROLE: Record<string, string[]> = {
  SALE:         ["Phòng Tư vấn", "Phòng Marketing"],
  RECEPTIONIST: ["Phòng Lễ tân", "Phòng Hành chính"],
  WAREHOUSE:    ["Phòng Kho", "Phòng Cung ứng"],
  ACCOUNTANT:   ["Phòng Kế toán", "Phòng Tài chính"],
  ADMIN:        ["Ban Quản lý", "Phòng Hành chính"],
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const baseFields = {
  fullName:      z.string().min(1, "Họ tên không được để trống"),
  email:         z.string().email("Email không hợp lệ"),
  phone:         z.string().optional(),
  roleId:        z.string().min(1, "Vui lòng chọn vai trò"),
  branchId:      z.string().optional(),
  specialty:     z.string().optional(),
  licenseNumber: z.string().optional(),
  experience:    z.number().int().min(0).optional(),
  bio:           z.string().optional(),
  position:      z.string().optional(),
  department:    z.string().optional(),
};

const createSchema = z.object({
  ...baseFields,
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  ...baseFields,
  password: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const FormGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$cols ?? 2}, 1fr);
  gap: 14px;
`;

const SectionTitle = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 700;
  color: ${t.colorTextSubtle};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0 2px;
  border-bottom: 1px solid ${t.colorBorder};
  margin-top: 4px;
`;

const DayBtn = styled.button<{ $on: boolean }>`
  width: 36px; height: 36px;
  border-radius: ${t.radiusFull};
  border: 1px solid ${p => p.$on ? t.colorBorderSelected : t.colorBorder};
  background: ${p => p.$on ? t.colorBgSelected : t.colorBgDefault};
  color: ${p => p.$on ? t.colorTextBrand : t.colorTextSubtle};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  font-weight: ${p => p.$on ? 700 : 400};
  cursor: pointer;
  transition: all ${t.durationFast};
  &:hover { background: ${p => p.$on ? t.colorBgSelectedHover : t.colorBgNeutralHovered}; }
`;

const ProfileTag = styled.span`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXs};
  color: ${t.colorTextSubtle};
  background: ${t.colorBgNeutral};
  border-radius: ${t.radiusMd};
  padding: 1px 7px;
  white-space: nowrap;
`;

// ─── WorkDayPicker ────────────────────────────────────────────────────────────

function WorkDayPicker({ value, onChange }: {
  value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter(d => d !== key) : [...value, key]);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {WEEKDAYS.map(d => (
        <DayBtn key={d.key} type="button" $on={value.includes(d.key)} onClick={() => toggle(d.key)}>
          {d.label}
        </DayBtn>
      ))}
    </div>
  );
}

// ─── RoleSpecificFields ───────────────────────────────────────────────────────

function RoleSpecificFields({
  roleName, register, workDays, setWorkDays, errors,
}: {
  roleName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  workDays: string[];
  setWorkDays: (v: string[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
}) {
  const isMedical = MEDICAL_ROLES.includes(roleName);
  const isDoctor  = roleName === "DOCTOR";

  if (!roleName || roleName === "SUPER_ADMIN") return null;

  if (isMedical) {
    return (
      <>
        <SectionTitle>Thông tin chuyên môn</SectionTitle>
        <FormGrid>
          <Field label="Chuyên khoa" error={errors.specialty?.message}>
            <TextField
              placeholder="VD: Da liễu thẩm mỹ, Phẫu thuật tạo hình..."
              list="specialty-list"
              {...register("specialty")}
            />
            <datalist id="specialty-list">
              {SPECIALTY_OPTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </Field>
          <Field label="Số chứng chỉ hành nghề" error={errors.licenseNumber?.message}>
            <TextField placeholder="CCHN-..." {...register("licenseNumber")} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Số năm kinh nghiệm" error={errors.experience?.message}>
            <TextField type="number" min="0" max="50" placeholder="0" {...register("experience", { valueAsNumber: true })} />
          </Field>
          <Field label="Lịch làm việc">
            <WorkDayPicker value={workDays} onChange={setWorkDays} />
          </Field>
        </FormGrid>
        {isDoctor && (
          <Field label="Giới thiệu bác sĩ" error={errors.bio?.message}>
            <Textarea
              rows={3}
              placeholder="Kinh nghiệm, thành tích, chuyên sở trường..."
              {...register("bio")}
            />
          </Field>
        )}
      </>
    );
  }

  // Staff roles
  const deptOptions = DEPARTMENT_OPTIONS_BY_ROLE[roleName] ?? [];
  return (
    <>
      <SectionTitle>Thông tin công việc</SectionTitle>
      <FormGrid>
        <Field label="Chức danh" error={errors.position?.message}>
          <TextField placeholder="VD: Senior Consultant, Trưởng lễ tân..." {...register("position")} />
        </Field>
        <Field label="Phòng ban" error={errors.department?.message}>
          {deptOptions.length > 0 ? (
            <>
              <TextField placeholder="Phòng ban..." list="dept-list" {...register("department")} />
              <datalist id="dept-list">
                {deptOptions.map(d => <option key={d} value={d} />)}
              </datalist>
            </>
          ) : (
            <TextField placeholder="Phòng ban..." {...register("department")} />
          )}
        </Field>
      </FormGrid>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UsersClient({
  users, roles, branches, isSuperAdmin, currentBranchId,
}: {
  users: UserRow[];
  roles: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  isSuperAdmin: boolean;
  currentBranchId: string | null;
}) {
  const router = useRouter();

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createRoleId, setCreateRoleId]   = useState("");
  const [createBranchId, setCreateBranchId] = useState(currentBranchId ?? "");
  const [createWorkDays, setCreateWorkDays] = useState<string[]>([]);

  // Edit modal
  const [editUser, setEditUser]   = useState<UserRow | null>(null);
  const [editing, setEditing]     = useState(false);
  const [editRoleId, setEditRoleId]     = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editWorkDays, setEditWorkDays] = useState<string[]>([]);

  const createRoleName = roles.find(r => r.id === createRoleId)?.name ?? "";
  const editRoleName   = roles.find(r => r.id === editRoleId)?.name ?? "";

  // ── Create Form ────────────────────────────────────────────────────
  const { register: regC, handleSubmit: submitC, reset: resetC, setValue: setValC, formState: { errors: errC } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const closeCreate = () => {
    setCreateOpen(false); resetC();
    setCreateRoleId(""); setCreateBranchId(currentBranchId ?? "");
    setCreateWorkDays([]);
  };

  const onCreateSubmit = async (data: CreateForm) => {
    if (!createRoleId) return toast.error("Vui lòng chọn vai trò");
    setCreating(true);
    const exp = data.experience != null && !isNaN(data.experience) ? data.experience : undefined;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          experience: exp,
          roleId:     createRoleId,
          branchId:   createBranchId || undefined,
          workDays:   createWorkDays.length > 0 ? createWorkDays : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Tạo tài khoản thành công");
      closeCreate(); router.refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setCreating(false); }
  };

  // ── Edit Form ──────────────────────────────────────────────────────
  const { register: regE, handleSubmit: submitE, reset: resetE, setValue: setValE, formState: { errors: errE } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  // Pre-fill edit form when user is selected
  useEffect(() => {
    if (!editUser) return;
    resetE({
      fullName:      editUser.fullName,
      email:         editUser.email,
      phone:         editUser.phone ?? "",
      roleId:        editUser.role?.id ?? "",
      branchId:      editUser.branch?.id ?? "",
      specialty:     editUser.profile?.specialty ?? "",
      licenseNumber: editUser.profile?.licenseNumber ?? "",
      experience:    editUser.profile?.experience ?? undefined,
      bio:           editUser.profile?.bio ?? "",
      position:      editUser.profile?.position ?? "",
      department:    editUser.profile?.department ?? "",
    });
    setEditRoleId(editUser.role?.id ?? "");
    setEditBranchId(editUser.branch?.id ?? "");
    setEditWorkDays(editUser.profile?.workDays ?? []);
  }, [editUser, resetE]);

  const closeEdit = () => { setEditUser(null); resetE(); setEditRoleId(""); setEditBranchId(""); setEditWorkDays([]); };

  const onEditSubmit = async (data: EditForm) => {
    if (!editUser) return;
    setEditing(true);
    const exp = data.experience != null && !isNaN(data.experience) ? data.experience : null;
    try {
      const payload: Record<string, unknown> = {
        fullName:      data.fullName,
        phone:         data.phone || null,
        roleId:        editRoleId || undefined,
        branchId:      editBranchId || null,
        specialty:     data.specialty || null,
        licenseNumber: data.licenseNumber || null,
        experience:    exp,
        bio:           data.bio || null,
        position:      data.position || null,
        department:    data.department || null,
        workDays:      editWorkDays,
      };
      if (data.password) payload.password = data.password;

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Cập nhật thành công");
      closeEdit(); router.refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setEditing(false); }
  };

  const toggleActive = async (user: UserRow) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(user.isActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      router.refresh();
    } catch { toast.error("Không thể cập nhật"); }
  };

  const roleOptions = roles.map(r => ({ value: r.id, label: ROLE_LABELS[r.name] ?? r.name }));
  const branchOptions = [
    { value: "none", label: "Tất cả (Super Admin)" },
    ...branches.map(b => ({ value: b.id, label: b.name })),
  ];

  return (
    <>
      <SectionHeader>
        <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>
          {users.length} tài khoản
        </span>
        <Button appearance="primary" onClick={() => setCreateOpen(true)}>
          <Plus /> Thêm tài khoản
        </Button>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th>Nhân viên</Th>
              <Th width={150}>Vai trò</Th>
              <Th>Chuyên môn / Chức danh</Th>
              <Th>Chi nhánh</Th>
              <Th width={100}>Trạng thái</Th>
              <Th width={100}>Thao tác</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {users.length === 0
              ? <TableEmpty colSpan={6} icon={<UserCog />} message="Chưa có tài khoản nào" />
              : users.map(u => {
                const roleName = u.role?.name ?? "";
                const isMedical = MEDICAL_ROLES.includes(roleName);
                return (
                  <Tr key={u.id}>
                    <Td>
                      <div style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorText }}>
                        {u.fullName}
                        {!u.isActive && (
                          <span style={{ marginLeft: 6, fontSize: t.fontSizeXs, color: t.colorTextDisabled }}>(Đã khóa)</span>
                        )}
                      </div>
                      <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtle }}>
                        {u.email}{u.phone ? ` · ${u.phone}` : ""}
                      </div>
                    </Td>
                    <Td>
                      <Badge appearance={ROLE_APPEARANCE[roleName] ?? "default"} styleVariant="subtle">
                        {ROLE_LABELS[roleName] ?? roleName}
                      </Badge>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {isMedical && u.profile?.specialty && (
                          <ProfileTag>{u.profile.specialty}</ProfileTag>
                        )}
                        {isMedical && u.profile?.licenseNumber && (
                          <ProfileTag>
                            <ShieldCheck size={10} style={{ marginRight: 3, display: "inline-block", verticalAlign: "middle" }} />
                            {u.profile.licenseNumber}
                          </ProfileTag>
                        )}
                        {isMedical && u.profile?.experience != null && (
                          <ProfileTag>{u.profile.experience} năm KN</ProfileTag>
                        )}
                        {!isMedical && u.profile?.position && (
                          <ProfileTag>{u.profile.position}</ProfileTag>
                        )}
                        {!isMedical && u.profile?.department && (
                          <ProfileTag>{u.profile.department}</ProfileTag>
                        )}
                        {!u.profile?.specialty && !u.profile?.position && (
                          <span style={{ color: t.colorTextSubtlest, fontFamily: t.fontFamily, fontSize: t.fontSizeXs }}>—</span>
                        )}
                      </div>
                    </Td>
                    <Td>{u.branch?.name ?? <span style={{ color: t.colorTextSubtlest }}>Tất cả</span>}</Td>
                    <Td>
                      <Badge appearance={u.isActive ? "success" : "neutral"} styleVariant="subtle">
                        {u.isActive ? "Hoạt động" : "Đã khóa"}
                      </Badge>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button appearance="subtle" onClick={() => setEditUser(u)} title="Chỉnh sửa">
                          <Pencil size={13} />
                        </Button>
                        <Button
                          appearance={u.isActive ? "subtle" : "primary"}
                          onClick={() => toggleActive(u)}
                          title={u.isActive ? "Khóa tài khoản" : "Mở khóa"}
                        >
                          {u.isActive ? "Khóa" : "Mở"}
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            }
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Create Modal ─────────────────────────────────────────────── */}
      <Modal open={createOpen} onOpenChange={closeCreate} title="Thêm tài khoản mới" size="default">
        <form onSubmit={submitC(onCreateSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>Thông tin cơ bản</SectionTitle>
              <FormGrid>
                <Field label="Họ và tên" required error={errC.fullName?.message}>
                  <TextField placeholder="Nguyễn Văn A" isInvalid={!!errC.fullName} {...regC("fullName")} />
                </Field>
                <Field label="Số điện thoại">
                  <TextField placeholder="0901234567" {...regC("phone")} />
                </Field>
              </FormGrid>
              <Field label="Email" required error={errC.email?.message}>
                <TextField type="email" placeholder="nhanvien@phongkham.vn" isInvalid={!!errC.email} {...regC("email")} />
              </Field>
              <Field label="Mật khẩu" required error={errC.password?.message}>
                <TextField type="password" placeholder="Tối thiểu 6 ký tự" isInvalid={!!errC.password} {...regC("password")} />
              </Field>
              <FormGrid>
                <Field label="Vai trò" required error={errC.roleId?.message}>
                  <Select
                    options={roleOptions}
                    value={createRoleId}
                    onChange={v => { setCreateRoleId(v); setValC("roleId", v); }}
                    placeholder="Chọn vai trò"
                    isInvalid={!!errC.roleId}
                  />
                </Field>
                {isSuperAdmin && (
                  <Field label="Chi nhánh">
                    <Select
                      options={branchOptions}
                      value={createBranchId || "none"}
                      onChange={v => { setCreateBranchId(v); setValC("branchId", v === "none" ? "" : v); }}
                      placeholder="Chọn chi nhánh"
                    />
                  </Field>
                )}
              </FormGrid>

              {/* Role-specific fields */}
              <RoleSpecificFields
                roleName={createRoleName}
                register={regC}
                workDays={createWorkDays}
                setWorkDays={setCreateWorkDays}
                errors={errC}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={closeCreate}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={creating}>
              {creating ? "Đang lưu..." : "Tạo tài khoản"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Edit Modal ───────────────────────────────────────────────── */}
      <Modal open={!!editUser} onOpenChange={o => { if (!o) closeEdit(); }} title="Chỉnh sửa tài khoản" size="default">
        <form onSubmit={submitE(onEditSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>Thông tin cơ bản</SectionTitle>
              <FormGrid>
                <Field label="Họ và tên" required error={errE.fullName?.message}>
                  <TextField placeholder="Nguyễn Văn A" isInvalid={!!errE.fullName} {...regE("fullName")} />
                </Field>
                <Field label="Số điện thoại">
                  <TextField placeholder="0901234567" {...regE("phone")} />
                </Field>
              </FormGrid>
              <Field label="Email" required error={errE.email?.message}>
                <TextField type="email" isInvalid={!!errE.email} {...regE("email")} />
              </Field>
              <Field label="Mật khẩu mới" error={errE.password?.message}
                hint="Để trống nếu không đổi mật khẩu">
                <TextField type="password" placeholder="Nhập mật khẩu mới nếu muốn đổi..." {...regE("password")} />
              </Field>
              <FormGrid>
                <Field label="Vai trò" required>
                  <Select
                    options={roleOptions}
                    value={editRoleId}
                    onChange={v => { setEditRoleId(v); setValE("roleId", v); }}
                    placeholder="Chọn vai trò"
                  />
                </Field>
                {isSuperAdmin && (
                  <Field label="Chi nhánh">
                    <Select
                      options={branchOptions}
                      value={editBranchId || "none"}
                      onChange={v => { setEditBranchId(v); setValE("branchId", v === "none" ? "" : v); }}
                      placeholder="Chọn chi nhánh"
                    />
                  </Field>
                )}
              </FormGrid>

              {/* Role-specific fields */}
              <RoleSpecificFields
                roleName={editRoleName}
                register={regE}
                workDays={editWorkDays}
                setWorkDays={setEditWorkDays}
                errors={errE}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={closeEdit}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={editing}>
              {editing ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
