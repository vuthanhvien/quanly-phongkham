import { useDelete, useList } from "@refinedev/core"
import {
  AuditOutlined,
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
  Grid,
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
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { hasActionAccess, hasResourceAccess } from "../access"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { RecordFormContent } from "../components/RecordFormContent"
import { RecordValueView } from "../components/RecordValueView"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { StockBatchForm } from "../components/StockBatchForm"
import { CustomField, entityLabels } from "../models"
import { RecordDetailPage } from "./RecordDetailPage"
import { FileLookupMap, loadFileLookupMap, loadRelationOptions, LookupMap } from "../relations"
import {
  FieldLayoutConfig,
  getFieldCatalog,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

export function RecordListPage() {
  const screens = Grid.useBreakpoint()
  const { resource = "customers" } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [relatedQuickView, setRelatedQuickView] = useState<{ resource: string; id: string } | null>(null)
  const query = useList({
    resource,
    pagination: { currentPage, pageSize },
    filters: [{ field: "search", operator: "contains", value: search }],
  }) as any
  const response = query.result || query.query?.data || query.data?.data
  const rows = response?.data || []
  const total = response?.total || 0
  const loading = query.query?.isLoading || query.isLoading
  const detailId = searchParams.get("detail")
  const { mutate: deleteRecord } = useDelete()
  const refresh = () => query.query?.refetch?.() || query.refetch?.()

  useEffect(() => {
    setCurrentPage(1)
    setCreating(false)
    setEditingId(null)
    setDuplicateValues(undefined)
    setDuplicatingId(null)
    if (detailId) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("detail")
      setSearchParams(nextParams, { replace: true })
    }
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
            onRelationClick={(targetResource, id) => {
              if (!hasResourceAccess(targetResource)) return
              setRelatedQuickView({ resource: targetResource, id })
            }}
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
                <Button icon={<EyeOutlined />} type="text" onClick={() => openDetail(String(row.id))} />
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
            {["invoices", "expenses", "payrolls"].includes(resource) && hasActionAccess(resource, "generate-accounting-voucher") && (
              <Tooltip title="Tạo chứng từ kế toán">
                <Button icon={<AuditOutlined />} type="text" onClick={() => generateAccountingVoucher(resource, row.id)} />
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && row.status !== "POSTED" && hasActionAccess(resource, "post") && (
              <Tooltip title="Ghi sổ">
                <Button icon={<AuditOutlined />} type="text" onClick={() => postAccountingVoucher(row.id)} />
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && row.status === "POSTED" && hasActionAccess(resource, "unpost") && (
              <Tooltip title="Bỏ ghi sổ">
                <Button icon={<SwapOutlined />} type="text" onClick={() => unpostAccountingVoucher(row.id)} />
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
    navigate(`/customers?detail=${response.data.data.id}`)
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

  async function generateAccountingVoucher(currentResource: string, recordId: string) {
    await api.post(`/records/${currentResource}/${recordId}/generate-accounting-voucher`)
    message.success("Đã tạo chứng từ kế toán")
  }

  async function postAccountingVoucher(recordId: string) {
    await api.post(`/records/accounting-vouchers/${recordId}/post`)
    message.success("Đã ghi sổ chứng từ")
    refresh()
  }

  async function unpostAccountingVoucher(recordId: string) {
    await api.post(`/records/accounting-vouchers/${recordId}/unpost`)
    message.success("Đã bỏ ghi sổ chứng từ")
    refresh()
  }

  function openDetail(recordId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("detail", recordId)
    setSearchParams(nextParams, { replace: true })
  }

  function closeDetail() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete("detail")
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>
            {entityLabels[resource] || resource}
          </Typography.Title>
        </div>
        <Space wrap className="page-header-actions">
          <Input.Search
            allowClear
            className="page-search"
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
        open={Boolean(detailId)}
        placement="right"
        title={`Chi tiết ${entityLabels[resource] || resource}`}
        extra={
          detailId ? (
            <Space>
              <Button onClick={() => navigate(`/${resource}/${detailId}/full`)}>
                Xem đầy đủ
              </Button>
              {hasActionAccess(resource, "update") && (
                <Button
                  className="primary-glow"
                  type="primary"
                  onClick={() => {
                    closeDetail()
                    setEditingId(detailId)
                  }}
                >
                  Sửa hồ sơ
                </Button>
              )}
            </Space>
          ) : null
        }
        width={screens.md ? (resource === "service-orders" ? 1040 : 720) : "100%"}
        onClose={closeDetail}
      >
        {detailId ? (
          <RecordDetailPage
            embedded
            id={detailId}
            resource={resource}
            onClose={closeDetail}
          />
        ) : null}
      </Drawer>
      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={Boolean(relatedQuickView)}
        placement="right"
        title={relatedQuickView ? `Chi tiết ${entityLabels[relatedQuickView.resource] || relatedQuickView.resource}` : "Chi tiết liên kết"}
        extra={
          relatedQuickView ? (
            <Space>
              <Button onClick={() => navigate(`/${relatedQuickView.resource}/${relatedQuickView.id}/full`)}>
                Xem đầy đủ
              </Button>
              {hasActionAccess(relatedQuickView.resource, "update") && (
                <Button
                  className="primary-glow"
                  type="primary"
                  onClick={() => {
                    setEditingId(null)
                    setCreating(false)
                    navigate(`/${relatedQuickView.resource}/${relatedQuickView.id}/edit`)
                  }}
                >
                  Sửa hồ sơ
                </Button>
              )}
            </Space>
          ) : null
        }
        width={screens.md ? 720 : "100%"}
        onClose={() => setRelatedQuickView(null)}
      >
        {relatedQuickView ? (
          <RecordDetailPage
            embedded
            id={relatedQuickView.id}
            resource={relatedQuickView.resource}
            onClose={() => setRelatedQuickView(null)}
          />
        ) : null}
      </Drawer>
      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={creating || Boolean(editingId)}
        placement="right"
        title={editingId ? `Chỉnh sửa ${entityLabels[resource] || resource}` : `Thêm nhanh ${entityLabels[resource] || resource}`}
        width={screens.md ? (["service-orders", "stock-batches"].includes(resource) ? 980 : 560) : "100%"}
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
        ) : resource === "stock-batches" && !editingId ? (
          <StockBatchForm
            compact
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
