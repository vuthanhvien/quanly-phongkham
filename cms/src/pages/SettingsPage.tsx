import {
  HolderOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd"
import Editor from "@monaco-editor/react"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "../api"
import { CustomField, DynamicRole, entityLabels, getResourceActionOptions } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  getRoleInheritanceChain,
  getRoleOptions,
  getStoredUserRole,
  hasExactRoleSetting,
  normalizeRole,
  resolveAllowedActions,
  resolveViewSetting,
  resolveModuleEnabled,
  serializeViewConfig,
  ViewSettingRecord,
  ViewType,
  VIEW_TYPES,
} from "../view-settings"

interface Template {
  id: string
  name: string
  htmlTemplate: string
}

interface TemplatePreset {
  key: string
  entityType: string
  label: string
  description: string
  htmlTemplate: string
}

const DEFAULT_TEMPLATE_HTML = `<style>
  .print-root {
    color: #1f1720;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .print-root h1 {
    font-size: 24px;
    margin: 0 0 12px;
  }

  .print-kv {
    border: 1px solid #e7d8df;
    border-radius: 12px;
    padding: 14px;
  }
</style>

<section class="print-root">
  <h1>Phiếu điều trị</h1>
  <div class="print-kv">
    <p><strong>Khách hàng:</strong> {{fullName}}</p>
    <p><strong>Mã hồ sơ:</strong> {{code}}</p>
  </div>
</section>`

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: "service-order-modern",
    entityType: "service-orders",
    label: "Đơn hàng hiện đại",
    description: "Mẫu in có header, khối thông tin và phần tổng tiền rõ ràng.",
    htmlTemplate: `<style>
  .print-root {
    color: #23171d;
    font-family: "Arial", sans-serif;
    font-size: 13px;
    line-height: 1.55;
  }

  .print-shell {
    border: 1px solid #eadbe1;
    border-radius: 18px;
    overflow: hidden;
  }

  .print-header {
    background: linear-gradient(135deg, #f7d9e6, #fff3e8);
    padding: 20px 24px;
  }

  .print-header h1 {
    font-size: 24px;
    margin: 0 0 4px;
  }

  .print-header p {
    color: #6f5963;
    margin: 0;
  }

  .print-body {
    padding: 18px 24px 24px;
  }

  .grid {
    display: grid;
    gap: 12px 18px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 18px;
  }

  .box {
    background: #fffafb;
    border: 1px solid #eadbe1;
    border-radius: 14px;
    padding: 12px 14px;
  }

  .label {
    color: #8b6d78;
    display: block;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .value {
    font-size: 14px;
    font-weight: 600;
  }

  .summary {
    align-items: center;
    background: #23171d;
    border-radius: 16px;
    color: white;
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    padding: 16px 18px;
  }

  .summary strong {
    font-size: 22px;
  }
</style>

<section class="print-root">
  <div class="print-shell">
    <div class="print-header">
      <h1>Đơn hàng dịch vụ</h1>
      <p>Mã đơn {{code}} · Ngày {{orderDate}}</p>
    </div>
    <div class="print-body">
      <div class="grid">
        <div class="box">
          <span class="label">Khách hàng</span>
          <div class="value">{{customerId}}</div>
        </div>
        <div class="box">
          <span class="label">Chi nhánh</span>
          <div class="value">{{branchId}}</div>
        </div>
        <div class="box">
          <span class="label">Dịch vụ sử dụng</span>
          <div class="value">{{serviceName}}</div>
        </div>
        <div class="box">
          <span class="label">Nhân sự thực hiện</span>
          <div class="value">{{performerStaffId}}</div>
        </div>
        <div class="box">
          <span class="label">Trạng thái</span>
          <div class="value">{{status}}</div>
        </div>
        <div class="box">
          <span class="label">Ghi chú</span>
          <div class="value">{{note}}</div>
        </div>
      </div>
      <div class="summary">
        <span>Tổng thanh toán</span>
        <strong>{{totalAmount}}</strong>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    key: "service-order-a4",
    entityType: "service-orders",
    label: "Phiếu A4 chuẩn",
    description: "Mẫu in rõ nét kiểu biểu mẫu nội bộ, phù hợp in A4.",
    htmlTemplate: `<style>
  .sheet {
    color: #1d161b;
    font-family: "Times New Roman", serif;
    font-size: 14px;
    line-height: 1.6;
  }

  .sheet h1 {
    font-size: 26px;
    margin: 0 0 4px;
    text-align: center;
    text-transform: uppercase;
  }

  .sheet .sub {
    margin-bottom: 20px;
    text-align: center;
  }

  .info-table {
    border-collapse: collapse;
    margin-bottom: 18px;
    width: 100%;
  }

  .info-table td {
    border: 1px solid #d8c8cf;
    padding: 10px 12px;
    vertical-align: top;
  }

  .note-box {
    border: 1px dashed #b69ea8;
    border-radius: 12px;
    min-height: 100px;
    padding: 12px;
  }

  .sign-row {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 26px;
    text-align: center;
  }
