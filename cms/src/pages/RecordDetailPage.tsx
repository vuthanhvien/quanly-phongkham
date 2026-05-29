import { useDelete } from "@refinedev/core"
import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Popconfirm,
  Tooltip,
  message,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PhoneOutlined,
  PrinterOutlined,
  SwapOutlined,
} from "@ant-design/icons"
import { api } from "../api"
import { hasActionAccess } from "../access"
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

interface RelatedBlock {
  title: string
  resource: string
  relationField: string
  rows: Record<string, unknown>[]
  tableFields: FieldLayoutConfig[]
  detailFields: FieldLayoutConfig[]
  printTemplateId?: string
}

interface RelatedRecordDrawerState {
  block: RelatedBlock
  record: Record<string, any> | null
}

export function RecordDetailPage() {
  const { resource = "customers", id = "" } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [related, setRelated] = useState<RelatedBlock[]>([])
  const [fields, setFields] = useState<FieldLayoutConfig[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [loading, setLoading] = useState(true)
  const [relatedDetail, setRelatedDetail] = useState<RelatedRecordDrawerState | null>(null)
  const [relatedDetailLoading, setRelatedDetailLoading] = useState(false)
  const [quickCreateBlock, setQuickCreateBlock] = useState<RelatedBlock | null>(null)
  const { mutate: deleteRecord } = useDelete()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const activeRole = getStoredUserRole()
    Promise.all([
      api.get(`/records/${resource}/${id}`),
      loadRelated(resource, id, activeRole),
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
      api.get("/settings/views", { params: { entityType: resource } }),
    ]).then(([recordResponse, relatedResponse, fieldResponse, viewResponse]) => {
      if (!mounted) return
      const nextRecord = recordResponse.data.data
      const customFields = fieldResponse.data.data.filter(
        (field: CustomField) => field.isActive,
      )
      const catalog = getFieldCatalog(resource, customFields)
      Object.keys(nextRecord?.customFields || {}).forEach((key) => {
        if (catalog.some((field) => field.key === key)) return
        catalog.push({ key, label: key })
      })
      const detailFields = getVisibleFieldConfigs(
        catalog,
        viewResponse.data.data as ViewSettingRecord[],
        "DETAIL",
        getStoredUserRole(),
      )

      setRecord(nextRecord)
      setRelated(relatedResponse)
      setFields(detailFields)
      loadRelationOptions([
        ...detailFields,
        ...relatedResponse.flatMap((block) => [...block.tableFields, ...block.detailFields]),
        "branchId",
        "defaultBranchId",
        "customerId",
        "leadId",
        "staffId",
        "assignedStaffId",
        "ownerStaffId",
        "consultantStaffId",
        "doctorStaffId",
        "performerStaffId",
        "userId",
        "invoiceId",
        "convertedCustomerId",
      ]).then((lookupResponse) => {
        if (!mounted) return
        setLookups(lookupResponse)
        setLoading(false)
      })
    })
    return () => {
      mounted = false
    }
  }, [resource, id])

  if (!record && !loading) {
    return <Empty description="Không tìm thấy bản ghi" />
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Hồ sơ chi tiết</Typography.Text>
          <Typography.Title level={2}>
            {detailTitle(resource, record)}
          </Typography.Title>
        </div>
        <Space>
          <Link to={`/${resource}`}>
            <Button>Quay lại</Button>
          </Link>
          {resource === "leads" && !record?.convertedCustomerId && hasActionAccess(resource, "convert-to-customer") && (
            <Tooltip title="Chuyển lead thành khách hàng">
              <Button
                onClick={async () => {
                  const response = await convertLead(id)
                  message.success("Đã chuyển lead thành khách hàng")
                  navigate(`/customers/${response.data.data.id}`)
                }}
              >
                Chuyển thành khách hàng
              </Button>
            </Tooltip>
          )}
          {hasActionAccess(resource, "update") && (
            <Link to={`/${resource}/${id}/edit`}>
              <Button className="primary-glow" type="primary">
                Sửa hồ sơ
              </Button>
            </Link>
          )}
        </Space>
      </div>

      <Row gutter={[18, 18]}>
        <Col
          xs={24}
          xl={resource === "customers" || resource === "staff" ? 15 : 24}
        >
          <Card className="glass-card detail-card" loading={loading}>
            <Typography.Title level={4}>Thông tin chính</Typography.Title>
            <Row gutter={[16, 16]} className="detail-grid">
              {fields.map((field) => (
                <Col key={field.key} span={detailWidthToSpan(field.width)} xs={24}>
                  <div className="detail-item">
                    <div className="detail-item-label">
                      {field.description ? (
                        <Space direction="vertical" size={0}>
                          <span>{field.label}</span>
                          <Typography.Text type="secondary">
                            {field.description}
                          </Typography.Text>
                        </Space>
                      ) : (
                        field.label
                      )}
                    </div>
                    <div className="detail-item-content">
                      {displayValue(
                        field,
                        record?.[field.key] ?? record?.customFields?.[field.key],
                        lookups,
                      )}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        {(resource === "customers" || resource === "staff") && (
          <Col xs={24} xl={9}>
            <Card className="glass-card detail-card" loading={loading}>
              <Typography.Title level={4}>
                {resource === "customers"
                  ? "Tổng quan khách hàng"
                  : "Tổng quan nhân viên"}
              </Typography.Title>
              <div className="profile-summary">
                <div>
                  <Typography.Text type="secondary">Trạng thái</Typography.Text>
                  <Tag className="soft-tag">
                    {record?.status || record?.role || "ACTIVE"}
                  </Tag>
                </div>
                {resource === "customers" && (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        Hạng khách
                      </Typography.Text>
                      <Typography.Title level={3}>
                        {record?.tier || "MEMBER"}
                      </Typography.Title>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        Tổng chi tiêu
                      </Typography.Text>
                      <Typography.Title level={4}>
                        {formatValue(record?.totalSpent)}
                      </Typography.Title>
                    </div>
                  </>
                )}
                {resource === "staff" && (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        Chức danh
                      </Typography.Text>
                      <Typography.Title level={4}>
                        {record?.position || "-"}
                      </Typography.Title>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        Chi nhánh mặc định
                      </Typography.Text>
                      <Typography.Text>
                        {displayValue(
                          "defaultBranchId",
                          record?.defaultBranchId,
                          lookups,
                        )}
                      </Typography.Text>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {related.map((block) => (
        <Card
          className="glass-card detail-card"
          key={block.title}
          title={block.title}
          extra={
            hasActionAccess(block.resource, "create") ? (
              <Button size="small" type="primary" onClick={() => setQuickCreateBlock(block)}>
                Thêm nhanh
              </Button>
            ) : null
          }
        >
          <Table
            columns={[
              ...block.tableFields.map((field) => ({
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
                title: "",
                key: "action",
                width: 260,
                render: (_: unknown, row: any) => (
                  <Space>
                    {hasActionAccess(block.resource, "view") && (
                      <Tooltip title="Xem nhanh">
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          type="text"
                          onClick={() => void openRelatedDetail(block, row.id)}
                        />
                      </Tooltip>
                    )}
                    {hasActionAccess(block.resource, "update") && (
                      <Tooltip title="Chỉnh sửa">
                        <Link to={`/${block.resource}/${row.id}/edit`}>
                          <Button icon={<EditOutlined />} size="small" type="text" />
                        </Link>
                      </Tooltip>
                    )}
                    {block.resource === "customers" && hasActionAccess(block.resource, "reveal-phone") && (
                      <Tooltip title="Xem số điện thoại">
                        <Button
                          icon={<PhoneOutlined />}
                          size="small"
                          type="text"
                          onClick={() => void revealPhone(row.id)}
                        />
                      </Tooltip>
                    )}
                    {block.resource === "leads" && !row.convertedCustomerId && hasActionAccess(block.resource, "convert-to-customer") && (
                      <Tooltip title="Chuyển thành khách hàng">
                        <Button
                          icon={<SwapOutlined />}
                          size="small"
                          type="text"
                          onClick={() => void convertRelatedLead(row.id)}
                        />
                      </Tooltip>
                    )}
                    {block.printTemplateId && hasActionAccess(block.resource, "print") && (
                      <Tooltip title="In biểu mẫu">
                        <Button
                          icon={<PrinterOutlined />}
                          size="small"
                          type="text"
                          onClick={() => void printRecord(block.printTemplateId!, row.id)}
                        />
                      </Tooltip>
                    )}
                    {hasActionAccess(block.resource, "delete") && (
                      <Popconfirm
                        title="Xóa bản ghi này?"
                        onConfirm={() =>
                          deleteRecord(
                            { resource: block.resource, id: row.id },
                            {
                              onSuccess: () => {
                                message.success("Đã xóa")
                                if (relatedDetail?.record?.id === row.id) {
                                  setRelatedDetail(null)
                                }
                                void reloadRelatedBlocks()
                              },
                            },
                          )
                        }
                      >
                        <Tooltip title="Xóa bản ghi">
                          <Button danger icon={<DeleteOutlined />} size="small" type="text" />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                ),
              },
            ]}
            dataSource={block.rows}
            pagination={false}
            rowKey="id"
            scroll={{ x: "max-content" }}
            size="small"
          />
        </Card>
      ))}

      <Drawer
        destroyOnClose
        maskClosable={false}
        open={Boolean(relatedDetail || relatedDetailLoading)}
        placement="right"
        title={relatedDetail ? `${relatedDetail.block.title} - chi tiết` : "Đang tải chi tiết"}
        width={720}
        onClose={() => {
          setRelatedDetail(null)
          setRelatedDetailLoading(false)
        }}
      >
        {relatedDetail && (
          <div className="detail-grid">
            <Row gutter={[16, 16]}>
              {relatedDetail.block.detailFields.map((field) => (
                <Col key={field.key} span={detailWidthToSpan(field.width)} xs={24}>
                  <div className="detail-item">
                    <div className="detail-item-label">
                      {field.description ? (
                        <Space direction="vertical" size={0}>
                          <span>{field.label}</span>
                          <Typography.Text type="secondary">{field.description}</Typography.Text>
                        </Space>
                      ) : (
                        field.label
                      )}
                    </div>
                    <div className="detail-item-content">
                      {displayValue(
                        field,
                        relatedDetail.record?.[field.key] ?? relatedDetail.record?.customFields?.[field.key],
                        lookups,
                      )}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Drawer>

      <Drawer
        destroyOnClose
        maskClosable={false}
        open={Boolean(quickCreateBlock)}
        placement="right"
        title={quickCreateBlock ? `Thêm nhanh ${entityLabels[quickCreateBlock.resource] || quickCreateBlock.resource}` : "Thêm nhanh"}
        width={620}
        onClose={() => setQuickCreateBlock(null)}
      >
        {quickCreateBlock && (
          <RecordFormContent
            compact
            initialValues={{ [quickCreateBlock.relationField]: id }}
            resource={quickCreateBlock.resource}
            onCancel={() => setQuickCreateBlock(null)}
            onSuccess={() => {
              setQuickCreateBlock(null)
              void reloadRelatedBlocks()
            }}
          />
        )}
      </Drawer>
    </>
  )

  async function openRelatedDetail(block: RelatedBlock, recordId: string) {
    setRelatedDetailLoading(true)
    try {
      const response = await api.get(`/records/${block.resource}/${recordId}`)
      setRelatedDetail({ block, record: response.data.data })
    } finally {
      setRelatedDetailLoading(false)
    }
  }

  async function reloadRelatedBlocks() {
    const activeRole = getStoredUserRole()
    const nextRelated = await loadRelated(resource, id, activeRole)
    setRelated(nextRelated)
    const nextLookups = await loadRelationOptions([
      ...fields,
      ...nextRelated.flatMap((block) => [...block.tableFields, ...block.detailFields]),
      "branchId",
      "defaultBranchId",
      "customerId",
      "leadId",
      "staffId",
      "assignedStaffId",
      "ownerStaffId",
      "consultantStaffId",
      "doctorStaffId",
      "performerStaffId",
      "userId",
      "invoiceId",
      "convertedCustomerId",
    ])
    setLookups(nextLookups)
  }

  async function revealPhone(recordId: string) {
    const response = await api.post(`/records/customers/${recordId}/reveal-phone`)
    message.info(`Số điện thoại: ${response.data.data.phone}`)
  }

  async function convertRelatedLead(recordId: string) {
    const response = await convertLead(recordId)
    message.success("Đã chuyển lead thành khách hàng")
    await reloadRelatedBlocks()
    navigate(`/customers/${response.data.data.id}`)
  }
}

function detailWidthToSpan(width?: FieldLayoutConfig["width"]) {
  switch (width) {
    case "25":
      return 6
    case "33":
      return 8
    case "50":
      return 12
    case "66":
      return 16
    case "100":
    default:
      return 24
  }
}

async function loadRelated(
  resource: string,
  id: string,
  role: string,
): Promise<RelatedBlock[]> {
  if (resource === "leads") {
    const specs = [
      {
        title: "Nhật ký chăm lead",
        resource: "lead-activities",
        field: "leadId",
        columns: ["activityType", "scheduledAt", "ownerStaffId", "status"],
      },
    ]
    return loadBlocks(specs, id, role)
  }
  if (resource === "customers") {
    const specs = [
      {
        title: "Lịch hẹn liên quan",
        resource: "appointments",
        field: "customerId",
        columns: ["type", "startTime", "status", "doctorName"],
      },
      {
        title: "Hồ sơ bệnh án",
        resource: "medical-episodes",
        field: "customerId",
        columns: ["serviceName", "doctorName", "status", "operationDate"],
      },
      {
        title: "Liệu trình",
        resource: "treatments",
        field: "customerId",
        columns: ["name", "totalSessions", "completedSessions", "status"],
      },
      {
        title: "Thăm khám",
        resource: "consultations",
        field: "customerId",
        columns: ["consultedAt", "consultantStaffId", "doctorStaffId", "status"],
      },
      {
        title: "Đơn hàng / dịch vụ sử dụng",
        resource: "service-orders",
        field: "customerId",
        columns: ["code", "serviceName", "quantity", "totalAmount", "status"],
      },
      {
        title: "Hình ảnh - chẩn đoán",
        resource: "customer-images",
        field: "customerId",
        columns: ["mediaType", "title", "capturedAt", "diagnosisNote"],
      },
      {
        title: "Phiếu thu / hóa đơn",
        resource: "invoices",
        field: "customerId",
        columns: ["code", "totalAmount", "paidAmount", "status"],
      },
    ]
    return loadBlocks(specs, id, role)
  }
  if (resource === "staff") {
    const specs = [
      {
        title: "Quyền theo chi nhánh",
        resource: "branch-role-assignments",
        field: "staffId",
        columns: ["branchId", "roleName", "roleKeys"],
      },
      {
        title: "Tài khoản đăng nhập",
        resource: "user-accounts",
        field: "staffId",
        columns: ["email", "role", "branchId", "isActive"],
      },
      {
        title: "Hoa hồng liên quan",
        resource: "commissions",
        field: "staffName",
        columns: ["invoiceId", "roleType", "amount", "status"],
      },
    ]
    return loadBlocks(specs, id, role)
  }
  return []
}

async function loadBlocks(
  specs: Array<{
    title: string
    resource: string
    field: string
    columns: string[]
  }>,
  id: string,
  role: string,
) {
  const responses = await Promise.all(
    specs.map(async (spec) => {
      const [recordResponse, fieldResponse, viewResponse, printResponse] = await Promise.all([
        api
          .get(`/records/${spec.resource}`, { params: { pageSize: 100 } })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/custom-fields", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/views", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/print-templates", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
      ])

      const rows = recordResponse.data.data.filter(
        (row: Record<string, unknown>) => String(row[spec.field]) === id,
      )
      const customFields = fieldResponse.data.data.filter(
        (field: CustomField) => field.isActive,
      )
      const catalog = getFieldCatalog(spec.resource, customFields)
      rows.forEach((row: Record<string, any>) => {
        Object.keys(row.customFields || {}).forEach((key) => {
          if (catalog.some((field) => field.key === key)) return
          catalog.push({ key, label: key })
        })
      })
      const views = viewResponse.data.data as ViewSettingRecord[]

      return {
        rows,
        tableFields: getVisibleFieldConfigs(catalog, views, "TABLE", role),
        detailFields: getVisibleFieldConfigs(catalog, views, "DETAIL", role),
        printTemplateId: printResponse.data.data?.[0]?.id,
      }
    }),
  )
  return specs.map((spec, index) => ({
    title: specs[index].title,
    resource: spec.resource,
    relationField: spec.field,
    rows: responses[index].rows,
    tableFields: responses[index].tableFields,
    detailFields: responses[index].detailFields,
    printTemplateId: responses[index].printTemplateId,
  }))
}

async function convertLead(id: string) {
  return api.post(`/records/leads/${id}/convert-to-customer`)
}

async function printRecord(templateId: string, recordId: string) {
  const html = (
    await api.get(`/settings/print-templates/${templateId}/render/${recordId}`, {
      responseType: "text",
    })
  ).data
  const windowRef = window.open("", "_blank")
  if (windowRef) {
    windowRef.document.write(
      `<div class="print-sheet">${html}</div><script>window.print()</script>`,
    )
    windowRef.document.close()
  }
}

function detailTitle(resource: string, record: Record<string, any> | null) {
  if (!record) return entityLabels[resource] || resource
  return (
    record.fullName ||
    record.name ||
    record.code ||
    record.email ||
    entityLabels[resource] ||
    resource
  )
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ")
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
