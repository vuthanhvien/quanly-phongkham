import { useDelete } from "@refinedev/core"
import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Popconfirm,
  Tabs,
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

interface RelatedRecordEditState {
  block: RelatedBlock
  recordId: string
}

interface RecordDetailPageProps {
  resource?: string
  id?: string
  embedded?: boolean
  onClose?: () => void
}

export function RecordDetailPage(props: RecordDetailPageProps = {}) {
  const params = useParams()
  const resource = props.resource ?? params.resource ?? "customers"
  const id = props.id ?? params.id ?? ""
  const embedded = Boolean(props.embedded)
  const navigate = useNavigate()
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [related, setRelated] = useState<RelatedBlock[]>([])
  const [fields, setFields] = useState<FieldLayoutConfig[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [fileLookups, setFileLookups] = useState<FileLookupMap>({})
  const [loading, setLoading] = useState(true)
  const [relatedDetail, setRelatedDetail] = useState<RelatedRecordDrawerState | null>(null)
  const [relatedDetailLoading, setRelatedDetailLoading] = useState(false)
  const [relatedEdit, setRelatedEdit] = useState<RelatedRecordEditState | null>(null)
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
      Promise.all([
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
          "picStaffId",
          "performerStaffId",
          "roomId",
          "equipmentId",
          "userId",
          "invoiceId",
          "convertedCustomerId",
        ]),
        loadFileLookupMap(),
      ]).then(([lookupResponse, nextFileLookups]) => {
        if (!mounted) return
        setLookups(lookupResponse)
        setFileLookups(nextFileLookups)
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

  if (embedded) {
    return (
      <>
        <Card className="glass-card detail-card" loading={loading}>
          <Typography.Title level={4} style={{ marginBottom: 16 }}>
            Thông tin chính
          </Typography.Title>
          <div className="detail-grid-stacked">
            {fields.map((field) => (
              <div key={field.key} className="detail-item">
                <div className="detail-item-label">
                  {field.description ? (
                    <Space direction="vertical" size={0}>
                      <span>{field.label}</span>
                      <Typography.Text type="secondary">{field.description}</Typography.Text>
                    </Space>
                  ) : field.label}
                </div>
                <div className="detail-item-content">
                  <RecordValueView
                    field={field}
                    fileLookups={fileLookups}
                    lookups={lookups}
                    value={record?.[field.key] ?? record?.customFields?.[field.key]}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      {!embedded && (
        <div className="page-header">
          <div>
            <Typography.Title level={3}>
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
                    navigate(`/customers?detail=${response.data.data.id}`)
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
      )}

      <Row gutter={[18, 18]} align="stretch" className="detail-split-row">
        {/* Left: related tabs */}
        <Col xs={24} xl={18} className="detail-tabs-col">
          {(() => {
            const serviceOrderItemsTab = resource === "service-orders" && Array.isArray(record?.items) && record.items.length > 0
              ? [{
                  key: "__service-order-items",
                  label: "Sản phẩm trong đơn",
                  children: (
                    <Table
                      columns={[
                        { title: "Sản phẩm", dataIndex: "itemName", key: "itemName" },
                        { title: "Số lượng", dataIndex: "quantity", key: "quantity", width: 120 },
                        { title: "Đơn giá", dataIndex: "unitPrice", key: "unitPrice", width: 140 },
                        { title: "Thành tiền", dataIndex: "lineTotal", key: "lineTotal", width: 160 },
                      ]}
                      dataSource={record.items}
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: "max-content" }}
                      size="small"
                    />
                  ),
                }]
              : []

            const infoTab = fields.length > 0 ? [{
              key: "__info",
              label: "Thông tin",
              children: (
                <div className="detail-grid">
                  <Row gutter={[16, 16]}>
                    {fields.map((field) => (
                      <Col key={field.key} span={detailWidthToSpan(field.width)} xs={24}>
                        <div className="detail-item">
                          <div className="detail-item-label">
                            {field.description ? (
                              <Space direction="vertical" size={0}>
                                <span>{field.label}</span>
                                <Typography.Text type="secondary">{field.description}</Typography.Text>
                              </Space>
                            ) : field.label}
                          </div>
                          <div className="detail-item-content">
                            <RecordValueView field={field} fileLookups={fileLookups} lookups={lookups} value={record?.[field.key] ?? record?.customFields?.[field.key]} />
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            }] : []

            const relatedTabs = related.map((block) => ({
              key: block.resource,
              label: (
                <span>
                  {block.title}
                  {block.rows.length > 0 && (
                    <span className="tab-count">{block.rows.length}</span>
                  )}
                </span>
              ),
              children: (
                <div>
                  {hasActionAccess(block.resource, "create") && (
                    <div className="related-tab-toolbar">
                      <Button size="small" type="primary" onClick={() => setQuickCreateBlock(block)}>
                        Thêm nhanh
                      </Button>
                    </div>
                  )}
                  <Table
                    columns={[
                      ...block.tableFields.map((field) => ({
                        title: field.label,
                        dataIndex: field.key,
                        key: field.key,
                        width: field.tableWidth,
                        render: (_: unknown, row: Record<string, any>) =>
                          <RecordValueView compact field={field} fileLookups={fileLookups} lookups={lookups} value={row[field.key] ?? row.customFields?.[field.key]} />,
                      })),
                      {
                        title: "",
                        key: "action",
                        fixed: "right" as const,
                        width: 140,
                        render: (_: unknown, row: any) => (
                          <Space size={2}>
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
                                <Button
                                  icon={<EditOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() => setRelatedEdit({ block, recordId: String(row.id) })}
                                />
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
                </div>
              ),
            }))

            const allTabs = [...infoTab, ...relatedTabs, ...serviceOrderItemsTab]
            if (allTabs.length === 0) {
              return <Card className="glass-card detail-card" loading={loading}><Empty description="Không có dữ liệu liên kết" /></Card>
            }
            return (
              <Card className="glass-card detail-card detail-tabs-card" loading={loading}>
                <Tabs items={allTabs} />
              </Card>
            )
          })()}
        </Col>

        {/* Right: detail info */}
        <Col xs={24} xl={6}>
          <div className="detail-right-stack">
            {(resource === "customers" || resource === "staff") && (
              <Card className="glass-card detail-card" loading={loading}>
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
                        <Typography.Text type="secondary">Hạng khách</Typography.Text>
                        <Typography.Title level={3}>{record?.tier || "MEMBER"}</Typography.Title>
                      </div>
                      <div>
                        <Typography.Text type="secondary">Tổng chi tiêu</Typography.Text>
                        <Typography.Title level={4}>{formatCurrencyValue(record?.totalSpent)}</Typography.Title>
                      </div>
                    </>
                  )}
                  {resource === "staff" && (
                    <>
                      <div>
                        <Typography.Text type="secondary">Chức danh</Typography.Text>
                        <Typography.Title level={4}>{record?.position || "-"}</Typography.Title>
                      </div>
                      <div>
                        <Typography.Text type="secondary">Chi nhánh mặc định</Typography.Text>
                        <Typography.Text>
                          <RecordValueView field="defaultBranchId" fileLookups={fileLookups} lookups={lookups} value={record?.defaultBranchId} />
                        </Typography.Text>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </Col>
      </Row>

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
                      <RecordValueView field={field} fileLookups={fileLookups} lookups={lookups} value={relatedDetail.record?.[field.key] ?? relatedDetail.record?.customFields?.[field.key]} />
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
        width={quickCreateBlock?.resource === "service-orders" ? 980 : 620}
        onClose={() => setQuickCreateBlock(null)}
      >
        {quickCreateBlock && (
          quickCreateBlock.resource === "service-orders" ? (
            <ServiceOrderForm
              compact
              initialValues={{ [quickCreateBlock.relationField]: id }}
              onCancel={() => setQuickCreateBlock(null)}
              onSuccess={() => {
                setQuickCreateBlock(null)
                void reloadRelatedBlocks()
              }}
            />
          ) : (
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
          )
        )}
      </Drawer>

      <Drawer
        destroyOnClose
        maskClosable={false}
        open={Boolean(relatedEdit)}
        placement="right"
        title={relatedEdit ? `Chỉnh sửa ${entityLabels[relatedEdit.block.resource] || relatedEdit.block.resource}` : "Chỉnh sửa"}
        width={relatedEdit?.block.resource === "service-orders" ? 980 : 620}
        onClose={() => setRelatedEdit(null)}
      >
        {relatedEdit && (
          relatedEdit.block.resource === "service-orders" ? (
            <ServiceOrderForm
              compact
              id={relatedEdit.recordId}
              onCancel={() => setRelatedEdit(null)}
              onSuccess={() => {
                setRelatedEdit(null)
                void reloadRelatedBlocks()
                if (relatedDetail?.record?.id === relatedEdit.recordId) {
                  void openRelatedDetail(relatedEdit.block, relatedEdit.recordId)
                }
              }}
            />
          ) : (
            <RecordFormContent
              compact
              id={relatedEdit.recordId}
              resource={relatedEdit.block.resource}
              onCancel={() => setRelatedEdit(null)}
              onSuccess={() => {
                setRelatedEdit(null)
                void reloadRelatedBlocks()
                if (relatedDetail?.record?.id === relatedEdit.recordId) {
                  void openRelatedDetail(relatedEdit.block, relatedEdit.recordId)
                }
              }}
            />
          )
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
      "picStaffId",
      "performerStaffId",
      "roomId",
      "equipmentId",
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
      },
      {
        title: "Hồ sơ bệnh án",
        resource: "medical-episodes",
        field: "customerId",
      },
      {
        title: "Liệu trình",
        resource: "treatments",
        field: "customerId",
      },
      {
        title: "Thăm khám",
        resource: "consultations",
        field: "customerId",
      },
      {
        title: "Đơn hàng / dịch vụ sử dụng",
        resource: "service-orders",
        field: "customerId",
      },
      {
        title: "Hình ảnh - chẩn đoán",
        resource: "customer-images",
        field: "customerId",
      },
      {
        title: "Phiếu thu / hóa đơn",
        resource: "invoices",
        field: "customerId",
      },
    ]
    return loadBlocks(specs, id, role)
  }
  if (resource === "staff") {
    const specs = [
      {
        title: "Hợp đồng lao động",
        resource: "work-contracts",
        field: "staffId",
      },
      {
        title: "Bảo hiểm",
        resource: "staff-insurances",
        field: "staffId",
      },
      {
        title: "Chấm công",
        resource: "attendances",
        field: "staffId",
      },
      {
        title: "Nghỉ phép",
        resource: "leave-requests",
        field: "staffId",
      },
      {
        title: "Bảng lương",
        resource: "payrolls",
        field: "staffId",
      },
      {
        title: "Lịch làm việc",
        resource: "work-schedules",
        field: "staffId",
      },
      {
        title: "Khen thưởng & Kỷ luật",
        resource: "staff-rewards",
        field: "staffId",
      },
      {
        title: "Đào tạo & Chứng chỉ",
        resource: "staff-trainings",
        field: "staffId",
      },
      {
        title: "Đánh giá hiệu suất",
        resource: "performance-reviews",
        field: "staffId",
      },
      {
        title: "Lịch sử thăng tiến",
        resource: "position-histories",
        field: "staffId",
      },
      {
        title: "Quyền theo chi nhánh",
        resource: "branch-role-assignments",
        field: "staffId",
      },
      {
        title: "Tài khoản đăng nhập",
        resource: "user-accounts",
        field: "staffId",
      },
      {
        title: "Hoa hồng",
        resource: "commissions",
        field: "staffName",
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

function formatCurrencyValue(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return formatValue(value)
  return `${new Intl.NumberFormat("vi-VN").format(numeric)} đ`
}