</style>

<section class="sheet">
  <h1>Phiếu xác nhận đơn hàng</h1>
  <div class="sub">Mã đơn: <strong>{{code}}</strong></div>

  <table class="info-table">
    <tr>
      <td><strong>Khách hàng</strong><br />{{customerId}}</td>
      <td><strong>Ngày đơn</strong><br />{{orderDate}}</td>
    </tr>
    <tr>
      <td><strong>Dịch vụ</strong><br />{{serviceName}}</td>
      <td><strong>Trạng thái</strong><br />{{status}}</td>
    </tr>
    <tr>
      <td><strong>Số lượng</strong><br />{{quantity}}</td>
      <td><strong>Đơn giá</strong><br />{{unitPrice}}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Tổng tiền</strong><br />{{totalAmount}}</td>
    </tr>
  </table>

  <div class="note-box">
    <strong>Ghi chú</strong><br />
    {{note}}
  </div>

  <div class="sign-row">
    <div>
      <strong>Khách hàng</strong>
      <p>(Ký và ghi rõ họ tên)</p>
    </div>
    <div>
      <strong>Nhân viên xác nhận</strong>
      <p>(Ký và ghi rõ họ tên)</p>
    </div>
  </div>
</section>`,
  },
  {
    key: "service-order-compact",
    entityType: "service-orders",
    label: "Đơn hàng compact",
    description: "Mẫu gọn, ít mực in, phù hợp phiếu xác nhận nhanh.",
    htmlTemplate: `<style>
  .ticket {
    color: #22181d;
    font-family: Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .ticket-header {
    border-bottom: 2px solid #22181d;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .ticket-title {
    font-size: 22px;
    font-weight: 700;
  }

  .ticket-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }

  .ticket-row strong {
    min-width: 120px;
  }

  .ticket-total {
    border-top: 1px solid #cab4be;
    margin-top: 16px;
    padding-top: 12px;
    text-align: right;
  }

  .ticket-total strong {
    font-size: 22px;
  }
</style>

<section class="ticket">
  <div class="ticket-header">
    <div>
      <div class="ticket-title">Đơn hàng dịch vụ</div>
      <div>{{code}}</div>
    </div>
    <div>{{orderDate}}</div>
  </div>

  <div class="ticket-row"><strong>Khách hàng</strong><span>{{customerId}}</span></div>
  <div class="ticket-row"><strong>Dịch vụ</strong><span>{{serviceName}}</span></div>
  <div class="ticket-row"><strong>Người thực hiện</strong><span>{{performerStaffId}}</span></div>
  <div class="ticket-row"><strong>Trạng thái</strong><span>{{status}}</span></div>
  <div class="ticket-row"><strong>Ghi chú</strong><span>{{note}}</span></div>

  <div class="ticket-total">
    Thành tiền: <strong>{{totalAmount}}</strong>
  </div>
