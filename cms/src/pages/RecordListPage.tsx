import { useDelete, useList } from "@refinedev/core"
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ImportOutlined,
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
import { RecordValueView } from "../components/RecordValueView"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { CustomField, entityLabels } from "../models"
import { FileLookupMap, loadFileLookupMap, loadRelationOptions, LookupMap } from "../relations"
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [displayFields, setDisplayFields] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [duplicateValues, setDuplicateValues] = useState<Record<string, unknown> | undefined>(undefined)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [lookups, setLookups] = useState<LookupMap>({})
  const [fileLookups, setFileLookups] = useState<FileLookupMap>({})
  const query = useList({
    resource,
    pagination: { currentPage, pageSize },
    filters: [{ field: "search", operator: "contains", value: search }],
  }) as any
  const response = query.result || query.query?.data || query.data?.data
  const rows = response?.data || []
  const total = response?.total || 0
  const loading = query.query?.isLoading || query.isLoading
  const { mutate: deleteRecord } = useDelete()
  const refresh = () => query.query?.refetch?.() || query.refetch?.()

  useEffect(() => {
    setCurrentPage(1)
    setCreating(false)
    setEditingId(null)
    setDuplicateValues(undefined)
    setDuplicatingId(null)
  }, [resource])

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
        return Promise.all([loadRelationOptions(tableFields), loadFileLookupMap()])
      })
      .then(([nextLookups, nextFileLookups]) => {
        setLookups(nextLookups)
        setFileLookups(nextFileLookups)
      })
  }, [resource])

  const columns: ColumnsType<Record<string, any>> = useMemo(
    () => [
      ...displayFields.map((field) => ({
        title: field.label,
        dataIndex: field.key,
        key: field.key,
        width: field.tableWidth,
        render: (_: unknown, row: Record<string, any>) =>
          <RecordValueView
            compact
            field={field}
            fileLookups={fileLookups}
            lookups={lookups}
            value={row[field.key] ?? row.customFields?.[field.key]}
          />,
      })),
      {
        title: "",
        key: "action",
        fixed: "right" as const,
        width: 160,
        render: (_: unknown, row: Record<string, any>) => (
          <Space size={2}>
            {hasActionAccess(resource, "view") && (
              <Tooltip title="Xem chi tiết">
                <Link to={`/${resource}/${row.id}`}>
                  <Button icon={<EyeOutlined />} type="text" />
                </Link>
              </Tooltip>
            )}
            {hasActionAccess(resource, "update") && (
              <Tooltip title="Chỉnh sửa">
                <Button icon={<EditOutlined />} type="text" onClick={() => setEditingId(String(row.id))} />
              </Tooltip>
            )}
            {hasActionAccess(resource, "create") && resource !== "files" && (
              <Tooltip title="Nhân bản">
                <Button
                  icon={<CopyOutlined />}
                  loading={duplicatingId === String(row.id)}
                  type="text"
                  onClick={() => void duplicateRecord(String(row.id))}
                />
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
    [displayFields, resource, templates, lookups, fileLookups],
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

  async function duplicateRecord(recordId: string) {
    setDuplicatingId(recordId)
    try {
      const response = await api.get(`/records/${resource}/${recordId}`)
      const preparedValues = buildDuplicateValues(response.data.data)
      setEditingId(null)
      setDuplicateValues(preparedValues)
      setCreating(true)
    } catch (error: any) {
      message.error(String(error?.response?.data?.message || "Không thể nhân bản bản ghi"))
    } finally {
      setDuplicatingId(null)
    }
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
            onSearch={(value) => {
              setCurrentPage(1)
              setSearch(value)
            }}
          />
          {hasActionAccess(resource, "create") && !["files", "service-orders"].includes(resource) && (
            <Tooltip title="Mở màn hình import">
              <Button
                icon={<ImportOutlined />}
                onClick={() => navigate(`/${resource}/import`)}
              >
                Import
              </Button>
            </Tooltip>
          )}
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
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (value) => `${value.toLocaleString("vi-VN")} bản ghi`,
            onChange: (page, nextPageSize) => {
              setCurrentPage(page)
              setPageSize(nextPageSize)
            },
          }}
          rowKey="id"
          scroll={{ x: "max-content" }}
        />
      </Card>
      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={creating || Boolean(editingId)}
        placement="right"
        title={editingId ? `Chỉnh sửa ${entityLabels[resource] || resource}` : `Thêm nhanh ${entityLabels[resource] || resource}`}
        width={resource === "service-orders" ? 980 : 560}
        onClose={() => {
          setCreating(false)
          setEditingId(null)
          setDuplicateValues(undefined)
        }}
      >
        {resource === "files" && !editingId ? (
          <FileUploadPanel
            onCancel={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false)
              refresh()
            }}
          />
        ) : resource === "service-orders" ? (
          <ServiceOrderForm
            compact
            id={editingId || undefined}
            initialValues={editingId ? undefined : duplicateValues}
            onCancel={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
            }}
            onSuccess={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
              refresh()
            }}
          />
        ) : (
          <RecordFormContent
            compact
            id={editingId || undefined}
            initialValues={editingId ? undefined : duplicateValues}
            resource={resource}
            onCancel={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
            }}
            onSuccess={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
              refresh()
            }}
          />
        )}
      </Drawer>
    </>
  )
}

function buildDuplicateValues(record: Record<string, unknown>) {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    deletedAt: _deletedAt,
    createdById: _createdById,
    updatedById: _updatedById,
    customFields,
    ...rest
  } = record

  const nextValues: Record<string, unknown> = {
    ...rest,
    ...((customFields as Record<string, unknown> | undefined) || {}),
  }

  if (typeof nextValues.code === "string" && nextValues.code.trim()) {
    nextValues.code = `${nextValues.code}-COPY`
  }
  if (typeof nextValues.slug === "string" && nextValues.slug.trim()) {
    nextValues.slug = `${nextValues.slug}-copy`
  }

  return nextValues
}
