import { useDelete, useList } from "@refinedev/core"
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PhoneOutlined,
  PrinterOutlined,
  SwapOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Drawer,
  Input,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { hasActionAccess } from "../access"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { RecordFormContent } from "../components/RecordFormContent"
import { CustomField, entityLabels } from "../models"
import { displayValue, loadRelationOptions, LookupMap } from "../relations"
import {
  FieldLayoutConfig,
  getFieldCatalog,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

export function RecordListPage() {
  const { resource = "customers" } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [displayFields, setDisplayFields] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [creating, setCreating] = useState(false)
  const [lookups, setLookups] = useState<LookupMap>({})
  const query = useList({
    resource,
    pagination: { currentPage: 1, pageSize: 50 },
    filters: [{ field: "search", operator: "contains", value: search }],
  }) as any
  const response = query.result || query.query?.data || query.data?.data
  const rows = response?.data || []
  const loading = query.query?.isLoading || query.isLoading
  const { mutate: deleteRecord } = useDelete()
  const refresh = () => query.query?.refetch?.() || query.refetch?.()

  useEffect(() => {
    Promise.all([
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
      api.get("/settings/views", { params: { entityType: resource } }),
      api.get("/settings/print-templates", {
        params: { entityType: resource },
      }),
    ])
      .then(([fields, views, prints]) => {
        const customFields = fields.data.data.filter(
          (field: CustomField) => field.isActive,
        )
        const catalog = getFieldCatalog(resource, customFields)
        const tableFields = getVisibleFieldConfigs(
          catalog,
          views.data.data as ViewSettingRecord[],
          "TABLE",
          getStoredUserRole(),
        )
        setDisplayFields(tableFields)
        setTemplates(prints.data.data)
        return loadRelationOptions(tableFields)
      })
      .then(setLookups)
  }, [resource])

  const columns: ColumnsType<Record<string, any>> = useMemo(
    () => [
      ...displayFields.map((field) => ({
        title: field.label,
        dataIndex: field.key,
        key: field.key,
        width: field.tableWidth,
        render: (_: unknown, row: Record<string, any>) =>
          displayValue(
            field,
            row[field.key] ?? row.customFields?.[field.key],
            lookups,
          ),
      })),
      {
        title: "Thao tác",
        key: "action",
        width: 220,
        render: (_: unknown, row: Record<string, any>) => (
          <Space>
            {hasActionAccess(resource, "view") && (
              <Tooltip title="Xem chi tiết">
                <Link to={`/${resource}/${row.id}`}>
                  <Button icon={<EyeOutlined />} type="text" />
                </Link>
              </Tooltip>
            )}
            {hasActionAccess(resource, "update") && (
              <Tooltip title="Chỉnh sửa">
                <Link to={`/${resource}/${row.id}/edit`}>
                  <Button icon={<EditOutlined />} type="text" />
                </Link>
              </Tooltip>
            )}
            {resource === "customers" && hasActionAccess(resource, "reveal-phone") && (
              <Tooltip title="Xem số điện thoại">
                <Button icon={<PhoneOutlined />} type="text" onClick={() => revealPhone(row.id)} />
              </Tooltip>
            )}
            {resource === "leads" && !row.convertedCustomerId && hasActionAccess(resource, "convert-to-customer") && (
              <Tooltip title="Chuyển thành khách hàng">
                <Button icon={<SwapOutlined />} type="text" onClick={() => convertLead(row.id)} />
              </Tooltip>
            )}
            {templates[0] && hasActionAccess(resource, "print") && (
              <Tooltip title="In biểu mẫu">
                <Button
                  icon={<PrinterOutlined />}
                  type="text"
                  onClick={() => printRecord(templates[0].id, row.id)}
                />
              </Tooltip>
            )}
            {hasActionAccess(resource, "delete") && (
              <Popconfirm
                title="Xóa bản ghi này?"
                onConfirm={() =>
                  deleteRecord(
                    { resource, id: row.id },
                    {
                      onSuccess: () => {
                        message.success("Đã xóa")
                        refresh()
                      },
                    },
                  )
                }
              >
                <Tooltip title="Xóa bản ghi">
                  <Button danger icon={<DeleteOutlined />} type="text" />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [displayFields, resource, templates, lookups],
  )

  async function printRecord(templateId: string, recordId: string) {
    const html = (
      await api.get(
        `/settings/print-templates/${templateId}/render/${recordId}`,
        { responseType: "text" },
      )
    ).data
    const windowRef = window.open("", "_blank")
    if (windowRef) {
      windowRef.document.write(
        `<div class="print-sheet">${html}</div><script>window.print()</script>`,
      )
      windowRef.document.close()
    }
  }

  async function revealPhone(recordId: string) {
    const response = await api.post(
      `/records/customers/${recordId}/reveal-phone`,
    )
    message.info(`Số điện thoại: ${response.data.data.phone}`)
  }

  async function convertLead(recordId: string) {
    const response = await api.post(`/records/leads/${recordId}/convert-to-customer`)
    message.success("Đã chuyển lead thành khách hàng")
    refresh()
    navigate(`/customers/${response.data.data.id}`)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Quản lý dữ liệu</Typography.Text>
          <Typography.Title level={2}>
            {entityLabels[resource] || resource}
          </Typography.Title>
        </div>
        <Space>
          <Input.Search
            allowClear
            placeholder="Tìm kiếm"
            onSearch={setSearch}
          />
          {hasActionAccess(resource, "create") && (
            <Tooltip title="Tạo bản ghi mới">
              <Button
                className="primary-glow"
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setCreating(true)}
              >
                {resource === "files" ? "Upload file" : "Thêm nhanh"}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          rowKey="id"
          scroll={{ x: "max-content" }}
        />
      </Card>
      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={creating}
        placement="right"
        title={`Thêm nhanh ${entityLabels[resource] || resource}`}
        width={560}
        onClose={() => setCreating(false)}
      >
        {resource === "files" ? (
          <FileUploadPanel
            onCancel={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false)
              refresh()
            }}
          />
        ) : (
          <RecordFormContent
            compact
            resource={resource}
            onCancel={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false)
              refresh()
            }}
          />
        )}
      </Drawer>
    </>
  )
}