</section>`,
  },
]

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entityType, setEntityType] = useState(() => searchParams.get("module") || "customers")
  const [selectedRole, setSelectedRole] = useState(() => normalizeRole(searchParams.get("role") || getStoredUserRole()))
  const [moduleEnabled, setModuleEnabled] = useState(true)
  const [fields, setFields] = useState<CustomField[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [allowedActions, setAllowedActions] = useState<string[]>([])
  const [templateModal, setTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateForm] = Form.useForm()
  const templateHtml = Form.useWatch("htmlTemplate", templateForm)

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, fields),
    [entityType, fields],
  )
  const templateVariables = useMemo(
    () => fieldCatalog.map((field) => `{{${field.key}}}`),
    [fieldCatalog],
  )
  const selectableRoles = useMemo(
    () => getRoleOptions(views, [selectedRole, ...dynamicRoles.map((role) => role.key)]),
    [dynamicRoles, selectedRole, views],
  )
  const inheritanceChain = useMemo(
    () => getRoleInheritanceChain(selectedRole, dynamicRoles),
    [dynamicRoles, selectedRole],
  )
  const hasRoleConfig = useMemo(
    () => views.some((view) => normalizeRole(view.role) === selectedRole),
    [selectedRole, views],
  )
  const viewStatus = useMemo(
    () =>
      Object.fromEntries(
        VIEW_TYPES.map((viewType) => [
          viewType,
          hasExactRoleSetting(views, viewType, selectedRole),
        ]),
      ) as Record<ViewType, boolean>,
    [views, selectedRole],
  )
  const actionOptions = useMemo(
    () => getResourceActionOptions(entityType),
    [entityType],
  )
  const templatePresets = useMemo(
    () => TEMPLATE_PRESETS.filter((preset) => preset.entityType === entityType),
    [entityType],
  )
  const viewSources = useMemo(
    () =>
      Object.fromEntries(
        VIEW_TYPES.map((viewType) => [
          viewType,
          normalizeRole(resolveViewSetting(views, viewType, selectedRole, dynamicRoles)?.role),
        ]),
      ) as Record<ViewType, string>,
    [dynamicRoles, selectedRole, views],
  )

  useEffect(() => {
    const moduleFromUrl = searchParams.get("module") || "customers"
    const roleFromUrl = normalizeRole(searchParams.get("role") || getStoredUserRole())

    setEntityType((current) => current === moduleFromUrl ? current : moduleFromUrl)
    setSelectedRole((current) => current === roleFromUrl ? current : roleFromUrl)
  }, [searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("module", entityType)
    nextParams.set("role", selectedRole)
    const nextQuery = nextParams.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [entityType, searchParams, selectedRole, setSearchParams])

  useEffect(() => {
    void load()
  }, [entityType])

  useEffect(() => {
    setModuleEnabled(resolveModuleEnabled(views, selectedRole, dynamicRoles))
    setAllowedActions(resolveAllowedActions(views, entityType, selectedRole, dynamicRoles))
    setTableConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "TABLE", selectedRole, dynamicRoles),
        "TABLE",
      ),
    )
    setFormConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "FORM", selectedRole, dynamicRoles),
        "FORM",
      ),
    )
    setDetailConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "DETAIL", selectedRole, dynamicRoles),
        "DETAIL",
      ),
    )
  }, [dynamicRoles, entityType, fieldCatalog, selectedRole, views])

  async function load() {
    const [fieldResponse, viewResponse, templateResponse, roleResponse] = await Promise.all([
      api.get("/settings/custom-fields", { params: { entityType } }),
      api.get("/settings/views", { params: { entityType } }),
      api.get("/settings/print-templates", { params: { entityType } }),
      api.get("/settings/dynamic-roles"),
    ])
    setFields(fieldResponse.data.data)
    setViews(viewResponse.data.data)
    setTemplates(templateResponse.data.data)
    setDynamicRoles(roleResponse.data.data)
  }

  async function saveView() {
    await Promise.all([
      api.put(`/settings/views/${entityType}/TABLE`, {
        role: selectedRole,
        config: serializeViewConfig("TABLE", tableConfig, moduleEnabled, allowedActions),
      }),
      api.put(`/settings/views/${entityType}/FORM`, {
        role: selectedRole,
        config: serializeViewConfig("FORM", formConfig, moduleEnabled, allowedActions),
      }),
      api.put(`/settings/views/${entityType}/DETAIL`, {
        role: selectedRole,
        config: serializeViewConfig("DETAIL", detailConfig, moduleEnabled, allowedActions),
      }),
    ])
    message.success("Đã lưu cấu hình module theo role")
    await load()
  }

  async function resetInheritedView() {
    await api.delete(`/settings/views/${entityType}`, {
      params: { role: selectedRole },
    })
    message.success("Đã xóa config hiện tại. Role này sẽ kế thừa lại theo chuỗi mới")
    await load()
  }

  async function saveTemplate(values: Record<string, unknown>) {
    if (editingTemplate) {
      await api.patch(`/settings/print-templates/${editingTemplate.id}`, {
        ...values,
        entityType,
      })
      message.success("Đã cập nhật mẫu in")
    } else {
      await api.post("/settings/print-templates", { ...values, entityType })
      message.success("Đã lưu mẫu in")
    }
    setTemplateModal(false)
    setEditingTemplate(null)
    templateForm.resetFields()
    await load()
  }

  function openCreateTemplate() {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      name: "",
      htmlTemplate: DEFAULT_TEMPLATE_HTML,
    })
    setTemplateModal(true)
  }

  function openCreateTemplateFromPreset(preset: TemplatePreset) {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      name: preset.label,
      htmlTemplate: preset.htmlTemplate,
    })
    setTemplateModal(true)
  }

  function openEditTemplate(template: Template) {
    setEditingTemplate(template)
    templateForm.setFieldsValue(template)
    setTemplateModal(true)
  }

  function applyPresetToEditor(presetKey: string) {
    const preset = templatePresets.find((item) => item.key === presetKey)
    if (!preset) return
    templateForm.setFieldsValue({
      name: templateForm.getFieldValue("name") || preset.label,
      htmlTemplate: preset.htmlTemplate,
    })
    message.success(`Đã nạp mẫu ${preset.label}`)
  }

  function updateConfig(
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    setter((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    )
  }

  function reorderConfig(
    viewType: ViewType,
    fromKey: string,
    toKey: string,
  ) {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    setter((current) => {
      const fromIndex = current.findIndex((field) => field.key === fromKey)
      const toIndex = current.findIndex((field) => field.key === toKey)

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            No-code operations
          </Typography.Text>
          <Typography.Title level={2}>Cấu hình động</Typography.Title>
        </div>
        <Space wrap>
          <Select
            value={entityType}
            onChange={setEntityType}
            style={{ width: 240 }}
            options={Object.entries(entityLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            style={{ width: 220 }}
            value={selectedRole}
            onChange={(value) => setSelectedRole(normalizeRole(value))}
            options={selectableRoles.map((role) => ({
              value: role,
              label:
                dynamicRoles.find((item) => item.key === role)?.name
                  ? `${dynamicRoles.find((item) => item.key === role)?.name} (${role})`
                  : role,
            }))}
          />
        </Space>
      </div>
      <Card className="glass-card settings-card">
        <Tabs
          className="settings-tabs"
          items={[
            {
              key: "view-config",
              label: (
                <span className="simple-tab-label">
                  <SettingOutlined />
                  <span>Hiển thị theo role / module</span>
                </span>
              ),
              children: (
                <div className="settings-tab-panel">
                  <div className="settings-tab-header settings-tab-header-wrap">
                    <Typography.Text>
                      Module hiện tại là <strong>{entityLabels[entityType] || entityType}</strong>. <strong>{DEFAULT_ROLE_SCOPE}</strong> là config gốc. Chuỗi áp dụng cho role đang chọn là <strong>{[...inheritanceChain].reverse().join(" -> ")}</strong>, nghĩa là hệ thống đọc từ role hiện tại lên main role rồi mới về <strong>{DEFAULT_ROLE_SCOPE}</strong> nếu chưa có config riêng.
                    </Typography.Text>
                    <Checkbox
                      checked={moduleEnabled}
                      onChange={(event) => setModuleEnabled(event.target.checked)}
                    >
                      Cho phép role sử dụng module này
                    </Checkbox>
                  </div>
                  <Space wrap>
                    <Tag color={moduleEnabled ? "green" : "red"}>
                      Module: {moduleEnabled ? "Được dùng" : "Bị khóa"}
                    </Tag>
                    <Tag color="blue">
                      Actions: {allowedActions.length ? allowedActions.join(", ") : "Không có"}
                    </Tag>
                    {VIEW_TYPES.map((viewType) => (
                      <Tag
                        color={viewStatus[viewType] ? "green" : "gold"}
                        key={viewType}
                      >
                        {viewType}: {viewStatus[viewType] ? "riêng theo role" : `đang kế thừa ${viewSources[viewType]}`}
                      </Tag>
                    ))}
                  </Space>
                  <Card size="small" title="Action theo role" style={{ marginTop: 16 }}>
                    <Checkbox.Group
                      options={actionOptions.map((item) => ({
                        label: item.label,
                        value: item.key,
                      }))}
                      value={allowedActions}
                      onChange={(values) => setAllowedActions(values.map(String))}
                    />
                  </Card>
                  <Tabs
                    className="settings-inner-tabs"
                    items={[
                      {
                        key: "TABLE",
                        label: "Bảng",
                        children: (
                          <ViewConfigTable
                            dataSource={tableConfig}
                            viewType="TABLE"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                      {
                        key: "FORM",
                        label: "Form nhập liệu",
                        children: (
                          <ViewConfigTable
                            dataSource={formConfig}
                            viewType="FORM"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                      {
                        key: "DETAIL",
                        label: "Thông tin chi tiết",
                        children: (
                          <ViewConfigTable
                            dataSource={detailConfig}
                            viewType="DETAIL"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                    ]}
                  />
                  <Space wrap>
                    <Button
                      className="primary-glow"
                      type="primary"
                      onClick={saveView}
                    >
                      Lưu cấu hình hiển thị cho module
                    </Button>
                    <Button
                      danger
                      disabled={!hasRoleConfig}
                      onClick={() => void resetInheritedView()}
                    >
                      Xóa config hiện tại để kế thừa lại
                    </Button>
                  </Space>
                </div>
              ),
            },
            {
              key: "print-templates",
              label: (
                <span className="simple-tab-label">
                  <FileTextOutlined />
                  <span>Mẫu in</span>
                </span>
              ),
              children: (
                <div className="settings-tab-panel">
                  <div className="settings-tab-header">
                    <Typography.Paragraph type="secondary">
                      Dùng biến theo cú pháp Handlebars như {"{{fullName}}"} hoặc {"{{custom_key}}"}.
                      Có thể nhúng CSS trực tiếp bằng thẻ {"<style>...</style>"} ở đầu template.
                    </Typography.Paragraph>
                    <Space wrap>
                      <Button onClick={openCreateTemplate}>Thêm mẫu</Button>
                      {templatePresets.length > 0 && (
                        <Button onClick={() => openCreateTemplateFromPreset(templatePresets[0])}>
                          Tạo từ mẫu có sẵn
                        </Button>
                      )}
                    </Space>
                  </div>
                  {templatePresets.length > 0 && (
                    <div className="template-preset-grid">
                      {templatePresets.map((preset) => (
                        <Card className="template-preset-card" key={preset.key} size="small">
                          <Space direction="vertical" size={6} style={{ width: "100%" }}>
                            <Typography.Text strong>{preset.label}</Typography.Text>
                            <Typography.Text type="secondary">{preset.description}</Typography.Text>
                            <Button onClick={() => openCreateTemplateFromPreset(preset)}>
                              Dùng mẫu này
                            </Button>
                          </Space>
                        </Card>
                      ))}
                    </div>
                  )}
                  <div className="template-variable-cloud">
                    {templateVariables.map((variable) => (
                      <Tag className="soft-tag" key={variable}>
                        {variable}
                      </Tag>
                    ))}
                  </div>
                  <Divider />
                  <div className="template-layout">
                    <div>
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={templates}
                        scroll={{ x: "max-content" }}
                        columns={[
                          { title: "Tên mẫu", dataIndex: "name" },
                          {
                            title: "Xem nhanh",
                            render: (_, row) => (
                              <Typography.Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ marginBottom: 0, maxWidth: 360 }}
                              >
                                {row.htmlTemplate}
                              </Typography.Paragraph>
                            ),
                          },
                          {
                            title: "",
                            render: (_, row) => (
                              <Button type="link" onClick={() => openEditTemplate(row)}>
                                Sửa
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>
                    <Card className="template-preview-card" title="Preview nhanh">
                      <div
                        className="template-preview-surface"
                        dangerouslySetInnerHTML={{
                          __html:
                            templates[0]?.htmlTemplate ||
                            "<p>Chưa có mẫu in cho model này.</p>",
                        }}
                      />
                    </Card>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editingTemplate ? "Cập nhật mẫu in HTML" : "Thêm mẫu in HTML"}
        open={templateModal}
        footer={null}
        maskClosable={false}
        onCancel={() => {
          setTemplateModal(false)
          setEditingTemplate(null)
        }}
        width={1080}
      >
        <Form form={templateForm} layout="vertical" onFinish={saveTemplate}>
          <div className="template-editor-layout">
            <div>
              {templatePresets.length > 0 && (
                <Form.Item label="Mẫu có sẵn">
                  <Select
                    allowClear
                    placeholder="Chọn mẫu để nạp nhanh vào editor"
                    options={templatePresets.map((preset) => ({
                      value: preset.key,
                      label: preset.label,
                    }))}
                    onChange={(value) => value && applyPresetToEditor(String(value))}
                  />
                </Form.Item>
              )}
              <Form.Item
                name="name"
                label="Tên mẫu"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="htmlTemplate"
                label="HTML template"
                rules={[{ required: true }]}
              >
                <Editor
                  height="420px"
                  defaultLanguage="html"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    padding: { top: 14 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                  }}
                />
              </Form.Item>
            </div>
            <div>
              <Card className="template-preview-card" title="Preview trực tiếp">
                <div
                  className="template-preview-surface"
                  dangerouslySetInnerHTML={{
                    __html:
                      templateHtml ||
                      "<p>Nhập HTML mẫu in để xem preview tại đây.</p>",
                  }}
                />
              </Card>
              <Card className="template-preview-card" title="Biến có thể dùng">
                <div className="template-variable-cloud">
                  {templateVariables.map((variable) => (
                    <Tag className="soft-tag" key={variable}>
                      {variable}
                    </Tag>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingTemplate ? "Cập nhật mẫu" : "Lưu mẫu in"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}

function ViewConfigTable({
  dataSource,
  viewType,
  onChange,
  onReorder,
}: {
  dataSource: FieldLayoutConfig[]
  viewType: ViewType
  onChange: (
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) => void
  onReorder?: (viewType: ViewType, fromKey: string, toKey: string) => void
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const columns: ColumnsType<FieldLayoutConfig> = [
    {
      title: "",
      key: "sort",
      width: 56,
      render: (_, row) =>
        onReorder ? (
          <span className="drag-handle" title="Kéo để đổi thứ tự">
            <HolderOutlined />
            <span className="drag-order">#{dataSource.findIndex((item) => item.key === row.key) + 1}</span>
          </span>
        ) : null,
    },
    {
      title: "Hiển thị",
      dataIndex: "visible",
      width: 96,
      render: (value, row) => (
        <Checkbox
          checked={value}
          onChange={(event) =>
            onChange(viewType, row.key, { visible: event.target.checked })
          }
        />
      ),
    },
    {
      title: "Field",
      key: "field",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.label}</Typography.Text>
          <Typography.Text type="secondary">{row.key}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 120,
      render: (value) => value || "text",
    },
    {
      title: "Nhãn hiển thị",
      key: "label",
      render: (_, row) => (
        <Input
          value={row.label}
          onChange={(event) =>
            onChange(viewType, row.key, { label: event.target.value })
          }
          placeholder="Tên field hiển thị"
        />
      ),
    },
  ]

  if (viewType !== "TABLE") {
    columns.push(
      {
        title: "Mô tả / hướng dẫn",
        key: "description",
        render: (_, row) => (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={row.description}
            onChange={(event) =>
              onChange(viewType, row.key, { description: event.target.value })
            }
            placeholder="Nội dung hướng dẫn hiển thị cho field"
          />
        ),
      },
      {
        title: "Width",
        key: "width",
        width: 150,
        render: (_, row) => (
          <Select
            value={row.width || "100"}
            onChange={(value) =>
              onChange(viewType, row.key, {
                width: value as FieldLayoutConfig["width"],
              })
            }
            options={[
              { value: "25", label: "1/4" },
              { value: "33", label: "1/3" },
              { value: "50", label: "1/2" },
              { value: "66", label: "2/3" },
              { value: "100", label: "Full" },
            ]}
          />
        ),
      },
    )
  }

  if (viewType === "TABLE") {
    columns.push({
      title: "Width cột (px)",
      key: "tableWidth",
      width: 160,
      render: (_, row) => (
        <Input
          inputMode="numeric"
          value={row.tableWidth === undefined ? "" : String(row.tableWidth)}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^\d]/g, "")
            onChange(viewType, row.key, {
              tableWidth: nextValue ? Number(nextValue) : undefined,
            })
          }}
          placeholder="Ví dụ 180"
        />
      ),
    })
  }

  if (viewType === "FORM") {
    columns.push(
      {
        title: "Options",
        key: "options",
        render: (_, row) => {
          if (row.type !== "select" && row.type !== "multi-select") {
            return <Typography.Text type="secondary">-</Typography.Text>
          }
          return (
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={(row.options || []).join(", ")}
              onChange={(event) =>
                onChange(viewType, row.key, {
                  options: event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Nhập options, ngăn cách bằng dấu phẩy"
            />
          )
        },
      },
      {
        title: "Default data",
        key: "defaultValue",
        render: (_, row) => (
          <Input
            value={
              Array.isArray(row.defaultValue)
                ? row.defaultValue.join(", ")
                : row.defaultValue === undefined || row.defaultValue === null
                  ? ""
                  : String(row.defaultValue)
            }
            onChange={(event) =>
              onChange(viewType, row.key, {
                defaultValue: parseDefaultValue(row.type, event.target.value),
              })
            }
            placeholder="Giá trị mặc định"
          />
        ),
      },
      {
        title: "Placeholder",
        key: "placeholder",
        render: (_, row) => (
          <Input
            value={row.placeholder}
            onChange={(event) =>
              onChange(viewType, row.key, { placeholder: event.target.value })
            }
            placeholder="Gợi ý nhập liệu"
          />
        ),
      },
      {
        title: "Khóa sửa",
        dataIndex: "disabled",
        width: 100,
        render: (value, row) => (
          <Checkbox
            checked={Boolean(value)}
            onChange={(event) =>
              onChange(viewType, row.key, { disabled: event.target.checked })
            }
          />
        ),
      },
    )
  }

  return (
    <Table
      columns={columns}
      components={{
        body: {
          row: (props: React.HTMLAttributes<HTMLTableRowElement>) => {
            const rowKey = String((props as React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string })["data-row-key"] || "")
            const draggable = Boolean(onReorder)
            return (
              <tr
                {...props}
                className={`${props.className || ""} ${draggingKey === rowKey ? "drag-row-active" : ""}`.trim()}
                draggable={draggable}
                onDragStart={(event) => {
                  if (!draggable || !rowKey) return
                  setDraggingKey(rowKey)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", rowKey)
                }}
                onDragOver={(event) => {
                  if (!draggable || !rowKey) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                }}
                onDrop={(event) => {
                  if (!draggable || !rowKey || !onReorder) return
                  event.preventDefault()
                  const fromKey = event.dataTransfer.getData("text/plain")
                  if (!fromKey || fromKey === rowKey) return
                  onReorder(viewType, fromKey, rowKey)
                  setDraggingKey(null)
                }}
                onDragEnd={() => setDraggingKey(null)}
              />
            )
          },
        },
      }}
      dataSource={dataSource}
      pagination={false}
      rowKey="key"
      scroll={{ x: "max-content" }}
      size="small"
    />
  )
}

function parseDefaultValue(type: FieldLayoutConfig["type"], value: string) {
  if (!value.trim()) return undefined
  if (type === "number") return Number(value)
  if (type === "multi-select") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return value
}
